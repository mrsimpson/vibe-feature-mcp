# proceed_to_phase Tool Integration Tests

## Feature: Explicit Phase Transition Tool

As an LLM client using the Vibe Feature MCP server
I want to call the `proceed_to_phase` tool to explicitly transition between development phases
So that I can control the development workflow progression when phases are complete

### Background:
- `proceed_to_phase` allows explicit phase transitions
- It accepts target_phase (required) and reason (optional) parameters
- It should validate phase transitions and update conversation state
- It should return new phase instructions and update database

---

## Scenario: Valid phase transition from requirements to design

**Given** an existing conversation in "requirements" phase
**And** the requirements phase has completed tasks
**When** I call `proceed_to_phase` with target_phase "design"
**Then** the conversation phase should be updated to "design"
**And** design-specific instructions should be returned
**And** the database should be updated with the new phase
**And** the transition reason should be recorded

### Expected Behavior:
- Database should be updated with new phase and timestamp
- Instructions should be generated for the target phase
- Plan file path should remain consistent
- Transition reason should be captured and returned
- Phase-specific guidance should be provided

---

## Scenario: Direct phase transition skipping intermediate phases

**Given** an existing conversation in "requirements" phase
**When** I call `proceed_to_phase` with target_phase "implementation"
**Then** the phase should transition directly to "implementation"
**And** implementation-specific instructions should be provided
**And** the transition should be allowed (no strict sequential enforcement)
**And** the reason should indicate direct transition

### Expected Behavior:
- Non-sequential transitions should be permitted
- Instructions should be appropriate for target phase regardless of previous phase
- Database should record the direct transition
- No validation errors should occur for phase skipping

---

## Scenario: Transition to completion phase

**Given** an existing conversation in "testing" phase
**And** all testing tasks are complete
**When** I call `proceed_to_phase` with target_phase "complete"
**Then** the conversation should be marked as complete
**And** completion instructions should be provided
**And** the conversation state should reflect project completion

### Expected Behavior:
- Conversation should transition to "complete" phase
- Completion-specific instructions should be generated
- Database should be updated with completion timestamp
- Instructions should guide project wrap-up activities

---

## Scenario: Invalid phase transition parameters

**Given** the MCP server is running
**When** I call `proceed_to_phase` with an invalid target_phase
**Then** the tool should return an error response
**And** the current conversation state should remain unchanged
**And** a meaningful error message should be provided

### Expected Behavior:
- Invalid phase names should be rejected
- Error response should include valid phase options
- Database state should not be modified on validation errors
- Server should remain stable after invalid requests

---

## Scenario: Transition with detailed reason

**Given** an existing conversation in "design" phase
**When** I call `proceed_to_phase` with target_phase "implementation" and reason "design approved by user, ready to code"
**Then** the transition should be recorded with the provided reason
**And** the reason should be included in the response
**And** the database should store the transition reason

### Expected Behavior:
- Transition reasons should be captured and stored
- Reasons should be included in tool response
- Historical transition data should be preserved
- Reasons should help with conversation context understanding

---

## Scenario: Transition without existing conversation

**Given** no existing conversation state for the current project
**When** I call `proceed_to_phase` with target_phase "design"
**Then** a new conversation should be created
**And** the phase should be set to the requested target phase
**And** appropriate instructions should be generated for the target phase

### Expected Behavior:
- New conversations should be created if none exist
- Target phase should be set as initial phase
- Project detection should work same as whats_next tool
- Instructions should be contextually appropriate for starting at target phase

---

## Scenario: Concurrent phase transitions

**Given** multiple rapid calls to `proceed_to_phase`
**When** transitions are requested in quick succession
**Then** each transition should be processed atomically
**And** the final state should reflect the last successful transition
**And** no race conditions should occur in database updates

### Expected Behavior:
- Database updates should be atomic and consistent
- Concurrent requests should be handled gracefully
- Final conversation state should be deterministic
- No data corruption should occur from concurrent access
