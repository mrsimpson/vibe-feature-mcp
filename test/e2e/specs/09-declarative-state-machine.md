# Declarative State Machine Integration Tests

## Feature: YAML-based State Machine Configuration

As an LLM using the Vibe Feature MCP server
I want the system to load and use declarative YAML-based state machines
So that conversation flows can be customized per project without code changes

### Background:

- State machine is defined in YAML format with states, transitions, and side effects
- Custom state machines can be placed in project's `.vibe` directory
- Default state machine is provided in the server resources

---

## Scenario: Using custom state machine from project directory

**Given** a project with a simple custom state machine YAML file at `.vibe/state-machine.yaml`
**And** the custom state machine defines only two phases: "phase1" and "phase2"
**When** the transition engine is initialized for this project
**Then** it should load and use the custom state machine
**And** the initial phase should be "phase1" as defined in the custom state machine
**And** transitions should follow the rules defined in the custom state machine

### Expected Behavior:

- Custom state machine file should be detected and loaded
- Transition engine should use the custom state machine's rules
- Initial phase should match the custom state machine's initial_state
- Transitions should work according to the custom definition

---

## Scenario: Falling back to default state machine

**Given** a project without a custom state machine YAML file
**When** the transition engine is initialized for this project
**Then** it should load and use the default state machine from resources
**And** the initial phase should be "idle" as defined in the default state machine
**And** transitions should follow the rules defined in the default state machine

### Expected Behavior:

- System should check for custom state machine and not find it
- Default state machine should be loaded from resources
- Initial phase should match the default state machine's initial_state
- Transitions should work according to the default definition

---

## Scenario: Handling custom state machine with alternate file extension

**Given** a project with a custom state machine YAML file at `.vibe/state-machine.yml` (alternate extension)
**When** the transition engine is initialized for this project
**Then** it should load and use the custom state machine
**And** the state machine behavior should match the custom definition

### Expected Behavior:

- System should check for both .yaml and .yml extensions
- Custom state machine should be loaded regardless of extension
- State machine behavior should match the custom definition
