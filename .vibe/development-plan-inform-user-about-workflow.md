# Development Plan: responsible-vibe (inform-user-about-workflow branch)

*Generated on 2025-07-28 by Vibe Feature MCP*
*Workflow: minor*

## Goal
Add a feature to inform users about workflow documentation URLs after they choose a development workflow. All workflows are published at https://mrsimpson.github.io/responsible-vibe-mcp/workflows/<name>

## Explore
### Tasks
- [x] Analyze current workflow selection implementation
- [x] Identify where workflow information should be displayed
- [x] Design the user information mechanism
- [x] Determine the best approach for URL generation

### Completed
- [x] Created development plan file

## Implement

### Phase Entrance Criteria:
- [x] The current workflow selection implementation has been analyzed
- [x] The location for displaying workflow information has been identified
- [x] The approach for informing users about documentation URLs has been designed
- [x] The URL generation pattern is clearly defined

### Tasks
- [x] Modify StartDevelopmentResult interface to include workflow documentation URL
- [x] Update start-development.ts to generate and include documentation URL
- [x] Handle custom workflows appropriately (no URL for custom workflows)
- [x] Update instructions to inform user about documentation URL
- [x] Test the implementation with different workflows
- [x] Run existing tests to ensure no regressions

### Completed
- [x] Successfully implemented workflow documentation URL feature
- [x] Manual testing confirmed functionality works correctly
- [x] All existing tests pass (154/154)
- [x] Feature ready for commit

## Key Decisions
1. **Location**: Add workflow documentation URL information to the `start_development` tool response
2. **Approach**: Modify the `StartDevelopmentResult` interface to include workflow documentation URL
3. **URL Generation**: Use pattern `https://mrsimpson.github.io/responsible-vibe-mcp/workflows/<workflow-name>`
4. **Display**: Include the URL in the instructions returned to the user after workflow selection
5. **Custom Workflows**: For custom workflows, don't include documentation URL since they're project-specific

## Notes
- Current workflow selection happens in `src/server/tool-handlers/start-development.ts`
- The `StartDevelopmentResult` interface already includes workflow information
- The response includes instructions that are displayed to the user
- Workflow names are available from the `selectedWorkflow` variable
- Need to handle both predefined workflows and custom workflows appropriately

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
