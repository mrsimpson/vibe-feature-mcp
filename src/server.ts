/**
 * Vibe Feature MCP Server Core
 * 
 * Separates the MCP server logic from transport layer to enable
 * both process-based and in-process testing.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { Database } from './database.js';
import { ConversationManager } from './conversation-manager.js';
import { TransitionEngine } from './transition-engine.js';
import { InstructionGenerator } from './instruction-generator.js';
import { PlanManager } from './plan-manager.js';
import { InteractionLogger } from './interaction-logger.js';
import { createLogger } from './logger.js';

const logger = createLogger('Server');

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

/**
 * Main server class that orchestrates all components
 * Can be used both as a standalone process and in-process for testing
 */
export class VibeFeatureMCPServer {
  private server: McpServer;
  private database: Database;
  private conversationManager: ConversationManager;
  private transitionEngine: TransitionEngine;
  private instructionGenerator: InstructionGenerator;
  private planManager: PlanManager;
  private interactionLogger?: InteractionLogger;
  private projectPath: string;

  constructor(config: ServerConfig = {}) {
    logger.debug('Initializing VibeFeatureMCPServer', config);
    
    // Set project path
    this.projectPath = config.projectPath || process.cwd();
    
    // Initialize MCP server
    this.server = new McpServer({
      name: 'vibe-feature-mcp',
      version: '1.0.0'
    });

    // Initialize components
    logger.debug('Initializing server components');
    this.database = new Database(this.projectPath);
    this.conversationManager = new ConversationManager(this.database, this.projectPath);
    this.transitionEngine = new TransitionEngine(this.projectPath);
    this.planManager = new PlanManager();
    this.instructionGenerator = new InstructionGenerator(this.planManager);
    
    // Conditionally create interaction logger
    if (config.enableLogging !== false) {
      this.interactionLogger = new InteractionLogger(this.database);
    }

    // Setup server handlers
    this.setupHandlers();
    
    logger.info('VibeFeatureMCPServer initialized successfully');
  }

  /**
   * Get the underlying MCP server instance
   * This allows for both transport-based and direct testing
   */
  public getMcpServer(): McpServer {
    return this.server;
  }

  /**
   * Get project path
   */
  public getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Get conversation manager (for testing)
   */
  public getConversationManager(): ConversationManager {
    return this.conversationManager;
  }

  /**
   * Get plan manager (for testing)
   */
  public getPlanManager(): PlanManager {
    return this.planManager;
  }

  /**
   * Setup all MCP server handlers
   */
  private setupHandlers(): void {
    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
  }

