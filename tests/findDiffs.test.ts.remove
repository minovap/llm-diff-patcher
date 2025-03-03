import { findDiffs, NoFilenameForHunkError } from '../src/utils/findDiffs';
import {Hunk} from "../src/utils/processFencedBlock";

describe('findDiffs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should ignore empty lines at the end of a hunk', () => {

    const diffWithTrailingEmptyLine = `
\`\`\`diff
--- a/file.js
+++ b/file.js
@@ -1 +1 @@
-var x = 1;
+let x = 1;

\`\`\``;

    const result1 = findDiffs(diffWithTrailingEmptyLine);
    expect(result1).toHaveLength(1);
    expect(result1[0].oldFile).toBe('file.js');
    expect(result1[0].newFile).toBe('file.js');
    expect(result1[0].lines).toHaveLength(2);

    const twoDiffsWithTrailingEmptyLineBetween = `
\`\`\`diff
--- a/file.js
+++ b/file.js
@@ -1 +1 @@
-var x = 1;
+let x = 1;

--- a/file2.js
+++ b/file2.js
@@ -1 +1 @@
-var x = 1;
+let x = 1;

\`\`\``;

    const result2 = findDiffs(twoDiffsWithTrailingEmptyLineBetween);
    expect(result2).toHaveLength(2);
    expect(result2[0].oldFile).toBe('file.js');
    expect(result2[0].newFile).toBe('file.js');
    expect(result2[0].lines).toHaveLength(2);
    expect(result2[1].oldFile).toBe('file2.js');
    expect(result2[1].newFile).toBe('file2.js');
    expect(result2[1].lines).toHaveLength(2);

  });

  it('should throw NoFilenameForHunkError for diffs without filename', () => {
    const diffWithoutFilename = `Here's a diff that will fix the data processing bug:

\`\`\`diff
@@ -10,7 +10,7 @@
 function computeRevenue(products) {
   let total = 0;
   for (const product of products) {
-    total += product.cost;
+    total += product.cost * product.units;
   }
   return total.toFixed(2);
 }
\`\`\`

This improvement accounts for the quantity of each product when calculating revenue.`;

    expect(() => {
      findDiffs(diffWithoutFilename);
    }).toThrow(NoFilenameForHunkError);
  });

  it('should parse simple diff blocks from AI-generated output', () => {
    const aiGeneratedDiff = `Here's a diff to fix the bug in your code:

\`\`\`diff
--- a/src/calculator.js
+++ b/src/calculator.js
@@ -1,5 +1,5 @@
 function calculateTotal(items) {
   return items
-    .reduce((total, item) => total + item.price, 0)
+    .reduce((total, item) => total + (item.price * item.quantity), 0)
     .toFixed(2);
 }
\`\`\`

This change multiplies the price by the quantity for each item.`;

    const result = findDiffs(aiGeneratedDiff);
    
    expect(result).toHaveLength(1);
    expect(result[0].oldFile).toBe('src/calculator.js');
    expect(result[0].newFile).toBe('src/calculator.js');
    expect(result[0].lines).toHaveLength(6);
  });

  it('should handle AI diffs with inaccurate line numbers', () => {
    const aiGeneratedDiff = `I notice the line numbers in your file are different, but here's the change you need:

\`\`\`diff
--- a/src/validator.js
+++ /dev/null
@@ -25,7 +99,7 @@
 function validateInput(input) {
   // Check if input is valid
-  return input.length > 0;
+  return input && input.length > 0;
 }
\`\`\`

This adds a null check before checking the length.`;

    const result = findDiffs(aiGeneratedDiff);
    
    expect(result).toHaveLength(1);
    expect(result[0].oldFile).toBe('src/validator.js');
    expect(result[0].newFile).toBeNull();
    expect(result[0].lines).toHaveLength(5);
  });

  it('should parse multiple hunks from a single AI response', () => {
    const aiGeneratedDiff = `Here are the changes needed:

\`\`\`diff
--- a/src/taxes.js
+++ b/src/taxes.js
@@ -5,7 +5,7 @@
 function calculateTax(amount) {
-  const taxRate = 0.07;
+  const taxRate = 0.08; // Updated tax rate
   return amount * taxRate;
 }

@@ -15,6 +15,10 @@
 function formatCurrency(amount) {
   return '$' + amount.toFixed(2);
 }
+
+// New helper function
+function calculateTotal(amount, tax) {
+  return amount + tax;
+}
\`\`\``;

    const result = findDiffs(aiGeneratedDiff);
    
    expect(result).toHaveLength(2);
    expect(result[0].oldFile).toBe('src/taxes.js');
    expect(result[0].newFile).toBe('src/taxes.js');
    expect(result[0].lines).toHaveLength(5);
    expect(result[1].oldFile).toBe('src/taxes.js');
    expect(result[1].newFile).toBe('src/taxes.js');
    expect(result[1].lines).toHaveLength(8);
  });

  it('should handle AI-generated diffs with file path specifications', () => {
    const aiGeneratedDiff = `Update the config.js file:

\`\`\`diff
--- a/src/config.js
+++ b/src/config.js
@@ -1,5 +1,5 @@
 module.exports = {
-  apiUrl: 'http://localhost:3000',
+  apiUrl: process.env.API_URL || 'http://localhost:3000',
   timeout: 5000,
   retries: 3
 };
\`\`\`

Also update the utils.js file:

\`\`\`diff
--- a/src/utils.js
+++ b/src/utils.js
@@ -10,7 +10,7 @@
 
 function fetchData(endpoint) {
   const config = require('./config');
-  return fetch(config.apiUrl + endpoint)
+  return fetch(config.apiUrl + endpoint, { timeout: config.timeout })
     .then(response => response.json());
 }
\`\`\``;

    const result = findDiffs(aiGeneratedDiff);
    
    expect(result).toHaveLength(2);
    
    // First file
    expect(result[0].oldFile).toBe('src/config.js');
    expect(result[0].newFile).toBe('src/config.js');
    expect(result[0].lines).toHaveLength(6);
    
    // Second file
    expect(result[1].oldFile).toBe('src/utils.js');
    expect(result[1].newFile).toBe('src/utils.js');
    expect(result[1].lines).toHaveLength(7);
  });

  it('should handle AI diffs containing non-standard formatting', () => {
    const aiGeneratedDiff = `Let me fix that for you:

\`\`\`diff
--- a/src/date.js
+++ b/src/date.js
@@ Function needs to be updated @@
 function parseDate(dateString) {
-  return new Date(dateString);
+  // Handle different date formats and validate
+  if (!dateString) return null;
+  const date = new Date(dateString);
+  return isNaN(date.getTime()) ? null : date;
 }
\`\`\`

The improved version handles null inputs and invalid dates.`;

    const result = findDiffs(aiGeneratedDiff);
    
    expect(result).toHaveLength(1);
    expect(result[0].oldFile).toBe('src/date.js');
    expect(result[0].newFile).toBe('src/date.js');
    expect(result[0].lines).toHaveLength(7);
  });

  it('should handle AI-generated diffs with explanatory context', () => {
    const aiGeneratedDiff = `To fix the memory leak in your React component, you need to add a cleanup function:

\`\`\`diff
--- a/src/date.js
+++ b/src/date.js
@@ -15,10 +15,13 @@ export function DataFetcher({ url }) {
   useEffect(() => {
     let isMounted = true;
     
     fetch(url)
       .then(response => response.json())
       .then(data => {
-        setData(data);
+        if (isMounted) {
+          setData(data);
+        }
       });
+    
+    return () => { isMounted = false; };
   }, [url]);
   
   return <div>{/* render data */}</div>;
\`\`\`

This change prevents setState on unmounted components.`;

    const result = findDiffs(aiGeneratedDiff);
    
    expect(result).toHaveLength(1);
    expect(result[0].oldFile).toBe('src/date.js');
    expect(result[0].newFile).toBe('src/date.js');
    expect(result[0].lines).toHaveLength(16);
  });

  it('should handle AI-generated diffs with additional whitespace and formatting', () => {
    const aiGeneratedDiff = `

Let's clean up the code:

\`\`\`diff
  
  // This is a comment inside the diff block
  
--- a/src/date.js
+++ b/src/date.js
@@ -20,9 +20,7 @@
  function processItems(items) {
-    const result = [];
-    for (let i = 0; i < items.length; i++) {
-      result.push(transform(items[i]));
-    }
+    // Use map for cleaner code
+    const result = items.map(item => transform(item));
     return result;
  }
  
\`\`\`
    
That's much more readable, right?`;

    const result = findDiffs(aiGeneratedDiff);
    
    expect(result).toHaveLength(1);
    expect(result[0].oldFile).toBe('src/date.js');
    expect(result[0].newFile).toBe('src/date.js');
    expect(result[0].lines).toHaveLength(9);
  });

  it('should handle empty or malformed AI-generated diffs gracefully', () => {
    const emptyDiff = `I thought about it and no changes are needed.`;
    const result = findDiffs(emptyDiff);
    expect(result).toHaveLength(0);
    
    const malformedDiff = `Here's what you need to change:

\`\`\`
function add(a, b) {
  return a + b;
}
\`\`\`

Change it to:

\`\`\`
function add(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Both arguments must be numbers');
  }
  return a + b;
}
\`\`\``;

    const malformedResult = findDiffs(malformedDiff);
    expect(malformedResult).toHaveLength(0);
  });

  it('should test various @@ @@ header formats that AI bots might hallucinate', () => {
    // Case 1: Standard format with line numbers
    const standardDiff = `
\`\`\`diff
--- a/file.js
+++ b/file.js
@@ -1,3 +1,3 @@
-const greeting = "hello";
+const greeting = "hello world";
 console.log(greeting);
\`\`\``;

    const result1 = findDiffs(standardDiff);
    expect(result1).toHaveLength(1);
    expect(result1[0].oldFile).toBe('file.js');
    expect(result1[0].newFile).toBe('file.js');
    expect(result1[0].lines).toHaveLength(3);

    // Case 2: Minimal headers with just line numbers
    const minimalDiff = `
\`\`\`diff
--- a/file.js
+++ b/file.js
@@ -1 +1 @@
-var x = 1;
+let x = 1;
\`\`\``;

    const result2 = findDiffs(minimalDiff);
    expect(result2).toHaveLength(1);
    expect(result2[0].oldFile).toBe('file.js');
    expect(result2[0].newFile).toBe('file.js');
    expect(result2[0].lines).toHaveLength(2);

    // Case 3: Headers with function names (often hallucinated)
    const functionNameDiff = `
\`\`\`diff
--- a/file.js
+++ b/file.js
@@ function main() @@
-return 42;
+return 43;
\`\`\``;

    const result3 = findDiffs(functionNameDiff);
    expect(result3).toHaveLength(1);
    expect(result3[0].oldFile).toBe('file.js');
    expect(result3[0].newFile).toBe('file.js');
    expect(result3[0].lines).toHaveLength(2);

    // Case 4: Extra content in the headers
    const extraContentDiff = `
\`\`\`diff
--- a/file.js
+++ b/file.js
@@ -10,2 +10,3 @@ function calculate() {
-  return a + b;
+  // Add a and b
+  return a + b;
\`\`\``;
    
    const result4 = findDiffs(extraContentDiff);
    expect(result4).toHaveLength(1);
    expect(result4[0].oldFile).toBe('file.js');
    expect(result4[0].newFile).toBe('file.js');
    expect(result4[0].lines).toHaveLength(3);

    // Case 5: Extra spaces in headers
    const extraSpacesDiff = `
\`\`\`diff
--- a/file.js
+++ b/file.js
@@  -5,2  +5,3  @@
-let sum = 0;
+// Initialize sum
+let sum = 0;
\`\`\``;
    
    const result5 = findDiffs(extraSpacesDiff);
    expect(result5).toHaveLength(1);
    expect(result5[0].oldFile).toBe('file.js');
    expect(result5[0].newFile).toBe('file.js');
    expect(result5[0].lines).toHaveLength(3);

    // Case 6: With filename in a separate section
    const filenameDiff = `
\`\`\`diff
--- a/src/app.js
+++ b/src/app.js
@@ -15,1 +15,1 @@
-const PORT = 3000;
+const PORT = process.env.PORT || 3000;
\`\`\``;
    
    const result6 = findDiffs(filenameDiff);
    expect(result6).toHaveLength(1);
    expect(result6[0].oldFile).toBe('src/app.js');
    expect(result6[0].newFile).toBe('src/app.js');
    expect(result6[0].lines).toHaveLength(2);

    // Case 7: Multiple chunks with different formats, including filenames
    const multiFormatDiff = `
\`\`\`diff
--- a/src/config.js
+++ b/src/config.js
@@ -1,1 +1,1 @@
-export const DEBUG = true;
+export const DEBUG = false;

@@ updateLogger @@
-console.log("Debug:", message);
+if (DEBUG) console.log("Debug:", message);

--- a/src/utils.js
+++ b/src/utils.js
@@ Function parse() @@ 
-return JSON.parse(data);
+try { return JSON.parse(data); } catch (e) { return {}; }
\`\`\``;
    
    const result7 = findDiffs(multiFormatDiff);
    expect(result7).toHaveLength(3);
    expect(result7[0].oldFile).toBe('src/config.js');
    expect(result7[0].newFile).toBe('src/config.js');
    expect(result7[0].lines).toHaveLength(2);
    expect(result7[1].oldFile).toBe('src/config.js');
    expect(result7[1].newFile).toBe('src/config.js');
    expect(result7[1].lines).toHaveLength(2);
    expect(result7[2].oldFile).toBe('src/utils.js');
    expect(result7[2].newFile).toBe('src/utils.js');
    expect(result7[2].lines).toHaveLength(2);

    // Case 8: Missing space between @@ symbols
    const missingSpaceDiff = `
\`\`\`diff
--- a/src/utils.js
+++ b/src/utils.js
@@-7,1 +7,2@@
-var flag = true;
+// Boolean flag
+const flag = true;
\`\`\``;
    
    const result8 = findDiffs(missingSpaceDiff);
    expect(result8).toHaveLength(1);
    expect(result8[0].oldFile).toBe('src/utils.js');
    expect(result8[0].newFile).toBe('src/utils.js');
    expect(result8[0].lines).toHaveLength(3);

    // Case 9: Only one @@ symbol
    const singleAtDiff = `
\`\`\`diff
--- a/src/utils.js
+++ b/src/utils.js
@@ Line 42
-throw Error("Failed");
+throw new Error("Operation failed");
\`\`\``;
    
    const result9 = findDiffs(singleAtDiff);
    expect(result9).toHaveLength(1);
    expect(result9[0].oldFile).toBe('src/utils.js');
    expect(result9[0].newFile).toBe('src/utils.js');

    // Case 10: Mix of filenames and function descriptions
    const mixedDiff = `
\`\`\`diff
--- lib/helpers.js
+++ lib/helpers.js
@@ parseOptions function @@
-const result = options.default;
+const result = options.default || {};
\`\`\``;
    
    const result10 = findDiffs(mixedDiff);
    expect(result10).toHaveLength(1);
    expect(result10[0].oldFile).toBe('lib/helpers.js');
    expect(result10[0].newFile).toBe('lib/helpers.js');
  });

  it('should handle /dev/null in file paths', () => {
    const nullFileDiff = `
\`\`\`diff
--- /dev/null
+++ b/src/new-file.js
@@ -0,0 +1,5 @@
+// New file
+export function newHelper() {
+  return true;
+}
\`\`\``;

    const result = findDiffs(nullFileDiff);
    expect(result).toHaveLength(1);
    expect(result[0].oldFile).toBeNull();
    expect(result[0].newFile).toBe('src/new-file.js');
  });

  it('should match the example output format', () => {
    const exampleDiff = `
\`\`\`diff
--- a/src/config.js
+++ b/src/config.js
@@ -1,1 +1,1 @@
-export const DEBUG = true;
+export const DEBUG = false;

@@ -5,1 +5,1 @@
-console.log("Debug:", message);
+if (DEBUG) console.log("Debug:", message);

--- /dev/null
+++ b/src/utils.js
@@ -0,0 +1,1 @@
+try { return JSON.parse(data); } catch (e) { return {}; }
\`\`\``;

    const result = findDiffs(exampleDiff);
    
    expect(result).toHaveLength(3);
    expect(result[0].oldFile).toBe('src/config.js');
    expect(result[0].newFile).toBe('src/config.js');
    expect(result[0].lines).toHaveLength(2);

    expect(result[1].oldFile).toBe('src/config.js');
    expect(result[1].newFile).toBe('src/config.js');
    expect(result[1].lines).toHaveLength(2);

    expect(result[2].oldFile).toBe(null);
    expect(result[2].newFile).toBe('src/utils.js');
    expect(result[2].lines).toHaveLength(1);
  });
});
