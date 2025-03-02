import { processFencedBlock } from './processFencedBlock';

/**
 * Parse a unified diff text into diff hunks
 */
export function findDiffs(diffText: string): [string | undefined, string[]][] {
  // Ensure the diff text ends with a newline
  if (!diffText.endsWith('\n')) {
    diffText += '\n';
  }

  const lines = diffText.split('\n').map(line => line + '\n');
  const edits: [string | undefined, string[]][] = [];

  let lineNum = 0;
  while (lineNum < lines.length) {
    const line = lines[lineNum];
    if (line.startsWith('```diff')) {
      const [nextLineNum, theseEdits] = processFencedBlock(lines, lineNum + 1);
      edits.push(...theseEdits);
      lineNum = nextLineNum;
      continue;
    }

    // Look for diff headers or hunks
    if (line.startsWith('--- ') && lineNum + 1 < lines.length && lines[lineNum + 1].startsWith('+++ ')) {
      // Found a file diff header
      let fname = lines[lineNum + 1].substring(4).trim();
      lineNum += 2;

      // Look for hunks
      const hunk: string[] = [];
      let keeper = false;

      while (lineNum < lines.length) {
        const hunkLine = lines[lineNum];
        if (hunkLine.startsWith('--- ')) {
          break;
        }

        if (hunkLine.startsWith('@@ ')) {
          if (keeper && hunk.length > 0) {
            edits.push([fname, hunk]);
            hunk.length = 0;
          }

          keeper = false;
          lineNum++;
          continue;
        }

        const op = hunkLine.charAt(0);
        if (op === '-' || op === '+') {
          hunk.push(hunkLine);
          keeper = true;
        } else if (op === ' ') {
          hunk.push(hunkLine);
        }

        lineNum++;
      }

      if (keeper && hunk.length > 0) {
        edits.push([fname, hunk]);
      }

      continue;
    }

    // Just a regular line, move on
    lineNum++;
  }

  return edits;
}