import * as Diff from 'diff';
import { ParsedDiff } from 'diff';
import {
  HunkHeaderCountMismatchError,
  NoEditsInHunkError,
  NotEnoughContextError,
  PatchFormatError
} from "./utils/errors";

export function applyDiff(source: string, diff: ParsedDiff, options?: Diff.ApplyPatchOptions) {
  // check for duplicate match
  // error handling
  return Diff.applyPatch(source, diff, options);
}

export interface DiffsGroupedByFilenames {
  oldFileName: string
  newFileName: string
  diffs: ParsedDiff[]
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

export function parsePatch(_patch: string) {
  const patch = cleanPatch(_patch);

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


/**
 * Utility to clean up patch files:
 * - Trims empty lines from the beginning and end of the patch
 * - Removes empty lines around headers (---, +++, @@)
 * - Updates line counts in @@ headers based on actual content
 * - Validates all line prefixes within hunks
 *
 * @param patchContent - The patch string to clean
 * @returns The cleaned patch string
 * @throws {PatchFormatError} When encountering invalid line prefixes within a hunk
 */
export function cleanPatch(patchContent: string): string {
  // Return early if empty
  if (!patchContent) {
    return '';
  }

  // Add or remove operation encountered
  let foundEdit: boolean = false;

  // First, trim the entire patch to remove empty lines at beginning and end
  patchContent = patchContent.trim();

  // Split the patch into lines
  const lines: string[] = patchContent.split('\n');

  // Create a new array to store cleaned lines
  const cleanedLines: string[] = [];

  // Flag to track if we're within a hunk
  let inHunk: boolean = false;

  // Track the current header position and counts for updating
  let currentHeaderIndex: number = -1;
  let removeCount: number = 0;
  let addCount: number = 0;

  // Define valid line prefixes
  const validPrefixes = ['+', '-', ' ', '\\'];

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line: string = lines[i];

    // Check if line is a file header (--- or +++)
    if (line.startsWith('---') || line.startsWith('+++')) {
      // Skip empty lines before header
      if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === '') {
        cleanedLines.pop();
      }

      // Add the header
      cleanedLines.push(line);

      // Skip any empty lines after header
      while (i + 1 < lines.length && lines[i + 1].trim() === '') {
        i++;
      }

      continue;
    }

    // Check if line is a hunk header (@@ -x,y +x,y @@)
    if (line.startsWith('@@')) {
      // If we were in a hunk before, update the previous header
      if (inHunk && currentHeaderIndex !== -1) {
        if (removeCount === 0) {
          throw new NotEnoughContextError(
            cleanedLines[currentHeaderIndex]
          );
        }

        if (!foundEdit) {
          throw new NoEditsInHunkError(cleanedLines[currentHeaderIndex]);
        }
        foundEdit = false;
        cleanedLines[currentHeaderIndex] = `@@ -1,${removeCount} +1,${addCount} @@`;
      }

      // Reset counters for the new hunk
      removeCount = 0;
      addCount = 0;
      inHunk = true;

      // Skip empty lines before header
      if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === '') {
        cleanedLines.pop();
      }

      // Store the header position for later update
      cleanedLines.push(line);
      currentHeaderIndex = cleanedLines.length - 1;

      // Skip any empty lines after header
      while (i + 1 < lines.length && lines[i + 1].trim() === '') {
        i++;
      }

      continue;
    }

    // Process content lines
    if (inHunk) {
      if (line.trim() === '') {
        // Empty lines within hunks are allowed
        cleanedLines.push(line);
        continue;
      }

      const operation = line[0];

      if (validPrefixes.includes(operation)) {
        cleanedLines.push(line);

        if (operation === '+') {
          addCount++;
          foundEdit = true;
        } else if (operation === '-') {
          removeCount++;
          foundEdit = true;
        } else if (operation === ' ') {
          addCount++;
          removeCount++;
        }
      } else {
        // Throw error for invalid line prefix
        throw new PatchFormatError(
          line,
          `Invalid line prefix: '${operation}'. Valid prefixes within a hunk are '+', '-', ' ', and '\\'`
        );
      }
    } else {
      // If we're not in a hunk, just add the line
      cleanedLines.push(line);
    }
  }

  // Update the last header if needed
  if (inHunk && currentHeaderIndex !== -1) {
    if (removeCount === 0) {
      throw new NotEnoughContextError(
        cleanedLines[currentHeaderIndex]
      );
    }

    cleanedLines[currentHeaderIndex] = `@@ -1,${removeCount} +1,${addCount} @@`;

    if (!foundEdit) {
      throw new NoEditsInHunkError(cleanedLines[currentHeaderIndex]);
    }
  }



  // Join all lines and return
  return cleanedLines.join('\n');
}
