/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

// ============================================================================
// Global Type Declarations (Frontend)
// Ambient declarations for global types, environment variables, and third-party libraries
// ============================================================================

// Vite environment variables
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_DEBUG?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ============================================================================
// Third-Party Library Declarations
// ============================================================================

// Dagre layout library (used for org chart positioning)
declare module 'dagre' {
  export interface GraphLabel {
    width?: number;
    height?: number;
    rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
    ranksep?: number;
    nodesep?: number;
    edgesep?: number;
    marginx?: number;
    marginy?: number;
    align?: 'UL' | 'UR' | 'DL' | 'DR';
    ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
  }

  export interface Node {
    width: number;
    height: number;
    x: number;
    y: number;
  }

  export interface Edge {
    points?: Array<{ x: number; y: number }>;
  }

  export class graphlib {
    static Graph: new () => Graph;
  }

  export interface Graph {
    setGraph(label: GraphLabel): void;
    setDefaultEdgeLabel(callback: () => Record<string, unknown>): void;
    setNode(id: string, node: Partial<Node>): void;
    setEdge(source: string, target: string): void;
    nodes(): string[];
    node(id: string): Node;
    edges(): Array<{ v: string; w: string }>;
    edge(edge: { v: string; w: string }): Edge;
  }

  export function layout(graph: Graph): void;
}

// html-to-image library
declare module 'html-to-image' {
  export function toPng(
    node: HTMLElement,
    options?: {
      quality?: number;
      backgroundColor?: string;
      width?: number;
      height?: number;
      pixelRatio?: number;
      style?: Partial<CSSStyleDeclaration>;
      filter?: (node: HTMLElement) => boolean;
      cacheBust?: boolean;
    }
  ): Promise<string>;

  export function toJpeg(
    node: HTMLElement,
    options?: {
      quality?: number;
      backgroundColor?: string;
    }
  ): Promise<string>;

  export function toBlob(
    node: HTMLElement,
    options?: {
      quality?: number;
      backgroundColor?: string;
    }
  ): Promise<Blob | null>;

  export function toPixelData(
    node: HTMLElement,
    options?: {
      quality?: number;
      backgroundColor?: string;
    }
  ): Promise<Uint8ClampedArray>;

  export function toSvg(
    node: HTMLElement,
    options?: {
      backgroundColor?: string;
    }
  ): Promise<string>;
}
