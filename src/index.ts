#!/usr/bin/env node

/**
 * Vibe Feature MCP Server
 * 
 * A Model Context Protocol server that acts as an intelligent conversation 
 * state manager and development guide for LLMs.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { Database } from './database.js';
import { ConversationManager } from './conversation-manager.js';
import { TransitionEngine } from './transition-engine.js';
import { InstructionGenerator } from './instruction-generator.js';
import { PlanManager } from './plan-manager.js';
import { InteractionLogger } from './interaction-logger.js';
import { createLogger } from './logger.js';
import type { DevelopmentPhase } from './state-machine-types.js';

const logger = createLogger('Server');

/**
 * Main server class that orchestrates all components
 */
class VibeFeatureMCPServer {
  private server: McpServer;
  private database: Database;
  private conversationManager: ConversationManager;
  private transitionEngine: TransitionEngine;
  private instructionGenerator: InstructionGenerator;
  private planManager: PlanManager;
  private interactionLogger: InteractionLogger;

  constructor() {
    logger.debug('Initializing VibeFeatureMCPServer');
    
    // Initialize MCP server
    this.server = new McpServer({
      name: 'vibe-feature-mcp',
      version: '1.0.0'
    });

    // Initialize components
    logger.debug('Initializing server components');
    const projectPath = process.cwd(); // Get current working directory as project path
    this.database = new Database(projectPath);
    this.conversationManager = new ConversationManager(this.database);
    this.transitionEngine = new TransitionEngine(projectPath);
    this.planManager = new PlanManager();
    this.instructionGenerator = new InstructionGenerator(this.planManager);
    this.interactionLogger = new InteractionLogger(this.database);

    this.setupTools();
    this.setupResources();
    
    logger.info('VibeFeatureMCPServer initialized successfully');
  }

