import { parsePatch } from 'diff';

/**
 * Extracts individual hunks from a diff with normalized line numbers
 * Useful for handling AI-generated diffs with incorrect line numbers
 */
export class DiffHunkExtractor {
  /** The original raw diff text */
  private rawDiff: string;
  
  /** The parsed patch structure */
  private parsedPatch: any[];
  
  /** Array of extracted hunks */
  public hunks: Array<{
    oldFileName: string;
    newFileName: string;
    beforeText: string;
    afterText: string;
    diff: string;
  }>;

  /**
   * Creates a new DiffHunkExtractor
   * @param rawDiff The raw diff text
   */
  constructor(rawDiff: string) {
    this.rawDiff = rawDiff;
    this.parsedPatch = parsePatch(rawDiff);
    this.hunks = this.extractHunks();
  }

  /**
   * Extracts individual hunks from the parsed patch
   * @returns Array of hunk objects with before/after text and normalized diff
   */
  private extractHunks() {
    const hunks: Array<{
      oldFileName: string;
      newFileName: string;
      beforeText: string;
      afterText: string;
      diff: string;
    }> = [];
    
    for (const file of this.parsedPatch) {
      for (const hunk of file.hunks) {
        // Extract before and after text
        const beforeLines = hunk.lines
          .filter((line: string) => line.startsWith(' ') || line.startsWith('-'))
          .map((line: string) => line.substring(1));
          
        const afterLines = hunk.lines
          .filter((line: string) => line.startsWith(' ') || line.startsWith('+'))
          .map((line: string) => line.substring(1));
        
        const beforeText = this.joinLines(beforeLines, hunk.linedelimiters);
        const afterText = this.joinLines(afterLines, hunk.linedelimiters);
        
        // Create a simple diff for just this hunk
        const hunkDiff = this.createSingleHunkDiff(
          file.oldFileName, 
          file.newFileName, 
          hunk.lines, 
          hunk.linedelimiters
        );
        
        hunks.push({
          oldFileName: file.oldFileName.replace(/^a\//, ''),
          newFileName: file.newFileName.replace(/^b\//, ''),
          beforeText,
          afterText,
          diff: hunkDiff
        });
      }
    }
    
    return hunks;
  }
  
  /**
   * Creates a normalized diff for a single hunk
   * @param oldFileName The original file name
   * @param newFileName The new file name
   * @param lines The lines in the hunk
   * @param delimiters The line delimiters
   * @returns A normalized diff string
   */
  private createSingleHunkDiff(
    oldFileName: string, 
    newFileName: string, 
    lines: string[], 
    delimiters: string[]
  ): string {
    const oldLineCount = lines.filter(l => l.startsWith(' ') || l.startsWith('-')).length;
    const newLineCount = lines.filter(l => l.startsWith(' ') || l.startsWith('+')).length;
    
    let diff = `--- ${oldFileName}\n+++ ${newFileName}\n`;
    diff += `@@ -1,${oldLineCount} +1,${newLineCount} @@\n`;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const delimiter = i < delimiters.length ? delimiters[i] : '\n';
      diff += line + delimiter;
    }
    
    return diff;
  }

  /**
   * Joins lines with their original delimiters
   * @param lines Array of lines
   * @param delimiters Array of delimiters
   * @returns Joined text
   */
  private joinLines(lines: string[], delimiters: string[]): string {
    let result = '';
    
    for (let i = 0; i < lines.length; i++) {
      result += lines[i];
      if (i < delimiters.length) {
        result += delimiters[i];
      }
    }
    
    return result;
  }
}
