/**
 * Utility functions for normalizing text
 */

/**
 * Normalizes line endings in a string by converting all CRLF (\r\n) to LF (\n)
 * 
 * @param text - The string to normalize
 * @returns The string with normalized line endings
 */
export function normalizeLineEndings(text: string): string {
  if (!text) return '';
  return text.replace(/\r\n/g, '\n');
}
