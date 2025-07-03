/**
 * System Prompt Resource Handler
 * 
 * Handles the system-prompt resource which provides access to the complete
 * system prompt for LLM integration. This allows programmatic access to the
 * system prompt through the MCP protocol. The system prompt is workflow-independent.
 */

import { createLogger } from '../../logger.js';
import { ResourceHandler, ServerContext, HandlerResult, ResourceContent } from '../types.js';
import { safeExecute } from '../server-helpers.js';
import { generateSystemPrompt } from '../../system-prompt-generator.js';
import { StateMachineLoader } from '../../state-machine-loader.js';

const logger = createLogger('SystemPromptResourceHandler');

/**
 * System Prompt resource handler implementation
 */
export class SystemPromptResourceHandler implements ResourceHandler {

  async handle(uri: URL, context: ServerContext): Promise<HandlerResult<ResourceContent>> {
    logger.debug('Processing system prompt resource request', { uri: uri.href });

    return safeExecute(async () => {
      // Use the default waterfall workflow for system prompt generation
      // The system prompt is workflow-independent and uses a standard workflow
      const loader = new StateMachineLoader();
      const stateMachine = loader.loadStateMachine(process.cwd()); // Uses default waterfall workflow
      
      // Generate the system prompt
      const systemPrompt = generateSystemPrompt(stateMachine);
      
      logger.debug('Generated system prompt for resource', { 
        promptLength: systemPrompt.length,
        workflowName: stateMachine.name
      });
      
      return {
        uri: uri.href,
        text: systemPrompt,
        mimeType: 'text/plain'
      };
    }, 'Failed to retrieve system prompt resource');
  }
}
