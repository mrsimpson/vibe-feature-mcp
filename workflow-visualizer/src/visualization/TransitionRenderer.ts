/**
 * Transition link renderer
 * Handles rendering of transition arrows and labels between states
 */

import * as d3 from 'd3';
import {
  DiagramLink,
  DiagramStyle,
  InteractionEvent,
} from '../types/visualization-types';

export class TransitionRenderer {
  private style: DiagramStyle;

  constructor(style: DiagramStyle) {
    this.style = style;
  }

  /**
   * Render transition links in the diagram
   */
  public render(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    links: DiagramLink[],
    onInteraction: (event: InteractionEvent) => void
  ): void {
    console.log(`Rendering ${links.length} transition links`);

    // Bind data to transition link groups
    const linkGroups = container
      .selectAll<SVGGElement, DiagramLink>('.transition-link')
      .data(links, d => d.id);

    // Remove old links
    linkGroups.exit().remove();

    // Create new link groups
    const linkEnter = linkGroups
      .enter()
      .append('g')
      .attr('class', d => `transition-link ${d.isSelfLoop ? 'self-loop' : ''}`)
      .attr('data-id', d => d.id);

    // Add paths for transitions
    linkEnter
      .append('path')
      .attr('marker-end', 'url(#arrow)')
      .style('fill', 'none')
      .style('stroke', this.style.link.stroke)
      .style('stroke-width', this.style.link.strokeWidth);

    // Add labels for transitions
    linkEnter
      .append('text')
      .attr('class', 'transition-label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('font-size', this.style.text.fontSize)
      .style('font-family', this.style.text.fontFamily)
      .style('fill', this.style.text.fill)
      .text(d => this.formatLabel(d.label));

    // Merge enter and update selections
    const linkUpdate = linkEnter.merge(linkGroups);

    // Update paths
    linkUpdate
      .select('path')
      .attr('d', d => this.createPath(d))
      .style('stroke', d => this.getLinkStroke(d))
      .style('stroke-width', d => this.getLinkStrokeWidth(d))
      .attr('marker-end', d => this.getMarkerEnd(d));

    // Update labels
    linkUpdate
      .select('.transition-label')
      .attr('transform', d => this.getLabelTransform(d))
      .style('fill', d => this.getLabelFill(d))
      .style('font-weight', d => this.getLabelWeight(d));

    // Add event listeners
    this.addEventListeners(linkUpdate, onInteraction);
  }

  /**
   * Create SVG path for a transition link
   */
  private createPath(link: DiagramLink): string {
    const source =
      typeof link.source === 'object' ? link.source : { x: 0, y: 0 };
    const target =
      typeof link.target === 'object' ? link.target : { x: 0, y: 0 };

    if (link.isSelfLoop) {
      return this.createSelfLoopPath(source);
    }

    return this.createRegularPath(source, target);
  }

  /**
   * Create path for self-loop transitions
   */
  private createSelfLoopPath(node: { x?: number; y?: number }): string {
    const x = node.x || 0;
    const y = node.y || 0;
    const radius = 25;
    const offset = 45;

    // Create a circular arc above the node
    const startX = x - radius;
    const startY = y - offset;
    const endX = x + radius;
    const endY = y - offset;

    return `M ${startX} ${startY} 
            A ${radius} ${radius} 0 1 1 ${endX} ${endY}
            L ${x} ${y - 40}`;
  }

  /**
   * Create path for regular transitions between different states
   */
  private createRegularPath(
    source: { x?: number; y?: number },
    target: { x?: number; y?: number }
  ): string {
    const sx = source.x || 0;
    const sy = source.y || 0;
    const tx = target.x || 0;
    const ty = target.y || 0;

    // Calculate the angle and distance
    const dx = tx - sx;
    const dy = ty - sy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return `M ${sx} ${sy} L ${tx} ${ty}`;
    }

    // Calculate node edge points (accounting for node radius)
    const nodeRadius = 40;
    const sourceEdgeX = sx + (dx / distance) * nodeRadius;
    const sourceEdgeY = sy + (dy / distance) * nodeRadius;
    const targetEdgeX = tx - (dx / distance) * nodeRadius;
    const targetEdgeY = ty - (dy / distance) * nodeRadius;

    // For curved paths, add some curvature for better visual separation
    if (this.shouldUseCurvedPath(source, target)) {
      return this.createCurvedPath(
        { x: sourceEdgeX, y: sourceEdgeY },
        { x: targetEdgeX, y: targetEdgeY }
      );
    }

    // Straight line
    return `M ${sourceEdgeX} ${sourceEdgeY} L ${targetEdgeX} ${targetEdgeY}`;
  }

  /**
   * Determine if a curved path should be used
   */
  private shouldUseCurvedPath(
    source: { x?: number; y?: number },
    target: { x?: number; y?: number }
  ): boolean {
    const dx = (target.x || 0) - (source.x || 0);
    const dy = (target.y || 0) - (source.y || 0);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Use curved paths for longer connections
    return distance > 150;
  }

  /**
   * Create a curved path between two points
   */
  private createCurvedPath(
    source: { x: number; y: number },
    target: { x: number; y: number }
  ): string {
    const dx = target.x - source.x;
    const dy = target.y - source.y;

    // Calculate control point for quadratic curve
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;

    // Offset control point perpendicular to the line
    const perpX = -dy * 0.2;
    const perpY = dx * 0.2;

    const controlX = midX + perpX;
    const controlY = midY + perpY;

    return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
  }

