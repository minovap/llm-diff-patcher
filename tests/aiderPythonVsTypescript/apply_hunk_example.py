import os

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src/aider')))
from udiff_coder import apply_hunk, do_replace, find_diffs

def main():
    # Sample content to be modified
    original_content = '''function calculateSum(a, b) {
  // Add two numbers and return result
  return a + b;
}

function displayResult(result) {
  console.log("The result is: " + result);
}

// Calculate 5 + 3
const sum = calculateSum(5, 3);
displayResult(sum);
'''

    # A diff to modify the content (adding a new multiply function)
    diff_content = '''```diff
 function calculateSum(a, b) {
   // Add two numbers and return result
   return a + b;
 }
 
+function calculateMultiply(a, b) {
+  // Multiply two numbers and return result
+  return a * b;
+}
+
+function displayResult(a) {
-function displayResult(result) {
   console.log("The result is: " + result);
 }
```'''

    # Find diffs from the markdown-style diff content
    edits = find_diffs(diff_content)
    
    if not edits:
        print("No valid diffs found in the content")
        return
    
    # Get the first hunk from the edits
    filename, hunk = edits[0]
    
    print("Original content:")
    print("----------------")
    print(original_content)
    
    print("\nApplying diff:")
    print("----------------")
    print(''.join(hunk))
    
    # Apply the hunk to the original content
    modified_content = apply_hunk(original_content, hunk)
    
    if modified_content:
        print("\nModified content:")
        print("----------------")
        print(modified_content)
        
        # You could also save to a file
        # with open('modified.js', 'w') as f:
        #     f.write(modified_content)
        
        # Example using do_replace instead
        print("\nUsing do_replace to apply to a file:")
        temp_file_name = 'temp_example.js'
        
        # Save original content to a file
        with open(temp_file_name, 'w') as f:
            f.write(original_content)
        
        # Apply the diff using do_replace
        replaced_content = do_replace(temp_file_name, original_content, hunk)
        
        if replaced_content:
            print("Successfully applied diff using do_replace")
            
            # Verify content matches
            print(f"Content matches: {replaced_content == modified_content}")
            
            # Clean up the temporary file
            os.remove(temp_file_name)
        else:
            print("Failed to apply diff using do_replace")
    else:
        print("Failed to apply the diff to the content")

if __name__ == "__main__":
    main()
