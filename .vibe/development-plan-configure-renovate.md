# Development Plan: responsible-vibe (configure-renovate branch)

*Generated on 2025-08-21 by Vibe Feature MCP*
*Workflow: [minor](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/minor)*

## Goal
Configure Renovate to provide a frictionless dependency update experience with minimal manual intervention while maintaining code quality and stability.

## Explore
### Tasks
- [x] Analyze current project structure and dependencies
- [x] Identify existing Renovate configuration (if any)
- [x] Research frictionless Renovate best practices
- [x] Define requirements for automated dependency management
- [x] Design configuration approach for minimal friction
- [x] Research GitHub PR configuration options
- [x] Analyze and fix branch protection workflow issue

### Completed
- [x] Created development plan file
- [x] Analyzed project: Node.js/TypeScript project with npm, has basic renovate.json with config:recommended
- [x] Found existing CI/CD: GitHub Actions with PR validation (Node 18, 20, latest) and automated tests
- [x] Researched best practices for frictionless dependency management
- [x] Defined comprehensive requirements for automated updates
- [x] Designed configuration approach with auto-merge and grouping strategies
- [x] Documented 30+ GitHub PR configuration options from Renovate docs
- [x] Fixed release workflow to use GitHub App token for bypassing branch protection

## Implement

### Phase Entrance Criteria:
- [ ] Current project structure and dependencies are analyzed
- [ ] Frictionless Renovate requirements are clearly defined
- [ ] Configuration approach is designed and documented
- [ ] Best practices for automated updates are identified

### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Finalize

### Phase Entrance Criteria:
- [ ] Renovate configuration is implemented and tested
- [ ] Automated dependency updates are working as expected
- [ ] Configuration provides the desired frictionless experience
- [ ] Documentation is complete and accurate

### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Key Decisions

### Current State Analysis
- **Project Type**: Node.js/TypeScript MCP server with npm package management
- **Dependencies**: Mix of production deps (@modelcontextprotocol/sdk, js-yaml, sqlite3, zod) and dev deps (vitest, typescript, etc.)
- **Current Renovate Config**: Basic setup with `config:recommended` preset only
- **CI/CD**: GitHub Actions with PR validation across Node 18, 20, and latest versions
- **Testing**: Automated test suite with `npm run test:run`

### Updated Frictionless Requirements (Automerge with CI)
- **Automerge when CI checks pass** (user has good test coverage)
- **Automatic PR creation** but silent merging when tests pass
- **Grouped updates** to reduce PR noise for related dependencies
- **Semantic commit messages** (project uses conventional commits)
- **Respect CI/CD pipeline** - only merge when all checks succeed
- **Different strategies** for patch vs minor vs major updates
- **Security updates** get immediate priority

### Optimal Automerge Configuration Strategy
**Patch & Dev Dependencies**: Auto-merge immediately when CI passes
**Minor Updates**: Auto-merge for well-maintained packages
**Major Updates**: Create PR for manual review
**Security Updates**: Immediate auto-merge when CI passes
**Lock File Maintenance**: Weekly auto-merge

### Configuration Design Approach - FINAL
- **Base**: Extend `config:recommended` (current setup)
- **Automerge**: Enable with `platformAutomerge=true` for GitHub native merging
- **Grouping**: Group dev dependencies and related packages
- **Schedule**: Allow updates during off-hours to avoid CI conflicts
- **Safety**: Require all status checks to pass before merging

### Frictionless Requirements Identified
- **Auto-merge capability** for low-risk updates (patch versions, dev dependencies)
- **Grouped updates** to reduce PR noise
- **Semantic commit messages** (project uses conventional commits)
- **Respect CI/CD pipeline** and only merge when tests pass
- **Schedule optimization** to avoid overwhelming maintainers

### Detailed Frictionless Requirements
1. **Auto-merge Strategy**:
   - Patch updates for production dependencies (auto-merge when CI passes)
   - All dev dependency updates (auto-merge when CI passes)
   - Minor updates for well-maintained packages (with approval)

2. **Grouping Strategy**:
   - Group dev dependencies together
   - Group patch updates together
   - Separate major updates for individual review

3. **Scheduling**:
   - Non-office hours to avoid interrupting development
   - Limit concurrent PRs to avoid overwhelming CI

4. **Safety Measures**:
   - Require status checks (CI must pass)
   - Respect package.json constraints
   - Use semantic commit messages for changelog generation

### GitHub PR Configuration Options Available

Based on the comprehensive Renovate documentation, here are the key configuration options specifically for GitHub PRs:

**PR Creation & Timing:**
- `prCreation`: When to create PRs (`immediate`, `not-pending`, `status-success`, `approval`)
- `prConcurrentLimit`: Limit concurrent PRs (default: 10)
- `prHourlyLimit`: Rate limit PR creation per hour (default: 2)
- `prNotPendingHours`: Timeout for `prCreation=not-pending` (default: 25 hours)

**PR Content & Appearance:**
- `prTitle`: PR title template (inherits from `commitMessage`)
- `prTitleStrict`: Bypass appending extra context to PR title
- `prHeader`: Text at the beginning of PR body
- `prFooter`: Text at the end of PR body (default: Renovate Bot attribution)
- `prBodyTemplate`: Controls which sections appear in PR body
- `prBodyColumns`: Columns to include in PR tables
- `prBodyDefinitions`: Custom column definitions for PR tables
- `prBodyNotes`: Extra notes/templates in PR body

**PR Behavior:**
- `draftPR`: Create draft PRs instead of normal PRs
- `platformAutomerge`: Use GitHub's native auto-merge (default: true)
- `automerge`: Enable Renovate's automerge functionality
- `automergeType`: How to automerge (`pr`, `branch`, `pr-comment`)
- `automergeStrategy`: Merge strategy (`auto`, `squash`, `merge-commit`, `rebase`, etc.)
- `automergeSchedule`: Limit automerge to specific times

