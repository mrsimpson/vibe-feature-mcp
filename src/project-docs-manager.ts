/**
 * Project Docs Manager
 * 
 * Manages project documentation artifacts (architecture.md, requirements.md, design.md)
 * separate from the workflow-specific plan files. Handles creation, validation, and
 * path resolution for project documents.
 */

import { writeFile, readFile, access, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { createLogger } from './logger.js';
import { TemplateManager, TemplateOptions } from './template-manager.js';

const logger = createLogger('ProjectDocsManager');

export interface ProjectDocsInfo {
  architecture: { path: string; exists: boolean };
  requirements: { path: string; exists: boolean };
  design: { path: string; exists: boolean };
}

export class ProjectDocsManager {
  public templateManager: TemplateManager; // Make public for access from other classes

  constructor() {
    this.templateManager = new TemplateManager();
  }

  /**
   * Get project docs directory path
   */
  getDocsPath(projectPath: string): string {
    return join(projectPath, '.vibe', 'docs');
  }

  /**
   * Get paths for all project documents
   */
  getDocumentPaths(projectPath: string): {
    architecture: string;
    requirements: string;
    design: string;
  } {
    const docsPath = this.getDocsPath(projectPath);
    return {
      architecture: join(docsPath, 'architecture.md'),
      requirements: join(docsPath, 'requirements.md'),
      design: join(docsPath, 'design.md')
    };
  }

  /**
   * Check which project documents exist
   */
  async getProjectDocsInfo(projectPath: string): Promise<ProjectDocsInfo> {
    const paths = this.getDocumentPaths(projectPath);
    
    const checkExists = async (path: string): Promise<boolean> => {
      try {
        await access(path);
        return true;
      } catch {
        return false;
      }
    };

    return {
      architecture: {
        path: paths.architecture,
        exists: await checkExists(paths.architecture)
      },
      requirements: {
        path: paths.requirements,
        exists: await checkExists(paths.requirements)
      },
      design: {
        path: paths.design,
        exists: await checkExists(paths.design)
      }
    };
  }

  /**
   * Create project documents using templates
   */
  async createProjectDocs(
    projectPath: string, 
    options?: TemplateOptions
  ): Promise<{ created: string[]; skipped: string[] }> {
    const defaults = await this.templateManager.getDefaults();
    const finalOptions = { ...defaults, ...options };
    await this.templateManager.validateOptions(finalOptions);

    const docsPath = this.getDocsPath(projectPath);
    const paths = this.getDocumentPaths(projectPath);
    const info = await this.getProjectDocsInfo(projectPath);

    // Ensure docs directory exists
    await mkdir(docsPath, { recursive: true });

    const created: string[] = [];
    const skipped: string[] = [];

    // Create architecture document
    if (!info.architecture.exists) {
      await this.createDocument('architecture', finalOptions.architecture, paths.architecture, docsPath);
      created.push('architecture.md');
    } else {
      skipped.push('architecture.md');
    }

    // Create requirements document
    if (!info.requirements.exists) {
      await this.createDocument('requirements', finalOptions.requirements, paths.requirements, docsPath);
      created.push('requirements.md');
    } else {
      skipped.push('requirements.md');
    }

    // Create design document
    if (!info.design.exists) {
      await this.createDocument('design', finalOptions.design, paths.design, docsPath);
      created.push('design.md');
    } else {
      skipped.push('design.md');
    }

    logger.info('Project docs creation completed', { 
      created, 
      skipped, 
      projectPath,
      options: finalOptions 
    });

    return { created, skipped };
  }

  /**
   * Create a single document from template
   */
  private async createDocument(
    type: 'architecture' | 'requirements' | 'design',
    template: string,
    documentPath: string,
    docsPath: string
  ): Promise<void> {
    try {
      const templateResult = await this.templateManager.loadTemplate(type, template);
      
      // Write the main document
      await writeFile(documentPath, templateResult.content, 'utf-8');
      
      // Write additional files (like images for arc42)
      if (templateResult.additionalFiles) {
        for (const file of templateResult.additionalFiles) {
          const filePath = join(docsPath, file.relativePath);
          const fileDir = dirname(filePath);
          
          // Ensure directory exists
          await mkdir(fileDir, { recursive: true });
          
          // Write file
          await writeFile(filePath, file.content);
        }
      }
      
      logger.debug(`Created ${type} document`, { documentPath, template });
    } catch (error) {
      logger.error(`Failed to create ${type} document`, error as Error, { documentPath, template });
      throw error;
    }
  }

  /**
   * Get variable substitutions for workflow instructions
   */
  getVariableSubstitutions(projectPath: string): Record<string, string> {
    const paths = this.getDocumentPaths(projectPath);
    
    return {
      '$ARCHITECTURE_DOC': paths.architecture,
      '$REQUIREMENTS_DOC': paths.requirements,
      '$DESIGN_DOC': paths.design
    };
  }

  /**
   * Read a project document
   */
  async readDocument(projectPath: string, type: 'architecture' | 'requirements' | 'design'): Promise<string> {
    const paths = this.getDocumentPaths(projectPath);
    const documentPath = paths[type];
    
    try {
      return await readFile(documentPath, 'utf-8');
    } catch (error) {
      logger.error(`Failed to read ${type} document`, error as Error, { documentPath });
      throw new Error(`${type} document not found: ${documentPath}`);
    }
  }

  /**
   * Check if all project documents exist
   */
  async allDocumentsExist(projectPath: string): Promise<boolean> {
    const info = await this.getProjectDocsInfo(projectPath);
    return info.architecture.exists && info.requirements.exists && info.design.exists;
  }
}
