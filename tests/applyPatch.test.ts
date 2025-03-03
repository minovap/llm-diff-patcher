import { DiffHunkExtractor } from '../src/utils/hunkExtractor';
import { applyHunkPatch, applyHunks, BeforeTextNotUniqueError } from '../src/utils/applyPatch';
import * as Diff from "diff";

describe('patch application utilities', () => {
  describe('applyHunkPatch', () => {

    it('should apply a patch with incorrect line numbers when using fuzzFactor', () => {
      const originalText = `Hello world
This is a test file
It contains multiple lines
Goodbye world`;

      // This patch has completely incorrect line numbers that don't match the file
      const patch = `--- a/original.txt
+++ b/original.txt
@@ ... @@
 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world`;

      const expectedResult = `Hello world
This is a modified test file
It contains multiple lines
Goodbye world`;

      const extractor = new DiffHunkExtractor(patch);
      const hunk = extractor.hunks[0];

      const result = applyHunkPatch(originalText, hunk);

      expect(result.success).toBe(true);
      expect(result.result).toEqual(expectedResult);

    });

    it('should apply a single hunk patch', () => {
      const originalCode = `function example() {
  return 0;
}`;

      const diff = `--- a/file.js
+++ b/file.js
@@ -1,3 +1,4 @@
 function example() {
-  return 0;
+  // Return a different value
+  return 1;
 }`;

      const extractor = new DiffHunkExtractor(diff);
      const hunk = extractor.hunks[0];
      
      const result = applyHunkPatch(originalCode, hunk);
      
      expect(result.success).toBe(true);
      expect(result.result).toContain('return 1;');
      expect(result.result).toContain('Return a different value');
    });

    it('should detect and reject duplicate beforeText matches', () => {
      // Source code with duplicate functions
      const originalCode = `function example() {
  return 0;
}

// Another identical function
function example() {
  return 0;
}`;

      const diff = `--- a/file.js
+++ b/file.js
@@ ... @@
 function example() {
-  return 0;
+  // Return a different value
+  return 1;
 }`;

      const extractor = new DiffHunkExtractor(diff);
      const hunk = extractor.hunks[0];
      
      // Should fail due to duplicate matches
      const result = applyHunkPatch(originalCode, hunk);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Multiple instances of the "before text" found');
    });

    it('should apply a patch with fuzzy factor', () => {
      // Source code has an extra line
      const originalCode = `// Header comment
function example() {
  return 0;
}`;

      const diff = `--- a/file.js
+++ b/file.js
@@ -1,3 +1,4 @@
 function example() {
-  return 0;
+  // Return a different value
+  return 1;
 }`;

      const extractor = new DiffHunkExtractor(diff);
      const hunk = extractor.hunks[0];
      
      const resultNoFuzz = applyHunkPatch(originalCode, hunk);
      expect(resultNoFuzz.success).toBe(true);
      
      const resultWithFuzz = applyHunkPatch(originalCode, hunk, { fuzzFactor: 1 });
      expect(resultWithFuzz.success).toBe(true);
      expect(resultWithFuzz.result).toContain('return 1;');
      expect(resultWithFuzz.result).toContain('Return a different value');
    });
  });

  describe('applyHunks', () => {
    it('should apply multiple hunks sequentially', () => {
      const originalCode = `function sum(a, b) {
  return a + b;
}

function multiply(a, b) {
  return a * b;
}`;

      const diff = `--- a/math.js
+++ b/math.js
@@ -1,5 +1,6 @@
 function sum(a, b) {
-  return a + b;
+  // Add numbers
+  return a + b;
 }
 
@@ -1,3 +1,4 @@
 function multiply(a, b) {
-  return a * b;
+  // Multiply numbers
+  return a * b;
 }`;

      const extractor = new DiffHunkExtractor(diff);
      
      const result = applyHunks(originalCode, extractor.hunks);
      
      expect(result.success).toBe(true);
      expect(result.hunks.every(h => h.applied)).toBe(true);
      expect(result.result).toContain('// Add numbers');
      expect(result.result).toContain('// Multiply numbers');
    });

    it('should continue applying hunks even if some fail', () => {
      const originalCode = `function sum(a, b) {
  return a + b;
}

function multiply(a, b) {
  return a * b;
}

function divide(a, b) {
  return a / b;
}`;

      // Create a diff where the middle hunk won't apply
      const diff = `--- a/math.js
+++ b/math.js
@@ -1,4 +1,5 @@
 function sum(a, b) {
+  // Add numbers
   return a + b;
 }
 
@@ -1,4 +1,4 @@
 function DOESNTEXIST(a, b) {
-  return 999;
+  return 123;
 }
 
@@ -1,3 +1,4 @@
 function divide(a, b) {
+  // Check for division by zero
   return a / b;
 }`;

      const extractor = new DiffHunkExtractor(diff);
      
      const result = applyHunks(originalCode, extractor.hunks);
      
      expect(result.success).toBe(true); // Overall success because some hunks applied
      expect(result.hunks.length).toBe(3);
      expect(result.hunks[0].applied).toBe(true);
      expect(result.hunks[1].applied).toBe(false); // This one should fail
      expect(result.hunks[2].applied).toBe(true);
      
      expect(result.result).toContain('// Add numbers');
      expect(result.result).not.toContain('return 123;');
      expect(result.result).toContain('// Check for division by zero');
    });

    it('should handle an empty source text gracefully', () => {
      const originalCode = '';

      const diff = `--- a/file.js
+++ b/file.js
@@ -0,0 +1,3 @@
+// New file
+function example() {
+}`;

      const extractor = new DiffHunkExtractor(diff);
      
      const result = applyHunkPatch(originalCode, extractor.hunks[0]);
      
      expect(result.success).toBe(true);
      expect(result.result).toContain('// New file');
      expect(result.result).toContain('function example()');
    });

    it('should handle duplicate beforeText in different hunks', () => {
      const originalCode = `function example1() {
  const value = 1;
  return value;
}

function example2() {
  const value = 2;
  return value;
}`;

      // Both hunks match the same pattern but in different functions
      const diff = `--- a/file.js
+++ b/file.js
@@ -1,3 +1,3 @@
 function example1() {
-  const value = 1;
+  const value = 10;
   return value;
@@ -1,3 +1,3 @@
 function example2() {
-  const value = 2;
+  const value = 20;
   return value;`;

      const extractor = new DiffHunkExtractor(diff);
      
      // This should work because we check for duplicates within the current source text
      // and after applying the first hunk, the second hunk's context is unique
      const result = applyHunks(originalCode, extractor.hunks);
      
      expect(result.success).toBe(true);
      expect(result.hunks.every(h => h.applied)).toBe(true);
      expect(result.result).toContain('const value = 10;');
      expect(result.result).toContain('const value = 20;');
    });
  });
});
