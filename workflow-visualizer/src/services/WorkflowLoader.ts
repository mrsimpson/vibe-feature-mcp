/**
 * Workflow loading service
 * Handles loading workflows from built-in resources and uploaded files
 */

import { YamlStateMachine, WorkflowMetadata, AppError } from '../types/ui-types';
import { YamlParser } from './YamlParser';

export class WorkflowLoader {
  private readonly yamlParser: YamlParser;
  
  // Built-in workflow names (matching the files in public/workflows/)
  private readonly BUILTIN_WORKFLOWS: WorkflowMetadata[] = [
    {
      name: 'waterfall',
      displayName: 'Waterfall',
      description: 'Classical waterfall development process',
      source: 'builtin'
    },
    {
      name: 'epcc',
      displayName: 'EPCC',
      description: 'Explore, Plan, Code, Commit workflow',
      source: 'builtin'
    },
    {
      name: 'bugfix',
      displayName: 'Bug Fix',
      description: 'Focused workflow for bug fixing',
      source: 'builtin'
    },
    {
      name: 'minor',
      displayName: 'Minor Enhancement',
      description: 'Streamlined workflow for small changes',
      source: 'builtin'
    },
    {
      name: 'greenfield',
      displayName: 'Greenfield',
      description: 'Comprehensive workflow for new projects',
      source: 'builtin'
    },
    {
      name: 'slides',
      displayName: 'Slides',
      description: 'Workflow for creating presentations',
      source: 'builtin'
    }
  ];

  constructor() {
    this.yamlParser = new YamlParser();
  }

  /**
   * Get list of available built-in workflows
   */
  public getAvailableWorkflows(): WorkflowMetadata[] {
    return [...this.BUILTIN_WORKFLOWS];
  }

  /**
   * Load a built-in workflow by name
   */
  public async loadBuiltinWorkflow(workflowName: string): Promise<YamlStateMachine> {
    const workflowMetadata = this.BUILTIN_WORKFLOWS.find(w => w.name === workflowName);
    
    if (!workflowMetadata) {
      throw this.createNetworkError(`Unknown workflow: ${workflowName}`);
    }

    try {
      const response = await fetch(`/workflows/${workflowName}.yaml`);
      
      if (!response.ok) {
        throw this.createNetworkError(
          `Failed to load workflow "${workflowName}": ${response.status} ${response.statusText}`
        );
      }

      const yamlContent = await response.text();
      
      if (!yamlContent.trim()) {
        throw this.createNetworkError(`Workflow file "${workflowName}" is empty`);
      }

      return this.yamlParser.parseWorkflow(yamlContent);
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }
      
      if (error instanceof Error && error.message.includes('parsing')) {
        throw error;
      }

      throw this.createNetworkError(
        `Failed to load workflow "${workflowName}": ${String(error)}`
      );
    }
  }

  /**
   * Load a workflow from an uploaded file
   */
  public async loadUploadedWorkflow(file: File): Promise<YamlStateMachine> {
    try {
      // Validate file type
      if (!this.isValidYamlFile(file)) {
        throw this.createValidationError(
          'Invalid file type. Please upload a .yaml or .yml file.'
        );
      }

      // Validate file size (limit to 1MB)
      const maxSizeBytes = 1024 * 1024; // 1MB
      if (file.size > maxSizeBytes) {
        throw this.createValidationError(
          `File too large. Maximum size is ${maxSizeBytes / 1024 / 1024}MB.`
        );
      }

      // Read file content
      const yamlContent = await this.readFileAsText(file);
      
      if (!yamlContent.trim()) {
        throw this.createValidationError('Uploaded file is empty');
      }

      // Parse and validate the workflow
      return this.yamlParser.parseWorkflow(yamlContent);
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }
      
      if (error instanceof Error && error.message.includes('parsing')) {
        throw error;
      }

      throw this.createNetworkError(`Failed to process uploaded file: ${String(error)}`);
    }
  }

  /**
   * Check if the uploaded file is a valid YAML file
   */
  private isValidYamlFile(file: File): boolean {
    const validExtensions = ['.yaml', '.yml'];
    const fileName = file.name.toLowerCase();
    
    return validExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Read file content as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Create a validation error
   */
  private createValidationError(message: string): AppError {
    return {
      type: 'validation',
      message: message
    } as AppError;
  }

  /**
   * Create a network error
   */
  private createNetworkError(message: string): AppError {
    return {
      type: 'network',
      message: message
    } as AppError;
  }
}
