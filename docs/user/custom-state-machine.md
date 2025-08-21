# Custom State Machine Configuration

The Vibe Feature MCP server supports custom state machine definitions through YAML files. This allows you to customize the development workflow, transitions, and prompts to match your specific needs.

## How to Create a Custom State Machine

1. Create a `.vibe` directory in your project root if it doesn't exist already
2. Create a file named `state-machine.yaml` or `state-machine.yml` in the `.vibe` directory
3. Define your custom state machine following the schema below

## State Machine Schema

The state machine YAML file must follow this structure:

```yaml
name: 'Your Workflow Name'
description: 'Description of your workflow'
initial_state: 'starting_state'

# State definitions with default instructions and transitions
states:
  state_name:
    description: 'Description of this state'
    default_instructions: 'Default instructions when entering this state'
    transitions:
      - trigger: 'event_name'
        to: 'target_state'
        instructions: 'Instructions to provide when this transition occurs (optional - uses target state default if not provided)'
        additional_instructions: "Additional context to combine with target state's default instructions (optional)"
        transition_reason: 'Reason for this transition'
```

### Key Changes in the New Format

- **`default_instructions`**: Each state now has default instructions that are used when entering the state
- **Optional `instructions`**: Transition instructions are now optional - if not provided, the target state's default instructions are used
- **`additional_instructions`**: For special transitions, you can provide additional context that gets combined with the target state's default instructions
- **No `direct_transitions`**: The old `direct_transitions` section has been removed - default instructions per state replace this functionality

## Example: Anthropic's "Explore, Plan, Code, Commit" Workflow

Here's a complete state machine based on Anthropic's recommended development workflow using the new simplified format:

```yaml
name: 'Explore-Plan-Code-Commit Workflow'
description: "A comprehensive development workflow based on Anthropic's best practices: Explore, Plan, Code, Commit based on https://www.anthropic.com/engineering/claude-code-best-practices"
initial_state: 'explore'

states:
  explore:
    description: 'Research and exploration phase - understanding the problem space'
    default_instructions: "Starting exploration phase. Read relevant files, understand the codebase structure, and gather context about the problem. Use general pointers or specific filenames, but don't write any code yet."
    transitions:
      - trigger: 'exploration_complete'
        to: 'plan'
        instructions: "Exploration complete! You've gathered sufficient information about the codebase, requirements, and constraints. Now think hard about creating a comprehensive plan. Make sure you documented knowledge in the plan"
        transition_reason: 'Sufficient exploration completed, ready to plan'

      - trigger: 'continue_exploring'
        to: 'explore'
        additional_instructions: "Continue exploring the codebase and problem space. Read relevant files, understand existing patterns, and gather more context. Don't write any code yet - focus on understanding. Document knowledge in the plan"
        transition_reason: 'More exploration needed'

  plan:
    description: 'Planning phase - creating a detailed implementation strategy'
    default_instructions: "Starting planning phase. Think hard about the implementation approach. Use 'think harder' or 'ultrathink' to evaluate alternatives thoroughly. Create a comprehensive plan that addresses the requirements and constraints you've discovered."
    transitions:
      - trigger: 'plan_complete'
        to: 'code'
        instructions: "You've thought through the approach thoroughly and created a solid strategy. Now implement the solution step by step, verifying the reasonableness of each piece as you build it. Implement automated tests where appropriate"
        transition_reason: 'Comprehensive plan created, ready to implement'

      - trigger: 'need_more_exploration'
        to: 'explore'
        additional_instructions: "The planning revealed gaps in understanding. Gather more information about the codebase, requirements, or constraints before continuing with the plan. You may need to revert artifacts you've already created."
        transition_reason: 'Planning revealed knowledge gaps'

      - trigger: 'refine_plan'
        to: 'plan'
        additional_instructions: "Continue refining the plan. Think harder about edge cases, alternative approaches, and potential issues. Consider creating a document or GitHub issue with your plan for future reference. You may need to revert artifacts you've already created."
        transition_reason: 'Plan needs more refinement'

  code:
    description: 'Implementation phase - writing and building the solution'
    default_instructions: 'Starting implementation phase. Follow your plan step by step, implementing the solution while verifying the reasonableness of each component. Maintain good coding practices and test as you go.'
    transitions:
      - trigger: 'implementation_complete'
        to: 'commit'
        instructions: 'Implementation complete! The code is working and meets the requirements. Now prepare to commit your changes and create a pull request with proper documentation if possible.'
        transition_reason: 'Implementation finished successfully'

      - trigger: 'implementation_issues'
        to: 'plan'
        additional_instructions: 'Implementation revealed issues with the plan. Go back to planning to address the problems discovered during coding. Think through alternative approaches.'
        transition_reason: 'Implementation revealed planning issues'

      - trigger: 'continue_coding'
        to: 'code'
        additional_instructions: 'Continue implementing the solution. Follow the plan step by step, verify the reasonableness of each component as you build it, and maintain good coding practices.'
        transition_reason: 'Implementation in progress'

      - trigger: 'need_exploration'
        to: 'explore'
        additional_instructions: 'Implementation revealed the need for more exploration. Investigate the codebase further to understand how to properly integrate your changes.'
        transition_reason: 'Implementation requires more exploration'

  commit:
    description: 'Finalization phase - committing changes and documentation'
    default_instructions: 'Starting commit preparation phase. Finalize your implementation, update documentation, create clear commit messages, and prepare a pull request with proper explanation of the changes.'
    transitions:
      - trigger: 'commit_complete'
        to: 'explore'
        instructions: 'Changes committed successfully! Pull request created with proper documentation. Ready to start the next development cycle. Begin by exploring what to work on next.'
        transition_reason: 'Development cycle complete, starting fresh'

      - trigger: 'need_code_fixes'
        to: 'code'
        additional_instructions: 'Issues found during commit preparation. Return to implementation to fix the problems before committing.'
        transition_reason: 'Code needs fixes before commit'

      - trigger: 'continue_commit_prep'
        to: 'commit'
        additional_instructions: 'Continue preparing the commit. Update READMEs, changelogs, documentation, and ensure the pull request has a clear explanation of what was implemented and why.'
        transition_reason: 'Commit preparation in progress'
```

