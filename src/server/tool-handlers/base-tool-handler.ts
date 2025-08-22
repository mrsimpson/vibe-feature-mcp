/**
 * Base Tool Handler
 *
 * Provides common functionality for all tool handlers including
 * error handling, logging, and conversation state management.
 */

import { createLogger } from '../../logger.js';
import { ToolHandler, ServerContext, HandlerResult } from '../types.js';
import type { ConversationContext } from '../../types.js';
import {
  safeExecute,
  logHandlerExecution,
  logHandlerCompletion,
} from '../server-helpers.js';

/**
 * Abstract base class for tool handlers
 * Provides common functionality and enforces consistent patterns
 */
export abstract class BaseToolHandler<TArgs = unknown, TResult = unknown>
  implements ToolHandler<TArgs, TResult>
{
  protected readonly logger: ReturnType<typeof createLogger>;

  constructor() {
    this.logger = createLogger(this.constructor.name);
  }

  /**
   * Main handler method - implements consistent error handling and logging
   */
  async handle(
    args: TArgs,
    context: ServerContext
  ): Promise<HandlerResult<TResult>> {
    const handlerName = this.constructor.name;
    logHandlerExecution(handlerName, args);

    const result = await safeExecute(
      () => this.executeHandler(args, context),
      `${handlerName} execution failed`
    );

    logHandlerCompletion(handlerName, result);
    return result;
  }

  /**
   * Abstract method that subclasses must implement
   * Contains the actual business logic for the tool
   */
  protected abstract executeHandler(
    args: TArgs,
    context: ServerContext
  ): Promise<TResult>;

  /**
   * Helper method to get conversation context with proper error handling
   */
  protected async getConversationContext(context: ServerContext) {
    try {
      return await context.conversationManager.getConversationContext();
    } catch (error) {
      this.logger.info('Conversation not found', { error });
      throw new Error('CONVERSATION_NOT_FOUND');
    }
  }

  /**
   * Helper method to ensure state machine is loaded for a project
   */
  protected ensureStateMachineForProject(
    context: ServerContext,
    projectPath: string,
    workflowName?: string
  ): void {
    const stateMachine = context.transitionEngine.getStateMachine(
      projectPath,
      workflowName
    );
    context.planManager.setStateMachine(stateMachine);
    context.instructionGenerator.setStateMachine(stateMachine);
  }

  /**
   * Helper method to log interactions if logger is available
   */
  protected async logInteraction(
    context: ServerContext,
    conversationId: string,
    toolName: string,
    args: unknown,
    response: unknown,
    phase: string
  ): Promise<void> {
    if (context.interactionLogger) {
      await context.interactionLogger.logInteraction(
        conversationId,
        toolName,
        args,
        response,
        phase
      );
    }
  }
}

/**
 * Base class for tool handlers that require an existing conversation
 * Automatically handles the conversation-not-found case
 */
export abstract class ConversationRequiredToolHandler<
  TArgs = unknown,
  TResult = unknown,
> extends BaseToolHandler<TArgs, TResult> {
  protected async executeHandler(
    args: TArgs,
    context: ServerContext
  ): Promise<TResult> {
    let conversationContext;

    try {
      conversationContext = await this.getConversationContext(context);
    } catch (_error) {
      // Return a special error result that the response renderer can handle
      throw new Error('CONVERSATION_NOT_FOUND');
    }

    return this.executeWithConversation(args, context, conversationContext);
  }

  /**
   * Abstract method for handlers that need conversation context
   */
  protected abstract executeWithConversation(
    args: TArgs,
    context: ServerContext,
    conversationContext: ConversationContext
  ): Promise<TResult>;
}
