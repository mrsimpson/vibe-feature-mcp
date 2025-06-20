/**
 * Instruction Generator
 * 
 * Creates phase-specific guidance for the LLM based on current conversation state.
 * Customizes instructions based on project context and development phase.
 */

import type { ConversationContext } from './types.js';
import { PlanManager } from './plan-manager.js';

export interface InstructionContext {
  phase: string;
  conversationContext: ConversationContext;
  transitionReason: string;
  isModeled: boolean;
  planFileExists: boolean;
}

export interface GeneratedInstructions {
  instructions: string;
  planFileGuidance: string;
  metadata: {
    phase: string;
    planFilePath: string;
    transitionReason: string;
    isModeled: boolean;
  };
}

export class InstructionGenerator {
  private planManager: PlanManager;

  constructor(planManager: PlanManager) {
    this.planManager = planManager;
  }

  /**
   * Generate comprehensive instructions for the LLM
   */
  async generateInstructions(
    baseInstructions: string,
    context: InstructionContext
  ): Promise<GeneratedInstructions> {
    
    // Get plan file guidance
    const planFileGuidance = this.planManager.generatePlanFileGuidance(context.phase);
    
    // Enhance base instructions with context-specific guidance
    const enhancedInstructions = await this.enhanceInstructions(
      baseInstructions,
      context,
      planFileGuidance
    );

    return {
      instructions: enhancedInstructions,
      planFileGuidance,
      metadata: {
        phase: context.phase,
        planFilePath: context.conversationContext.planFilePath,
        transitionReason: context.transitionReason,
        isModeled: context.isModeled
      }
    };
  }

  /**
   * Enhance base instructions with context-specific information
   */
  private async enhanceInstructions(
    baseInstructions: string,
    context: InstructionContext,
    planFileGuidance: string
  ): Promise<string> {
    
    const { phase, conversationContext, transitionReason, isModeled, planFileExists } = context;
    
    // Build enhanced instructions
    let enhanced = baseInstructions;

    // Add phase-specific context
    enhanced += '\n\n' + this.getPhaseSpecificContext(phase);

    // Add plan file instructions
    enhanced += '\n\n**Plan File Management:**\n';
    enhanced += `- Plan file location: \`${conversationContext.planFilePath}\`\n`;
    
    if (!planFileExists) {
      enhanced += '- Plan file will be created when you first update it\n';
    }
    
    enhanced += `- ${planFileGuidance}\n`;
    enhanced += '- Always mark completed tasks with [x] and add new tasks as needed\n';
    enhanced += '- Keep the plan file updated with your progress throughout the conversation\n';

    // Add project context
    enhanced += '\n\n**Project Context:**\n';
    enhanced += `- Project: ${conversationContext.projectPath}\n`;
    enhanced += `- Branch: ${conversationContext.gitBranch}\n`;
    enhanced += `- Current Phase: ${phase}\n`;

    // Add transition context if this is a modeled transition
    if (isModeled && transitionReason) {
      enhanced += '\n\n**Transition Context:**\n';
      enhanced += `- ${transitionReason}\n`;
    }

    // Add phase-specific reminders
    enhanced += '\n\n' + this.getPhaseReminders(phase);

    return enhanced;
  }

  /**
   * Get phase-specific contextual information
   */
  private getPhaseSpecificContext(phase: string): string {
    switch (phase) {
      case 'idle':
        return '**Context**: Ready to help with new development tasks or feature requests.';
      
      case 'requirements':
        return '**Context**: Focus on understanding WHAT the user needs. Ask clarifying questions about functionality, scope, constraints, and success criteria. Avoid discussing HOW to implement until requirements are clear.';
      
      case 'design':
        return '**Context**: Focus on HOW to implement the requirements. Discuss architecture, technology choices, data models, APIs, and quality considerations. Build on the established requirements.';
      
      case 'implementation':
        return '**Context**: Focus on building the solution. Write code, create files, implement features, and follow best practices. Reference the design decisions made earlier.';
      
      case 'qa':
        return '**Context**: Focus on quality assurance. Take specific actions: syntax check, build project, run linter, execute tests. Then conduct a multi-perspective code review (security, performance, UX, maintainability, requirement compliance).';
      
      case 'testing':
        return '**Context**: Focus on comprehensive testing. Create test plans, write tests, validate functionality, and ensure the feature works as expected.';
      
      case 'complete':
        return '**Context**: Feature development is complete. Summarize accomplishments, finalize documentation, and prepare for delivery or next steps.';
      
      default:
        return '**Context**: Continue with current development activities.';
    }
  }

  /**
   * Get phase-specific reminders and best practices
   */
  private getPhaseReminders(phase: string): string {
    switch (phase) {
      case 'requirements':
        return '**Remember**: \n- Ask "what" not "how"\n- Break down complex requests into specific tasks\n- Clarify scope and constraints\n- Document acceptance criteria\n- Update plan file with gathered requirements';
      
      case 'design':
        return '**Remember**: \n- Build on established requirements\n- Consider scalability and maintainability\n- Document architectural decisions\n- Choose appropriate technologies\n- Update plan file with design decisions';
      
      case 'implementation':
        return '**Remember**: \n- Follow the established design\n- Write clean, well-documented code\n- Include error handling\n- Follow coding best practices\n- Update plan file with implementation progress';
      
      case 'qa':
        return '**Remember**: \n- Run syntax checking tools\n- Build the project to verify compilation\n- Execute linting tools for code style\n- Run tests to verify functionality\n- Review from security perspective\n- Review from performance perspective\n- Review from UX perspective\n- Review from maintainability perspective\n- Verify requirement compliance\n- Update plan file with QA progress';
      
      case 'testing':
        return '**Remember**: \n- Create comprehensive test plans\n- Test normal and edge cases\n- Validate user acceptance criteria\n- Document test results\n- Update plan file with testing progress';
      
      case 'complete':
        return '**Remember**: \n- Summarize what was accomplished\n- Finalize all documentation\n- Mark all tasks as complete\n- Prepare handoff documentation\n- Update plan file with completion status';
      
      default:
        return '**Remember**: \n- Keep the plan file updated\n- Mark completed tasks\n- Stay focused on current phase objectives';
    }
  }
}
