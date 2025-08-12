# Development Plan: responsible-vibe (kiro-inspiration branch)

*Generated on 2025-08-11 by Vibe Feature MCP*
*Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)*

## Goal
Enhance responsible-vibe-mcp to natively support long-term structured requirements and design documents, inspired by Kiro's approach to maintaining consistency across development phases.

## Explore
### Tasks
- [x] Document Kiro's spec-driven development approach
- [x] Analyze EARS-notation requirements format
- [x] Understand Kiro's design document structure
- [x] Explore task-specific conversation spawning concept
- [x] Analyze current responsible-vibe-mcp architecture
- [x] Identify integration touchpoints and opportunities
- [x] Evaluate potential challenges and constraints
- [x] Define project artifact structure and templates
- [x] Design artifact management system
- [x] Explore setup_project_docs tool concept
- [x] Define template formats and options
- [ ] Consider testing strategy externalization
- [ ] Design architecture document structure

### Completed
- [x] Created development plan file
- [x] Document Kiro's spec-driven development approach (initial understanding)
- [x] Analyze EARS-notation requirements format
- [x] Understand Kiro's design document structure
- [x] Explore task-specific conversation spawning concept
- [x] Identify key architectural challenge: workflow-agnostic artifacts
- [x] Define project artifact structure and templates
- [x] Design artifact management system
- [x] Evaluate potential challenges and constraints
- [x] Explore setup_project_docs tool concept
- [x] Define template formats and options
- [x] Consider testing strategy externalization
- [x] Finalize template refinements (architecture linking, requirements simplification)
- [x] Explore setup_project_docs tool concept
- [x] Define template formats and options

## Plan

### Phase Entrance Criteria:
- [x] Kiro's approach is thoroughly understood and documented
- [x] Current responsible-vibe-mcp architecture is analyzed
- [x] Integration opportunities and challenges are identified
- [x] Multiple integration options have been explored and evaluated

### Implementation Strategy

**Core Enhancement**: Add structured project artifacts to responsible-vibe-mcp with template-based creation and workflow integration.

**Refined Architecture:**
- **Document Location**: `.vibe/docs/` folder for all project artifacts
- **Separate Management**: Project docs independent of PlanManager (plan focuses on workflow)
- **Simplified Templates**: Start with 2 options per document type

**Key Components to Build:**
1. **setup_project_docs Tool**: Creates project artifacts with template selection
2. **Template System**: Manages simplified template set
3. **Workflow Integration**: Enhances workflow instructions with artifact references  
4. **ProjectDocsManager**: New component for artifact management (separate from PlanManager)

**Template Set:**
- **Architecture**: arc42, freestyle
- **Requirements**: ears, freestyle
- **Design**: comprehensive, freestyle

**File Structure:**
```
.vibe/
├── docs/
│   ├── architecture.md
│   ├── requirements.md
│   └── design.md
└── development-plan-{branch}.md
```

### Implementation Challenges & Solutions

**Challenge 1: Template Management**
- *Issue*: Managing multiple template formats and keeping them maintainable
- *Solution*: Use consistent template structure with instructional comments, version templates separately

**Challenge 2: Workflow Backward Compatibility**
- *Issue*: Existing workflows shouldn't break if artifacts don't exist
- *Solution*: Make artifact references optional, graceful degradation in instructions

**Challenge 3: File Path Resolution**
- *Issue*: Consistent artifact paths across different project structures
- *Solution*: Use .vibe/docs/ directory consistently, resolve paths relative to project root

**Challenge 4: Template Selection UX**
- *Issue*: Users need to understand template options without overwhelming choice
- *Solution*: Simplified template set (2 options each), opinionated defaults

### Dependencies & Integration Points

**Existing Components to Modify:**
- `start_development` handler: Add artifact detection and setup guidance
- Workflow YAML files: Add variable substitution
- Instruction generator: Handle variable substitution

**New Components to Create:**
- `ProjectDocsManager`: Separate artifact management (not PlanManager)
- `TemplateManager`: Template loading and rendering
- `setup_project_docs` tool handler: Tool implementation
- Template files: Simplified set (arc42/freestyle, ears/freestyle, comprehensive/freestyle)

### Success Criteria
- [ ] setup_project_docs tool creates properly formatted documents
- [ ] Workflow instructions correctly reference artifact files
- [ ] Existing workflows continue to work without artifacts
- [ ] Template comments guide LLM to create appropriate content
- [ ] Integration works seamlessly with start_development flow

