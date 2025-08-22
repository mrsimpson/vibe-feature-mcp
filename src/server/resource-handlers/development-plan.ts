/**
 * Development Plan Resource Handler
 *
 * Handles the development-plan resource which provides access to the current
 * development plan document (markdown) that tracks project progress, tasks, and decisions.
 */

import { createLogger } from '../../logger.js';
import {
  ResourceHandler,
  ServerContext,
  HandlerResult,
  ResourceContent,
} from '../types.js';
import { safeExecute } from '../server-helpers.js';

const logger = createLogger('DevelopmentPlanResourceHandler');

/**
 * Development Plan resource handler implementation
 */
export class DevelopmentPlanResourceHandler implements ResourceHandler {
  async handle(
    uri: URL,
    context: ServerContext
  ): Promise<HandlerResult<ResourceContent>> {
    logger.debug('Processing development plan resource request', {
      uri: uri.href,
    });

    return safeExecute(async () => {
      // Get conversation context
      const conversationContext =
        await context.conversationManager.getConversationContext();

      // Get plan file content
      const planContent = await context.planManager.getPlanFileContent(
        conversationContext.planFilePath
      );

      return {
        uri: uri.href,
        text: planContent,
        mimeType: 'text/markdown',
      };
    }, 'Failed to retrieve development plan resource');
  }
}
