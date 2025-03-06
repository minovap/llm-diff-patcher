import { applyHunk } from '@src/aider_port/apply_hunk';
import { findDiffs } from '@src/aider_port/aider_udiff';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Apply diff to original content and save result to specified category folder
 */
function runTest(testNumber: string, categoryPath?: string) {
  const testNum = testNumber.padStart(3, '0');
  const originalFilePath = path.join(__dirname, `${testNum}-original.txt`);
  const diffFilePath = path.join(__dirname, `${testNum}-diff.txt`);
  
  // Determine where to save the result
  let resultFilePath: string;
  if (categoryPath) {
    // Save to category folder
    resultFilePath = path.join(categoryPath, `${testNum}-result-ts.txt`);
  } else {
    // Save to script directory
    resultFilePath = path.join(__dirname, `${testNum}-result-ts.txt`);
  }

  // Read the original content
  const originalContent = fs.readFileSync(originalFilePath, 'utf8');
  
  // Read the diff content
  const diffContent = fs.readFileSync(diffFilePath, 'utf8');

  // Find diffs from the markdown-style diff content  
  const edits = findDiffs(diffContent);
  
  if (edits.length === 0) {
    console.error(`No valid diffs found for test ${testNum}`);
    process.exit(1);
  }
  
  // Get the first hunk from the edits
  const [_filename, hunk] = edits[0];
  
  // Apply the hunk to the original content
  const modifiedContent = applyHunk(originalContent, hunk);
  
  if (!modifiedContent) {
    console.error(`Failed to apply diff for test ${testNum}`);
    process.exit(1);
  }
  
  // Save the result
  fs.writeFileSync(resultFilePath, modifiedContent);
  
  console.log(`TypeScript test ${testNum} completed successfully`);
  console.log(`Result saved to: ${resultFilePath}`);
}

// Get test number from command line argument
const testNumber = process.argv[2];
if (!testNumber) {
  console.error('Please provide a test number as an argument');
  process.exit(1);
}

// Get category path from command line argument (optional)
const categoryPath = process.argv[3];

runTest(testNumber, categoryPath);
