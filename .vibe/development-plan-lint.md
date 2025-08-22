# Development Plan: responsible-vibe (lint branch)

*Generated on 2025-08-21 by Vibe Feature MCP*
*Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)*

## Goal
Add comprehensive code quality tooling to the responsible-vibe-mcp project including oxlint for linting, Prettier for formatting, EditorConfig for consistent development environment, and husky for pre-commit automation

## Explore
### Tasks
- [x] Examine current project structure and package.json
- [x] Check for existing linting setup (ESLint, TSLint, etc.)
- [x] Research oxlint installation and configuration options
- [x] Analyze TypeScript/JavaScript files that need linting
- [x] Investigate integration with existing build scripts and CI/CD
- [x] Document current code quality tools and processes

### Completed
- [x] Created development plan file
- [x] Examined current project structure and package.json
- [x] Confirmed no existing linting setup (ESLint, TSLint, etc.)
- [x] Researched oxlint capabilities and configuration options
- [x] Analyzed TypeScript/JavaScript files that need linting
- [x] Investigated integration with existing build scripts and CI/CD
- [x] Installed oxlint, prettier, husky, and lint-staged as dev dependencies
- [x] Created .oxlintrc.json configuration file with TypeScript and unicorn rules
- [x] Created .prettierrc.json configuration file with TypeScript-friendly settings
- [x] Created .prettierignore file to exclude generated files and dependencies
- [x] Created .editorconfig file for consistent editor behavior
- [x] Added lint, lint:fix, format, and format:check scripts to package.json
- [x] Configured husky pre-commit hooks with lint-staged integration
- [x] Set up lint-staged configuration for both formatting and linting
- [x] Updated CI/CD workflow to include separate linting and formatting jobs
- [x] Ran initial format and lint check - formatted 100+ files, identified 415 warnings and 124 errors
- [x] Tested pre-commit hook functionality - successfully catches syntax errors and runs format + lint
- [x] Tested integration with build process - TypeScript compilation works correctly
- [x] Validated that all existing tests pass (243 tests passed)

## Plan

### Phase Entrance Criteria:
- [x] Current project structure and existing linting setup (if any) has been analyzed
- [x] Oxlint capabilities and configuration options have been researched
- [x] Integration requirements with existing build tools have been identified
- [x] Scope of linting rules and configuration has been defined

### Tasks
- [x] Define oxlint installation approach (dev dependency vs npx)
- [x] Design .oxlintrc.json configuration file structure
- [x] Plan package.json script integration
- [x] Design CI/CD workflow integration strategy
- [x] Plan workflow-visualizer subdirectory handling
- [x] Define linting rules and severity levels
- [x] Plan documentation updates
- [x] Consider integration with existing development workflow
- [x] Plan testing strategy for linting setup
- [x] Plan husky integration for pre-commit linting
- [x] Design pre-commit hook strategy
- [x] Plan Prettier integration for code formatting
- [x] Design EditorConfig for consistent development environment
- [x] Plan integration between oxlint and Prettier (avoid conflicts)
- [x] Design pre-commit strategy for both linting and formatting

### Completed
*None yet*

## Code

### Phase Entrance Criteria:
- [x] Implementation plan has been thoroughly defined and reviewed
- [x] Oxlint installation and configuration approach has been decided
- [x] Integration with existing scripts and CI/CD has been planned
- [x] Linting rules and configuration files have been designed

### Tasks
- [x] Install oxlint, prettier, husky, and lint-staged as dev dependencies
- [x] Create .oxlintrc.json configuration file
- [x] Create .prettierrc.json configuration file
- [x] Create .prettierignore file
- [x] Create .editorconfig file
- [x] Add lint, lint:fix, format, and format:check scripts to package.json
- [x] Configure husky pre-commit hooks
- [x] Set up lint-staged configuration for both formatting and linting
- [x] Update CI/CD workflow to include linting and formatting steps
- [x] Run initial format and lint check, fix critical issues
- [x] Test pre-commit hook functionality (format + lint)
- [x] Test integration with build process
- [x] Validate CI pipeline with complete tooling enabled
- [x] Implement aggressive auto-fixing strategy for remaining 337 warnings + 1 error
- [x] Create automated scripts for bulk linting fixes
- [x] Apply fixes in batches and test after each batch
- [x] Fix unused catch parameters (5 warnings fixed)
- [x] Fix unused function parameters (5 warnings fixed)
- [x] Fix Record<string, any> types (3 warnings fixed)
- [x] Comment out unused functions (2 warnings fixed)
- [x] Add proper types to resume-workflow.ts (10 warnings fixed: 320→310)
- [x] Fix generic types and interaction logger (5 warnings fixed: 310→305)
- [x] Fix catch blocks and forEach loops (5 warnings fixed: 305→300)
- [x] Continue with forEach → for...of loop conversions
- [x] Address remaining no-explicit-any issues selectively
- [x] Handle non-null assertion operators carefully
- [x] **COMPLETED: Aggressive lint fixing achieved 339→28 warnings (-311 warnings, 92% reduction)**

### Completed
*None yet*

## Commit

### Phase Entrance Criteria:
- [ ] Oxlint has been successfully installed and configured
- [ ] Linting rules are working correctly on the codebase
- [ ] Integration with package.json scripts is complete
- [ ] All existing tests pass with the new linting setup
- [ ] Documentation has been updated to reflect linting setup

### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Key Decisions
- **Comprehensive Tooling**: Oxlint (linting) + Prettier (formatting) + EditorConfig (editor consistency) + Husky (automation)
- **Linter Choice**: Oxlint selected for its blazing fast performance (50-100x faster than ESLint)
- **Formatter Choice**: Prettier for consistent code formatting across the team
- **Installation Method**: Install all tools as dev dependencies for consistent versioning
- **Pre-commit Integration**: Use husky + lint-staged for automated pre-commit formatting and linting
- **Tool Order**: Run prettier --write first, then oxlint --fix in pre-commit hooks
- **Configuration**: Separate config files (.oxlintrc.json, .prettierrc.json, .editorconfig)
- **Target Files**: Include both main src/ and workflow-visualizer/src/ TypeScript files
- **Rule Strategy**: Configure oxlint to not conflict with prettier formatting rules
- **Severity Approach**: Use "warn" for most rules, "error" for critical issues
- **CI Integration**: Add both formatting check and linting to GitHub Actions
- **Script Integration**: Add lint, lint:fix, format, format:check scripts to package.json
- **Pre-commit Strategy**: Run format + lint on staged files only for performance
- **Documentation**: Update README and contributing guidelines with complete tooling info
- **Initial Linting Results**: Found 415 warnings and 124 errors in existing codebase - expected for legacy code
- **Vitest Plugin**: Removed vitest plugin from oxlint config due to compatibility issues, focusing on core TypeScript and unicorn rules
- **Linter Choice**: Oxlint selected for its blazing fast performance (50-100x faster than ESLint)
- **Installation Method**: Install oxlint as dev dependency for consistent versioning
- **Configuration**: Single .oxlintrc.json at project root for unified configuration
- **Target Files**: Include both main src/ and workflow-visualizer/src/ TypeScript files
- **Rule Strategy**: Start with essential TypeScript, unicorn, and jest rules
- **Severity Approach**: Use "warn" for most rules, "error" for critical issues
- **CI Integration**: Add linting step to GitHub Actions before build for fast feedback
- **Script Integration**: Add lint and lint:fix scripts to package.json
- **Documentation**: Update README and contributing guidelines with linting info
- **Editor Config**: Ensure linting rules align with existing code style
- **Contributing Guidelines**: Document linting requirements for contributors
- **Development Workflow**: Update development section to mention linting step
- **CI Badge**: Consider adding linting status badge to README
- **Severity Strategy**: Start with "warn" for most rules, "error" for critical issues
- **TypeScript Focus**: Emphasize TypeScript-specific rules for type safety
- **Code Quality**: Include rules for unused variables, unreachable code, and best practices
- **Gradual Adoption**: Start with essential rules, expand over time
- **Path Patterns**: Include both src/**/*.ts and workflow-visualizer/src/**/*.ts in configuration
- **Consistent Rules**: Apply same linting rules to both codebases for consistency
- **Build Integration**: Ensure workflow-visualizer build process respects linting
- **Fast Feedback**: Run oxlint early in CI pipeline for quick failure detection
- **Matrix Strategy**: Run linting once (not per Node.js version) to avoid redundancy
- **Failure Handling**: Use --deny-warnings flag to fail CI on any linting issues
- **Lint Fix Script**: Add "lint:fix" script for auto-fixing: `oxlint --fix`
- **Integration**: Add linting to existing "build:ci" script to catch issues early
- **Pre-commit**: Consider adding to development workflow but not enforce initially
- **Target Files**: Include src/**/*.{ts,js,mts,cts} and workflow-visualizer/src/**/*.{ts,js}
- **Exclusions**: Exclude dist/, node_modules/, .vibe/, test fixtures, and generated files
- **Rule Categories**: Enable typescript, unicorn, and jest rules appropriate for the project
- **Severity**: Use "error" for critical issues, "warn" for style/best practices
- **Package Manager**: Use npm (consistent with existing package-lock.json)
- **Version Pinning**: Pin to specific version to avoid CI failures on new releases
- **Project Structure**: Main TypeScript source in `src/` directory with 25+ files, plus workflow-visualizer subdirectory
- **No Existing Linting**: Clean slate - no existing ESLint or other linting configuration to migrate from
- **CI Integration**: Existing GitHub Actions workflow in `.github/workflows/pr.yml` that can be extended

## Notes
**Project Analysis:**
- TypeScript project with ES2022 target and ESNext modules
- Main source code in `src/` with 25+ TypeScript files including server, handlers, managers
- Workflow-visualizer subdirectory with its own TypeScript setup
- Uses Vitest for testing, conventional commits for versioning
- GitHub Actions CI/CD with Node.js 18, 20, and latest testing

**Oxlint Research:**
- 50-100x faster than ESLint, scales with CPU cores
- 520+ rules from eslint, typescript, react, jest, unicorn, jsx-a11y
- Supports .oxlintrc.json configuration, nested configs, comment disabling
- Supports JS/TS extensions: js, mjs, cjs, jsx, ts, mts, cts, tsx
- No type-aware rules or stylistic rules (which is fine for this project)
**Prettier Integration Planning:**
- Install prettier as dev dependency for consistent code formatting
- Create .prettierrc.json with TypeScript-friendly configuration
- Add .prettierignore to exclude dist/, node_modules/, generated files
- Configure prettier to work with existing TypeScript setup
- Add format and format:check scripts to package.json
- Ensure no conflicts between oxlint and prettier rules

**EditorConfig Planning:**
- Create .editorconfig file for consistent editor behavior
- Configure indent style, charset, line endings for cross-platform consistency
- Set specific rules for TypeScript, JSON, YAML, and Markdown files
- Ensure compatibility with existing development tools

**Tool Integration Strategy:**
- Run prettier before oxlint in pre-commit hooks (format first, then lint)
- Configure oxlint to not conflict with prettier formatting rules
- Use lint-staged to run both prettier --write and oxlint --fix on staged files
- Add both formatting and linting to CI pipeline

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
