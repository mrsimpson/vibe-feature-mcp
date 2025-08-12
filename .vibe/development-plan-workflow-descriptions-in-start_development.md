# Development Plan: responsible-vibe (workflow-descriptions-in-start_development branch)

*Generated on 2025-08-12 by Vibe Feature MCP*
*Workflow: [minor](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/minor)*

## Goal
Enhance the discoverability of available workflow templates to make it easier for the LLM to start development with the best workflow for the task at hand.

## Explore
### Tasks
- [x] Analyze current workflow selection mechanism in start_development tool
- [x] Examine workflow manager and how workflows are loaded and presented
- [x] Review available workflow files and their structure
- [x] Identify the current workflow description generation process
- [x] Identify specific discoverability issues and improvement opportunities
- [x] Design solution approach for enhanced workflow discoverability
- [x] Document requirements in requirements.md
- [x] Define scope and implementation approach

### Completed
- [x] Created development plan file
- [x] Analyzed start_development handler implementation
- [x] Examined workflow manager and workflow loading mechanism
- [x] Reviewed workflow YAML files structure (waterfall, epcc, minor, etc.)
- [x] Found current workflow description generation in server-helpers.ts
- [x] Documented 4 requirements for enhanced workflow discoverability
- [x] Designed solution approach focusing on generateWorkflowDescription enhancement

## Implement

### Phase Entrance Criteria:
- [x] The current workflow selection mechanism has been analyzed
- [x] The problem with workflow discoverability has been clearly identified
- [x] A solution approach has been designed and documented
- [x] The scope of changes has been defined (minor enhancement)
- [x] Implementation approach is clear and feasible

### Tasks
- [x] Extend WorkflowInfo interface to include metadata fields (_Requirements: REQ-1, REQ-3_)
- [x] Add optional metadata to workflow YAML files (_Requirements: REQ-1, REQ-2, REQ-3_)
- [x] Enhance WorkflowManager to parse metadata from YAML files (_Requirements: REQ-3_)
- [x] Improve generateWorkflowDescription() function with richer descriptions (_Requirements: REQ-1, REQ-2_)
- [x] Test enhanced workflow descriptions (_Requirements: REQ-4_)
- [x] Verify backward compatibility (_Requirements: REQ-4_)
- [ ] Update any relevant documentation

### Completed
- [x] Extended WorkflowInfo interface with optional metadata fields
- [x] Added metadata to YamlStateMachine interface for type safety
- [x] Enhanced all 7 workflow YAML files with comprehensive metadata
- [x] Updated WorkflowManager to include metadata in WorkflowInfo objects
- [x] Completely rewrote generateWorkflowDescription() function with rich formatting
- [x] Verified all tests pass (221/221 tests passing)
- [x] Tested enhanced descriptions with manual verification script
- [x] Confirmed backward compatibility maintained

### Completed
*None yet*

## Key Decisions

### Current Workflow Selection Analysis
- **Current mechanism**: Workflows are presented as enum options in start_development tool with basic descriptions
- **Description generation**: `generateWorkflowDescription()` in server-helpers.ts creates simple bullet-point list
- **Available workflows**: 7 predefined workflows (waterfall, epcc, minor, bugfix, greenfield, slides, posts) + custom
- **Information provided**: Only name and brief description (e.g., "waterfall - From Specification down to test – the historical way")
- **Discoverability issues identified**:
  1. Limited context about when to use each workflow
  2. No guidance on workflow suitability for different task types
  3. No examples or use cases provided
  4. No information about workflow phases or complexity
  5. LLM has to guess which workflow fits the user's needs best

### Enhancement Opportunities
- Add more detailed workflow descriptions with use cases
- Include workflow complexity indicators (phases, duration estimates)
- Provide task-type recommendations (e.g., "best for bug fixes", "ideal for new features")
- Add examples of when to use each workflow

### Solution Approach (Minor Enhancement)
**Target**: Enhance `generateWorkflowDescription()` function in `server-helpers.ts`
**Scope**: 
1. **Extend WorkflowInfo interface** to include metadata (use cases, complexity, task types)
2. **Enhance workflow YAML files** with additional metadata fields (optional, backward compatible)
3. **Improve generateWorkflowDescription()** to create richer, more informative descriptions
4. **Maintain backward compatibility** - no breaking changes to existing tool schema

**Implementation Strategy**:
- Add optional metadata fields to workflow YAML files
- Extend WorkflowManager to parse and provide metadata
- Enhance description generation with use cases, complexity indicators, and task-type guidance
- Keep changes minimal and focused (minor enhancement scope)

### Implementation Results
**Successfully Enhanced**:
- **WorkflowInfo interface**: Added optional metadata with complexity, duration, bestFor, useCases, examples
- **YamlStateMachine interface**: Added metadata field for type safety
- **All 7 workflow YAML files**: Enhanced with comprehensive metadata including:
  - Complexity levels (low/medium/high)
  - Estimated durations (1-2 hours to 2-5 days)
  - Task type recommendations (bug fixes, new features, etc.)
  - Specific use cases and examples
- **generateWorkflowDescription() function**: Completely rewritten to provide rich, formatted descriptions
- **Backward compatibility**: Maintained - all existing functionality preserved
- **Testing**: All 221 tests pass, manual verification confirms enhanced descriptions work correctly

**Impact**: LLMs now receive detailed workflow information including complexity, duration, use cases, and examples, enabling much better workflow selection recommendations.

## Notes
*Additional context and observations*

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
