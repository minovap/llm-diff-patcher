import { normalizeLineEndings } from './normalize_utils';

/**
 * Custom error class for when the search text is not unique in the content
 */
export class SearchTextNotUnique extends Error {
  constructor(message = "Search text is not unique") {
    super(message);
    this.name = "SearchTextNotUnique";
  }
}

/**
 * Simple text search and replace - this version correctly handles $ characters
 * in string replacements by using a special replacement function.
 *
 * @param texts - Array containing [searchText, replaceText, originalText]
 * @returns The modified text or undefined if the search text doesn't exist
 */
export function searchAndReplace(texts: string[]): string | undefined {
  const [searchText, replaceText, originalText] = texts;
  
  // Normalize line endings
  const normalizedSearchText = normalizeLineEndings(searchText);
  const normalizedOriginalText = normalizeLineEndings(originalText);

  if (!originalText.includes(searchText)) {
    return undefined;
  }

  // Special handling for $ in replacement string
  // In JavaScript, $ has special meaning in replacement strings:
  // $$ is escaped to $, $& is the matched substring,
  // $` is the substring before the match, etc.
  // 
  // To fix the issue with $ being processed incorrectly, we use a function 
  // for the second parameter of replace() instead of a string
  return originalText.replace(searchText, () => {
    // Return the replacement text directly, avoiding $ interpretation
    return replaceText;
  });
}

/**
 * Preprocessing configurations to be tried
 */
export const allPreprocs: [boolean, boolean, boolean][] = [
  [false, false, false] as [boolean, boolean, boolean], // No preprocessing
  [true, false, false] as [boolean, boolean, boolean],  // Strip blank lines
  [false, true, false] as [boolean, boolean, boolean],  // Use relative indentation
  [true, true, false] as [boolean, boolean, boolean]    // Both strip blank lines and use relative indentation
];

/**
 * Strip leading and trailing blank lines from texts
 *
 * @param texts - Array of string texts to process
 * @returns Array of processed texts
 */
function stripBlankLines(texts: string[]): string[] {
  return texts.map(text => text.trim() + '\n');
}

/**
 * Try a specific search and replace strategy with preprocessing
 *
 * @param texts - Array containing [searchText, replaceText, originalText]
 * @param strategy - The search and replace strategy function to use
 * @param preproc - Preprocessing options [stripBlankLines, relativeIndent, reverseLines]
 * @returns The modified text or undefined if unsuccessful
 */
function tryStrategy(
  texts: string[],
  strategy: (texts: string[]) => string | undefined,
  preproc: [boolean, boolean, boolean]
): string | undefined {
  const [stripBlankLinesFlag, relativeIndentFlag, reverseLinesFlag] = preproc;
  let processedTexts = [...texts];

  // Apply preprocessing
  if (stripBlankLinesFlag) {
    processedTexts = stripBlankLines(processedTexts);
  }

  // Note: Relative indentation and reverse lines preprocessing are not implemented
  // in this simplified version but would be added here if needed

  return strategy(processedTexts);
}

/**
 * Tries different search/replace strategies with different preprocessing options
 *
 * @param texts - Array containing [searchText, replaceText, originalText]
 * @param strategies - Array of tuples containing strategy functions and their preprocessing options
 * @returns The modified text or undefined if all strategies fail
 */
export function flexibleSearchAndReplace(
  texts: string[],
  strategies: [(texts: string[]) => string | undefined, [boolean, boolean, boolean][]][]
): string | undefined {
  for (const [strategy, preprocs] of strategies) {
    for (const preproc of preprocs) {
      const result = tryStrategy(texts, strategy, preproc);
      if (result) {
        return result;
      }
    }
  }
  return undefined;
}
