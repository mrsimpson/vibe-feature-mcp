import { YamlStateMachine, YamlState } from '../types/ui-types';
import {
  encodePlantUML,
  encodePlantUMLFallback,
} from '../utils/PlantUMLEncoder';

export class PlantUMLRenderer {
  private container: HTMLElement;
  private onElementClick?: (
    elementType: 'state' | 'transition' | 'clear-selection',
    elementId: string,
    data?: unknown
  ) => void;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Set click handler for interactive elements
   */
  public setClickHandler(
    handler: (
      elementType: 'state' | 'transition' | 'clear-selection',
      elementId: string,
      data?: unknown
    ) => void
  ): void {
    this.onElementClick = handler;
  }

  /**
  /**
   * Render workflow using PlantUML with auto-layout
   */
  public async renderWorkflow(workflow: YamlStateMachine): Promise<void> {
    this.container.innerHTML = '';
    this.container.style.overflow = 'auto';
    this.container.style.height = '100%';

    const plantUMLCode = this.generatePlantUMLStateMachine(workflow);
    const diagramUrl = this.createPlantUMLUrl(plantUMLCode);

    // Create container with diagram and interactive overlay
    const diagramContainer = document.createElement('div');
    diagramContainer.style.position = 'relative';
    diagramContainer.style.padding = '20px';
    diagramContainer.style.textAlign = 'center';

    // Add title
    const title = document.createElement('div');
    title.innerHTML = `
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        gap: 12px; 
        margin-bottom: 10px;
        flex-wrap: wrap;
      ">
        <h2 style="
          color: #1e293b; 
          margin: 0; 
          font-size: 1.5rem;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 6px;
          transition: background-color 0.2s ease;
        " 
        class="workflow-title-clickable"
        title="Click to show workflow information"
        >${workflow.name} Workflow</h2>
      </div>
      <p style="color: #64748b; margin-bottom: 20px; text-align: center;">${workflow.description || ''}</p>
    `;

    // Add click handler for workflow title
    const titleElement = title.querySelector(
      '.workflow-title-clickable'
    ) as HTMLElement;
    if (titleElement) {
      titleElement.addEventListener('click', () => {
        if (this.onElementClick) {
          this.onElementClick('clear-selection', '', null);
        }
      });

      // Add hover effects
      titleElement.addEventListener('mouseenter', () => {
        titleElement.style.backgroundColor = '#f8fafc';
      });

      titleElement.addEventListener('mouseleave', () => {
        titleElement.style.backgroundColor = 'transparent';
      });
    }

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
    for (const [stateName, stateConfig] of Object.entries(workflow.states) as [
      string,
      YamlState,
    ][]) {
      if (stateConfig.description) {
        lines.push(`${stateName} : ${stateConfig.description}`);
      }
    }
    lines.push('');

    // Add transitions
    for (const [stateName, stateConfig] of Object.entries(workflow.states) as [
      string,
      YamlState,
    ][]) {
      if (stateConfig.transitions) {
        for (const transition of stateConfig.transitions) {
          const label = transition.trigger.replace(/_/g, ' ');

          // Check for review perspectives and add review icon
          const hasReviews =
            transition.review_perspectives &&
            transition.review_perspectives.length > 0;
          // Add review indicator
          let reviewIcon = '';
          if (hasReviews) {
            reviewIcon = ' 🛡️';
          }

          const finalLabel = `${label}${reviewIcon}`;
          lines.push(`${stateName} --> ${transition.to} : ${finalLabel}`);
        }
      }
    }

    // Add final states if any
    const finalStates = Object.keys(workflow.states).filter(
      state =>
        !workflow.states[state].transitions ||
        workflow.states[state].transitions.length === 0
    );
    if (finalStates.length > 0) {
      lines.push('');
      for (const state of finalStates) {
        lines.push(`${state} --> [*]`);
      }
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
      // Try DEFLATE encoding first (proper PlantUML format)
      const encoded = encodePlantUML(plantUMLCode);
      return `https://www.plantuml.com/plantuml/svg/${encoded}`;
    } catch (error) {
      console.warn('DEFLATE encoding failed, trying fallback:', error);
      try {
        // Fallback to base64 with ~1 header
        const encoded = encodePlantUMLFallback(plantUMLCode);
        return `https://www.plantuml.com/plantuml/svg/${encoded}`;
      } catch (fallbackError) {
        console.error('All PlantUML encoding methods failed:', fallbackError);
        // Final fallback to simple URL encoding
        const encoded = encodeURIComponent(plantUMLCode);
        return `https://www.plantuml.com/plantuml/svg/~1${encoded}`;
      }
    }
  }

  /**
   * Load SVG directly and make it interactive
   */
  private async loadInteractiveSVG(
    svgUrl: string,
    container: HTMLElement,
    workflow: YamlStateMachine
  ): Promise<void> {
    try {
      const response = await fetch(svgUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch SVG: ${response.status}`);
      }

      const svgText = await response.text();

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
    } catch (error) {
      console.error('Failed to load interactive SVG:', error);
      this.showError('Failed to load interactive diagram. Using fallback.');
      this.renderFallbackDiagram();
    }
  }

  /**
   * Make SVG elements interactive by adding click handlers
   */
  private makeSVGInteractive(
    svgElement: SVGSVGElement,
    workflow: YamlStateMachine
  ): void {
    // Find all group elements with state IDs
    const stateGroups = svgElement.querySelectorAll('g[id]');
    const states = Object.keys(workflow.states);

    for (const group of stateGroups) {
      const groupId = group.getAttribute('id');
      if (groupId && states.includes(groupId)) {
        // This group represents a state
        const stateName = groupId;

        // Make the entire group clickable
        (group as HTMLElement).style.cursor = 'pointer';
        (group as HTMLElement).style.transition = 'all 0.2s ease';

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
        group.addEventListener('click', e => {
          e.stopPropagation();
          if (this.onElementClick) {
            this.onElementClick('state', stateName, workflow.states[stateName]);
          }
        });
      }
    }

    // Also make transition links clickable using link_<source>_<target> pattern
    const linkGroups = svgElement.querySelectorAll('g.link[id^="link_"]');
    for (const linkGroup of linkGroups) {
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
            (linkGroup as HTMLElement).style.cursor = 'pointer';
            (linkGroup as HTMLElement).style.transition = 'all 0.2s ease';

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
            linkGroup.addEventListener('click', e => {
              e.stopPropagation();

              // Find the transition data
              const sourceState = workflow.states[fromState];
              if (sourceState && sourceState.transitions) {
                const transition = sourceState.transitions.find(
                  t => t.to === toState
                );
                if (transition && this.onElementClick) {
                  this.onElementClick(
                    'transition',
                    `${fromState}->${toState}`,
                    {
                      from: fromState,
                      to: toState,
                      trigger: transition.trigger,
                      instructions: transition.instructions,
                      additional_instructions:
                        transition.additional_instructions,
                      transition_reason: transition.transition_reason,
                      review_perspectives: transition.review_perspectives || [],
                    }
                  );
                }
              }
            });
          }
        }
      }
    }
  }

  /**
   * Render fallback diagram if PlantUML fails
   */
  private renderFallbackDiagram(): void {
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
