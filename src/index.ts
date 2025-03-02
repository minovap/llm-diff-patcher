import { diffArrays } from 'diff';
import { findDiffs } from "./utils/findDiffs";

/**
 * Custom error for when a diff cannot be matched to the source content
 */
export class UnifiedDiffNoMatchError extends Error {
  original: string;
  numLines: number;

  constructor(original: string) {
    const numLines = original.split('\n').length;
    const message = `UnifiedDiffNoMatch: hunk failed to apply!

The source text does not contain lines that match the diff you provided!
Try again.
DO NOT skip blank lines, comments, docstrings, etc!
The diff needs to apply cleanly to the lines in the source text!

The source text does not contain these ${numLines} exact lines in a row:
\`\`\`
${original}\`\`\``;
    super(message);
    this.name = 'UnifiedDiffNoMatchError';
    this.original = original;
    this.numLines = numLines;
  }
}

/**
 * Custom error for when a diff matches multiple locations in the source content
 */
export class UnifiedDiffNotUniqueError extends Error {
  original: string;
  numLines: number;

  constructor(original: string) {
    const numLines = original.split('\n').length;
    const message = `UnifiedDiffNotUnique: hunk failed to apply!

The source text contains multiple sets of lines that match the diff you provided!
Try again.
Use additional \` \` lines to provide context that uniquely indicates which code needs to be changed.
The diff needs to apply to a unique set of lines in the source text!

The source text contains multiple copies of these ${numLines} lines:
\`\`\`
${original}\`\`\``;
    super(message);
    this.name = 'UnifiedDiffNotUniqueError';
    this.original = original;
    this.numLines = numLines;
  }
}

/**
 * Custom error for when search text is not unique in the source content
 */
export class SearchTextNotUniqueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchTextNotUniqueError';
  }
}

/**
 * Result of applying a fuzzy diff
 */
export interface FuzzyDiffResult {
  /**
   * The resulting text after applying the diff
   */
  result: string;
  
  /**
   * Number of hunks successfully applied
   */
  appliedHunks: number;
  
  /**
   * Number of hunks that couldn't be applied
   */
  failedHunks: number;
  
  /**
   * Details about each hunk application
   */
  hunkDetails: Array<{
    index: number;
    applied: boolean;
    reason?: string;
  }>;
}

/**
 * Apply a fuzzy diff to a source text
 * 
 * This function applies a diff in a "fuzzy" manner, ignoring exact line numbers
 * and instead matching on content similarity. This is particularly useful for
 * AI-generated diffs where line numbers might not be accurate.
 * 
 * @param sourceText - The source text content
 * @param diffText - The diff text (in unified diff format)
 * @returns The result of applying the diff
 */
