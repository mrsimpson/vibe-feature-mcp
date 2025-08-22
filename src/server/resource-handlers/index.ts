/**
 * Resource Handler Registry
 *
 * Central registry for all resource handlers. Provides registration and lookup
 * functionality for resource handlers used by the MCP server.
 */

import { createLogger } from '../../logger.js';
import { ResourceHandler, ResourceRegistry } from '../types.js';
import { DevelopmentPlanResourceHandler } from './development-plan.js';
import { ConversationStateResourceHandler } from './conversation-state.js';
import { WorkflowResourceHandler } from './workflow-resource.js';
import { SystemPromptResourceHandler } from './system-prompt.js';

const logger = createLogger('ResourceRegistry');

/**
 * Default implementation of ResourceRegistry
 */
export class DefaultResourceRegistry implements ResourceRegistry {
  private handlers = new Map<string, ResourceHandler>();

  register(pattern: string, handler: ResourceHandler): void {
    logger.debug('Registering resource handler', {
      pattern,
      handlerType: handler.constructor.name,
    });
    this.handlers.set(pattern, handler);
  }

  resolve(uri: string): ResourceHandler | undefined {
    // Simple pattern matching - could be enhanced with regex patterns
    for (const [pattern, handler] of this.handlers.entries()) {
      if (uri.includes(pattern)) {
        logger.debug('Resolved resource handler', { uri, pattern });
        return handler;
      }
    }

    logger.debug('No resource handler found for URI', { uri });
    return undefined;
  }
}

/**
 * Create and configure the default resource registry with all standard handlers
 */
export function createResourceRegistry(): ResourceRegistry {
  const registry = new DefaultResourceRegistry();

  // Register all standard resource handlers
  registry.register('plan://current', new DevelopmentPlanResourceHandler());
  registry.register('state://current', new ConversationStateResourceHandler());
  registry.register('workflow://', new WorkflowResourceHandler());
  registry.register('system-prompt://', new SystemPromptResourceHandler());

  logger.info('Resource registry created with handlers', {
    patterns: [
      'plan://current',
      'state://current',
      'workflow://',
      'system-prompt://',
    ],
  });

  return registry;
}

// Export all handler types for external use
export { DevelopmentPlanResourceHandler } from './development-plan.js';
export { ConversationStateResourceHandler } from './conversation-state.js';
export { WorkflowResourceHandler } from './workflow-resource.js';
export { SystemPromptResourceHandler } from './system-prompt.js';
