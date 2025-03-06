from udiff_coder import directly_apply_hunk
from pathlib import Path

if __name__ == "__main__":
    # The content with a newline at the end (which is important)
    content = "Hello world\nThis is a test file\n"
    
    # The hunk that should match the content
    hunk = [
        "@@ -1,2 +1,2 @@",
        " Hello world\n",  # Note the newline at the end
        "-This is a test file\n",  # Note the newline at the end
        "+This is a modified test file\n"  # Note the newline at the end
    ]

    # Try directly_apply_hunk with properly formatted lines
    result = directly_apply_hunk(content, hunk)
    
    print("Result of directly_apply_hunk:")
    print(repr(result))
    print("\nActual modified content:" if result else "\nNo result (None):")
    print(result)

    # If the direct method doesn't work, let's try the full do_replace method
    if not result:
        print("\nTrying with do_replace instead:")
        from udiff_coder import do_replace
        
        test_filename = "temp_test_file.txt"
        # Create a temporary file with the content
        Path(test_filename).write_text(content)
        
        result = do_replace(test_filename, content, hunk)
        
        print("Result of do_replace:")
        print(repr(result))
        print("\nActual modified content:" if result else "\nNo result (None):")
        print(result)
