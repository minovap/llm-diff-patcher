import difflib

from udiff_coder import normalize_hunk

if __name__ == "__main__":
    # Test the normalize_hunk function with the same example as the TypeScript version
    test_hunk = [
        "@@ -1,2 +1,2 @@",
        " Hello world",
        "-This is a test file",
        "+This is a modified test file"
    ]

    result = normalize_hunk(test_hunk)

    print("Result of normalize_hunk:")
    for line in result:
        print(repr(line))
