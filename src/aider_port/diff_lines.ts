/**
 * TypeScript implementation of diff_lines function from the Python version.
 * Converts two text blocks into unified diff format lines.
 */

import { diff_match_patch } from 'diff-match-patch';
import { normalizeLineEndings } from './normalize_utils';

/**
 * Creates a unified diff of two text blocks, line by line.
 * This is a TypeScript implementation of the Python diff_lines function.
 * 
 * @param searchText - Original text
 * @param replaceText - Modified text
 * @returns Array of diff lines, each prefixed with '+', '-', or ' '
 */
export function diffLines(searchText: string, replaceText: string): string[] {
  // Normalize line endings
  searchText = normalizeLineEndings(searchText);
  replaceText = normalizeLineEndings(replaceText);
  
  const dmp = new diff_match_patch();
  dmp.Diff_Timeout = 5;
  // dmp.Diff_EditCost = 16; // Uncomment if needed for matching Python behavior

  // Convert text to lines for character-by-character comparison
  const { chars1: searchLines, chars2: replaceLines, lineArray: mapping } = dmp.diff_linesToChars_(searchText, replaceText);

  // Compute the diff
  const diffLines = dmp.diff_main(searchLines, replaceLines, false);
  
  // Clean up the diff for better readability
  dmp.diff_cleanupSemantic(diffLines);
  dmp.diff_cleanupEfficiency(diffLines);
  
  // Convert diff back to lines
  dmp.diff_charsToLines_(diffLines, mapping);
  
  // Convert to unified diff format
  const udiff: string[] = [];
  
  for (const [d, lines] of diffLines) {
    let prefix: string;
    if (d < 0) {
      prefix = "-";
    } else if (d > 0) {
      prefix = "+";
    } else {
      prefix = " ";
    }
    
    // Split the lines and add prefix to each
    const splitLines = lines.split(/\r?\n/);
    
    // Handle the case where the last entry might be an empty string due to trailing newline
    for (let i = 0; i < splitLines.length; i++) {
      const line = splitLines[i];
      
      // Only add newline if it's not the last empty element
      if (i < splitLines.length - 1 || line !== "") {
        udiff.push(prefix + line + "\n");
      }
    }
  }
  
  return udiff;
}
