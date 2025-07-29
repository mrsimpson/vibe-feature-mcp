# Development Plan: responsible-vibe (reviews branch)

*Generated on 2025-07-28 by Vibe Feature MCP*
*Workflow: epcc*

## Goal
Add optional review mechanisms to the responsible-vibe-mcp system before phase transitions. Reviews can be conducted by LLMs (if tools are available) or through alternative perspectives as defined by workflows.

## Explore
### Tasks
- [ ] Analyze current phase transition mechanism in `proceed-to-phase.ts`
- [ ] Investigate available LLM interaction tools in MCP ecosystem
- [ ] Design review integration points in the workflow system
- [ ] Evaluate different review approaches (LLM-based vs workflow-defined)
- [ ] Define review configuration schema for workflows
- [ ] Consider user experience for optional vs mandatory reviews
- [ ] Analyze pros/cons of different review approaches for artifact and decision evaluation
- [ ] Define what constitutes "artifacts and decisions" per phase
- [ ] Design user preference system for review enablement
- [ ] Design review state management system (not-required, pending, performed)
- [ ] Define workflow YAML schema for review perspectives
- [ ] Explore how to pass previous phase artifacts to review system
- [ ] Design error handling for missing reviews in proceed_to_phase
- [ ] Design conduct_review tool interface and functionality
- [ ] Define validation logic for review_state parameter in proceed_to_phase
- [ ] Design conduct_review tool for both sampling and non-sampling MCP environments
- [ ] Define conduct_review tool parameters (target_phase instead of perspectives/prompts)
- [ ] Design instruction generation for LLM-conducted reviews vs automated reviews
- [ ] Generalize conduct_review return type to unified instructions-based approach
- [ ] Determine source and derivation of artifacts_to_review information

### Completed
- [x] Created development plan file
- [x] Examined current system architecture (state machine, transition engine, workflow YAML structure)
- [x] Identified key integration points: `proceed-to-phase.ts`, workflow YAML definitions, transition engine
- [x] Analyzed pros/cons of LLM-based, checklist-based, and hybrid review approaches
- [x] Defined artifacts and decisions that would be reviewed per phase
- [x] Explored user preference design options (global, per-workflow, runtime choice)
- [x] Clarified user requirements: conversation-level property, review-state parameter, workflow perspectives
- [x] Designed implementation approach with conversation state, YAML schema, and tool modifications
- [x] Corrected understanding: review_state as proceed_to_phase parameter, not global conversation state
- [x] Refined architecture to use simple boolean requireReviewsBeforePhaseTransition in conversation
- [x] Incorporated user refinements: fallback to user review, stateless conduct_review tool design
- [x] Designed enhanced proceed_to_phase validation with error-driven guidance for LLM
- [x] Revised conduct_review tool design for MCP environment adaptation (sampling vs non-sampling)
- [x] Defined environment-aware tool interface with instruction generation for most common case
- [x] Unified conduct_review return type to always use instructions field for both automated and guided reviews
- [x] Explored options for artifacts_to_review source (workflow-defined, phase-based, plan file extraction, hybrid)
- [x] Simplified design by removing artifacts_to_review field - LLM discovers artifacts naturally using existing tools

## Plan

### Phase Entrance Criteria:
- [x] The problem space has been thoroughly explored
- [x] Current system architecture is understood
- [x] Review mechanisms and integration points have been identified
- [x] Alternative approaches have been evaluated and documented
- [x] It's clear what's in scope and out of scope

### Tasks
- [x] Design detailed implementation strategy for review system
- [x] Define TypeScript interfaces and type definitions
- [x] Plan workflow YAML schema extensions
- [x] Design conduct_review tool handler implementation
- [x] Plan proceed_to_phase tool modifications
- [x] Design conversation state extensions
- [x] Plan instruction generation logic
- [x] Define error handling and validation strategies
- [x] Consider edge cases and potential challenges
- [x] Plan testing approach for review functionality
- [x] Document implementation dependencies and order
- [x] Refine interfaces to be minimal - remove optional parameters and unnecessary return fields
- [x] Detail the MCP sampling capability detection mechanism
- [x] Design specific error messages and user guidance
- [x] Plan backward compatibility with existing workflows
- [x] Define review perspective validation rules

