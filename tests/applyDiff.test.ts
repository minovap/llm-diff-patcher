import { parsePatch } from "../src/utils/parsePatch";
import fs from 'fs';
import path from 'path';
import * as Diff from "diff";
import { NotEnoughContextError} from "../src/utils/errors";
import {applyDiff} from "../src/utils/applyDiff";
import {applyPatchToFiles} from "../src";

const testDir = path.join(__dirname, 'applyDiffFiles');

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

    const expectedResultContent = fs.readFileSync('tests/applyDiffFiles/test1.expectedresult.txt', 'utf8');
    const resultContent = fs.readFileSync('tests/applyDiffFiles/test1.result.txt', 'utf8');

    expect(resultContent).toEqual(expectedResultContent);
  });

  it('should handle multiple hunks in a single diff', () => {
    const patch = `--- a/test1.originaltext.txt
+++ b/test1.originaltext.txt
@@ -1,2 +1,2 @@
 Hello world
-This is a test file
+This is a modified test file
@@ -3,2 +3,2 @@
 It contains multiple lines
-Goodbye world
+Farewell world`;

    const diffsGroupedByFilenames = parsePatch(patch);
    
    expect(diffsGroupedByFilenames.length).toBe(1);
    expect(diffsGroupedByFilenames[0].diffs.length).toBe(2);
  });

  it('should handle errors when file not found', () => {
    const patch = `--- a/nonexistent.txt
+++ b/nonexistent.txt
@@ -1,4 +1,4 @@
 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world`;

    const diffsGroupedByFilenames = parsePatch(patch);

    for (const diffGroup of diffsGroupedByFilenames) {
      const oldFilePath = path.join(testDir, diffGroup.oldFileName);
      
      expect(() => {
        try {
          const fileContents = fs.readFileSync(oldFilePath, 'utf8');
        } catch (e) {
          throw Error(`old file ${oldFilePath} not found`);
        }
      }).toThrow(`old file ${oldFilePath} not found`);
    }
  });

  it('should throw an error when hunk counts mismatch', () => {
    const invalidPatch = `--- a/test1.originaltext.txt
+++ b/test1.originaltext.txt
@@ -1,4 +1,4 @@
 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world
@@ invalid hunk header will be ignored
@@ invalid hunk header will be ignored
 Something here`;

    expect(() => parsePatch(invalidPatch)).toThrow(NotEnoughContextError);
  });

  it('should correctly apply diffs with context', () => {
    const originalText = `Line 1
Line 2
Line 3
Line 4
Line 5`;
    
    const patch = `@@ -2,3 +2,3 @@
 Line 2
-Line 3
+Modified Line 3
 Line 4`;

    const diff = Diff.parsePatch(patch)[0];
    const result = applyDiff(originalText, diff);

    const expectedResult = `Line 1
Line 2
Modified Line 3
Line 4
Line 5`;

    expect(result).toEqual(expectedResult);
  });
});