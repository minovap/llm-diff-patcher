import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Python vs TypeScript diff implementation equivalence', () => {
  const runComparisonTest = (testNum: string): string => {
    const scriptPath = path.join(__dirname, 'run_comparison_test.sh');

    // Make the shell script executable if it's not already
    try {
      fs.chmodSync(scriptPath, 0o755);
    } catch (error) {
      const errorMessage = `[Failed to make script executable: ${error}]`;
      console.error(errorMessage);
      return errorMessage;
    }

    // Run the comparison test script
    try {
      const output = execSync(`${scriptPath} ${testNum}`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return output;
    } catch (error) {
      // @ts-ignore
      const errorMessage = `[Test ${testNum} failed: ${error.stdout || error.message || 'Unknown error'}]`;
      console.error(errorMessage);
      return errorMessage;
    }
  };

  const getResultContent = (testNum: string): { pyContent: string, tsContent: string, shellScriptResult: string } => {
    const shellScriptResult = runComparisonTest(testNum)

    const paddedNum = testNum.padStart(3, '0');
    const tsResultPath = path.join(__dirname, `${paddedNum}-result-ts.txt`);
    const pyResultPath = path.join(__dirname, `${paddedNum}-result-py.txt`);

    // Read contents or provide fallback message if files don't exist
    let tsContent = "[tsContent was not generated]";
    let pyContent = "[pyContent was not generated]";

    if (fs.existsSync(tsResultPath)) {
      tsContent = fs.readFileSync(tsResultPath, 'utf8');
    }

    if (fs.existsSync(pyResultPath)) {
      pyContent = fs.readFileSync(pyResultPath, 'utf8');
    }

    return { pyContent, tsContent, shellScriptResult };
  };

  test('Test 001: Add multiply function', () => {
    const { pyContent, tsContent } = getResultContent('1');
    expect(pyContent).toEqual(tsContent);
  });

  test('Test 002: Add age property to User class', () => {
    const { pyContent, tsContent } = getResultContent('2');
    expect(pyContent).toEqual(tsContent);
  });

  test('Test 003: Update inventory functions', () => {
    const { pyContent, tsContent } = getResultContent('3');
    expect(pyContent).toEqual(tsContent);
  });
});
