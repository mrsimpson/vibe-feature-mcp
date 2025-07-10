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
   * Add interactive overlay for click handling (simplified - no button lists)
   */
  private addInteractiveOverlay(container: HTMLElement, workflow: YamlStateMachine): void {
    // Add a simple instruction for users
    const instructionDiv = document.createElement('div');
    instructionDiv.style.marginTop = '15px';
    instructionDiv.style.textAlign = 'center';
    instructionDiv.style.color = '#64748b';
    instructionDiv.style.fontSize = '14px';
    instructionDiv.innerHTML = `
      <div style="padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        💡 <strong>Tip:</strong> Click on states in the diagram above to see details in the right panel
      </div>
    `;
    
    container.appendChild(instructionDiv);
    
    // Create invisible clickable areas that map to the PlantUML diagram
    // This is a workaround since we can't directly click on the PlantUML SVG
    const clickableDiv = document.createElement('div');
    clickableDiv.style.marginTop = '20px';
    clickableDiv.innerHTML = '<div style="font-size: 14px; color: #64748b; margin-bottom: 15px; text-align: center;"><strong>Interactive Elements:</strong></div>';
    
    const elementsGrid = document.createElement('div');
    elementsGrid.style.display = 'grid';
    elementsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    elementsGrid.style.gap = '10px';
    elementsGrid.style.maxWidth = '800px';
    elementsGrid.style.margin = '0 auto';
    
    // Add clickable state elements
    Object.entries(workflow.states).forEach(([stateName, stateConfig]) => {
      const stateCard = document.createElement('div');
      stateCard.style.cssText = `
        padding: 12px;
        border: 2px solid ${stateName === workflow.initial_state ? '#059669' : '#2563eb'};
        border-radius: 8px;
        background: ${stateName === workflow.initial_state ? '#f0fdf4' : '#ffffff'};
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
      `;
      
      stateCard.innerHTML = `
        <div style="font-weight: 600; color: ${stateName === workflow.initial_state ? '#059669' : '#2563eb'}; margin-bottom: 4px;">
          ${stateName} ${stateName === workflow.initial_state ? '(Initial)' : ''}
        </div>
        <div style="font-size: 12px; color: #64748b; line-height: 1.3;">
          ${stateConfig.description || 'No description'}
        </div>
        ${stateConfig.transitions ? `
          <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
            ${stateConfig.transitions.length} transition${stateConfig.transitions.length !== 1 ? 's' : ''}
          </div>
        ` : ''}
      `;
      
      stateCard.addEventListener('click', () => {
        console.log('State card clicked:', stateName);
        if (this.onElementClick) {
          this.onElementClick('state', stateName, stateConfig);
        }
      });
      
      stateCard.addEventListener('mouseenter', () => {
        stateCard.style.transform = 'translateY(-2px)';
        stateCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      });
      
      stateCard.addEventListener('mouseleave', () => {
        stateCard.style.transform = 'translateY(0)';
        stateCard.style.boxShadow = 'none';
      });
      
      elementsGrid.appendChild(stateCard);
    });
    
    clickableDiv.appendChild(elementsGrid);
    container.appendChild(clickableDiv);
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
        <strong>⚠️ PlantUML diagram failed to load</strong><br>
        <span style="font-size: 14px;">Using fallback interactive view</span>
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
