import * as Diff from 'diff';
import {ParsedDiff} from 'diff';
import {HunkHeaderCountMismatchError, InsufficientContextLinesError} from "./errors";
import {cleanPatch} from "./cleanPatch";

export interface DiffsGroupedByFilenames {
  oldFileName: string
  newFileName: string
  diffs: ParsedDiff[]
}

export interface ParsePatchOptions {
  minContextLines?: number;
}

/**
 * Counts the number of hunk headers in a patch string
 * Hunk headers are lines that start with @@ and end with @@
 * @param patch The patch text to analyze
 * @returns The number of hunk headers found
 */
export function countHunkHeaders(patch: string): number {
  if (!patch) return 0;

  // Split the patch into lines and count lines that match hunk header pattern
  const lines = patch.split('\n');
  let count = 0;

  for (const line of lines) {
    // Hunk headers start with @@ and contain additional @@ on the same line
    if (line.trim().startsWith('@@') && line.trim().indexOf('@@', 2) !== -1 && line.trim().endsWith('@@')) {
      count++;
    }
  }

  return count;
}

export function parsePatch(_patch: string, options?: ParsePatchOptions) {
  const minContextLines = options?.minContextLines;
  const patch = cleanPatch(_patch, minContextLines);

  const parsedDiffs: ParsedDiff[] = Diff.parsePatch(patch);
  const result: DiffsGroupedByFilenames[] = [];

  // Count actual hunk headers in the input patch
  const hunkHeaderCount = countHunkHeaders(patch);

  // Count the total number of hunks in parsed diffs
  let parsedHunksCount = 0;
  parsedDiffs.forEach(diff => {
    parsedHunksCount += diff.hunks.length;
  });

  // Validate that counts match
  if (hunkHeaderCount > 0 && hunkHeaderCount !== parsedHunksCount) {
    throw new HunkHeaderCountMismatchError('', `Hunk header count mismatch: Found ${hunkHeaderCount} hunk headers in patch but parsed ${parsedHunksCount} hunks`);
  }

  parsedDiffs.forEach(diff => {
    // Create a FileDiffs object with file information
    const fileDiff: DiffsGroupedByFilenames = {
      oldFileName: diff.oldFileName ? diff.oldFileName.replace(/^a\//, '') : '',
      newFileName: diff.newFileName ? diff.newFileName.replace(/^b\//, '') : '',
      diffs: []
    };

    // Split the original diff into single-hunk diffs
    diff.hunks.forEach(hunk => {
      const singleHunkDiff: ParsedDiff = {
        oldFileName: diff.oldFileName,
        newFileName: diff.newFileName,
        hunks: [{
          ...hunk,
          oldStart: 1,
          oldLines: 1,
          newLines: 1,
          newStart: 1
        }]
      };

      fileDiff.diffs.push(singleHunkDiff);
    });

    result.push(fileDiff);
  });

  return result;
}
