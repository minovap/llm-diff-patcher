import path from "path";
import fs from "fs";
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
});