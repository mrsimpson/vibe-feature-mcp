# Conversation State Management Integration Tests

## Feature: Persistent Conversation State

As a developer using the Vibe Feature MCP server across multiple sessions
I want my conversation state to be preserved and managed correctly
So that I can continue development work seamlessly across server restarts and different projects

### Background:
- Conversation state is persisted in SQLite database
- Each conversation is identified by project path + git branch combination
- State includes current phase, plan file path, and metadata
- Multiple projects can have independent conversation states

---

## Scenario: New conversation creation and persistence

**Given** no existing conversation for the current project and branch
**When** I interact with the server for the first time
**Then** a new conversation should be created with unique ID
**And** the conversation should be persisted to database
**And** the state should include project path, git branch, and initial phase
**And** a plan file path should be generated and stored

### Expected Behavior:
- Unique conversation ID should be generated (hash of project + branch)
- Database record should be created with all required fields
- Initial phase should be set appropriately based on context
- Plan file path should be generated based on project context
- Timestamps should be recorded for creation and updates

---

## Scenario: Conversation state retrieval across server restarts

**Given** an existing conversation state in the database
**When** the server is restarted
**And** I make a request for the same project and branch
**Then** the existing conversation state should be retrieved
**And** the current phase should be preserved
**And** the plan file path should remain consistent
**And** conversation should continue from previous state

### Expected Behavior:
- Database connection should be re-established on server restart
- Existing conversation states should be accessible immediately
- No data loss should occur during server restarts
- Conversation continuity should be maintained

---

## Scenario: Multiple project isolation

**Given** multiple projects with active conversations
**When** I switch between different project directories
**Then** each project should have its own isolated conversation state
**And** conversation states should not interfere with each other
**And** project-specific plan files should be maintained separately

### Expected Behavior:
- Project path detection should work correctly for different directories
- Conversation states should be completely isolated by project
- Database queries should filter by project path correctly
- Plan files should be created in appropriate project directories

---

## Scenario: Git branch-based conversation isolation

**Given** a project with multiple git branches
**When** I switch between different branches
**Then** each branch should have its own conversation state
**And** branch-specific development contexts should be maintained
**And** plan files should be branch-aware when appropriate

### Expected Behavior:
- Git branch detection should work reliably
- Conversation IDs should include branch information
- Branch switching should load appropriate conversation state
- Feature branch development should be isolated from main branch

---

## Scenario: Conversation state updates and synchronization

**Given** an existing conversation state
**When** the phase is updated through tool calls
**Then** the database should be updated immediately
**And** subsequent requests should reflect the updated state
**And** timestamps should be updated appropriately

### Expected Behavior:
- Database updates should be atomic and immediate
- State changes should be reflected in subsequent tool calls
- Updated timestamps should track state modifications
- Concurrent access should be handled safely

---

## Scenario: Plan file path management

**Given** a conversation state with a plan file path
**When** the plan file is accessed or created
**Then** the file path should be consistent across all operations
**And** the plan file should be created if it doesn't exist
**And** the path should be relative to the project directory

### Expected Behavior:
- Plan file paths should be generated consistently
- File creation should happen automatically when needed
- Paths should be project-relative for portability
- Plan files should be discoverable and accessible

---

## Scenario: Conversation cleanup and maintenance

**Given** old conversation states in the database
**When** conversations have been inactive for extended periods
**Then** cleanup mechanisms should be available
**And** database size should be manageable
**And** active conversations should not be affected

### Expected Behavior:
- Database should not grow unbounded over time
- Cleanup mechanisms should preserve active conversations
- Old conversation data should be removable when appropriate
- Database performance should remain consistent

---

## Scenario: Database corruption recovery

**Given** a corrupted or inaccessible database
**When** the server attempts to initialize
**Then** the server should handle the error gracefully
**And** attempt database recovery or recreation
**And** provide meaningful error messages to users

### Expected Behavior:
- Database corruption should be detected and handled
- Recovery mechanisms should be attempted when possible
- Server should not crash on database issues
- Users should receive actionable error information

---

## Scenario: Conversation state validation

**Given** conversation state data in the database
**When** the state is retrieved and used
**Then** the data should be validated for consistency
**And** invalid or corrupted state should be handled gracefully
**And** default values should be used for missing fields

### Expected Behavior:
- State validation should occur on retrieval
- Invalid data should not cause server crashes
- Graceful degradation should handle corrupted state
- Default values should provide reasonable fallbacks
