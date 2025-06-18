/**
 * Transition Engine
 * 
 * Manages the development state machine and determines appropriate phase transitions.
 * Analyzes conversation context and user input to make intelligent phase decisions.
 */

import { createLogger } from './logger.js';
import { StateMachineLoader } from './state-machine-loader.js';
import { DevelopmentPhase } from './state-machine-types.js';
import path from 'path';

const logger = createLogger('TransitionEngine');

export interface TransitionContext {
  currentPhase: DevelopmentPhase;
  userInput?: string;
  context?: string;
  conversationSummary?: string;
  recentMessages?: Array<{ role: string; content: string }>;
}

export interface TransitionResult {
  newPhase: DevelopmentPhase;
  instructions: string;
  transitionReason: string;
  isModeled: boolean;
}

export class TransitionEngine {
  private stateMachineLoader: StateMachineLoader;
  
  constructor(projectPath: string) {
    this.stateMachineLoader = new StateMachineLoader();
    this.stateMachineLoader.loadStateMachine(projectPath);
    
    logger.info('TransitionEngine initialized', { projectPath });
  }
  
  /**
   * Analyze context and determine appropriate phase transition
   */
  analyzePhaseTransition(context: TransitionContext): TransitionResult {
    const { currentPhase, userInput, context: additionalContext, conversationSummary } = context;
    
    logger.debug('Analyzing phase transition', {
      currentPhase,
      hasUserInput: !!userInput,
      hasContext: !!additionalContext,
      hasSummary: !!conversationSummary
    });

    // Analyze if we should transition to a new phase
    const suggestedPhase = this.determineSuggestedPhase(context);
    
    logger.debug('Phase analysis completed', {
      currentPhase,
      suggestedPhase,
      willTransition: suggestedPhase !== currentPhase
    });
    
    if (suggestedPhase !== currentPhase) {
      // Phase transition detected
      const transitionInfo = this.stateMachineLoader.getTransitionInstructions(
        currentPhase, 
        suggestedPhase
      );
      
      logger.info('Phase transition determined', {
        fromPhase: currentPhase,
        toPhase: suggestedPhase,
        isModeled: transitionInfo.isModeled,
        reason: transitionInfo.transitionReason
      });
      
      return {
        newPhase: suggestedPhase,
        instructions: transitionInfo.instructions,
        transitionReason: transitionInfo.transitionReason,
        isModeled: transitionInfo.isModeled
      };
    } else {
      // Continue in current phase
      const instructions = this.stateMachineLoader.getContinuePhaseInstructions(currentPhase);
      
      logger.debug('Continuing in current phase', { currentPhase });
      
      return {
        newPhase: currentPhase,
        instructions,
        transitionReason: `Continuing work in ${currentPhase} phase`,
        isModeled: true
      };
    }
  }

  /**
   * Handle explicit phase transition request
   */
  handleExplicitTransition(
    currentPhase: DevelopmentPhase,
    targetPhase: DevelopmentPhase, 
    reason?: string
  ): TransitionResult {
    logger.debug('Handling explicit phase transition', {
      currentPhase,
      targetPhase,
      reason 
    });
    
    const transitionInfo = this.stateMachineLoader.getTransitionInstructions(
      currentPhase, 
      targetPhase
    );
    
    logger.info('Explicit phase transition processed', {
      fromPhase: currentPhase,
      toPhase: targetPhase,
      reason: reason || transitionInfo.transitionReason,
      isModeled: transitionInfo.isModeled
    });
    
    return {
      newPhase: targetPhase,
      instructions: transitionInfo.instructions,
      transitionReason: reason || transitionInfo.transitionReason,
      isModeled: transitionInfo.isModeled
    };
  }

  /**
   * Determine suggested phase based on conversation context
   */
  private determineSuggestedPhase(context: TransitionContext): DevelopmentPhase {
    const { currentPhase, userInput, context: additionalContext, conversationSummary } = context;

    // Combine all available context
    const fullContext = [
      userInput || '',
      additionalContext || '',
      conversationSummary || ''
    ].join(' ').toLowerCase();

    // Phase transition logic based on context analysis
    switch (currentPhase) {
      case 'idle':
        return this.analyzeIdlePhase(fullContext);
      
      case 'requirements':
        return this.analyzeRequirementsPhase(fullContext);
      
      case 'design':
        return this.analyzeDesignPhase(fullContext);
      
      case 'implementation':
        return this.analyzeImplementationPhase(fullContext);
      
      case 'qa':
        return this.analyzeQAPhase(fullContext);
      
      case 'testing':
        return this.analyzeTestingPhase(fullContext);
      
      case 'complete':
        return this.analyzeCompletePhase(fullContext);
      
      default:
        return currentPhase;
    }
  }

