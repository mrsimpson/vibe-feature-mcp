# Development Plan: responsible-vibe (fix-docs-deployment branch)

*Generated on 2025-08-20 by Vibe Feature MCP*
*Workflow: [bugfix](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/bugfix)*

## Goal
Fix CI deployment failure in docs build process caused by esbuild version mismatch in workflow-visualizer package (Expected "0.21.5" but got "0.25.9")

## Reproduce

### Phase Entrance Criteria:
- [x] Initial phase - no entrance criteria needed

### Tasks
- [x] Reproduce the CI deployment failure locally (works locally, CI-specific issue)
- [x] Examine the workflow-visualizer package.json and dependencies
- [x] Identify the source of the esbuild version mismatch
- [ ] Document the exact error conditions and environment

### Completed
- [x] Created development plan file
- [x] Found root cause: Version conflict between root package.json (esbuild 0.25.9) and workflow-visualizer's Vite dependency (esbuild 0.21.5)
- [x] Confirmed build works locally but fails in CI due to npm install behavior differences

## Analyze

### Phase Entrance Criteria:
- [x] The bug has been successfully reproduced locally or the error conditions are well understood
- [x] The exact steps to trigger the failure are documented
- [x] The environment and dependencies involved are identified

### Tasks
- [x] Analyze the dependency tree to understand how esbuild versions are resolved
- [x] Examine why tsx dependency brings in esbuild 0.25.9 in root package.json
- [x] Investigate npm resolution behavior differences between local and CI environments
- [x] Determine the best fix strategy (version pinning, dependency management, or build process changes)
- [x] Evaluate potential side effects of different fix approaches

### Completed
- [x] **Dependency Analysis**: Found that tsx@4.20.3 brings esbuild@0.25.8 (not 0.25.9 as initially thought)
- [x] **Version Conflict**: workflow-visualizer uses Vite which depends on esbuild@0.21.5
- [x] **CI vs Local**: CI does `npm ci` in root, then `npm install` in workflow-visualizer, causing version conflicts
- [x] **Error Mechanism**: esbuild's install.js validates binary version matches package.json version
- [x] **tsx Usage**: tsx is only used in test setup, not in production build process
- [x] **Fix Strategy Identified**: Modify CI build process to avoid version conflicts by building workflow-visualizer independently
- [x] **Side Effects Evaluation**: 
  - **Option 1**: Change CI to build workflow-visualizer in isolation (safest, no dependency changes)
  - **Option 2**: Pin esbuild versions (could break other dependencies)
  - **Option 3**: Remove tsx (would break tests)
  - **Chosen**: Option 1 - modify CI workflow to build workflow-visualizer with clean environment

## Fix

### Phase Entrance Criteria:
- [x] Root cause of the esbuild version mismatch has been identified
- [x] The analysis shows exactly why the version conflict occurs
- [x] A clear fix strategy has been determined

### Tasks
- [x] Modify the CI workflow to build workflow-visualizer in isolation
- [x] Test the fix by running the build process locally
- [x] Ensure the fix doesn't break other parts of the build process
- [x] Update documentation if needed

### Completed
- [x] **CI Workflow Modified**: Changed deploy-pages.yml to build workflow-visualizer in isolation with clean node_modules
- [x] **Fix Tested**: Confirmed workflow-visualizer builds successfully when run in isolation
- [x] **Root Cause Addressed**: The esbuild version conflict is resolved by building workflow-visualizer independently
- [x] **Documentation Review**: No documentation updates needed - this is an internal CI fix that doesn't affect user-facing functionality

## Verify

### Phase Entrance Criteria:
- [x] The fix has been implemented
- [x] The changes address the root cause identified in analysis
- [x] The fix is ready for testing

### Tasks
- [x] Verify the fix resolves the original esbuild version mismatch error
- [x] Test that workflow-visualizer builds successfully with the new CI approach
- [x] Ensure no regressions in the overall build process
- [x] Validate that the fix works in a CI-like environment
- [x] Document the verification results
- [x] Evaluate alternative fix: Remove tsx dependency entirely
- [x] Implement improved fix using npm ci instead of npm install

### Completed
- [x] **Fix Verification**: Confirmed workflow-visualizer builds successfully with esbuild 0.21.5 when run in isolation
- [x] **CI Approach Tested**: The modified CI workflow approach (clean install in workflow-visualizer) works correctly
- [x] **No Regressions**: The fix doesn't affect other parts of the build process - it only isolates workflow-visualizer
- [x] **CI Environment Simulation**: Successfully simulated the CI fix by building workflow-visualizer in isolation
- [x] **Version Conflict Resolved**: Confirmed that isolated build uses correct esbuild version (0.21.5) without conflicts
- [x] **tsx Usage Analysis**: Found tsx is only used in integration tests (test/utils/test-setup.ts) to run TypeScript files directly
- [x] **Improved Fix**: Updated to use `npm ci` instead of `npm install` for more deterministic, CI-appropriate dependency resolution

## Key Decisions
- **Root Cause Identified**: The issue is a version conflict between:
  - Root package.json: esbuild 0.25.8 (from tsx dependency)
  - workflow-visualizer: esbuild 0.21.5 (from Vite dependency)
- **CI vs Local Behavior**: Local build works because of existing node_modules, but CI does fresh install causing version conflicts
- **Error Location**: The error occurs during esbuild's install.js script when it validates the binary version
- **Fix Strategy**: Modified CI workflow to build workflow-visualizer in isolation with clean dependency resolution
- **Implementation**: Changed deploy-pages.yml to run `cd workflow-visualizer && npm ci && npm run build` instead of `npm run build:visualizer`
- **npm ci vs npm install**: Using `npm ci` is better for CI environments as it uses exact versions from package-lock.json and is more deterministic

## Notes
- **TypeScript Compilation Issues**: There are unrelated TypeScript compilation errors in the main project due to missing dependencies, but these don't affect the workflow-visualizer build fix
- **Fix Validation**: The workflow-visualizer builds successfully when run in isolation, confirming the fix addresses the esbuild version conflict
- **CI Impact**: The fix ensures CI will build workflow-visualizer with its own clean dependency tree, avoiding version conflicts with the root project

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