export function applyFuzzyDiff(
  sourceText: string,
  diffText: string
): FuzzyDiffResult {
  // Parse the diff text into hunks
  const hunks = findDiffs(diffText);
  
  // Initialize result object
  const result: FuzzyDiffResult = {
    result: '',
    appliedHunks: 0,
    failedHunks: 0,
    hunkDetails: []
  };

  // Apply each hunk
  const errors: string[] = [];
  
  // Process hunks
  const normalizedHunks = normalizeHunks(hunks);
  let currentContent = sourceText;
  
  for (let i = 0; i < normalizedHunks.length; i++) {
    const hunkLines = normalizedHunks[i][1];
    
    try {
      // Apply the hunk to the content
      const newContent = doReplace(currentContent, hunkLines);
      
      if (!newContent) {
        result.failedHunks++;
        result.hunkDetails.push({
          index: i,
          applied: false,
          reason: `Hunk could not be applied`
        });
        
        const beforeAfter = hunkToBeforeAfter(hunkLines);
        if (Array.isArray(beforeAfter) && beforeAfter.length === 2) {
          const before = typeof beforeAfter[0] === 'string' 
            ? beforeAfter[0] 
            : Array.isArray(beforeAfter[0]) 
              ? beforeAfter[0].join('\n') 
              : '';
          
          errors.push(new UnifiedDiffNoMatchError(before).message);
        }
        continue;
      }
      
      // Update the source content for the next hunk
      currentContent = newContent;
      result.appliedHunks++;
      result.hunkDetails.push({
        index: i,
        applied: true
      });
      
    } catch (e) {
      result.failedHunks++;
      result.hunkDetails.push({
        index: i,
        applied: false,
        reason: e instanceof Error ? e.message : String(e)
      });
      
      if (e instanceof UnifiedDiffNotUniqueError) {
        errors.push(e.message);
      } else if (e instanceof UnifiedDiffNoMatchError) {
        errors.push(e.message);
      } else {
        errors.push(`Error applying hunk: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  
  // Set the result content
  result.result = currentContent;
  
  // If there were errors, throw them
  if (errors.length > 0) {
    const errorMessage = errors.join('\n\n');
    if (result.appliedHunks > 0) {
      throw new Error(errorMessage + '\n\n' + OTHER_HUNKS_APPLIED);
    } else {
      throw new Error(errorMessage);
    }
  }
  
  return result;
}

/**
 * Normalize hunks by cleaning them and ensuring they have valid before/after sections
 */
function normalizeHunks(hunks: [string | undefined, string[]][]): [string | undefined, string[]][] {
  const seen = new Set<string>();
  const uniqueHunks: [string | undefined, string[]][] = [];
  
  for (const [path, hunkLines] of hunks) {
    const normalizedLines = normalizeHunk(hunkLines);
    if (normalizedLines.length === 0) {
      continue;
    }
    
    const key = (path || '') + '\n' + normalizedLines.join('');
    if (seen.has(key)) {
      continue;
    }
    
    seen.add(key);
    uniqueHunks.push([path, normalizedLines]);
  }
  
  return uniqueHunks;
}

/**
 * Normalize a hunk by cleaning it and ensuring it has valid before/after sections
 */
function normalizeHunk(hunk: string[]): string[] {
  const beforeAfter = hunkToBeforeAfter(hunk, true);
  if (!Array.isArray(beforeAfter) || beforeAfter.length !== 2) {
    return hunk;
  }
  
  const [beforeLines, afterLines] = beforeAfter;
  
  // Clean pure whitespace lines
  if (Array.isArray(beforeLines) && Array.isArray(afterLines)) {
    const cleanBefore = cleanupPureWhitespaceLines(beforeLines);
    const cleanAfter = cleanupPureWhitespaceLines(afterLines);
    
    // Generate a new diff from the cleaned lines
    const maxLines = Math.max(cleanBefore.length, cleanAfter.length);
    const diff = createUnifiedDiff(cleanBefore, cleanAfter, maxLines);
    
    return diff;
  }
  
  return hunk;
}

/**
 * Apply a hunk to source content
 */
function doReplace(content: string, hunk: string[]): string | null {
  const beforeAfter = hunkToBeforeAfter(hunk);
  if (!Array.isArray(beforeAfter) || beforeAfter.length !== 2) {
    return null;
  }
  
  const [beforeText, afterText] = beforeAfter;
  
  // Convert to string if they're arrays
  const before = typeof beforeText === 'string' ? beforeText : Array.isArray(beforeText) ? beforeText.join('') : '';
  const after = typeof afterText === 'string' ? afterText : Array.isArray(afterText) ? afterText.join('') : '';
  
  // Handle empty before text (new file or append)
  if (!before.trim()) {
    if (after.trim()) {
      // Append to existing content
      return content + after;
    }
    return content;
  }
  
  // Try applying the hunk
  const newContent = applyHunk(content, hunk);
  if (newContent) {
    return newContent;
  }
  
  return null;
}

/**
 * Apply a hunk to source content
 */
function applyHunk(content: string, hunk: string[]): string | null {
  // Try direct application first
  let result = directlyApplyHunk(content, hunk);
  if (result) {
    return result;
  }
  
  // Make new lines explicit
  const explicitHunk = makeNewLinesExplicit(content, hunk);
  
  // Extract operation sequence
  const ops = explicitHunk.map(line => line.charAt(0))
    .join('')
    .replace(/-/g, 'x')
    .replace(/\+/g, 'x')
    .replace(/\n/g, ' ');
  
  // Group hunk into sections based on operations
  let curOp = ' ';
  let section: string[] = [];
  const sections: string[][] = [];
  
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op !== curOp) {
      sections.push(section);
      section = [];
      curOp = op;
    }
    section.push(explicitHunk[i]);
  }
  
  sections.push(section);
  if (curOp !== ' ') {
    sections.push([]);
  }
  
  // Apply sections
  let allDone = true;
  for (let i = 2; i < sections.length; i += 2) {
    const precedingContext = sections[i - 2];
    const changes = sections[i - 1];
    const followingContext = sections[i];
    
    const res = applyPartialHunk(content, precedingContext, changes, followingContext);
    if (res) {
      content = res;
    } else {
      allDone = false;
      break;
    }
  }
  
  if (allDone) {
    return content;
  }
  
  return null;
}

/**
 * Apply a partial hunk to source content
 */
function applyPartialHunk(
  content: string,
  precedingContext: string[],
  changes: string[],
  followingContext: string[]
): string | null {
  const lenPrec = precedingContext.length;
  const lenFoll = followingContext.length;
  
  const useAll = lenPrec + lenFoll;
  
  // Try with different amounts of context
  for (let drop = 0; drop <= useAll; drop++) {
    const use = useAll - drop;
    
    for (let usePrec = lenPrec; usePrec >= 0; usePrec--) {
      if (usePrec > use) {
        continue;
      }
      
      const useFoll = use - usePrec;
      if (useFoll > lenFoll) {
        continue;
      }
      
      const thisPrec = usePrec > 0 ? precedingContext.slice(-usePrec) : [];
      const thisFoll = followingContext.slice(0, useFoll);
      
      const res = directlyApplyHunk(content, thisPrec.concat(changes, thisFoll));
      if (res) {
        return res;
      }
    }
  }
  
  return null;
}

/**
 * Create a unified diff from before and after lines
 */
function createUnifiedDiff(before: string[], after: string[], context: number): string[] {
  // Simple diff implementation
  const diff: string[] = [];
  
  // Create unified diff header
  diff.push(`@@ -1,${before.length} +1,${after.length} @@\n`);
  
  // Add context, removed and added lines
  const maxLen = Math.max(before.length, after.length);
  let inDiff = false;
  
  for (let i = 0; i < maxLen; i++) {
    const beforeLine = i < before.length ? before[i] : null;
    const afterLine = i < after.length ? after[i] : null;
    
    if (beforeLine === afterLine) {
      diff.push(` ${beforeLine}`);
    } else {
      inDiff = true;
      if (beforeLine !== null) {
        diff.push(`-${beforeLine}`);
      }
      if (afterLine !== null) {
        diff.push(`+${afterLine}`);
      }
    }
  }
  
  // If no diff, return empty array
  if (!inDiff) {
    return [];
  }
  
  return diff;
}

/**
 * Clean whitespace-only lines in an array of lines
 */
function cleanupPureWhitespaceLines(lines: string[]): string[] {
  return lines.map(line => {
    if (line.trim() === '') {
      // Keep only the line endings
      return line.slice(-(line.length - line.replace(/[\r\n]+$/, '').length));
    }
    return line;
  });
}

/**
 * Make new lines explicit in a hunk
 */
function makeNewLinesExplicit(content: string, hunk: string[]): string[] {
  const beforeAfter = hunkToBeforeAfter(hunk);
  if (!Array.isArray(beforeAfter) || beforeAfter.length !== 2) {
    return hunk;
  }
  
  const [beforeText, afterText] = beforeAfter;
  
  // Convert to string if they're arrays
  const before = typeof beforeText === 'string' ? beforeText : Array.isArray(beforeText) ? beforeText.join('') : '';
  const after = typeof afterText === 'string' ? afterText : Array.isArray(afterText) ? afterText.join('') : '';
  
  // Create a diff between before and content
  const diff = diffLines(before, content);
  
  // Filter the diff to keep only context and removed lines
  const backDiff = diff.filter(line => line.charAt(0) !== '+');
  
  // Apply the back diff to the before content
  const newBefore = directlyApplyHunk(before, backDiff);
  if (!newBefore) {
    return hunk;
  }
  
  // Check if new before has enough content
  if (newBefore.trim().length < 10) {
    return hunk;
  }
  
  const beforeLines = before.split('\n');
  const newBeforeLines = newBefore.split('\n');
  const afterLines = after.split('\n');
  
  // Check if we lost too much context
  if (newBeforeLines.length < beforeLines.length * 0.66) {
    return hunk;
  }
  
  // Create a new diff from the new before and after
  const maxLines = Math.max(newBeforeLines.length, afterLines.length);
  const newHunk = createUnifiedDiff(newBeforeLines, afterLines, maxLines);
  
  return newHunk;
}

/**
 * Create a diff between two texts
 */
function diffLines(a: string, b: string): string[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const diff: string[] = [];
  
  const changes = diffArrays(aLines, bLines);
  
  for (const part of changes) {
    const prefix = part.added ? '+' : part.removed ? '-' : ' ';
    for (const line of part.value) {
      diff.push(`${prefix}${line}`);
    }
  }
  
  return diff;
}

/**
 * Try to directly apply a hunk to source content
 */
function directlyApplyHunk(content: string, hunk: string[]): string | null {
  const beforeAfter = hunkToBeforeAfter(hunk);
  if (!Array.isArray(beforeAfter) || beforeAfter.length !== 2) {
    return null;
  }
  
  const [beforeText, afterText] = beforeAfter;
  
  // Convert to string if they're arrays
  const before = typeof beforeText === 'string' ? beforeText : Array.isArray(beforeText) ? beforeText.join('') : '';
  const after = typeof afterText === 'string' ? afterText : Array.isArray(afterText) ? afterText.join('') : '';
  
  if (!before) {
    return null;
  }
  
  const beforeLines = before.split('\n');
  const beforeStripped = beforeLines.map(line => line.trim()).join('');
  
  // Refuse to do a repeated search and replace on a tiny bit of non-whitespace context
  if (beforeStripped.length < 10 && content.includes(before) && content.indexOf(before) !== content.lastIndexOf(before)) {
    return null;
  }
  
  try {
    const newContent = flexiJustSearchAndReplace(before, after, content);
    return newContent;
  } catch (e) {
    if (e instanceof SearchTextNotUniqueError) {
      return null;
    }
    throw e;
  }
}

/**
 * Apply a flexible search and replace
 */
function flexiJustSearchAndReplace(before: string, after: string, content: string): string {
  // Define preprocessing strategies
  const preprocessors = [
    (text: string) => text,                        // No preprocessing
    (text: string) => text.replace(/\s+/g, ' ').trim(),  // Normalize whitespace
    (text: string) => text.replace(/\s+/g, '')     // Remove all whitespace
  ];
  
  try {
    return flexibleSearchAndReplace(before, after, content, preprocessors);
  } catch (e) {
    if (e instanceof SearchTextNotUniqueError) {
      throw e;
    }
    return '';
  }
}

/**
 * Apply a flexible search and replace with various preprocessing strategies
 */
function flexibleSearchAndReplace(
  before: string,
  after: string,
  content: string,
  preprocessors: ((text: string) => string)[]
): string {
  for (const preproc of preprocessors) {
    try {
      const result = searchAndReplace(before, after, content, preproc);
      if (result) {
        return result;
      }
    } catch (e) {
      if (e instanceof SearchTextNotUniqueError) {
        throw e;
      }
      // Otherwise, try the next preprocessor
    }
  }
  
  return '';
}

/**
 * Search and replace text
 */
function searchAndReplace(before: string, after: string, content: string, preproc: (text: string) => string = text => text): string {
  const preprocBefore = preproc(before);
  const preprocContent = preproc(content);
  
  const firstIndex = preprocContent.indexOf(preprocBefore);
  
  if (firstIndex === -1) {
    return '';
  }
  
  // Find all occurrences
  let pos = 0;
  const indices: number[] = [];
  
  while (pos < preprocContent.length) {
    const index = preprocContent.indexOf(preprocBefore, pos);
    if (index === -1) {
      break;
    }
    indices.push(index);
    pos = index + 1;
  }
  
  if (indices.length > 1) {
    throw new SearchTextNotUniqueError(`Text occurs ${indices.length} times`);
  }
  
  // Replace the text
  const startIndex = firstIndex;
  const endIndex = startIndex + before.length;
  
  return content.substring(0, startIndex) + after + content.substring(endIndex);
}


/**
 * Convert a hunk to before and after text
 * 
 * @param hunk - The hunk to convert
 * @param lines - If true, returns arrays of lines; if false, returns concatenated strings
 * @returns If lines is true, returns [string[], string[]]; otherwise returns [string, string]
 */
function hunkToBeforeAfter(hunk: string[], lines: boolean = false): [string, string] | [string[], string[]] {
  const before: string[] = [];
  const after: string[] = [];
  
  for (const line of hunk) {
    if (line.length === 0) {
      continue;
    }
    
    const op = line.charAt(0);
    const content = line.substring(1);
    
    if (op === ' ') {
      before.push(content);
      after.push(content);
    } else if (op === '-') {
      before.push(content);
    } else if (op === '+') {
      after.push(content);
    }
  }
  
  if (lines) {
    return [before, after];
  }
  
  return [before.join(''), after.join('')];
}

// Constants
const OTHER_HUNKS_APPLIED = "Note: some hunks did apply successfully. See the updated source code shown above.\n\n";
