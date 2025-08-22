/**
 * Template Manager
 *
 * Handles loading and rendering of project document templates.
 * Supports different template formats for architecture, requirements, and design documents.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createLogger } from './logger.js';

const logger = createLogger('TemplateManager');

// Dynamic template types - will be populated from file system
export type ArchitectureTemplate = string;
export type RequirementsTemplate = string;
export type DesignTemplate = string;

export interface TemplateOptions {
  architecture?: ArchitectureTemplate;
  requirements?: RequirementsTemplate;
  design?: DesignTemplate;
}

export interface TemplateResult {
  content: string;
  additionalFiles?: Array<{
    relativePath: string;
    content: Buffer;
  }>;
}

export class TemplateManager {
  private templatesPath: string;

  constructor() {
    this.templatesPath = this.resolveTemplatesPath();
  }

  /**
   * Resolve templates path using similar strategy as WorkflowManager
   */
  private resolveTemplatesPath(): string {
    const strategies: string[] = [];

    // Strategy 1: From compiled dist directory
    const currentFileUrl = import.meta.url;
    if (currentFileUrl.startsWith('file://')) {
      const currentFilePath = fileURLToPath(currentFileUrl);
      // From dist/template-manager.js -> ../resources/templates
      strategies.push(join(dirname(currentFilePath), '../resources/templates'));
    }

    // Strategy 2: From node_modules
    strategies.push(
      join(
        process.cwd(),
        'node_modules/responsible-vibe-mcp/resources/templates'
      )
    );

    // Strategy 3: From package directory (for development)
    try {
      const require = createRequire(import.meta.url);
      const packagePath = require.resolve('responsible-vibe-mcp/package.json');
      const packageDir = dirname(packagePath);
      strategies.push(join(packageDir, 'resources/templates'));
    } catch (_error) {
      // Ignore if package not found
    }

    // Strategy 4: Current working directory (for development)
    strategies.push(join(process.cwd(), 'resources/templates'));

    // Find the first existing path
    for (const strategy of strategies) {
      try {
        // This will throw if path doesn't exist
        require('node:fs').accessSync(strategy);
        logger.debug('Using templates path', { path: strategy });
        return strategy;
      } catch (_error) {
        // Continue to next strategy
      }
    }

    // Fallback to first strategy if none found
    const fallback = strategies[0];
    logger.warn('No templates directory found, using fallback', {
      fallback,
      strategies,
    });
    return fallback;
  }

  /**
   * Get the default template options based on available templates
   */
  async getDefaults(): Promise<Required<TemplateOptions>> {
    const availableTemplates = await this.getAvailableTemplates();

    return {
      architecture: this.getPreferredTemplate(availableTemplates.architecture, [
        'arc42',
        'freestyle',
      ]),
      requirements: this.getPreferredTemplate(availableTemplates.requirements, [
        'ears',
        'freestyle',
      ]),
      design: this.getPreferredTemplate(availableTemplates.design, [
        'comprehensive',
        'freestyle',
      ]),
    };
  }

  /**
   * Get preferred template from available options, with fallback preferences
   */
  private getPreferredTemplate(
    available: string[],
    preferences: string[]
  ): string {
    // Try to find the first preference that's available
    for (const preference of preferences) {
      if (available.includes(preference)) {
        return preference;
      }
    }

    // If no preferences are available, return the first available template
    return available[0] || preferences[0];
  }

  /**
   * Load and render a template
   */
  async loadTemplate(
    type: 'architecture' | 'requirements' | 'design',
    template: string
  ): Promise<TemplateResult> {
    const templatePath = join(this.templatesPath, type, template);
    const templateFilePath = `${templatePath}.md`;

    try {
      // First try to check if it's a directory (like arc42)
      try {
        const stats = await stat(templatePath);
        if (stats.isDirectory()) {
          return await this.loadDirectoryTemplate(templatePath);
        }
      } catch (_error) {
        // Not a directory, continue to file check
      }

      // Try to load as a markdown file
      const content = await readFile(templateFilePath, 'utf-8');
      return { content };
    } catch (error) {
      logger.error(
        `Failed to load template: ${type}/${template}`,
        error as Error
      );
      throw new Error(
        `Template not found: ${type}/${template}. Tried: ${templatePath} (directory) and ${templateFilePath} (file)`
      );
    }
  }

  /**
   * Load a directory-based template (like arc42 with images)
   */
  private async loadDirectoryTemplate(
    templatePath: string
  ): Promise<TemplateResult> {
    const additionalFiles: Array<{ relativePath: string; content: Buffer }> =
      [];

    // Find the main markdown file
    const files = await readdir(templatePath);
    const markdownFile = files.find(file => file.endsWith('.md'));

    if (!markdownFile) {
      throw new Error(
        `No markdown file found in template directory: ${templatePath}`
      );
    }

    const content = await readFile(join(templatePath, markdownFile), 'utf-8');

    // Load additional files (like images)
    await this.loadAdditionalFiles(templatePath, '', additionalFiles);

    return {
      content,
      additionalFiles: additionalFiles.filter(
        file => !file.relativePath.endsWith('.md')
      ),
    };
  }

  /**
   * Recursively load additional files from template directory
   */
  private async loadAdditionalFiles(
    basePath: string,
    relativePath: string,
    additionalFiles: Array<{ relativePath: string; content: Buffer }>
  ): Promise<void> {
    const currentPath = join(basePath, relativePath);
    const items = await readdir(currentPath);

    for (const item of items) {
      const itemPath = join(currentPath, item);
      const itemRelativePath = relativePath ? join(relativePath, item) : item;
      const stats = await stat(itemPath);

      if (stats.isDirectory()) {
        // Recursively process subdirectories
        await this.loadAdditionalFiles(
          basePath,
          itemRelativePath,
          additionalFiles
        );
      } else if (!item.endsWith('.md')) {
        // Load non-markdown files as additional files
        const content = await readFile(itemPath);
        additionalFiles.push({
          relativePath: itemRelativePath,
          content,
        });
      }
    }
  }

  /**
   * Validate template options against available templates
   */
  async validateOptions(options: TemplateOptions): Promise<void> {
    const availableTemplates = await this.getAvailableTemplates();

    if (
      options.architecture &&
      !availableTemplates.architecture.includes(options.architecture)
    ) {
      throw new Error(
        `Invalid architecture template: ${options.architecture}. Valid options: ${availableTemplates.architecture.join(', ')}`
      );
    }

    if (
      options.requirements &&
      !availableTemplates.requirements.includes(options.requirements)
    ) {
      throw new Error(
        `Invalid requirements template: ${options.requirements}. Valid options: ${availableTemplates.requirements.join(', ')}`
      );
    }

    if (options.design && !availableTemplates.design.includes(options.design)) {
      throw new Error(
        `Invalid design template: ${options.design}. Valid options: ${availableTemplates.design.join(', ')}`
      );
    }
  }

  /**
   * Get available templates for each type by scanning the file system
   */
  async getAvailableTemplates(): Promise<{
    architecture: string[];
    requirements: string[];
    design: string[];
  }> {
    const result = {
      architecture: [] as string[],
      requirements: [] as string[],
      design: [] as string[],
    };

    try {
      // Scan each template type directory
      for (const [type, templates] of Object.entries(result)) {
        const typePath = join(this.templatesPath, type);

        try {
          const entries = await readdir(typePath, { withFileTypes: true });

          for (const entry of entries) {
            if (entry.isDirectory()) {
              // Directory-based template (like arc42)
              templates.push(entry.name);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
              // File-based template (like freestyle.md)
              const templateName = entry.name.replace('.md', '');
              templates.push(templateName);
            }
          }

          // Sort templates for consistent ordering
          templates.sort();
        } catch (error) {
          logger.warn(`Failed to scan templates for type: ${type}`, {
            typePath,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.debug('Discovered available templates', result);
      return result;
    } catch (error) {
      logger.error('Failed to discover templates', error as Error);
      // Return empty arrays if discovery fails
      return result;
    }
  }
}
