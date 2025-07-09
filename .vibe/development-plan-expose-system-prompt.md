# Development Plan: responsible-vibe (expose-system-prompt branch)

*Generated on 2025-07-03 by Vibe Feature MCP*
*Workflow: minor*

## Goal
Make it easier for developers using `npx responsible-vibe-mcp` to access the proper system prompt for LLM integration, both via CLI flags and as an MCP resource for programmatic access.

## Explore
### Phase Entrance Criteria
*This is the initial phase - no entrance criteria needed*

### Tasks
*All exploration and implementation tasks completed!*

### Completed
- [x] Created development plan file
- [x] Analyze current system prompt accessibility methods
- [x] Identify the problem with npx usage vs local repository
- [x] Research CLI argument patterns for exposing help/documentation
- [x] Design solution approaches for making system prompt accessible via npx
- [x] Evaluate pros/cons of different approaches
- [x] Choose the best approach for implementation

## Implement
### Phase Entrance Criteria
- [x] The problem has been thoroughly analyzed
- [x] Current system prompt accessibility methods are documented
- [x] Solution approach has been designed and chosen
- [x] Implementation plan is clear

### Tasks
*All implementation tasks completed!*

### Completed
- [x] Add CLI argument parsing to main entry point (src/index.ts)
- [x] Implement --help flag with usage information
- [x] Implement --system-prompt flag to output system prompt
- [x] Implement --version flag to show version
- [x] Test the new CLI flags work correctly
- [x] Ensure MCP server still works normally without flags
- [x] Update README.md with new CLI usage examples
- [x] Test with npx to ensure it works for end users
- [x] Design MCP resource for system prompt exposure
- [x] Analyze existing resource handlers to understand the pattern
- [x] Plan resource URI scheme and metadata
- [x] Design resource content format and structure
- [x] Implement SystemPromptResourceHandler
- [x] Register resource with MCP server in server-config.ts
- [x] Test resource discovery and access through MCP protocol
- [x] Verify resource appears in resources/list response
- [x] Verify resource content is accessible via resources/read

## Key Decisions
**Chosen Approach**: Hybrid Approach - CLI Args with Graceful Handling

**Rationale**: 
- Single entry point maintains simplicity
- Follows standard CLI patterns (`--help`, `--system-prompt`)
- Discoverable through `--help` flag
- Doesn't interfere with normal MCP server operation
- Provides the best user experience

**Implementation Plan**:
1. Add argument parsing before MCP server initialization
2. Handle `--help`, `--system-prompt`, `--version` flags
3. Output appropriate information and exit gracefully
4. Only start MCP server if no special flags are provided

**Alternative Approaches Considered**:
- CLI Flag: Would conflict with MCP stdio transport
- Separate Command: Too complex for this minor enhancement
- Environment Variable: Not discoverable enough

## Notes
**Implementation Summary:**
- Successfully added CLI argument parsing to src/index.ts
- Implemented three new CLI flags: --help, --version, --system-prompt
- All flags work correctly with npx responsible-vibe-mcp
- MCP server functionality remains unchanged when no flags are provided
- All existing tests continue to pass (123/123)
- README.md updated with new usage examples
- Feature ready for delivery

**Testing Results:**
- `npx responsible-vibe-mcp --help` - ✅ Shows comprehensive help
- `npx responsible-vibe-mcp --version` - ✅ Shows version from package.json
- `npx responsible-vibe-mcp --system-prompt` - ✅ Outputs complete system prompt
- `npx responsible-vibe-mcp` (no flags) - ✅ Starts MCP server normally
- All unit and integration tests pass - ✅

**MCP Resource Implementation:**
- Created SystemPromptResourceHandler in src/server/resource-handlers/system-prompt.ts
- Registered resource with URI pattern `system-prompt://` (workflow-independent)
- Resource uses default waterfall workflow for consistent system prompt generation
- Added comprehensive tests in test/system-prompt-resource.test.ts
- Updated existing test to account for new resource (3 resources total now)
- **✅ VERIFIED**: Resource properly exposed through MCP protocol
- **✅ VERIFIED**: Resource discoverable via resources/list
- **✅ VERIFIED**: Resource content accessible via resources/read
- All 126 tests passing including new resource functionality

**Dual Access Methods:**
1. **CLI Access**: `npx responsible-vibe-mcp --system-prompt` (for setup)
2. **MCP Resource Access**: `system-prompt://` (for programmatic access)

**User Experience Improvement:**
- Developers can now easily get system prompt via `npx responsible-vibe-mcp --system-prompt`
- LLM clients can programmatically access system prompt via MCP resource
- No need to clone repository or access local npm scripts
- Clear help documentation available via `--help`
- Follows standard CLI conventions

**Testing Results:**
- MCP protocol test confirms resource is properly registered and accessible
- Resource appears in resources/list with correct metadata
- Resource content is successfully retrieved via resources/read
- System prompt content is complete and properly formatted (2781 characters)

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
