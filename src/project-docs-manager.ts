/**
 * Project Docs Manager
 * 
 * Manages project documentation artifacts (architecture.md, requirements.md, design.md)
 * separate from the workflow-specific plan files. Handles creation, validation, and
 * path resolution for project documents. Now supports both template creation and
 * file linking via symlinks.
 */

import { writeFile, readFile, access, mkdir, unlink, symlink, lstat } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { createLogger } from './logger.js';
import { TemplateManager, TemplateOptions } from './template-manager.js';

const logger = createLogger('ProjectDocsManager');

export interface ProjectDocsInfo {
  architecture: { path: string; exists: boolean };
  requirements: { path: string; exists: boolean };
  design: { path: string; exists: boolean };
}

export interface CreateOrLinkResult {
  created: string[];
  linked: string[];
  skipped: string[];
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
   * Create project documents using templates (legacy method for backward compatibility)
   */
  async createProjectDocs(
    projectPath: string, 
    options?: TemplateOptions
  ): Promise<{ created: string[]; skipped: string[] }> {
    const result = await this.createOrLinkProjectDocs(projectPath, options, {});
    return {
      created: result.created,
      skipped: result.skipped
    };
  }

  /**
   * Create or link project documents using templates and/or file paths
   */
  async createOrLinkProjectDocs(
    projectPath: string,
    templateOptions?: Partial<TemplateOptions>,
    filePaths?: Partial<{ architecture: string; requirements: string; design: string }>
  ): Promise<CreateOrLinkResult> {
    const defaults = await this.templateManager.getDefaults();
    const finalTemplateOptions = { ...defaults, ...templateOptions };

    const docsPath = this.getDocsPath(projectPath);
    const paths = this.getDocumentPaths(projectPath);
    const info = await this.getProjectDocsInfo(projectPath);

    // Ensure docs directory exists
    await mkdir(docsPath, { recursive: true });

    const created: string[] = [];
    const linked: string[] = [];
    const skipped: string[] = [];

    // Handle architecture document
    if (!info.architecture.exists) {
      if (filePaths?.architecture) {
        await this.createSymlink(filePaths.architecture, paths.architecture);
        linked.push('architecture.md');
      } else {
        await this.createDocument('architecture', finalTemplateOptions.architecture, paths.architecture, docsPath);
        created.push('architecture.md');
      }
    } else {
      skipped.push('architecture.md');
    }

    // Handle requirements document
    if (!info.requirements.exists) {
      if (filePaths?.requirements) {
        await this.createSymlink(filePaths.requirements, paths.requirements);
        linked.push('requirements.md');
      } else {
        await this.createDocument('requirements', finalTemplateOptions.requirements, paths.requirements, docsPath);
        created.push('requirements.md');
      }
    } else {
      skipped.push('requirements.md');
    }

    // Handle design document
    if (!info.design.exists) {
      if (filePaths?.design) {
        await this.createSymlink(filePaths.design, paths.design);
        linked.push('design.md');
      } else {
        await this.createDocument('design', finalTemplateOptions.design, paths.design, docsPath);
        created.push('design.md');
      }
    } else {
      skipped.push('design.md');
    }

    logger.info('Project docs creation/linking completed', { 
      created, 
      linked,
      skipped, 
      projectPath,
      templateOptions: finalTemplateOptions,
      filePaths
    });

    return { created, linked, skipped };
  }

  /**
   * Create a symlink to an existing file
   */
  async createSymlink(sourcePath: string, targetPath: string): Promise<void> {
    try {
      // Remove existing file/symlink if it exists
      await this.removeExistingDocument(targetPath);

      // Create relative symlink for better portability
      const targetDir = dirname(targetPath);
      const relativePath = relative(targetDir, sourcePath);
      
      await symlink(relativePath, targetPath);
      
      logger.debug('Symlink created successfully', { 
        sourcePath, 
        targetPath, 
        relativePath 
      });
    } catch (error) {
      logger.error('Failed to create symlink', error as Error, { 
        sourcePath, 
        targetPath 
      });
      throw new Error(`Failed to create symlink: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove existing document or symlink
   */
  private async removeExistingDocument(documentPath: string): Promise<void> {
    try {
      const stats = await lstat(documentPath);
      await unlink(documentPath);
      
      logger.debug('Existing document removed', { 
        documentPath, 
        wasSymlink: stats.isSymbolicLink() 
      });
    } catch (error) {
      // File doesn't exist, which is fine
      if ((error as any).code !== 'ENOENT') {
        logger.debug('Failed to remove existing document', { 
          documentPath, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
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

  /**
   * Check if a document is a symlink
   */
  async isSymlink(projectPath: string, type: 'architecture' | 'requirements' | 'design'): Promise<boolean> {
    const paths = this.getDocumentPaths(projectPath);
    const documentPath = paths[type];
    
    try {
      const stats = await lstat(documentPath);
      return stats.isSymbolicLink();
    } catch {
      return false;
    }
  }
}
