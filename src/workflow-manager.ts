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
        path.join(projectPath, '.vibe', 'workflow.yaml'),
        path.join(projectPath, '.vibe', 'workflow.yml')
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
   * Find the workflows directory using multiple strategies
   * This handles both development and npm package deployment scenarios
   */
  private findWorkflowsDirectory(): string | null {
    const currentFileUrl = import.meta.url;
    const currentFilePath = new URL(currentFileUrl).pathname;
    
    // Strategy 1: Try relative to current file (works in development and some npm scenarios)
    const strategies = [
      // From dist/workflow-manager.js -> ../resources/workflows
      path.resolve(path.dirname(currentFilePath), '../resources/workflows'),
      // From src/workflow-manager.ts -> ../resources/workflows  
      path.resolve(path.dirname(currentFilePath), '../resources/workflows'),
      // From node_modules/responsible-vibe-mcp/dist/workflow-manager.js -> ../resources/workflows
      path.resolve(path.dirname(currentFilePath), '../resources/workflows'),
    ];

    // Strategy 2: Try to find package root by looking for package.json
    let currentDir = path.dirname(currentFilePath);
    for (let i = 0; i < 10; i++) { // Limit search depth
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          if (packageJson.name === 'responsible-vibe-mcp') {
            strategies.push(path.join(currentDir, 'resources/workflows'));
            break;
          }
        } catch (error) {
          // Ignore JSON parse errors and continue searching
        }
      }
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break; // Reached filesystem root
      currentDir = parentDir;
    }

    // Strategy 3: Try common npm installation paths
    const possibleNpmPaths = [
      // Global npm installation
      path.join(process.env.NODE_PATH || '', 'responsible-vibe-mcp/resources/workflows'),
      // Local node_modules
      path.join(process.cwd(), 'node_modules/responsible-vibe-mcp/resources/workflows'),
    ].filter(p => p.trim() !== '/resources/workflows'); // Filter out invalid paths

    strategies.push(...possibleNpmPaths);

    // Test each strategy
    for (const workflowsDir of strategies) {
      logger.debug('Trying workflows directory', { workflowsDir });
      if (fs.existsSync(workflowsDir)) {
        // Verify it contains workflow files
        try {
          const files = fs.readdirSync(workflowsDir);
          const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
          if (yamlFiles.length > 0) {
            logger.info('Found workflows directory', { 
              workflowsDir, 
              yamlFiles: yamlFiles.length 
            });
            return workflowsDir;
          }
        } catch (error) {
          // Directory exists but can't read it, continue to next strategy
          logger.debug('Cannot read workflows directory', { workflowsDir, error });
        }
      }
    }

    logger.error('Could not find workflows directory', new Error('Workflows directory not found'), { 
      strategiesCount: strategies.length,
      currentFilePath 
    });
    return null;
  }

  /**
   * Load all predefined workflows from resources/workflows directory
   */
  private loadPredefinedWorkflows(): void {
    try {
      const workflowsDir = this.findWorkflowsDirectory();

      if (!workflowsDir || !fs.existsSync(workflowsDir)) {
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
        path.join(projectPath, '.vibe', 'workflow.yaml'),
        path.join(projectPath, '.vibe', 'workflow.yml')
      ];

      return customFilePaths.some(filePath => fs.existsSync(filePath));
    }

    return false;
  }
}
