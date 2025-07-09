# Development Plan: User-Controlled Git Commit Behavior

## Project Overview
Add a minor feature to allow users working on git repositories to control when the system automatically creates commits during interactions. This will give users more control over their git workflow while maintaining the structured development process.

## Explore

### Phase Entrance Criteria:
- [x] Development started with minor workflow
- [x] Initial analysis of current git functionality completed
- [x] Scope of the enhancement defined

### Tasks:
- [x] Analyze current git integration in conversation-manager.ts
- [x] Understand how git branch detection works
- [x] Identify where commit functionality should be added
- [x] Research user preferences for commit control (manual vs automatic vs configurable)
- [x] Analyze existing state machine workflows that mention commits (EPCC)
- [x] Define the scope: when should commits happen and how should users control it
- [x] Consider different user scenarios and preferences
- [x] Document findings and design approach

### Key Findings:
- Current git integration only detects branches for conversation identification
- No existing commit functionality in the codebase
- EPCC workflow has a "commit" phase but doesn't actually create git commits (no special handling needed)
- Git operations are limited to branch detection via `git rev-parse --abbrev-ref HEAD`
- System uses git branch names to create unique conversation IDs and plan file names
- EPCC workflow's "commit" phase is about finalization, not actual git commits
- All workflows could potentially benefit from commit functionality

### User Requirements Analysis:
- **Configurable commit levels**: step-level, phase-level, development-end
- **Configuration method**: Settings passed to start_development tool
- **Commit types**: WIP commits during development, final commit with rebase+squash
- **Message strategy**: Initial user message + automatic summary for WIP, proper message for final
- **Integration**: Works with all workflows, no special EPCC handling needed

### Technical Approach:
- Add commit configuration to ConversationState interface
- Extend start_development tool to accept commit settings
- Add git commit functionality to conversation-manager or new git-manager
- Hook into whats_next and proceed_to_phase for automatic commits
- Implement rebase+squash logic for final commits

## Implement

### Phase Entrance Criteria:
- [x] User preferences and scenarios are clearly defined
- [x] Technical approach is documented and approved
- [x] Integration points with existing code are identified
- [x] Scope is well-defined and focused on minor enhancement

### Tasks:
- [x] Add commit configuration options to conversation state
- [x] Implement git commit functionality with user control
- [x] Create GitManager class for git operations
- [x] Update database schema to store commit configuration
- [x] Hook commit functionality into whats_next and proceed_to_phase tools
- [x] Add tests for new commit functionality
- [x] Add integration tests for start_development handling git commit config
- [x] Add integration tests for handlers triggering GitManager based on conversation config
- [x] Update documentation
- [x] Test the complete feature end-to-end
- [x] Change default behavior to auto-enable git commits for git repositories
- [x] Update tests to reflect new default behavior
- [x] Update documentation for new auto-enable behavior
- [x] Fix integration tests to actually test real application behavior instead of mocks
- [x] Create proper integration tests that verify handlers call GitManager APIs correctly
- [x] Simplify MCP tool interface with commit_behaviour parameter (step|phase|end|none)
- [x] Update start_development tool schema to expose commit_behaviour
- [x] Update handler to translate commit_behaviour to internal git config
- [x] Verify commit_behaviour parameter appears in MCP inspector

## Decisions Log

### Decision 1: Analysis Approach
- **Decision**: Start by analyzing existing git integration and EPCC workflow
- **Reasoning**: Need to understand current capabilities before adding new features
- **Date**: Current

### Decision 3: User Requirements Clarified
- **Decision**: Configurable commit behavior with three levels:
  1. After each step (before whats_next) - WIP commits
  2. After each phase (before phase transition) - WIP commits  
  3. At development end - final commit with rebase+squash of intermediate commits
- **Reasoning**: Gives users full control over commit granularity
- **Date**: Current

### Decision 4: Configuration Method
- **Decision**: Configuration settings passed to start_development tool
- **Reasoning**: Clean integration with existing workflow initialization
- **Date**: Current

### Decision 5: Commit Message Strategy
- **Decision**: WIP commits with initial user message + automatic summary, final commit with proper message
- **Reasoning**: Meaningful but automated commit messages for development tracking
- **Date**: Current

### Decision 6: Auto-Enable for Git Repositories
- **Decision**: Automatically enable git commits when project is a git repository, with commit_on_complete as default
- **Reasoning**: Better user experience - users don't need to explicitly configure git commits for git repos
- **Implementation**: `enabled` and `commit_on_complete` default to `isGitRepository` result
- **Date**: Current
