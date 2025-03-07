import { hunkToBeforeAfter } from './aider_udiff';
import { diffLines } from './diff_lines';
import unidiff from "unidiff";
import { normalizeLineEndings } from './normalize_utils';

/**
 * Makes new lines explicit in a hunk by adjusting the context to better match the content.
 * This helps when there are lines in the content that aren't in the hunk's context.
 * 
 * @param content The content to which the hunk will be applied
 * @param hunk The diff hunk to adjust
 * @returns An adjusted hunk that makes new lines more explicit
 */
export function makeNewLinesExplicit(content: string, hunk: string[]): string[] {
  // Normalize line endings
  content = normalizeLineEndings(content);
  hunk = hunk.map(normalizeLineEndings);
  
  const [before, after] = hunkToBeforeAfter(hunk) as [string, string];

  // Create a diff that shows what's different between the hunk's "before" text
  // and the actual content
  const diff = diffLines(before, content);

  // Filter the diff to keep only lines that are in "before" but not in content,
  // or are common to both
  const backDiff: string[] = [];
  for (const line of diff) {
    if (line[0] === '+') {
      // Skip lines that are in content but not in "before"
      continue;
    }
    backDiff.push(line);
  }

  // Apply this back-diff to get a new "before" that better reflects the content
  const directResult = directlyApplyBackDiff(before, backDiff);
  if (!directResult || directResult.trim().length < 10) {
    return hunk;
  }

  const beforeLines = before.split(/\r?\n/);
  const newBeforeLines = directResult.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);

  // If we've lost too much context, stick with the original hunk
  if (newBeforeLines.length < beforeLines.length * 0.66) {
    return hunk;
  }

  // Create a new unified diff using the adjusted before and the original after
  const patch = unidiff.diffLines(
    newBeforeLines.map(line => line + "\n"), 
    afterLines.map(line => line + "\n")
  );
  
  const maxContextLines = Math.max(newBeforeLines.length, afterLines.length);
  const formattedPatch = unidiff.formatLines(patch, { context: maxContextLines });
  
  // Extract hunk lines
  const patchLines = formattedPatch.split(/\r?\n/);
  let startIndex = 0;
  for (let i = 0; i < patchLines.length; i++) {
    if (patchLines[i].startsWith('@@')) {
      startIndex = i + 1;
      break;
    }
  }
  
  // Return the new hunk (excluding empty last line if present)
  const newHunk = patchLines.slice(startIndex).filter(line => line !== '');
  return newHunk.map(line => line + "\n");
}

/**
 * Helper function to apply a filtered diff to text
 * Similar to directly_apply_hunk but simplified for this specific use case
 * 
 * @param text The text to modify
 * @param diff The filtered diff to apply
 * @returns The modified text or undefined if application fails
 */
function directlyApplyBackDiff(text: string, diff: string[]): string | undefined {
  let result = '';
  const lines = text.split(/\r?\n/);
  let lineIndex = 0;
  
  for (const diffLine of diff) {
    const op = diffLine[0];
    const content = diffLine.substring(1);
    
    if (op === ' ') {
      // Context line - add it and advance in the original
      result += content;
      lineIndex++;
    } else if (op === '-') {
      // Line to remove - skip in the original
      lineIndex++;
    } else if (op === '+') {
      // Line to add - add it but don't advance in the original
      result += content;
    }
    
    if (lineIndex > lines.length) {
      // Something went wrong, diff couldn't be applied cleanly
      return undefined;
    }
  }
  
  return result;
}