  private analyzeIdlePhase(context: string): DevelopmentPhase {
    // Look for new feature requests
    const featureKeywords = [
      'implement', 'build', 'create', 'add', 'develop', 'feature', 
      'need', 'want', 'requirement', 'functionality'
    ];
    
    if (featureKeywords.some(keyword => context.includes(keyword))) {
      return 'requirements';
    }
    
    return 'idle';
  }

  private analyzeRequirementsPhase(context: string): DevelopmentPhase {
    // Check for completion indicators
    const completionKeywords = [
      'requirements complete', 'ready to design', 'move to design',
      'start design', 'design phase', 'how to implement'
    ];
    
    if (completionKeywords.some(keyword => context.includes(keyword))) {
      return 'design';
    }

    // Check for abandonment
    if (context.includes('abandon') || context.includes('cancel') || context.includes('stop')) {
      return 'idle';
    }
    
    return 'requirements';
  }

  private analyzeDesignPhase(context: string): DevelopmentPhase {
    // Check for implementation readiness
    const implementationKeywords = [
      'design complete', 'ready to implement', 'start coding', 
      'begin implementation', 'build it', 'code it'
    ];
    
    if (implementationKeywords.some(keyword => context.includes(keyword))) {
      return 'implementation';
    }

    // Check for requirements issues
    const requirementsIssues = [
      'unclear requirements', 'requirements unclear', 'need more requirements',
      'requirements missing', 'what exactly'
    ];
    
    if (requirementsIssues.some(keyword => context.includes(keyword))) {
      return 'requirements';
    }

    // Check for abandonment
    if (context.includes('abandon') || context.includes('cancel') || context.includes('stop')) {
      return 'idle';
    }
    
    return 'design';
  }

  private analyzeImplementationPhase(context: string): DevelopmentPhase {
    // Check for QA readiness
    const qaKeywords = [
      'implementation complete', 'ready for review', 'code review',
      'quality check', 'qa', 'review code', 'check quality'
    ];
    
    if (qaKeywords.some(keyword => context.includes(keyword))) {
      return 'qa';
    }

    // Check for design issues
    const designIssues = [
      'design problem', 'architecture issue', 'design flaw',
      'need to redesign', 'design doesn\'t work'
    ];
    
    if (designIssues.some(keyword => context.includes(keyword))) {
      return 'design';
    }

    // Check for abandonment
    if (context.includes('abandon') || context.includes('cancel') || context.includes('stop')) {
      return 'idle';
    }
    
    return 'implementation';
  }

  private analyzeQAPhase(context: string): DevelopmentPhase {
    // Check for testing readiness
    const testingKeywords = [
      'qa complete', 'ready for testing', 'start testing',
      'test it', 'run tests', 'testing phase'
    ];
    
    if (testingKeywords.some(keyword => context.includes(keyword))) {
      return 'testing';
    }

    // Check for implementation issues
    const implementationIssues = [
      'bugs found', 'implementation issue', 'code problem',
      'need to fix', 'implementation bug'
    ];
    
    if (implementationIssues.some(keyword => context.includes(keyword))) {
      return 'implementation';
    }

    // Check for abandonment
    if (context.includes('abandon') || context.includes('cancel') || context.includes('stop')) {
      return 'idle';
    }
    
    return 'qa';
  }

  private analyzeTestingPhase(context: string): DevelopmentPhase {
    // Check for completion
    const completionKeywords = [
      'testing complete', 'tests pass', 'all tests passing',
      'feature complete', 'ready to deliver', 'done'
    ];
    
    if (completionKeywords.some(keyword => context.includes(keyword))) {
      return 'complete';
    }

    // Check for QA issues
    const qaIssues = [
      'quality issue', 'qa problem', 'documentation missing',
      'quality check needed', 'back to qa'
    ];
    
    if (qaIssues.some(keyword => context.includes(keyword))) {
      return 'qa';
    }

    // Check for abandonment
    if (context.includes('abandon') || context.includes('cancel') || context.includes('stop')) {
      return 'idle';
    }
    
    return 'testing';
  }

  private analyzeCompletePhase(context: string): DevelopmentPhase {
    // Check for new feature requests
    const newFeatureKeywords = [
      'new feature', 'next feature', 'implement', 'build next',
      'another feature', 'add more'
    ];
    
    if (newFeatureKeywords.some(keyword => context.includes(keyword))) {
      return 'requirements';
    }

    // Check for delivery completion
    const deliveryKeywords = [
      'delivered', 'deployment complete', 'feature delivered',
      'done with this', 'finished'
    ];
    
    if (deliveryKeywords.some(keyword => context.includes(keyword))) {
      return 'idle';
    }
    
    return 'complete';
  }
}
