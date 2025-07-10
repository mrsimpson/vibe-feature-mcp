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
    
    // Add PlantUML diagram with SVG proxy for interactivity
    const diagramWrapper = document.createElement('div');
    diagramWrapper.style.position = 'relative';
    diagramWrapper.style.display = 'inline-block';
    
    // Instead of img, fetch the SVG directly and embed it
    this.loadInteractiveSVG(diagramUrl, diagramWrapper, workflow);
    
    diagramContainer.appendChild(diagramWrapper);
    
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
   * Load SVG directly and make it interactive
   */
  private async loadInteractiveSVG(svgUrl: string, container: HTMLElement, workflow: YamlStateMachine): Promise<void> {
    try {
      console.log('Fetching SVG from:', svgUrl);
      const response = await fetch(svgUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch SVG: ${response.status}`);
      }
      
      const svgText = await response.text();
      console.log('SVG loaded, making interactive...');
      
      // Create a div to hold the SVG
      const svgContainer = document.createElement('div');
      svgContainer.innerHTML = svgText;
      svgContainer.style.border = '1px solid #e2e8f0';
      svgContainer.style.borderRadius = '8px';
      svgContainer.style.backgroundColor = 'white';
      svgContainer.style.overflow = 'hidden';
      
      const svgElement = svgContainer.querySelector('svg');
      if (svgElement) {
        // Make SVG responsive
        svgElement.style.maxWidth = '100%';
        svgElement.style.height = 'auto';
        svgElement.style.display = 'block';
        
        // Add interactivity to SVG elements
        this.makeSVGInteractive(svgElement, workflow);
      }
      
      container.appendChild(svgContainer);
      
      // Add simplified interactive cards (no transitions)
      this.addSimplifiedInteractiveCards(container.parentElement!, workflow);
      
    } catch (error) {
      console.error('Failed to load interactive SVG:', error);
      this.showError('Failed to load interactive diagram. Using fallback.');
      this.renderFallbackDiagram(workflow);
    }
  }

  /**
   * Make SVG elements interactive by adding click handlers
   */
  private makeSVGInteractive(svgElement: SVGSVGElement, workflow: YamlStateMachine): void {
    // Find all text elements that might be state names
    const textElements = svgElement.querySelectorAll('text');
    const states = Object.keys(workflow.states);
    
    textElements.forEach(textEl => {
      const textContent = textEl.textContent?.trim();
      if (textContent && states.includes(textContent)) {
        // This text element represents a state
        const stateName = textContent;
        
        // Find the parent group or rect element
        let clickableElement = textEl.parentElement;
        if (clickableElement?.tagName === 'g') {
          // Look for rect or ellipse in the group
          const shape = clickableElement.querySelector('rect, ellipse, polygon');
          if (shape) {
            clickableElement = shape as SVGElement;
          }
        }
        
        if (clickableElement) {
          // Make it clickable
          clickableElement.style.cursor = 'pointer';
          clickableElement.style.transition = 'all 0.2s ease';
          
          // Add hover effects
          const originalFill = clickableElement.getAttribute('fill') || '#ffffff';
          const originalStroke = clickableElement.getAttribute('stroke') || '#000000';
          
          clickableElement.addEventListener('mouseenter', () => {
            clickableElement.setAttribute('fill', '#e0f2fe');
            clickableElement.setAttribute('stroke', '#2563eb');
            clickableElement.setAttribute('stroke-width', '2');
          });
          
          clickableElement.addEventListener('mouseleave', () => {
            clickableElement.setAttribute('fill', originalFill);
            clickableElement.setAttribute('stroke', originalStroke);
            clickableElement.setAttribute('stroke-width', '1');
          });
          
          // Add click handler
          clickableElement.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('SVG state clicked:', stateName);
            if (this.onElementClick) {
              this.onElementClick('state', stateName, workflow.states[stateName]);
            }
          });
          
          console.log(`Made state "${stateName}" interactive in SVG`);
        }
      }
    });
    
    // Also make transition arrows clickable
    const pathElements = svgElement.querySelectorAll('path[marker-end]');
    pathElements.forEach(pathEl => {
      pathEl.style.cursor = 'pointer';
      pathEl.style.transition = 'all 0.2s ease';
      
      const originalStroke = pathEl.getAttribute('stroke') || '#000000';
      
      pathEl.addEventListener('mouseenter', () => {
        pathEl.setAttribute('stroke', '#2563eb');
        pathEl.setAttribute('stroke-width', '3');
      });
      
      pathEl.addEventListener('mouseleave', () => {
        pathEl.setAttribute('stroke', originalStroke);
        pathEl.setAttribute('stroke-width', '1');
      });
      
      // For now, clicking arrows just shows a message
      // In a full implementation, you'd parse the SVG to determine which transition this represents
      pathEl.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Transition arrow clicked - check side panel for transition details');
      });
    });
  }

  /**
   * Add simplified interactive cards (states only, no transitions)
   */
  private addSimplifiedInteractiveCards(container: HTMLElement, workflow: YamlStateMachine): void {
    const instructionDiv = document.createElement('div');
    instructionDiv.style.marginTop = '15px';
    instructionDiv.style.textAlign = 'center';
    instructionDiv.style.color = '#64748b';
    instructionDiv.style.fontSize = '14px';
    instructionDiv.innerHTML = `
      <div style="padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        💡 <strong>Tip:</strong> Click on states in the diagram above or cards below. Transitions are shown in the right panel.
      </div>
    `;
    
    container.appendChild(instructionDiv);
    
    // Add state cards only (no transitions)
    const clickableDiv = document.createElement('div');
    clickableDiv.style.marginTop = '20px';
    
    const elementsGrid = document.createElement('div');
    elementsGrid.style.display = 'grid';
    elementsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    elementsGrid.style.gap = '10px';
    elementsGrid.style.maxWidth = '800px';
    elementsGrid.style.margin = '0 auto';
    
    // Add clickable state elements (simplified)
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
