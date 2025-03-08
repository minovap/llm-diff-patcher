import { cleanPatch } from '../src/vanilla_diff_patch/cleanPatch';
import {
  InsufficientContextLinesError,
  NoEditsInHunkError,
  NotEnoughContextError,
  PatchFormatError
} from "../src/vanilla_diff_patch/errors";

describe('cleanPatch', () => {

  test('minimum context lines = 10', () => {
    const multiEmptyPatch =
      `--- a/test1.originaltext.txt
+++ b/test1.originaltext.txt
@@ -1,4 +1,4 @@
 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world`;

    expect(() => cleanPatch(multiEmptyPatch, 10)).toThrow(InsufficientContextLinesError);

    try {
      cleanPatch(multiEmptyPatch, 10);
    } catch (error) {
      if (error instanceof InsufficientContextLinesError) {
        expect(error.message).toBe('Insufficient context lines in hunk: required 10, found 4');
      }
    }
  });

  test('removes empty lines around headers and updates line counts', () => {
    const originalPatch = `
--- a/test1.originaltext.txt

+++ b/test1.originaltext.txt

@@ -1,4 +1,4 @@

 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world

@@ -1,4 +1,4 @@

 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world
`;

    const expectedPatch = 
`--- a/test1.originaltext.txt
+++ b/test1.originaltext.txt
@@ -1,4 +1,4 @@
 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world
@@ -1,4 +1,4 @@
 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world`;

    expect(cleanPatch(originalPatch)).toBe(expectedPatch);
  });

  test('handles patches with no empty lines', () => {
    const compactPatch = 
`--- a/test1.originaltext.txt
+++ b/test1.originaltext.txt
@@ -1,4 +1,4 @@
 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world`;

    expect(cleanPatch(compactPatch)).toBe(compactPatch);
  });

  test('handles patches with multiple empty lines', () => {
    const multiEmptyPatch =
      `--- a/test1.originaltext.txt


+++ b/test1.originaltext.txt


@@ -1,4 +1,4 @@


 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world`;

    const expectedPatch =
      `--- a/test1.originaltext.txt
+++ b/test1.originaltext.txt
@@ -1,4 +1,4 @@
 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world`;

    expect(cleanPatch(multiEmptyPatch)).toBe(expectedPatch);
  });

  test('correctly updates line counts based on actual additions and removals', () => {
    const patchWithIncorrectCounts = 
`--- a/file.txt
+++ b/file.txt
@@ -1,10 +1,10 @@
 Line 1
-Line 2
-Line 3
+Line 2 modified
 Line 4
 Line 5`;

    const expectedPatch = 
`--- a/file.txt
+++ b/file.txt
@@ -1,5 +1,4 @@
 Line 1
-Line 2
-Line 3
+Line 2 modified
 Line 4
 Line 5`;

    expect(cleanPatch(patchWithIncorrectCounts)).toBe(expectedPatch);
  });

  test('handles complex patches with different operation types', () => {
    const complexPatch = 
`--- a/complex.txt

+++ b/complex.txt

@@ -1,5 +1,6 @@

 Unchanged line
-Removed line
+Added line
+Another added line
 Another unchanged line
\\ No newline at end of file

@@ -10,4 +10,2 @@

 Context line
-Deletion 1
-Deletion 2
\\ No newline at end of file`;

    const expectedPatch = 
`--- a/complex.txt
+++ b/complex.txt
@@ -1,3 +1,4 @@
 Unchanged line
-Removed line
+Added line
+Another added line
 Another unchanged line
\\ No newline at end of file
@@ -1,3 +1,1 @@
 Context line
-Deletion 1
-Deletion 2
\\ No newline at end of file`;

    expect(cleanPatch(complexPatch)).toBe(expectedPatch);
  });
  
  test('handles empty patch', () => {
    expect(cleanPatch('')).toBe('');
  });
  
  test('handles patches with only headers and no content', () => {
    const headerOnlyPatch = 
`--- a/empty.txt

+++ b/empty.txt

@@ -0,0 +1,0 @@
 x
+y

`;

    const expectedPatch = 
`--- a/empty.txt
+++ b/empty.txt
@@ -1,1 +1,2 @@
 x
+y`;

    expect(cleanPatch(headerOnlyPatch)).toBe(expectedPatch);
  });
  
  test('removes empty lines at beginning and end of patch', () => {
    const patchWithEmptyLinesAroundEdges = `


--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,3 @@
 Line 1
-Line 2
+Line 2 modified
 Line 3


`;

    const expectedPatch = 
`--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,3 @@
 Line 1
-Line 2
+Line 2 modified
 Line 3`;

    expect(cleanPatch(patchWithEmptyLinesAroundEdges)).toBe(expectedPatch);
  });

  test('handles patch with empty lines and whitespace at beginning and end', () => {
    const patchWithWhitespace = `
  
--- a/file.txt
+++ b/file.txt
@@ -1,2 +1,2 @@
 Hello
-world
+modified world
  
  `;

    const expectedPatch =
      `--- a/file.txt
+++ b/file.txt
@@ -1,2 +1,2 @@
 Hello
-world
+modified world`;

    expect(cleanPatch(patchWithWhitespace)).toBe(expectedPatch);
  });

  test('throws error at non valid line prefixes, valid => (-, +,  , \\)', () => {
    const patchWithNonValidPrefix = `
--- a/file.txt
+++ b/file.txt
@@ -1,2 +1,2 @@
 Hello
-world
+modified world
# some comment here
`;

    expect(() => cleanPatch(patchWithNonValidPrefix)).toThrow(PatchFormatError);
    expect(() => cleanPatch(patchWithNonValidPrefix)).toThrow("Invalid line prefix: '#'");
    
    try {
      cleanPatch(patchWithNonValidPrefix);
    } catch (error) {
      if (error instanceof PatchFormatError) {
        expect(error.context).toBe('# some comment here');
      }
    }
  });
  
  test('throws error with line number information', () => {
    const patchWithInvalidLineInMiddle = `
--- a/file.txt
+++ b/file.txt
@@ -1,4 +1,4 @@
 Hello
-world
+modified world
?invalid line
 last line`;

    expect(() => cleanPatch(patchWithInvalidLineInMiddle)).toThrow(PatchFormatError);
    
    try {
      cleanPatch(patchWithInvalidLineInMiddle);
    } catch (error) {
      if (error instanceof PatchFormatError) {
        expect(error.context).toBe('?invalid line');
      }
    }
  });

  test('allows empty lines within hunks', () => {
    const patchWithEmptyLineInHunk = `
--- a/file.txt
+++ b/file.txt
@@ -1,4 +1,4 @@
 Hello
-world

+modified world
 last line`;

    // This should not throw an error
    const cleaned = cleanPatch(patchWithEmptyLineInHunk);
    expect(cleaned).toContain('Hello');
    expect(cleaned).toContain('-world');
    expect(cleaned).toContain('+modified world');
  });

  test('missing context', () => {
    const patchWithMissingContext = `
--- a/file.txt
+++ b/file.txt
@@ hunk #1 @@
+just a lonely row
@@ hunk #2 @@
 Hello
-world

+modified world
 last line`;

    expect(() => cleanPatch(patchWithMissingContext)).toThrow(NotEnoughContextError);
    try {
      cleanPatch(patchWithMissingContext);
    } catch (error) {
      if (error instanceof NotEnoughContextError) {
        expect(error.context).toBe('@@ hunk #1 @@');
      }
    }

  });

  test('no edits in hunk', () => {
    const patchMissingContext = `
--- a/file.txt
+++ b/file.txt
@@ hunk #1 @@
 just a lonely row
@@ hunk #2 @@
 Hello
-world

+modified world
 last line`;

    expect(() => cleanPatch(patchMissingContext)).toThrow(NoEditsInHunkError);
    try {
      cleanPatch(patchMissingContext);
    } catch (error) {
      if (error instanceof NoEditsInHunkError) {
        expect(error.context).toBe('@@ hunk #1 @@');
      }
    }

  });
});
