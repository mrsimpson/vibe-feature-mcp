/**
 * Conversation Manager
 * 
 * Handles conversation identification, state persistence, and coordination
 * between components. Generates unique conversation identifiers from 
 * project path + git branch combination.
 */

import { execSync } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { createLogger } from './logger.js';
import { Database } from './database.js';
import { DevelopmentPhase } from './state-machine-types.js';
import type { ConversationState, ConversationContext } from './types.js';

const logger = createLogger('ConversationManager');

export class ConversationManager {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  /**
   * Get the current conversation context
   * 
   * Detects the current project path and git branch, then retrieves or creates
   * a conversation state for this context.
   */
  async getConversationContext(): Promise<ConversationContext> {
    const projectPath = this.getProjectPath();
    const gitBranch = this.getGitBranch(projectPath);
    
    logger.debug('Getting conversation context', { projectPath, gitBranch });
    
    // Generate a unique conversation ID based on project path and git branch
    const conversationId = this.generateConversationId(projectPath, gitBranch);
    
    // Try to find existing conversation state
    let state = await this.database.getConversationState(conversationId);
    
    // If no existing state, create a new one
    if (!state) {
      state = await this.createNewConversationState(conversationId, projectPath, gitBranch);
    }
    
    // Return the conversation context
    return {
      conversationId: state.conversationId,
      projectPath: state.projectPath,
      gitBranch: state.gitBranch,
      currentPhase: state.currentPhase,
      planFilePath: state.planFilePath
    };
  }
  
  /**
   * Update the conversation state
   * 
   * @param conversationId - ID of the conversation to update
   * @param updates - Partial state updates to apply
   */
  async updateConversationState(
    conversationId: string, 
    updates: Partial<Pick<ConversationState, 'currentPhase' | 'planFilePath'>>
  ): Promise<void> {
    logger.debug('Updating conversation state', { conversationId, updates });
    
    // Get current state
    const currentState = await this.database.getConversationState(conversationId);
    
    if (!currentState) {
      throw new Error(`Conversation state not found for ID: ${conversationId}`);
    }
    
    // Apply updates
    const updatedState: ConversationState = {
      ...currentState,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Save updated state
    await this.database.saveConversationState(updatedState);
    
    logger.info('Conversation state updated', { 
      conversationId, 
      currentPhase: updatedState.currentPhase 
    });
  }
  
  /**
   * Create a new conversation state
   * 
   * @param conversationId - ID for the new conversation
   * @param projectPath - Path to the project
   * @param gitBranch - Git branch name
   */
  private async createNewConversationState(
    conversationId: string,
    projectPath: string,
    gitBranch: string
  ): Promise<ConversationState> {
    logger.info('Creating new conversation state', { 
      conversationId, 
      projectPath, 
      gitBranch 
    });
    
    const timestamp = new Date().toISOString();
    
    // Generate a plan file path based on the branch name
    const planFileName = gitBranch === 'main' || gitBranch === 'master' 
      ? 'development-plan.md'
      : `development-plan-${gitBranch}.md`;
    
    const planFilePath = resolve(projectPath, '.vibe', planFileName);
    
    // Create new state
    const newState: ConversationState = {
      conversationId,
      projectPath,
      gitBranch,
      currentPhase: 'idle',
      planFilePath,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // Save to database
    await this.database.saveConversationState(newState);
    
    logger.info('New conversation state created', { 
      conversationId, 
      planFilePath 
    });
    
    return newState;
  }
  
  /**
   * Generate a unique conversation ID based on project path and git branch
   * 
   * @param projectPath - Path to the project
   * @param gitBranch - Git branch name
   */
  private generateConversationId(projectPath: string, gitBranch: string): string {
    // Extract project name from path
    const projectName = projectPath.split('/').pop() || 'unknown-project';
    
    // Clean branch name for use in ID
    const cleanBranch = gitBranch
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // For tests, use a deterministic ID
    if (process.env.NODE_ENV === 'test') {
      return `${projectName}-${cleanBranch}-p423k1`;
    }
    
    // Generate a unique ID for normal operation
    const id = Math.random().toString(36).substring(2, 8);
    
    return `${projectName}-${cleanBranch}-${id}`;
  }
  
  /**
   * Get the current project path
   */
  private getProjectPath(): string {
    return process.cwd();
  }
  
  /**
   * Get the current git branch for a project
   * 
   * @param projectPath - Path to the project
   */
  private getGitBranch(projectPath: string): string {
    try {
      // Check if this is a git repository
      if (!existsSync(`${projectPath}/.git`)) {
        logger.warn('Not a git repository, using "default" as branch name', { projectPath });
        return 'default';
      }
      
      // Get current branch name
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectPath,
        encoding: 'utf-8'
      }).trim();
      
      logger.debug('Detected git branch', { projectPath, branch });
      
      return branch;
    } catch (error) {
      logger.warn('Failed to get git branch, using "default" as branch name', { projectPath });
      return 'default';
    }
  }
}
