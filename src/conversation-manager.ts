/**
 * Conversation Manager - Enhanced with project path configuration
 * 
 * Key improvements:
 * - Support VIBE_PROJECT_PATH environment variable
 * - Better project path detection and validation
 * - Enhanced error messages with configuration guidance
 */

import { execSync } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { createLogger } from './logger.js';
import { Database } from './database.js';
import type { ConversationState, ConversationContext } from './types.js';
import { WorkflowManager } from './workflow-manager.js';
import { PlanManager } from './plan-manager.js';

const logger = createLogger('ConversationManager');

export class ConversationManager {
  private database: Database;
  private projectPath: string;

  constructor(database: Database, projectPath?: string) {
    this.database = database;
    // ENHANCED: Support multiple project path sources
    this.projectPath = this.determineProjectPath(projectPath);
  }

  /**
   * ENHANCED: Determine project path from multiple sources
   * Priority: parameter > environment variable > process.cwd()
   */
  private determineProjectPath(providedPath?: string): string {
    let projectPath: string;
    
    if (providedPath) {
      projectPath = providedPath;
      logger.debug('Using provided project path', { projectPath });
    } else if (process.env.VIBE_PROJECT_PATH) {
      projectPath = process.env.VIBE_PROJECT_PATH;
      logger.info('Using project path from VIBE_PROJECT_PATH environment variable', { projectPath });
    } else {
      projectPath = process.cwd();
      logger.debug('Using current working directory as project path', { projectPath });
    }
    
    // Validate that the project path exists
    if (!existsSync(projectPath)) {
      logger.warn('Project path does not exist, using current working directory', { 
        invalidPath: projectPath,
        fallbackPath: process.cwd()
      });
      projectPath = process.cwd();
    }
    
    return resolve(projectPath);
  }

  /**
   * ENHANCED: Update project path with validation
   */
  public setProjectPath(projectPath: string): void {
    const resolvedPath = resolve(projectPath);
    
    if (!existsSync(resolvedPath)) {
      throw new Error(`Project path does not exist: ${resolvedPath}`);
    }
    
    this.projectPath = resolvedPath;
    logger.info('Project path updated', { projectPath: this.projectPath });
  }

  async getConversationState(conversationId: string): Promise<ConversationState | null> {
    return await this.database.getConversationState(conversationId);
  }

  /**
   * ENHANCED: Better error messages with configuration guidance
   */
  async getConversationContext(): Promise<ConversationContext> {
    const projectPath = this.getProjectPath();
    const gitBranch = this.getGitBranch(projectPath);
    
    logger.debug('Getting conversation context', { projectPath, gitBranch });
    
    const conversationId = this.generateConversationId(projectPath, gitBranch);
    const state = await this.database.getConversationState(conversationId);
    
    if (!state) {
      logger.warn('No conversation found for context', { projectPath, gitBranch, conversationId });
      
      // ENHANCED: Provide helpful error message with configuration suggestions
      let errorMessage = 'No development conversation exists for this project. Use the start_development tool first to initialize development with a workflow.';
      
      if (process.env.VIBE_PROJECT_PATH) {
        errorMessage += `\n\nNote: Using project path from VIBE_PROJECT_PATH: ${process.env.VIBE_PROJECT_PATH}`;
      } else {
        errorMessage += `\n\nNote: Using current working directory: ${projectPath}\n` +
                       `To use a different project directory, set the VIBE_PROJECT_PATH environment variable.`;
      }
      
      throw new Error(errorMessage);
    }
    
    return {
      conversationId: state.conversationId,
      projectPath: state.projectPath,
      gitBranch: state.gitBranch,
      currentPhase: state.currentPhase,
      planFilePath: state.planFilePath,
      workflowName: state.workflowName
    };
  }
  
  async createConversationContext(workflowName: string): Promise<ConversationContext> {
    const projectPath = this.getProjectPath();
    const gitBranch = this.getGitBranch(projectPath);
    
    logger.debug('Creating conversation context', { projectPath, gitBranch, workflowName });
    
    const conversationId = this.generateConversationId(projectPath, gitBranch);
    const existingState = await this.database.getConversationState(conversationId);
    
    if (existingState) {
      logger.debug('Conversation already exists, returning existing context', { conversationId });
      return {
        conversationId: existingState.conversationId,
        projectPath: existingState.projectPath,
        gitBranch: existingState.gitBranch,
        currentPhase: existingState.currentPhase,
        planFilePath: existingState.planFilePath,
        workflowName: existingState.workflowName
      };
    }
    
    const state = await this.createNewConversationState(conversationId, projectPath, gitBranch, workflowName);
    
    return {
      conversationId: state.conversationId,
      projectPath: state.projectPath,
      gitBranch: state.gitBranch,
      currentPhase: state.currentPhase,
      planFilePath: state.planFilePath,
      workflowName: state.workflowName
    };
  }
  
