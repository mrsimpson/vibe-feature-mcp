/**
 * Database module for persistent state storage
 *
 * Manages SQLite database for conversation state persistence.
 * Stores minimal state information to survive server restarts.
 * Also stores interaction logs for auditing and debugging.
 */

import sqlite3 from 'sqlite3';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { join } from 'node:path';
import { createLogger } from './logger.js';
import type { DevelopmentPhase } from './state-machine.js';
import type {
  ConversationState,
  InteractionLog,
  GitCommitConfig,
} from './types.js';

const logger = createLogger('Database');

// SQLite parameter types
type SqliteParam = string | number | boolean | null | undefined | Buffer;
type SqliteRow = Record<string, SqliteParam>;
type SqliteColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: SqliteParam;
  pk: number;
};

// Database row validation utilities
function validateString(value: SqliteParam, fieldName: string): string {
  if (typeof value === 'string') {
    return value;
  }
  throw new Error(
    `Database field '${fieldName}' expected string but got ${typeof value}: ${value}`
  );
}

function parseJsonSafely(value: SqliteParam, fieldName: string): unknown {
  if (!value) {
    return undefined;
  }
  const stringValue = validateString(value, fieldName);
  try {
    return JSON.parse(stringValue);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON in field '${fieldName}': ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function mapRowToInteractionLog(row: SqliteRow): InteractionLog {
  return {
    id: typeof row.id === 'number' ? row.id : undefined,
    conversationId: validateString(row.conversationId, 'conversationId'),
    toolName: validateString(row.toolName, 'toolName'),
    inputParams: validateString(row.inputParams, 'inputParams'),
    responseData: validateString(row.responseData, 'responseData'),
    currentPhase: validateString(row.currentPhase, 'currentPhase'),
    timestamp: validateString(row.timestamp, 'timestamp'),
    isReset: typeof row.isReset === 'number' ? Boolean(row.isReset) : undefined,
    resetAt: row.resetAt ? validateString(row.resetAt, 'resetAt') : undefined,
  };
}

export class Database {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(projectPath: string) {
    // Store database in .vibe subfolder of the project
    const vibeDir = join(projectPath, '.vibe');
    this.dbPath = join(vibeDir, 'conversation-state.sqlite');
    logger.debug('Database path configured', {
      projectPath,
      dbPath: this.dbPath,
    });
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    logger.debug('Initializing database', { dbPath: this.dbPath });

    try {
      // Ensure directory exists
      await mkdir(dirname(this.dbPath), { recursive: true });
      logger.debug('Database directory ensured', {
        directory: dirname(this.dbPath),
      });

      // Create database connection
      this.db = new sqlite3.Database(this.dbPath);
      logger.debug('Database connection established');

      // Create conversation_states table
      await this.runQuery(`
        CREATE TABLE IF NOT EXISTS conversation_states (
          conversation_id TEXT PRIMARY KEY,
          project_path TEXT NOT NULL,
          git_branch TEXT NOT NULL,
          current_phase TEXT NOT NULL,
          plan_file_path TEXT NOT NULL,
          workflow_name TEXT DEFAULT 'waterfall',
          git_commit_config TEXT, -- JSON string for GitCommitConfig
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Create index for efficient lookups
      await this.runQuery(`
        CREATE INDEX IF NOT EXISTS idx_project_branch 
        ON conversation_states(project_path, git_branch)
      `);

      // Create interaction_logs table
      await this.runQuery(`
        CREATE TABLE IF NOT EXISTS interaction_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id TEXT NOT NULL,
          tool_name TEXT NOT NULL,
          input_params TEXT NOT NULL,
          response_data TEXT NOT NULL,
          current_phase TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          is_reset BOOLEAN DEFAULT FALSE,
          reset_at TEXT,
          FOREIGN KEY (conversation_id) REFERENCES conversation_states(conversation_id)
        )
      `);

      // Create index for efficient lookups of interaction logs
      await this.runQuery(`
        CREATE INDEX IF NOT EXISTS idx_interaction_conversation_id 
        ON interaction_logs(conversation_id)
      `);

      // Run migrations to add any missing columns
      await this.runMigrations();

      logger.info('Database initialized successfully', { dbPath: this.dbPath });
    } catch (error) {
      logger.error('Failed to initialize database', error as Error, {
        dbPath: this.dbPath,
      });
      throw error;
    }
  }

  /**
   * Helper method to run queries with promises
   */
  private runQuery(sql: string, params: SqliteParam[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Helper method to get single row with promises
   */
  private getRow(
    sql: string,
    params: SqliteParam[] = []
  ): Promise<SqliteRow | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as SqliteRow | null);
        }
      });
    });
  }

  /**
   * Helper method to get multiple rows with promises
   */
  private getAllRows(
    sql: string,
    params: SqliteParam[] = []
  ): Promise<SqliteRow[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as SqliteRow[]);
        }
      });
    });
  }

  /**
   * Get conversation state by ID
   */
  async getConversationState(
    conversationId: string
  ): Promise<ConversationState | null> {
    logger.debug('Retrieving conversation state', { conversationId });

    try {
      const row = await this.getRow(
        'SELECT * FROM conversation_states WHERE conversation_id = ?',
        [conversationId]
      );

      if (!row) {
        logger.debug('Conversation state not found', { conversationId });
        return null;
      }

      const state: ConversationState = {
        conversationId: validateString(row.conversation_id, 'conversation_id'),
        projectPath: validateString(row.project_path, 'project_path'),
        gitBranch: validateString(row.git_branch, 'git_branch'),
        currentPhase: validateString(
          row.current_phase,
          'current_phase'
        ) as DevelopmentPhase,
        planFilePath: validateString(row.plan_file_path, 'plan_file_path'),
        workflowName: validateString(row.workflow_name, 'workflow_name'),
        gitCommitConfig: parseJsonSafely(
          row.git_commit_config,
          'git_commit_config'
        ) as GitCommitConfig | undefined,
        requireReviewsBeforePhaseTransition: Boolean(
          row.require_reviews_before_phase_transition
        ),
        createdAt: validateString(row.created_at, 'created_at'),
        updatedAt: validateString(row.updated_at, 'updated_at'),
      };

      logger.debug('Conversation state retrieved', {
        conversationId,
        currentPhase: state.currentPhase,
        projectPath: state.projectPath,
      });

      return state;
    } catch (error) {
      logger.error('Failed to retrieve conversation state', error as Error, {
        conversationId,
      });
      throw error;
    }
  }

  /**
   * Save or update conversation state
   */
  async saveConversationState(state: ConversationState): Promise<void> {
    logger.debug('Saving conversation state', {
      conversationId: state.conversationId,
      currentPhase: state.currentPhase,
      projectPath: state.projectPath,
      workflowName: state.workflowName,
    });

    try {
      await this.runQuery(
        `INSERT OR REPLACE INTO conversation_states (
          conversation_id, project_path, git_branch, current_phase,
          plan_file_path, workflow_name, git_commit_config, require_reviews_before_phase_transition, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          state.conversationId,
          state.projectPath,
          state.gitBranch,
          state.currentPhase,
          state.planFilePath,
          state.workflowName,
          state.gitCommitConfig ? JSON.stringify(state.gitCommitConfig) : null,
          state.requireReviewsBeforePhaseTransition,
          state.createdAt,
          state.updatedAt,
        ]
      );

      logger.info('Conversation state saved successfully', {
        conversationId: state.conversationId,
        currentPhase: state.currentPhase,
      });
    } catch (error) {
      logger.error('Failed to save conversation state', error as Error, {
        conversationId: state.conversationId,
      });
      throw error;
    }
  }

  /**
   * Find conversation by project path and git branch
   */
  async findConversationByProject(
    projectPath: string,
    gitBranch: string
  ): Promise<ConversationState | null> {
    const row = await this.getRow(
      'SELECT * FROM conversation_states WHERE project_path = ? AND git_branch = ?',
      [projectPath, gitBranch]
    );

    if (!row) {
      return null;
    }

    return {
      conversationId: validateString(row.conversation_id, 'conversation_id'),
      projectPath: validateString(row.project_path, 'project_path'),
      gitBranch: validateString(row.git_branch, 'git_branch'),
      currentPhase: validateString(
        row.current_phase,
        'current_phase'
      ) as DevelopmentPhase,
      planFilePath: validateString(row.plan_file_path, 'plan_file_path'),
      workflowName: validateString(row.workflow_name, 'workflow_name'),
      gitCommitConfig: parseJsonSafely(
        row.git_commit_config,
        'git_commit_config'
      ) as GitCommitConfig | undefined,
      requireReviewsBeforePhaseTransition: Boolean(
        row.require_reviews_before_phase_transition
      ),
      createdAt: validateString(row.created_at, 'created_at'),
      updatedAt: validateString(row.updated_at, 'updated_at'),
    };
  }

  /**
   * Delete conversation state
   */
  async deleteConversationState(conversationId: string): Promise<void> {
    await this.runQuery(
      'DELETE FROM conversation_states WHERE conversation_id = ?',
      [conversationId]
    );
  }

  /**
   * Log an interaction to the database
   */
  async logInteraction(log: InteractionLog): Promise<void> {
    logger.debug('Logging interaction to database', {
      conversationId: log.conversationId,
      toolName: log.toolName,
    });

    try {
      await this.runQuery(
        `INSERT INTO interaction_logs (
          conversation_id, tool_name, input_params, response_data,
          current_phase, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          log.conversationId,
          log.toolName,
          log.inputParams,
          log.responseData,
          log.currentPhase,
          log.timestamp,
        ]
      );

      logger.debug('Interaction logged successfully', {
        conversationId: log.conversationId,
        toolName: log.toolName,
        timestamp: log.timestamp,
      });
    } catch (error) {
      logger.error('Failed to log interaction', error as Error, {
        conversationId: log.conversationId,
      });
      throw error;
    }
  }

  /**
   * Get all interactions for a specific conversation
   */
  async getInteractionsByConversationId(
    conversationId: string
  ): Promise<InteractionLog[]> {
    logger.debug('Getting interactions by conversation ID', { conversationId });

    try {
      const rows = await this.getAllRows(
        'SELECT * FROM interaction_logs WHERE conversation_id = ? ORDER BY timestamp ASC',
        [conversationId]
      );

      const logs: InteractionLog[] = rows.map(row => ({
        id: typeof row.id === 'number' ? row.id : undefined,
        conversationId: validateString(row.conversation_id, 'conversation_id'),
        toolName: validateString(row.tool_name, 'tool_name'),
        inputParams: validateString(row.input_params, 'input_params'),
        responseData: validateString(row.response_data, 'response_data'),
        currentPhase: validateString(
          row.current_phase,
          'current_phase'
        ) as DevelopmentPhase,
        timestamp: validateString(row.timestamp, 'timestamp'),
      }));

      logger.debug('Retrieved interaction logs', {
        conversationId,
        count: logs.length,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to get interaction logs', error as Error, {
        conversationId,
      });
      throw error;
    }
  }

  /**
   * Run database migrations to add new columns
   */
  private async runMigrations(): Promise<void> {
    logger.debug('Running database migrations');

    try {
      // Check if interaction_logs table exists first
      const tables = await this.getAllRows(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='interaction_logs'"
      );

      if (tables.length > 0) {
        // Table exists, check for missing columns
        const tableInfo = await this.getAllRows(
          'PRAGMA table_info(interaction_logs)'
        );
        const hasIsReset = (tableInfo as unknown as SqliteColumnInfo[]).some(
          (col: SqliteColumnInfo) => col.name === 'is_reset'
        );
        const hasResetAt = (tableInfo as unknown as SqliteColumnInfo[]).some(
          (col: SqliteColumnInfo) => col.name === 'reset_at'
        );

        if (!hasIsReset) {
          logger.info('Adding is_reset column to interaction_logs table');
          await this.runQuery(
            'ALTER TABLE interaction_logs ADD COLUMN is_reset BOOLEAN DEFAULT FALSE'
          );
        }

        if (!hasResetAt) {
          logger.info('Adding reset_at column to interaction_logs table');
          await this.runQuery(
            'ALTER TABLE interaction_logs ADD COLUMN reset_at TEXT'
          );
        }
      }

      // Check if conversation_states table exists and has workflow_name column
      const conversationTables = await this.getAllRows(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='conversation_states'"
      );

      if (conversationTables.length > 0) {
        const conversationTableInfo = (await this.getAllRows(
          'PRAGMA table_info(conversation_states)'
        )) as SqliteColumnInfo[];
        const hasWorkflowName = conversationTableInfo.some(
          (col: SqliteColumnInfo) => col.name === 'workflow_name'
        );
        const hasGitCommitConfig = conversationTableInfo.some(
          (col: SqliteColumnInfo) => col.name === 'git_commit_config'
        );
        const hasRequireReviews = conversationTableInfo.some(
          (col: SqliteColumnInfo) =>
            col.name === 'require_reviews_before_phase_transition'
        );

        if (!hasWorkflowName) {
          logger.info(
            'Adding workflow_name column to conversation_states table'
          );
          await this.runQuery(
            "ALTER TABLE conversation_states ADD COLUMN workflow_name TEXT DEFAULT 'waterfall'"
          );
        }

        if (!hasGitCommitConfig) {
          logger.info(
            'Adding git_commit_config column to conversation_states table'
          );
          await this.runQuery(
            'ALTER TABLE conversation_states ADD COLUMN git_commit_config TEXT'
          );
        }

        if (!hasRequireReviews) {
          logger.info(
            'Adding require_reviews_before_phase_transition column to conversation_states table'
          );
          await this.runQuery(
            'ALTER TABLE conversation_states ADD COLUMN require_reviews_before_phase_transition BOOLEAN DEFAULT FALSE'
          );
        }
      }

      logger.debug('Database migrations completed successfully');
    } catch (error) {
      logger.error('Failed to run database migrations', error as Error);
      throw error;
    }
  }

  /**
   * Soft delete interaction logs for a conversation
   */
  async softDeleteInteractionLogs(
    conversationId: string,
    reason?: string
  ): Promise<void> {
    logger.debug('Soft deleting interaction logs', { conversationId, reason });

    try {
      const resetAt = new Date().toISOString();
      await this.runQuery(
        'UPDATE interaction_logs SET is_reset = TRUE, reset_at = ? WHERE conversation_id = ? AND is_reset = FALSE',
        [resetAt, conversationId]
      );

      logger.info('Interaction logs soft deleted successfully', {
        conversationId,
        reason,
        resetAt,
      });
    } catch (error) {
      logger.error('Failed to soft delete interaction logs', error as Error, {
        conversationId,
      });
      throw error;
    }
  }

  /**
   * Get active (non-reset) interaction logs for a conversation
   */
  async getActiveInteractionLogs(
    conversationId: string
  ): Promise<InteractionLog[]> {
    logger.debug('Getting active interaction logs', { conversationId });

    try {
      const rows = await this.getAllRows(
        'SELECT * FROM interaction_logs WHERE conversation_id = ? AND (is_reset = FALSE OR is_reset IS NULL) ORDER BY timestamp ASC',
        [conversationId]
      );

      const logs: InteractionLog[] = rows.map(row =>
        mapRowToInteractionLog({
          id: row.id,
          conversationId: row.conversation_id,
          toolName: row.tool_name,
          inputParams: row.input_params,
          responseData: row.response_data,
          currentPhase: row.current_phase,
          timestamp: row.timestamp,
        })
      );

      logger.debug('Retrieved active interaction logs', {
        conversationId,
        count: logs.length,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to get active interaction logs', error as Error, {
        conversationId,
      });
      throw error;
    }
  }

  /**
   * Get all interaction logs including reset ones for a conversation
   */
  async getAllInteractionLogsIncludingReset(
    conversationId: string
  ): Promise<InteractionLog[]> {
    logger.debug('Getting all interaction logs including reset', {
      conversationId,
    });

    try {
      const rows = await this.getAllRows(
        'SELECT * FROM interaction_logs WHERE conversation_id = ? ORDER BY timestamp ASC',
        [conversationId]
      );

      const logs: InteractionLog[] = rows.map(row =>
        mapRowToInteractionLog({
          id: row.id,
          conversationId: row.conversation_id,
          toolName: row.tool_name,
          inputParams: row.input_params,
          responseData: row.response_data,
          currentPhase: row.current_phase,
          timestamp: row.timestamp,
          isReset: row.is_reset,
          resetAt: row.reset_at,
        })
      );

      logger.debug('Retrieved all interaction logs including reset', {
        conversationId,
        count: logs.length,
        resetCount: logs.filter(log => log.isReset).length,
      });

      return logs;
    } catch (error) {
      logger.error(
        'Failed to get all interaction logs including reset',
        error as Error,
        { conversationId }
      );
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    logger.debug('Closing database connection');

    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close(err => {
          if (err) {
            logger.error('Failed to close database connection', err);
            reject(err);
          } else {
            this.db = null;
            logger.info('Database connection closed successfully');
            resolve();
          }
        });
      } else {
        logger.debug('Database connection already closed');
        resolve();
      }
    });
  }
}
