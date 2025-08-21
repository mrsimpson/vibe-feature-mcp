# Development Plan: responsible-vibe (update-docs branch)

*Generated on 2025-08-21 by Vibe Feature MCP*
*Workflow: [bugfix](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/bugfix)*

## Goal
Fix documentation inconsistencies with current implementation, particularly around commit behavior and other outdated information. Ensure documentation is coherent and concise while maintaining accuracy.

## Reproduce

### Phase Entrance Criteria:
- [x] Initial phase - no entrance criteria needed

### Tasks
- [ ] Identify specific documentation inconsistencies mentioned by user
- [ ] Compare documentation against current implementation
- [ ] Document all found discrepancies
- [ ] Reproduce the documentation issues by examining actual vs documented behavior

### Completed
- [x] Created development plan file
- [x] Found major discrepancy in git commit API documentation
- [x] Identified missing git-commit-feature.md file reference in README
- [x] Verified README examples use correct API (commit_behaviour)
- [x] Identified publishing documentation as contributor-unfriendly
- [x] Confirmed main documentation inconsistencies are in git-commit-feature.md

## Analyze

### Phase Entrance Criteria:
- [x] All documentation inconsistencies have been identified and documented
- [x] Current implementation behavior has been verified  
- [x] Specific examples of outdated information have been collected

### Tasks
- [ ] Analyze root cause of git commit API documentation mismatch
- [ ] Determine why file path reference is incorrect in README
- [ ] Analyze what contributor information should replace publishing docs
- [ ] Identify the correct current API structure for git commits
- [x] Document the fix approach for each issue

### Completed
- [x] Analyzed root cause of git commit API documentation mismatch
- [x] Identified the correct current API structure for git commits
- [x] Determined why file path reference is incorrect in README
- [x] Analyzed what contributor information should replace publishing docs
- [x] Documented the fix approach for each issue

## Fix

### Phase Entrance Criteria:
- [x] Root cause of documentation inconsistencies has been identified
- [x] Analysis of what needs to be updated is complete
- [x] Fix approach has been documented

### Tasks
- [x] Fix git-commit-feature.md: Replace git_commit_config API with commit_behaviour enum
- [x] Fix README file path reference from ./docs/git-commit-feature.md to ./docs/user/git-commit-feature.md
- [x] Update publishing documentation to be contributor-focused (checks, renovate)
- [x] Ensure all examples use correct public API
- [x] Verify documentation coherence and conciseness
- [x] Improved how-it-works.md to explain MCP server integration with agents through system prompts
- [x] Created separate agent setup documentation (agent-setup.md)
- [x] Explained the critical role of system prompt setup
- [x] Remove redundancy from how-it-works.md while keeping it focused
- [x] Revamp README to focus on getting started and link to documentation website

### Completed
- [x] Fixed README file path reference from ./docs/git-commit-feature.md to ./docs/user/git-commit-feature.md
- [x] Fixed git-commit-feature.md: Replaced git_commit_config API with commit_behaviour enum
- [x] Ensured all examples use correct public API
- [x] Updated development documentation to be contributor-focused (checks, renovate)

## Verify

### Phase Entrance Criteria:
- [x] Documentation fixes have been implemented
- [x] All identified inconsistencies have been addressed
- [x] Updated documentation is ready for review

### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Finalize

### Phase Entrance Criteria:
- [ ] Documentation fixes have been verified as accurate
- [ ] No regressions or new inconsistencies have been introduced
- [ ] Documentation is coherent and concise

### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Key Decisions
**Major Documentation Inconsistencies Found:**

1. **Git Commit API Mismatch**: 
   - Documentation shows: `git_commit_config: { enabled: true, commit_on_step: true, ... }`
   - Actual implementation uses: `commit_behaviour: 'step' | 'phase' | 'end' | 'none'`

2. **Missing Git Documentation File**:
   - README references: `./docs/git-commit-feature.md`
   - Actual location: `./docs/user/git-commit-feature.md`

3. **API Parameter Differences**:
   - Docs show complex object with multiple boolean flags
   - Implementation uses simple enum with 4 options

4. **Publishing Documentation Issue** (user feedback):
   - Publishing documentation is uninteresting for contributors/developers
   - Should mention checks and renovate instead

5. **How-It-Works Documentation Gap** (user feedback):
   - Missing explanation of MCP server integration with agents
   - System prompt setup not well explained
   - Need separate agent setup documentation

**Impact**: Users following documentation will get API errors when trying to configure git commits.

**Root Cause Analysis:**

1. **Git API Mismatch Root Cause**: 
   - Documentation shows internal `GitCommitConfig` interface instead of public API
   - Public API uses simple enum: `commit_behaviour: 'step' | 'phase' | 'end' | 'none'`
   - Internal implementation translates enum to complex object structure
   - Documentation was written for internal API, not user-facing API

2. **File Path Issue**: 
   - README references `./docs/git-commit-feature.md`
   - Actual file is at `./docs/user/git-commit-feature.md`
   - Likely moved during documentation reorganization

3. **Publishing Documentation**: 
   - Current PUBLISHING.md focuses on release automation
   - Contributors need info about checks, renovate, development workflow
   - Not relevant for day-to-day development work

**Fix Approach:**

1. **Rewrite git-commit-feature.md**: 
   - Replace all `git_commit_config` examples with `commit_behaviour` enum
   - Update API examples to show correct public interface
   - Keep internal behavior explanations but clarify they're implementation details

2. **Fix README file path**: 
   - Update reference from `./docs/git-commit-feature.md` to `./docs/user/git-commit-feature.md`

3. **Replace publishing docs with contributor info**:
   - Add section about development checks (tests, linting)
   - Mention renovate for dependency management
   - Focus on contributor workflow rather than release automation

## Notes
*Additional context and observations*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
