
/**
 * Process a fenced block in a diff text
 */
export function processFencedBlock(lines: string[], startLineNum: number): [number, [string | undefined, string[]][]] {
  let lineNum = startLineNum;
  while (lineNum < lines.length && !lines[lineNum].startsWith('```')) {
    lineNum++;
  }

  const block = lines.slice(startLineNum, lineNum);
  block.push('@@ @@\n');

  let fname: string | undefined;
  if (block[0].startsWith('--- ') && block[1].startsWith('+++ ')) {
    // Extract the file path, considering that it might contain spaces
    fname = block[1].substring(4).trim();
    block.splice(0, 2);
  } else {
    fname = undefined;
  }

  const edits: [string | undefined, string[]][] = [];

  let keeper = false;
  let hunk: string[] = [];
  let op = ' ';

  for (const line of block) {
    hunk.push(line);
    if (line.length < 2) {
      continue;
    }

    if (line.startsWith('+++ ') && hunk[hunk.length - 2].startsWith('--- ')) {
      if (hunk[hunk.length - 3] === '\n') {
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
    edits.push([fname, hunk]);
    hunk = [];
    keeper = false;
  }

  return [lineNum + 1, edits];
}
