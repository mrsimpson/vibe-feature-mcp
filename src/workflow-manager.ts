/**
 * Workflow Manager - Enhanced for custom workflow support
 * 
 * Key improvements:
 * - Support both .vibe/state-machine.yaml and .vibe/workflow.yaml
 * - Better error messages for custom workflows
 * - Enhanced validation and debugging
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
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

export class WorkflowManager {
  private predefinedWorkflows: Map<string, YamlStateMachine> = new Map();
  private workflowInfos: Map<string, WorkflowInfo> = new Map();
  private stateMachineLoader: StateMachineLoader;

  constructor() {
    this.stateMachineLoader = new StateMachineLoader();
    this.loadPredefinedWorkflows();
  }

  public getAvailableWorkflows(): WorkflowInfo[] {
    return Array.from(this.workflowInfos.values());
  }

  public getAvailableWorkflowsForProject(projectPath: string): WorkflowInfo[] {
    const allWorkflows = this.getAvailableWorkflows();
    const hasCustomWorkflow = this.validateWorkflowName('custom', projectPath);
    
    if (!hasCustomWorkflow) {
      return allWorkflows.filter(w => w.name !== 'custom');
    }
    
    return allWorkflows;
  }

  public getWorkflowInfo(name: string): WorkflowInfo | undefined {
    return this.workflowInfos.get(name);
  }

  public getWorkflow(name: string): YamlStateMachine | undefined {
    return this.predefinedWorkflows.get(name);
  }

  public isPredefinedWorkflow(name: string): boolean {
    return this.predefinedWorkflows.has(name);
  }

  public getWorkflowNames(): string[] {
    return Array.from(this.predefinedWorkflows.keys());
  }

  /**
   * ENHANCED: Load workflow with support for both file naming conventions
   */
  public loadWorkflowForProject(projectPath: string, workflowName?: string): YamlStateMachine {
    if (!workflowName) {
      workflowName = 'waterfall';
    }

    // ENHANCED: Handle custom workflows properly
    if (workflowName === 'custom') {
      // Support both documented and legacy file names
      const customFilePaths = [
        path.join(projectPath, '.vibe', 'state-machine.yaml'),
        path.join(projectPath, '.vibe', 'state-machine.yml'),
        path.join(projectPath, '.vibe', 'workflow.yaml'),
        path.join(projectPath, '.vibe', 'workflow.yml')
      ];

      for (const filePath of customFilePaths) {
        if (fs.existsSync(filePath)) {
          logger.info('Loading custom workflow from project', { filePath });
          return this.stateMachineLoader.loadFromFile(filePath);
        }
      }
      
      // ENHANCED: Better error message
      const relativeSearchPaths = customFilePaths.map(p => path.relative(projectPath, p));
      throw new Error(
        `Custom workflow requested but no custom workflow file found in project: ${projectPath}\n` +
        `Expected one of: ${relativeSearchPaths.join(', ')}\n\n` +
        `To fix this issue:\n` +
        `1. Create a custom workflow file (recommended: .vibe/state-machine.yaml)\n` +
        `2. Set VIBE_PROJECT_PATH environment variable to the correct project directory\n` +
        `3. Or use a predefined workflow instead`
      );
    }

    // Handle predefined workflows
    if (this.isPredefinedWorkflow(workflowName)) {
      const workflow = this.getWorkflow(workflowName);
      if (workflow) {
        logger.info('Loading predefined workflow', { workflowName });
        return workflow;
      }
    }

    throw new Error(`Unknown workflow: ${workflowName}. Available workflows: ${this.getWorkflowNames().join(', ')}, custom`);
  }

  /**
   * ENHANCED: Validate workflow with support for both file naming conventions
   */
  public validateWorkflowName(workflowName: string, projectPath: string): boolean {
    if (this.isPredefinedWorkflow(workflowName)) {
      return true;
    }

    if (workflowName === 'custom') {
      // ENHANCED: Support both file naming conventions
      const customFilePaths = [
        path.join(projectPath, '.vibe', 'state-machine.yaml'),
        path.join(projectPath, '.vibe', 'state-machine.yml'),
        path.join(projectPath, '.vibe', 'workflow.yaml'),
        path.join(projectPath, '.vibe', 'workflow.yml')
      ];

      const exists = customFilePaths.some(filePath => fs.existsSync(filePath));
      
      if (!exists) {
        logger.debug('Custom workflow validation failed - no custom workflow file found', {
          projectPath,
          searchedPaths: customFilePaths.map(p => path.relative(projectPath, p))
        });
      }
      
      return exists;
    }

    return false;
  }

  // Rest of the methods remain the same as original...
  private findWorkflowsDirectory(): string | null {
    // Original implementation unchanged
    const currentFileUrl = import.meta.url;
    const currentFilePath = new URL(currentFileUrl).pathname;
    const strategies: string[] = [];
    
    strategies.push(path.resolve(path.dirname(currentFilePath), '../resources/workflows'));
    
    let currentDir = path.dirname(currentFilePath);
    for (let i = 0; i < 10; i++) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          if (packageJson.name === 'responsible-vibe-mcp') {
            strategies.push(path.join(currentDir, 'resources/workflows'));
            break;
          }
        } catch (error) {
          // Continue searching
        }
      }
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }

    strategies.push(path.join(process.cwd(), 'node_modules/responsible-vibe-mcp/resources/workflows'));
    
    if (process.env.NODE_PATH) {
      strategies.push(path.join(process.env.NODE_PATH, 'responsible-vibe-mcp/resources/workflows'));
    }

    const uniqueStrategies = [...new Set(strategies)].filter(p => p.trim() !== '/resources/workflows');

    for (const workflowsDir of uniqueStrategies) {
      if (fs.existsSync(workflowsDir)) {
        try {
          const files = fs.readdirSync(workflowsDir);
          const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
          if (yamlFiles.length > 0) {
            return workflowsDir;
          }
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  private loadPredefinedWorkflows(): void {
    try {
      const workflowsDir = this.findWorkflowsDirectory();

      if (!workflowsDir || !fs.existsSync(workflowsDir)) {
        logger.warn('Workflows directory not found', { workflowsDir });
        return;
      }

      const files = fs.readdirSync(workflowsDir);
      const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

      for (const file of yamlFiles) {
        try {
          const filePath = path.join(workflowsDir, file);
          const workflow = this.stateMachineLoader.loadFromFile(filePath);
          const workflowName = path.basename(file, path.extname(file));

          this.predefinedWorkflows.set(workflowName, workflow);

          const workflowInfo: WorkflowInfo = {
            name: workflowName,
            displayName: workflow.name,
            description: workflow.description,
            initialState: workflow.initial_state,
            phases: Object.keys(workflow.states)
          };

          this.workflowInfos.set(workflowName, workflowInfo);
        } catch (error) {
          logger.error('Failed to load workflow file', error as Error, { file });
        }
      }
    } catch (error) {
      logger.error('Failed to load predefined workflows', error as Error);
    }
  }
}