  async updateConversationState(
    conversationId: string, 
    updates: Partial<Pick<ConversationState, 'currentPhase' | 'planFilePath' | 'workflowName'>>
  ): Promise<void> {
    logger.debug('Updating conversation state', { conversationId, updates });
    
    const currentState = await this.database.getConversationState(conversationId);
    
    if (!currentState) {
      throw new Error(`Conversation state not found for ID: ${conversationId}`);
    }
    
    const updatedState: ConversationState = {
      ...currentState,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.database.saveConversationState(updatedState);
    
    logger.info('Conversation state updated', { 
      conversationId, 
      currentPhase: updatedState.currentPhase 
    });
  }
  
  /**
   * ENHANCED: Support both file naming conventions for custom workflow detection
   */
  private detectWorkflowForProject(projectPath: string): string {
    const customFilePaths = [
      resolve(projectPath, '.vibe', 'state-machine.yaml'),
      resolve(projectPath, '.vibe', 'state-machine.yml'),
      resolve(projectPath, '.vibe', 'workflow.yaml'),
      resolve(projectPath, '.vibe', 'workflow.yml')
    ];
    
    for (const filePath of customFilePaths) {
      if (existsSync(filePath)) {
        logger.debug('Custom workflow detected', { filePath });
        return 'custom';
      }
    }
    
    logger.debug('No custom workflow found, defaulting to waterfall');
    return 'waterfall';
  }

  // Rest of the methods remain largely the same...
  private async createNewConversationState(
    conversationId: string,
    projectPath: string,
    gitBranch: string,
    workflowName: string = 'waterfall'
  ): Promise<ConversationState> {
    logger.info('Creating new conversation state', { 
      conversationId, 
      projectPath, 
      gitBranch 
    });
    
    const timestamp = new Date().toISOString();
    const planFileName = gitBranch === 'main' || gitBranch === 'master' 
      ? 'development-plan.md'
      : `development-plan-${gitBranch}.md`;
    
    const planFilePath = resolve(projectPath, '.vibe', planFileName);
    
    const workflowManager = new WorkflowManager();
    const stateMachine = workflowManager.loadWorkflowForProject(projectPath, workflowName);
    const initialPhase = stateMachine.initial_state;

    const newState: ConversationState = {
      conversationId,
      projectPath,
      gitBranch,
      currentPhase: initialPhase,
      planFilePath,
      workflowName,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await this.database.saveConversationState(newState);
    
    logger.info('New conversation state created', { 
      conversationId, 
      planFilePath,
      initialPhase
    });
    
    return newState;
  }
  
  private generateConversationId(projectPath: string, gitBranch: string): string {
    const projectName = projectPath.split('/').pop() || 'unknown-project';
    const cleanBranch = gitBranch
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    if (process.env.NODE_ENV === 'test') {
      return `${projectName}-${cleanBranch}-p423k1`;
    }
    
    let hash = 0;
    const str = `${projectPath}:${gitBranch}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hashStr = Math.abs(hash).toString(36).substring(0, 6);
    
    return `${projectName}-${cleanBranch}-${hashStr}`;
  }
  
  private getProjectPath(): string {
    return this.projectPath;
  }
  
  private getGitBranch(projectPath: string): string {
    try {
      if (!existsSync(`${projectPath}/.git`)) {
        logger.debug('Not a git repository, using "default" as branch name', { projectPath });
        return 'default';
      }
      
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
      
      logger.debug('Detected git branch', { projectPath, branch });
      return branch;
    } catch (error) {
      logger.debug('Failed to get git branch, using "default" as branch name', { projectPath });
      return 'default';
    }
  }

  // Additional methods like hasInteractions, resetConversation etc. remain the same...
  async hasInteractions(conversationId: string): Promise<boolean> {
    try {
      const result = await (this.database as any).getRow(
        'SELECT COUNT(*) as count FROM interaction_logs WHERE conversation_id = ?',
        [conversationId]
      );
      
      const count = result?.count || 0;
      logger.debug('Checked interaction count for conversation', { conversationId, count });
      
      return count > 0;
    } catch (error) {
      logger.error('Failed to check interaction count', error as Error, { conversationId });
      return false;
    }
  }

  async resetConversation(confirm: boolean, reason?: string): Promise<{
    success: boolean;
    resetItems: string[];
    conversationId: string;
    message: string;
  }> {
    logger.info('Starting conversation reset', { confirm, reason });
    
    if (!confirm) {
      throw new Error('Reset operation requires explicit confirmation. Set confirm parameter to true.');
    }
    
    const context = await this.getConversationContext();
    const resetItems: string[] = [];
    
    try {
      await this.database.softDeleteInteractionLogs(context.conversationId, reason);
      resetItems.push('interaction_logs');
      
      await this.database.deleteConversationState(context.conversationId);
      resetItems.push('conversation_state');
      
      const planManager = new PlanManager();
      await planManager.deletePlanFile(context.planFilePath);
      resetItems.push('plan_file');
      
      const message = `Successfully reset conversation ${context.conversationId}. Reset items: ${resetItems.join(', ')}${reason ? `. Reason: ${reason}` : ''}`;
      
      logger.info('Conversation reset completed successfully', {
        conversationId: context.conversationId,
        resetItems,
        reason
      });
      
      return {
        success: true,
        resetItems,
        conversationId: context.conversationId,
        message
      };
      
    } catch (error) {
      logger.error('Failed to reset conversation', error as Error, {
        conversationId: context.conversationId,
        resetItems,
        reason
      });
      
      throw new Error(`Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cleanupConversationData(conversationId: string): Promise<void> {
    logger.debug('Cleaning up conversation data', { conversationId });
    
    try {
      await this.database.softDeleteInteractionLogs(conversationId);
      await this.database.deleteConversationState(conversationId);
      
      logger.debug('Conversation data cleanup completed', { conversationId });
    } catch (error) {
      logger.error('Failed to cleanup conversation data', error as Error, { conversationId });
      throw error;
    }
  }
}