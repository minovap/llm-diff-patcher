import { parsePatch } from "../src/vanilla_diff_patch/parsePatch";
import * as Diff from "diff";
import { NotEnoughContextError} from "../src/vanilla_diff_patch/errors";
import {applyDiff} from "../src/vanilla_diff_patch/applyDiff";


describe('applyDiff', () => {
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