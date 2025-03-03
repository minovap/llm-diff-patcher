import * as Diff from 'diff';
import { DiffHunkExtractor } from '../src/utils/hunkExtractor';

describe('DiffHunkExtractor', () => {
  it('should extract hunks from a simple diff', () => {
    const diff = `--- a/file.js
+++ b/file.js
@@ -999,4 +888,5 @@
 function example() {
-  return 0;
+  // Return a different value
+  return 1;
 }`;

    const extractor = new DiffHunkExtractor(diff);
    
    // Verify the hunks were extracted
    expect(extractor.hunks).toHaveLength(1);
    
    const hunk = extractor.hunks[0];
    expect(hunk.oldFileName).toBe('file.js');
    expect(hunk.newFileName).toBe('file.js');
    
    // Check the before text
    expect(hunk.beforeText).toContain('function example()');
    expect(hunk.beforeText).toContain('return 0;');
    
    // Check the after text
    expect(hunk.afterText).toContain('function example()');
    expect(hunk.afterText).toContain('Return a different value');
    expect(hunk.afterText).toContain('return 1;');
    
    // Verify the normalized diff can be applied
    const originalCode = `function example() {
  return 0;
}`;
    
    const expectedResult = `function example() {
  // Return a different value
  return 1;
}`;
    
    const patchedCode = Diff.applyPatch(originalCode, hunk.diff);
    expect(patchedCode).not.toBe(false);
    expect(patchedCode.toString().replace(/\r\n/g, '\n')).toEqual(expectedResult.replace(/\r\n/g, '\n'));
  });

  it('should extract multiple hunks from a diff with multiple files', () => {
    const diff = `--- a/file1.js
+++ b/file1.js
@@ -25,3 +26,3 @@
 function add(a, b) {
-  return a + b;
+  return a + b + 0; // Ensure numeric
 }
--- a/file2.js
+++ b/file2.js
@@ -1,3 +1,4 @@
 function calculate() {
+  // Initialize value
   return 42;
 }`;

    const extractor = new DiffHunkExtractor(diff);
    
    // Verify both hunks were extracted
    expect(extractor.hunks).toHaveLength(2);
    
    // Check first hunk
    expect(extractor.hunks[0].oldFileName).toBe('file1.js');
    expect(extractor.hunks[0].newFileName).toBe('file1.js');
    expect(extractor.hunks[0].beforeText).toContain('return a + b;');
    expect(extractor.hunks[0].afterText).toContain('return a + b + 0;');
    
    // Check second hunk
    expect(extractor.hunks[1].oldFileName).toBe('file2.js');
    expect(extractor.hunks[1].newFileName).toBe('file2.js');
    expect(extractor.hunks[1].beforeText).not.toContain('Initialize value');
    expect(extractor.hunks[1].afterText).toContain('Initialize value');
    
    // Verify we can apply the patches
    const file1Code = `function add(a, b) {
  return a + b;
}`;
    
    const file2Code = `function calculate() {
  return 42;
}`;
    
    const expectedFile1 = `function add(a, b) {
  return a + b + 0; // Ensure numeric
}`;
    
    const expectedFile2 = `function calculate() {
  // Initialize value
  return 42;
}`;
    
    const patched1 = Diff.applyPatch(file1Code, extractor.hunks[0].diff);
    const patched2 = Diff.applyPatch(file2Code, extractor.hunks[1].diff);
    
    expect(patched1).not.toBe(false);
    expect(patched2).not.toBe(false);
    
    // Normalize and compare results
    expect(patched1.toString().replace(/\r\n/g, '\n')).toEqual(expectedFile1.replace(/\r\n/g, '\n'));
    expect(patched2.toString().replace(/\r\n/g, '\n')).toEqual(expectedFile2.replace(/\r\n/g, '\n'));
  });

  it('should handle AI-generated diffs with completely incorrect line numbers', () => {
    const diff = `--- a/algorithm.js
+++ b/algorithm.js
@@ -Function main() {
 function calculateAverage(numbers) {
-  let sum = 0;
+  let sum = 0; // Initialize sum
   for (let i = 0; i < numbers.length; i++) {
     sum += numbers[i];
   }
@@ -improve performance
 function optimizedCalculation(data) {
-  return data.map(x => x * 2);
+  // Use a more efficient approach
+  return data.reduce((acc, x) => {
+    acc.push(x * 2);
+    return acc;
+  }, []);
 }`;

    const extractor = new DiffHunkExtractor(diff);
    
    // Verify the hunks were extracted despite invalid headers
    expect(extractor.hunks).toHaveLength(2);
    
    // Check that the filenames are preserved
    expect(extractor.hunks[0].oldFileName).toBe('algorithm.js');
    expect(extractor.hunks[0].newFileName).toBe('algorithm.js');
    expect(extractor.hunks[1].oldFileName).toBe('algorithm.js');
    expect(extractor.hunks[1].newFileName).toBe('algorithm.js');
    
    // Apply the first hunk
    const code1 = `function calculateAverage(numbers) {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i];
  }
  return sum / numbers.length;
}`;
    
    const expected1 = `function calculateAverage(numbers) {
  let sum = 0; // Initialize sum
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i];
  }
  return sum / numbers.length;
}`;
    
    const patched1 = Diff.applyPatch(code1, extractor.hunks[0].diff);
    expect(patched1).not.toBe(false);
    expect(patched1.toString().replace(/\r\n/g, '\n')).toEqual(expected1.replace(/\r\n/g, '\n'));
    
    // Apply the second hunk
    const code2 = `function optimizedCalculation(data) {
  return data.map(x => x * 2);
}`;
    
    const expected2 = `function optimizedCalculation(data) {
  // Use a more efficient approach
  return data.reduce((acc, x) => {
    acc.push(x * 2);
    return acc;
  }, []);
}`;
    
    const patched2 = Diff.applyPatch(code2, extractor.hunks[1].diff);
    expect(patched2).not.toBe(false);
    expect(patched2.toString().replace(/\r\n/g, '\n')).toEqual(expected2.replace(/\r\n/g, '\n'));
  });
});
