/**
 * ProceedToPhase Tool Handler
 *
 * Handles explicit transitions to specific development phases when the current
 * phase is complete or when a direct phase change is needed.
 */

import { ConversationRequiredToolHandler } from './base-tool-handler.js';
import { ServerContext } from '../types.js';
import { validateRequiredArgs } from '../server-helpers.js';
import type { ConversationContext } from '../../types.js';

/**
 * Arguments for the proceed_to_phase tool
 */
export interface ProceedToPhaseArgs {
  target_phase: string;
  reason?: string;
  review_state: 'not-required' | 'pending' | 'performed';
}

/**
 * Response from the proceed_to_phase tool
 */
export interface ProceedToPhaseResult {
  phase: string;
  instructions: string;
  plan_file_path: string;
  transition_reason: string;
  is_modeled_transition: boolean;
  conversation_id: string;
}

/**
 * ProceedToPhase tool handler implementation
 */
export class ProceedToPhaseHandler extends ConversationRequiredToolHandler<
  ProceedToPhaseArgs,
  ProceedToPhaseResult
> {
  protected async executeWithConversation(
    args: ProceedToPhaseArgs,
    context: ServerContext,
    conversationContext: ConversationContext
  ): Promise<ProceedToPhaseResult> {
    // Validate required arguments
    validateRequiredArgs(args, ['target_phase', 'review_state']);

    const { target_phase, reason = '', review_state } = args;
    const conversationId = conversationContext.conversationId;
    const currentPhase = conversationContext.currentPhase;

    this.logger.debug('Processing proceed_to_phase request', {
      conversationId,
      currentPhase,
      targetPhase: target_phase,
      reason,
      reviewState: review_state,
    });

    // Validate review state if reviews are required
    if (conversationContext.requireReviewsBeforePhaseTransition) {
      await this.validateReviewState(
        review_state,
        currentPhase,
        target_phase,
        conversationContext.workflowName,
        context
      );
    }

    // Ensure state machine is loaded for this project
    this.ensureStateMachineForProject(context, conversationContext.projectPath);

    // Perform explicit transition
    const transitionResult = context.transitionEngine.handleExplicitTransition(
      currentPhase,
      target_phase,
      conversationContext.projectPath,
      reason,
      conversationContext.workflowName
    );

    // Update conversation state
    await context.conversationManager.updateConversationState(conversationId, {
      currentPhase: transitionResult.newPhase,
    });

    this.logger.info('Explicit phase transition completed', {
      from: currentPhase,
      to: transitionResult.newPhase,
      reason: transitionResult.transitionReason,
    });

    // Ensure plan file exists
    await context.planManager.ensurePlanFile(
      conversationContext.planFilePath,
      conversationContext.projectPath,
      conversationContext.gitBranch
    );

    // Check if plan file exists
    const planInfo = await context.planManager.getPlanFileInfo(
      conversationContext.planFilePath
    );

    // Generate enhanced instructions
    const instructions =
      await context.instructionGenerator.generateInstructions(
        transitionResult.instructions,
        {
          phase: transitionResult.newPhase,
          conversationContext: {
            ...conversationContext,
            currentPhase: transitionResult.newPhase,
          },
          transitionReason: transitionResult.transitionReason,
          isModeled: transitionResult.isModeled,
          planFileExists: planInfo.exists,
        }
      );

    // Add commit instructions if configured
    let finalInstructions = instructions.instructions;
    if (
      conversationContext.gitCommitConfig?.enabled &&
      conversationContext.gitCommitConfig.commitOnPhase
    ) {
      const commitMessage = `Phase transition: ${currentPhase} → ${target_phase}`;
      finalInstructions += `\n\n**Git Commit Required**: Create a commit for this phase transition using:\n\`\`\`bash\ngit add . && git commit -m "${commitMessage}"\n\`\`\``;
    }

    // Prepare response
    const response: ProceedToPhaseResult = {
      phase: transitionResult.newPhase,
      instructions: finalInstructions,
      plan_file_path: conversationContext.planFilePath,
      transition_reason: transitionResult.transitionReason,
      is_modeled_transition: transitionResult.isModeled,
      conversation_id: conversationContext.conversationId,
    };

    // Log interaction
    await this.logInteraction(
      context,
      conversationId,
      'proceed_to_phase',
      args,
      response,
      transitionResult.newPhase
    );

    return response;
  }

  /**
   * Validate review state for transitions that require reviews
   */
  private async validateReviewState(
    reviewState: string,
    currentPhase: string,
    targetPhase: string,
    workflowName: string,
    context: ServerContext
  ): Promise<void> {
    // Get transition configuration from workflow
    const stateMachine = context.workflowManager.loadWorkflowForProject(
      context.projectPath,
      workflowName
    );
    const currentState = stateMachine.states[currentPhase];

    if (!currentState) {
      throw new Error(`Invalid current phase: ${currentPhase}`);
    }

    const transition = currentState.transitions.find(t => t.to === targetPhase);
    if (!transition) {
      throw new Error(
        `No transition found from ${currentPhase} to ${targetPhase}`
      );
    }

    const hasReviewPerspectives =
      transition.review_perspectives &&
      transition.review_perspectives.length > 0;

    if (hasReviewPerspectives) {
      // This transition has review perspectives defined
      if (reviewState === 'pending') {
        throw new Error(
          `Review is required before proceeding to ${targetPhase}. Please use the conduct_review tool first.`
        );
      }
      if (reviewState === 'not-required') {
        throw new Error(
          `This transition requires review, but review_state is 'not-required'. Use 'pending' or 'performed'.`
        );
      }
    } else {
      // No review perspectives defined - transition proceeds normally
      // Note: No error thrown when hasReviewPerspectives is false, as per user feedback
    }
  }
}