**PR Labels & Assignment:**
- `labels`: Labels to set on PRs
- `addLabels`: Additional labels (mergeable with existing)
- `assignees`: PR assignees
- `reviewers`: PR reviewers (supports `team:` prefix for GitHub teams)
- `assigneesFromCodeOwners`: Auto-assign based on CODEOWNERS
- `reviewersFromCodeOwners`: Auto-assign reviewers from CODEOWNERS
- `assignAutomerge`: Assign reviewers/assignees even for automerge PRs

**PR Lifecycle Management:**
- `rebaseLabel`: Label to trigger manual rebase (default: "rebase")
- `stopUpdatingLabel`: Label to stop Renovate updates (default: "stop-updating")
- `keepUpdatedLabel`: Label to keep PR updated with base branch
- `rebaseWhen`: When to rebase PRs (`auto`, `never`, `conflicted`, `behind-base-branch`)
- `recreateWhen`: When to recreate closed PRs (`auto`, `always`, `never`)

### Automerge Configuration Options

**Perfect! Here's the optimal "frictionless" automerge setup:**

#### Core Automerge Settings
```json
{
  "extends": ["config:recommended"],
  "platformAutomerge": true,
  "automerge": true,
  "automergeType": "pr",
  "automergeStrategy": "squash"
}
```

#### Selective Automerge by Update Type
```json
{
  "packageRules": [
    {
      "description": "Automerge patch updates and dev dependencies",
      "matchUpdateTypes": ["patch"],
      "matchDepTypes": ["devDependencies"],
      "automerge": true
    },
    {
      "description": "Automerge minor updates for trusted packages",
      "matchUpdateTypes": ["minor"],
      "matchPackageNames": ["@types/**", "eslint**", "prettier"],
      "automerge": true
    },
    {
      "description": "Manual review for major updates",
      "matchUpdateTypes": ["major"],
      "automerge": false
    }
  ]
}
```

#### Security & Lock File Maintenance
```json
{
  "vulnerabilityAlerts": {
    "automerge": true
  },
  "lockFileMaintenance": {
    "enabled": true,
    "automerge": true,
    "schedule": ["before 4am on monday"]
  }
}
```

#### Grouping to Reduce PR Noise
```json
{
  "packageRules": [
    {
      "description": "Group dev dependencies",
      "matchDepTypes": ["devDependencies"],
      "matchUpdateTypes": ["patch", "minor"],
      "groupName": "dev dependencies"
    },
    {
      "description": "Group TypeScript ecosystem",
      "matchPackageNames": ["typescript", "@types/**"],
      "groupName": "TypeScript"
    }
  ]
}
```

### CI Check Requirements for Automerge

**Important: The CI check condition is handled by GitHub + Renovate automatically:**

#### Default Behavior (Automatic)
- **Renovate default**: Only automerges when ALL status checks pass
- **GitHub branch protection**: Should be configured to require status checks
- **No explicit config needed** - this is built-in safety

#### Explicit Configuration (Recommended)
```json
{
  "automerge": true,
  "platformAutomerge": true,
  "ignoreTests": false,
  "prCreation": "not-pending"
}
```

#### GitHub Branch Protection Setup Required
You need to configure GitHub branch protection rules:
1. Go to Settings → Branches → Add rule for `main`
2. Enable "Require status checks to pass before merging"
3. Select your CI workflow (e.g., "Pull Request Validation")
4. Enable "Require branches to be up to date before merging"

#### Alternative: Explicit Status Check Names
```json
{
  "requiredStatusChecks": ["ci/github-actions"],
  "automerge": true
}
```

#### Safety Override (NOT recommended)
```json
{
  "ignoreTests": true,
  "automerge": true
}
```
**⚠️ This would automerge WITHOUT waiting for CI - dangerous!**

### Branch Protection Issue Analysis

**Problem Identified**: Release workflow fails because version bump commits don't trigger CI checks, but branch protection requires them.

#### Current Workflow Issues
1. **Version bump commit** uses `[skip ci]` - intentionally skips CI
2. **Branch protection** now requires 3 status checks to pass
3. **GitHub Actions token** can't bypass branch protection rules
4. **Chicken-and-egg problem**: Need CI to pass, but CI is skipped

#### Current vs Suggested GitHub App Approach

**Current Workflow (Failing)**:
```yaml
- name: Update package.json version
  run: |
    git commit -m "chore: bump version to $NEW_VERSION [skip ci]"
    git push  # Uses GITHUB_TOKEN - subject to branch protection
```

**Suggested GitHub App Approach**:
```yaml
- name: Generate GitHub App Token
  id: generate_token
  uses: tibdex/github-app-token@v1
  with:
    app_id: ${{ secrets.APP_ID }}
    private_key: ${{ secrets.PRIVATE_KEY }}

- name: Update package.json version  
  run: |
    git commit -m "chore: bump version to $NEW_VERSION [skip ci]"
    git push
  env:
    GITHUB_TOKEN: ${{ steps.generate_token.outputs.token }}
```

#### Key Differences
1. **GitHub App token** can bypass branch protection (if configured)
2. **App permissions** need "Contents: Write" and "Metadata: Read"
3. **Repository settings** must allow app to bypass protection
4. **Secrets needed**: `APP_ID` and `PRIVATE_KEY` for your created app

#### Alternative Solutions
1. **Remove [skip ci]** and let version bump trigger CI (cleaner)
2. **Use GitHub App** to bypass protection (your current approach)
3. **Exclude version bump commits** from branch protection rules
4. **Use semantic-release** which handles this automatically

## Notes
*Additional context and observations*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
