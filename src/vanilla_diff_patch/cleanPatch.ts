import {InsufficientContextLinesError, NoEditsInHunkError, NotEnoughContextError, PatchFormatError} from "./errors";

// Define valid line prefixes
const validPrefixes = ['+', '-', ' ', '\\', '@'];

/**
 * Utility to clean up patch files:
 * - Trims empty lines from the beginning and end of the patch
 * - Removes empty lines around headers (---, +++, @@)
 * - Updates line counts in @@ headers based on actual content
 * - Validates all line prefixes within hunks
 * - Verifies minimum number of context lines if specified
 *
 * @param patchContent - The patch string to clean
 * @param minContextLines - Minimum number of context lines required (lines starting with " " or "-")
 * @returns The cleaned patch string
 * @throws {PatchFormatError} When encountering invalid line prefixes within a hunk
 * @throws {InsufficientContextLinesError} When there are not enough context lines
 */
export function cleanPatch(patchContent: string, minContextLines?: number): string {
  // Return early if empty
  if (!patchContent) {
    return '';
  }

  // Add or remove operation encountered
  let foundEdit: boolean = false;

  // First, trim the entire patch to remove empty lines at beginning and end
  patchContent = patchContent.trim();

  let lines: string[] = patchContent.split('\n');

  // remove empty lines
  lines = lines.filter((line) => line !== '');

  // validate line prefixes
  lines.forEach(line => {
    const operation = line[0];
    // Check if first character is not in validPrefixes
    if (!validPrefixes.includes(operation)) {
      throw new PatchFormatError(
        line,
        `Invalid line prefix: '${operation}'. Valid prefixes within a hunk are '+', '-', ' ', and '\\'`
      );
    }
  })

  // Create a new array to store cleaned lines
  const cleanedLines: string[] = [];

  // Flag to track if we're within a hunk
  let inHunk: boolean = false;

  // Track the current header position and counts for updating
  let currentHeaderIndex: number = -1;
  let removeCount: number = 0;
  let addCount: number = 0;
  let contextLines: number = 0;

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line: string = lines[i];

    // Check if line is a file header (--- or +++)
    if (line.startsWith('---') || line.startsWith('+++')) {
      while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() === '') {
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
      // If we were in a hunk before, update the previous header and check context lines
      if (inHunk && currentHeaderIndex !== -1) {
        if (removeCount === 0) {
          throw new NotEnoughContextError(
            cleanedLines[currentHeaderIndex]
          );
        }

        if (!foundEdit) {
          throw new NoEditsInHunkError(cleanedLines[currentHeaderIndex]);
        }

        // Check minimum context lines if specified
        if (minContextLines !== undefined && contextLines < minContextLines) {
          throw new InsufficientContextLinesError(
            cleanedLines[currentHeaderIndex],
            minContextLines,
            contextLines
          );
        }

        foundEdit = false;
        cleanedLines[currentHeaderIndex] = `@@ -1,${removeCount} +1,${addCount} @@`;
      }

      // Reset counters for the new hunk
      removeCount = 0;
      addCount = 0;
      contextLines = 0;
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
      const operation = line[0];

      cleanedLines.push(line);

      if (operation === '+') {
        addCount++;
        foundEdit = true;
      } else if (operation === '-') {
        removeCount++;
        foundEdit = true;
        contextLines++;
      } else if (operation === ' ') {
        addCount++;
        removeCount++;
        contextLines++;
      }
    } else {
      // If we're not in a hunk, just add the line
      cleanedLines.push(line);
    }
  }

  // Update the last header if needed and check context lines
  if (inHunk && currentHeaderIndex !== -1) {
    if (removeCount === 0) {
      throw new NotEnoughContextError(
        cleanedLines[currentHeaderIndex]
      );
    }

    if (!foundEdit) {
      throw new NoEditsInHunkError(cleanedLines[currentHeaderIndex]);
    }

    // Check minimum context lines if specified
    if (minContextLines !== undefined && contextLines < minContextLines) {
      throw new InsufficientContextLinesError(
        cleanedLines[currentHeaderIndex],
        minContextLines,
        contextLines
      );
    }

    cleanedLines[currentHeaderIndex] = `@@ -1,${removeCount} +1,${addCount} @@`;
  }

  // Join all lines and return
  return cleanedLines.join('\n');
}
