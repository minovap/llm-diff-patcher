import {NoEditsInHunkError, NotEnoughContextError, PatchFormatError} from "./errors";

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
