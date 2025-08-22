/**
 * Interaction Logger module
 *
 * Handles logging of tool interactions to the database for auditing and debugging.
 */

import { Database } from './database.js';
import { createLogger } from './logger.js';

import type { InteractionLog } from './types.js';

const logger = createLogger('InteractionLogger');

/**
 * Handles logging of tool interactions to the database
 */
export class InteractionLogger {
  private database: Database;

  /**
   * Create a new InteractionLogger
   *
   * @param database - Database instance to use for logging
   */
  constructor(database: Database) {
    this.database = database;
    logger.debug('InteractionLogger initialized');
  }

  /**
   * Log an interaction with a tool
   *
   * @param conversationId - ID of the conversation
   * @param toolName - Name of the tool that was called
   * @param inputParams - Input parameters to the tool (will be stringified)
   * @param responseData - Response data from the tool (will be stringified)
   * @param currentPhase - Current development phase
   * @returns Promise that resolves when the log is saved
   */
  async logInteraction(
    conversationId: string,
    toolName: string,
    inputParams: unknown,
    responseData: unknown,
    currentPhase: string
  ): Promise<void> {
    logger.debug('Logging interaction', {
      conversationId,
      toolName,
      currentPhase,
    });

    try {
      const timestamp = new Date().toISOString();

      const log: InteractionLog = {
        conversationId,
        toolName,
        inputParams: JSON.stringify(inputParams),
        responseData: JSON.stringify(responseData),
        currentPhase,
        timestamp,
      };

      await this.database.logInteraction(log);

      logger.info('Interaction logged successfully', {
        conversationId,
        toolName,
        timestamp,
      });
    } catch (error) {
      logger.error('Failed to log interaction', error as Error, {
        conversationId,
        toolName,
      });
      // Don't throw the error - logging should not break the main flow
    }
  }

  /**
   * Get all interactions for a specific conversation
   *
   * @param conversationId - ID of the conversation to get logs for
   * @returns Promise that resolves to an array of interaction logs
   */
  async getInteractionsByConversationId(
    conversationId: string
  ): Promise<InteractionLog[]> {
    logger.debug('Getting interactions by conversation ID', { conversationId });

    try {
      const logs =
        await this.database.getInteractionsByConversationId(conversationId);

      logger.info('Retrieved interaction logs', {
        conversationId,
        count: logs.length,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to get interaction logs', error as Error, {
        conversationId,
      });
      throw error;
    }
  }
}
