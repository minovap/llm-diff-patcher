import os
import sys
import argparse

# Add the aider source directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src/aider')))
from udiff_coder import apply_hunk, find_diffs

def run_test(test_number, category_path=None):
    # Format test number with leading zeros
    test_num = test_number.zfill(3)
    
    # Define file paths
    current_dir = os.path.dirname(os.path.abspath(__file__))
    original_file_path = os.path.join(current_dir, f"{test_num}-original.txt")
    diff_file_path = os.path.join(current_dir, f"{test_num}-diff.txt")
    
    # Determine where to save the result
    if category_path:
        # Save to category folder
        result_file_path = os.path.join(category_path, f"{test_num}-result-py.txt")
    else:
        # Save to script directory
        result_file_path = os.path.join(current_dir, f"{test_num}-result-py.txt")
    
    # Log where we're saving the result
    print(f"Will save result to: {result_file_path}")
    
    # Read the original content
    with open(original_file_path, 'r') as f:
        original_content = f.read()
    
    # Read the diff content
    with open(diff_file_path, 'r') as f:
        diff_content = f.read()
    
    # Find diffs from the markdown-style diff content
    edits = find_diffs(diff_content)
    
    if not edits:
        print(f"No valid diffs found for test {test_num}")
        sys.exit(1)
    
    # Get the first hunk from the edits
    filename, hunk = edits[0]
    
    # Apply the hunk to the original content
    modified_content = apply_hunk(original_content, hunk)
    
    if not modified_content:
        print(f"Failed to apply diff for test {test_num}")
        sys.exit(1)
    
    # Save the result
    with open(result_file_path, 'w') as f:
        f.write(modified_content)
    
    print(f"Python test {test_num} completed successfully")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Run a diff test')
    parser.add_argument('test_number', help='Test number to run')
    parser.add_argument('category_path', nargs='?', help='Path to category folder')
    args = parser.parse_args()
    
    run_test(args.test_number, args.category_path)
