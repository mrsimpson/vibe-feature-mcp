/**
 * Setup Project Docs Handler
 * 
 * Creates project documentation artifacts (architecture.md, requirements.md, design.md)
 * using configurable templates. Supports different template formats for each document type.
 */

import { BaseToolHandler } from './base-tool-handler.js';
import { ServerContext } from '../types.js';
import { ProjectDocsManager } from '../../project-docs-manager.js';
import { TemplateOptions } from '../../template-manager.js';

export interface SetupProjectDocsArgs {
  architecture: 'arc42' | 'freestyle';
  requirements: 'ears' | 'freestyle';
  design: 'comprehensive' | 'freestyle';
}

export interface SetupProjectDocsResult {
  success: boolean;
  created: string[];
  skipped: string[];
  paths: {
    architecture: string;
    requirements: string;
    design: string;
  };
  message: string;
}

export class SetupProjectDocsHandler extends BaseToolHandler<SetupProjectDocsArgs, SetupProjectDocsResult> {
  private projectDocsManager: ProjectDocsManager;

  constructor() {
    super();
    this.projectDocsManager = new ProjectDocsManager();
  }

  protected async executeHandler(
    args: SetupProjectDocsArgs, 
    context: ServerContext
  ): Promise<SetupProjectDocsResult> {
    const projectPath = context.projectPath || process.cwd();
    
    this.logger.info('Setting up project docs', { args, projectPath });

    try {
      // Use the provided template options directly (all are now required)
      const templateOptions: TemplateOptions = {
        architecture: args.architecture,
        requirements: args.requirements,
        design: args.design
      };

      // Create project documents
      const result = await this.projectDocsManager.createProjectDocs(projectPath, templateOptions);
      
      // Get document paths for response
      const paths = this.projectDocsManager.getDocumentPaths(projectPath);

      // Create success message
      let message = 'Project documentation setup completed.';
      if (result.created.length > 0) {
        message += ` Created: ${result.created.join(', ')}.`;
      }
      if (result.skipped.length > 0) {
        message += ` Skipped existing: ${result.skipped.join(', ')}.`;
      }

      this.logger.info('Project docs setup completed', { 
        created: result.created, 
        skipped: result.skipped,
        paths 
      });

      return {
        success: true,
        created: result.created,
        skipped: result.skipped,
        paths,
        message
      };

    } catch (error) {
      this.logger.error('Failed to setup project docs', error as Error, { args, projectPath });
      
      return {
        success: false,
        created: [],
        skipped: [],
        paths: this.projectDocsManager.getDocumentPaths(projectPath),
        message: `Failed to setup project docs: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
