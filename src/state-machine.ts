/**
 * State Machine Definition for Vibe Feature MCP Server
 *
 * This module defines the development workflow state machine, including:
 * - Development phases (states)
 * - Transition triggers and conditions
 * - Phase-specific instructions for LLM guidance
 * - Transition-specific prompts for contextual guidance
 */

export type DevelopmentPhase =
  | 'idle'
  | 'requirements'
  | 'design'
  | 'implementation'
  | 'qa'
  | 'testing'
  | 'complete';

export type TransitionTrigger =
  | 'new_feature_request'
  | 'refine_requirements'
  | 'requirements_complete'
  | 'abandon_feature'
  | 'refine_design'
  | 'requirements_unclear'
  | 'design_complete'
  | 'refine_implementation'
  | 'design_issues'
  | 'implementation_complete'
  | 'refine_qa'
  | 'implementation_issues'
  | 'qa_complete'
  | 'refine_testing'
  | 'qa_issues'
  | 'testing_complete'
  | 'feature_delivered'
  | 'direct_transition'; // For user-initiated direct phase changes

export interface StateTransition {
  from: DevelopmentPhase;
  to: DevelopmentPhase;
  trigger: TransitionTrigger;
  isModeled: boolean; // Whether this transition is shown in the state diagram
  instructions: string;
  transitionReason: string;
}

/**
 * Complete state transition table
 *
 * This table defines all possible transitions between development phases.
 * - Modeled transitions: Shown in the state diagram, get contextual guidance
 * - Direct transitions: Not shown in diagram, get general phase instructions
 */
