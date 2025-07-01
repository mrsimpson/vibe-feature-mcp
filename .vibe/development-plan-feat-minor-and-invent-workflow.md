# Development Plan: Add Minor Enhancement Workflow

*Generated on 2025-07-01 by Vibe Feature MCP*
*Workflow: epcc*

## Goal
Add a new `minor-enhancement` workflow for small-impact changes that streamlines the development process by combining phases and focusing on efficiency.

## Explore
### Tasks
- [x] Analyze existing workflow implementations (waterfall, epcc, bugfix)
- [x] Understand the state machine structure and configuration
- [x] Research where workflows are defined and loaded
- [x] Identify files that need modification for new workflow
- [x] Understand how workflow selection works in start_development
- [x] Analyze the transition logic and instruction generation

### Completed
- [x] Found existing workflows in `resources/workflows/` directory (epcc.yaml, waterfall.yaml, bugfix.yaml)
- [x] Analyzed YAML structure: name, description, initial_state, states with transitions
- [x] Discovered WorkflowManager loads workflows from `resources/workflows/` automatically
- [x] Found state machine schema in `resources/state-machine-schema.json`
- [x] Identified that only ONE file needs to be created: `resources/workflows/minor-enhancement.yaml`
- [x] Confirmed WorkflowManager automatically discovers and loads new workflow files
- [x] Verified start_development tool dynamically builds enum from available workflows
- [x] Understood transition logic uses state machine definitions for instructions

## Plan
### Phase Entrance Criteria:
- [x] Existing workflow implementations have been analyzed
- [x] State machine structure and configuration is understood
- [x] Files requiring modification have been identified
- [x] Workflow selection mechanism is clear
- [x] Transition logic and instruction generation is understood

### Tasks
- [x] Design the minor-enhancement workflow state machine structure
- [x] Define the explore state with analysis and design focus
- [x] Define the implement state with code, test, and commit focus
- [x] Plan transition logic between explore and implement
- [x] Design instructions for each state that match the intended workflow
- [x] Plan error handling and abandon scenarios
- [x] Consider edge cases and user experience
- [x] Validate design against existing workflow patterns

### Implementation Strategy

#### 1. Workflow Structure Design
**Name**: `minor-enhancement`
**Description**: "A streamlined workflow for small-impact changes: Explore (analysis + design) → Implement (code + test + commit) - optimized for minor enhancements"
**Initial State**: `explore`
**States**: 2 states total (explore, implement)

#### 2. Explore State Design
**Purpose**: Analysis and design only, no code implementation
**Focus Areas**:
- Problem analysis and understanding
- Design decisions and approach planning
- Impact assessment and scope definition
- Technical approach without implementation

**Key Instructions**:
- Emphasize analysis and design activities
- Explicitly discourage code implementation
- Focus on understanding and planning
- Prepare for streamlined implementation phase

#### 3. Implement State Design
**Purpose**: Combined code, test, and commit activities
**Focus Areas**:
- Code implementation based on explore phase analysis
- Testing and validation
- Documentation updates
- Final commit and delivery

**Key Instructions**:
- Implement based on explore phase decisions
- Include testing as part of implementation
- Handle commit and finalization
- Complete the entire development cycle

#### 4. Transition Logic
**Explore → Implement**:
- Trigger when analysis and design are complete
- Ensure sufficient planning before implementation
- Validate readiness for combined implementation phase

**Abandon Options**:
- Both states should support abandoning the feature
- Return to explore state for new tasks

#### 5. Instruction Design Principles
- **Explore**: Focus on "what" and "how" without "doing"
- **Implement**: Focus on "doing" everything needed to complete
- **Clear Boundaries**: Explicit guidance on what belongs in each phase
- **Efficiency**: Minimize overhead while maintaining quality

### Completed
- [x] Analyzed existing workflow patterns (epcc, waterfall, bugfix)
- [x] Identified optimal 2-state structure for minor enhancements
- [x] Designed state purposes and focus areas
- [x] Planned transition logic and abandon scenarios

## Code
### Phase Entrance Criteria:
- [x] Implementation strategy is clearly defined
- [x] All required file modifications are planned
- [x] State machine configuration approach is decided
- [x] Integration with existing workflow system is designed

### Tasks
- [x] Create `resources/workflows/minor-enhancement.yaml` file
- [x] Implement workflow metadata (name, description, initial_state)
- [x] Define explore state with analysis/design instructions
- [x] Define implement state with code/test/commit instructions
- [x] Configure transitions between states
- [x] Add abandon feature transitions for both states
- [x] Validate YAML syntax and schema compliance
- [x] Test workflow discovery and loading
- [x] Verify workflow appears in start_development tool options
- [x] Test complete workflow execution flow

### Implementation Details

#### File Structure: `resources/workflows/minor-enhancement.yaml`
```yaml
# yaml-language-server: $schema=../state-machine-schema.json
---
name: "minor-enhancement"
description: "A streamlined workflow for small-impact changes: Explore (analysis + design) → Implement (code + test + commit) - optimized for minor enhancements"
initial_state: "explore"

states:
  explore:
    description: "Analysis and design phase - understanding and planning without implementation"
    default_instructions: "..."
    transitions: [...]
  
  implement:
    description: "Combined implementation phase - code, test, and commit"
    default_instructions: "..."
    transitions: [...]
```

