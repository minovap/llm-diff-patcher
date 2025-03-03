export { applyDiff } from './applyDiff';
export { parsePatch, countHunkHeaders, DiffsGroupedByFilenames } from './parsePatch';
export { cleanPatch } from './cleanPatch';
export { 
  BaseError, 
  PatchFormatError, 
  HunkHeaderCountMismatchError, 
  NotEnoughContextError, 
  NoEditsInHunkError 
} from './errors';
