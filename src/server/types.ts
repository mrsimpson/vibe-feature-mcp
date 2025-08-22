/**
 * Core types and interfaces for the refactored server architecture
 */

import { ConversationManager } from '../conversation-manager.js';
import { TransitionEngine } from '../transition-engine.js';
import { PlanManager } from '../plan-manager.js';
import { InstructionGenerator } from '../instruction-generator.js';
import { WorkflowManager } from '../workflow-manager.js';
import { InteractionLogger } from '../interaction-logger.js';

/**
 * Server context shared across all handlers
 * Contains all the core dependencies needed by tool and resource handlers
 */
export interface ServerContext {
  conversationManager: ConversationManager;
  transitionEngine: TransitionEngine;
  planManager: PlanManager;
  instructionGenerator: InstructionGenerator;
  workflowManager: WorkflowManager;
  interactionLogger?: InteractionLogger;
  projectPath: string;
}

/**
 * Standard result format for all handler operations
 * Separates business logic results from MCP protocol concerns
 */
export interface HandlerResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Resource content structure
 */
export interface ResourceContent {
  uri: string;
  text: string;
  mimeType: string;
}

/**
 * MCP Tool Response format (compatible with MCP SDK)
 */
export interface McpToolResponse {
  [x: string]: unknown;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * MCP Resource Response format (compatible with MCP SDK)
 */
export interface McpResourceResponse {
  [x: string]: unknown;
  contents: Array<{
    uri: string;
    text: string;
    mimeType: string;
  }>;
}

/**
 * Tool handler interface
 * All tool handlers must implement this interface
 */
export interface ToolHandler<TArgs = unknown, TResult = unknown> {
  handle(args: TArgs, context: ServerContext): Promise<HandlerResult<TResult>>;
}

/**
 * Resource handler interface
 * All resource handlers must implement this interface
 */
export interface ResourceHandler {
  handle(
    uri: URL,
    context: ServerContext
  ): Promise<HandlerResult<ResourceContent>>;
}

/**
 * Response renderer interface
 * Handles translation between domain results and MCP protocol responses
 */
export interface ResponseRenderer {
  renderToolResponse<T>(result: HandlerResult<T>): McpToolResponse;
  renderResourceResponse(
    result: HandlerResult<ResourceContent>
  ): McpResourceResponse;
  renderError(error: Error | string): McpToolResponse;
}

/**
 * Tool registry interface
 * Manages registration and lookup of tool handlers
 */
export interface ToolRegistry {
  register<T extends ToolHandler>(name: string, handler: T): void;
  get(name: string): ToolHandler | undefined;
  list(): string[];
}

/**
 * Resource registry interface
 * Manages registration and lookup of resource handlers
 */
export interface ResourceRegistry {
  register(pattern: string, handler: ResourceHandler): void;
  resolve(uri: string): ResourceHandler | undefined;
}

/**
 * Server configuration options
 */
export interface ServerConfig {
  /** Project path to operate on (defaults to process.cwd()) */
  projectPath?: string;
  /** Database path override */
  databasePath?: string;
  /** Enable interaction logging */
  enableLogging?: boolean;
}
