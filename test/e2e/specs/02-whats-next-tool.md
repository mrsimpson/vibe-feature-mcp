# whats_next Tool Integration Tests

## Feature: Primary Analysis and Instruction Tool

As an LLM client using the Vibe Feature MCP server
I want to call the `whats_next` tool to get contextual development guidance
So that I can provide structured assistance to users throughout their development process

### Background:

- `whats_next` is the primary tool for conversation analysis
- It accepts optional context, user_input, conversation_summary, and recent_messages
- It returns phase, instructions, plan_file_path, transition_reason, and completed_tasks
- The tool should handle both new conversations and existing ones

---

## Scenario: First call to whats_next creates new conversation

**Given** no existing conversation state for the current project
**And** the user provides input about implementing a new feature
**When** I call `whats_next` with user input "implement user authentication"
**Then** a new conversation should be created
**And** the phase should be "requirements"
**And** instructions should guide requirements gathering
**And** a plan file path should be provided
**And** the transition reason should indicate new feature detection

### Expected Behavior:

- Database should be queried for existing conversation state
- New conversation record should be created with unique ID
- Project path should be detected from current working directory
- Git branch should be detected from repository state
- Phase should be set to "requirements" for new feature requests
- Plan file path should be generated based on feature context
- Instructions should contain requirements gathering guidance

---

## Scenario: Continuing existing conversation in requirements phase

**Given** an existing conversation in "requirements" phase
**And** some requirements have been gathered
**When** I call `whats_next` with conversation context
**Then** the phase should remain "requirements" if not complete
**Or** suggest transition to "design" if requirements are complete
**And** instructions should be contextually appropriate

### Expected Behavior:

- Existing conversation state should be retrieved from database
- Plan file should be read and analyzed for task completion
- Phase should remain current if tasks are incomplete
- Instructions should guide continuation of current phase work
- Completed tasks should be identified from plan file analysis
- When all phase tasks are complete, instructions should suggest phase transition

---

## Scenario: Handling malformed or missing parameters

**Given** the MCP server is running
**When** I call `whats_next` with invalid or missing parameters
**Then** the tool should handle errors gracefully
**And** return meaningful error messages
**And** not crash the server

### Expected Behavior:

- Tool should handle missing or invalid parameters gracefully
- Error responses should be properly formatted with isError flag
- Server should not crash on malformed requests
- Meaningful error messages should be returned to client
- Tool should work with minimal required parameters

---

## Scenario: Context analysis drives phase transitions

**Given** an existing conversation with rich context
**When** I provide conversation_summary and recent_messages indicating phase completion
**Then** the transition engine should analyze the context
**And** determine appropriate phase transitions
**And** provide contextually relevant instructions

### Expected Behavior:

- Conversation summary and recent messages should be analyzed by transition engine
- Context should influence phase transition decisions
- Rich conversation history should provide better phase completion detection
- Git branch context should create isolated conversation states
- Plan file analysis should be combined with conversation context
- Instructions should be tailored to specific conversation context
