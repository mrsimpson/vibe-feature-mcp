import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createLogger } from './logger.js';

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
        logger.debug('Not a git repository, using "default" as branch name', {
          projectPath,
        });
        return 'default';
      }

      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();

      logger.debug('Detected git branch', { projectPath, branch });
      return branch;
    } catch (_error) {
      logger.debug('Failed to get git branch, using "default" as branch name', {
        projectPath,
      });
      return 'default';
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
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();

      return hash;
    } catch (error) {
      logger.debug('Failed to get current commit hash', { projectPath, error });
      return null;
    }
  }
}
