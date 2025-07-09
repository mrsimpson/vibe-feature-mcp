/**
 * GitManager
 * 
 * Handles git operations for the responsible-vibe-mcp server, including
 * automatic commits based on user configuration.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { createLogger } from './logger.js';
import { GitCommitConfig } from './types.js';

const logger = createLogger('GitManager');

export class GitManager {
  
  /**
   * Check if a directory is a git repository
   */
  static isGitRepository(projectPath: string): boolean {
    return existsSync(`${projectPath}/.git`);
  }

  /**
   * Get the current git branch for a project
   */
  static getCurrentBranch(projectPath: string): string {
    try {
      if (!this.isGitRepository(projectPath)) {
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

  /**
   * Check if there are any changes to commit
   */
  static hasChangesToCommit(projectPath: string): boolean {
    try {
      if (!this.isGitRepository(projectPath)) {
        return false;
      }

      // Check for staged and unstaged changes
      const status = execSync('git status --porcelain', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();

      return status.length > 0;
    } catch (error) {
      logger.debug('Failed to check git status', { projectPath, error });
      return false;
    }
  }

  /**
   * Stage all changes in the project
   */
  static stageAllChanges(projectPath: string): void {
    try {
      if (!this.isGitRepository(projectPath)) {
        logger.debug('Not a git repository, skipping stage operation', { projectPath });
        return;
      }

      execSync('git add .', {
        cwd: projectPath,
        stdio: ['ignore', 'pipe', 'ignore']
      });

      logger.debug('Staged all changes', { projectPath });
    } catch (error) {
      logger.warn('Failed to stage changes', { projectPath, error });
      throw new Error(`Failed to stage changes: ${error}`);
    }
  }

  /**
   * Create a commit with the specified message
   */
  static createCommit(projectPath: string, message: string): void {
    try {
      if (!this.isGitRepository(projectPath)) {
        logger.debug('Not a git repository, skipping commit operation', { projectPath });
        return;
      }

      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
        cwd: projectPath,
        stdio: ['ignore', 'pipe', 'ignore']
      });

      logger.info('Created git commit', { projectPath, message });
    } catch (error) {
      logger.warn('Failed to create commit', { projectPath, message, error });
      throw new Error(`Failed to create commit: ${error}`);
    }
  }

  /**
   * Get list of commits since a specific commit (for rebase operations)
   */
  static getCommitsSince(projectPath: string, sinceCommit: string): string[] {
    try {
      if (!this.isGitRepository(projectPath)) {
        return [];
      }

      const commits = execSync(`git rev-list ${sinceCommit}..HEAD`, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();

      return commits ? commits.split('\n') : [];
    } catch (error) {
      logger.debug('Failed to get commits since', { projectPath, sinceCommit, error });
      return [];
    }
  }

  /**
   * Perform interactive rebase to squash commits
   */
  static squashCommits(projectPath: string, commitCount: number, finalMessage: string): void {
    try {
      if (!this.isGitRepository(projectPath)) {
        logger.debug('Not a git repository, skipping squash operation', { projectPath });
        return;
      }

      if (commitCount <= 1) {
        logger.debug('Only one or no commits to squash, skipping', { projectPath, commitCount });
        return;
      }

      // Use git reset to squash commits and recommit
      execSync(`git reset --soft HEAD~${commitCount}`, {
        cwd: projectPath,
        stdio: ['ignore', 'pipe', 'ignore']
      });

      execSync(`git commit -m "${finalMessage.replace(/"/g, '\\"')}"`, {
        cwd: projectPath,
        stdio: ['ignore', 'pipe', 'ignore']
      });

      logger.info('Squashed commits', { projectPath, commitCount, finalMessage });
    } catch (error) {
      logger.warn('Failed to squash commits', { projectPath, commitCount, finalMessage, error });
      throw new Error(`Failed to squash commits: ${error}`);
    }
  }

  /**
   * Create a WIP commit if there are changes and commit is enabled
   */
  static createWipCommitIfNeeded(
    projectPath: string, 
    config: GitCommitConfig, 
    context: string,
    phase: string
  ): boolean {
    try {
      if (!config.enabled || !this.isGitRepository(projectPath)) {
        return false;
      }

      if (!this.hasChangesToCommit(projectPath)) {
        logger.debug('No changes to commit', { projectPath, context });
        return false;
      }

      this.stageAllChanges(projectPath);
      
      const message = `WIP: ${config.initialMessage} - ${context} (${phase})`;
      this.createCommit(projectPath, message);
      
      return true;
    } catch (error) {
      logger.warn('Failed to create WIP commit', { projectPath, context, phase, error });
      return false;
    }
  }

  /**
   * Create final commit with squashing if there were intermediate commits
   */
  static createFinalCommit(
    projectPath: string,
    config: GitCommitConfig,
    startCommit: string,
    finalMessage: string
  ): void {
    try {
      if (!config.enabled || !this.isGitRepository(projectPath)) {
        return;
      }

      const intermediateCommits = this.getCommitsSince(projectPath, startCommit);
      
      if (intermediateCommits.length > 1) {
        // Squash intermediate commits
        this.squashCommits(projectPath, intermediateCommits.length, finalMessage);
        logger.info('Created final commit with squashing', { 
          projectPath, 
          intermediateCommits: intermediateCommits.length,
          finalMessage 
        });
      } else if (intermediateCommits.length === 1) {
        // Just amend the single commit with final message
        execSync(`git commit --amend -m "${finalMessage.replace(/"/g, '\\"')}"`, {
          cwd: projectPath,
          stdio: ['ignore', 'pipe', 'ignore']
        });
        logger.info('Amended single commit with final message', { projectPath, finalMessage });
      } else {
        // No intermediate commits, create final commit if there are changes
        if (this.hasChangesToCommit(projectPath)) {
          this.stageAllChanges(projectPath);
          this.createCommit(projectPath, finalMessage);
          logger.info('Created final commit', { projectPath, finalMessage });
        }
      }
    } catch (error) {
      logger.warn('Failed to create final commit', { projectPath, finalMessage, error });
      throw new Error(`Failed to create final commit: ${error}`);
    }
  }

  /**
   * Get the current HEAD commit hash (for tracking start of development)
   */
  static getCurrentCommitHash(projectPath: string): string | null {
    try {
      if (!this.isGitRepository(projectPath)) {
        return null;
      }

      const hash = execSync('git rev-parse HEAD', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();

      return hash;
    } catch (error) {
      logger.debug('Failed to get current commit hash', { projectPath, error });
      return null;
    }
  }
}
