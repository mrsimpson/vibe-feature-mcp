/**
 * ProceedToPhase Tool Handler
 * 
 * Handles explicit transitions to specific development phases when the current 
 * phase is complete or when a direct phase change is needed.
 */

import { ConversationRequiredToolHandler } from './base-tool-handler.js';
import { ServerContext } from '../types.js';
import { validateRequiredArgs } from '../server-helpers.js';
import { GitManager } from '../../git-manager.js';

/**
 * Arguments for the proceed_to_phase tool
 */
export interface ProceedToPhaseArgs {
  target_phase: string;
  reason?: string;
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
export class ProceedToPhaseHandler extends ConversationRequiredToolHandler<ProceedToPhaseArgs, ProceedToPhaseResult> {

  protected async executeWithConversation(
    args: ProceedToPhaseArgs,
    context: ServerContext,
    conversationContext: any
  ): Promise<ProceedToPhaseResult> {
    // Validate required arguments
    validateRequiredArgs(args, ['target_phase']);

    const { target_phase, reason = '' } = args;
    const conversationId = conversationContext.conversationId;
    const currentPhase = conversationContext.currentPhase;

    this.logger.debug('Processing proceed_to_phase request', { 
      conversationId, 
      currentPhase,
      targetPhase: target_phase,
      reason
    });

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
    await context.conversationManager.updateConversationState(
      conversationId,
      { currentPhase: transitionResult.newPhase }
    );
    
    this.logger.info('Explicit phase transition completed', {
      from: currentPhase,
      to: transitionResult.newPhase,
      reason: transitionResult.transitionReason
    });

    // Ensure plan file exists
    await context.planManager.ensurePlanFile(
      conversationContext.planFilePath,
      conversationContext.projectPath,
      conversationContext.gitBranch
    );

    // Check if plan file exists
    const planInfo = await context.planManager.getPlanFileInfo(conversationContext.planFilePath);

    // Generate enhanced instructions
    const instructions = await context.instructionGenerator.generateInstructions(
      transitionResult.instructions,
      {
        phase: transitionResult.newPhase,
        conversationContext: {
          ...conversationContext,
          currentPhase: transitionResult.newPhase
        },
        transitionReason: transitionResult.transitionReason,
        isModeled: transitionResult.isModeled,
        planFileExists: planInfo.exists
      }
    );

    // Handle git commits if configured (before phase transition)
    if (conversationContext.gitCommitConfig?.enabled && conversationContext.gitCommitConfig.commitOnPhase) {
      const commitCreated = GitManager.createWipCommitIfNeeded(
        conversationContext.projectPath,
        conversationContext.gitCommitConfig,
        `Phase transition: ${currentPhase} → ${target_phase}`,
        currentPhase
      );
      
      if (commitCreated) {
        this.logger.info('Created WIP commit before phase transition', {
          conversationId,
          fromPhase: currentPhase,
          toPhase: target_phase,
          reason
        });
      }
    }

    // Prepare response
    const response: ProceedToPhaseResult = {
      phase: transitionResult.newPhase,
      instructions: instructions.instructions,
      plan_file_path: conversationContext.planFilePath,
      transition_reason: transitionResult.transitionReason,
      is_modeled_transition: transitionResult.isModeled,
      conversation_id: conversationContext.conversationId
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
}
