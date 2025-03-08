import { parsePatch } from "../src/vanilla_diff_patch/parsePatch";
import * as Diff from "diff";
import { NotEnoughContextError } from "../src/vanilla_diff_patch/errors";
import { applyDiff } from "../src/vanilla_diff_patch/applyDiff";
import {findDiffs} from "../src/aider_port/aider_udiff";


describe('applyDiff', () => {
  it('should handle multiple hunks in a single diff', () => {
    const patch = `--- a/test1.originaltext.txt
+++ b/test2.originaltext.txt
@@ -1,2 +1,2 @@
 Hello world
-This is a test file
+This is a modified test file
@@ -3,2 +3,2 @@
 It contains multiple lines
-Goodbye world
+Farewell world
--- a/test3.originaltext.txt
+++ b/test4.originaltext.txt
@@ -1,2 +1,2 @@
 Hello world
-This is a test file
+This is a modified test file
@@ -3,2 +3,2 @@
 It contains multiple lines
-Goodbye world
+Farewell world`;

    // Get edits using the current findDiffs function
    let result: any[] = findDiffs(patch);
    if (result.length == 0) {
      result = findDiffs(`\`\`\`diff\n${patch}\n\`\`\``);
    }

    const expectedOutput = [
      {
        oldFileName: 'a/test1.originaltext.txt',
        newFileName: 'b/test2.originaltext.txt',
        hunks: [
          [' Hello world\n', '-This is a test file\n', '+This is a modified test file\n'],
          [' It contains multiple lines\n', '-Goodbye world\n', '+Farewell world\n']
        ]
      },
      {
        oldFileName: 'a/test3.originaltext.txt',
        newFileName: 'b/test4.originaltext.txt',
        hunks: [
          [' Hello world\n', '-This is a test file\n', '+This is a modified test file\n'],
          [' It contains multiple lines\n', '-Goodbye world\n', '+Farewell world\n']
        ]
      }
    ];

    console.log('Current format:', JSON.stringify(result, null, 2));
    console.log('Expected format:', JSON.stringify(expectedOutput, null, 2));

    expect(result.length).toBe(2);
    
    expect(result[0].oldFileName).toBe('test1.originaltext.txt');
    expect(result[0].newFileName).toBe('test2.originaltext.txt');
    expect(result[1].oldFileName).toBe('test3.originaltext.txt');
    expect(result[1].newFileName).toBe('test4.originaltext.txt');
    
    expect(result[0].hunks.length).toBe(2);
    expect(result[1].hunks.length).toBe(2);
    expect(result[0].hunks[0]).toEqual([' Hello world\n', '-This is a test file\n', '+This is a modified test file\n']);
    expect(result[0].hunks[1]).toEqual([' It contains multiple lines\n', '-Goodbye world\n', '+Farewell world\n']);
    expect(result[1].hunks[0]).toEqual([' Hello world\n', '-This is a test file\n', '+This is a modified test file\n']);
    expect(result[1].hunks[1]).toEqual([' It contains multiple lines\n', '-Goodbye world\n', '+Farewell world\n']);

  });
});