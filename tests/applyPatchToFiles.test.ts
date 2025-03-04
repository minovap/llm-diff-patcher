import path from "path";
import fs from "fs";
import {applyPatchToFiles, cleanPatch} from "../src";

const testDir = path.join(__dirname, 'applyPatchToFiles');

describe('applyDiff', () => {
  beforeEach(() => {
    // Clean up any result files before running tests
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      for (const file of files) {
        if (file.endsWith('.result.txt')) {
          fs.unlinkSync(path.join(testDir, file));
        }
      }
    }
  });

  it('should open files and edit them', () => {
    const patch = `--- a/test1.originaltext.txt
+++ b/test1.result.txt
@@ -1,4 +1,4 @@
 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world`;

    const result = applyPatchToFiles(patch, {
      basePath: testDir,
    });

    const expectedResultContent = fs.readFileSync('tests/applyPatchToFiles/test1.expectedresult.txt', 'utf8');
    const resultContent = fs.readFileSync('tests/applyPatchToFiles/test1.result.txt', 'utf8');

    expect(resultContent).toEqual(expectedResultContent);
  });

  it('should open files and edit them', () => {
    const patch = `--- file1.txt
+++ file1.txt
@@ -1,3 +1,4 @@
 This is the initial content of file1.
-It has multiple lines.
+It has multiple lines of text.
+This is a new line added by the patch.
 We'll modify this file with a patch later.
--- file2.py
+++ file2.py
@@ -1,5 +1,9 @@
 def hello_world():
-    print(\"Hello, World!\")
+    \"\"\"
+    A simple function that prints a greeting message.
+    \"\"\"
+    print(\"Hello, Patched World!\")
     return None
 
 if __name__ == \"__main__\":
     hello_world()
+    print(\"Patch successfully applied\")
--- file3.js
+++ file3.js
@@ -1,5 +1,7 @@
 function greet() {
-    console.log(\"Welcome to the project\");
+    console.log(\"Welcome to the patched project\");
+    console.log(\"This file was modified by a patch\");
 }
 
 // Call the function
 greet();
+// End of file
--- file4.md
+++ file4.md
@@ -1,9 +1,11 @@
-# Project Documentation
+# Patched Project Documentation
 
 ## Overview
-This is a sample project with multiple files.
+This is a sample project with multiple files that have been patched.
 
 ## Files
 - file1.txt - Text file
 - file2.py - Python script
 - file3.js - JavaScript file
 - file4.md - This markdown documentation
 - file5.html - HTML page
+
+## Patch Information
+All files were modified with a single unified patch.
--- file5.html
+++ file5.html
@@ -2,8 +2,10 @@
 <html>
 <head>
     <title>Sample Project</title>
+    <meta name=\"description\" content=\"A patched sample project\">
 </head>
 <body>
-    <h1>Welcome to the Sample Project</h1>
-    <p>This is a demonstration page.</p>
+    <h1>Welcome to the Patched Sample Project</h1>
+    <p>This is a demonstration page that was modified by a patch.</p>
+    <p>The patch was successfully applied!</p>
 </body>
 </html>
`;

    const result = cleanPatch(patch);
  });
});
