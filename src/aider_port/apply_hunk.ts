import { directlyApplyHunk, hunkToBeforeAfter } from './aider_udiff';
import { diffLines } from './diff_lines';
import { makeNewLinesExplicit } from './make_new_lines_explicit';
import { normalizeLineEndings } from './normalize_utils';

/**
 * Groups an array by consecutive items with the same key.
 *
 * @param array Array to group
 * @param keyFn Function to determine the key for each item
 * @returns Array of groups, where each group is an array of consecutive items with the same key
 */
function groupByConsecutive<T>(array: T[], keyFn: (item: T) => string): T[][] {
  if (array.length === 0) return [];
  
  const result: T[][] = [];
  let currentGroup: T[] = [array[0]];
  let currentKey = keyFn(array[0]);

  for (let i = 1; i < array.length; i++) {
    const key = keyFn(array[i]);
    if (key === currentKey) {
      currentGroup.push(array[i]);
    } else {
      result.push(currentGroup);
      currentGroup = [array[i]];
      currentKey = key;
    }
  }

  if (currentGroup.length > 0) {
    result.push(currentGroup);
  }

  return result;
}

/**
 * Applies a partial hunk to content, trying different context sizes.
 *
 * @param content Original content to modify
 * @param precedingContext Lines preceding the changes
 * @param changes The actual changes to apply
 * @param followingContext Lines following the changes
 * @returns Modified content or undefined if application fails
 */
function applyPartialHunk(
  content: string,
  precedingContext: string[],
  changes: string[],
  followingContext: string[]
): string | undefined {
  const lenPrec = precedingContext.length;
  const lenFoll = followingContext.length;
  const useAll = lenPrec + lenFoll;

  // Try with decreasing context size
  for (let drop = 0; drop <= useAll; drop++) {
    const use = useAll - drop;

    for (let usePrec = lenPrec; usePrec >= 0; usePrec--) {
      if (usePrec > use) continue;

      const useFoll = use - usePrec;
      if (useFoll > lenFoll) continue;

      const thisPrec = usePrec ? precedingContext.slice(-usePrec) : [];
      const thisFoll = followingContext.slice(0, useFoll);

      const result = directlyApplyHunk(content, [...thisPrec, ...changes, ...thisFoll]);
      if (result) {
        return result;
      }
    }
  }

  return undefined;
}

/**
 * Applies a diff hunk to content, handling cases where direct application fails.
 * This implementation follows the logic of the Python version but adapted for TypeScript.
 *
 * @param content The original content to modify
 * @param hunk Array of strings representing the diff hunk
 * @returns The modified content or undefined if the hunk couldn't be applied
 */
export function applyHunks(content: string, hunk: string[]): string | undefined {
  // Normalize line endings
  content = normalizeLineEndings(content);
  hunk = hunk.map(normalizeLineEndings);
  
  const [beforeText, afterText] = hunkToBeforeAfter(hunk) as [string, string];

  // Try direct application first
  const res = directlyApplyHunk(content, hunk);
  if (res) {
    return res;
  }

  // Make new lines explicit to improve matching
  const enhancedHunk = makeNewLinesExplicit(content, hunk);

  // Process the hunk into operations
  // Just consider space vs not-space (x)
  const ops = enhancedHunk
    .map(line => normalizeLineEndings(line)[0] || ' ')
    .join('')
    .replace(/-/g, 'x')
    .replace(/\+/g, 'x')
    .replace(/\n/g, ' ');

  // Group hunk lines by operation type (context, changes, context, changes, ...)
  const sections: string[][] = [];
  let currentOp = ' ';
  let currentSection: string[] = [];

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op !== currentOp) {
      if (currentSection.length > 0) {
        sections.push(currentSection);
      }
      currentSection = [];
      currentOp = op;
    }
    currentSection.push(enhancedHunk[i]);
  }

  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  // If last section isn't context, add an empty context section
  if (currentOp !== ' ') {
    sections.push([]);
  }

  // Process sections in triplets (context, changes, context)
  let modifiedContent = normalizeLineEndings(content);
  let allDone = true;

  for (let i = 2; i < sections.length; i += 2) {
    const precedingContext = sections[i - 2];
    const changes = sections[i - 1];
    const followingContext = sections[i];

    const res = applyPartialHunk(modifiedContent, precedingContext, changes, followingContext);
    if (res) {
      modifiedContent = res;
    } else {
      allDone = false;
      break;
    }
  }

  return allDone ? modifiedContent : undefined;
}
