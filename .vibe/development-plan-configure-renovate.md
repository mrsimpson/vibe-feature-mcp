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

### Completed
- [x] Created development plan file
- [x] Analyzed project: Node.js/TypeScript project with npm, has basic renovate.json with config:recommended
- [x] Found existing CI/CD: GitHub Actions with PR validation (Node 18, 20, latest) and automated tests
- [x] Researched best practices for frictionless dependency management
- [x] Defined comprehensive requirements for automated updates
- [x] Designed configuration approach with auto-merge and grouping strategies

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

**GitHub-Specific Features:**
- `milestone`: GitHub milestone number to assign to PRs
- `platformCommit`: Use GitHub API for commits (GitHub App only)
- `forkModeDisallowMaintainerEdits`: Disallow maintainer edits in fork mode

**Security & Vulnerability PRs:**
- `vulnerabilityAlerts`: Special config for security PRs
- `osvVulnerabilityAlerts`: Use OSV.dev vulnerability database

**Branch Management:**
- `branchPrefix`: Prefix for branch names (default: "renovate/")
- `branchConcurrentLimit`: Limit concurrent branches
- `pruneStaleBranches`: Auto-delete stale branches (default: true)
- `pruneBranchAfterAutomerge`: Delete branch after automerge (default: true)

## Notes
*Additional context and observations*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
