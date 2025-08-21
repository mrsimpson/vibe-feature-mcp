# Git Commit Feature

The responsible-vibe-mcp server supports configurable automatic git commits during development interactions. This feature allows users to control when the system creates commits, providing better integration with git workflows.

## Overview

The git commit feature provides four levels of commit automation:

1. **`step`**: Commit after each development step (most granular)
2. **`phase`**: Commit before each phase transition (milestone commits)
3. **`end`**: Single final commit at development completion (default)
4. **`none`**: No automatic commits (manual git control)

## Configuration

Git commit behavior is configured when starting development using the `start_development` tool:

```javascript
start_development({
  workflow: 'waterfall',
  commit_behaviour: 'end', // Options: "step", "phase", "end", "none"
});
```

### Commit Behavior Options

- **`step`**: Creates commits after each development step, providing detailed progress tracking
- **`phase`**: Creates commits before phase transitions, marking major milestones
- **`end`**: Creates a single commit when development is complete (recommended default)
- **`none`**: Disables automatic commits, giving you full manual control

## Default Behavior

The system automatically chooses sensible defaults:

- **Git repositories**: Defaults to `"end"` (single final commit)
- **Non-git projects**: Automatically uses `"none"` (no commits possible)

## Usage Examples

### Recommended Usage (Default)

```javascript
// Single final commit (recommended for most cases)
start_development({
  workflow: 'waterfall',
  commit_behaviour: 'end',
});
```

### Detailed Progress Tracking

```javascript
// Commit after each step for detailed history
start_development({
  workflow: 'epcc',
  commit_behaviour: 'step',
});
```

### Milestone Tracking

```javascript
// Commit at major phase transitions
start_development({
  workflow: 'bugfix',
  commit_behaviour: 'phase',
});
```

### Manual Git Control

```javascript
// No automatic commits
start_development({
  workflow: 'minor',
  commit_behaviour: 'none',
});
```

## Commit Message Format

The system creates descriptive commit messages based on the development context:

### Step Commits (`"step"`)

```
WIP: [workflow] - [current phase] step completion

Example: "WIP: waterfall - requirements step completion"
```

### Phase Commits (`"phase"`)

```
WIP: [workflow] - transition to [next phase]

Example: "WIP: waterfall - transition to design phase"
```

### Final Commits (`"end"`)

```
[conventional commit format based on development context]

Example: "feat: implement user authentication system"
```

## Technical Details

### Git Repository Detection

The system automatically detects if the current project is a git repository. If not, commit operations are silently skipped regardless of the `commit_behaviour` setting.

### Commit Creation Logic

- **Change Detection**: Only creates commits when there are actual changes to commit
- **Staging**: Automatically stages all changes before committing (`git add .`)
- **Error Handling**: Gracefully handles git errors without interrupting development flow

## Integration with Workflows

The git commit feature works with all available workflows:

- **waterfall**: Commits at requirements, design, implementation, qa, testing phases
- **epcc**: Commits at explore, plan, code, commit phases
- **bugfix**: Commits at reproduce, analyze, fix, verify phases
- **minor**: Commits at explore and implement phases
- **greenfield**: Commits at ideation, architecture, plan, code, document phases
- **custom**: Works with any custom workflow definition

## Best Practices

1. **Use `"end"` for most cases**: Single final commit keeps history clean while preserving work
2. **Use `"phase"` for milestone tracking**: Good for longer development sessions
3. **Use `"step"` for detailed tracking**: Helpful when debugging or learning the workflow
4. **Use `"none"` for manual control**: When you have specific git workflow requirements

## Troubleshooting

### No Commits Created

- Verify the directory is a git repository (`git status`)
- Check that there are actual file changes to commit
- Ensure git configuration is correct (`git config user.name` and `git config user.email`)
- Check that `commit_behaviour` is not set to `"none"`

### Git Errors

- Git errors are logged but don't interrupt development flow
- Check git repository status and permissions
- Verify git configuration is correct
- Ensure no merge conflicts or other git issues

### Unexpected Commit Behavior

- Remember that `commit_behaviour` is set once at the start of development
- Different workflows may have different phase structures affecting when commits occur
- Check the development plan file to see which phase you're currently in
