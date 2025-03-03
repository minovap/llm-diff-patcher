import * as Diff from 'diff';

describe('Diff.parsePatch with messy AI-generated line numbers', () => {
  it('should correctly parse a patch with incorrect line numbers', () => {
    // AI-generated patch with incorrect line numbers
    const aiGeneratedPatch = `--- a/calculate.js
+++ b/calculate.js
@@ ... @@ function calculateTotal
   let sum = 0;
   for (let i = 0; i < items.length; i++) {
-    sum += items[i].price;
+    // Include quantity in calculation
+    sum += items[i].price * items[i].quantity;
   }
  return sum;
 }
 
--- a/test.js
+++ b/test.js
@@ ... @@ function calculateTotal
   let sum = 0;
   for (let i = 0; i < items.length; i++) {
-    sum += items[i].price;
+    // Include quantity in calculation
+    sum += items[i].price * items[i].quantity;
   }
  return sum;
 }
 
 
@@ ... @@ function calculateTotal
   let sum = 0;
   for (let i = 0; i < items.length; i++) {
-    sum += items[i].price;
+    // Include quantity in calculation
+    sum += items[i].price * items[i].quantity;
   }
  return sum;
 }
 `;



    // Parse the patch
    const parsedPatch = Diff.parsePatch(aiGeneratedPatch);
    
    // Verify the parsed structure
    expect(parsedPatch).toHaveLength(2); // One file

  });

  it('should parse a patch with multiple hunks and odd formatting', () => {
    const oddFormattedPatch = `--- a/file.js
+++ b/file.js
@@ -1, 3 +1, 4 @@ function example
 function example() {
-  console.log("old");
+  // Added a comment
+  console.log("new");
 }
 
@@ -10,2 +11,3 @@ another section
 // Another section
-const x = 1;
+// Updated variable
+const x = 2;`;

    const parsedPatch = Diff.parsePatch(oddFormattedPatch);
    
    expect(parsedPatch).toHaveLength(1);
  });

  it('should parse headers with extra information after line numbers', () => {
    const patchWithExtra = `--- a/server.js
+++ b/server.js
@@ ... @@ exports.createServer = function()
 function handleRequest(req, res) {
   // Process request
-  console.log(req.url);
+  console.log(\`Request: \${req.url}\`);
   // Continue processing
 }`;

    const parsedPatch = Diff.parsePatch(patchWithExtra);
    expect(parsedPatch).toHaveLength(1);
  });
});
