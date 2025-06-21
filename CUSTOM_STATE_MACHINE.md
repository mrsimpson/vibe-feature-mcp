# Custom State Machine Configuration

The Vibe Feature MCP server supports custom state machine definitions through YAML files. This allows you to customize the development workflow, transitions, and prompts to match your specific needs.

## How to Create a Custom State Machine

1. Create a `.vibe` directory in your project root if it doesn't exist already
2. Create a file named `state-machine.yaml` or `state-machine.yml` in the `.vibe` directory
3. Define your custom state machine following the schema below

## State Machine Schema

The state machine YAML file must follow this structure:

```yaml
name: "Your Workflow Name"
description: "Description of your workflow"
initial_state: "starting_state"

# Regular state transitions
states:
  state_name:
    description: "Description of this state"
    transitions:
      - trigger: "event_name"
        to: "target_state"
        instructions: "Instructions to provide when this transition occurs"
        transition_reason: "Reason for this transition"

# Direct transition instructions
direct_transitions:
  - state: "state_name"
    instructions: "Instructions for direct transition to this state"
    transition_reason: "Reason for direct transition"
```

## Example Custom State Machine

Here's a simplified example with just three states:

```yaml
name: "Simple Development Workflow"
description: "A simplified three-state development workflow"
initial_state: "planning"

states:
  planning:
    description: "Planning the feature"
    transitions:
      - trigger: "planning_complete"
        to: "building"
        instructions: "Planning complete! Now let's start building the feature."
        transition_reason: "Planning phase complete, moving to building"
      
      - trigger: "refine_planning"
        to: "planning"
        instructions: "Continue refining the plan."
        transition_reason: "Planning needs more refinement"

  building:
    description: "Building the feature"
    transitions:
      - trigger: "building_complete"
        to: "reviewing"
        instructions: "Building complete! Let's review the implementation."
        transition_reason: "Building phase complete, moving to review"
      
      - trigger: "refine_building"
        to: "building"
        instructions: "Continue building the feature."
        transition_reason: "Building needs more work"
      
      - trigger: "planning_issues"
        to: "planning"
        instructions: "Issues found with the plan. Let's go back to planning."
        transition_reason: "Implementation revealed planning issues"

  reviewing:
    description: "Reviewing the feature"
    transitions:
      - trigger: "review_complete"
        to: "planning"
        instructions: "Review complete! Ready for the next feature."
        transition_reason: "Review complete, starting new cycle"
      
      - trigger: "refine_review"
        to: "reviewing"
        instructions: "Continue reviewing the feature."
        transition_reason: "Review needs more attention"
      
      - trigger: "implementation_issues"
        to: "building"
        instructions: "Issues found during review. Let's fix the implementation."
        transition_reason: "Review revealed implementation issues"

direct_transitions:
  - state: "planning"
    instructions: "Starting planning phase. Define what needs to be built."
    transition_reason: "Direct transition to planning phase"
  
  - state: "building"
    instructions: "Starting building phase. Implement the planned feature."
    transition_reason: "Direct transition to building phase"
  
  - state: "reviewing"
    instructions: "Starting review phase. Evaluate the implementation."
    transition_reason: "Direct transition to review phase"
```

## Validation

The state machine file is validated when loaded. Common validation errors include:

- Missing required properties
- References to undefined states
- Invalid transition targets
- Missing side effects

If validation fails, the server will fall back to the default state machine and log an error.

## Editor Support

For VSCode users, you can enable schema validation by adding this line at the top of your YAML file:

```yaml
# yaml-language-server: $schema=../node_modules/vibe-feature-mcp/resources/state-machine-schema.json
```

This provides code completion, validation, and documentation while editing your custom state machine.
