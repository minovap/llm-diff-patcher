import { allPreprocs, SearchTextNotUnique, flexibleSearchAndReplace, searchAndReplace } from './search_replace';
import unidiff from "unidiff";
import { normalizeLineEndings } from './normalize_utils';

/**
 * Simple implementation of flexibleSearchAndReplace that only uses the basic search and replace
 *
 * @param texts - Array containing [searchText, replaceText, originalText]
 * @returns The modified text or undefined if unsuccessful
 */
export function flexiJustSearchAndReplace(texts: string[]): string | undefined {
  // Normalize line endings in all input texts
  texts = texts.map(normalizeLineEndings);
  
  const strategies: [(texts: string[]) => string | undefined, [boolean, boolean, boolean][]][] = [
    [searchAndReplace, allPreprocs],
  ];

  return flexibleSearchAndReplace(texts, strategies);
}

/**
 * Directly applies a diff hunk to content using search and replace
 *
 * @param content - The original content to modify
 * @param hunk - Array of strings representing the diff hunk
 * @returns The modified content or undefined if the hunk couldn't be applied
 */
export function directlyApplyHunk(content: string, hunk: string[]): string | undefined {
  // Normalize line endings
  content = normalizeLineEndings(content);
  hunk = hunk.map(normalizeLineEndings);
  
  const [before, after] = hunkToBeforeAfter(hunk) as [string, string];
  if (!before) {
    return undefined;
  }

  const [beforeLines] = hunkToBeforeAfter(hunk, true) as [string[], string[]];
  const beforeLinesJoined = beforeLines.map(line => line.trim()).join('\n');

  // Refuse to do a repeated search and replace on a tiny bit of non-whitespace context
  if (beforeLinesJoined.length < 10 && content.includes(before) && content.split(before).length > 2) {
    return undefined;
  }

  try {
    const result = flexiJustSearchAndReplace([before, after, content]);
    return result;
  } catch (error) {
    if (error instanceof SearchTextNotUnique) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Helper function to escape $ characters in a string for use in replacements
 * 
 * @param str - The string to process
 * @returns A string with $ characters preserved
 */
function preserveDollarSigns(str: string): string {
  // No special handling needed for joining strings, as the issue is with replacement operations
  return str;
}

/**
 * Converts a unified diff hunk into before and after text blocks.
 *
 * @param hunk - Array of strings representing the diff hunk lines
 * @param returnLines - Whether to return arrays of lines instead of joined strings
 * @returns A tuple containing the before and after text/lines
 */
export function hunkToBeforeAfter(
  hunk: string[],
  returnLines: boolean = false
): [string[] | string, string[] | string] {
  // Normalize line endings in the hunk
  hunk = hunk.map(normalizeLineEndings);
  
  const before: string[] = [];
  const after: string[] = [];
  let op = " ";

  for (const line of hunk) {
    // Handle potentially empty lines or newlines
    let lineContent: string;
    if (line.length < 2) {
      op = " ";
      lineContent = line;
    } else {
      op = line[0];
      lineContent = line.substring(1);
    }

    if (op === " ") {
      before.push(lineContent);
      after.push(lineContent);
    } else if (op === "-") {
      before.push(lineContent);
    } else if (op === "+") {
      after.push(lineContent);
    }
  }

  if (returnLines) {
    return [before, after];
  }

  // When joining the strings, we need to ensure $ characters are treated as literals
  const beforeText = before.join("");
  const afterText = after.join("");

  return [beforeText, afterText];
}

/**
 * Cleans up whitespace-only lines, preserving only necessary whitespace
 *
 * @param lines - Array of strings to clean up
 * @returns Array of cleaned up lines
 */
function cleanupPureWhitespaceLines(lines: string[]): string[] {
  return lines.map(line => {
    if (line.trim()) {
      return line;
    } else {
      // Keep only the line ending characters from the original line
      const lineEnding = line.slice(-(line.length - line.trimEnd().length));
      return lineEnding;
    }
  });
}

/**
 * Normalizes a diff hunk by cleaning up whitespace and reformatting
 *
 * @param hunk - Array of strings representing the diff hunk lines
 * @returns Normalized diff hunk as an array of lines
 */
export function normalizeHunk(hunk: string[]): string[] {
  // Normalize line endings
  hunk = hunk.map(normalizeLineEndings);
  
  const [before, after] = hunkToBeforeAfter(hunk, true) as [string[], string[]];

  const cleanedBefore = cleanupPureWhitespaceLines(before);
  const cleanedAfter = cleanupPureWhitespaceLines(after);

  const maxContextLines = Math.max(cleanedBefore.length, cleanedAfter.length);

  const patch = unidiff.diffLines(cleanedBefore, cleanedAfter);
  const formattedPatch = unidiff.formatLines(patch, { context: maxContextLines });

  const lines = formattedPatch.split('\n');

  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('@@')) {
      startIndex = i + 1;
      break;
    }
  }

  // Return all lines after the @@ line, excluding the last empty line
  return lines.slice(startIndex).filter(line => line !== '');
}

