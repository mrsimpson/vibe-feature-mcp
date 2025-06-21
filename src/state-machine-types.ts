/**
 * State Machine Types
 * 
 * Type definitions for YAML-based state machine
 */

/**
 * Transition between states
 */
export interface YamlTransition {
  /** Event that triggers this transition */
  trigger: string;
  
  /** Target state after transition */
  to: string;
  
  /** Instructions to provide when this transition occurs */
  instructions: string;
  
  /** Reason for this transition */
  transition_reason: string;
}

/**
 * State definition
 */
export interface YamlState {
  /** Description of this state */
  description: string;
  
  /** Transitions from this state */
  transitions: YamlTransition[];
}

/**
 * Direct transition definition for non-modeled transitions
 */
export interface YamlDirectTransition {
  /** State name for this direct transition */
  state: string;
  
  /** Instructions to provide when directly transitioning to this state */
  instructions: string;
  
  /** Reason for the direct transition */
  transition_reason: string;
}

/**
 * Complete state machine definition
 */
export interface YamlStateMachine {
  /** Name of the state machine */
  name: string;
  
  /** Description of the state machine's purpose */
  description: string;
  
  /** The starting state of the machine */
  initial_state: string;
  
  /** Map of states in the state machine */
  states: Record<string, YamlState>;
  
  /** Direct transition instructions for non-modeled transitions */
  direct_transitions: YamlDirectTransition[];
}
