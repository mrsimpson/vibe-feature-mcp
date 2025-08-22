/**
 * Server Configuration
 *
 * Handles server configuration, component initialization, and MCP server setup.
 * Centralizes the configuration logic that was previously scattered in the main server class.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

import { DEFAULT_WORKFLOW_NAME } from '../constants.js';

import { Database } from '../database.js';
import { ConversationManager } from '../conversation-manager.js';
import { TransitionEngine } from '../transition-engine.js';
import { InstructionGenerator } from '../instruction-generator.js';
import { PlanManager } from '../plan-manager.js';
import { InteractionLogger } from '../interaction-logger.js';
import { WorkflowManager } from '../workflow-manager.js';
import { GitManager } from '../git-manager.js';
import { TemplateManager } from '../template-manager.js';
import { createLogger } from '../logger.js';

import {
  ServerConfig,
  ServerContext,
  ToolRegistry,
  ResourceRegistry,
  ResponseRenderer,
} from './types.js';
import {
  normalizeProjectPath,
  buildWorkflowEnum,
  generateWorkflowDescription,
} from './server-helpers.js';

const logger = createLogger('ServerConfig');

/**
 * Build dynamic enum for template options
 */
// function buildTemplateEnum(templates: string[]): [string, ...string[]] {
//   if (templates.length === 0) {
//     return ['freestyle']; // Fallback if no templates found
//   }
//   return [templates[0], ...templates.slice(1)];
// }

/**
 * Generate template descriptions for MCP tool schema
 */
function _generateTemplateDescription(
  templates: string[],
  type: string
): string {
  if (templates.length === 0) {
    return `${type} documentation template format`;
  }

  const descriptions = templates
    .map(template => {
      // Try to provide meaningful descriptions based on template names
      switch (template) {
        case 'arc42':
          return 'arc42 (comprehensive software architecture template)';
        case 'ears':
          return 'ears (WHEN...THEN format)';
        case 'comprehensive':
          return 'comprehensive (full implementation guide with testing strategy)';
        case 'freestyle':
          return 'freestyle (flexible format)';
        case 'none':
          return 'none (placeholder - use plan file instead)';
        default:
          return `${template} (${template} format)`;
      }
    })
    .join(', ');

  return `${type} documentation template format. Options: ${descriptions}`;
}

/**
 * Server component container
 * Holds all the initialized server components
 */
export interface ServerComponents {
  mcpServer: McpServer;
  database: Database;
  context: ServerContext;
  toolRegistry: ToolRegistry;
  resourceRegistry: ResourceRegistry;
  responseRenderer: ResponseRenderer;
}

/**
 * Initialize all server components
 */
export async function initializeServerComponents(
  config: ServerConfig = {}
): Promise<ServerComponents> {
  logger.debug('Initializing server components', {
    config: JSON.stringify(config),
  });

  // Set project path with support for environment variable
  const projectPath = normalizeProjectPath(
    config.projectPath || process.env.PROJECT_PATH
  );

  logger.info('Using project path', {
    projectPath,
    source: config.projectPath
      ? 'config'
      : process.env.PROJECT_PATH
        ? 'env'
        : 'default',
  });

  // Initialize MCP server
  const mcpServer = new McpServer(
    {
      name: 'responsible-vibe-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        logging: {},
      },
    }
  );

  // Initialize core components
  logger.debug('Initializing core components');
  const database = new Database(projectPath);
  const conversationManager = new ConversationManager(database, projectPath);
  const transitionEngine = new TransitionEngine(projectPath);
  transitionEngine.setConversationManager(conversationManager);
  const planManager = new PlanManager();
  const instructionGenerator = new InstructionGenerator(planManager);
  const workflowManager = new WorkflowManager();

  // Conditionally create interaction logger
  const interactionLogger =
    config.enableLogging !== false
      ? new InteractionLogger(database)
      : undefined;

  // Create server context
  const context: ServerContext = {
    conversationManager,
    transitionEngine,
    planManager,
    instructionGenerator,
    workflowManager,
    interactionLogger,
    projectPath,
  };

  // Initialize database
  await database.initialize();

  logger.info('Server components initialized successfully');

  return {
    mcpServer,
    database,
    context,
    toolRegistry: null as unknown as ToolRegistry,
    resourceRegistry: null as unknown as ResourceRegistry,
    responseRenderer: null as unknown as ResponseRenderer,
  };
}

