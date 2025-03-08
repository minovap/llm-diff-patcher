import { applyHunks } from './apply_hunk';
import { hunkToBeforeAfter } from './aider_udiff';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeLineEndings } from './normalize_utils';

/**
 * Applies a diff hunk to a file or creates a new file if necessary.
 * Follows the same logic as the Python version.
 *
 * @param fname - File path to modify
 * @param content - Current content of the file, or null if file doesn't exist
 * @param hunk - The diff hunk to apply
 * @returns The new content if successful, or undefined if application fails
 */
export function doReplace(
  fname: string,
  content: string | null,
  hunk: string[]
): string | undefined {
  // Normalize line endings
  if (content) content = normalizeLineEndings(content);
  hunk = hunk.map(normalizeLineEndings);
  
  const [beforeText, afterText] = hunkToBeforeAfter(hunk) as [string, string];

  // Does it want to make a new file?
  if (!fs.existsSync(fname) && !beforeText.trim()) {
    fs.mkdirSync(path.dirname(fname), { recursive: true });
    fs.writeFileSync(fname, '');
    content = '';
  }

  if (content === null) {
    return undefined;
  }

  // Handle inserting into new file or appending to existing file
  if (!beforeText.trim()) {
    // Append to existing file, or start a new file
    const newContent = content + afterText;
    return newContent;
  }

  // Try to apply the hunk to the content
  const newContent = applyHunks(content, hunk);
  if (newContent) {
    return newContent;
  }

  return undefined;
}

/**
 * Helper function to collapse repeated characters in a string.
 * This is the TypeScript implementation of the Python collapse_repeats function.
 *
 * @param s - String to process
 * @returns String with consecutive duplicate characters replaced by a single instance
 */
export function collapseRepeats(s: string): string {
  let result = '';
  let lastChar = '';

  for (const char of s) {
    if (char !== lastChar) {
      result += char;
      lastChar = char;
    }
  }

  return result;
}
