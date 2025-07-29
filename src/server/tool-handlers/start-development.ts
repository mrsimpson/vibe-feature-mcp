/**
 * StartDevelopment Tool Handler
 * 
 * Handles initialization of development workflow and transition to the initial 
 * development phase. Allows users to choose from predefined workflows or use a custom workflow.
 */

import { BaseToolHandler } from './base-tool-handler.js';
import { ServerContext } from '../types.js';
import { validateRequiredArgs } from '../server-helpers.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { GitCommitConfig } from '../../types.js';
import { GitManager } from '../../git-manager.js';

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
  workflow: any; // State machine object
  workflowDocumentationUrl?: string;
}

/**
 * StartDevelopment tool handler implementation
 */
export class StartDevelopmentHandler extends BaseToolHandler<StartDevelopmentArgs, StartDevelopmentResult> {

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
    const commitBehaviour = args.commit_behaviour ?? (isGitRepository ? 'end' : 'none');
    const gitCommitConfig: GitCommitConfig = {
      enabled: commitBehaviour !== 'none',
      commitOnStep: commitBehaviour === 'step',
      commitOnPhase: commitBehaviour === 'phase',
      commitOnComplete: commitBehaviour === 'end' || commitBehaviour === 'step' || commitBehaviour === 'phase',
      initialMessage: 'Development session',
      startCommitHash: GitManager.getCurrentCommitHash(context.projectPath) || undefined
    };

    this.logger.debug('Processing start_development request', {
      selectedWorkflow,
      projectPath: context.projectPath,
      commitBehaviour,
      gitCommitConfig
    });

    // Validate workflow selection
    if (!context.workflowManager.validateWorkflowName(selectedWorkflow, context.projectPath)) {
      const availableWorkflows = context.workflowManager.getWorkflowNames();
      throw new Error(
        `Invalid workflow: ${selectedWorkflow}. Available workflows: ${availableWorkflows.join(', ')}, custom`
      );
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
        workflow: {}
      };

      this.logger.debug('User on main/master branch, prompting for branch creation', {
        currentBranch,
        suggestedBranchName
      });

      return branchPromptResponse;
    }

    // Create or get conversation context with the selected workflow
    const conversationContext = await context.conversationManager.createConversationContext(selectedWorkflow);
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
    const transitionResult = await context.transitionEngine.handleExplicitTransition(
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
        requireReviewsBeforePhaseTransition: requireReviews
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

    // Ensure .gitignore contains .vibe/*.sqlite entry for git repositories
    this.ensureGitignoreEntry(conversationContext.projectPath);

    // Generate workflow documentation URL
    const workflowDocumentationUrl = this.generateWorkflowDocumentationUrl(selectedWorkflow);

    // Generate instructions with simple i18n guidance
    const baseInstructions = `Look at the plan file (${conversationContext.planFilePath}). Define entrance criteria for each phase of the workflow except the initial phase. Those criteria shall be based on the contents of the previous phase. \n      Example: \n      \`\`\`\n      ## Design\n\n      ### Phase Entrance Criteria:\n      - [ ] The requirements have been thoroughly defined.\n      - [ ] Alternatives have been evaluated and are documented. \n      - [ ] It's clear what's in scope and out of scope\n      \`\`\`\n      \n      IMPORTANT: Once you added reasonable entrance call the whats_next() tool to get guided instructions for the next current phase.`;

    const i18nGuidance = `\n\nNOTE: If the user is communicating in a non-English language, please translate the plan file content to that language while keeping the structure intact, and continue all interactions in the user's language.`;

    // Add workflow documentation information if available
    const workflowDocumentationInfo = workflowDocumentationUrl
      ? `\n\nInform the user about the chose workflow: He can visit: ${workflowDocumentationUrl} to get detailed information.`
      : '';

    const finalInstructions = baseInstructions + workflowDocumentationInfo + i18nGuidance;

    const response: StartDevelopmentResult = {
      phase: transitionResult.newPhase,
      instructions: finalInstructions,
      plan_file_path: conversationContext.planFilePath,
      conversation_id: conversationContext.conversationId,
      workflow: stateMachine,
      workflowDocumentationUrl
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
   * Generate workflow documentation URL for predefined workflows
   * Returns undefined for custom workflows
   */
  private generateWorkflowDocumentationUrl(workflowName: string): string | undefined {
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
      const { execSync } = require('child_process');
      const { existsSync } = require('fs');

      // Check if this is a git repository
      if (!existsSync(`${projectPath}/.git`)) {
        this.logger.debug('Not a git repository, using "default" as branch name', { projectPath });
        return 'default';
      }

      // Get current branch name
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'] // Suppress stderr
      }).trim();

      this.logger.debug('Detected git branch', { projectPath, branch });

      return branch;
    } catch (error) {
      this.logger.debug('Failed to get git branch, using "default" as branch name', { projectPath });
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
   * Ensure .vibe/*.sqlite entry exists in .gitignore file for git repositories
   * This function is idempotent and handles various edge cases gracefully
   */
  private ensureGitignoreEntry(projectPath: string): void {
    try {
      // Check if this is a git repository
      if (!existsSync(`${projectPath}/.git`)) {
        this.logger.debug('Not a git repository, skipping .gitignore management', { projectPath });
        return;
      }

      const gitignorePath = resolve(projectPath, '.gitignore');
      const targetEntry = '.vibe/*.sqlite';

      // Read existing .gitignore or create empty content
      let gitignoreContent = '';
      if (existsSync(gitignorePath)) {
        try {
          gitignoreContent = readFileSync(gitignorePath, 'utf-8');
        } catch (error) {
          this.logger.warn('Failed to read .gitignore file, will create new one', {
            gitignorePath,
            error: error instanceof Error ? error.message : String(error)
          });
          gitignoreContent = '';
        }
      }

      // Check if entry already exists (case-insensitive and whitespace-tolerant)
      const lines = gitignoreContent.split('\n');
      const entryExists = lines.some(line =>
        line.trim().toLowerCase() === targetEntry.toLowerCase()
      );

      if (entryExists) {
        this.logger.debug('.gitignore entry already exists, skipping', {
          projectPath,
          targetEntry
        });
        return;
      }

      // Add the entry
      const newContent = gitignoreContent.endsWith('\n') || gitignoreContent === ''
        ? gitignoreContent + targetEntry + '\n'
        : gitignoreContent + '\n' + targetEntry + '\n';

      // Write the updated .gitignore
      writeFileSync(gitignorePath, newContent, 'utf-8');

      this.logger.info('Added .vibe/*.sqlite entry to .gitignore', {
        projectPath,
        gitignorePath
      });

    } catch (error) {
      // Log warning but don't fail development start
      this.logger.warn('Failed to manage .gitignore entry, continuing with development start', {
        projectPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
