import * as fs from 'fs';
import * as path from 'path';
import * as Diff from 'diff';
import { parsePatch, DiffsGroupedByFilenames, ParsePatchOptions } from '@src/vanilla_diff_patch/parsePatch';
import { applyDiff } from '@src/vanilla_diff_patch/applyDiff';
import { BaseError, HunkHeaderCountMismatchError, NoEditsInHunkError, NotEnoughContextError, PatchFormatError, InsufficientContextLinesError } from '@src/vanilla_diff_patch/errors';

/**
 * Error class for file operation errors
 */
export class FileOperationError extends BaseError {
  filePath: string;

  constructor(filePath: string, message: string, context: string = '') {
    super(message, context);
    this.filePath = filePath;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      filePath: this.filePath
    };
  }
}

/**
 * Error class for when a patch cannot be applied
 */
export class PatchApplicationError extends BaseError {
  filePath: string;
  hunkIndex: number;

  constructor(filePath: string, hunkIndex: number, message: string, context: string = '') {
    super(message, context);
    this.filePath = filePath;
    this.hunkIndex = hunkIndex;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      filePath: this.filePath,
      hunkIndex: this.hunkIndex
    };
  }
}

/**
 * Result object for a single file diff application
 */
export interface FileDiffResult {
  oldFileName: string;
  newFileName: string;
  totalHunks: number;
  appliedHunks: number;
  failedHunks: number;
  errors: BaseError[];
  success: boolean;
}

/**
 * Final result object for the entire diff application
 */
export interface ApplyDiffResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalHunks: number;
  appliedHunks: number;
  failedHunks: number;
  fileResults: FileDiffResult[];
  errors: BaseError[];
  success: boolean;
}

/**
 * Options for applying a diff
 */
export interface ApplyDiffOptions {
  basePath?: string;
  dryRun?: boolean;
  jsDiffApplyPatchOptions?: Diff.ApplyPatchOptions;
  minContextLines?: number;
}

/**
 * Applies a patch/diff to files in the file system
 * @param patchString The patch/diff string to apply
 * @param options Configuration options including basePath, dryRun flag, and jsDiffApplyPatchOptions
 * @returns A result object with details about the application
 */
export function applyPatchToFiles(patchString: string, options: {
  basePath: string;
  dryRun?: boolean;
  jsDiffApplyPatchOptions?: Diff.ApplyPatchOptions;
  minContextLines?: number;
}): ApplyDiffResult {
  const {
    basePath = process.cwd(),
    dryRun = false,
    jsDiffApplyPatchOptions = {},
    minContextLines
  } = options;
  
  // Initialize the result object
  const result: ApplyDiffResult = {
    totalFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    totalHunks: 0,
    appliedHunks: 0,
    failedHunks: 0,
    fileResults: [],
    errors: [],
    success: true
  };

  try {
    // Parse the patch with minContextLines option
    const parseOptions: ParsePatchOptions = {};
    if (minContextLines !== undefined) {
      parseOptions.minContextLines = minContextLines;
    }
    
    const diffsGroupedByFilenames = parsePatch(patchString, parseOptions);
    result.totalFiles = diffsGroupedByFilenames.length;
    
    // Process each file diff
    for (const diffGroup of diffsGroupedByFilenames) {
      const fileResult = applyDiffToFile(diffGroup, basePath, dryRun, jsDiffApplyPatchOptions);
      
      // Add this file's results to the overall result
      result.fileResults.push(fileResult);
      result.totalHunks += fileResult.totalHunks;
      result.appliedHunks += fileResult.appliedHunks;
      result.failedHunks += fileResult.failedHunks;
      
      if (fileResult.success) {
        result.successfulFiles++;
      } else {
        result.failedFiles++;
        result.success = false;
        result.errors.push(...fileResult.errors);
      }
    }
  } catch (error) {
    // Handle errors that occur during parsing
    result.success = false;
    
    if (error instanceof BaseError) {
      result.errors.push(error);
    } else {
      // Convert unknown errors to BaseError
      const baseError = new BaseError(
        error instanceof Error ? error.message : String(error),
        'Error occurred during patch parsing'
      );
      result.errors.push(baseError);
    }
  }

  return result;
}

/**
 * Applies diffs for a single file
 * @param diffGroup The diff group for a single file
 * @param basePath The base path to resolve file paths
 * @param dryRun Whether to actually write files or just simulate
 * @param options Optional options to pass to the diff application
 * @returns Result object for this file
 */
function applyDiffToFile(
  diffGroup: DiffsGroupedByFilenames, 
  basePath: string, 
  dryRun: boolean,
  options?: Diff.ApplyPatchOptions
): FileDiffResult {
  const oldFilePath = path.join(basePath, diffGroup.oldFileName);
  const newFilePath = path.join(basePath, diffGroup.newFileName);
  
  const fileResult: FileDiffResult = {
    oldFileName: diffGroup.oldFileName,
    newFileName: diffGroup.newFileName,
    totalHunks: diffGroup.diffs.length,
    appliedHunks: 0,
    failedHunks: 0,
    errors: [],
    success: true
  };

  // Read the original file
  let fileContents: string;
  try {
    fileContents = fs.readFileSync(oldFilePath, 'utf8');
  } catch (error) {
    const fileError = new FileOperationError(
      oldFilePath,
      `Error reading source file: ${error instanceof Error ? error.message : String(error)}`,
      `old file ${oldFilePath} not found`
    );
    fileResult.errors.push(fileError);
    fileResult.failedHunks = diffGroup.diffs.length;
    fileResult.success = false;
    return fileResult;
  }

  // Apply each hunk to the file
  let modifiedContents = fileContents;
  for (let i = 0; i < diffGroup.diffs.length; i++) {
    const diff = diffGroup.diffs[i];
    
    try {
      const result = applyDiff(modifiedContents, diff, options);
      
      if (result) {
        modifiedContents = result;
        fileResult.appliedHunks++;
      } else {
        // If applyDiff returns null/undefined, the hunk failed to apply
        const patchError = new PatchApplicationError(
          newFilePath,
          i,
          `Failed to apply hunk ${i + 1}`,
          `Hunk ${i + 1} could not be applied`
        );
        fileResult.errors.push(patchError);
        fileResult.failedHunks++;
        fileResult.success = false;
      }
    } catch (error) {
      // Handle errors during application of individual hunks
      const patchError = new PatchApplicationError(
        newFilePath,
        i,
        `Error applying hunk ${i + 1}: ${error instanceof Error ? error.message : String(error)}`,
        `Error in hunk ${i + 1}`
      );
      fileResult.errors.push(patchError);
      fileResult.failedHunks++;
      fileResult.success = false;
    }
  }

  // Write the modified contents to the new file if there were no errors
  // and this is not a dry run
  if (fileResult.success && !dryRun) {
    try {
      // Ensure directory exists
      const newFileDir = path.dirname(newFilePath);
      if (!fs.existsSync(newFileDir)) {
        fs.mkdirSync(newFileDir, { recursive: true });
      }
      
      // Write the new file
      fs.writeFileSync(newFilePath, modifiedContents, 'utf8');
    } catch (error) {
      const fileError = new FileOperationError(
        newFilePath,
        `Error writing target file: ${error instanceof Error ? error.message : String(error)}`,
        `Failed to write to ${newFilePath}`
      );
      fileResult.errors.push(fileError);
      fileResult.success = false;
    }
  }

  return fileResult;
}