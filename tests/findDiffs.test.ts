import { findDiffs } from '../src/utils/findDiffs';

describe('findDiffs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse simple diff blocks from AI-generated output', () => {
    const aiGeneratedDiff = `Here's a diff to fix the bug in your code:

\`\`\`diff
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
    expect(result[0][0]).toBeUndefined(); // No file name specified
    expect(result[0][1]).toHaveLength(6);
    expect(result[0][1][0]).toBe(' function calculateTotal(items) {\n');
    expect(result[0][1][1]).toBe('   return items\n');
    expect(result[0][1][2]).toBe('-    .reduce((total, item) => total + item.price, 0)\n');
    expect(result[0][1][3]).toBe('+    .reduce((total, item) => total + (item.price * item.quantity), 0)\n');
    expect(result[0][1][4]).toBe('     .toFixed(2);\n');
    expect(result[0][1][5]).toBe(' }\n');
  });

  it('should handle AI diffs with inaccurate line numbers', () => {
    const aiGeneratedDiff = `I notice the line numbers in your file are different, but here's the change you need:

\`\`\`diff
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
    expect(result[0][0]).toBeUndefined();
    expect(result[0][1]).toHaveLength(5);
    expect(result[0][1][0]).toBe(' function validateInput(input) {\n');
    expect(result[0][1][1]).toBe('   // Check if input is valid\n');
    expect(result[0][1][2]).toBe('-  return input.length > 0;\n');
    expect(result[0][1][3]).toBe('+  return input && input.length > 0;\n');
    expect(result[0][1][4]).toBe(' }\n');
  });

  it('should parse multiple hunks from a single AI response', () => {
    const aiGeneratedDiff = `Here are the changes needed:

\`\`\`diff
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
    expect(result[0][0]).toBeUndefined();
    expect(result[0][1]).toHaveLength(6);
    expect(result[0][1][0]).toBe(' function calculateTax(amount) {\n');
    expect(result[0][1][1]).toBe('-  const taxRate = 0.07;\n');
    expect(result[0][1][2]).toBe('+  const taxRate = 0.08; // Updated tax rate\n');
    
    expect(result[1][0]).toBeUndefined();
    expect(result[1][1]).toHaveLength(8);
    expect(result[1][1][0]).toBe(' function formatCurrency(amount) {\n');
    expect(result[1][1][1]).toBe('   return \'$\' + amount.toFixed(2);\n');
    expect(result[1][1][2]).toBe(' }\n');
    expect(result[1][1][3]).toBe('+\n');
    expect(result[1][1][4]).toBe('+// New helper function\n');
    expect(result[1][1][5]).toBe('+function calculateTotal(amount, tax) {\n');
    expect(result[1][1][6]).toBe('+  return amount + tax;\n');
    expect(result[1][1][7]).toBe('+}\n');
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
    expect(result[0][0]).toBe('b/src/config.js');
    expect(result[0][1]).toHaveLength(6);
    expect(result[0][1][0]).toBe(' module.exports = {\n');
    expect(result[0][1][1]).toBe('-  apiUrl: \'http://localhost:3000\',\n');
    expect(result[0][1][2]).toBe('+  apiUrl: process.env.API_URL || \'http://localhost:3000\',\n');
    expect(result[0][1][3]).toBe('   timeout: 5000,\n');
    expect(result[0][1][4]).toBe('   retries: 3\n');
    
    expect(result[1][0]).toBe('b/src/utils.js');
    expect(result[1][1]).toHaveLength(7);
    expect(result[1][1][0]).toBe(' \n');
    expect(result[1][1][1]).toBe(' function fetchData(endpoint) {\n');
    expect(result[1][1][2]).toBe('   const config = require(\'./config\');\n');
    expect(result[1][1][3]).toBe('-  return fetch(config.apiUrl + endpoint)\n');
    expect(result[1][1][4]).toBe('+  return fetch(config.apiUrl + endpoint, { timeout: config.timeout })\n');
  });

  it('should handle AI diffs containing non-standard formatting', () => {
    const aiGeneratedDiff = `Let me fix that for you:

\`\`\`diff
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
    expect(result[0][0]).toBeUndefined();
    expect(result[0][1]).toHaveLength(7);
    expect(result[0][1][0]).toBe(' function parseDate(dateString) {\n');
    expect(result[0][1][1]).toBe('-  return new Date(dateString);\n');
    expect(result[0][1][2]).toBe('+  // Handle different date formats and validate\n');
    expect(result[0][1][3]).toBe('+  if (!dateString) return null;\n');
    expect(result[0][1][4]).toBe('+  const date = new Date(dateString);\n');
    expect(result[0][1][5]).toBe('+  return isNaN(date.getTime()) ? null : date;\n');
  });

  it('should handle AI-generated diffs with explanatory context', () => {
    const aiGeneratedDiff = `To fix the memory leak in your React component, you need to add a cleanup function:

\`\`\`diff
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
    expect(result[0][0]).toBeUndefined();
    expect(result[0][1]).toHaveLength(16);
    expect(result[0][1][0]).toBe('   useEffect(() => {\n');
    expect(result[0][1][1]).toBe('     let isMounted = true;\n');
    expect(result[0][1][2]).toBe('     \n');
    expect(result[0][1][3]).toBe('     fetch(url)\n');
    expect(result[0][1][4]).toBe('       .then(response => response.json())\n');
    expect(result[0][1][5]).toBe('       .then(data => {\n');
    expect(result[0][1][6]).toBe('-        setData(data);\n');
    expect(result[0][1][7]).toBe('+        if (isMounted) {\n');
    expect(result[0][1][8]).toBe('+          setData(data);\n');
    expect(result[0][1][9]).toBe('+        }\n');
    expect(result[0][1][10]).toBe('       });\n');
    expect(result[0][1][11]).toBe('+    \n');
    expect(result[0][1][12]).toBe('+    return () => { isMounted = false; };\n');
  });

  it('should handle AI-generated diffs with additional whitespace and formatting', () => {
    const aiGeneratedDiff = `

Let's clean up the code:

\`\`\`diff
  
  // This is a comment inside the diff block
  
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
    expect(result[0][0]).toBeUndefined();
    expect(result[0][1]).toHaveLength(10);
    expect(result[0][1][0]).toBe('  function processItems(items) {\n');
    expect(result[0][1][1]).toBe('-    const result = [];\n');
    expect(result[0][1][2]).toBe('-    for (let i = 0; i < items.length; i++) {\n');
    expect(result[0][1][3]).toBe('-      result.push(transform(items[i]));\n');
    expect(result[0][1][4]).toBe('-    }\n');
    expect(result[0][1][5]).toBe('+    // Use map for cleaner code\n');
    expect(result[0][1][6]).toBe('+    const result = items.map(item => transform(item));\n');
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
});