### Completed
- [x] Created comprehensive implementation strategy with 5 phases
- [x] Defined all required TypeScript interfaces and extensions
- [x] Planned workflow YAML schema extensions
- [x] Designed conduct_review tool handler architecture
- [x] Planned proceed_to_phase validation logic modifications
- [x] Identified implementation dependencies and proper order
- [x] Documented edge cases and potential challenges
- [x] Created testing strategy for unit and integration tests
- [x] Refined interfaces to minimal essential-only fields, removing optional parameters and unnecessary return information
- [x] Detailed MCP sampling capability detection mechanism (defaults to non-sampling)
- [x] Designed specific error messages with clear LLM guidance
- [x] Created instruction generation templates for both guided and automated reviews
- [x] Planned backward compatibility strategy for existing workflows
- [x] Defined review perspective validation rules and constraints
- [x] Planned file structure and organization for new components
- [x] Designed configuration integration with start_development tool
- [x] Detailed unit testing scenarios and test cases

## Code

### Phase Entrance Criteria:
- [ ] Detailed implementation strategy has been created
- [ ] Review integration points are clearly defined
- [ ] Technical approach has been validated
- [ ] Dependencies and potential challenges are documented
- [ ] User has approved the implementation plan

### Tasks
- [ ] Implement TypeScript interface extensions in state-machine-types.ts and types.ts
- [ ] Create conduct-review.ts tool handler with environment detection and instruction generation
- [ ] Modify proceed-to-phase.ts to add review_state validation and error handling
- [ ] Update start-development.ts to include requireReviewsBeforePhaseTransition parameter
- [ ] Extend conversation state management in conversation-manager.ts
- [ ] Update workflow YAML schema validation
- [ ] Add review perspectives to existing workflow YAML files
- [ ] Implement MCP sampling capability detection
- [ ] Create instruction generation templates and logic
- [ ] Add comprehensive error handling for all review scenarios
- [ ] Write unit tests for all new functionality
- [ ] Write integration tests for complete review workflows
- [ ] Update documentation and examples

### Completed
*None yet*

## Commit

### Phase Entrance Criteria:
- [ ] Core implementation is complete and functional
- [ ] Review mechanisms are working as expected
- [ ] Code quality standards are met
- [ ] Tests are passing
- [ ] Documentation is updated

### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Key Decisions
- **Integration Point**: Reviews will be integrated into the `proceed_to_phase` tool handler, allowing optional review steps before phase transitions
- **Configuration Approach**: Reviews will be configurable per workflow and per transition in the YAML workflow definitions
- **Review Types**: Support both LLM-based reviews (if tools available) and workflow-defined perspective reviews
- **Conversation-Level Property**: Simple boolean `requireReviewsBeforePhaseTransition` set when starting development
- **Review State Parameter**: `review_state` is a mandatory parameter of `proceed_to_phase` tool: `not-required`, `pending`, `performed`
- **Enforcement**: `proceed_to_phase` validates review_state parameter against conversation requirement and workflow configuration
- **Review Scope**: Focus on artifacts of the previous phase, but with full project context
- **Perspective Definition**: Workflows must specify review perspectives for each transition
- **Fallback Review**: If no review perspectives defined in workflow, LLM asks user to manually review
- **conduct_review Tool Design**: Adapts to MCP environment - returns actual results if sampling available, returns instructions for LLM if not
- **conduct_review Parameters**: Takes target_phase parameter and reads workflow configuration (not stateless as initially thought)
- **Review Results**: In non-sampling environments, review "results" are determined by user interaction guided by LLM perspectives
- **Unified Return Type**: conduct_review always returns instructions field, whether for guided review or automated findings
- **Artifact Discovery**: No artifacts_to_review field - LLM discovers artifacts using git status, conversation history, plan file analysis
- **Minimal Interfaces**: Keep all interfaces minimal - no optional parameters or unnecessary return information

## Notes
### Current System Architecture
- **State Machine**: YAML-based workflow definitions with states and transitions
- **Transition Engine**: Handles phase transitions and instruction generation
- **Tool Handlers**: `proceed-to-phase.ts` handles explicit phase transitions
- **Workflow Structure**: Each transition has trigger, target state, instructions, and transition reason

### Review Integration Options Identified
1. **LLM-Based Reviews**: Use external LLM tools for automated reviews with different perspectives
2. **Workflow-Defined Reviews**: Configure review criteria and perspectives in YAML workflows
3. **Hybrid Approach**: Combine both automated and workflow-defined reviews

### Technical Integration Points
- Modify `YamlTransition` interface to support optional review configuration
- Extend `proceed-to-phase.ts` to handle review steps before transitions
- Add review result evaluation logic to determine if transition should proceed

### Error Handling Correction
- If hasReviewPerspectives is false, no error message needed - transition proceeds normally with review_state: 'not-required'

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
