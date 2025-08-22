/**
 * StartDevelopment Tool Handler
 *
 * Handles initialization of development workflow and transition to the initial
 * development phase. Allows users to choose from predefined workflows or use a custom workflow.
 */

import { BaseToolHandler } from './base-tool-handler.js';
import { ServerContext } from '../types.js';
import { validateRequiredArgs } from '../server-helpers.js';
import { basename } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { GitCommitConfig } from '../../types.js';
import { GitManager } from '../../git-manager.js';
import type { YamlStateMachine } from '../../state-machine-types.js';
import {
  ProjectDocsManager,
  ProjectDocsInfo,
} from '../../project-docs-manager.js';

/**
 * Arguments for the start_development tool
 */
export interface StartDevelopmentArgs {
  workflow: string;
  commit_behaviour?: 'step' | 'phase' | 'end' | 'none';
  require_reviews?: boolean;
}

/**
 * Response from the start_development tool
 */
export interface StartDevelopmentResult {
  phase: string;
  instructions: string;
  plan_file_path: string;
  conversation_id: string;
  workflow: YamlStateMachine;
  workflowDocumentationUrl?: string;
}

/**
 * StartDevelopment tool handler implementation
 */
export class StartDevelopmentHandler extends BaseToolHandler<
  StartDevelopmentArgs,
  StartDevelopmentResult
