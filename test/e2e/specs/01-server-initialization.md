# Server Initialization Integration Tests

## Feature: MCP Server Startup and Configuration

As a developer using the Vibe Feature MCP server
I want the server to initialize properly with all components
So that I can interact with it through the MCP protocol

### Background:
- The server uses stdio transport for MCP communication
- Database is stored in `~/.vibe-feature-mcp/db.sqlite`
- Server exposes 2 tools and 2 resources
- All components should be properly initialized

---

## Scenario: Server starts successfully with clean state

**Given** no existing database or configuration files exist
**When** the MCP server is started
**Then** the server should initialize successfully
**And** the database should be created at `~/.vibe-feature-mcp/db.sqlite`
**And** the conversation_states table should be created
**And** the server should expose the following tools:
  - `whats_next`
  - `proceed_to_phase`
**And** the server should expose the following resources:
  - `development-plan` at `plan://current`
  - `conversation-state` at `state://current`

### Expected Behavior:
- Database directory should be created at `~/.vibe-feature-mcp/`
- SQLite database file should be created with proper schema
- All MCP tools should be registered and available
- All MCP resources should be registered and accessible
- Server should be ready to accept MCP protocol requests

---

## Scenario: Server handles database connection errors gracefully

**Given** the database directory is not writable
**When** the MCP server attempts to initialize
**Then** the server should handle the error gracefully
**And** provide a meaningful error message
**And** not crash the process

### Expected Behavior:
- Server should catch and handle initialization errors gracefully
- Error messages should be informative and actionable
- Server process should not terminate unexpectedly
- Fallback behavior should be implemented where possible

---

## Scenario: Server reconnects to existing database

**Given** an existing database with conversation states
**When** the MCP server is restarted
**Then** the server should connect to the existing database
**And** preserve all existing conversation states
**And** be able to continue previous conversations

### Expected Behavior:
- Server should successfully connect to existing database file
- All existing conversation states should be preserved and accessible
- Database schema should be validated and upgraded if necessary
- Server should be able to continue interrupted conversations
- No data loss should occur during server restarts
