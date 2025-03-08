import * as fs from 'fs';
import * as path from 'path';
import { findDiffs } from './aider_udiff';
import { applyHunks } from './apply_hunk';
import { normalizeLineEndings } from './normalize_utils';

/**
 * Error class for base errors
 */
export class BaseError extends Error {
  context: string;

  constructor(message: string, context: string = '') {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context
    };
  }
}

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
}

/**
 * Applies a patch/diff to files in the file system using Aider's implementation
 * @param patchString The patch/diff string to apply
 * @param options Configuration options including basePath and dryRun flag
 * @returns A result object with details about the application
 */
export function applyPatchToFiles(patchString: string, options: {
  basePath: string;
  dryRun?: boolean;
}): ApplyDiffResult {
  const {
    basePath = process.cwd(),
    dryRun = false
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
    // Parse the patch using aider_udiff's findDiffs
    // First, strip any "a/" and "b/" prefixes from the file paths
    let normalizedPatch = patchString;
    
    // Find lines starting with "--- " and "+++ " and strip "a/" and "b/" prefixes
    const lines = normalizedPatch.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('--- a/')) {
        lines[i] = '--- ' + line.substring(6);
      } else if (line.startsWith('+++ b/')) {
        lines[i] = '+++ ' + line.substring(6);
      }
    }
    
    // Rejoin the lines
    normalizedPatch = lines.join('\n');
    
    // Check if the patch is wrapped in ```diff code fence
    let processedPatch = patchString;
    
    // If the patch doesn't start with ```diff, wrap it
    if (!processedPatch.trim().startsWith('```diff')) {
      // Ensure the patch doesn't already have markdown fences inside it
      if (!processedPatch.includes('```')) {
        processedPatch = '```diff\n' + processedPatch;
        if (!processedPatch.endsWith('\n')) {
          processedPatch += '\n';
        }
        processedPatch += '```';
      }
    }
    const diffGroups = findDiffs(processedPatch);
    result.totalFiles = diffGroups.length;
    
    // Process each file diff
    for (const diffGroup of diffGroups) {
      const fileResult = applyDiffToFile(diffGroup, basePath, dryRun);
      
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
 * Applies diffs for a single file using Aider's implementation
 * @param diffGroup The diff group for a single file
 * @param basePath The base path to resolve file paths
 * @param dryRun Whether to actually write files or just simulate
 * @returns Result object for this file
 */
function applyDiffToFile(
  diffGroup: { oldFileName: string, newFileName: string, hunks: string[][] }, 
  basePath: string, 
  dryRun: boolean
): FileDiffResult {
  const oldFilePath = path.join(basePath, diffGroup.oldFileName);
  const newFilePath = path.join(basePath, diffGroup.newFileName);
  
  const fileResult: FileDiffResult = {
    oldFileName: diffGroup.oldFileName,
    newFileName: diffGroup.newFileName,
    totalHunks: diffGroup.hunks.length,
    appliedHunks: 0,
    failedHunks: 0,
    errors: [],
    success: true
  };

  // Read the original file
  let fileContents: string;
  try {
    fileContents = fs.readFileSync(oldFilePath, 'utf8');
    // Normalize line endings
    fileContents = normalizeLineEndings(fileContents);
  } catch (error) {
    const fileError = new FileOperationError(
      oldFilePath,
      `Error reading source file: ${error instanceof Error ? error.message : String(error)}`,
      `old file ${oldFilePath} not found`
    );
    fileResult.errors.push(fileError);
    fileResult.failedHunks = diffGroup.hunks.length;
    fileResult.success = false;
    return fileResult;
  }

  // Apply each hunk to the file
  let modifiedContents = fileContents;
  for (let i = 0; i < diffGroup.hunks.length; i++) {
    const hunk = diffGroup.hunks[i];
    
    try {
      const result = applyHunks(modifiedContents, hunk);
      
      if (result) {
        modifiedContents = result;
        fileResult.appliedHunks++;
      } else {
        // If applyHunks returns undefined, the hunk failed to apply
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

// Export core functions
export { findDiffs } from './aider_udiff';
export { applyHunks } from './apply_hunk';
