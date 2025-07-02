# Development Plan: responsible-vibe (workflows-overview branch)

*Generated on 2025-07-02 by Vibe Feature MCP*
*Workflow: epcc*

## Goal
Add a new MCP tool called `list_workflows` that provides clients with an overview of all available workflows, including their descriptions, phases, and usage guidance.

## Explore
### Phase Entrance Criteria:
- [x] Initial exploration phase (no entrance criteria)

### Tasks
- [x] Examine current codebase structure and understand MCP tool architecture
- [x] Analyze WorkflowManager class and how workflows are currently loaded
- [x] Review existing tool handlers to understand implementation patterns
- [x] Identify where workflows are defined (resources/workflows directory)
- [x] Understand workflow structure and metadata available
- [x] Determine the best approach for exposing workflow information to clients
- [x] Consider what information would be most useful for clients
- [x] Clarify user requirements for workflow overview feature
- [x] Define specific information to include in the response
- [x] Determine response format and structure

### Completed
- [x] Created development plan file
- [x] Explored src/server/tool-handlers directory structure
- [x] Analyzed WorkflowManager.ts and found getAvailableWorkflows() method
- [x] Reviewed server-config.ts to understand tool registration process
- [x] Examined workflow YAML files in resources/workflows directory
- [x] Identified WorkflowInfo interface with name, displayName, description, initialState, phases

## Plan
### Phase Entrance Criteria:
- [x] Current codebase structure is thoroughly understood
- [x] Available workflow information and access patterns are documented
- [x] Best approach for implementing the feature is identified
- [x] User requirements and expectations are clear

### Tasks
- [x] Design the `list_workflows` tool interface and response format
- [x] Plan WorkflowManager enhancement for custom workflow visibility logic
- [x] Design MCP resource structure for individual workflows (`workflow://[name]`)
- [x] Plan resource handler implementation for workflow YAML content
- [x] Design integration points with existing server-config.ts
- [x] Consider error handling for missing workflows or invalid resources
- [x] Plan testing approach for new tool and resources
- [x] Get user approval for implementation plan

### Completed
*None yet*

## Code
### Phase Entrance Criteria:
- [x] Implementation plan is complete and approved
- [x] Technical approach is clearly defined
- [x] All dependencies and integration points are identified

### Tasks
- [x] Enhance WorkflowManager with `getAvailableWorkflowsForProject()` method
- [x] Create `list-workflows.ts` tool handler
- [x] Create `workflow-resource.ts` resource handler
- [x] Update index files for proper exports
- [x] Update server-config.ts to register new tool and resources
- [x] Fix resource registration issue - implement resource templates instead of individual resources
- [x] Add support for resources/templates/list endpoint
- [x] Test the implementation manually
- [x] Run existing tests to ensure no regressions

### Completed
- [x] Enhanced WorkflowManager with `getAvailableWorkflowsForProject()` method
- [x] Created `list-workflows.ts` tool handler
- [x] Created `workflow-resource.ts` resource handler
- [x] Updated index files for proper exports
- [x] Updated server-config.ts to register new tool and resources
- [x] Fixed resource registration issue - implemented resource templates instead of individual resources
- [x] Added support for resources/templates/list endpoint
- [x] Tested the implementation manually
- [x] Run existing tests to ensure no regressions - ALL 101 TESTS PASSING ✅

## Commit
### Phase Entrance Criteria:
- [x] Core implementation is complete and functional
- [x] Code follows project standards and patterns
- [x] Basic testing has been performed

### Tasks
- [x] Review code quality and ensure it follows project patterns
- [x] Verify all tests pass (101/101 tests passing ✅)
- [x] Update documentation if needed
- [x] Commit changes with conventional commit message
- [x] Verify the feature works as expected

### Completed
- [x] Review code quality and ensure it follows project patterns
- [x] Verify all tests pass (101/101 tests passing ✅)
- [x] Update documentation if needed
- [x] Commit changes with conventional commit message
- [x] Verify the feature works as expected - FEATURE WORKING PERFECTLY ✅

## Key Decisions
- **Feature Scope**: Add a `list_workflows` tool that exposes workflow metadata to MCP clients
- **Data Source**: Use existing WorkflowManager.getAvailableWorkflows() method which provides WorkflowInfo objects
- **Information to Expose**: Workflow name, display name, description, initial state, and available phases
- **User Requirements**: Tool should return names + descriptions and point to MCP resources
- **Resource Implementation**: Create MCP resource templates with static content from YAML files
- **Resource URI Pattern**: Use `workflow://[workflow-name]` for individual workflow resources
- **Custom Workflow Visibility**: "custom" workflow should only be visible when `.vibe/workflow.yaml` or `.vibe/workflow.yml` exists

## Notes
- WorkflowManager already has the infrastructure to provide workflow information
- Current workflows: waterfall, epcc, bugfix, minor, greenfield (plus custom support)
- Each workflow has rich metadata including descriptions and phase information
- Tool registration follows consistent patterns in server-config.ts
- **Implementation Plan Created**: Detailed plan for list_workflows tool, WorkflowManager enhancement, MCP resources, and integration points
- **Custom Workflow Logic**: Need to filter custom workflow based on file existence in project
- **Testing Strategy**: Unit tests for WorkflowManager filtering, integration tests for tool/resource handlers, MCP contract tests
- **IMPLEMENTATION COMPLETE**: Successfully implemented proper MCP resource templates using ResourceTemplate class with workflow://{name} URI pattern, list callback for available workflows, and completion support for workflow names

### Detailed Implementation Plan

#### 1. WorkflowManager Enhancement
- Add `getAvailableWorkflowsForProject(projectPath: string)` method
- Filter out "custom" workflow when `.vibe/workflow.y*ml` doesn't exist
- Maintain backward compatibility with existing `getAvailableWorkflows()`

#### 2. list_workflows Tool
- No input parameters required
- Returns array of workflows with name, displayName, description, resourceUri
- Points to `workflow://[name]` resources for detailed content

#### 3. MCP Resources
- URI pattern: `workflow://[workflow-name]`
- Returns raw YAML content from resources/workflows/ directory
- Handles custom workflows from `.vibe/workflow.yaml`
- Proper error handling for missing workflows

#### 4. Integration Points
- New tool handler: `src/server/tool-handlers/list-workflows.ts`
- New resource handler: `src/server/resource-handlers/workflow-resource.ts`
- Update server-config.ts for tool and resource registration
- Update index files for proper exports
- **Implementation Plan Created**: Detailed plan for list_workflows tool, WorkflowManager enhancement, MCP resources, and integration points
- **Custom Workflow Logic**: Need to filter custom workflow based on file existence in project

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
