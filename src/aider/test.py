import difflib

from search_replace import normalize_line_endings

def normalize_test_data(lines):
    """Normalize line endings in test data"""
    if isinstance(lines, list):
        return [normalize_line_endings(line) for line in lines]
    return normalize_line_endings(lines)

from udiff_coder import normalize_hunk

if __name__ == "__main__":
    # Test the normalize_hunk function with the same example as the TypeScript version
    test_hunk = [
        "@@ -1,2 +1,2 @@",
        " Hello world",
        "-This is a test file",
        "+This is a modified test file"
    ]

    # Normalize line endings in the test hunk
    test_hunk = normalize_test_data(test_hunk)
    result = normalize_hunk(test_hunk)

    print("Result of normalize_hunk:")
    for line in result:
        print(repr(line))