## Validation

The state machine file is validated when loaded. Common validation errors include:

- Missing required properties (`name`, `description`, `initial_state`, `states`)
- States missing required `default_instructions` field
- References to undefined states in transitions
- Invalid transition targets
- Missing `transition_reason` in transitions

If validation fails, the server will fall back to the default state machine and log an error.

## Benefits of the New Format

- **Reduced redundancy**: No more duplicate instruction definitions between `direct_transitions` and state-specific transitions
- **Cleaner structure**: Each state has clear default behavior with optional special cases
- **Better maintainability**: Single source of truth for phase instructions
- **Simpler composition**: Additional instructions are clearly combined with defaults

## Editor Support

For VSCode users, you can enable schema validation by adding this line at the top of your YAML file:

```yaml
# yaml-language-server: $schema=../node_modules/responsible-vibe-mcp/resources/state-machine-schema.json
```

This provides code completion, validation, and documentation while editing your custom state machine.

## Key Features of This Workflow

### 1. **Exploration First**

- Emphasizes understanding before coding
- Encourages reading relevant files and gathering context
- Supports subagent usage for complex investigations
- Prevents jumping straight to implementation

### 2. **Thoughtful Planning**

- Uses Anthropic's thinking triggers ("think hard", "think harder", "ultrathink")
- Encourages creating plan documents for reference
- Allows returning to exploration if gaps are discovered
- Supports plan refinement and alternative evaluation

### 3. **Verified Implementation**

- Step-by-step implementation following the plan
- Continuous verification of solution reasonableness
- Ability to return to planning if issues arise
- Maintains good coding practices throughout

### 4. **Proper Finalization**

- Comprehensive commit preparation
- Documentation updates (READMEs, changelogs)
- Clear pull request descriptions
- Proper explanation of changes and rationale

## Workflow Benefits

- **Reduced Context Loss**: Exploration and planning phases preserve context for complex problems
- **Better Solutions**: Thinking time allocated for evaluating alternatives
- **Fewer Iterations**: Thorough planning reduces implementation rework
- **Complete Documentation**: Ensures proper documentation and explanation of changes
- **Flexible Navigation**: Can move between phases as needed based on discoveries

## Usage Tips

1. **Start with Exploration**: Always begin by understanding the problem space thoroughly
2. **Use Thinking Triggers**: Leverage "think hard", "think harder", or "ultrathink" during planning
3. **Document Your Plan**: Create plan documents or GitHub issues for complex features
4. **Verify as You Go**: Check the reasonableness of each implementation piece
5. **Complete the Cycle**: Don't skip the commit phase - proper documentation is crucial

## Validation

The state machine file is validated when loaded. Common validation errors include:

- Missing required properties (`name`, `description`, `initial_state`, `states`)
- References to undefined states in transitions
- Invalid transition targets
- Missing instructions or transition reasons

If validation fails, the server will fall back to the default state machine and log an error.

## Editor Support

For VSCode users, you can enable schema validation by adding this line at the top of your YAML file:

```yaml
# yaml-language-server: $schema=../node_modules/responsible-vibe-mcp/resources/state-machine-schema.json
```

This provides code completion, validation, and documentation while editing your custom state machine.

## Testing Your Custom State Machine

To test your custom state machine:

1. Place the YAML file in `.vibe/state-machine.yaml` in your project
2. Start the responsible-vibe-mcp server
3. Check the logs for any validation errors
4. Use the `whats_next` tool to see if your custom phases are being used
5. Test transitions between phases using `proceed_to_phase`

The server will automatically detect and load your custom state machine when it starts up.
