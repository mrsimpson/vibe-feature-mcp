import { YamlStateMachine } from '../types/workflow-types';
import * as plantumlEncoder from 'plantuml-encoder';

export class PlantUMLRenderer {
  private container: HTMLElement;
  private onElementClick?: (elementType: 'state' | 'transition', elementId: string, data?: any) => void;
  private currentWorkflow?: YamlStateMachine;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Set click handler for interactive elements
   */
  public setClickHandler(handler: (elementType: 'state' | 'transition', elementId: string, data?: any) => void): void {
    this.onElementClick = handler;
  }

  /**
   * Render workflow using PlantUML with auto-layout
   */
  public async renderWorkflow(workflow: YamlStateMachine): Promise<void> {
    console.log(`Rendering workflow with PlantUML: ${workflow.name}`);
    
    this.currentWorkflow = workflow;
    
    // Clear container and set up scrollable area
    this.container.innerHTML = '';
    this.container.style.overflow = 'auto';
    this.container.style.height = '100%';
    
    // Generate PlantUML code with proper state machine syntax
    const plantUMLCode = this.generatePlantUMLStateMachine(workflow);
    console.log('Generated PlantUML code:', plantUMLCode);
    
    // Create diagram URL using PlantUML web service
    const diagramUrl = this.createPlantUMLUrl(plantUMLCode);
    
    // Create container with diagram and interactive overlay
    const diagramContainer = document.createElement('div');
    diagramContainer.style.position = 'relative';
    diagramContainer.style.padding = '20px';
    diagramContainer.style.textAlign = 'center';
    
    // Add title
    const title = document.createElement('div');
    title.innerHTML = `
      <h2 style="color: #1e293b; margin-bottom: 10px;">${workflow.name} Workflow</h2>
      <p style="color: #64748b; margin-bottom: 20px;">${workflow.description || ''}</p>
    `;
    diagramContainer.appendChild(title);
    
    // Add PlantUML diagram
    const img = document.createElement('img');
    img.src = diagramUrl;
    img.alt = `${workflow.name} workflow diagram`;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.border = '1px solid #e2e8f0';
    img.style.borderRadius = '8px';
    img.style.backgroundColor = 'white';
    
    // Add loading and error handling
    img.onload = () => {
      console.log('PlantUML diagram loaded successfully');
      this.addInteractiveOverlay(diagramContainer, workflow);
    };
    
    img.onerror = () => {
      console.error('Failed to load PlantUML diagram');
      this.showError('Failed to load diagram. Using fallback layout.');
      this.renderFallbackDiagram(workflow);
    };
    
    diagramContainer.appendChild(img);
    
    // Add legend
    const legend = document.createElement('div');
    legend.innerHTML = `
      <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; font-size: 14px; color: #64748b; text-align: left; max-width: 400px; margin-left: auto; margin-right: auto;">
        <strong>How to interact:</strong>
        <div style="margin-top: 8px;">• Click on states to see details</div>
        <div>• Click on transitions to see transition info</div>
        <div>• Diagram uses PlantUML auto-layout for optimal positioning</div>
      </div>
    `;
    diagramContainer.appendChild(legend);
    
    this.container.appendChild(diagramContainer);
  }

  /**
   * Generate PlantUML state machine code with proper syntax and auto-layout
   */
  private generatePlantUMLStateMachine(workflow: YamlStateMachine): string {
    const lines: string[] = [];
    
    lines.push('@startuml');
    lines.push('!theme plain');
    lines.push('skinparam backgroundColor white');
    lines.push('skinparam state {');
    lines.push('  BackgroundColor white');
    lines.push('  BorderColor #2563eb');
    lines.push('  FontColor #1e293b');
    lines.push('  FontSize 12');
    lines.push('}');
    lines.push('skinparam arrow {');
    lines.push('  Color #94a3b8');
    lines.push('  FontColor #64748b');
    lines.push('  FontSize 10');
    lines.push('}');
    lines.push('');
    
    // Add title
    lines.push(`title ${workflow.name} State Machine`);
    lines.push('');
    
    // Add initial state
    lines.push(`[*] --> ${workflow.initial_state}`);
    lines.push('');
    
    // Add states with descriptions
    Object.entries(workflow.states).forEach(([stateName, stateConfig]) => {
      if (stateConfig.description) {
        lines.push(`${stateName} : ${stateConfig.description}`);
      }
    });
    lines.push('');
    
    // Add transitions
    Object.entries(workflow.states).forEach(([stateName, stateConfig]) => {
      if (stateConfig.transitions) {
        stateConfig.transitions.forEach(transition => {
          const label = transition.trigger.replace(/_/g, ' ');
          lines.push(`${stateName} --> ${transition.to} : ${label}`);
        });
      }
    });
    
    // Add final states if any
    const finalStates = Object.keys(workflow.states).filter(state => 
      !workflow.states[state].transitions || workflow.states[state].transitions.length === 0
    );
    if (finalStates.length > 0) {
      lines.push('');
      finalStates.forEach(state => {
        lines.push(`${state} --> [*]`);
      });
    }
    
    lines.push('');
    lines.push('@enduml');
    
    return lines.join('\n');
  }

