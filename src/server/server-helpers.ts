/**
 * Server Helper Functions
 * 
 * Common utility functions used across the server implementation.
 * These are pure functions that don't depend on server state.
 */

import { homedir } from 'os';
import { createLogger } from '../logger.js';
import { ServerConfig, ServerContext, HandlerResult } from './types.js';

const logger = createLogger('ServerHelpers');

/**
 * Normalize and validate project path
 * Ensures we have a valid project path, defaulting to home directory if needed
 */
export function normalizeProjectPath(projectPath?: string): string {
  const path = projectPath || process.cwd();
  
  if (path === '/' || path === '') {
    const homePath = homedir();
    logger.info('Invalid project path detected, using home directory', {
      originalPath: path,
      normalizedPath: homePath,
    });
    return homePath;
  }
  
  return path;
}

/**
 * Create a standardized success result
 */
export function createSuccessResult<T>(data: T, metadata?: Record<string, any>): HandlerResult<T> {
  return {
    success: true,
    data,
    metadata
  };
}

/**
 * Create a standardized error result
 */
export function createErrorResult(error: string | Error, metadata?: Record<string, any>): HandlerResult<never> {
  const errorMessage = error instanceof Error ? error.message : error;
  
  return {
    success: false,
    error: errorMessage,
    metadata
  };
}

/**
 * Safely execute an async operation and return a HandlerResult
 * This provides consistent error handling across all handlers
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  errorContext?: string
): Promise<HandlerResult<T>> {
  try {
    const result = await operation();
    return createSuccessResult(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const contextualError = errorContext 
      ? `${errorContext}: ${errorMessage}` 
      : errorMessage;
    
    logger.error('Operation failed', error as Error, { errorContext });
    return createErrorResult(contextualError);
  }
}

/**
 * Validate required arguments for tool handlers
 * Throws an error if any required arguments are missing
 */
export function validateRequiredArgs(args: any, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(field => 
    args[field] === undefined || args[field] === null
  );
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required arguments: ${missingFields.join(', ')}`);
  }
}

/**
 * Check if a conversation exists and provide helpful error if not
 */
export function createConversationNotFoundResult(): HandlerResult<never> {
  return createErrorResult(
    'No development conversation has been started for this project. Please use the start_development tool first to initialize development with a workflow.',
    {
      suggestion: 'start_development({ workflow: "waterfall" })',
      availableWorkflows: ['waterfall', 'epcc', 'bugfix', 'custom']
    }
  );
}

/**
 * Extract workflow names for enum generation
 * Used by server configuration to build Zod schemas
 */
export function buildWorkflowEnum(workflowNames: string[]): [string, ...string[]] {
  const allWorkflows = [...workflowNames, 'custom'];
  
  // Ensure we have at least one element for TypeScript
  if (allWorkflows.length === 0) {
    return ['waterfall'];
  }
  
  return allWorkflows as [string, ...string[]];
}

/**
 * Generate workflow description for tool schemas
 */
export function generateWorkflowDescription(workflows: Array<{ name: string; displayName: string; description: string }>): string {
  let description = 'Choose your development workflow:\n\n';
  
  for (const workflow of workflows) {
    description += `• **${workflow.name}**: ${workflow.displayName} - ${workflow.description}\n`;
  }
  
  description += '• **custom**: Use custom workflow from .vibe/workflow.yaml in your project\n\n';
  description += 'Default: waterfall (recommended for larger, design-heavy tasks)';
  
  return description;
}

/**
 * Log handler execution for debugging
 */
export function logHandlerExecution(handlerName: string, args: any): void {
  logger.debug(`Executing ${handlerName} handler`, { 
    handlerName, 
    argsKeys: Object.keys(args || {}) 
  });
}

/**
 * Log handler completion for debugging
 */
export function logHandlerCompletion(handlerName: string, result: HandlerResult<any>): void {
  logger.debug(`Completed ${handlerName} handler`, { 
    handlerName, 
    success: result.success,
    hasData: !!result.data,
    hasError: !!result.error
  });
}