/**
 * Register MCP tools with the server
 */
export async function registerMcpTools(
  mcpServer: McpServer,
  toolRegistry: ToolRegistry,
  responseRenderer: ResponseRenderer,
  context: ServerContext
): Promise<void> {
  logger.debug('Registering MCP tools');

  // Register whats_next tool
  mcpServer.registerTool(
    'whats_next',
    {
      description:
        'Get guidance for the current development phase and determine what to work on next. Call this tool after each user message to receive phase-specific instructions and check if you should transition to the next development phase. The tool will reference your plan file for specific tasks and context.',
      inputSchema: {
        context: z
          .string()
          .optional()
          .describe(
            "Brief description of what you're currently working on or discussing with the user"
          ),
        user_input: z
          .string()
          .optional()
          .describe("The user's most recent message or request"),
        conversation_summary: z
          .string()
          .optional()
          .describe(
            'Summary of the development progress and key decisions made so far'
          ),
        recent_messages: z
          .array(
            z.object({
              role: z
                .enum(['user', 'assistant'])
                .describe('Who sent the message (user or assistant)'),
              content: z.string().describe('The message content'),
            })
          )
          .optional()
          .describe(
            'Recent conversation messages that provide context for the current development state'
          ),
      },
      annotations: {
        title: 'Development Phase Analyzer',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async args => {
      const handler = toolRegistry.get('whats_next');
      if (!handler) {
        return responseRenderer.renderError(
          'Tool handler not found: whats_next'
        );
      }

      const result = await handler.handle(args, context);
      return responseRenderer.renderToolResponse(result);
    }
  );

  // Register proceed_to_phase tool
  mcpServer.registerTool(
    'proceed_to_phase',
    {
      description:
        'Move to a specific development phase when the current phase is complete. Use this tool to explicitly transition between phases. Check your plan file to see available phases for the current workflow. Only transition when current phase tasks are finished and user confirms readiness.',
      inputSchema: {
        target_phase: z
          .string()
          .describe(
            'The development phase to move to. Check your plan file section headers to see available phases for the current workflow'
          ),
        reason: z
          .string()
          .optional()
          .describe(
            'Why you\'re moving to this phase now (e.g., "requirements complete", "user approved design", "implementation finished")'
          ),
        review_state: z
          .enum(['not-required', 'pending', 'performed'])
          .describe(
            'Review state for transitions that require reviews. Use "not-required" when reviews are disabled, "pending" when review is needed, "performed" when review is complete.'
          ),
      },
      annotations: {
        title: 'Phase Transition Controller',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async args => {
      const handler = toolRegistry.get('proceed_to_phase');
      if (!handler) {
        return responseRenderer.renderError(
          'Tool handler not found: proceed_to_phase'
        );
      }

      const result = await handler.handle(args, context);
      return responseRenderer.renderToolResponse(result);
    }
  );

  // Register conduct_review tool
  mcpServer.registerTool(
    'conduct_review',
    {
      description:
        'Conduct a review of the current phase before proceeding to the next phase. This tool analyzes artifacts and decisions from the current phase using defined review perspectives. Use this tool when reviews are required before phase transitions.',
      inputSchema: {
        target_phase: z
          .string()
          .describe(
            'The target phase you want to transition to after the review is complete'
          ),
      },
      annotations: {
        title: 'Phase Review Conductor',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async args => {
      const handler = toolRegistry.get('conduct_review');
      if (!handler) {
        return responseRenderer.renderError(
          'Tool handler not found: conduct_review'
        );
      }

      const result = await handler.handle(args, context);
      return responseRenderer.renderToolResponse(result);
    }
  );

  // Register start_development tool with dynamic commit_behaviour description
  const isGitRepo = GitManager.isGitRepository(context.projectPath);
  const commitBehaviourDescription = isGitRepo
    ? 'Git commit behavior: "step" (commit after each step), "phase" (commit before phase transitions), "end" (final commit only), "none" (no automatic commits). Use "end" unless the user specifically requests different behavior.'
    : 'Git commit behavior: Use "none" as this is not a git repository. Other options ("step", "phase", "end") are not applicable for non-git projects.';

  mcpServer.registerTool(
    'start_development',
    {
      description:
        'Begin a new development project with a structured workflow. Choose from different development approaches (waterfall, bugfix, epcc) or use a custom workflow. This tool sets up the project plan and initializes the development process.',
      inputSchema: {
        workflow: z
          .enum(buildWorkflowEnum(context.workflowManager.getWorkflowNames()))
          .default(DEFAULT_WORKFLOW_NAME)
          .describe(
            generateWorkflowDescription(
              context.workflowManager.getAvailableWorkflows()
            )
          ),
        commit_behaviour: z
          .enum(['step', 'phase', 'end', 'none'])
          .describe(commitBehaviourDescription),
        require_reviews: z
          .boolean()
          .optional()
          .describe(
            'Whether to require reviews before phase transitions. When enabled, use conduct_review tool before proceeding to next phase.'
          ),
      },
      annotations: {
        title: 'Development Initializer',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async args => {
      const handler = toolRegistry.get('start_development');
      if (!handler) {
        return responseRenderer.renderError(
          'Tool handler not found: start_development'
        );
      }

      const result = await handler.handle(args, context);
      return responseRenderer.renderToolResponse(result);
    }
  );

  // Register resume_workflow tool
  mcpServer.registerTool(
    'resume_workflow',
    {
      description:
        'Continue development after a break or conversation restart. This tool provides complete project context, current development status, and next steps to seamlessly pick up where you left off. Use when starting a new conversation about an existing project.',
      inputSchema: {
        include_system_prompt: z
          .boolean()
          .optional()
          .describe(
            'Whether to include setup instructions for the assistant (default: true)'
          ),
      },
      annotations: {
        title: 'Workflow Resumption Assistant',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async args => {
      const handler = toolRegistry.get('resume_workflow');
      if (!handler) {
        return responseRenderer.renderError(
          'Tool handler not found: resume_workflow'
        );
      }

      const result = await handler.handle(args, context);
      return responseRenderer.renderToolResponse(result);
    }
  );

  // Register reset_development tool
  mcpServer.registerTool(
    'reset_development',
    {
      description:
        'Start over with a clean slate by deleting all development progress and conversation history. This permanently removes the project plan and resets the development state. Use when you want to completely restart the development approach for a project.',
      inputSchema: {
        confirm: z
          .boolean()
          .describe(
            'Must be true to execute reset - prevents accidental resets'
          ),
        reason: z
          .string()
          .optional()
          .describe('Optional reason for reset (for logging and audit trail)'),
      },
      annotations: {
        title: 'Development Reset Tool',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async args => {
      const handler = toolRegistry.get('reset_development');
      if (!handler) {
        return responseRenderer.renderError(
          'Tool handler not found: reset_development'
        );
      }

      const result = await handler.handle(args, context);
      return responseRenderer.renderToolResponse(result);
    }
  );

  // Register list_workflows tool
  mcpServer.registerTool(
    'list_workflows',
    {
      description:
        'Get an overview of all available workflows with their descriptions and resource URIs. Use this to understand what development workflows are available and access detailed workflow information through the provided resource URIs.',
      inputSchema: {
        // No input parameters needed
      },
      annotations: {
        title: 'Workflow Overview Tool',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async args => {
      const handler = toolRegistry.get('list_workflows');
      if (!handler) {
        return responseRenderer.renderError(
          'Tool handler not found: list_workflows'
        );
      }

      const result = await handler.handle(args, context);
      return responseRenderer.renderToolResponse(result);
    }
  );

  // Register get_tool_info tool
  mcpServer.registerTool(
    'get_tool_info',
    {
      description:
        'Get comprehensive information about the responsible-vibe-mcp development workflow tools for better tool discoverability and AI integration. Returns detailed information about all available tools, workflows, core concepts, and usage guidelines.',
      inputSchema: {
        // No input parameters needed
      },
      annotations: {
        title: 'Tool Information Provider',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async args => {
      const handler = toolRegistry.get('get_tool_info');
      if (!handler) {
        return responseRenderer.renderError(
          'Tool handler not found: get_tool_info'
        );
      }

      const result = await handler.handle(args, context);
      return responseRenderer.renderToolResponse(result);
    }
  );

  // Register setup_project_docs tool with enhanced file linking support
  const templateManager = new TemplateManager();
  const availableTemplates = await templateManager.getAvailableTemplates();

  mcpServer.registerTool(
    'setup_project_docs',
    {
      description:
        'Create project documentation artifacts (architecture.md, requirements.md, design.md) using configurable templates OR by linking existing files via symlinks. ' +
        'Each parameter accepts either a template name, a file path to an existing document, or "none" to disable that document type.\n\n' +
        '**Template Options:**\n' +
        `- Architecture: ${availableTemplates.architecture.join(', ')}\n` +
        `- Requirements: ${availableTemplates.requirements.join(', ')}\n` +
        `- Design: ${availableTemplates.design.join(', ')}\n\n` +
        '**File Path Examples:**\n' +
        '- `README.md` (project root)\n' +
        '- `docs/architecture.md` (relative path)\n' +
        '- `/absolute/path/to/requirements.txt`\n\n' +
        '**Disable Document Types:**\n' +
        '- Use `"none"` to create a placeholder that instructs LLM to use plan file instead\n' +
        '- Useful for users who prefer plan-file-only workflows\n\n' +
        '**Common Documentation Files:**\n' +
        '- README.md, ARCHITECTURE.md, DESIGN.md, REQUIREMENTS.md\n' +
        '- Files in docs/ folder\n\n' +
        '**Mixed Usage Examples:**\n' +
        '- `setup_project_docs({ architecture: "README.md", requirements: "none", design: "comprehensive" })`\n' +
        '- `setup_project_docs({ architecture: "arc42", requirements: "ears", design: "none" })`',
      inputSchema: {
        architecture: z
          .string()
          .describe(
            `Architecture documentation: template name (${availableTemplates.architecture.join(', ')}) OR file path to existing document`
          ),
        requirements: z
          .string()
          .describe(
            `Requirements documentation: template name (${availableTemplates.requirements.join(', ')}) OR file path to existing document`
          ),
        design: z
          .string()
          .describe(
            `Design documentation: template name (${availableTemplates.design.join(', ')}) OR file path to existing document`
          ),
      },
      annotations: {
        title: 'Project Documentation Setup Tool',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async args => {
      const handler = toolRegistry.get('setup_project_docs');
      if (!handler) {
        return responseRenderer.renderError(
          'Tool handler not found: setup_project_docs'
        );
      }

      const result = await handler.handle(args, context);
      return responseRenderer.renderToolResponse(result);
    }
  );

  logger.info('MCP tools registered successfully', {
    tools: toolRegistry.list(),
  });
}

/**
 * Register MCP resources with the server
 */
export function registerMcpResources(
  mcpServer: McpServer,
  resourceRegistry: ResourceRegistry,
  responseRenderer: ResponseRenderer,
  context: ServerContext
): void {
  logger.debug('Registering MCP resources');

  // Development plan resource
  mcpServer.resource(
    'development-plan',
    'plan://current',
    {
      name: 'Current Development Plan',
      description:
        'The active development plan document (markdown) that tracks project progress, tasks, and decisions. This file serves as long-term memory for the development process and should be continuously updated by the LLM.',
      mimeType: 'text/markdown',
    },
    async (uri: URL) => {
      const handler = resourceRegistry.resolve(uri.href);
      if (!handler) {
        const errorResult = responseRenderer.renderResourceResponse({
          success: false,
          error: 'Resource handler not found',
          data: {
            uri: uri.href,
            text: 'Error: Resource handler not found',
            mimeType: 'text/plain',
          },
        });
        return errorResult;
      }

      const result = await handler.handle(new URL(uri.href), context);
      return responseRenderer.renderResourceResponse(result);
    }
  );

  // Conversation state resource
  mcpServer.resource(
    'conversation-state',
    'state://current',
    {
      name: 'Current Conversation State',
      description:
        'Current conversation state and phase information (JSON) including conversation ID, project context, current development phase, and plan file location. Use this to understand the current state of the development workflow.',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const handler = resourceRegistry.resolve(uri.href);
      if (!handler) {
        const errorResult = responseRenderer.renderResourceResponse({
          success: false,
          error: 'Resource handler not found',
          data: {
            uri: uri.href,
            text: JSON.stringify(
              {
                error: 'Resource handler not found',
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
            mimeType: 'application/json',
          },
        });
        return errorResult;
      }

      const result = await handler.handle(new URL(uri.href), context);
      return responseRenderer.renderResourceResponse(result);
    }
  );

  // System prompt resource
  mcpServer.resource(
    'system-prompt',
    'system-prompt://',
    {
      name: 'System Prompt for LLM Integration',
      description:
        'Complete system prompt for LLM integration with responsible-vibe-mcp. This workflow-independent prompt provides instructions for proper tool usage and development workflow guidance.',
      mimeType: 'text/plain',
    },
    async (uri: URL) => {
      const handler = resourceRegistry.resolve(uri.href);
      if (!handler) {
        const errorResult = responseRenderer.renderResourceResponse({
          success: false,
          error: 'Resource handler not found',
          data: {
            uri: uri.href,
            text: 'Error: System prompt resource handler not found',
            mimeType: 'text/plain',
          },
        });
        return errorResult;
      }

      const result = await handler.handle(new URL(uri.href), context);
      return responseRenderer.renderResourceResponse(result);
    }
  );

  // Register workflow resource template
  const workflowTemplate = new ResourceTemplate('workflow://{name}', {
    list: async () => {
      // List all available workflows as resources
      const availableWorkflows =
        context.workflowManager.getAvailableWorkflowsForProject(
          context.projectPath
        );
      return {
        resources: availableWorkflows.map(workflow => ({
          uri: `workflow://${workflow.name}`,
          name: workflow.displayName,
          description: workflow.description,
          mimeType: 'application/x-yaml',
        })),
      };
    },
    complete: {
      name: async (value: string) => {
        // Provide completion for workflow names
        const availableWorkflows =
          context.workflowManager.getAvailableWorkflowsForProject(
            context.projectPath
          );
        return availableWorkflows
          .map(w => w.name)
          .filter(name => name.toLowerCase().includes(value.toLowerCase()));
      },
    },
  });

  mcpServer.resource(
    'workflows',
    workflowTemplate,
    {
      name: 'Workflow Definitions',
      description:
        'Access workflow definition files by name. Use the list_workflows tool to discover available workflows.',
      mimeType: 'application/x-yaml',
    },
    async (uri, _variables) => {
      const handler = resourceRegistry.resolve(uri.href);
      if (!handler) {
        throw new Error(`Workflow resource handler not found for ${uri.href}`);
      }

      const result = await handler.handle(uri, context);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load workflow resource');
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: result.data.mimeType,
            text: result.data.text,
          },
        ],
      };
    }
  );

  logger.info('MCP resources registered successfully', {
    resources: ['plan://current', 'state://current', 'system-prompt://'],
    resourceTemplates: ['workflow://{name}'],
  });
}