/**
 * Process a fenced code block to extract diff hunks.
 *
 * @param lines Array of lines with newline characters preserved
 * @param startLineNum Starting line number of the fenced block content
 * @returns Tuple of [endLineNum, edits] where endLineNum is the line after the closing fence
 *          and edits is an array of [path, hunk] tuples
 */
export function processFencedBlock(
  lines: string[],
  startLineNum: number
): [number, Array<[string | null, string[]]>] {
  // Normalize line endings
  lines = lines.map(normalizeLineEndings);
  
  let lineNum: number;

  // Find the end of the fenced block
  for (lineNum = startLineNum; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    if (line.startsWith("```")) {
      break;
    }
  }

  // Extract block content
  const block = lines.slice(startLineNum, lineNum);
  block.push("@@ @@\n");

  let fname: string | null = null;

  // Check if block starts with file markers
  if (block[0]?.startsWith("--- ") && block[1]?.startsWith("+++ ")) {
    // Extract the file path, considering that it might contain spaces
    fname = block[1].substring(4).trim();
    block.splice(0, 2);  // Remove the first two lines
  }

  const edits: Array<[string | null, string[]]> = [];
  let keeper = false;
  let hunk: string[] = [];
  let op = " ";

  for (const line of block) {
    hunk.push(line);

    if (line.length < 2) {
      continue;
    }

    if (line.startsWith("+++ ") && hunk.length >= 2 && hunk[hunk.length - 2].startsWith("--- ")) {
      if (hunk.length >= 3 && hunk[hunk.length - 3] === "\n") {
        hunk = hunk.slice(0, -3);
      } else {
        hunk = hunk.slice(0, -2);
      }

      edits.push([fname, hunk]);
      hunk = [];
      keeper = false;

      fname = line.substring(4).trim();
      continue;
    }

    op = line[0];
    if (op === "-" || op === "+") {
      keeper = true;
      continue;
    }

    if (op !== "@") {
      continue;
    }

    if (!keeper) {
      hunk = [];
      continue;
    }

    // Remove the @@ line
    hunk.pop();
    edits.push([fname, hunk]);
    hunk = [];
    keeper = false;
  }

  return [lineNum + 1, edits];
}

/**
 * Finds diff blocks in the given content.
 * We can always fence with triple-quotes, because all the udiff content
 * is prefixed with +/-/space.
 *
 * @param content The content to search for diffs
 * @returns Array of edits, where each edit is a tuple of [path, hunk]
 */
export function findDiffs(content: string): Array<{ oldFileName: string, newFileName: string, hunks: string[][] }> {
  // Normalize line endings
  content = normalizeLineEndings(content);
  
  // Function to clean file path by removing 'a/' and 'b/' prefixes
  const cleanFilePath = (path: string): string => {
    if (path.startsWith('a/')) {
      return path.substring(2);
    } else if (path.startsWith('b/')) {
      return path.substring(2);
    }
    return path;
  };
  
  // Ensure content ends with newline
  if (!content.endsWith("\n")) {
    content = content + "\n";
  }

  // Find old/new file name pairs from the content
  const contentLines = content.split(/\r?\n/);
  const fileHeaders: Record<string, string> = {};
  
  for (let i = 0; i < contentLines.length - 1; i++) {
    if (contentLines[i].startsWith('--- ') && contentLines[i+1].startsWith('+++ ')) {
      const oldFileName = contentLines[i].substring(4).trim();
      const newFileName = contentLines[i+1].substring(4).trim();
      fileHeaders[newFileName] = oldFileName;
    }
  }

  // Original implementation logic to extract hunks
  const lines = content.split(/\r?\n/).map(line => line + "\n");
  let lineNum = 0;
  const rawEdits: Array<[string | null, string[]]> = [];

  while (lineNum < lines.length) {
    while (lineNum < lines.length) {
      const line = lines[lineNum];
      if (line.startsWith("```diff")) {
        const result = processFencedBlock(lines, lineNum + 1);
        lineNum = result[0];
        rawEdits.push(...result[1]);
        break;
      }
      lineNum += 1;
    }
  }

  // Group hunks by filename
  const fileMap = new Map<string, { oldFileName: string; hunks: string[][] }>();

  for (const [filePath, hunk] of rawEdits) {
    if (!filePath) continue;
    
    if (!fileMap.has(filePath)) {
      fileMap.set(filePath, { 
        oldFileName: fileHeaders[filePath] || 'unknown', 
        hunks: [] 
      });
    }
    fileMap.get(filePath)!.hunks.push([...hunk]);
  }
  
  return Array.from(fileMap.entries()).map(([newFileName, data]) => ({
    oldFileName: cleanFilePath(data.oldFileName),
    newFileName: cleanFilePath(newFileName),
    hunks: data.hunks
  }));
}
