# Development Plan: responsible-vibe (main branch)

*Generated on 2025-07-02 by Vibe Feature MCP*
*Workflow: bugfix*

## Goal
Fix workflow file detection issue when MCP server is executed via `npx responsible-vibe-mcp` from a different directory than the project folder.

## Reproduce
### Tasks
- [x] Understand the current workflow file detection mechanism
- [x] Reproduce the issue by running MCP server from different directory
- [x] Document the exact failure scenario
- [x] Identify which workflow files are not being found

### Completed
- [x] Created development plan file
- [x] Found the issue in `WorkflowManager.loadPredefinedWorkflows()` method
- [x] Reproduced the path resolution problem

## Analyze
### Phase Entrance Criteria:
- [x] Bug has been successfully reproduced
- [x] Exact failure conditions are documented
- [x] Current workflow detection mechanism is understood

### Tasks
- [x] Analyze the current path resolution logic in detail
- [x] Understand how npm package installation works
- [x] Research best practices for finding package resources
- [x] Identify the correct approach for locating workflow files
- [x] Consider different deployment scenarios (dev vs npm package)
- [x] Design a robust solution that works in all cases

### Completed
- [x] Identified primary issue: missing `resources/**/*` in package.json files array
- [x] Identified secondary issue: path resolution assumes development structure
- [x] Analyzed npm package structure and deployment scenarios
- [x] Designed two-part solution: fix packaging + improve path resolution

## Fix
### Phase Entrance Criteria:
- [x] Root cause has been identified
- [x] Analysis of workflow detection logic is complete
- [x] Solution approach is clear

### Tasks
- [x] Fix package.json to include resources directory
- [x] Improve path resolution logic in WorkflowManager
- [x] Test the fix with development environment
- [x] Test the fix with simulated npm package scenario
- [x] Ensure backward compatibility

### Completed
- [x] Added `resources/**/*` to package.json files array
- [x] Implemented robust `findWorkflowsDirectory()` method with multiple strategies
- [x] Tested fix successfully - workflows load from different directory
- [x] Maintained backward compatibility with development environment

## Verify
### Phase Entrance Criteria:
- [x] Fix has been implemented
- [x] Code changes are complete
- [x] Initial testing shows fix works

### Tasks
- [x] Test workflow loading from different directories
- [x] Test with simulated npm package structure
- [x] Verify all predefined workflows load correctly
- [x] Test edge cases (missing directories, permission issues)
- [x] Verify backward compatibility with development environment
- [x] Run comprehensive test suite
- [x] Create unit tests for the new findWorkflowsDirectory method

### Completed
- [x] Successfully tested workflow loading from different directories
- [x] Verified all 5 predefined workflows load correctly (waterfall, bugfix, epcc, minor, greenfield)
- [x] Created comprehensive unit tests (6 test cases)
- [x] All existing tests pass (109/109 tests)
- [x] Confirmed backward compatibility with development environment
- [x] Verified robust path resolution with multiple fallback strategies

## Key Decisions

### Bug Reproduction Results
- **Root Issue**: `WorkflowManager.loadPredefinedWorkflows()` uses incorrect path resolution
- **Problem**: When MCP server runs via `npx` from different directory, it calculates project root incorrectly
- **Current Logic**: Uses `import.meta.url` and goes up one directory level
- **Failure**: Looks for `resources/workflows` relative to current working directory instead of package installation
- **Example**: From `/tmp/test-project/`, it looks for `/tmp/resources/workflows` instead of the npm package location

### Reproduction Steps
1. Run `npx responsible-vibe-mcp` from any directory other than the package source
2. Path resolution calculates wrong project root
3. Workflow files not found at expected location
4. MCP server fails to load predefined workflows

### Root Cause Analysis
- **Primary Issue**: `package.json` files array is missing `resources/**/*`
- **Secondary Issue**: Path resolution logic assumes development environment structure
- **Impact**: When package is installed via npm, workflow files are not included
- **Current files array**: Only includes `dist/**/*` and documentation files
- **Missing**: `resources` directory with workflow YAML files
- **Solution**: Need to fix both packaging and path resolution

## Notes

### Bug Fix Summary
Successfully resolved the workflow file detection issue when MCP server is executed via `npx responsible-vibe-mcp` from different directories.

### Root Causes Identified
1. **Primary Issue**: `package.json` files array was missing `resources/**/*` entry
2. **Secondary Issue**: Path resolution logic was fragile and assumed development environment structure

### Solution Implemented
1. **Fixed Packaging**: Added `resources/**/*` to package.json files array
2. **Robust Path Resolution**: Implemented `findWorkflowsDirectory()` method with multiple fallback strategies:
   - Relative path resolution from current file location
   - Package root detection by searching for package.json with correct name
   - Common npm installation path checking
   - Verification that found directories actually contain workflow files

### Verification Results
- ✅ All 5 predefined workflows load correctly from different directories
- ✅ Backward compatibility maintained with development environment
- ✅ Comprehensive unit tests created (6 test cases)
- ✅ All existing tests pass (109/109 tests)
- ✅ Manual testing confirms fix works in real scenarios

### Impact
- **Before**: MCP server failed to load workflows when run from different directories
- **After**: Robust workflow loading works from any directory with multiple fallback strategies
- **Deployment**: Ready for npm package distribution with proper resource inclusion

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
