/**
 * Main diagram renderer using D3.js
 * Orchestrates the visualization of workflow state machines
 */

import * as d3 from 'd3';
import { YamlStateMachine } from '../types/ui-types';
import {
  DiagramNode,
  DiagramLink,
  DiagramConfig,
  DiagramStyle,
  InteractionEvent,
} from '../types/visualization-types';
import { LayoutEngine } from './LayoutEngine';
import { StateRenderer } from './StateRenderer';
import { TransitionRenderer } from './TransitionRenderer';

export class DiagramRenderer {
  private readonly container: HTMLElement;
  private readonly layoutEngine: LayoutEngine;
  private readonly stateRenderer: StateRenderer;
  private readonly transitionRenderer: TransitionRenderer;

  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null =
    null;
  private g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

  private currentWorkflow: YamlStateMachine | null = null;
  private nodes: DiagramNode[] = [];
  private links: DiagramLink[] = [];

  private config: DiagramConfig;
  private style: DiagramStyle;

  // Event handlers
  public onElementClick: (event: InteractionEvent) => void = () => {};
  public onElementHover: (event: InteractionEvent) => void = () => {};

  constructor(container: HTMLElement) {
    this.container = container;

    // Initialize configuration
    this.config = this.createDefaultConfig();
    this.style = this.createDefaultStyle();

    // Initialize sub-renderers
    this.layoutEngine = new LayoutEngine(this.config);
    this.stateRenderer = new StateRenderer(this.style);
    this.transitionRenderer = new TransitionRenderer(this.style);

    this.initialize();
  }

  /**
   * Initialize the SVG canvas and zoom behavior
   */
  private initialize(): void {
    // Clear existing content
    d3.select(this.container).selectAll('*').remove();

    // Get container dimensions
    const containerRect = this.container.getBoundingClientRect();
    const width = containerRect.width || 800;
    const height = containerRect.height || 600;

    // Create SVG element with explicit dimensions
    this.svg = d3
      .select(this.container)
      .append('svg')
      .attr('class', 'diagram-svg')
      .attr('width', width)
      .attr('height', height)
      .style('width', '100%')
      .style('height', '100%');

    // Create main group for zoom/pan
    this.g = this.svg.append('g').attr('class', 'diagram-group');

    // Set up zoom behavior
    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', this.handleZoom.bind(this));

    this.svg.call(this.zoom);

    // Add arrow markers for transitions
    this.createArrowMarkers();

    // Set up resize observer
    this.setupResizeObserver();

    console.log('DiagramRenderer initialized');
  }

  /**
   * Render a workflow state machine
   */
  public renderWorkflow(workflow: YamlStateMachine): void {
    console.log(`Rendering workflow: ${workflow.name}`);

    // Clear any existing loading messages or content
    const loadingMessages = this.container.querySelectorAll('.loading-message');
    for (const msg of loadingMessages) {
      msg.remove();
    }

    this.currentWorkflow = workflow;

    // Convert workflow to diagram data
    this.nodes = this.createNodes(workflow);
    this.links = this.createLinks(workflow, this.nodes);

    // Calculate layout
    this.layoutEngine.calculateLayout(this.nodes, this.links);

    // Render the diagram
    this.renderDiagram();

    // Fit to view
    this.fitToView();
  }

  /**
   * Create nodes from workflow states
   */
  private createNodes(workflow: YamlStateMachine): DiagramNode[] {
    const nodes: DiagramNode[] = [];

    for (const [stateName, state] of Object.entries(workflow.states)) {
      nodes.push({
        id: stateName,
        label: stateName,
        state: state,
        isInitial: stateName === workflow.initial_state,
        x: 0,
        y: 0,
      });
    }

    return nodes;
  }

  /**
   * Create links from workflow transitions
   */
  private createLinks(
    workflow: YamlStateMachine,
    _nodes: DiagramNode[]
  ): DiagramLink[] {
    const links: DiagramLink[] = [];

    for (const [stateName, state] of Object.entries(workflow.states)) {
      for (const transition of state.transitions) {
        const linkId = `${stateName}-${transition.trigger}-${transition.to}`;

        links.push({
          id: linkId,
          source: stateName,
          target: transition.to,
          transition: transition,
          label: transition.trigger,
          isSelfLoop: stateName === transition.to,
        });
      }
    }

    return links;
  }

  /**
   * Render the complete diagram
   */
  private renderDiagram(): void {
    if (!this.g) return;

    // Clear existing elements
    this.g.selectAll('.transition-link').remove();
    this.g.selectAll('.state-node').remove();

    // Render transitions first (so they appear behind nodes)
    this.transitionRenderer.render(
      this.g,
      this.links,
      this.handleElementInteraction.bind(this)
    );

    // Render states
    this.stateRenderer.render(
      this.g,
      this.nodes,
      this.handleElementInteraction.bind(this)
    );
  }

