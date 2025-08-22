/**
 * Common types used across the application
 */

/**
 * Interface for interaction log entries
 */
export interface InteractionLog {
  id?: number;
  conversationId: string;
  toolName: string;
  inputParams: string;
  responseData: string;
  currentPhase: string;
  timestamp: string;
  isReset?: boolean;
  resetAt?: string;
}

/**
 * Interface for conversation state
 */
/**
 * Git commit configuration options
 */
export interface GitCommitConfig {
  enabled: boolean;
  commitOnStep: boolean; // Commit after each step (before whats_next)
  commitOnPhase: boolean; // Commit after each phase (before phase transition)
  commitOnComplete: boolean; // Final commit at development end with rebase+squash
  initialMessage: string; // Initial user message for commit context
  startCommitHash?: string; // Hash of commit when development started (for squashing)
}

export interface ConversationState {
  conversationId: string;
  projectPath: string;
  gitBranch: string;
  currentPhase: string;
  planFilePath: string;
  workflowName: string;
  gitCommitConfig?: GitCommitConfig;
  requireReviewsBeforePhaseTransition: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for conversation context
 */
export interface ConversationContext {
  conversationId: string;
  projectPath: string;
  gitBranch: string;
  currentPhase: string;
  planFilePath: string;
  workflowName: string;
  gitCommitConfig?: GitCommitConfig;
  requireReviewsBeforePhaseTransition?: boolean;
}
