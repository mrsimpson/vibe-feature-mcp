/**
 * Layout engine for positioning nodes and links
 * Handles automatic layout algorithms for state machine diagrams
 */

import * as d3 from 'd3';
import {
  DiagramNode,
  DiagramLink,
  DiagramConfig,
} from '../types/visualization-types';

export class LayoutEngine {
  private config: DiagramConfig;
  private simulation: d3.Simulation<DiagramNode, DiagramLink> | null = null;

  constructor(config: DiagramConfig) {
    this.config = config;
  }

  /**
   * Calculate layout for nodes and links using force simulation
   */
  public calculateLayout(nodes: DiagramNode[], links: DiagramLink[]): void {
    console.log(
      `Calculating layout for ${nodes.length} nodes and ${links.length} links`
    );

    // Stop existing simulation
    if (this.simulation) {
      this.simulation.stop();
    }

    // Create force simulation
    this.simulation = d3
      .forceSimulation<DiagramNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<DiagramNode, DiagramLink>(links)
          .id(d => d.id)
          .distance(this.config.linkDistance)
          .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(this.config.chargeStrength))
      .force(
        'center',
        d3.forceCenter(this.config.width / 2, this.config.height / 2)
      )
      .force(
        'collision',
        d3
          .forceCollide()
          .radius(this.config.nodeRadius + 10)
          .strength(0.7)
      );

    // Handle self-loops with special positioning
    this.handleSelfLoops(links);

    // Position initial state prominently
    this.positionInitialState(nodes);

