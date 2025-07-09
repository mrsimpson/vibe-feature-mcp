/**
 * D3.js and visualization-specific type definitions
 */

import * as d3 from 'd3';
import { YamlState, YamlTransition } from './ui-types';

/**
 * Node data for D3.js force simulation
 */
export interface DiagramNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  state: YamlState;
  isInitial: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

/**
 * Link data for D3.js force simulation
 */
export interface DiagramLink extends d3.SimulationLinkDatum<DiagramNode> {
  id: string;
  source: string | DiagramNode;
  target: string | DiagramNode;
  transition: YamlTransition;
  label: string;
  isSelfLoop: boolean;
}

/**
 * Diagram dimensions and layout configuration
 */
export interface DiagramConfig {
  width: number;
  height: number;
  nodeRadius: number;
  linkDistance: number;
  chargeStrength: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Visual styling configuration
 */
export interface DiagramStyle {
  node: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    selectedFill: string;
    selectedStroke: string;
    initialFill: string;
  };
  link: {
    stroke: string;
    strokeWidth: number;
    selectedStroke: string;
    selectedStrokeWidth: number;
    arrowSize: number;
  };
  text: {
    fontSize: string;
    fontFamily: string;
    fill: string;
  };
}

/**
 * Interaction event data
 */
export interface InteractionEvent {
  type: 'click' | 'hover' | 'unhover';
  elementType: 'node' | 'link' | 'background';
  elementId?: string;
  data?: DiagramNode | DiagramLink;
  originalEvent: Event;
}

/**
 * Layout algorithm options
 */
export interface LayoutOptions {
  algorithm: 'force' | 'hierarchical' | 'circular';
  iterations: number;
  stabilizationThreshold: number;
}
