import {applyDiff, DiffsGroupedByFilenames, parsePatch} from "../src";
// @ts-ignore
import parsePatchOriginal from "../src/utils/parsePatchOriginal.js";
import fs from 'fs';
import path from 'path';
import {cleanPatch} from "../src/utils/patchCleaner";
import * as Diff from "diff";

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

  it('should not have any file names in the headers', () => {
  });

  it('should open files and edit them', () => {
    const patch = `--- a/test1.originaltext.txt

+++ b/test1.originaltext.txt

@@ ... @@

 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world

@@ ... @@

 Hello world
-This is a test file
+This is a modified test file
 It contains multiple lines
 Goodbye world

`;
    const cleanedPath = cleanPatch(patch)

    const diffsGroupedByFilenames = parsePatch(cleanedPath);

    const applyDiffGroup = (diffGroup: DiffsGroupedByFilenames, workingDirectory: string = '') => {
      const newFileName = path.basename(diffGroup.newFileName);
      const oldFilePath = path.join(testDir, diffGroup.oldFileName);


      let fileContents;

      try {
        fileContents = fs.readFileSync(oldFilePath).toString();
      } catch (e) {
        throw Error(`old file ${oldFilePath} not found`);
      }


      const resultPath = path.join(testDir, oldFilePath.replace('.txt', '.result.txt'));
      /*
      // Construct paths
      const expectedResultPath = path.join(testDir, oldFileName.replace('.txt', '.expectedresult.txt'));

      // Read files
      const originalText = fs.readFileSync(originalTextPath, 'utf8');
      const expectedResult = fs.readFileSync(expectedResultPath, 'utf8');

      for (const diff of diffGroup.diffs) {
        const result = applyDiff(originalText, diff);

        if (result) {
          // Save the result to a file
          fs.writeFileSync(resultPath, result, 'utf8');
        }

        // Compare with expected result
        expect(result).toEqual(expectedResult);
      }*/
    }

    for (const group of diffsGroupedByFilenames) {
      try {
        applyDiffGroup(group, testDir);
      } catch (e) {
        const a = 1;
      }


      // cant find file error
      // create new file not supported error
      // delete file not supported error
      // cant rename file, target filename exitsts

    }
  });
});