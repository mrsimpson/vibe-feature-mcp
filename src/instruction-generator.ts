/**
 * Instruction Generator
 *
 * Creates phase-specific guidance for the LLM based on current conversation state.
 * Customizes instructions based on project context and development phase.
 * Supports custom state machine definitions for dynamic instruction generation.
 * Handles variable substitution for project artifact references.
 */

import type { ConversationContext } from './types.js';
import { PlanManager } from './plan-manager.js';
import { ProjectDocsManager } from './project-docs-manager.js';
import type { YamlStateMachine } from './state-machine-types.js';

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
  private projectDocsManager: ProjectDocsManager;
  private stateMachine: YamlStateMachine | null = null;

  constructor(planManager: PlanManager) {
    this.planManager = planManager;
    this.projectDocsManager = new ProjectDocsManager();
  }

  /**
   * Set the state machine definition for dynamic instruction generation
   */
  setStateMachine(stateMachine: YamlStateMachine): void {
    this.stateMachine = stateMachine;
  }

  /**
   * Generate comprehensive instructions for the LLM
   */
  async generateInstructions(
    baseInstructions: string,
    context: InstructionContext
  ): Promise<GeneratedInstructions> {
    // Apply variable substitution to base instructions
    const substitutedInstructions = this.applyVariableSubstitution(
      baseInstructions,
      context.conversationContext.projectPath
    );

    // Get plan file guidance
    const planFileGuidance = this.planManager.generatePlanFileGuidance(
      context.phase
    );

    // Enhance base instructions with context-specific guidance
    const enhancedInstructions = await this.enhanceInstructions(
      substitutedInstructions,
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
        isModeled: context.isModeled,
      },
    };
  }

  /**
   * Apply variable substitution to instructions
   * Replaces project artifact variables with actual file paths
   */
  private applyVariableSubstitution(
    instructions: string,
    projectPath: string
  ): string {
    const substitutions =
      this.projectDocsManager.getVariableSubstitutions(projectPath);

    let result = instructions;
    for (const [variable, value] of Object.entries(substitutions)) {
      // Use global replace to handle multiple occurrences
      result = result.replace(
        new RegExp(this.escapeRegExp(variable), 'g'),
        value
      );
    }

    return result;
  }

  /**
   * Escape special regex characters in variable names
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Enhance base instructions with context-specific information
   */
  private async enhanceInstructions(
    baseInstructions: string,
    context: InstructionContext,
    _planFileGuidance: string
  ): Promise<string> {
    const {
      phase,
      conversationContext,
      transitionReason,
      isModeled,
      planFileExists,
    } = context;

    // Build plan-file-referential instructions
    let enhanced = `Check your plan file at \`${conversationContext.planFilePath}\` and focus on the "${this.capitalizePhase(phase)}" section.

${baseInstructions}

**Plan File Guidance:**
- Work on the tasks listed in the ${this.capitalizePhase(phase)} section
- Mark completed tasks with [x] as you finish them
- Add new tasks as they are identified during your work with the user
- Update the "Key Decisions" section with important choices made
- Add relevant notes to help maintain context`;

    // Add project context
    enhanced += `\n\n**Project Context:**
- Project: ${conversationContext.projectPath}
- Branch: ${conversationContext.gitBranch}
- Current Phase: ${phase}`;

    // Add transition context if this is a modeled transition
    if (isModeled && transitionReason) {
      enhanced += `\n\n**Phase Context:**
- ${transitionReason}`;
    }

    // Add plan file creation note if needed
    if (!planFileExists) {
      enhanced +=
        '\n\n**Note**: Plan file will be created when you first update it.';
    }

    return enhanced;
  }

  /**
   * Get phase-specific contextual information based on state machine
   */
  private getPhaseSpecificContext(phase: string): string {
    if (this.stateMachine) {
      const phaseDefinition = this.stateMachine.states[phase];
      if (phaseDefinition) {
        return `**Context**: ${phaseDefinition.description}`;
      }
    }

    throw new Error(
      `State machine not set or unknown phase: ${phase}. This should not happen as state machine is always loaded.`
    );
  }

  /**
   * Get default phase context for standard phases
  /**
   * Get phase-specific reminders and best practices based on state machine
   */
  private getPhaseReminders(phase: string): string {
    if (this.stateMachine) {
      const phaseDefinition = this.stateMachine.states[phase];
      if (phaseDefinition) {
        return `**Remember**: \n- Focus on: ${phaseDefinition.description}\n- Update plan file with ${phase} progress\n- Mark completed tasks with [x]\n- Stay focused on current phase objectives`;
      }
    }

    throw new Error(
      `State machine not set or unknown phase: ${phase}. This should not happen as state machine is always loaded.`
    );
  }

  /**
   * Capitalize phase name for display
   */
  private capitalizePhase(phase: string): string {
    return phase
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
