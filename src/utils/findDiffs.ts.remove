import { processFencedBlock, Hunk } from './processFencedBlock';

export class NoFilenameForHunkError extends Error {
  constructor(public hunk: string) {
    super(`Invalid diff format: No filename specified for hunk:\n${hunk}`);
    this.name = 'NoFilenameForHunkError';
  }
}

export class InsufficientContextError extends Error {
  constructor(public hunk: string) {
    super(`Invalid diff format: Insufficient context to apply changes reliably:\n${hunk}\nPlease provide context lines before and after the changes.`);
    this.name = 'InsufficientContextError';
  }
}

/**
 * Parse a unified diff text into FileHunks objects
 */
export function findDiffs(diffText: string): Hunk[] {
  // Ensure the diff text ends with a newline
  if (!diffText.endsWith('\n')) {
    diffText += '\n';
  }

  const lines = diffText.split('\n').map(line => line + '\n');
  const fileDiffs: Hunk[] = [];

  let lineNum = 0;
  while (lineNum < lines.length) {
    const line = lines[lineNum];
    if (line.startsWith('```diff')) {
      const result = processFencedBlock(lines, lineNum + 1);
      
      // Convert processed hunks to FileHunks format
      for (const hunk of result.hunks) {
        if (!hunk.oldFile && !hunk.newFile) {
          const hunkContent = hunk.lines.join('');
          throw new NoFilenameForHunkError(hunkContent);
        }

        hunk.oldFile = hunk.oldFile ? parseFileName(hunk.oldFile) : null;
        hunk.newFile = hunk.newFile ? parseFileName(hunk.newFile) : null;

        fileDiffs.push(hunk);
      }
      
      lineNum = result.nextLineNumber;
      continue;
    }

    // Just a regular line, move on
    lineNum++;
  }

  return fileDiffs;
}

/**
 * Parse a filename from a diff header, handling special cases
 * - Strip a/ and b/ prefixes
 * - Convert /dev/null to null
 */
function parseFileName(filename: string): string | null {
  if (filename === '/dev/null') {
    return null;
  }
  
  // Remove a/ or b/ prefix if present
  if (filename.startsWith('a/') || filename.startsWith('b/')) {
    return filename.substring(2);
  }
  
  return filename;
}