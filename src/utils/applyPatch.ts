import { applyPatch } from 'diff';

/**
 * Custom error for when a patch matches multiple locations in the source content
 */
export class BeforeTextNotUniqueError extends Error {
  constructor(beforeText: string) {
    super(`Multiple instances of the "before text" found in the source content. The patch cannot be applied uniquely.`);
    this.name = 'BeforeTextNotUniqueError';
  }
}

/**
 * Options for applying a patch
 */
export interface ApplyPatchOptions {
  /** 
   * Maximum allowed fuzziness when matching context lines
   * Higher values allow more flexibility in finding matching locations
   * Default: 0
   */
  fuzzFactor?: number;

  /**
   * Automatically detect and handle line ending differences
   * Default: true
   */
  autoConvertLineEndings?: boolean;

  /**
   * Custom function for comparing lines
   * Can be used to implement fuzzy line matching beyond what fuzzFactor allows
   */
  compareLine?: (lineNumber: number, line: string, operation: string, patchContent: string) => boolean;

  /**
   * Skip checking for duplicate "before text" in the source
   * By default, the function throws an error if the "before text" appears multiple times
   * Default: false
   */
  skipDuplicateCheck?: boolean;
}

/**
 * Result of applying a patch
 */
export interface PatchResult {
  /** Whether the patch was successfully applied */
  success: boolean;
  /** The resulting text after applying the patch, or the original text if failed */
  result: string;
  /** Error message if the patch failed */
  error?: string;
}

/**
 * Checks if the beforeText appears multiple times in the source
 * 
 * @param sourceText - The source text to check
 * @param beforeText - The before text to look for
 * @returns True if the beforeText appears multiple times
 */
function hasMultipleMatches(sourceText: string, beforeText: string): boolean {
  // Normalize line endings to ensure consistent comparison
  const normalizedSource = sourceText.replace(/\r\n/g, '\n') + "\n";
  const normalizedBefore = beforeText.replace(/\r\n/g, '\n');
  
  // If the before text is empty or too short, don't perform duplicate check
  if (!normalizedBefore || normalizedBefore.length < 5) {
    return false;
  }
  
  const firstIndex = normalizedSource.indexOf(normalizedBefore);
  if (firstIndex === -1) {
    return false;
  }
  
  const secondIndex = normalizedSource.indexOf(normalizedBefore, firstIndex + 1);
  return secondIndex !== -1;
}

/**
 * Applies a single hunk to source text
 * 
 * @param sourceText - The source text to patch
 * @param hunk - The hunk object from DiffHunkExtractor
 * @param options - Options for applying the patch
 * @returns The result of applying the patch
 * @throws BeforeTextNotUniqueError if the beforeText appears multiple times and skipDuplicateCheck is false
 */
export function applyHunkPatch(
  sourceText: string,
  hunk: {
    diff: string;
    beforeText: string;
    afterText: string;
  },
  options: ApplyPatchOptions = {}
): PatchResult {
  // Set default options
  const mergedOptions = {
    fuzzFactor: options.fuzzFactor ?? 0,
    autoConvertLineEndings: options.autoConvertLineEndings ?? true,
    compareLine: (lineNumber: number, line: string, operation: string, patchContent: string) => {
      return line === patchContent;
    }
  };

  try {
    // Check for duplicate matches before applying the patch
    if (hasMultipleMatches(sourceText, hunk.beforeText)) {
      throw new BeforeTextNotUniqueError(hunk.beforeText);
    }

    // Apply the patch
    const result = applyPatch(sourceText, hunk.diff, mergedOptions);

    if (result === false) {
      return {
        success: false,
        result: sourceText,
        error: "Failed to apply patch"
      };
    }

    return {
      success: true,
      result: result.toString()
    };
  } catch (error) {
    return {
      success: false,
      result: sourceText,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Applies multiple hunks to source text
 * 
 * @param sourceText - The source text to patch
 * @param hunks - Array of hunk objects from DiffHunkExtractor
 * @param options - Options for applying the patches
 * @returns The result of applying all patches with details
 */
export interface ApplyHunksResult extends PatchResult {
  /** Details about each hunk that was applied */
  hunks: Array<{
    /** Index of the hunk in the original array */
    index: number;
    /** Whether this hunk was successfully applied */
    applied: boolean;
    /** Error message if this hunk failed to apply */
    error?: string;
  }>;
}

export function applyHunks(
  sourceText: string,
  hunks: Array<{
    diff: string;
    beforeText: string;
    afterText: string;
  }>,
  options: ApplyPatchOptions = {}
): ApplyHunksResult {
  let currentText = sourceText;
  const hunkResults: ApplyHunksResult['hunks'] = [];
  let anySuccess = false;

  // Apply each hunk in sequence
  for (let i = 0; i < hunks.length; i++) {
    const result = applyHunkPatch(currentText, hunks[i], options);
    
    if (result.success) {
      currentText = result.result;
      anySuccess = true;
      hunkResults.push({
        index: i,
        applied: true
      });
    } else {
      hunkResults.push({
        index: i,
        applied: false,
        error: result.error
      });
    }
  }

  return {
    success: anySuccess,
    result: currentText,
    hunks: hunkResults,
    error: anySuccess ? undefined : "Failed to apply any hunks"
  };
}
