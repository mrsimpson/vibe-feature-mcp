/**
 * UI-specific type definitions for the workflow visualizer
 */

// Import existing types from the main project
import type { YamlStateMachine, YamlState, YamlTransition } from '../../../src/state-machine-types';

// Re-export for convenience
export type { YamlStateMachine, YamlState, YamlTransition };

/**
 * Application state interface
 */
export interface AppState {
  currentWorkflow: YamlStateMachine | null;
  selectedElement: SelectedElement | null;
  highlightedPath: string[] | null;
  isLoading: boolean;
  error: string | null;
  parentState: { id: string; data: any } | null;
}

/**
 * Selected element in the diagram
 */
export interface SelectedElement {
  type: 'state' | 'transition';
  id: string;
  data: YamlState | TransitionData;
}

/**
 * Transition data with additional metadata
 */
export interface TransitionData {
  trigger: string;
  from: string;
  to: string;
  instructions?: string;
  additional_instructions?: string;
  transition_reason: string;
}

/**
 * Workflow metadata for the selector
 */
export interface WorkflowMetadata {
  name: string;
  displayName: string;
  description: string;
  source: 'builtin' | 'uploaded';
}

/**
 * Error types for user feedback
 */
export interface AppError {
  type: 'validation' | 'network' | 'parsing' | 'unknown';
  message: string;
  details?: string;
}

/**
 * Loading states
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
