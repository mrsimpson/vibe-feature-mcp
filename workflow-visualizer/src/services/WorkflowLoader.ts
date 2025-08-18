/**
 * Workflow loading service
 * Handles loading workflows from built-in resources and uploaded files
 */

import { YamlStateMachine, WorkflowMetadata, AppError } from '../types/ui-types';
import { YamlParser } from './YamlParser';
import { getBundledWorkflow, getBundledWorkflowNames } from './BundledWorkflows';

export class WorkflowLoader {
  private readonly yamlParser: YamlParser;
  
  // Workflow display names and descriptions (can be extended as needed)
  private readonly WORKFLOW_METADATA: Record<string, { displayName: string; description: string }> = {
    waterfall: {
      displayName: 'Waterfall',
      description: 'Classical waterfall development process'
    },
    epcc: {
      displayName: 'EPCC',
      description: 'Explore, Plan, Code, Commit workflow'
    },
    bugfix: {
      displayName: 'Bug Fix',
      description: 'Focused workflow for bug fixing'
    },
    minor: {
      displayName: 'Minor Enhancement',
      description: 'Streamlined workflow for small changes'
    },
    greenfield: {
      displayName: 'Greenfield',
      description: 'Comprehensive workflow for new projects'
    },
    slides: {
      displayName: 'Slides',
      description: 'Workflow for creating presentations'
    },
    posts: {
      displayName: 'Posts',
      description: 'Workflow for writing blog posts and content'
    },
    // Add fallback for any other workflows
    bugfix3: {
      displayName: 'Bug Fix 3',
      description: 'Test workflow - copy of bugfix for testing dynamic discovery'
    }
  };

  constructor() {
    this.yamlParser = new YamlParser();
  }

  /**
   * Get list of available built-in workflows (dynamically generated)
   */
  public getAvailableWorkflows(): WorkflowMetadata[] {
    const workflowNames = getBundledWorkflowNames();
    
    return workflowNames.map(name => {
      const metadata = this.WORKFLOW_METADATA[name];
      return {
        name,
        displayName: metadata?.displayName || this.formatDisplayName(name),
        description: metadata?.description || `${this.formatDisplayName(name)} workflow`,
        source: 'builtin'
      };
    });
  }

  /**
   * Format a workflow name into a display name
   */
  private formatDisplayName(name: string): string {
    return name
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Load a built-in workflow by name
   */
  public async loadBuiltinWorkflow(workflowName: string): Promise<YamlStateMachine> {
    const availableWorkflows = this.getAvailableWorkflows();
    const workflowMetadata = availableWorkflows.find(w => w.name === workflowName);
    
    if (!workflowMetadata) {
      throw this.createNetworkError(`Unknown workflow: ${workflowName}`);
    }

    try {
      const yamlContent = getBundledWorkflow(workflowName);
      
      if (!yamlContent) {
        throw this.createNetworkError(`Bundled workflow "${workflowName}" not found`);
      }
      
      if (!yamlContent.trim()) {
        throw this.createNetworkError(`Workflow file "${workflowName}" is empty`);
      }

      const workflow = this.yamlParser.parseWorkflow(yamlContent);
      
      return workflow;
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
