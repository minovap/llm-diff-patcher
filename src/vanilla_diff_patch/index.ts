/**
 * Original vanilla implementation exports
 */

export { applyDiff } from './applyDiff';
export { parsePatch, countHunkHeaders, DiffsGroupedByFilenames } from './parsePatch';
export { cleanPatch } from './cleanPatch';
export { applyPatchToFiles as vanillaApplyPatchToFiles } from './applyPatchToFiles';
export { 
  BaseError, 
  PatchFormatError, 
  HunkHeaderCountMismatchError, 
  NotEnoughContextError, 
  NoEditsInHunkError, 
  InsufficientContextLinesError
} from './errors';
