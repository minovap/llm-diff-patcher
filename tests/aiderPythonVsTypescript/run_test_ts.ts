import { applyHunks } from '@src/aider_port/apply_hunk';
import { findDiffs } from '@src/aider_port/aider_udiff';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Apply diff to original content and save result to specified category folder
 */
function runTest(testNumber: string, categoryPath?: string) {
  const testNum = testNumber.padStart(3, '0');
  let categoryDir: string;

  // If category path not provided, use current directory
  if (categoryPath) {
    categoryDir = categoryPath;
  } else {
    categoryDir = __dirname;
  }

  // Define file paths - all files in the category directory
  const originalFilePath = path.join(categoryDir, `${testNum}-original.txt`);
  const diffFilePath = path.join(categoryDir, `${testNum}-diff.txt`);
  const resultFilePath = path.join(categoryDir, `${testNum}-result-ts.txt`);

  console.log(`Reading original file from: ${originalFilePath}`);
  console.log(`Reading diff file from: ${diffFilePath}`);
  console.log(`Will save result to: ${resultFilePath}`);

  // Read the original content
  const originalContent = fs.readFileSync(originalFilePath, 'utf8');
  
  // Read the diff content
  const diffContent = fs.readFileSync(diffFilePath, 'utf8');

  // Find diffs from the markdown-style diff content
  const edits = findDiffs(diffContent);
  console.log(`Found ${edits.length} edits in diff file`);
  console.log('Edits structure:', JSON.stringify(edits, null, 2));
  
  // Extract the first hunk from the edits based on new format
  let hunks;
  if (edits.length > 0 && edits[0].hunks && edits[0].hunks.length > 0) {
    // Use the first hunk from the first file
    hunks = edits[0].hunks[0];
    console.log(`Using hunk from file ${edits[0].newFileName}`);
  } else {
    console.error('No valid hunks found in edits');
    process.exit(1);
  }
  // Apply the hunk to the original content
  const modifiedContent = applyHunks(originalContent, hunks);
  
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