### Completed
- [x] Design setup_project_docs tool interface and parameters
- [x] Create template system architecture and template definitions
- [x] Design workflow instruction enhancement mechanism
- [x] Plan artifact file management and path resolution
- [x] Define opinionated defaults and template options
- [x] Design error handling for missing/invalid templates
- [x] Plan integration with existing start_development flow
- [x] Identify implementation challenges and solutions
- [x] Define success criteria and integration points
- [x] Refine architecture based on user feedback (separate from PlanManager, .vibe/docs/, simplified templates)

### Completed
*None yet*

## Code

### Phase Entrance Criteria:
- [ ] Integration approach is clearly defined and documented
- [ ] Implementation strategy is broken down into specific tasks
- [ ] Technical architecture decisions are made
- [ ] User experience and API design are specified

### Implementation Tasks
- [x] Create simplified template files (arc42/freestyle, ears/freestyle, comprehensive/freestyle)
- [x] Implement TemplateManager class for loading and rendering templates
- [x] Create ProjectDocsManager class for artifact management (separate from PlanManager)
- [x] Add setup_project_docs tool to server tool handlers
- [x] Fix tool parameter issues (make all parameters mandatory, ensure enum options are exposed)
- [x] Move templates to resources directory (like workflows) for proper build inclusion
- [x] Update TemplateManager to use resource path resolution strategy
- [x] Add comprehensive unit tests for template system and artifact management
- [x] Implement workflow instruction variable substitution ($ARCHITECTURE_DOC, etc.)
- [x] Enhance start_development to detect missing artifacts and guide setup
- [x] Refactor to use centralized ProjectDocsManager.getVariableSubstitutions()
- [x] Make template discovery dynamic based on file system structure
- [x] Add artifact path resolution for .vibe/docs/ folder
- [x] Implement error handling for invalid template selections
- [x] Update workflow YAML files with artifact references
- [x] Test integration with existing workflows (epcc, waterfall, greenfield)

### Completed
- ✅ **Project Documentation Template System** - Complete end-to-end system for managing project artifacts
- ✅ **Dynamic Template Discovery** - File system-based template detection with zero maintenance
- ✅ **Workflow Document Integration** - All workflows now reference appropriate project documents
- ✅ **Intelligent Artifact Setup** - Smart guidance for missing documents based on workflow analysis
- ✅ **Comprehensive Testing** - Full test coverage and successful integration testing
- ✅ **Documentation and Release** - Updated README, created CHANGELOG, and committed all changes

## Commit

### Phase Entrance Criteria:
- [x] Core integration functionality is implemented and tested
- [x] Documentation is updated to reflect new capabilities
- [x] Integration works with existing workflows
- [x] Code quality standards are met

### Tasks
- [x] Run final test suite to ensure no regressions
- [x] Update README.md with new project documentation features
- [x] Update CHANGELOG.md with feature additions
- [x] Verify all new files are properly included in build
- [x] Clean up any temporary or debug code
- [x] Prepare conventional commit message
- [x] Create final commit with all changes
- [x] Investigate test regression - conversation mocking appears broken
- [x] Fix test setup issues to restore test functionality (added mock project documents)
- [x] Fix remaining 4 failing tests in start-development-artifact-detection.test.ts (added templateManager mock)
- [x] Verify all tests pass after fixes (205/205 tests passing! 🎉)
- [x] Refactor test code to eliminate repetition and make it DRY

### Completed
*None yet*

## Key Decisions

### Architectural Decision: **Project-Level Artifacts with Opinionated Structure**
- **Requirements and Design are project artifacts** (not workflow-specific)
- **Structure is project-defined and consistent** (e.g., EARS format for requirements)
- **Created once with opinionated format, maintained consistently**
- **All workflows work with same structured artifacts**

### Implementation Decisions:
1. **Creation Timing**: Create artifacts on `start_development()` if they don't exist
2. **Workflow Integration**: Embed file paths directly in workflow instructions 
   - Example: "note requirements in $REQUIREMENTS_DOC" in explore phase
   - Example: "Respect the design from $DESIGN_DOC" in code phase
3. **Numbering**: Let LLM handle requirement numbering, provide template instructions
4. **Cross-References**: No bidirectional references needed between artifacts

