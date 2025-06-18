/**
 * State Machine Loader
 * 
 * Loads and validates YAML-based state machine definitions
 */

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { createLogger } from './logger.js';
import { 
  YamlStateMachine, 
  YamlTransition, 
  DevelopmentPhase 
} from './state-machine-types.js';

const logger = createLogger('StateMachineLoader');

/**
 * Loads and manages YAML-based state machine definitions
 */
export class StateMachineLoader {
  private stateMachine: YamlStateMachine | null = null;
  
  /**
   * Load state machine from YAML file
   * 
   * Checks for custom state machine file in project directory first,
   * then falls back to default state machine file
   */
  public loadStateMachine(projectPath: string): YamlStateMachine {
    // Check for custom state machine file in project directory
    const customFilePaths = [
      path.join(projectPath, '.vibe', 'state-machine.yaml'),
      path.join(projectPath, '.vibe', 'state-machine.yml')
    ];
    
    // Try to load custom state machine file
    for (const filePath of customFilePaths) {
      if (fs.existsSync(filePath)) {
        logger.info('Loading custom state machine file', { filePath });
        return this.loadFromFile(filePath);
      }
    }
    
    // Fall back to default state machine file
    const defaultFilePath = path.join(__dirname, '..', 'resources', 'state-machine.yaml');
    logger.info('Loading default state machine file', { defaultFilePath });
    return this.loadFromFile(defaultFilePath);
  }
  
  /**
   * Load state machine from specific file path
   */
  public loadFromFile(filePath: string): YamlStateMachine {
    try {
      const yamlContent = fs.readFileSync(path.resolve(filePath), 'utf8');
      const stateMachine = yaml.load(yamlContent) as YamlStateMachine;
      
      // Validate the state machine
      this.validateStateMachine(stateMachine);
      
      this.stateMachine = stateMachine;
      logger.info('State machine loaded successfully', {
        name: stateMachine.name,
        stateCount: Object.keys(stateMachine.states).length,
        directTransitionCount: stateMachine.direct_transitions.length
      });
      
      return stateMachine;
    } catch (error) {
      logger.error('Failed to load state machine', { 
        filePath, 
        error: error.message 
      });
      throw new Error(`Failed to load state machine: ${error.message}`);
    }
  }
  
  /**
   * Validate the state machine structure and references
   */
  private validateStateMachine(stateMachine: YamlStateMachine): void {
    // Check required properties
    if (!stateMachine.name || !stateMachine.description || 
        !stateMachine.initial_state || !stateMachine.states) {
      throw new Error('State machine is missing required properties');
    }
    
    // Get all state names
    const stateNames = Object.keys(stateMachine.states);
    
    // Check initial state is valid
    if (!stateNames.includes(stateMachine.initial_state)) {
      throw new Error(`Initial state "${stateMachine.initial_state}" is not defined in states`);
    }
    
    // Validate transition targets
    Object.entries(stateMachine.states).forEach(([stateName, state]) => {
      if (!state.transitions || !Array.isArray(state.transitions)) {
        throw new Error(`State "${stateName}" has invalid transitions property`);
      }
      
      state.transitions.forEach(transition => {
        if (!stateNames.includes(transition.target)) {
          throw new Error(`State "${stateName}" has transition to unknown state "${transition.target}"`);
        }
        
        if (!transition.side_effects || !transition.side_effects.instructions || !transition.side_effects.transition_reason) {
          throw new Error(`Transition from "${stateName}" to "${transition.target}" has invalid side effects`);
        }
      });
    });
    
    // Validate direct transitions
    if (!stateMachine.direct_transitions || !Array.isArray(stateMachine.direct_transitions)) {
      throw new Error('State machine is missing direct_transitions array');
    }
    
    stateMachine.direct_transitions.forEach(directTransition => {
      if (!stateNames.includes(directTransition.state)) {
        throw new Error(`Direct transition references unknown state: ${directTransition.state}`);
      }
      
      if (!directTransition.instructions || !directTransition.transition_reason) {
        throw new Error(`Direct transition for state "${directTransition.state}" has invalid properties`);
      }
    });
    
    logger.debug('State machine validation successful');
  }
  
  /**
   * Get transition instructions for a specific state change
   */
  public getTransitionInstructions(
    fromState: DevelopmentPhase,
    toState: DevelopmentPhase, 
    trigger?: string
  ): { instructions: string; transitionReason: string; isModeled: boolean } {
    if (!this.stateMachine) {
      throw new Error('State machine not loaded');
    }
    
    // Look for a modeled transition first
    const stateDefinition = this.stateMachine.states[fromState];
    if (stateDefinition) {
      const transition = stateDefinition.transitions.find(
        t => t.target === toState && (!trigger || t.trigger === trigger)
      );
      
      if (transition) {
        return {
          instructions: transition.side_effects.instructions,
          transitionReason: transition.side_effects.transition_reason,
          isModeled: transition.is_modeled
        };
      }
    }
    
    // Fall back to direct transition instructions
    const directTransition = this.stateMachine.direct_transitions.find(
      dt => dt.state === toState
    );
    
    if (directTransition) {
      return {
        instructions: directTransition.instructions,
        transitionReason: directTransition.transition_reason,
        isModeled: false
      };
    }
    
    // If no transition found, throw error
    logger.error('No transition found', { fromState, toState, trigger });
    throw new Error(`No transition found from "${fromState}" to "${toState}"`);
  }
  
  /**
   * Get all possible transitions from a given state
   */
  public getPossibleTransitions(fromState: DevelopmentPhase): YamlTransition[] {
    if (!this.stateMachine) {
      throw new Error('State machine not loaded');
    }
    
    const stateDefinition = this.stateMachine.states[fromState];
    return stateDefinition ? stateDefinition.transitions : [];
  }
  
  /**
   * Check if a transition is modeled (shown in state diagram)
   */
  public isModeledTransition(fromState: DevelopmentPhase, toState: DevelopmentPhase): boolean {
    if (!this.stateMachine) {
      throw new Error('State machine not loaded');
    }
    
    const stateDefinition = this.stateMachine.states[fromState];
    if (!stateDefinition) return false;
    
    return stateDefinition.transitions.some(
      t => t.target === toState && t.is_modeled
    );
  }
  
  /**
   * Get phase-specific instructions for continuing work in current phase
   */
  public getContinuePhaseInstructions(phase: DevelopmentPhase): string {
    if (!this.stateMachine) {
      throw new Error('State machine not loaded');
    }
    
    const stateDefinition = this.stateMachine.states[phase];
    if (!stateDefinition) {
      logger.error('Unknown phase', { phase });
      throw new Error(`Unknown phase: ${phase}`);
    }
    
    const continueTransition = stateDefinition.transitions.find(
      t => t.target === phase
    );
    
    if (continueTransition) {
      return continueTransition.side_effects.instructions;
    }
    
    // Fall back to direct transition instructions
    const directTransition = this.stateMachine.direct_transitions.find(
      dt => dt.state === phase
    );
    
    if (directTransition) {
      return directTransition.instructions;
    }
    
    logger.warn('No continue instructions found for phase', { phase });
    return `Continue working in ${phase} phase.`;
  }
}