export const STATE_TRANSITIONS: StateTransition[] = [
  // FROM IDLE
  {
    from: 'idle',
    to: 'requirements',
    trigger: 'new_feature_request',
    isModeled: true,
    instructions:
      'New feature request detected! Start requirements analysis by asking the user clarifying questions about WHAT they need. Focus on understanding their goals, scope, and constraints. Break down their needs into specific, actionable tasks and document them in the plan file. Mark completed requirements tasks as you progress.',
    transitionReason:
      'New feature request detected, starting requirements analysis',
  },

  // FROM REQUIREMENTS
  {
    from: 'requirements',
    to: 'requirements',
    trigger: 'refine_requirements',
    isModeled: true,
    instructions:
      'Continue refining requirements. Ask more detailed questions to clarify scope, constraints, and user needs. Add any new requirements to the plan file and mark completed tasks. Ensure you have a complete understanding of WHAT needs to be built before moving to design.',
    transitionReason: 'Requirements need further refinement and clarification',
  },
  {
    from: 'requirements',
    to: 'design',
    trigger: 'requirements_complete',
    isModeled: true,
    instructions:
      'Requirements are complete! ✅ Now transition to design phase. Help the user design the technical solution by asking about architecture, technologies, quality goals, and implementation approach. Focus on HOW to build what was defined in requirements. Document design decisions in the plan file and mark completed requirements tasks.',
    transitionReason:
      'All requirements tasks completed, moving to technical design',
  },
  {
    from: 'requirements',
    to: 'idle',
    trigger: 'abandon_feature',
    isModeled: true,
    instructions:
      'Feature development abandoned. Clean up any temporary work and return to idle state. The plan file will remain for future reference if the user wants to resume this feature later.',
    transitionReason: 'User decided to abandon this feature development',
  },

  // FROM DESIGN
  {
    from: 'design',
    to: 'design',
    trigger: 'refine_design',
    isModeled: true,
    instructions:
      'Continue refining the technical design. Ask about architecture details, technology choices, data models, API design, and quality considerations. Update the plan file with design decisions and mark completed design tasks. Ensure the design is solid before implementation.',
    transitionReason: 'Design needs further refinement and detail',
  },
  {
    from: 'design',
    to: 'requirements',
    trigger: 'requirements_unclear',
    isModeled: true,
    instructions:
      'Design phase revealed unclear requirements. Return to requirements analysis to clarify the WHAT before continuing with HOW. Ask specific questions about the unclear aspects and update the plan file with refined requirements.',
    transitionReason:
      'Design work revealed gaps or ambiguities in requirements',
  },
  {
    from: 'design',
    to: 'implementation',
    trigger: 'design_complete',
    isModeled: true,
    instructions:
      'Design is complete! ✅ Now transition to implementation. Guide the user through building the solution following the design. Focus on coding best practices, proper structure, error handling, and basic testing. Update the plan file with implementation progress and mark completed design tasks.',
    transitionReason: 'Technical design is complete, ready to start building',
  },
  {
    from: 'design',
    to: 'idle',
    trigger: 'abandon_feature',
    isModeled: true,
    instructions:
      'Feature development abandoned during design phase. Clean up any design artifacts and return to idle state. The plan file will remain for future reference.',
    transitionReason: 'User decided to abandon feature during design phase',
  },

  // FROM IMPLEMENTATION
  {
    from: 'implementation',
    to: 'implementation',
    trigger: 'refine_implementation',
    isModeled: true,
    instructions:
      'Continue implementation work. Help with coding, debugging, structure improvements, and adding functionality. Follow best practices and ensure code quality. Update the plan file with progress and mark completed implementation tasks.',
    transitionReason:
      'Implementation work continues, adding features or improving code',
  },
  {
    from: 'implementation',
    to: 'design',
    trigger: 'design_issues',
    isModeled: true,
    instructions:
      "Implementation revealed issues with the design. Return to design phase to address architectural problems or design gaps. Analyze what's not working and revise the technical approach. Update the plan file with design changes.",
    transitionReason:
      'Implementation work revealed problems with the current design',
  },
  {
    from: 'implementation',
    to: 'qa',
    trigger: 'implementation_complete',
    isModeled: true,
    instructions:
      "Implementation is complete! ✅ Now transition to quality assurance. Take these specific actions:\n\n1. **Syntax Check**: Run syntax checking tools or validate syntax manually\n2. **Build Project**: Build the project to verify it compiles without errors\n3. **Run Linter**: Execute linting tools to ensure code style consistency\n4. **Execute Tests**: Run existing tests to verify functionality\n\nThen conduct a multi-perspective code review:\n- **Security Perspective**: Check for vulnerabilities, input validation, authentication issues\n- **Performance Perspective**: Identify bottlenecks, inefficient algorithms, resource usage\n- **UX Perspective**: Evaluate from the end-user's viewpoint\n- **Maintainability Perspective**: Assess code readability, documentation, future maintenance\n- **Requirement Compliance**: Verify all requirements are properly implemented\n\nUpdate the plan file and mark completed implementation tasks.",
    transitionReason:
      'Core implementation is complete, ready for quality review',
  },
  {
    from: 'implementation',
    to: 'idle',
    trigger: 'abandon_feature',
    isModeled: true,
    instructions:
      'Feature development abandoned during implementation. Clean up any incomplete code and return to idle state. The plan file and any completed work will remain for future reference.',
    transitionReason: 'User decided to abandon feature during implementation',
  },

  // FROM QA (Quality Assurance)
  {
    from: 'qa',
    to: 'qa',
    trigger: 'refine_qa',
    isModeled: true,
    instructions:
      "Continue quality assurance work. Take these specific actions if not already completed:\n\n1. **Syntax Check**: Run syntax checking tools or validate syntax manually\n2. **Build Project**: Build the project to verify it compiles without errors\n3. **Run Linter**: Execute linting tools to ensure code style consistency\n4. **Execute Tests**: Run existing tests to verify functionality\n\nContinue multi-perspective code review:\n- **Security Perspective**: Check for vulnerabilities, input validation, authentication issues\n- **Performance Perspective**: Identify bottlenecks, inefficient algorithms, resource usage\n- **UX Perspective**: Evaluate from the end-user's viewpoint\n- **Maintainability Perspective**: Assess code readability, documentation, future maintenance\n- **Requirement Compliance**: Verify all requirements are properly implemented\n\nUpdate the plan file with QA progress and mark completed tasks.",
    transitionReason:
      'Quality assurance work continues, improving code quality',
  },
  {
    from: 'qa',
    to: 'implementation',
    trigger: 'implementation_issues',
    isModeled: true,
    instructions:
      'Quality assurance revealed implementation issues. Return to implementation phase to fix bugs, improve code quality, or add missing functionality. Focus on addressing the specific issues identified during QA review.',
    transitionReason:
      'QA review found issues that require implementation changes',
  },
  {
    from: 'qa',
    to: 'testing',
    trigger: 'qa_complete',
    isModeled: true,
    instructions:
      'Quality assurance is complete! ✅ Now transition to testing phase. Create comprehensive test plans, write and execute tests, validate feature completeness, and ensure everything works as expected. Update the plan file and mark completed QA tasks.',
    transitionReason:
      'Quality assurance is complete, ready for comprehensive testing',
  },
  {
    from: 'qa',
    to: 'idle',
    trigger: 'abandon_feature',
    isModeled: true,
    instructions:
      'Feature development abandoned during QA phase. Clean up any QA artifacts and return to idle state. The plan file and completed work will remain for future reference.',
    transitionReason:
      'User decided to abandon feature during quality assurance',
  },

  // FROM TESTING
  {
    from: 'testing',
    to: 'testing',
    trigger: 'refine_testing',
    isModeled: true,
    instructions:
      'Continue testing work. Create more test cases, improve test coverage, run integration tests, and validate edge cases. Update the plan file with testing progress and mark completed testing tasks.',
    transitionReason:
      'Testing work continues, improving coverage and validation',
  },
  {
    from: 'testing',
    to: 'qa',
    trigger: 'qa_issues',
    isModeled: true,
    instructions:
      'Testing revealed quality issues. Return to QA phase to address code quality problems, documentation gaps, or requirement compliance issues identified during testing. Focus on the specific QA issues found.',
    transitionReason:
      'Testing found issues that require quality assurance attention',
  },
  {
    from: 'testing',
    to: 'complete',
    trigger: 'testing_complete',
    isModeled: true,
    instructions:
      'Testing is complete! ✅ The feature is fully implemented, tested, and ready for delivery. Transition to complete state. Summarize what was accomplished and prepare final documentation. Mark all testing tasks as complete.',
    transitionReason: 'All testing is complete, feature is ready for delivery',
  },
  {
    from: 'testing',
    to: 'idle',
    trigger: 'abandon_feature',
    isModeled: true,
    instructions:
      'Feature development abandoned during testing phase. Clean up any testing artifacts and return to idle state. The plan file and completed work will remain for future reference.',
    transitionReason: 'User decided to abandon feature during testing phase',
  },

  // FROM COMPLETE
  {
    from: 'complete',
    to: 'idle',
    trigger: 'feature_delivered',
    isModeled: true,
    instructions:
      'Feature has been delivered successfully! Return to idle state, ready for the next development task. The completed plan file serves as documentation of what was accomplished.',
    transitionReason: 'Feature delivery complete, returning to idle state',
  },
  {
    from: 'complete',
    to: 'requirements',
    trigger: 'new_feature_request',
    isModeled: true,
    instructions:
      'New feature request while previous feature is complete. Start fresh requirements analysis for the new feature. Ask clarifying questions about what they need and create a new development plan.',
    transitionReason:
      'New feature request received, starting new development cycle',
  },
];

