# Frictionless Renovate Configuration

This document describes the comprehensive Renovate configuration implemented for automated dependency management with intelligent automerge capabilities.

## Overview

The configuration provides truly frictionless dependency updates by automatically merging safe updates when CI checks pass, while requiring manual review for potentially breaking changes.

## Key Features

### 🤖 Intelligent Automerge
- **Patch updates**: Automatically merged (safest changes)
- **Dev dependencies**: Automatically merged (testing/build tools)
- **TypeScript ecosystem**: Grouped and automatically merged
- **Security fixes**: Immediately merged when CI passes
- **Major updates**: Manual review required

### 📦 Smart Grouping
Dependencies are intelligently grouped to reduce PR noise:
- **TypeScript**: `typescript`, `@types/**`
- **Testing**: `vitest`, `@vitest/**`, `jsdom`, `@types/jsdom`
- **Build Tools**: `tsx`, `vite-node`, `@rollup/**`

### 🛡️ Safety Gates
- **Core dependencies**: Manual review for minor/major updates
  - `@modelcontextprotocol/sdk`, `sqlite3`, `zod`, `js-yaml`
- **Major updates**: Always require human approval
- **CI validation**: Only automerges when ALL status checks pass

### ⏰ Optimized Scheduling
- **Weekdays**: After 10pm and before 5am (off-hours)
- **Weekends**: Anytime
- **Lock file maintenance**: Monday mornings at 4am
- **Rate limiting**: Max 5 concurrent PRs, 3 per hour

## Configuration Details

### Automerge Strategy
```json
{
  "platformAutomerge": true,
  "automerge": true,
  "automergeType": "pr",
  "automergeStrategy": "squash"
}
```

Uses GitHub's native automerge with squash commits for clean history.

### Semantic Commits
```json
{
  "semanticCommits": "enabled",
  "semanticCommitType": "chore",
  "semanticCommitScope": "deps"
}
```

Generates conventional commits: `chore(deps): update package to v1.2.3`

### Security & Maintenance
- **Vulnerability alerts**: Enabled with immediate automerge
- **Lock file maintenance**: Weekly updates on Monday mornings
- **Notification suppression**: Reduces noise from ignored PRs

## Labels Applied

Each PR gets descriptive labels for easy identification:
- `automerge`: Will be automatically merged
- `patch`: Patch version update
- `dev-deps`: Development dependency
- `typescript`: TypeScript ecosystem update
- `testing`: Testing-related dependency
- `build`: Build tool update
- `major-update`: Major version update (needs review)
- `needs-review`: Requires manual review
- `core-dependency`: Core project dependency
- `security`: Security vulnerability fix
- `lockfile-maintenance`: Lock file refresh

## Branch Protection Requirements

The configuration requires GitHub branch protection rules:
1. **Require status checks to pass before merging**
2. **Require branches to be up to date before merging**
3. **Include administrators** (recommended)

This ensures automerge only happens when CI passes.

## Expected Behavior

### What Gets Auto-Merged
✅ Patch updates (1.0.0 → 1.0.1)  
✅ Dev dependencies (testing, linting, build tools)  
✅ TypeScript ecosystem updates  
✅ Security vulnerability fixes  
✅ Weekly lock file maintenance  

### What Requires Review
👀 Major updates (1.x.x → 2.x.x)  
👀 Minor updates to core dependencies  
👀 Updates to critical packages  

### Timing
- Updates created during off-hours to avoid CI conflicts
- Maximum 5 concurrent PRs to prevent CI overload
- Rate limited to 3 PRs per hour

## Monitoring

Monitor Renovate activity through:
- **GitHub Actions**: Check for successful automerges
- **PR labels**: Identify update types at a glance
- **Dependency Dashboard**: Optional centralized view (currently disabled)

## Troubleshooting

### If Automerge Stops Working
1. Check branch protection rules are enabled
2. Verify CI workflows are passing
3. Ensure GitHub App has correct permissions (if using app token)

### If Too Many PRs
- Adjust `prConcurrentLimit` (currently 5)
- Modify `prHourlyLimit` (currently 3)
- Add more packages to existing groups

### If Updates Are Too Aggressive
- Move packages from automerge to manual review
- Adjust `matchUpdateTypes` in package rules
- Add specific packages to the core dependencies list

## Customization

To modify the configuration:
1. Edit `renovate.json` in the repository root
2. Test changes on a feature branch first
3. Monitor the first few runs after changes
4. Adjust based on your team's preferences

The configuration is designed to be conservative and safe while maximizing automation for routine updates.
