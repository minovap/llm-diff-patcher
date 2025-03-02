# fuzzy-diff-ts

A TypeScript library for applying "fuzzy" diffs, particularly useful for AI-generated diffs where line numbers may not be accurate.

## Installation

```bash
npm install fuzzy-diff-ts
```

## Usage

```typescript
import { applyFuzzyDiff } from 'fuzzy-diff-ts';

// Original source code
const sourceText = `function hello() {
  console.log("Hello, world!");
  return true;
}`;

// A diff to apply (in unified diff format)
const diffText = `@@ -1,4 +1,4 @@
 function hello() {
-  console.log("Hello, world!");
+  console.log("Hello, universe!");
   return true;
 }`;

// Apply the fuzzy diff
const result = applyFuzzyDiff(sourceText, diffText);

console.log(result.result);
// Output:
// function hello() {
//   console.log("Hello, universe!");
//   return true;
// }

console.log(`Applied: ${result.appliedChunks}, Failed: ${result.failedChunks}`);
// Output: Applied: 1, Failed: 0
```

## Configuration Options

You can customize the behavior with options:

```typescript
const result = applyFuzzyDiff(sourceText, diffText, {
  // Threshold for context matching (default: 3)
  contextLines: 5,
  
  // Similarity threshold for fuzzy matching (0-1, default: 0.8)
  // Higher values require closer matches
  similarityThreshold: 0.7,
  
  // Whether to ignore whitespace changes (default: true)
  ignoreWhitespace: false
});
```

## How It Works

Unlike traditional diff algorithms that rely on exact line numbers, `applyFuzzyDiff` uses context matching and string similarity to find the best location to apply a change, even if the line numbers in the diff are incorrect.

This is particularly useful for:

1. AI-generated code modifications where line numbers may be inconsistent
2. Applying diffs across slightly different versions of the same file
3. Working with diffs that were created without perfect context

## License

MIT