/**
 * Direct transition instructions for non-modeled transitions
 * These are used when users jump directly to any phase using proceed_to_phase
 */
export const DIRECT_PHASE_INSTRUCTIONS: Record<DevelopmentPhase, string> = {
  idle: 'Returned to idle state. Ready to help with new feature development or other tasks.',

  requirements:
    'Starting requirements analysis. Ask the user clarifying questions about WHAT they need. Focus on understanding their goals, scope, constraints, and success criteria. Break down their needs into specific, actionable tasks and document them in the plan file. Mark completed requirements tasks as you progress.',

  design:
    "Starting design phase. Help the user design the technical solution by asking about architecture, technologies, data models, API design, and quality goals. Focus on HOW to implement what's needed. Document design decisions in the plan file and ensure the approach is solid before implementation.",

  implementation:
    'Starting implementation phase. Guide the user through building the solution following best practices. Focus on code structure, error handling, security, and maintainability. Write clean, well-documented code and include basic testing. Update the plan file with implementation progress.',

  qa: "Starting quality assurance phase. Take the following specific actions:\n\n1. **Syntax Check**: Run syntax checking tools or validate syntax manually\n2. **Build Project**: Build the project to verify it compiles without errors\n3. **Run Linter**: Execute linting tools to ensure code style consistency\n4. **Execute Tests**: Run existing tests to verify functionality\n\nThen conduct a multi-perspective code review:\n- **Security Perspective**: Check for vulnerabilities, input validation, authentication issues\n- **Performance Perspective**: Identify bottlenecks, inefficient algorithms, resource usage\n- **UX Perspective**: Evaluate from the end-user's viewpoint\n- **Maintainability Perspective**: Assess code readability, documentation, future maintenance\n- **Requirement Compliance**: Verify all requirements are properly implemented\n\nUpdate the plan file with QA progress and mark completed tasks.",

  testing:
    'Starting testing phase. Create comprehensive test plans, write and execute tests, validate feature completeness, and ensure everything works as expected. Focus on test coverage, edge cases, integration testing, and user acceptance validation.',

  complete:
    'Feature development is complete! All phases have been finished successfully. The feature is implemented, tested, and ready for delivery. Summarize what was accomplished and ensure all documentation is finalized.',
};

/**
 * Get transition instructions for a specific state change
 */
export function getTransitionInstructions(
  fromState: DevelopmentPhase,
  toState: DevelopmentPhase,
  trigger?: TransitionTrigger
): { instructions: string; transitionReason: string; isModeled: boolean } {
  // Look for a modeled transition first
  const modeledTransition = STATE_TRANSITIONS.find(
    t =>
      t.from === fromState &&
      t.to === toState &&
      (trigger ? t.trigger === trigger : true)
  );

  if (modeledTransition) {
    return {
      instructions: modeledTransition.instructions,
      transitionReason: modeledTransition.transitionReason,
      isModeled: true,
    };
  }

  // Fall back to direct phase instructions
  return {
    instructions: DIRECT_PHASE_INSTRUCTIONS[toState],
    transitionReason: `Direct transition to ${toState} phase`,
    isModeled: false,
  };
}

/**
 * Get all possible transitions from a given state
 */
export function getPossibleTransitions(
  fromState: DevelopmentPhase
): StateTransition[] {
  return STATE_TRANSITIONS.filter(t => t.from === fromState);
}

/**
 * Check if a transition is modeled (shown in state diagram)
 */
export function isModeledTransition(
  fromState: DevelopmentPhase,
  toState: DevelopmentPhase
): boolean {
  return STATE_TRANSITIONS.some(
    t => t.from === fromState && t.to === toState && t.isModeled
  );
}

/**
 * Get phase-specific instructions for continuing work in current phase
 */
export function getContinuePhaseInstructions(phase: DevelopmentPhase): string {
  const continueTransition = STATE_TRANSITIONS.find(
    t => t.from === phase && t.to === phase
  );

  return continueTransition?.instructions || DIRECT_PHASE_INSTRUCTIONS[phase];
}
