/**
 * Workflow Manager
 * 
 * Manages multiple predefined workflows and provides workflow discovery and selection
 */

import fs from 'fs';
import path from 'path';
import { createLogger } from './logger.js';
import { StateMachineLoader } from './state-machine-loader.js';
import { YamlStateMachine } from './state-machine-types.js';

const logger = createLogger('WorkflowManager');

export interface WorkflowInfo {
  name: string;
  displayName: string;
  description: string;
  initialState: string;
  phases: string[];
}

/**
 * Manages predefined workflows and provides workflow discovery
 */
export class WorkflowManager {
  private predefinedWorkflows: Map<string, YamlStateMachine> = new Map();
  private workflowInfos: Map<string, WorkflowInfo> = new Map();
  private stateMachineLoader: StateMachineLoader;

  constructor() {
    this.stateMachineLoader = new StateMachineLoader();
    this.loadPredefinedWorkflows();
  }

  /**
   * Get all available predefined workflows
   */
  public getAvailableWorkflows(): WorkflowInfo[] {
    return Array.from(this.workflowInfos.values());
  }

  /**
   * Get available workflows for a specific project
   * Filters out 'custom' workflow if no custom workflow file exists
   */
  public getAvailableWorkflowsForProject(projectPath: string): WorkflowInfo[] {
    const allWorkflows = this.getAvailableWorkflows();
    
    // Check if custom workflow file exists
    const hasCustomWorkflow = this.validateWorkflowName('custom', projectPath);
    
    if (!hasCustomWorkflow) {
      // Filter out custom workflow if no custom file exists
      return allWorkflows.filter(w => w.name !== 'custom');
    }
    
    return allWorkflows;
  }

  /**
   * Get workflow information by name
   */
  public getWorkflowInfo(name: string): WorkflowInfo | undefined {
    return this.workflowInfos.get(name);
  }

  /**
   * Get a specific workflow by name
   */
  public getWorkflow(name: string): YamlStateMachine | undefined {
    return this.predefinedWorkflows.get(name);
  }

  /**
   * Check if a workflow name is a predefined workflow
   */
  public isPredefinedWorkflow(name: string): boolean {
    return this.predefinedWorkflows.has(name);
  }

  /**
   * Get workflow names as enum values for tool schema
   */
  public getWorkflowNames(): string[] {
    return Array.from(this.predefinedWorkflows.keys());
  }

  /**
   * Load a workflow (predefined or custom) for a project
   */
  public loadWorkflowForProject(projectPath: string, workflowName?: string): YamlStateMachine {
    // If no workflow specified, check for custom workflow first, then default to waterfall
    if (!workflowName) {
      // Default to waterfall
      workflowName = 'waterfall';
    }

    // If workflow name is 'custom', try to load custom workflow
    // Check for custom workflow in project
      const customFilePaths = [
        path.join(projectPath, '.vibe', 'state-machine.yaml'),
        path.join(projectPath, '.vibe', 'state-machine.yml')
      ];

      try {
        for (const filePath of customFilePaths) {
          if (fs.existsSync(filePath)) {
            logger.info('Loading custom workflow from project', { filePath });
            return this.stateMachineLoader.loadFromFile(filePath);
          }
        }
      } catch (error) {
        logger.warn('Could not load custom state machine:', error as Error)
        logger.info('Falling back to default workflow', { workflowName: 'waterfall' })

        workflowName = 'waterfall';
      }


    // If it's a predefined workflow, return it
    if (this.isPredefinedWorkflow(workflowName)) {
      const workflow = this.getWorkflow(workflowName);
      if (workflow) {
        logger.info('Loading predefined workflow', { workflowName });
        return workflow;
      }
    }

    throw new Error(`Unknown workflow: ${workflowName}`);
  }

  /**
   * Load all predefined workflows from resources/workflows directory
   */
  private loadPredefinedWorkflows(): void {
    try {
      // Get the workflows directory path - more reliable approach
      const currentFileUrl = import.meta.url;
      const currentFilePath = new URL(currentFileUrl).pathname;
      
      // Navigate from the compiled location to the project root
      let projectRoot: string;
      if (currentFilePath.includes('/dist/')) {
        // Running from compiled code - dist is one level down from project root
        projectRoot = path.resolve(path.dirname(currentFilePath), '../');
      } else {
        // Running from source (development) - src is one level down from project root
        projectRoot = path.resolve(path.dirname(currentFilePath), '../');
      }
      
      const workflowsDir = path.join(projectRoot, 'resources', 'workflows');

      if (!fs.existsSync(workflowsDir)) {
        logger.warn('Workflows directory not found', { workflowsDir });
        return;
      }

      // Read all YAML files in the workflows directory
      const files = fs.readdirSync(workflowsDir);
      const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

      logger.info('Loading predefined workflows', {
        workflowsDir,
        yamlFiles: yamlFiles.length
      });

      for (const file of yamlFiles) {
        try {
          const filePath = path.join(workflowsDir, file);
          const workflow = this.stateMachineLoader.loadFromFile(filePath);

          // Use filename without extension as workflow name
          const workflowName = path.basename(file, path.extname(file));

          // Store the workflow
          this.predefinedWorkflows.set(workflowName, workflow);

          // Create workflow info
          const workflowInfo: WorkflowInfo = {
            name: workflowName,
            displayName: workflow.name,
            description: workflow.description,
            initialState: workflow.initial_state,
            phases: Object.keys(workflow.states)
          };

          this.workflowInfos.set(workflowName, workflowInfo);

          logger.info('Loaded predefined workflow', {
            name: workflowName,
            displayName: workflow.name,
            phases: workflowInfo.phases.length
          });

        } catch (error) {
          logger.error('Failed to load workflow file', error as Error, {
            file
          });
        }
      }

      logger.info('Predefined workflows loaded', {
        count: this.predefinedWorkflows.size,
        workflows: Array.from(this.predefinedWorkflows.keys())
      });

    } catch (error) {
      logger.error('Failed to load predefined workflows', error as Error);
    }
  }

  /**
   * Validate a workflow name
   */
  public validateWorkflowName(workflowName: string, projectPath: string): boolean {
    // Check if it's a predefined workflow
    if (this.isPredefinedWorkflow(workflowName)) {
      return true;
    }

    // Check if it's 'custom' and custom workflow exists
    if (workflowName === 'custom') {
      const customFilePaths = [
        path.join(projectPath, '.vibe', 'state-machine.yaml'),
        path.join(projectPath, '.vibe', 'state-machine.yml')
      ];

      return customFilePaths.some(filePath => fs.existsSync(filePath));
    }

    return false;
  }
}