  /**
   * Setup tool handlers
   */
  private setupToolHandlers(): void {
    // whats_next tool
    this.server.registerTool(
      'whats_next',
      {
        description: 'Analyze conversation context and determine the next development phase with specific instructions for the LLM. This is the primary tool for orchestrating development workflow and should be called after each user interaction.',
        inputSchema: {
          context: z.string().optional().describe('Additional context about current conversation or situation'),
          user_input: z.string().optional().describe('Latest user input or request for analysis'),
          conversation_summary: z.string().optional().describe('LLM-provided summary of the conversation so far, including key decisions and progress made'),
          recent_messages: z.array(z.object({
            role: z.enum(['user', 'assistant']).describe('The role of the message sender'),
            content: z.string().describe('The content of the message')
          })).optional().describe('Array of recent conversation messages that LLM considers relevant for context')
        },
        annotations: {
          title: 'Development Phase Analyzer',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false
        }
      },
      async (args) => {
        try {
          const result = await this.handleWhatsNext(args);
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('whats_next tool execution failed', error as Error);
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${errorMessage}`
            }],
            isError: true
          };
        }
      }
    );

    // proceed_to_phase tool
    this.server.registerTool(
      'proceed_to_phase',
      {
        description: 'Explicitly transition to a specific development phase when the current phase is complete or when a direct phase change is needed. Use this tool when whats_next suggests a phase transition or when you need to move to a specific phase.',
        inputSchema: {
          target_phase: z.string().describe('The development phase to transition to'),
          reason: z.string().optional().describe('Optional reason for transitioning to this phase now (e.g., "requirements complete", "user requested", "design approved")')
        },
        annotations: {
          title: 'Phase Transition Controller',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      },
      async (args) => {
        try {
          const result = await this.handleProceedToPhase(args);
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('proceed_to_phase tool execution failed', error as Error);
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${errorMessage}`
            }],
            isError: true
          };
        }
      }
    );
  }

  /**
   * Setup resource handlers
   */
  private setupResourceHandlers(): void {
    // Development plan resource
    this.server.resource(
      'development-plan',
      'plan://current',
      {
        name: 'Current Development Plan',
        description: 'The active development plan document (markdown) that tracks project progress, tasks, and decisions. This file serves as long-term memory for the development process and should be continuously updated by the LLM.',
        mimeType: 'text/markdown'
      },
      async (uri: any) => {
        try {
          const context = await this.conversationManager.getConversationContext();
          const planContent = await this.planManager.getPlanFileContent(context.planFilePath);
          
          return {
            contents: [{
              uri: uri.href,
              text: planContent,
              mimeType: 'text/markdown'
            }]
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Failed to retrieve plan resource', error as Error);
          return {
            contents: [{
              uri: uri.href,
              text: `Error loading plan: ${errorMessage}`,
              mimeType: 'text/plain'
            }]
          };
        }
      }
    );

    // Conversation state resource
    this.server.resource(
      'conversation-state',
      'state://current',
      {
        name: 'Current Conversation State',
        description: 'Current conversation state and phase information (JSON) including conversation ID, project context, current development phase, and plan file location. Use this to understand the current state of the development workflow.',
        mimeType: 'application/json'
      },
      async (uri: any) => {
        try {
          const context = await this.conversationManager.getConversationContext();
          
          const stateInfo = {
            conversationId: context.conversationId,
            projectPath: context.projectPath,
            gitBranch: context.gitBranch,
            currentPhase: context.currentPhase,
            planFilePath: context.planFilePath,
            timestamp: new Date().toISOString(),
            description: 'Current state of the development workflow conversation'
          };
          
          return {
            contents: [{
              uri: uri.href,
              text: JSON.stringify(stateInfo, null, 2),
              mimeType: 'application/json'
            }]
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Failed to retrieve state resource', error as Error);
          return {
            contents: [{
              uri: uri.href,
              text: JSON.stringify({ 
                error: errorMessage,
                timestamp: new Date().toISOString()
              }, null, 2),
              mimeType: 'application/json'
            }]
          };
        }
      }
    );
  }

  /**
   * Setup prompt handlers
   */
  private setupPromptHandlers(): void {
    // TODO: Fix prompt handler implementation
    // Temporarily disabled due to API compatibility issues
  }

  /**
   * Handle whats_next tool calls
   * Made public for direct testing access
   */
  public async handleWhatsNext(args: any): Promise<any> {
    try {
      logger.debug('Processing whats_next request', args);
      
      const {
        context = '',
        user_input = '',
        conversation_summary = '',
        recent_messages = []
      } = args;

      // Get or create conversation
      const conversationContext = await this.conversationManager.getConversationContext();
      const conversationId = conversationContext.conversationId;
      const currentPhase = conversationContext.currentPhase;
      
      logger.debug('Current conversation state', { conversationId, currentPhase });

      // Ensure plan file exists
      await this.planManager.ensurePlanFile(
        conversationContext.planFilePath,
        conversationContext.projectPath,
        conversationContext.gitBranch
      );

      // Analyze phase transition
      const transitionResult = this.transitionEngine.analyzePhaseTransition({
        currentPhase,
        projectPath: conversationContext.projectPath,
        userInput: user_input,
        context,
        conversationSummary: conversation_summary,
        recentMessages: recent_messages
      });

      // Update conversation state if phase changed
      if (transitionResult.newPhase !== currentPhase) {
        await this.conversationManager.updateConversationState(
          conversationId,
          { currentPhase: transitionResult.newPhase }
        );
        logger.info('Phase transition completed', {
          from: currentPhase,
          to: transitionResult.newPhase,
          reason: transitionResult.transitionReason
        });
      }

      // Check if plan file exists
      const planInfo = await this.planManager.getPlanFileInfo(conversationContext.planFilePath);

      // Generate enhanced instructions
      const instructions = await this.instructionGenerator.generateInstructions(
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

      // Prepare response
      const response = {
        phase: transitionResult.newPhase,
        instructions: instructions.instructions,
        plan_file_path: conversationContext.planFilePath,
        transition_reason: transitionResult.transitionReason,
        is_modeled_transition: transitionResult.isModeled,
        conversation_id: conversationContext.conversationId
      };

      // Log interaction
      if (this.interactionLogger) {
        await this.interactionLogger.logInteraction(conversationId, 'whats_next', args, response, transitionResult.newPhase);
      }

      logger.debug('whats_next response generated', response);
      return response;

    } catch (error) {
      logger.error('whats_next tool execution failed', error as Error);
      throw error;
    }
  }

  /**
   * Handle proceed_to_phase tool calls
   * Made public for direct testing access
   */
  public async handleProceedToPhase(args: any): Promise<any> {
    try {
      logger.debug('Processing proceed_to_phase request', args);
      
      const { target_phase, reason = '' } = args;

      // Validate target phase
      if (!target_phase) {
        throw new Error('target_phase is required');
      }

      // Get current conversation state
      const conversationContext = await this.conversationManager.getConversationContext();
      const conversationId = conversationContext.conversationId;
      const currentPhase = conversationContext.currentPhase;

      // Perform explicit transition
      const transitionResult = this.transitionEngine.handleExplicitTransition(
        currentPhase,
        target_phase,
        conversationContext.projectPath,
        reason
      );

      // Update conversation state
      await this.conversationManager.updateConversationState(
        conversationId,
        { currentPhase: transitionResult.newPhase }
      );
      
      logger.info('Explicit phase transition completed', {
        from: currentPhase,
        to: transitionResult.newPhase,
        reason: transitionResult.transitionReason
      });

      // Ensure plan file exists
      await this.planManager.ensurePlanFile(
        conversationContext.planFilePath,
        conversationContext.projectPath,
        conversationContext.gitBranch
      );

      // Check if plan file exists
      const planInfo = await this.planManager.getPlanFileInfo(conversationContext.planFilePath);

      // Generate enhanced instructions
      const instructions = await this.instructionGenerator.generateInstructions(
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

      // Prepare response
      const response = {
        phase: transitionResult.newPhase,
        instructions: instructions.instructions,
        plan_file_path: conversationContext.planFilePath,
        transition_reason: transitionResult.transitionReason,
        is_modeled_transition: transitionResult.isModeled,
        conversation_id: conversationContext.conversationId
      };

      // Log interaction
      if (this.interactionLogger) {
        await this.interactionLogger.logInteraction(conversationId, 'proceed_to_phase', args, response, transitionResult.newPhase);
      }

      logger.debug('proceed_to_phase response generated', response);
      return response;

    } catch (error) {
      logger.error('proceed_to_phase tool execution failed', error as Error);
      throw error;
    }
  }

  /**
   * Initialize the server (setup database, etc.)
   */
  public async initialize(): Promise<void> {
    logger.debug('Initializing server components');
    await this.database.initialize();
    logger.info('Server initialization completed');
  }

  /**
   * Cleanup server resources
   */
  public async cleanup(): Promise<void> {
    logger.debug('Cleaning up server resources');
    if (this.database) {
      await this.database.close();
    }
    logger.info('Server cleanup completed');
  }
}
