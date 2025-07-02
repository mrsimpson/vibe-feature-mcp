/**
 * StartDevelopment Tool Handler
 * 
 * Handles initialization of development workflow and transition to the initial 
 * development phase. Allows users to choose from predefined workflows or use a custom workflow.
 */

import { BaseToolHandler } from './base-tool-handler.js';
import { ServerContext } from '../types.js';
import { validateRequiredArgs } from '../server-helpers.js';

/**
 * Arguments for the start_development tool
 */
export interface StartDevelopmentArgs {
  workflow: string;
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

    this.logger.debug('Processing start_development request', { 
      selectedWorkflow
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
        instructions: `You're currently on the ${currentBranch} branch. It's recommended to create a feature branch for development. Propose a branch creation by suggesting a branch command to the user call start_development again.

Suggested command: \`git checkout -b ${suggestedBranchName}\`

Please create a new branch and then call start_development again to begin development.`,
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
    
    // Update conversation state with workflow and phase
    await context.conversationManager.updateConversationState(
      conversationContext.conversationId,
      { 
        currentPhase: transitionResult.newPhase,
        workflowName: selectedWorkflow
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
    
    const response: StartDevelopmentResult = {
      phase: transitionResult.newPhase,
      instructions: `Look at the plan file (${conversationContext.planFilePath}). Define entrance criteria for each phase of the workflow except the initial phase. Those criteria shall be based on the contents of the previous phase. 
      Example: 
      \`\`\`
      ## Design

      ### Phase Entrance Criteria:
      - [ ] The requirements have been thoroughly defined.
      - [ ] Alternatives have been evaluated and are documented. 
      - [ ] It's clear what's in scope and out of scope
      \`\`\`
      
      IMPORTANT: Once you added reasonable entrance call the whats_next() tool to get guided instructions for the next current phase.`,
      plan_file_path: conversationContext.planFilePath,
      conversation_id: conversationContext.conversationId,
      workflow: stateMachine
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
}
