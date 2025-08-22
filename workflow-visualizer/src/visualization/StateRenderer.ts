/**
 * State node renderer
 * Handles rendering of individual state nodes in the diagram
 */

import * as d3 from 'd3';
import {
  DiagramNode,
  DiagramStyle,
  InteractionEvent,
} from '../types/visualization-types';

export class StateRenderer {
  private style: DiagramStyle;

  constructor(style: DiagramStyle) {
    this.style = style;
  }

  /**
   * Render state nodes in the diagram
   */
  public render(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    nodes: DiagramNode[],
    onInteraction: (event: InteractionEvent) => void
  ): void {
    console.log(`Rendering ${nodes.length} state nodes`);

    // Bind data to state node groups
    const nodeGroups = container
      .selectAll<SVGGElement, DiagramNode>('.state-node')
      .data(nodes, d => d.id);

    // Remove old nodes
    nodeGroups.exit().remove();

    // Create new node groups
    const nodeEnter = nodeGroups
      .enter()
      .append('g')
      .attr('class', 'state-node')
      .attr('data-id', d => d.id);

    // Add circles for states
    nodeEnter
      .append('circle')
      .attr('cx', d => d.x || 0)
      .attr('cy', d => d.y || 0)
      .attr('r', d => this.getNodeRadius(d))
      .style('fill', d => this.getNodeFill(d))
      .style('stroke', d => this.getNodeStroke(d))
      .style('stroke-width', this.style.node.strokeWidth);

    // Add labels for states
    nodeEnter
      .append('text')
      .attr('class', 'state-label')
      .attr('x', d => d.x || 0)
      .attr('y', d => d.y || 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('font-size', this.style.text.fontSize)
      .style('font-family', this.style.text.fontFamily)
      .style('fill', d => this.getLabelFill(d))
      .style('font-weight', d => this.getLabelWeight(d))
      .text(d => this.formatLabel(d.label));

    // Merge enter and update selections
    const nodeUpdate = nodeEnter.merge(nodeGroups);

    // Update positions
    nodeUpdate.attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);

    // Update circle styles
    nodeUpdate
      .select('circle')
      .style('fill', d => this.getNodeFill(d))
      .style('stroke', d => this.getNodeStroke(d));

    // Update label styles
    nodeUpdate
      .select('.state-label')
      .style('fill', d => this.getLabelFill(d))
      .style('font-weight', d => this.getLabelWeight(d));

    // Add event listeners
    this.addEventListeners(nodeUpdate, onInteraction);
  }

  /**
   * Add event listeners to node groups
   */
  private addEventListeners(
    nodeGroups: d3.Selection<SVGGElement, DiagramNode, SVGGElement, unknown>,
    onInteraction: (event: InteractionEvent) => void
  ): void {
    nodeGroups
      .style('cursor', 'pointer')
      .on('click', (event: MouseEvent, d: DiagramNode) => {
        event.stopPropagation();
        onInteraction({
          type: 'click',
          elementType: 'node',
          elementId: d.id,
          data: d,
          originalEvent: event,
        });
      })
      .on('mouseenter', (event: MouseEvent, d: DiagramNode) => {
        onInteraction({
          type: 'hover',
          elementType: 'node',
          elementId: d.id,
          data: d,
          originalEvent: event,
        });
      })
      .on('mouseleave', (event: MouseEvent, d: DiagramNode) => {
        onInteraction({
          type: 'unhover',
          elementType: 'node',
          elementId: d.id,
          data: d,
          originalEvent: event,
        });
      });
  }

  /**
   * Get node radius based on node type
   */
  private getNodeRadius(node: DiagramNode): number {
    return node.isInitial ? 45 : 40;
  }

  /**
   * Get node fill color based on state
   */
  private getNodeFill(node: DiagramNode): string {
    const element = d3.select(`[data-id="${node.id}"]`);

    // Check if element exists and has classList
    if (element.empty() || !element.node()) {
      if (node.isInitial) {
        return this.style.node.initialFill;
      }
      return this.style.node.fill;
    }

    if (element.classed('highlighted')) {
      return '#d97706'; // warning color
    }

    if (element.classed('selected')) {
      return this.style.node.selectedFill;
    }

    if (node.isInitial) {
      return this.style.node.initialFill;
    }

    return this.style.node.fill;
  }