#### Transition Design
- **explore → explore**: Continue analysis/design
- **explore → implement**: Analysis complete, ready for implementation
- **explore → explore**: Abandon feature
- **implement → implement**: Continue implementation work
- **implement → explore**: Implementation complete, ready for next task
- **implement → explore**: Abandon feature

### Completed
- [x] Successfully created minor-enhancement.yaml workflow file
- [x] Implemented streamlined 2-state workflow (explore → implement)
- [x] Simplified transitions by removing redundant "continue" triggers
- [x] Verified WorkflowManager automatically discovers new workflow
- [x] Confirmed workflow appears in available workflows list
- [x] Validated state machine loads with correct metadata and phases
- [x] Build and unit tests pass with new workflow

## Commit
### Phase Entrance Criteria:
- [x] Minor enhancement workflow is fully implemented
- [x] All tests are passing
- [x] Documentation is updated
- [x] Integration with existing system is verified

### Tasks
- [x] Run comprehensive test suite to ensure no regressions
- [x] Update documentation with new workflow information
- [x] Verify workflow integration with start_development tool
- [x] Clean up any temporary files or code
- [x] Prepare commit message following conventional commits
- [x] Final review of implementation

### Final Implementation Summary

The `minor-enhancement` workflow has been successfully implemented with the following characteristics:

#### ✅ **Workflow Structure**
- **File**: `resources/workflows/minor-enhancement.yaml`
- **States**: 2 states (explore → implement)
- **Purpose**: Streamlined workflow for small-impact changes

#### ✅ **State Design**
- **Explore State**: Analysis and design only, no code implementation
  - Focus on understanding the problem and designing the approach
  - Explicitly discourages code implementation
  - Efficient for minor enhancements
  
- **Implement State**: Combined code, test, and commit phase
  - Includes coding, testing, and commit preparation
  - Streamlined single phase for implementation activities
  - Returns to explore when complete

#### ✅ **Key Features**
- **Simplified Transitions**: Removed redundant "continue" triggers
- **Automatic Discovery**: WorkflowManager automatically finds and loads the workflow
- **Schema Compliant**: Follows existing state-machine-schema.json format
- **Integration Ready**: Appears in start_development tool options

#### ✅ **Validation Results**
- ✅ Build passes without errors
- ✅ Unit tests pass
- ✅ Workflow loads successfully with correct metadata
- ✅ Appears in available workflows list
- ✅ State machine has correct structure (2 states, proper transitions)

### Completed
- [x] All 96 tests pass - no regressions introduced
- [x] Workflow successfully integrates with existing system
- [x] Documentation updated with new workflow and corrected existing info
- [x] No temporary files created - clean implementation
- [x] Implementation reviewed and validated
- [x] Ready for commit with conventional commit message

## Key Decisions
- **Implementation Approach**: Create single file `resources/workflows/minor-enhancement.yaml`
- **Workflow Structure**: explore (analysis + design) → implement (code + test + commit)
- **No Code Changes Required**: WorkflowManager automatically discovers new workflow files
- **File Naming**: Use `minor-enhancement.yaml` (filename becomes workflow name)
- **State Names**: `explore` and `implement` (2 states total)
- **Initial State**: `explore` (analysis and design phase)
- **Final State**: `implement` (combined implementation and finalization)
- **Explore Phase Scope**: Analysis, design, planning - explicitly NO code implementation
- **Implement Phase Scope**: Code, test, commit, documentation - complete development cycle
- **Transition Strategy**: Simple linear progression with abandon options
- **Instruction Focus**: Clear boundaries between analysis/design vs implementation activities
- **Schema Compliance**: Follow existing state-machine-schema.json format
- **Integration**: Leverage existing WorkflowManager automatic discovery

## Notes
### Requirements Summary:
- **Workflow Name**: `minor-enhancement`
- **Structure**: Explore (analysis + design, no code) → Implement (code + test + commit)
- **File**: Create `minor-enhancement.yaml` state machine file
- **Use Case**: Small-impact changes that don't need full EPCC process
- **Explore Phase**: Analysis and design only, no implementation
- **Implement Phase**: Combined code, testing, and commit activities

### Architecture Analysis:
- **Workflow Discovery**: WorkflowManager automatically scans `resources/workflows/` directory
- **File Naming**: Filename (without extension) becomes workflow name in tool enum
- **Schema Validation**: All workflows must conform to `state-machine-schema.json`
- **Tool Integration**: start_development tool dynamically builds enum from available workflows
- **No Code Changes**: System automatically discovers and integrates new workflows
- **State Machine Format**: YAML with name, description, initial_state, and states sections

### Implementation Requirements:
1. **Create**: `resources/workflows/minor-enhancement.yaml`
2. **Structure**: 2 states (explore → implement)
3. **Transitions**: Simple linear progression with abandon options
4. **Instructions**: Phase-specific guidance for analysis/design vs implementation
5. **Testing**: Verify workflow appears in start_development tool options
- **File**: Create `minor.yml` state machine file
- **Use Case**: Small-impact changes that don't need full EPCC process
- **Explore Phase**: Analysis and design only, no implementation
- **Implement Phase**: Combined code, testing, and commit activities

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
