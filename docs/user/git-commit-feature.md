# Git Commit Feature

The responsible-vibe-mcp server now supports configurable automatic git commits during development interactions. This feature allows users to control when the system creates commits, providing better integration with git workflows.

## Overview

The git commit feature provides three levels of commit automation:

1. **Step-level commits**: Commit after each step (before `whats_next` calls)
2. **Phase-level commits**: Commit after each phase transition (before `proceed_to_phase` calls)
3. **Development-end commits**: Final commit at development completion with rebase+squash of intermediate commits

## Configuration

Git commit behavior is configured when starting development using the `start_development` tool:

```javascript
start_development({
  workflow: 'minor',
  git_commit_config: {
    enabled: true,
    commit_on_step: true,
    commit_on_phase: true,
    commit_on_complete: true,
    initial_message: 'Implement user authentication feature',
  },
});
```

### Configuration Options

- **`enabled`** (boolean): Master switch to enable/disable git commits
- **`commit_on_step`** (boolean): Create WIP commits after each development step
- **`commit_on_phase`** (boolean): Create WIP commits before phase transitions
- **`commit_on_complete`** (boolean): Create final commit with rebase+squash at development end
- **`initial_message`** (string): Base message used in commit messages for context

## Commit Message Format

### WIP Commits

WIP commits use the following format:

```
WIP: {initial_message} - {context} ({phase})
```

Examples:

- `WIP: Implement user authentication - Step completion (requirements)`
- `WIP: Implement user authentication - Phase transition: requirements → design (requirements)`

### Final Commits

Final commits use a clean message based on the development context and will squash any intermediate WIP commits created during the session.

## Usage Examples

### Basic Usage

```javascript
// Enable commits at all levels
start_development({
  workflow: 'waterfall',
  git_commit_config: {
    enabled: true,
    commit_on_step: true,
    commit_on_phase: true,
    commit_on_complete: true,
    initial_message: 'Add user dashboard feature',
  },
});
```

### Phase-only Commits

```javascript
// Only commit at phase transitions
start_development({
  workflow: 'epcc',
  git_commit_config: {
    enabled: true,
    commit_on_step: false,
    commit_on_phase: true,
    commit_on_complete: true,
    initial_message: 'Fix authentication bug',
  },
});
```

### Manual Control

```javascript
// Disable automatic commits (manual git control)
start_development({
  workflow: 'minor',
  git_commit_config: {
    enabled: false,
  },
});
```

## Technical Details

### Git Repository Detection

The system automatically detects if the current project is a git repository. If not, commit operations are silently skipped.

### Commit Creation Logic

- **Change Detection**: Only creates commits when there are actual changes to commit
- **Staging**: Automatically stages all changes before committing (`git add .`)
- **Error Handling**: Gracefully handles git errors without interrupting development flow

### Rebase and Squashing

When `commit_on_complete` is enabled:

- Tracks the starting commit hash when development begins
- Counts intermediate commits created during the session
- Uses `git reset --soft` and recommit to squash multiple commits into one clean final commit
- Preserves the development history while providing a clean final result

## Integration with Workflows

The git commit feature works with all available workflows:

- **waterfall**: Commits at requirements, design, implementation, qa, testing phases
- **epcc**: Commits at explore, plan, code, commit phases
- **bugfix**: Commits at reproduce, analyze, fix, verify phases
- **minor**: Commits at explore and implement phases
- **greenfield**: Commits at ideation, architecture, plan, code, document phases
- **custom**: Works with any custom workflow definition

## Best Practices

1. **Use descriptive initial messages**: The initial message appears in all WIP commits, so make it descriptive of the feature being developed.

2. **Choose appropriate commit levels**:
   - Use step-level commits for detailed development tracking
   - Use phase-level commits for milestone tracking
   - Use development-end commits for clean final history

3. **Branch management**: Consider creating feature branches before starting development with commits enabled.

4. **Review before final commit**: The system creates the final commit automatically, but you can always amend or modify it afterward.

## Troubleshooting

### No Commits Created

- Verify `enabled: true` in configuration
- Check that there are actual file changes to commit
- Ensure the directory is a git repository
- Check git configuration (user.name and user.email)

### Git Errors

- Git errors are logged but don't interrupt development flow
- Check git repository status and permissions
- Verify git configuration is correct

### Commit History Issues

- Use `git log --oneline` to review commit history
- WIP commits can be manually squashed or rebased if needed
- The automatic squashing only affects commits created during the current development session