  /**
   * Get node stroke color based on state
   */
  private getNodeStroke(node: DiagramNode): string {
    const element = d3.select(`[data-id="${node.id}"]`);

    // Check if element exists and has classList
    if (element.empty() || !element.node()) {
      if (node.isInitial) {
        return this.style.node.initialFill;
      }
      return this.style.node.stroke;
    }

    if (element.classed('highlighted')) {
      return '#d97706'; // warning color
    }

    if (element.classed('selected')) {
      return this.style.node.selectedStroke;
    }

    if (node.isInitial) {
      return this.style.node.initialFill;
    }

    return this.style.node.stroke;
  }

  /**
   * Get label fill color based on node state
   */
  private getLabelFill(node: DiagramNode): string {
    const element = d3.select(`[data-id="${node.id}"]`);

    // Check if element exists and has classList
    if (element.empty() || !element.node()) {
      if (node.isInitial) {
        return '#ffffff';
      }
      return this.style.text.fill;
    }

    if (
      element.classed('highlighted') ||
      element.classed('selected') ||
      node.isInitial
    ) {
      return '#ffffff';
    }

    return this.style.text.fill;
  }

  /**
   * Get label font weight based on node state
   */
  private getLabelWeight(node: DiagramNode): string {
    const element = d3.select(`[data-id="${node.id}"]`);

    // Check if element exists and has classList
    if (element.empty() || !element.node()) {
      if (node.isInitial) {
        return '600';
      }
      return '500';
    }

    if (
      element.classed('highlighted') ||
      element.classed('selected') ||
      node.isInitial
    ) {
      return '600';
    }

    return '500';
  }

  /**
   * Format label text to fit within the node
   */
  private formatLabel(label: string): string {
    // Truncate long labels
    if (label.length > 12) {
      return label.substring(0, 10) + '...';
    }

    return label;
  }

  /**
   * Update node selection state
   */
  public updateSelection(selectedNodeId: string | null): void {
    // Clear all selections
    d3.selectAll('.state-node').classed('selected', false);

    // Set new selection
    if (selectedNodeId) {
      d3.select(`[data-id="${selectedNodeId}"]`).classed('selected', true);
    }
  }

  /**
   * Update node highlight state
   */
  public updateHighlights(highlightedNodeIds: string[]): void {
    // Clear all highlights
    d3.selectAll('.state-node').classed('highlighted', false);

    // Set new highlights
    for (const nodeId of highlightedNodeIds) {
      d3.select(`[data-id="${nodeId}"]`).classed('highlighted', true);
    }
  }

  /**
   * Get node at position (for hit testing)
   */
  public getNodeAtPosition(
    x: number,
    y: number,
    nodes: DiagramNode[]
  ): DiagramNode | null {
    for (const node of nodes) {
      if (node.x !== undefined && node.y !== undefined) {
        const distance = Math.sqrt(
          Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)
        );

        if (distance <= this.getNodeRadius(node)) {
          return node;
        }
      }
    }

    return null;
  }

  /**
   * Animate node entrance
   */
  public animateEntrance(
    nodeGroups: d3.Selection<SVGGElement, DiagramNode, SVGGElement, unknown>
  ): void {
    nodeGroups
      .style('opacity', 0)
      .transition()
      .duration(500)
      .delay((_d, i) => i * 100)
      .style('opacity', 1)
      .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);
  }

  /**
   * Animate node position updates
   */
  public animatePositions(
    nodeGroups: d3.Selection<SVGGElement, DiagramNode, SVGGElement, unknown>
  ): void {
    nodeGroups
      .transition()
      .duration(300)
      .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);
  }

  /**
   * Update style configuration
   */
  public updateStyle(style: DiagramStyle): void {
    this.style = style;
  }
}