    // Run simulation for a fixed number of iterations
    this.runSimulation(300);
  }

  /**
   * Handle self-loop transitions with special positioning
   */
  private handleSelfLoops(links: DiagramLink[]): void {
    for (const link of links) {
      if (link.isSelfLoop) {
        // Self-loops don't participate in the force simulation
        // They will be positioned relative to their source node
        link.source = link.target;
      }
    }
  }

  /**
   * Position the initial state prominently
   */
  private positionInitialState(nodes: DiagramNode[]): void {
    const initialNode = nodes.find(node => node.isInitial);

    if (initialNode) {
      // Fix initial node position towards the left side
      initialNode.fx = this.config.width * 0.2;
      initialNode.fy = this.config.height * 0.5;
    }
  }

  /**
   * Run the simulation for a specified number of iterations
   */
  private runSimulation(iterations: number): void {
    if (!this.simulation) return;

    // Run simulation synchronously for predictable results
    for (let i = 0; i < iterations; i++) {
      this.simulation.tick();
    }

    // Ensure nodes stay within bounds
    this.constrainNodePositions();

    console.log('Layout calculation completed');
  }

  /**
   * Constrain node positions to stay within the diagram bounds
   */
  private constrainNodePositions(): void {
    if (!this.simulation) return;

    const nodes = this.simulation.nodes();
    const padding = this.config.nodeRadius + 20;

    for (const node of nodes) {
      if (node.x !== undefined && node.y !== undefined) {
        node.x = Math.max(
          padding,
          Math.min(this.config.width - padding, node.x)
        );
        node.y = Math.max(
          padding,
          Math.min(this.config.height - padding, node.y)
        );
      }
    }
  }

  /**
   * Calculate positions for hierarchical layout
   */
  public calculateHierarchicalLayout(
    nodes: DiagramNode[],
    links: DiagramLink[]
  ): void {
    console.log('Calculating hierarchical layout');

    // Create a simple hierarchical layout based on state transitions
    const levels = this.calculateStateLevels(nodes, links);
    const maxLevel = Math.max(...Object.values(levels));

    const levelHeight =
      (this.config.height -
        this.config.padding.top -
        this.config.padding.bottom) /
      (maxLevel + 1);
    const levelCounts: Record<number, number> = {};

    // Count nodes per level
    for (const level of Object.values(levels)) {
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    }

    // Position nodes
    const levelPositions: Record<number, number> = {};

    for (const node of nodes) {
      const level = levels[node.id];
      const nodesInLevel = levelCounts[level];
      const levelWidth =
        this.config.width -
        this.config.padding.left -
        this.config.padding.right;

      if (!levelPositions[level]) {
        levelPositions[level] = 0;
      }

      node.x =
        this.config.padding.left +
        (levelWidth / (nodesInLevel + 1)) * (levelPositions[level] + 1);
      node.y = this.config.padding.top + levelHeight * (level + 0.5);

      levelPositions[level]++;
    }
  }

  /**
   * Calculate the level (depth) of each state in the workflow
   */
  private calculateStateLevels(
    nodes: DiagramNode[],
    links: DiagramLink[]
  ): Record<string, number> {
    const levels: Record<string, number> = {};
    const visited = new Set<string>();

    // Find initial state
    const initialNode = nodes.find(node => node.isInitial);
    if (!initialNode) {
      // If no initial state, assign level 0 to all nodes
      for (const node of nodes) {
        levels[node.id] = 0;
      }
      return levels;
    }

    // BFS to assign levels
    const queue: Array<{ nodeId: string; level: number }> = [
      { nodeId: initialNode.id, level: 0 },
    ];

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;

      const { nodeId, level } = item;

      if (visited.has(nodeId)) continue;

      visited.add(nodeId);
      levels[nodeId] = level;

      // Find outgoing transitions
      const outgoingLinks = links.filter(
        link =>
          (typeof link.source === 'string' ? link.source : link.source.id) ===
            nodeId && !link.isSelfLoop
      );

      for (const link of outgoingLinks) {
        const targetId =
          typeof link.target === 'string' ? link.target : link.target.id;
        if (!visited.has(targetId)) {
          queue.push({ nodeId: targetId, level: level + 1 });
        }
      }
    }

    // Assign level 0 to any unvisited nodes
    for (const node of nodes) {
      if (!(node.id in levels)) {
        levels[node.id] = 0;
      }
    }

    return levels;
  }

  /**
   * Calculate circular layout for small workflows
   */
  public calculateCircularLayout(nodes: DiagramNode[]): void {
    console.log('Calculating circular layout');

    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;
    const radius = Math.min(this.config.width, this.config.height) * 0.3;

    for (const [index, node] of nodes.entries()) {
      const angle = (2 * Math.PI * index) / nodes.length;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: DiagramConfig): void {
    this.config = config;

    if (this.simulation) {
      // Update force simulation with new dimensions
      this.simulation.force(
        'center',
        d3.forceCenter(this.config.width / 2, this.config.height / 2)
      );
    }
  }

  /**
   * Get current simulation
   */
  public getSimulation(): d3.Simulation<DiagramNode, DiagramLink> | null {
    return this.simulation;
  }

  /**
   * Stop the current simulation
   */
  public stop(): void {
    if (this.simulation) {
      this.simulation.stop();
    }
  }

  /**
   * Restart the simulation with new alpha
   */
  public restart(alpha: number = 0.3): void {
    if (this.simulation) {
      this.simulation.alpha(alpha).restart();
    }
  }

  /**
   * Get optimal layout algorithm for the given workflow
   */
  public getOptimalLayout(
    nodeCount: number,
    linkCount: number
  ): 'force' | 'hierarchical' | 'circular' {
    if (nodeCount <= 4) {
      return 'circular';
    } else if (nodeCount <= 8 && linkCount / nodeCount < 2) {
      return 'hierarchical';
    } else {
      return 'force';
    }
  }

  /**
   * Apply the optimal layout for the given nodes and links
   */
  public applyOptimalLayout(nodes: DiagramNode[], links: DiagramLink[]): void {
    const layoutType = this.getOptimalLayout(nodes.length, links.length);

    console.log(`Applying ${layoutType} layout for ${nodes.length} nodes`);

    switch (layoutType) {
      case 'circular':
        this.calculateCircularLayout(nodes);
        break;
      case 'hierarchical':
        this.calculateHierarchicalLayout(nodes, links);
        break;
      case 'force':
      default:
        this.calculateLayout(nodes, links);
        break;
    }
  }
}