  /**
   * Handle element interactions (click, hover)
   */
  private handleElementInteraction(event: InteractionEvent): void {
    if (event.type === 'click') {
      this.onElementClick(event);
    } else if (event.type === 'hover') {
      this.onElementHover(event);
    }
  }

  /**
   * Handle zoom events
   */
  private handleZoom(event: d3.D3ZoomEvent<SVGSVGElement, unknown>): void {
    if (!this.g) return;

    this.g.attr('transform', event.transform.toString());
  }

  /**
   * Fit diagram to view
   */
  public fitToView(): void {
    if (!this.svg || !this.g || this.nodes.length === 0) return;

    const bounds = this.g.node()?.getBBox();
    if (!bounds) return;

    const containerRect = this.container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    const scale =
      Math.min(
        width /
          (bounds.width + this.config.padding.left + this.config.padding.right),
        height /
          (bounds.height + this.config.padding.top + this.config.padding.bottom)
      ) * 0.9; // Add some margin

    const centerX = width / 2;
    const centerY = height / 2;
    const boundsX = bounds.x + bounds.width / 2;
    const boundsY = bounds.y + bounds.height / 2;

    const transform = d3.zoomIdentity
      .translate(centerX, centerY)
      .scale(scale)
      .translate(-boundsX, -boundsY);

    if (this.zoom) {
      this.svg.transition().duration(750).call(this.zoom.transform, transform);
    }
  }

  /**
   * Highlight specific elements
   */
  public highlightPath(elementIds: string[]): void {
    if (!this.g) return;

    // Remove existing highlights
    this.g.selectAll('.highlighted').classed('highlighted', false);

    // Add highlights to specified elements
    for (const id of elementIds) {
      if (this.g) {
        this.g.selectAll(`[data-id="${id}"]`).classed('highlighted', true);
      }
    }
  }

  /**
   * Clear all highlights
   */
  public clearHighlights(): void {
    if (!this.g) return;

    this.g.selectAll('.highlighted').classed('highlighted', false);
  }

  /**
   * Create arrow markers for transitions
   */
  private createArrowMarkers(): void {
    if (!this.svg) return;

    const defs = this.svg.append('defs');

    // Standard arrow marker
    defs
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('class', 'arrow-marker');

    // Highlighted arrow marker
    defs
      .append('marker')
      .attr('id', 'arrow-highlighted')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', this.style.link.selectedStroke);
  }

  /**
   * Set up resize observer to handle container size changes
   */
  private setupResizeObserver(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.updateSize();
    });

    resizeObserver.observe(this.container);
  }

  /**
   * Update diagram size when container resizes
   */
  private updateSize(): void {
    if (!this.svg) return;

    const rect = this.container.getBoundingClientRect();
    this.config.width = rect.width;
    this.config.height = rect.height;

    // Update layout engine configuration
    this.layoutEngine.updateConfig(this.config);
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): DiagramConfig {
    const rect = this.container.getBoundingClientRect();

    return {
      width: rect.width || 800,
      height: rect.height || 600,
      nodeRadius: 40,
      linkDistance: 150,
      chargeStrength: -300,
      padding: {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      },
    };
  }

  /**
   * Create default styling
   */
  private createDefaultStyle(): DiagramStyle {
    return {
      node: {
        fill: '#ffffff',
        stroke: '#2563eb',
        strokeWidth: 2,
        selectedFill: '#2563eb',
        selectedStroke: '#1d4ed8',
        initialFill: '#059669',
      },
      link: {
        stroke: '#94a3b8',
        strokeWidth: 2,
        selectedStroke: '#2563eb',
        selectedStrokeWidth: 3,
        arrowSize: 6,
      },
      text: {
        fontSize: '14px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fill: '#1e293b',
      },
    };
  }

  /**
   * Get current workflow
   */
  public getCurrentWorkflow(): YamlStateMachine | null {
    return this.currentWorkflow;
  }

  /**
   * Get current nodes
   */
  public getNodes(): DiagramNode[] {
    return [...this.nodes];
  }

  /**
   * Get current links
   */
  public getLinks(): DiagramLink[] {
    return [...this.links];
  }

  /**
   * Destroy the renderer and clean up resources
   */
  public destroy(): void {
    if (this.svg) {
      this.svg.remove();
      this.svg = null;
    }

    this.g = null;
    this.zoom = null;
    this.currentWorkflow = null;
    this.nodes = [];
    this.links = [];

    console.log('DiagramRenderer destroyed');
  }
}
