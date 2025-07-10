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
    // Find all group elements with state IDs
    const stateGroups = svgElement.querySelectorAll('g[id]');
    const states = Object.keys(workflow.states);
    
    stateGroups.forEach(group => {
      const groupId = group.getAttribute('id');
      if (groupId && states.includes(groupId)) {
        // This group represents a state
        const stateName = groupId;
        
        // Make the entire group clickable
        group.style.cursor = 'pointer';
        group.style.transition = 'all 0.2s ease';
        
        // Find the rect/shape element for hover effects
        const shape = group.querySelector('rect, ellipse, polygon');
        const originalFill = shape?.getAttribute('fill') || '#ffffff';
        const originalStroke = shape?.getAttribute('stroke') || '#000000';
        
        // Add hover effects
        group.addEventListener('mouseenter', () => {
          if (shape) {
            shape.setAttribute('fill', '#e0f2fe');
            shape.setAttribute('stroke', '#2563eb');
            shape.setAttribute('stroke-width', '2');
          }
        });
        
        group.addEventListener('mouseleave', () => {
          if (shape) {
            shape.setAttribute('fill', originalFill);
            shape.setAttribute('stroke', originalStroke);
            shape.setAttribute('stroke-width', '1');
          }
        });
        
        // Add click handler
        group.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('SVG state clicked:', stateName);
          if (this.onElementClick) {
            this.onElementClick('state', stateName, workflow.states[stateName]);
          }
        });
        
        console.log(`Made state "${stateName}" interactive in SVG using group ID`);
      }
    });
    
    // Also make transition links clickable using link_<source>_<target> pattern
    const linkGroups = svgElement.querySelectorAll('g.link[id^="link_"]');
    linkGroups.forEach(linkGroup => {
      const linkId = linkGroup.getAttribute('id');
      if (linkId && linkId.startsWith('link_')) {
        // Parse link ID to get source and target
        const parts = linkId.replace('link_', '').split('_');
        if (parts.length >= 2) {
          const fromState = parts[0];
          const toState = parts[1];
          
          // Verify these are valid states
          if (states.includes(fromState) && states.includes(toState)) {
            // Make the entire link group clickable
            linkGroup.style.cursor = 'pointer';
            linkGroup.style.transition = 'all 0.2s ease';
            
            // Find path and text elements for hover effects
            const pathEl = linkGroup.querySelector('path');
            const textEl = linkGroup.querySelector('text');
            const originalStroke = pathEl?.getAttribute('stroke') || '#94A3B8';
            const originalTextFill = textEl?.getAttribute('fill') || '#64748B';
            
            // Add hover effects
            linkGroup.addEventListener('mouseenter', () => {
              if (pathEl) {
                pathEl.setAttribute('stroke', '#2563eb');
                pathEl.setAttribute('stroke-width', '3');
              }
              if (textEl) {
                textEl.setAttribute('fill', '#2563eb');
                textEl.style.fontWeight = 'bold';
              }
            });
            
            linkGroup.addEventListener('mouseleave', () => {
              if (pathEl) {
                pathEl.setAttribute('stroke', originalStroke);
                pathEl.setAttribute('stroke-width', '1');
              }
              if (textEl) {
                textEl.setAttribute('fill', originalTextFill);
                textEl.style.fontWeight = 'normal';
              }
            });
            
            // Add click handler
            linkGroup.addEventListener('click', (e) => {
              e.stopPropagation();
              console.log('SVG transition clicked:', `${fromState}->${toState}`);
              
              // Find the transition data
              const sourceState = workflow.states[fromState];
              if (sourceState && sourceState.transitions) {
                const transition = sourceState.transitions.find(t => t.to === toState);
                if (transition && this.onElementClick) {
                  this.onElementClick('transition', `${fromState}->${toState}`, {
                    from: fromState,
                    to: toState,
                    trigger: transition.trigger,
                    instructions: transition.instructions,
                    additional_instructions: transition.additional_instructions,
                    transition_reason: transition.transition_reason
                  });
                }
              }
            });
            
            console.log(`Made transition "${fromState} -> ${toState}" interactive in SVG`);
          }
        }
      }
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