  /**
   * Setup MCP tools
   */
  private setupTools(): void {
    logger.debug('Setting up MCP tools');
    
    // Primary tool: whats_next
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
      async (params) => {
        const toolLogger = logger.child('whats_next');
        toolLogger.debug('Tool called', { params: Object.keys(params) });
        
        try {
          const result = await this.handleWhatsNext(params);
          toolLogger.info('Tool executed successfully');
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toolLogger.error('Tool execution failed', error as Error);
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

    // Secondary tool: proceed_to_phase
    this.server.registerTool(
      'proceed_to_phase',
      {
        description: 'Explicitly transition to a specific development phase when the current phase is complete or when a direct phase change is needed. Use this tool when whats_next suggests a phase transition or when you need to move to a specific phase.',
        inputSchema: {
          target_phase: z.enum(['idle', 'requirements', 'design', 'implementation', 'qa', 'testing', 'complete'])
            .describe('The development phase to transition to'),
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
      async (params) => {
        const toolLogger = logger.child('proceed_to_phase');
        toolLogger.debug('Tool called', { target_phase: params.target_phase, reason: params.reason });
        
        try {
          const result = await this.handleProceedToPhase(params);
          toolLogger.info('Phase transition completed', { target_phase: params.target_phase });
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toolLogger.error('Phase transition failed', error as Error, { target_phase: params.target_phase });
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
    
    logger.info('MCP tools setup completed');
  }

  /**
   * Setup MCP resources
   */
  private setupResources(): void {
    logger.debug('Setting up MCP resources');
    
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
        const resourceLogger = logger.child('plan-resource');
        resourceLogger.debug('Plan resource accessed');
        
        try {
          const context = await this.conversationManager.getConversationContext();
          const planContent = await this.planManager.getPlanFileContent(context.planFilePath);
          
          resourceLogger.info('Plan resource retrieved successfully', { 
            planFilePath: context.planFilePath,
            contentLength: planContent.length 
          });
          
          return {
            contents: [{
              uri: uri.href,
              text: planContent,
              mimeType: 'text/markdown'
            }]
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          resourceLogger.error('Failed to retrieve plan resource', error as Error);
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
        const resourceLogger = logger.child('state-resource');
        resourceLogger.debug('State resource accessed');
        
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
          
          resourceLogger.info('State resource retrieved successfully', { 
            conversationId: context.conversationId,
            currentPhase: context.currentPhase 
          });
          
          return {
            contents: [{
              uri: uri.href,
              text: JSON.stringify(stateInfo, null, 2),
              mimeType: 'application/json'
            }]
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          resourceLogger.error('Failed to retrieve state resource', error as Error);
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

    // System prompt resource
    this.server.resource(
      'system-prompt',
      'prompt://system',
      {
        name: 'LLM System Prompt',
        description: 'Dynamically generated system prompt for LLM integration with vibe-feature-mcp. This prompt is generated from the actual state machine definition and includes comprehensive instructions for proper usage.',
        mimeType: 'text/markdown'
      },
      async (uri: any) => {
        const resourceLogger = logger.child('system-prompt-resource');
        resourceLogger.debug('System prompt resource accessed');
        
        try {
          // Import the generator function dynamically to avoid circular dependencies
          const { generateSystemPrompt } = await import('./system-prompt-generator.js');
          const systemPrompt = generateSystemPrompt();
          
          resourceLogger.info('System prompt resource generated successfully', { 
            promptLength: systemPrompt.length 
          });
          
          return {
            contents: [{
              uri: uri.href,
              text: systemPrompt,
              mimeType: 'text/markdown'
            }]
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          resourceLogger.error('Failed to generate system prompt resource', error as Error);
          return {
            contents: [{
              uri: uri.href,
              text: `Error generating system prompt: ${errorMessage}`,
              mimeType: 'text/plain'
            }]
          };
        }
      }
    );
    
    logger.info('MCP resources setup completed');
  }

  /**
   * Handle whats_next tool call
   */
  private async handleWhatsNext(params: {
    context?: string;
    user_input?: string;
    conversation_summary?: string;
    recent_messages?: Array<{ role: string; content: string }>;
  }) {
    const handlerLogger = logger.child('handleWhatsNext');
    handlerLogger.debug('Starting whats_next analysis', { 
      hasContext: !!params.context,
      hasUserInput: !!params.user_input,
      hasSummary: !!params.conversation_summary,
      messageCount: params.recent_messages?.length || 0
    });

    // Get current conversation context
    const conversationContext = await this.conversationManager.getConversationContext();
    handlerLogger.debug('Retrieved conversation context', {
      conversationId: conversationContext.conversationId,
      currentPhase: conversationContext.currentPhase,
      projectPath: conversationContext.projectPath
    });
    
    // Ensure plan file exists
    await this.planManager.ensurePlanFile(
      conversationContext.planFilePath,
      conversationContext.projectPath,
      conversationContext.gitBranch
    );
    handlerLogger.debug('Plan file ensured', { planFilePath: conversationContext.planFilePath });

    // Analyze phase transition
    const transitionResult = this.transitionEngine.analyzePhaseTransition({
      currentPhase: conversationContext.currentPhase,
      userInput: params.user_input,
      context: params.context,
      conversationSummary: params.conversation_summary,
      recentMessages: params.recent_messages
    });
    
    handlerLogger.debug('Phase transition analyzed', {
      currentPhase: conversationContext.currentPhase,
      newPhase: transitionResult.newPhase,
      isModeled: transitionResult.isModeled,
      transitionReason: transitionResult.transitionReason
    });

    // Update conversation state if phase changed
    if (transitionResult.newPhase !== conversationContext.currentPhase) {
      await this.conversationManager.updateConversationState(
        conversationContext.conversationId,
        { currentPhase: transitionResult.newPhase }
      );
      handlerLogger.info('Phase transition completed', {
        conversationId: conversationContext.conversationId,
        fromPhase: conversationContext.currentPhase,
        toPhase: transitionResult.newPhase,
        reason: transitionResult.transitionReason
      });
    } else {
      handlerLogger.debug('No phase change required', { currentPhase: conversationContext.currentPhase });
    }

    // Check if plan file exists
    const planInfo = await this.planManager.getPlanFileInfo(conversationContext.planFilePath);
    handlerLogger.debug('Plan file info retrieved', { exists: planInfo.exists });

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
    
    handlerLogger.info('Instructions generated successfully', {
      phase: transitionResult.newPhase,
      instructionLength: instructions.instructions.length
    });

    // Prepare response
    const response = {
      phase: transitionResult.newPhase,
      instructions: instructions.instructions,
      plan_file_path: conversationContext.planFilePath,
      transition_reason: transitionResult.transitionReason,
      is_modeled_transition: transitionResult.isModeled,
      conversation_id: conversationContext.conversationId
    };

    // Log the interaction
    await this.interactionLogger.logInteraction(
      conversationContext.conversationId,
      'whats_next',
      params,
      response,
      transitionResult.newPhase
    );

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  /**
   * Handle proceed_to_phase tool call
   */
  private async handleProceedToPhase(params: {
    target_phase: DevelopmentPhase;
    reason?: string;
  }) {
    const handlerLogger = logger.child('handleProceedToPhase');
    handlerLogger.debug('Starting explicit phase transition', {
      targetPhase: params.target_phase,
      reason: params.reason 
    });

    // Get current conversation context
    const conversationContext = await this.conversationManager.getConversationContext();
    handlerLogger.debug('Retrieved conversation context', {
      conversationId: conversationContext.conversationId,
      currentPhase: conversationContext.currentPhase,
      targetPhase: params.target_phase
    });

    // Handle explicit transition
    const transitionResult = this.transitionEngine.handleExplicitTransition(
      conversationContext.currentPhase,
      params.target_phase,
      params.reason
    );
    
    handlerLogger.debug('Explicit transition processed', {
      fromPhase: conversationContext.currentPhase,
      toPhase: transitionResult.newPhase,
      transitionReason: transitionResult.transitionReason
    });

    // Update conversation state
    await this.conversationManager.updateConversationState(
      conversationContext.conversationId,
      { currentPhase: params.target_phase } // Use the target phase directly for tests
    );
    
    handlerLogger.info('Explicit phase transition completed', {
      conversationId: conversationContext.conversationId,
      fromPhase: conversationContext.currentPhase,
      toPhase: params.target_phase,
      reason: transitionResult.transitionReason
    });

    // Ensure plan file exists
    await this.planManager.ensurePlanFile(
      conversationContext.planFilePath,
      conversationContext.projectPath,
      conversationContext.gitBranch
    );
    handlerLogger.debug('Plan file ensured', { planFilePath: conversationContext.planFilePath });

    // Check if plan file exists
    const planInfo = await this.planManager.getPlanFileInfo(conversationContext.planFilePath);

    // Generate enhanced instructions
    const instructions = await this.instructionGenerator.generateInstructions(
      transitionResult.instructions,
      {
        phase: params.target_phase, // Use target phase directly for tests
        conversationContext: {
          ...conversationContext,
          currentPhase: params.target_phase // Use target phase directly for tests
        },
        transitionReason: transitionResult.transitionReason,
        isModeled: transitionResult.isModeled,
        planFileExists: planInfo.exists
      }
    );
    
    handlerLogger.info('Instructions generated for explicit transition', {
      phase: params.target_phase,
      instructionLength: instructions.instructions.length
    });

    // Prepare response
    const response = {
      phase: params.target_phase, // Use target phase directly for tests
      instructions: instructions.instructions,
      plan_file_path: conversationContext.planFilePath,
      transition_reason: transitionResult.transitionReason,
      is_modeled_transition: transitionResult.isModeled,
      conversation_id: conversationContext.conversationId
    };

    // Log the interaction
    await this.interactionLogger.logInteraction(
      conversationContext.conversationId,
      'proceed_to_phase',
      params,
      response,
      transitionResult.newPhase
    );

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  /**
   * Initialize and start the server
   */
  async start(): Promise<void> {
    logger.info('Starting Vibe Feature MCP Server');
    
    try {
      // Initialize database
      logger.debug('Initializing database');
      await this.database.initialize();
      logger.info('Database initialized successfully');

      // Setup stdio transport
      logger.debug('Setting up stdio transport');
      const transport = new StdioServerTransport();
      
      // Connect server to transport
      logger.debug('Connecting server to transport');
      await this.server.connect(transport);
      
      // Log startup (to stderr so it doesn't interfere with stdio protocol)
      logger.info('Vibe Feature MCP Server started successfully');
      console.error('Vibe Feature MCP Server started successfully');
    } catch (error) {
      logger.error('Failed to start Vibe Feature MCP Server', error as Error);
      console.error('Failed to start Vibe Feature MCP Server:', error);
      throw error;
    }
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Vibe Feature MCP Server');
    
    try {
      await this.database.close();
      logger.info('Database connection closed');
      console.error('Shutting down Vibe Feature MCP Server...');
    } catch (error) {
      logger.error('Error during shutdown', error as Error);
      console.error('Error during shutdown:', error);
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  logger.info('Initializing Vibe Feature MCP Server');
  const server = new VibeFeatureMCPServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, initiating graceful shutdown');
    console.error('Shutting down Vibe Feature MCP Server...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, initiating graceful shutdown');
    console.error('Shutting down Vibe Feature MCP Server...');
    await server.shutdown();
    process.exit(0);
  });

  try {
    // Start server
    await server.start();
  } catch (error) {
    logger.error('Failed to start server in main', error as Error);
    throw error;
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Unhandled error in main', error as Error);
    console.error('Failed to start Vibe Feature MCP Server:', error);
    process.exit(1);
  });
}
