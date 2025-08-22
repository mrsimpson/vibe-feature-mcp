/**
 * List Workflows Tool Handler
 *
 * Provides an overview of all available workflows with their descriptions
 * and resource URIs for detailed information.
 */

import { z } from 'zod';
import { BaseToolHandler } from './base-tool-handler.js';
import { ServerContext } from '../types.js';
import { createLogger } from '../../logger.js';

const logger = createLogger('ListWorkflowsHandler');

/**
 * Schema for list_workflows tool arguments
 */
const ListWorkflowsArgsSchema = z.object({
  // No input parameters needed
});

type ListWorkflowsArgs = z.infer<typeof ListWorkflowsArgsSchema>;

/**
 * Response format for workflow information
 */
interface WorkflowOverview {
  name: string;
  displayName: string;
  description: string;
  resourceUri: string;
}

interface ListWorkflowsResponse {
  workflows: WorkflowOverview[];
}

/**
 * Tool handler for listing available workflows
 */
export class ListWorkflowsHandler extends BaseToolHandler<
  ListWorkflowsArgs,
  ListWorkflowsResponse
> {
  protected readonly argsSchema = ListWorkflowsArgsSchema;

  async executeHandler(
    args: ListWorkflowsArgs,
    context: ServerContext
  ): Promise<ListWorkflowsResponse> {
    logger.info('Listing available workflows', {
      projectPath: context.projectPath,
    });

    // Get workflows available for this project (filters custom workflow appropriately)
    const availableWorkflows =
      context.workflowManager.getAvailableWorkflowsForProject(
        context.projectPath
      );

    // Transform to response format with resource URIs
    const workflows: WorkflowOverview[] = availableWorkflows.map(workflow => ({
      name: workflow.name,
      displayName: workflow.displayName,
      description: workflow.description,
      resourceUri: `workflow://${workflow.name}`,
    }));

    const response: ListWorkflowsResponse = {
      workflows,
    };

    logger.info('Successfully listed workflows', {
      count: workflows.length,
      workflows: workflows.map(w => w.name),
    });

    return response;
  }
}
