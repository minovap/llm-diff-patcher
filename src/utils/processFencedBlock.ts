/**
 * Represents a hunk of changes from a diff
 */
export interface Hunk {
  oldFile: string | null;
  newFile: string | null;
  lines: string[];
}

/**
 * Represents the result of processing a fenced code block
 */
export interface FencedBlock {
  nextLineNumber: number;
  hunks: Hunk[];
}

/**
 * Process a fenced block in a diff text
 */
export function processFencedBlock(lines: string[], startLineNum: number): FencedBlock {
  let lineNum = startLineNum;

  while (lineNum < lines.length && !lines[lineNum].startsWith('```')) {
    lineNum++;
  }

  const block = lines.slice(startLineNum, lineNum);
  block.push('@@ @@\n');

  let oldFile: string | null = null;
  let newFile: string | null = null;
  
  // Look for filename headers anywhere in the block, not just at the beginning
  let filenameHeaderIndex = -1;
  
  for (let i = 0; i < block.length - 1; i++) {
    if (block[i].startsWith('--- ') && block[i + 1].startsWith('+++ ')) {
      filenameHeaderIndex = i;
      // Extract the file paths from the diff header
      oldFile = block[i].substring(4).trim();
      newFile = block[i + 1].substring(4).trim();
      break;
    }
  }
  
  // Remove the filename headers from the block if found
  if (filenameHeaderIndex !== -1) {
    block.splice(filenameHeaderIndex, 2);
  }

  const hunks: Hunk[] = [];

  let keeper = false;
  let hunk: string[] = [];
  let op = ' ';

  for (const line of block) {
    hunk.push(line);
    if (line.length < 2) {
      continue;
    }

    // Handle case where we find a new file header within the block
    if (line.startsWith('+++ ') && hunk.length >= 2 && hunk[hunk.length - 2].startsWith('--- ')) {
      // Adjust the hunk to remove the file headers
      const nextOldFile = hunk[hunk.length - 2].substring(4).trim();
      const nextNewFile = line.substring(4).trim();
      hunk = hunk.slice(0, -2);

      if (hunk.length > 0) {
        hunks.push({
          oldFile,
          newFile,
          lines: trimEmptyLinesFromEnd(hunk)
        });
      }
      
      hunk = [];
      keeper = false;

      // Update file names for the next hunk
      oldFile = nextOldFile;
      newFile = nextNewFile;
      continue;
    }

    op = line.charAt(0);
    if (op === '-' || op === '+') {
      keeper = true;
      continue;
    }

    if (op !== '@') {
      continue;
    }

    if (!keeper) {
      hunk = [];
      continue;
    }

    hunk.pop(); // Remove the @@ line
    
    if (hunk.length > 0) {
      hunks.push({
        oldFile,
        newFile,
        lines: trimEmptyLinesFromEnd(hunk)
      });
    }
    
    hunk = [];
    keeper = false;
  }

  return {
    nextLineNumber: lineNum + 1,
    hunks
  };
}

/**
 * Trims empty lines from the end of an array of strings
 * @param lines The array of strings to trim
 * @returns A new array with empty lines removed from the end
 */
function trimEmptyLinesFromEnd(lines: string[]): string[] {
  // Create a copy of the lines array
  const trimmedLines = [...lines];

  // Remove empty lines from the end
  while (
    trimmedLines.length > 0 &&
    (trimmedLines[trimmedLines.length - 1] === '' ||
      trimmedLines[trimmedLines.length - 1] === '\n' ||
      trimmedLines[trimmedLines.length - 1].trim() === '')
    ) {
    trimmedLines.pop();
  }

  return trimmedLines;
}