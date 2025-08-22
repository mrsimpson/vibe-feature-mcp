/**
 * Get Tool Info Handler
 *
 * Provides comprehensive information about the responsible-vibe-mcp development
 * workflow tools for better tool discoverability and AI integration.
 */

import { z } from 'zod';
import { BaseToolHandler } from './base-tool-handler.js';
import { ServerContext } from '../types.js';
import { createLogger } from '../../logger.js';

const logger = createLogger('GetToolInfoHandler');

/**
 * Schema for get_tool_info tool arguments
 */
const GetToolInfoArgsSchema = z.object({
  // No input parameters needed
});

type GetToolInfoArgs = z.infer<typeof GetToolInfoArgsSchema>;

/**
 * Tool information structure
 */
interface ToolInfo {
  name: string;
  description: string;
  parameters: string[];
  schema?: {
    required: string[];
    optional: string[];
  };
}

/**
 * Workflow information structure
 */
interface WorkflowInfo {
  name: string;
  displayName: string;
  description: string;
  phases?: string[];
}

/**
 * Complete tool information response
 */
interface GetToolInfoResponse {
  tool_name: string;
  version: string;
  purpose: string;
  description: string;

  available_tools: ToolInfo[];
  available_workflows: WorkflowInfo[];

  core_concepts: {
    phase_management: string;
    plan_file_tracking: string;
    conversation_context: string;
    workflow_guidance: string;
  };

  usage_guidelines: {
    required_pattern: string;
    phase_transitions: string;
    context_requirements: string;
    plan_file_management: string;
  };

  workflow_states?: {
    current_phase?: string;
    conversation_id?: string;
    plan_file_path?: string;
  };
}

/**
 * Tool handler for providing comprehensive tool information
 */
export class GetToolInfoHandler extends BaseToolHandler<
  GetToolInfoArgs,
  GetToolInfoResponse
> {
  protected readonly argsSchema = GetToolInfoArgsSchema;

  async executeHandler(
    args: GetToolInfoArgs,
    context: ServerContext
  ): Promise<GetToolInfoResponse> {
    logger.info('Generating comprehensive tool information', {
      projectPath: context.projectPath,
    });

    // Get available workflows
    const availableWorkflows =
      context.workflowManager.getAvailableWorkflowsForProject(
        context.projectPath
      );

    // Transform workflows to response format
    const workflows: WorkflowInfo[] = availableWorkflows.map(workflow => ({
      name: workflow.name,
      displayName: workflow.displayName,
      description: workflow.description,
      phases: this.extractWorkflowPhases(workflow),
    }));

    // Define available tools with their information
    const tools: ToolInfo[] = [
      {
        name: 'start_development',
        description:
          'Initialize new development project with structured workflow',
        parameters: ['workflow', 'commit_behaviour'],
        schema: {
          required: ['commit_behaviour'],
          optional: ['workflow'],
        },
      },
      {
        name: 'whats_next',
        description:
          'Get phase-specific instructions and guidance for current development state',
        parameters: [
          'context',
          'user_input',
          'conversation_summary',
          'recent_messages',
        ],
        schema: {
          required: ['context', 'user_input'],
          optional: ['conversation_summary', 'recent_messages'],
        },
      },
      {
        name: 'proceed_to_phase',
        description:
          'Transition to the next development phase when current phase is complete',
        parameters: ['target_phase', 'reason'],
        schema: {
          required: ['target_phase'],
          optional: ['reason'],
        },
      },
      {
        name: 'resume_workflow',
        description:
          'Continue development after a break or conversation restart',
        parameters: ['include_system_prompt'],
        schema: {
          required: [],
          optional: ['include_system_prompt'],
        },
      },
      {
        name: 'reset_development',
        description:
          'Start over with a clean slate by deleting all development progress',
        parameters: ['confirm', 'reason'],
        schema: {
          required: ['confirm'],
          optional: ['reason'],
        },
      },
      {
        name: 'list_workflows',
        description:
          'Get an overview of all available workflows with descriptions',
        parameters: [],
        schema: {
          required: [],
          optional: [],
        },
      },
      {
        name: 'get_tool_info',
        description:
          'Get comprehensive information about all available tools and workflows',
        parameters: [],
        schema: {
          required: [],
          optional: [],
        },
      },
    ];

    // Try to get current workflow state if available
    let workflowState: GetToolInfoResponse['workflow_states'] = undefined;
    try {
      const conversationContext =
        await context.conversationManager.getConversationContext();
      workflowState = {
        current_phase: conversationContext.currentPhase,
        conversation_id: conversationContext.conversationId,
        plan_file_path: conversationContext.planFilePath,
      };
    } catch (error) {
      // No active conversation - this is fine
      logger.debug('No active conversation found for workflow state', {
        error,
      });
    }

    // Build the complete response
    const response: GetToolInfoResponse = {
      tool_name: 'Responsible Vibe MCP - Development Workflow Management',
      version: '1.0.0', // This should ideally come from package.json
      purpose:
        'Structured development workflows with guided phase transitions and conversation state management',
      description:
        'A Model Context Protocol server that acts as an intelligent conversation state manager and development guide for LLMs, providing structured workflows for various development tasks including bug fixes, features, architecture documentation, and more.',

      available_tools: tools,
      available_workflows: workflows,

      core_concepts: {
        phase_management:
          'Structured progression through development phases with entrance criteria and transition conditions',
        plan_file_tracking:
          'Maintains development state and progress in .vibe/development-plan-*.md files with task tracking',
        conversation_context:
          'Stateless operation requiring context in each whats_next() call for proper guidance',
        workflow_guidance:
          'Provides phase-specific instructions and recommendations based on current development state',
      },

      usage_guidelines: {
        required_pattern:
          'Always call whats_next() after user interactions to get context-appropriate guidance',
        phase_transitions:
          'Only proceed to next phase when entrance criteria are met and current phase tasks are complete',
        context_requirements:
          'Provide conversation history and context in whats_next() calls for optimal guidance',
        plan_file_management:
          'Update plan file with completed tasks [x] and add new tasks as they are identified',
      },
    };

    // Add workflow state if available
    if (workflowState) {
      response.workflow_states = workflowState;
    }

    logger.info('Successfully generated tool information', {
      toolCount: tools.length,
      workflowCount: workflows.length,
      hasWorkflowState: !!workflowState,
    });

    return response;
  }

  /**
   * Extract phase names from a workflow configuration
   */
  private extractWorkflowPhases(workflowInfo: unknown): string[] | undefined {
    if (
      workflowInfo &&
      typeof workflowInfo === 'object' &&
      'states' in workflowInfo &&
      workflowInfo.states &&
      typeof workflowInfo.states === 'object'
    ) {
      return Object.keys(workflowInfo.states);
    }
    return undefined;
  }
}

// Export type for external use
export type { GetToolInfoArgs, GetToolInfoResponse };
