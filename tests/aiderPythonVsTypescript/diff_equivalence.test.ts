import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe.skip('Python vs TypeScript diff implementation equivalence', () => {
  // Test categories
  const categories = {
    vanilla: {
      path: path.join(__dirname, 'vanilla_diffs'),
      tests: [] as string[]
    },
    exotic: {
      path: path.join(__dirname, 'exotic_diffs'),
      tests: [] as string[]
    }
  };

  // Discover test files in each category
  Object.entries(categories).forEach(([category, info]) => {
    const files = fs.readdirSync(info.path);

    // Find unique test numbers by looking at original file names
    const testNums = files
      .filter(file => file.endsWith('-original.txt'))
      .map(file => file.split('-')[0]);

    info.tests = [...new Set(testNums)]; // Remove duplicates if any
  });

  const runComparisonTest = (testNum: string, category: string): string => {
    const scriptPath = path.join(__dirname, 'run_comparison_test.sh');
    const categoryPath = path.join(__dirname, category === 'vanilla' ? 'vanilla_diffs' : 'exotic_diffs');

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
      const output = execSync(`${scriptPath} ${testNum} ${categoryPath}`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return output;
    } catch (error) {
      // @ts-ignore
      const errorMessage = `[Test ${testNum} (${category}) failed: ${error.stdout || error.message || 'Unknown error'}]`;
      console.error(errorMessage);
      return errorMessage;
    }
  };

  const getResultContent = (testNum: string, category: string): {
    pyContent: string,
    tsContent: string,
    modifiedContent: string,
    shellScriptResult: string
  } => {
    const shellScriptResult = runComparisonTest(testNum, category);
    const categoryPath = path.join(__dirname, category === 'vanilla' ? 'vanilla_diffs' : 'exotic_diffs');

    const paddedNum = testNum.padStart(3, '0');
    const tsResultPath = path.join(categoryPath, `${paddedNum}-result-ts.txt`);
    const pyResultPath = path.join(categoryPath, `${paddedNum}-result-py.txt`);
    const modifiedPath = path.join(categoryPath, `${paddedNum}-modified.txt`);

    // Read contents or provide fallback message if files don't exist
    let tsContent = `[tsContent was not generated in ${tsResultPath}]`;
    let pyContent = `[pyContent was not generated in ${pyResultPath}]`;
    let modifiedContent = '[modifiedContent could not be read from file]';

    if (fs.existsSync(tsResultPath)) {
      tsContent = fs.readFileSync(tsResultPath, 'utf8');
    }

    if (fs.existsSync(pyResultPath)) {
      pyContent = fs.readFileSync(pyResultPath, 'utf8');
    }

    if (fs.existsSync(modifiedPath)) {
      modifiedContent = fs.readFileSync(modifiedPath, 'utf8');
    }

    return { pyContent, tsContent, modifiedContent, shellScriptResult };
  };

  // Generate tests for exotic diffs
  describe('Exotic diffs', () => {
    categories.exotic.tests.forEach(testNum => {
      const paddedNum = testNum.padStart(3, '0');
      test(`Test ${paddedNum}: Exotic diff test`, () => {
        const { pyContent, tsContent, modifiedContent, shellScriptResult } = getResultContent(testNum, 'exotic');
        expect(pyContent).toEqual(tsContent);
      });
    });
  });

  // Generate tests for vanilla diffs
  describe('Vanilla diffs', () => {
    categories.vanilla.tests.forEach(testNum => {
      const paddedNum = testNum.padStart(3, '0');
      test(`Test ${paddedNum}: Vanilla diff test`, () => {
        const { pyContent, tsContent, modifiedContent, shellScriptResult } = getResultContent(testNum, 'vanilla');
        expect(pyContent).toEqual(tsContent);
      });
    });
  });
});