/**
 * WhatsNext Tool Handler
 * 
 * Handles the whats_next tool which analyzes conversation context and 
 * determines the next development phase with specific instructions for the LLM.
 */

import { ConversationRequiredToolHandler } from './base-tool-handler.js';
import { ServerContext } from '../types.js';
import { GitManager } from '../../git-manager.js';

/**
 * Arguments for the whats_next tool
 */
export interface WhatsNextArgs {
  context?: string;
  user_input?: string;
  conversation_summary?: string;
  recent_messages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

/**
 * Response from the whats_next tool
 */
export interface WhatsNextResult {
  phase: string;
  instructions: string;
  plan_file_path: string;
  is_modeled_transition: boolean;
  conversation_id: string;
}

/**
 * WhatsNext tool handler implementation
 */
export class WhatsNextHandler extends ConversationRequiredToolHandler<WhatsNextArgs, WhatsNextResult> {

  protected async executeWithConversation(
    args: WhatsNextArgs,
    context: ServerContext,
    conversationContext: any
  ): Promise<WhatsNextResult> {
    const {
      context: requestContext = '',
      user_input = '',
      conversation_summary = '',
      recent_messages = []
    } = args;

    const conversationId = conversationContext.conversationId;
    const currentPhase = conversationContext.currentPhase;
    
    this.logger.debug('Processing whats_next request', { 
      conversationId, 
      currentPhase,
      hasContext: !!requestContext,
      hasUserInput: !!user_input
    });

    // Ensure state machine is loaded for this project
    this.ensureStateMachineForProject(
      context, 
      conversationContext.projectPath, 
      conversationContext.workflowName
    );

    // Ensure plan file exists
    await context.planManager.ensurePlanFile(
      conversationContext.planFilePath,
      conversationContext.projectPath,
      conversationContext.gitBranch
    );

    // Analyze phase transition
    const transitionResult = await context.transitionEngine.analyzePhaseTransition({
      currentPhase,
      projectPath: conversationContext.projectPath,
      userInput: user_input,
      context: requestContext,
      conversationSummary: conversation_summary,
      recentMessages: recent_messages,
      conversationId: conversationContext.conversationId
    });

    // Update conversation state if phase changed
    if (transitionResult.newPhase !== currentPhase) {
      await context.conversationManager.updateConversationState(
        conversationId,
        { currentPhase: transitionResult.newPhase }
      );
      
      // If this was a first-call auto-transition, regenerate the plan file
      if (transitionResult.transitionReason.includes('Starting development - defining criteria')) {
        this.logger.info('Regenerating plan file after first-call auto-transition', {
          from: currentPhase,
          to: transitionResult.newPhase,
          planFilePath: conversationContext.planFilePath
        });
        
        await context.planManager.ensurePlanFile(
          conversationContext.planFilePath,
          conversationContext.projectPath,
          conversationContext.gitBranch
        );
      }
      
      this.logger.info('Phase transition completed', {
        from: currentPhase,
        to: transitionResult.newPhase,
        reason: transitionResult.transitionReason
      });
    }

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

    // Handle git commits if configured
    if (conversationContext.gitCommitConfig?.enabled && conversationContext.gitCommitConfig.commitOnStep) {
      const commitCreated = GitManager.createWipCommitIfNeeded(
        conversationContext.projectPath,
        conversationContext.gitCommitConfig,
        requestContext || 'Step completion',
        transitionResult.newPhase
      );
      
      if (commitCreated) {
        this.logger.info('Created WIP commit after step', {
          conversationId,
          phase: transitionResult.newPhase,
          context: requestContext
        });
      }
    }

    // Prepare response
    const response: WhatsNextResult = {
      phase: transitionResult.newPhase,
      instructions: instructions.instructions,
      plan_file_path: conversationContext.planFilePath,
      is_modeled_transition: transitionResult.isModeled,
      conversation_id: conversationContext.conversationId
    };

    // Log interaction
    await this.logInteraction(
      context,
      conversationId,
      'whats_next',
      args,
      response,
      transitionResult.newPhase
    );

    return response;
  }
}