  /**
   * Create PlantUML web service URL with proper encoding
   */
  private createPlantUMLUrl(plantUMLCode: string): string {
    try {
      const encoded = plantumlEncoder.encode(plantUMLCode);
      return `https://www.plantuml.com/plantuml/svg/${encoded}`;
    } catch (error) {
      console.error('Failed to encode PlantUML:', error);
      // Fallback to simple encoding
      const encoded = encodeURIComponent(plantUMLCode);
      return `https://www.plantuml.com/plantuml/svg/~1${encoded}`;
    }
  }

  /**
   * Add interactive overlay for click handling
   */
  private addInteractiveOverlay(container: HTMLElement, workflow: YamlStateMachine): void {
    // Create clickable areas for states and transitions
    const interactiveDiv = document.createElement('div');
    interactiveDiv.style.marginTop = '10px';
    interactiveDiv.style.display = 'flex';
    interactiveDiv.style.flexWrap = 'wrap';
    interactiveDiv.style.gap = '10px';
    interactiveDiv.style.justifyContent = 'center';
    
    // Add clickable state buttons
    Object.entries(workflow.states).forEach(([stateName, stateConfig]) => {
      const stateButton = document.createElement('button');
      stateButton.textContent = stateName;
      stateButton.style.cssText = `
        padding: 8px 16px;
        border: 2px solid ${stateName === workflow.initial_state ? '#059669' : '#2563eb'};
        border-radius: 20px;
        background: ${stateName === workflow.initial_state ? '#059669' : '#ffffff'};
        color: ${stateName === workflow.initial_state ? '#ffffff' : '#2563eb'};
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s ease;
      `;
      
      stateButton.addEventListener('click', () => {
        if (this.onElementClick) {
          this.onElementClick('state', stateName, stateConfig);
        }
      });
      
      stateButton.addEventListener('mouseenter', () => {
        stateButton.style.transform = 'scale(1.05)';
      });
      
      stateButton.addEventListener('mouseleave', () => {
        stateButton.style.transform = 'scale(1)';
      });
      
      interactiveDiv.appendChild(stateButton);
    });
    
    container.appendChild(interactiveDiv);
    
    // Add transition buttons
    const transitionsDiv = document.createElement('div');
    transitionsDiv.style.marginTop = '15px';
    transitionsDiv.innerHTML = '<div style="font-size: 14px; color: #64748b; margin-bottom: 10px;"><strong>Transitions:</strong></div>';
    
    const transitionsList = document.createElement('div');
    transitionsList.style.display = 'flex';
    transitionsList.style.flexWrap = 'wrap';
    transitionsList.style.gap = '8px';
    transitionsList.style.justifyContent = 'center';
    
    Object.entries(workflow.states).forEach(([fromState, stateConfig]) => {
      if (stateConfig.transitions) {
        stateConfig.transitions.forEach(transition => {
          const transitionButton = document.createElement('button');
          transitionButton.textContent = `${fromState} → ${transition.to}`;
          transitionButton.style.cssText = `
            padding: 6px 12px;
            border: 1px solid #94a3b8;
            border-radius: 15px;
            background: #f1f5f9;
            color: #475569;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s ease;
          `;
          
          transitionButton.addEventListener('click', () => {
            if (this.onElementClick) {
              this.onElementClick('transition', `${fromState}->${transition.to}`, {
                from: fromState,
                to: transition.to,
                trigger: transition.trigger
              });
            }
          });
          
          transitionButton.addEventListener('mouseenter', () => {
            transitionButton.style.backgroundColor = '#e2e8f0';
            transitionButton.style.borderColor = '#2563eb';
          });
          
          transitionButton.addEventListener('mouseleave', () => {
            transitionButton.style.backgroundColor = '#f1f5f9';
            transitionButton.style.borderColor = '#94a3b8';
          });
          
          transitionsList.appendChild(transitionButton);
        });
      }
    });
    
    transitionsDiv.appendChild(transitionsList);
    container.appendChild(transitionsDiv);
  }

  /**
   * Render fallback diagram if PlantUML fails
   */
  private renderFallbackDiagram(workflow: YamlStateMachine): void {
    const fallbackDiv = document.createElement('div');
    fallbackDiv.style.padding = '20px';
    fallbackDiv.style.border = '2px dashed #94a3b8';
    fallbackDiv.style.borderRadius = '8px';
    fallbackDiv.style.backgroundColor = '#f8fafc';
    fallbackDiv.style.textAlign = 'center';
    
    fallbackDiv.innerHTML = `
      <div style="color: #64748b; margin-bottom: 20px;">
        <strong>Fallback View - PlantUML diagram failed to load</strong>
      </div>
    `;
    
    this.container.appendChild(fallbackDiv);
    this.addInteractiveOverlay(fallbackDiv, workflow);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    console.error(message);
  }

  /**
   * Clear the container
   */
  public clear(): void {
    this.container.innerHTML = '';
  }
}
