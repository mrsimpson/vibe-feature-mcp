# Resource Access Integration Tests

## Feature: MCP Resource Endpoints

As an LLM client using the Vibe Feature MCP server
I want to access development plan and conversation state resources
So that I can read current project status and development plans

### Background:
- Server exposes two resources: `plan://current` and `state://current`
- Resources should be accessible via MCP resource protocol
- Plan resource returns markdown content of current development plan
- State resource returns JSON of current conversation state

---

## Scenario: Access development plan resource

**Given** an existing conversation with a plan file
**And** the plan file contains development tasks and progress
**When** I request the `plan://current` resource
**Then** the plan file content should be returned as markdown
**And** the content should include current project status
**And** the MIME type should be `text/markdown`

### Expected Behavior:
- Plan file should be read from filesystem
- Content should be returned with proper MIME type
- File path should be resolved from conversation state
- Content should reflect current plan file state

---

## Scenario: Access conversation state resource

**Given** an existing conversation with phase and metadata
**When** I request the `state://current` resource
**Then** the conversation state should be returned as JSON
**And** the response should include current phase, project path, and git branch
**And** the MIME type should be `application/json`

### Expected Behavior:
- Current conversation state should be retrieved from database
- JSON should include all relevant conversation metadata
- Response should be properly formatted with correct MIME type
- State should reflect current conversation context

---

## Scenario: Access resources without existing conversation

**Given** no existing conversation for the current project
**When** I request either resource
**Then** a new conversation should be created automatically
**And** default content should be returned
**And** the resources should be accessible immediately

### Expected Behavior:
- New conversation should be initialized on resource access
- Default plan file should be created if none exists
- State resource should return newly created conversation state
- Resource access should trigger conversation initialization

---

## Scenario: Plan resource with missing plan file

**Given** an existing conversation state
**But** the referenced plan file does not exist on filesystem
**When** I request the `plan://current` resource
**Then** a new plan file should be created automatically
**And** the plan file should contain default template content
**And** the content should be returned successfully

### Expected Behavior:
- Missing plan files should be created automatically
- Default plan template should be used for new files
- File creation should not cause errors
- Subsequent access should return the created content

---

## Scenario: Resource access with filesystem errors

**Given** an existing conversation state
**But** the plan file is not readable due to permissions
**When** I request the `plan://current` resource
**Then** an error response should be returned
**And** the error should include meaningful error message
**And** the server should remain stable

### Expected Behavior:
- Filesystem errors should be handled gracefully
- Error messages should be informative
- Server should not crash on file access errors
- Error responses should follow MCP protocol format

---

## Scenario: Resource access with database errors

**Given** the database is unavailable or corrupted
**When** I request the `state://current` resource
**Then** an error response should be returned
**And** the error should indicate database connectivity issues
**And** the server should attempt graceful degradation

### Expected Behavior:
- Database errors should be caught and handled
- Error responses should be properly formatted
- Server should remain responsive after database errors
- Fallback behavior should be implemented where possible

---

## Scenario: Resource content updates reflect in real-time

**Given** an existing conversation and plan file
**When** the plan file is modified externally
**And** I request the `plan://current` resource
**Then** the updated content should be returned
**And** changes should be reflected immediately

### Expected Behavior:
- Resource content should be read fresh on each request
- No caching should prevent real-time updates
- External file modifications should be visible immediately
- Content should always reflect current filesystem state

---

## Scenario: Resource URIs are properly formatted

**Given** the MCP server is running
**When** I list available resources
**Then** the resource URIs should be properly formatted
**And** `plan://current` should be available
**And** `state://current` should be available
**And** resource descriptions should be informative

### Expected Behavior:
- Resource URIs should follow MCP protocol standards
- Resource metadata should include proper descriptions
- MIME types should be correctly specified
- Resources should be discoverable through MCP protocol