  /**
   * Get label transform for positioning
   */
  private getLabelTransform(link: DiagramLink): string {
    if (link.isSelfLoop) {
      const source =
        typeof link.source === 'object' ? link.source : { x: 0, y: 0 };
      const x = source.x || 0;
      const y = (source.y || 0) - 60;
      return `translate(${x}, ${y})`;
    }

    const source =
      typeof link.source === 'object' ? link.source : { x: 0, y: 0 };
    const target =
      typeof link.target === 'object' ? link.target : { x: 0, y: 0 };

    const midX = ((source.x || 0) + (target.x || 0)) / 2;
    const midY = ((source.y || 0) + (target.y || 0)) / 2;

    return `translate(${midX}, ${midY})`;
  }

  /**
   * Get link stroke color based on state
   */
  private getLinkStroke(link: DiagramLink): string {
    const element = d3.select(`[data-id="${link.id}"]`);

    // Check if element exists and has classList
    if (element.empty() || !element.node()) {
      return this.style.link.stroke;
    }

    if (element.classed('highlighted')) {
      return '#d97706'; // warning color
    }

    if (element.classed('selected')) {
      return this.style.link.selectedStroke;
    }

    return this.style.link.stroke;
  }

  /**
   * Get link stroke width based on state
   */
  private getLinkStrokeWidth(link: DiagramLink): number {
    const element = d3.select(`[data-id="${link.id}"]`);

    // Check if element exists and has classList
    if (element.empty() || !element.node()) {
      return this.style.link.strokeWidth;
    }

    if (element.classed('highlighted')) {
      return 4;
    }

    if (element.classed('selected')) {
      return this.style.link.selectedStrokeWidth;
    }

    return this.style.link.strokeWidth;
  }

  /**
   * Get marker end for arrow
   */
  private getMarkerEnd(link: DiagramLink): string {
    const element = d3.select(`[data-id="${link.id}"]`);

    // Check if element exists and has classList
    if (element.empty() || !element.node()) {
      return 'url(#arrow)';
    }

    if (element.classed('highlighted') || element.classed('selected')) {
      return 'url(#arrow-highlighted)';
    }

    return 'url(#arrow)';
  }

  /**
   * Get label fill color based on link state
   */
  private getLabelFill(link: DiagramLink): string {
    const element = d3.select(`[data-id="${link.id}"]`);

    // Check if element exists and has classList
    if (element.empty() || !element.node()) {
      return this.style.text.fill;
    }

    if (element.classed('highlighted')) {
      return '#d97706'; // warning color
    }

    if (element.classed('selected')) {
      return this.style.link.selectedStroke;
    }

    return this.style.text.fill;
  }

  /**
   * Get label font weight based on link state
   */
  private getLabelWeight(link: DiagramLink): string {
    const element = d3.select(`[data-id="${link.id}"]`);

    // Check if element exists and has classList
    if (element.empty() || !element.node()) {
      return '400';
    }

    if (element.classed('highlighted') || element.classed('selected')) {
      return '600';
    }

    return '400';
  }

  /**
   * Format label text to fit
   */
  private formatLabel(label: string): string {
    // Truncate long labels
    if (label.length > 15) {
      return label.substring(0, 13) + '...';
    }

    return label;
  }

  /**
   * Add event listeners to link groups
   */
  private addEventListeners(
    linkGroups: d3.Selection<SVGGElement, DiagramLink, SVGGElement, unknown>,
    onInteraction: (event: InteractionEvent) => void
  ): void {
    linkGroups
      .style('cursor', 'pointer')
      .on('click', (event: MouseEvent, d: DiagramLink) => {
        event.stopPropagation();
        onInteraction({
          type: 'click',
          elementType: 'link',
          elementId: d.id,
          data: d,
          originalEvent: event,
        });
      })
      .on('mouseenter', (event: MouseEvent, d: DiagramLink) => {
        onInteraction({
          type: 'hover',
          elementType: 'link',
          elementId: d.id,
          data: d,
          originalEvent: event,
        });
      })
      .on('mouseleave', (event: MouseEvent, d: DiagramLink) => {
        onInteraction({
          type: 'unhover',
          elementType: 'link',
          elementId: d.id,
          data: d,
          originalEvent: event,
        });
      });
  }

  /**
   * Update link selection state
   */
  public updateSelection(selectedLinkId: string | null): void {
    // Clear all selections
    d3.selectAll('.transition-link').classed('selected', false);

    // Set new selection
    if (selectedLinkId) {
      d3.select(`[data-id="${selectedLinkId}"]`).classed('selected', true);
    }
  }

  /**
   * Update link highlight state
   */
  public updateHighlights(highlightedLinkIds: string[]): void {
    // Clear all highlights
    d3.selectAll('.transition-link').classed('highlighted', false);

    // Set new highlights
    for (const linkId of highlightedLinkIds) {
      d3.select(`[data-id="${linkId}"]`).classed('highlighted', true);
    }
  }

  /**
   * Animate link entrance
   */
  public animateEntrance(
    linkGroups: d3.Selection<SVGGElement, DiagramLink, SVGGElement, unknown>
  ): void {
    linkGroups
      .select('path')
      .style('opacity', 0)
      .transition()
      .duration(750)
      .delay((_d, i) => i * 50)
      .style('opacity', 1);

    linkGroups
      .select('.transition-label')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .delay((_d, i) => i * 50 + 250)
      .style('opacity', 1);
  }

  /**
   * Update style configuration
   */
  public updateStyle(style: DiagramStyle): void {
    this.style = style;
  }
}
