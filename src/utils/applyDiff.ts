import * as Diff from "diff";
import {ParsedDiff} from "diff";

export function applyDiff(source: string, diff: ParsedDiff, options?: Diff.ApplyPatchOptions) {
  // check for duplicate match
  // error handling
  return Diff.applyPatch(source, diff, options);
}