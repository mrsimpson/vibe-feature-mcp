/**
 * Workflow Resource Handler
 * 
 * Handles MCP resources for individual workflows, returning the raw YAML content
 * from workflow definition files.
 */

import fs from 'fs';
import path from 'path';
import { createLogger } from '../../logger.js';
import { ResourceHandler, ServerContext, HandlerResult, ResourceContent } from '../types.js';
import { safeExecute } from '../server-helpers.js';

const logger = createLogger('WorkflowResourceHandler');

/**
 * Resource handler for workflow:// URIs
 * Returns raw YAML content from workflow definition files
 */
export class WorkflowResourceHandler implements ResourceHandler {
  
  async handle(uri: URL, context: ServerContext): Promise<HandlerResult<ResourceContent>> {
    logger.debug('Processing workflow resource request', { uri: uri.href });

    return safeExecute(async () => {
      // Extract workflow name from URI (workflow://workflow-name)
      const workflowName = uri.hostname;
      
      if (!workflowName) {
        throw new Error('Invalid workflow URI: missing workflow name. Expected: workflow://workflow-name');
      }

      logger.info('Loading workflow resource', { workflowName, uri: uri.href });

      let yamlContent: string;
      let filePath: string;

      // Handle custom workflow
      if (workflowName === 'custom') {
        const customFilePaths = [
          path.join(context.projectPath, '.vibe', 'workflow.yaml'),
          path.join(context.projectPath, '.vibe', 'workflow.yml')
        ];

        let customFile: string | null = null;
        for (const customPath of customFilePaths) {
          if (fs.existsSync(customPath)) {
            customFile = customPath;
            break;
          }
        }

        if (!customFile) {
          throw new Error('Custom workflow file not found. Expected .vibe/workflow.yaml or .vibe/workflow.yml');
        }

        filePath = customFile;
        yamlContent = fs.readFileSync(customFile, 'utf-8');

      } else {
        // Handle predefined workflows
        // Get the workflows directory path - more reliable approach
        const currentFileUrl = import.meta.url;
        const currentFilePath = new URL(currentFileUrl).pathname;
        
        // Navigate from the compiled location to the project root
        // From dist/server/resource-handlers/workflow-resource.js -> project root
        let projectRoot: string;
        if (currentFilePath.includes('/dist/')) {
          // Running from compiled code - dist is one level down from project root
          projectRoot = path.resolve(path.dirname(currentFilePath), '../../../');
        } else {
          // Running from source (development) - src is one level down from project root  
          projectRoot = path.resolve(path.dirname(currentFilePath), '../../../');
        }
        
        const workflowFile = path.join(projectRoot, 'resources', 'workflows', `${workflowName}.yaml`);

        if (!fs.existsSync(workflowFile)) {
          // Try .yml extension
          const workflowFileYml = path.join(projectRoot, 'resources', 'workflows', `${workflowName}.yml`);
          if (!fs.existsSync(workflowFileYml)) {
            // Log debug info to help troubleshoot
            logger.error('Workflow file not found', new Error(`Workflow '${workflowName}' not found`), {
              workflowName,
              currentFilePath,
              projectRoot,
              workflowFile,
              workflowFileYml,
              workflowsDir: path.join(projectRoot, 'resources', 'workflows'),
              workflowsDirExists: fs.existsSync(path.join(projectRoot, 'resources', 'workflows'))
            });
            throw new Error(`Workflow '${workflowName}' not found in resources/workflows/`);
          }
          filePath = workflowFileYml;
        } else {
          filePath = workflowFile;
        }

        yamlContent = fs.readFileSync(filePath, 'utf-8');
      }

      logger.info('Successfully loaded workflow resource', { 
        workflowName, 
        filePath,
        contentLength: yamlContent.length 
      });

      return {
        uri: uri.href,
        text: yamlContent,
        mimeType: 'application/x-yaml'
      };

    }, `Failed to load workflow resource: ${uri.href}`);
  }
}
