/**
 * Main entry point for the package.
 * Re-exports the Aider implementation of applyPatchToFiles.
 */

import { 
  applyPatchToFiles,
} from '@src/aider_port/applyPatchToFiles';

// Export the Aider implementation of applyPatchToFiles as the default implementation
export { 
  applyPatchToFiles,
};
