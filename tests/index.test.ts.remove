import { applyFuzzyDiff, UnifiedDiffNoMatchError, UnifiedDiffNotUniqueError } from '../src';

describe('applyFuzzyDiff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply a simple diff correctly', () => {
    const sourceText = `function hello() {
  console.log("Hello, world!");
  return true;
}`;

    const diffText = `\`\`\`diff
--- a/file.js
+++ a/file.js
@@ -1,4 +1,4 @@
 function hello() {
-  console.log("Hello, world!");
+  console.log("Hello, universe!");
   return true;
 }
\`\`\``;

    const result = applyFuzzyDiff(sourceText, diffText);
    
    expect(result.result).toBe(`function hello() {
  console.log("Hello, universe!");
  return true;
}
`);
    expect(result.appliedHunks).toBe(1);
    expect(result.failedHunks).toBe(0);
  });

  it('should handle diffs with incorrect line numbers', () => {
    const sourceText = `function hello() {
  console.log("Hello, world!");
  return true;
}
`;

    // Note that the line numbers are off by 10
    const diffText = `\`\`\`diff
--- a/file.js
+++ a/file.js
@@ -11,4 +11,4 @@
 function hello() {
-  console.log("Hello, world!");
+  console.log("Hello, universe!");
   return true;
 }
\`\`\``;

    const result = applyFuzzyDiff(sourceText, diffText);
    
    expect(result.result).toBe(`function hello() {
  console.log("Hello, universe!");
  return true;
}
`);

    expect(result.appliedHunks).toBe(1);
    expect(result.failedHunks).toBe(0);
  });

  it('should handle multiple diff hunks', () => {
    const sourceText = `function hello() {
  console.log("Hello, world!");
  return true;
}

function goodbye() {
  console.log("Goodbye, world!");
  return false;
}
`;

    const diffText = `\`\`\`diff
--- a/file.js
+++ a/file.js
@@ -1,4 +1,4 @@
 function hello() {
-  console.log("Hello, world!");
+  console.log("Hello, universe!");
   return true;
 }
--- a/file.js
+++ a/file.js
@@ -6,4 +6,4 @@
 function goodbye() {
-  console.log("Goodbye, world!");
+  console.log("Goodbye, universe!");
   return false;
 }
\`\`\``;

    const result = applyFuzzyDiff(sourceText, diffText);

    expect(result.result).toBe(`function hello() {
  console.log("Hello, universe!");
  return true;
}

function goodbye() {
  console.log("Goodbye, universe!");
  return false;
}
`);
    expect(result.appliedHunks).toBe(2);
    expect(result.failedHunks).toBe(0);
  });

  it('should report failed hunks when context doesn\'t match', () => {
    const sourceText = `function hello() {
  console.log("Hello, world!");
  return true;
}`;

    // Context doesn't match at all
    const diffText = `\`\`\`diff
--- a/file.js
+++ a/file.js
@@ -1,4 +1,4 @@
 function somethingElse() {
-  alert("This doesn't match");
+  alert("Changed text");
   return false;
 }
\`\`\``;

    expect(() => {
      applyFuzzyDiff(sourceText, diffText);
    }).toThrow();

    try {
      applyFuzzyDiff(sourceText, diffText);
    } catch (e: unknown) {
      const error = e as Error;
      expect(error.message).toContain('hunk failed to apply');
      expect(error.message).toContain('does not contain lines that match the diff');
    }
  });

  it('should handle file append', () => {
    const sourceText = `function hello() {
  console.log("Hello, world!");
  return true;
}
`;

    const diffText = `\`\`\`diff
--- a/file.js
+++ a/file.js
@@ -0,0 +1,4 @@
+
+function goodbye() {
+  console.log("Goodbye, universe!");
+  return false;
\`\`\``;

    const result = applyFuzzyDiff(sourceText, diffText);
    
    expect(result.result).toBe(`function hello() {
  console.log("Hello, world!");
  return true;
}

function goodbye() {
  console.log("Goodbye, universe!");
  return false;
`);
    expect(result.appliedHunks).toBe(1);
    expect(result.failedHunks).toBe(0);
  });
});