### Enhanced Concept: **setup_project_docs Tool**
- **Template Selection**: Choose formats for different document types
- **Example**: `setup_project_docs(architecture: arc42, requirements: ears, design: freestyle)`
- **Three Document Types**:
  - **Architecture**: High-level structure, context, boundaries (arc42, c4model, freestyle)
  - **Requirements**: User needs and acceptance criteria (ears, user-stories, freestyle)  
  - **Design**: Technical implementation details (structured, freestyle)
- **Template Examples**: Add concrete examples in document comments

### Final Implementation Decisions:
1. **Opinionated Defaults**: Provide sensible defaults (likely arc42 + ears + comprehensive)

### Dynamic Workflow Analysis Approach
**Decision**: Instead of hardcoding which workflows require artifacts, dynamically analyze workflow content to detect document variable references (`$ARCHITECTURE_DOC`, `$REQUIREMENTS_DOC`, `$DESIGN_DOC`).

**Rationale**: 
- More flexible and accurate than hardcoded workflow restrictions
- Automatically adapts to workflow changes without code updates
- Only validates documents that are actually referenced
- Supports custom workflows without modification

**Implementation**: 
- Load workflow and convert to string for analysis
- Get available document variables from `ProjectDocsManager.getVariableSubstitutions()`
- Search for document variables using string matching
- Derive variable-to-document mapping from centralized substitutions
- Validate only referenced documents exist
- Provide targeted guidance for missing referenced documents

### Dynamic Template Discovery
**Decision**: Replace hardcoded template names with dynamic file system discovery.

**Rationale**:
- Eliminates maintenance burden of updating code when templates are added/removed
- Templates are discovered automatically from file structure
- Supports extensibility without code changes
- Single source of truth: the file system itself

**Implementation**:
- `TemplateManager.getAvailableTemplates()` scans template directories
- Server configuration uses dynamic enums based on discovered templates
- Template validation uses discovered templates instead of hardcoded lists
- Template descriptions generated dynamically with fallbacks for unknown templates

### Workflow Document Integration
**Decision**: Strategically inject document variable references into workflow default instructions.

**Rationale**:
- Provides contextual guidance referencing relevant project documents
- Makes workflows document-aware without breaking existing functionality
- Enables intelligent artifact setup guidance based on workflow analysis

**Implementation**:
- **waterfall**: All documents referenced in requirements, design, implementation, qa phases
- **greenfield**: All documents referenced in ideation, architecture, plan, code phases  
- **epcc**: All documents referenced in explore, plan, code phases
- **minor**: Requirements and design documents in explore, implement phases
- **bugfix**: Requirements and design documents in reproduce, analyze, fix phases
- Dynamic workflow analysis detects document references automatically
- `start_development` provides targeted setup guidance for missing referenced documents
2. **No Template Switching**: Users edit files manually after creation, no tool support
3. **Integrated Flow**: start_development instructs LLM to use docs, calls setup_project_docs if missing
4. **Testing Strategy**: Embedded in design document with instructional comments
5. **Testing Focus**: Guide LLM to document testing concepts/strategy, not actual test cases
6. **Architecture Separation**: Design document links to ./ARCHITECTURE.md rather than repeating content
7. **Requirements Simplification**: No task references in requirements, focus on user needs

### Benefits:
- **Consistency**: Same format across all workflows
- **Simplicity**: No complex state management or whats_next modifications
- **Traceability**: Tasks can reference requirements consistently
- **Persistence**: Artifacts survive workflow changes
- **Workflow Integration**: Natural integration through instruction templating

## Notes

## Notes

### User Testing Feedback:
- **MCP Inspector Testing**: User tested setup_project_docs tool and identified issues:
  - Template options were not pre-filled in metadata (fixed by making enums explicit)
  - Parameters should be mandatory rather than optional (fixed by removing .optional())
  - Templates not found in dist directory (fixed by moving to resources/ like workflows)
- **Tool now properly exposes**: arc42/freestyle, ears/freestyle, comprehensive/freestyle options
- **All parameters are required**: architecture, requirements, design must all be specified
- **Templates are resources**: Moved from src/templates to resources/templates for proper build inclusion
- **Resource path resolution**: Uses same strategy as WorkflowManager for finding templates

### Current responsible-vibe-mcp Architecture:
- **Workflow/Phase-driven**: Structured development phases with state transitions
- **Plan File**: Markdown-based long-term memory with tasks, decisions, and notes
- **Conversation State**: Tracks current phase and provides contextual instructions
- **Tool-based Coordination**: LLM calls tools to get guidance and transition phases

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
