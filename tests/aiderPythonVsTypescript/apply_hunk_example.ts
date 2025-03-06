import { applyHunk } from '@src/aider_port/apply_hunk';
import { doReplace } from '@src/aider_port/do_replace';
import { findDiffs } from '@src/aider_port/aider_udiff';
import * as fs from 'fs';

/**
 * Example demonstrating how to use applyHunk to modify content
 */
function main() {
  // Sample content to be modified
  const originalContent = `function calculateSum(a, b) {
  // Add two numbers and return result
  return a + b;
}

function displayResult(result) {
  console.log("The result is: " + result);
}

// Calculate 5 + 3
const sum = calculateSum(5, 3);
displayResult(sum);
`;

  // A diff to modify the content (adding a new multiply function)
  const diffContent = `\`\`\`diff
 function calculateSum(a, b) {
   // Add two numbers and return result
   return a + b;
 }
 
+function calculateMultiply(a, b) {
+  // Multiply two numbers and return result
+  return a * b;
+}
+
 function displayResult(result) {
   console.log("The result is: " + result);
 }
\`\`\``;

  // Find diffs from the markdown-style diff content
  const edits = findDiffs(diffContent);
  
  if (edits.length === 0) {
    console.error("No valid diffs found in the content");
    return;
  }
  
  // Get the first hunk from the edits
  const [_filename, hunk] = edits[0];
  
  console.log("Original content:");
  console.log("----------------");
  console.log(originalContent);
  
  console.log("\nApplying diff:");
  console.log("----------------");
  console.log(hunk.join(''));

  // Apply the hunk to the original content
  const modifiedContent = applyHunk(originalContent, hunk);
  
  if (modifiedContent) {
    console.log("\nModified content:");
    console.log("----------------");
    console.log(modifiedContent);
    
    // You could also save to a file
    // fs.writeFileSync('modified.js', modifiedContent);
    
    // Example using doReplace instead
    console.log("\nUsing doReplace to apply to a file:");
    const tempFileName = 'temp_example.js';
    
    // Save original content to a file
    fs.writeFileSync(tempFileName, originalContent);
    
    // Apply the diff using doReplace
    const replacedContent = doReplace(tempFileName, originalContent, hunk);
    
    if (replacedContent) {
      console.log("Successfully applied diff using doReplace");
      
      // Verify content matches
      console.log(`Content matches: ${replacedContent === modifiedContent}`);
      
      // Clean up the temporary file
      fs.unlinkSync(tempFileName);
    } else {
      console.error("Failed to apply diff using doReplace");
    }
  } else {
    console.error("Failed to apply the diff to the content");
  }
}

// Run the example
main();