> {
  private projectDocsManager: ProjectDocsManager;

  constructor() {
    super();
    this.projectDocsManager = new ProjectDocsManager();
  }

  protected async executeHandler(
    args: StartDevelopmentArgs,
    context: ServerContext
  ): Promise<StartDevelopmentResult> {
    // Validate required arguments
    validateRequiredArgs(args, ['workflow']);

    const selectedWorkflow = args.workflow;
    const requireReviews = args.require_reviews ?? false;

    // Process git commit configuration
    const isGitRepository = GitManager.isGitRepository(context.projectPath);

    // Translate commit_behaviour to internal git config
    const commitBehaviour =
      args.commit_behaviour ?? (isGitRepository ? 'end' : 'none');
    const gitCommitConfig: GitCommitConfig = {
      enabled: commitBehaviour !== 'none',
      commitOnStep: commitBehaviour === 'step',
      commitOnPhase: commitBehaviour === 'phase',
      commitOnComplete:
        commitBehaviour === 'end' ||
        commitBehaviour === 'step' ||
        commitBehaviour === 'phase',
      initialMessage: 'Development session',
      startCommitHash:
        GitManager.getCurrentCommitHash(context.projectPath) || undefined,
    };

    this.logger.debug('Processing start_development request', {
      selectedWorkflow,
      projectPath: context.projectPath,
      commitBehaviour,
      gitCommitConfig,
    });

    // Validate workflow selection
    if (
      !context.workflowManager.validateWorkflowName(
        selectedWorkflow,
        context.projectPath
      )
    ) {
      const availableWorkflows = context.workflowManager.getWorkflowNames();
      throw new Error(
        `Invalid workflow: ${selectedWorkflow}. Available workflows: ${availableWorkflows.join(', ')}, custom`
      );
    }

    // Check for project documentation artifacts and guide setup if needed
    const artifactGuidance = await this.checkProjectArtifacts(
      context.projectPath,
      selectedWorkflow,
      context
    );
    if (artifactGuidance) {
      return artifactGuidance;
    }

    // Check if user is on main/master branch and prompt for branch creation
    const currentBranch = this.getCurrentGitBranch(context.projectPath);
    if (currentBranch === 'main' || currentBranch === 'master') {
      const suggestedBranchName = this.generateBranchSuggestion();
      const branchPromptResponse: StartDevelopmentResult = {
        phase: 'branch-prompt',
        instructions: `You're currently on the ${currentBranch} branch. It's recommended to create a feature branch for development. Propose a branch creation by suggesting a branch command to the user call start_development again.\n\nSuggested command: \`git checkout -b ${suggestedBranchName}\`\n\nPlease create a new branch and then call start_development again to begin development.`,
        plan_file_path: '',
        conversation_id: '',
        workflow: {} as YamlStateMachine,
      };

      this.logger.debug(
        'User on main/master branch, prompting for branch creation',
        {
          currentBranch,
          suggestedBranchName,
        }
      );

      return branchPromptResponse;
    }

    // Create or get conversation context with the selected workflow
    const conversationContext =
      await context.conversationManager.createConversationContext(
        selectedWorkflow
      );
    const currentPhase = conversationContext.currentPhase;

    // Load the selected workflow
    const stateMachine = context.workflowManager.loadWorkflowForProject(
      conversationContext.projectPath,
      selectedWorkflow
    );
    const initialState = stateMachine.initial_state;

    // Check if development is already started
    if (currentPhase !== initialState) {
      throw new Error(
        `Development already started. Current phase is '${currentPhase}', not initial state '${initialState}'. Use whats_next() to continue development.`
      );
    }

    // The initial state IS the first development phase - it's explicitly modeled
    const targetPhase = initialState;

    // Transition to the initial development phase
    const transitionResult =
      await context.transitionEngine.handleExplicitTransition(
        currentPhase,
        targetPhase,
        conversationContext.projectPath,
        'Development initialization',
        selectedWorkflow
      );

    // Update conversation state with workflow, phase, and git commit configuration
    await context.conversationManager.updateConversationState(
      conversationContext.conversationId,
      {
        currentPhase: transitionResult.newPhase,
        workflowName: selectedWorkflow,
        gitCommitConfig: gitCommitConfig,
        requireReviewsBeforePhaseTransition: requireReviews,
      }
    );

    // Set state machine on plan manager before creating plan file
    context.planManager.setStateMachine(stateMachine);

    // Ensure plan file exists
    await context.planManager.ensurePlanFile(
      conversationContext.planFilePath,
      conversationContext.projectPath,
      conversationContext.gitBranch
    );

    // Ensure .vibe/.gitignore exists to exclude SQLite files for git repositories
    this.ensureGitignoreEntry(conversationContext.projectPath);

    // Generate workflow documentation URL
    const workflowDocumentationUrl =
      this.generateWorkflowDocumentationUrl(selectedWorkflow);

    // Generate instructions with simple i18n guidance
    const baseInstructions = `Look at the plan file (${conversationContext.planFilePath}). Define entrance criteria for each phase of the workflow except the initial phase. Those criteria shall be based on the contents of the previous phase. \n      Example: \n      \`\`\`\n      ## Design\n\n      ### Phase Entrance Criteria:\n      - [ ] The requirements have been thoroughly defined.\n      - [ ] Alternatives have been evaluated and are documented. \n      - [ ] It's clear what's in scope and out of scope\n      \`\`\`\n      \n      IMPORTANT: Once you added reasonable entrance call the whats_next() tool to get guided instructions for the next current phase.`;

    const i18nGuidance = `\n\nNOTE: If the user is communicating in a non-English language, please translate the plan file content to that language while keeping the structure intact, and continue all interactions in the user's language.`;

    // Add workflow documentation information if available
    const workflowDocumentationInfo = workflowDocumentationUrl
      ? `\n\nInform the user about the chose workflow: He can visit: ${workflowDocumentationUrl} to get detailed information.`
      : '';

    const finalInstructions =
      baseInstructions + workflowDocumentationInfo + i18nGuidance;

    const response: StartDevelopmentResult = {
      phase: transitionResult.newPhase,
      instructions: finalInstructions,
      plan_file_path: conversationContext.planFilePath,
      conversation_id: conversationContext.conversationId,
      workflow: stateMachine,
      workflowDocumentationUrl,
    };

    // Log interaction
    await this.logInteraction(
      context,
      conversationContext.conversationId,
      'start_development',
      args,
      response,
      transitionResult.newPhase
    );

    return response;
  }

  /**
   * Check if project documentation artifacts exist and provide setup guidance if needed
   * Dynamically analyzes the selected workflow to determine which documents are referenced
   */
  private async checkProjectArtifacts(
    projectPath: string,
    workflowName: string,
    context: ServerContext
  ): Promise<StartDevelopmentResult | null> {
    try {
      // Load the workflow to analyze its content
      const stateMachine = context.workflowManager.loadWorkflowForProject(
        projectPath,
        workflowName
      );

      // Analyze workflow content to detect referenced document variables
      const referencedVariables = this.analyzeWorkflowDocumentReferences(
        stateMachine,
        projectPath
      );

      // If no document variables are referenced, skip artifact check
      if (referencedVariables.length === 0) {
        this.logger.debug(
          'No document variables found in workflow, skipping artifact check',
          { workflowName }
        );
        return null;
      }

      // Check which referenced documents are missing
      const docsInfo =
        await this.projectDocsManager.getProjectDocsInfo(projectPath);
      const missingDocs = this.getMissingReferencedDocuments(
        referencedVariables,
        docsInfo,
        projectPath
      );

      // If all referenced documents exist, continue with normal flow
      if (missingDocs.length === 0) {
        this.logger.debug(
          'All referenced project artifacts exist, continuing with development',
          {
            workflowName,
            referencedVariables,
          }
        );
        return null;
      }

      // Generate guidance for setting up missing artifacts
      const setupGuidance = await this.generateArtifactSetupGuidance(
        missingDocs,
        workflowName,
        docsInfo,
        referencedVariables
      );

      this.logger.info(
        'Missing referenced project artifacts detected, providing setup guidance',
        {
          workflowName,
          referencedVariables,
          missingDocs,
          projectPath,
        }
      );

      return {
        phase: 'artifact-setup',
        instructions: setupGuidance,
        plan_file_path: '',
        conversation_id: '',
        workflow: {} as YamlStateMachine,
      };
    } catch (error) {
      this.logger.warn(
        'Failed to analyze workflow for document references, proceeding without artifact check',
        {
          workflowName,
          error: error instanceof Error ? error.message : String(error),
        }
      );
      return null;
    }
  }

  /**
   * Analyze workflow content to detect document variable references
   */
  private analyzeWorkflowDocumentReferences(
    stateMachine: YamlStateMachine,
    projectPath: string
  ): string[] {
    // Get available document variables from ProjectDocsManager
    const variableSubstitutions =
      this.projectDocsManager.getVariableSubstitutions(projectPath);
    const documentVariables = Object.keys(variableSubstitutions);
    const referencedVariables: Set<string> = new Set();

    // Convert the entire state machine to a string for analysis
    const workflowContent = JSON.stringify(stateMachine);

    // Check for each document variable
    for (const variable of documentVariables) {
      if (workflowContent.includes(variable)) {
        referencedVariables.add(variable);
      }
    }

    this.logger.debug('Analyzed workflow for document references', {
      workflowContent: workflowContent.length + ' characters',
      availableVariables: documentVariables,
      referencedVariables: Array.from(referencedVariables),
    });

    return Array.from(referencedVariables);
  }

  /**
   * Determine which referenced documents are missing
   */
  private getMissingReferencedDocuments(
    referencedVariables: string[],
    docsInfo: ProjectDocsInfo,
    projectPath: string
  ): string[] {
    const missingDocs: string[] = [];

    // Get variable substitutions to derive the mapping
    const variableSubstitutions =
      this.projectDocsManager.getVariableSubstitutions(projectPath);

    // Create reverse mapping from variable to document type
    const variableToDocMap: { [key: string]: string } = {};
    for (const [variable, path] of Object.entries(variableSubstitutions)) {
      // Extract document type from path (e.g., 'architecture' from 'architecture.md')
      const filename = path.split('/').pop() || '';
      const docType = filename.replace('.md', '');
      variableToDocMap[variable] = docType;
    }

    for (const variable of referencedVariables) {
      const docType = variableToDocMap[variable];
      if (docType && docType in docsInfo) {
        const docInfo = docsInfo[docType as keyof ProjectDocsInfo];
        if (docInfo && !docInfo.exists) {
          missingDocs.push(`${docType}.md`);
        }
      }
    }

    return missingDocs;
  }

  /**
   * Generate guidance for setting up missing project artifacts
   */
  private async generateArtifactSetupGuidance(
    missingDocs: string[],
    workflowName: string,
    docsInfo: ProjectDocsInfo,
    referencedVariables: string[]
  ): Promise<string> {
    const missingList = missingDocs.map(doc => `- ${doc}`).join('\n');
    const existingDocs = [];

    if (docsInfo.architecture.exists) {
      const fileName = basename(docsInfo.architecture.path);
      existingDocs.push(`✅ ${fileName}`);
    }
    if (docsInfo.requirements.exists) {
      const fileName = basename(docsInfo.requirements.path);
      existingDocs.push(`✅ ${fileName}`);
    }
    if (docsInfo.design.exists) {
      const fileName = basename(docsInfo.design.path);
      existingDocs.push(`✅ ${fileName}`);
    }

    const existingList =
      existingDocs.length > 0
        ? `\n\n**Existing Documents:**\n${existingDocs.join('\n')}`
        : '';

    const referencedVariablesList = referencedVariables
      .map(v => `\`${v}\``)
      .join(', ');

    // Get available templates dynamically
    const availableTemplates =
      await this.projectDocsManager.templateManager.getAvailableTemplates();
    const defaults =
      await this.projectDocsManager.templateManager.getDefaults();

    // Generate template options dynamically
    const templateOptionsText =
      this.generateTemplateOptionsText(availableTemplates);

    return `## Project Documentation Setup Required

The **${workflowName}** workflow references project documentation that doesn't exist yet.

**Referenced Variables:** ${referencedVariablesList}

**Missing Documents:**
${missingList}${existingList}

## 🚀 **Quick Setup**

Use the \`setup_project_docs\` tool to create these documents with templates:

\`\`\`
setup_project_docs({
  architecture: "${defaults.architecture}",        // or other available options
  requirements: "${defaults.requirements}",         // or other available options
  design: "${defaults.design}"       // or other available options
})
\`\`\`

${templateOptionsText}

## ⚡ **Next Steps**

1. **Call \`setup_project_docs\`** with your preferred templates
2. **Call \`start_development\`** again to begin the ${workflowName} workflow
3. The workflow will reference these documents using the detected variables: ${referencedVariablesList}

**Note:** You can also proceed without structured docs, but the workflow instructions will reference missing files.`;
  }

  /**
   * Generate template options text dynamically
   */
  private generateTemplateOptionsText(availableTemplates: {
    architecture: string[];
    requirements: string[];
    design: string[];
  }): string {
    const sections = [];

    if (availableTemplates.architecture.length > 0) {
      const archOptions = availableTemplates.architecture
        .map(template => {
          const description = this.getTemplateDescription(
            template,
            'architecture'
          );
          return `- **${template}**: ${description}`;
        })
        .join('\n');
      sections.push(`**Architecture Templates:**\n${archOptions}`);
    }

    if (availableTemplates.requirements.length > 0) {
      const reqOptions = availableTemplates.requirements
        .map(template => {
          const description = this.getTemplateDescription(
            template,
            'requirements'
          );
          return `- **${template}**: ${description}`;
        })
        .join('\n');
      sections.push(`**Requirements Templates:**\n${reqOptions}`);
    }

    if (availableTemplates.design.length > 0) {
      const designOptions = availableTemplates.design
        .map(template => {
          const description = this.getTemplateDescription(template, 'design');
          return `- **${template}**: ${description}`;
        })
        .join('\n');
      sections.push(`**Design Templates:**\n${designOptions}`);
    }

    return sections.length > 0
      ? `## 📋 **Template Options**\n\n${sections.join('\n\n')}`
      : '';
  }

  /**
   * Get description for a template based on its name and type
   */
  private getTemplateDescription(template: string, type: string): string {
    switch (template) {
      case 'arc42':
        return 'Comprehensive software architecture template with diagrams';
      case 'ears':
        return 'WHEN...THEN format for clear, testable requirements';
      case 'comprehensive':
        return 'Full implementation guide with testing strategy';
      case 'freestyle':
        return `Simple, flexible ${type} documentation`;
      default:
        return `${template} format for ${type} documentation`;
    }
  }

  /**
   * Generate workflow documentation URL for predefined workflows
   * Returns undefined for custom workflows
   */
  private generateWorkflowDocumentationUrl(
    workflowName: string
  ): string | undefined {
    // Don't generate URL for custom workflows
    if (workflowName === 'custom') {
      return undefined;
    }

    // Generate URL for predefined workflows
    return `https://mrsimpson.github.io/responsible-vibe-mcp/workflows/${workflowName}`;
  }

  /**
   * Get the current git branch for a project
   * Uses the same logic as ConversationManager but locally accessible
   */
  private getCurrentGitBranch(projectPath: string): string {
    try {
      const { execSync } = require('node:child_process');
      const { existsSync } = require('node:fs');

      // Check if this is a git repository
      if (!existsSync(`${projectPath}/.git`)) {
        this.logger.debug(
          'Not a git repository, using "default" as branch name',
          { projectPath }
        );
        return 'default';
      }

      // Get current branch name
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'], // Suppress stderr
      }).trim();

      this.logger.debug('Detected git branch', { projectPath, branch });

      return branch;
    } catch (_error) {
      this.logger.debug(
        'Failed to get git branch, using "default" as branch name',
        { projectPath }
      );
      return 'default';
    }
  }

  /**
   * Generate a suggested branch name for feature development
   */
  private generateBranchSuggestion(): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `feature/development-${timestamp}`;
  }

  /**
   * Ensure .gitignore exists in .vibe folder to exclude SQLite files
   * This function is idempotent and self-contained within the .vibe directory
   */
  private ensureGitignoreEntry(projectPath: string): void {
    try {
      // Check if this is a git repository
      if (!existsSync(`${projectPath}/.git`)) {
        this.logger.debug(
          'Not a git repository, skipping .gitignore management',
          { projectPath }
        );
        return;
      }

      const vibeDir = resolve(projectPath, '.vibe');
      const gitignorePath = resolve(vibeDir, '.gitignore');

      // Ensure .vibe directory exists
      if (!existsSync(vibeDir)) {
        mkdirSync(vibeDir, { recursive: true });
      }

      // Content for .vibe/.gitignore
      const gitignoreContent = `# Exclude SQLite database files
*.sqlite
*.sqlite-*
conversation-state.sqlite*
`;

      // Check if .gitignore already exists and has the right content
      if (existsSync(gitignorePath)) {
        try {
          const existingContent = readFileSync(gitignorePath, 'utf-8');
          if (
            existingContent.includes('*.sqlite') &&
            existingContent.includes('conversation-state.sqlite')
          ) {
            this.logger.debug(
              '.vibe/.gitignore already exists with SQLite exclusions',
              { gitignorePath }
            );
            return;
          }
        } catch (error) {
          this.logger.warn(
            'Failed to read existing .vibe/.gitignore, will recreate',
            {
              gitignorePath,
              error: error instanceof Error ? error.message : String(error),
            }
          );
        }
      }

      // Write the .gitignore file
      writeFileSync(gitignorePath, gitignoreContent, 'utf-8');

      this.logger.info('Created .vibe/.gitignore to exclude SQLite files', {
        projectPath,
        gitignorePath,
      });
    } catch (error) {
      // Log warning but don't fail development start
      this.logger.warn(
        'Failed to create .vibe/.gitignore, continuing with development start',
        {
          projectPath,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }
}
