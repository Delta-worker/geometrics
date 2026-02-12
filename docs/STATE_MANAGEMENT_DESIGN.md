# GeoMetrics State Management Design

## Overview

This document specifies the state management architecture for the GeoMetrics frontend application, covering the selected approach (custom Proxy-based reactive store), implementation patterns, and best practices.

## Selected Approach: Custom Reactive Store

After evaluating Redux, Context API, Zustand, and Jotai, we selected a **custom Proxy-based reactive store** approach for the following reasons:

1. **Lightweight**: No external dependencies
2. **Reactive**: Native Proxy-based reactivity
3. **Flexible**: Easy to extend and customize
4. **Performant**: Direct reactivity without re-render overhead
5. **TypeScript-friendly**: Full type inference

---

## Core Store Implementation

```typescript
// /src/system/Store.ts

/**
 * Base Store - Generic reactive store with Proxy-based reactivity
 */
export class Store<T extends object> {
  protected state: T;
  private listeners: Map<keyof T, Set<(value: any, previous?: any) => void>>;
  private subscribers: Set<(state: T, prevState: T) => void>;

  constructor(initialState: T) {
    this.state = this._createReactiveProxy(initialState);
    this.listeners = new Map();
    this.subscribers = new Set();
  }

  /**
   * Get the current state (non-reactive)
   */
  getState(): T {
    return this.state;
  }

  /**
   * Get a specific state property
   */
  get<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  /**
   * Update state using a function
   */
  set(partial: Partial<T> | ((state: T) => Partial<T>)): void {
    const prevState = this._cloneState(this.state);
    const updates = typeof partial === 'function' 
      ? partial(this.state) 
      : partial;
    
    Object.assign(this.state, updates);
    
    // Notify subscribers
    this._notifyAll(updates, prevState);
    
    // Notify specific listeners
    Object.keys(updates).forEach(key => {
      this._notifyListeners(key as keyof T, updates[key as keyof T], prevState[key as keyof T]);
    });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(
    callback: (state: T, prevState: T) => void
  ): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Subscribe to specific property changes
   */
  subscribeTo<K extends keyof T>(
    key: K,
    callback: (value: T[K], previous?: T[K]) => void
  ): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    return () => this.listeners.get(key)?.delete(callback);
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    // Override in subclasses
  }

  // Private methods
  private _createReactiveProxy(state: T): T {
    const handler: ProxyHandler<T> = {
      get: (target, property: keyof T) => {
        return target[property];
      },
      set: (target, property: keyof T, value) => {
        const prevValue = target[property];
        if (prevValue === value) return true;
        
        target[property] = value;
        
        // Notify subscribers
        this._notifyListeners(property, value, prevValue);
        
        return true;
      }
    };
    
    return new Proxy(state, handler);
  }

  private _notifyAll(updates: Partial<T>, prevState: T): void {
    this.subscribers.forEach(callback => callback(this.state, prevState));
  }

  private _notifyListeners<K extends keyof T>(
    key: K,
    value: T[K],
    previous?: T[K]
  ): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => callback(value, previous));
    }
  }

  private _cloneState(state: T): T {
    return Object.assign({}, state);
  }
}
```

---

## Data Store Implementation

```typescript
// /src/stores/DataStore.ts

import { Store } from '../system/Store';
import { eventBus } from '../system/EventBus';

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  rowCount: number;
  columnCount: number;
  status: DatasetStatus;
  createdAt: string;
  columnMappings?: ColumnMapping[];
}

export type DatasetStatus = 'pending' | 'mapping' | 'ready' | 'processing' | 'error';

export interface ColumnMapping {
  id: string;
  sourceColumn: string;
  targetField: string;
  dataType: DataType;
}

export type DataType = 
  | 'STRING' 
  | 'NUMBER' 
  | 'INTEGER' 
  | 'FLOAT' 
  | 'BOOLEAN' 
  | 'DATE' 
  | 'DATETIME' 
  | 'COORDINATE_LAT' 
  | 'COORDINATE_LON' 
  | 'ELEVATION' 
  | 'DEPTH' 
  | 'ASSAY_VALUE';

export interface DataStoreState {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  loading: boolean;
  error: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class DataStore extends Store<DataStoreState> {
  constructor() {
    super({
      datasets: [],
      currentDataset: null,
      loading: false,
      error: null
    });
  }

  /**
   * Fetch all datasets
   */
  async fetchDatasets(): Promise<void> {
    this.set({ loading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/api/data/datasets`);
      const data = await response.json();
      
      this.set({
        datasets: data.datasets || [],
        loading: false
      });
      
      eventBus.publish('dataset.list.loaded', {
        count: data.datasets?.length || 0
      });
    } catch (error) {
      this.set({
        error: error instanceof Error ? error.message : 'Failed to fetch datasets',
        loading: false
      });
      
      eventBus.publish('dataset.list.error', {
        error: this.state.error
      });
    }
  }

  /**
   * Upload a dataset
   */
  async uploadDataset(file: File): Promise<Dataset | null> {
    this.set({ loading: true, error: null });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/data/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      const dataset: Dataset = {
        id: data.dataset.id,
        name: data.dataset.name,
        filename: data.dataset.filename,
        rowCount: data.dataset.rowCount,
        columnCount: data.dataset.columnCount,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      // Add to list
      this.set({
        datasets: [dataset, ...this.state.datasets],
        loading: false
      });
      
      eventBus.publish('dataset.uploaded', {
        datasetId: dataset.id,
        filename: dataset.filename
      });
      
      return dataset;
    } catch (error) {
      this.set({
        error: error instanceof Error ? error.message : 'Upload failed',
        loading: false
      });
      
      return null;
    }
  }

  /**
   * Save column mappings
   */
  async saveMappings(
    datasetId: string,
    mappings: ColumnMapping[]
  ): Promise<boolean> {
    this.set({ loading: true, error: null });
    
    try {
      const response = await fetch(
        `${API_URL}/api/data/datasets/${datasetId}/mappings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mappings })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to save mappings');
      }
      
      // Update dataset status
      this.set(state => ({
        datasets: state.datasets.map(ds =>
          ds.id === datasetId 
            ? { ...ds, status: 'ready' as const, columnMappings: mappings }
            : ds
        ),
        loading: false
      }));
      
      eventBus.publish('dataset.mappings.saved', {
        datasetId,
        mappingsCount: mappings.length
      });
      
      return true;
    } catch (error) {
      this.set({
        error: error instanceof Error ? error.message : 'Failed to save mappings',
        loading: false
      });
      
      return false;
    }
  }

  /**
   * Delete a dataset
   */
  async deleteDataset(datasetId: string): Promise<boolean> {
    this.set({ loading: true, error: null });
    
    try {
      const response = await fetch(
        `${API_URL}/api/data/datasets/${datasetId}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to delete dataset');
      }
      
      // Remove from list
      this.set(state => ({
        datasets: state.datasets.filter(ds => ds.id !== datasetId),
        currentDataset: state.currentDataset?.id === datasetId 
          ? null 
          : state.currentDataset,
        loading: false
      }));
      
      eventBus.publish('dataset.deleted', { datasetId });
      
      return true;
    } catch (error) {
      this.set({
        error: error instanceof Error ? error.message : 'Failed to delete',
        loading: false
      });
      
      return false;
    }
  }

  /**
   * Set current dataset
   */
  setCurrentDataset(dataset: Dataset | null): void {
    this.set({ currentDataset: dataset });
    
    if (dataset) {
      eventBus.publish('dataset.selected', {
        datasetId: dataset.id
      });
    }
  }

  /**
   * Reset store
   */
  reset(): void {
    this.set({
      datasets: [],
      currentDataset: null,
      loading: false,
      error: null
    });
  }
}

export const dataStore = new DataStore();
```

---

## Graph Store Implementation

```typescript
// /src/stores/GraphStore.ts

import { Store } from '../system/Store';
import { eventBus } from '../system/EventBus';

export interface GraphNode {
  id: string;
  nodeId: string;
  nodeType: NodeType;
  label: string;
  properties: Record<string, unknown>;
  positionX?: number;
  positionY?: number;
  style?: NodeStyle;
}

export type NodeType = 
  | 'SAMPLE' 
  | 'WELL' 
  | 'INTERVAL' 
  | 'LITHOLOGY' 
  | 'STRUCTURE' 
  | 'ASSAY' 
  | 'CUSTOM';

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: EdgeType;
  weight?: number;
  properties?: Record<string, unknown>;
  style?: EdgeStyle;
}

export type EdgeType = 
  | 'PARENT_CHILD' 
  | 'ASSOCIATED' 
  | 'SEQUENTIAL' 
  | 'DEPENDENT' 
  | 'SIMILARITY' 
  | 'CUSTOM';

export interface GraphConfig {
  layout: string;
  nodeSize: number | 'dynamic';
  showLabels: boolean;
  colorScheme: string;
  [key: string]: unknown;
}

export interface Graph {
  id: string;
  name: string;
  graphType: GraphType;
  nodes: GraphNode[];
  edges: GraphEdge[];
  config: GraphConfig;
  loaded: boolean;
}

export type GraphType = 
  | 'DATA_TREE' 
  | 'NETWORK' 
  | 'HIERARCHY' 
  | 'SCATTER' 
  | 'PARALLEL_COORDS';

export interface GraphStoreState {
  currentGraph: Graph | null;
  selectedNodes: Set<string>;
  selectedEdges: Set<string>;
  loading: boolean;
  error: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class GraphStore extends Store<GraphStoreState> {
  constructor() {
    super({
      currentGraph: null,
      selectedNodes: new Set(),
      selectedEdges: new Set(),
      loading: false,
      error: null
    });
  }

  /**
   * Load a graph
   */
  async loadGraph(graphId: string): Promise<void> {
    this.set({ loading: true, error: null });
    
    try {
      const response = await fetch(`${API_URL}/api/graphs/${graphId}`);
      
      if (!response.ok) {
        throw new Error('Graph not found');
      }
      
      const data = await response.json();
      
      const graph: Graph = {
        id: data.graph.id,
        name: data.graph.name,
        graphType: data.graph.graphType,
        nodes: [],
        edges: [],
        config: data.graph.config || {},
        loaded: true
      };
      
      this.set({
        currentGraph: graph,
        loading: false
      });
      
      eventBus.publish('graph.loaded', {
        graphId,
        graphType: graph.graphType
      });
    } catch (error) {
      this.set({
        error: error instanceof Error ? error.message : 'Failed to load graph',
        loading: false
      });
    }
  }

  /**
   * Load graph nodes
   */
  async loadNodes(graphId: string): Promise<void> {
    try {
      const response = await fetch(
        `${API_URL}/api/graphs/${graphId}/nodes?limit=1000`
      );
      const data = await response.json();
      
      this.set(state => ({
        currentGraph: state.currentGraph
          ? { ...state.currentGraph, nodes: data.nodes || [] }
          : null
      }));
    } catch (error) {
      console.error('Failed to load nodes:', error);
    }
  }

  /**
   * Select a node
   */
  selectNode(nodeId: string, options: { multi?: boolean } = {}): void {
    const { multi = false } = options;
    
    this.set(state => {
      const newSelected = multi 
        ? new Set(state.selectedNodes)
        : new Set();
      
      newSelected.add(nodeId);
      
      return { selectedNodes: newSelected };
    });
    
    eventBus.publish('graph.node.selected', {
      nodeId,
      multiSelect: options.multi
    });
  }

  /**
   * Deselect a node
   */
  deselectNode(nodeId: string): void {
    this.set(state => {
      const newSelected = new Set(state.selectedNodes);
      newSelected.delete(nodeId);
      
      return { selectedNodes: newSelected };
    });
    
    eventBus.publish('graph.node.deselected', { nodeId });
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.set({
      selectedNodes: new Set(),
      selectedEdges: new Set()
    });
    
    eventBus.publish('graph.selection.cleared', {});
  }

  /**
   * Add a node
   */
  addNode(node: GraphNode): void {
    this.set(state => ({
      currentGraph: state.currentGraph
        ? { ...state.currentGraph, nodes: [...state.currentGraph.nodes, node] }
        : null
    }));
  }

  /**
   * Update a node
   */
  updateNode(nodeId: string, updates: Partial<GraphNode>): void {
    this.set(state => ({
      currentGraph: state.currentGraph
        ? {
            ...state.currentGraph,
            nodes: state.currentGraph.nodes.map(n =>
              n.id === nodeId ? { ...n, ...updates } : n
            )
          }
        : null
    }));
  }

  /**
   * Remove a node
   */
  removeNode(nodeId: string): void {
    this.set(state => ({
      currentGraph: state.currentGraph
        ? {
            ...state.currentGraph,
            nodes: state.currentGraph.nodes.filter(n => n.id !== nodeId),
            edges: state.currentGraph.edges.filter(
              e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
            )
          }
        : null,
      selectedNodes: new Set(
        [...state.selectedNodes].filter(id => id !== nodeId)
      )
    }));
  }

  /**
   * Add an edge
   */
  addEdge(edge: GraphEdge): void {
    this.set(state => ({
      currentGraph: state.currentGraph
        ? { ...state.currentGraph, edges: [...state.currentGraph.edges, edge] }
        : null
    }));
  }

  /**
   * Remove an edge
   */
  removeEdge(edgeId: string): void {
    this.set(state => ({
      currentGraph: state.currentGraph
        ? {
            ...state.currentGraph,
            edges: state.currentGraph.edges.filter(e => e.id !== edgeId)
          }
        : null,
      selectedEdges: new Set(
        [...state.selectedEdges].filter(id => id !== edgeId)
      )
    }));
  }

  /**
   * Get selected nodes data
   */
  getSelectedNodesData(): GraphNode[] {
    const { currentGraph, selectedNodes } = this.state;
    if (!currentGraph) return [];
    
    return currentGraph.nodes.filter(n => selectedNodes.has(n.id));
  }
}

export const graphStore = new GraphStore();
```

---

## React Integration

```typescript
// /src/hooks/useStore.ts

import { useState, useEffect, useCallback } from 'react';
import { Store } from '../system/Store';

/**
 * Hook to use a store in React components
 */
export function useStore<T, K extends keyof T>(
  store: Store<T>,
  selector?: K
): K extends keyof T ? T[K] : T {
  const [state, setState] = useState(() => 
    selector ? store.get(selector) : store.getState()
  );

  useEffect(() => {
    if (selector) {
      return store.subscribeTo(selector, (value) => {
        setState(value);
      });
    }
    
    return store.subscribe((newState) => {
      setState(newState);
    });
  }, [store, selector]);

  return state as K extends keyof T ? T[K] : T;
}

/**
 * Hook to get store instance
 */
export function useStoreInstance<T extends Store<unknown>>(
  store: T
): T {
  return store;
}
```

---

## Usage Example

```tsx
// /src/components/DatasetList.tsx

import { useStore } from '../hooks/useStore';
import { dataStore, Dataset } from '../stores/DataStore';
import { useCallback } from 'react';

export function DatasetList() {
  const datasets = useStore(dataStore, 'datasets');
  const loading = useStore(dataStore, 'loading');
  const error = useStore(dataStore, 'error');
  
  const handleDelete = useCallback(async (id: string) => {
    await dataStore.deleteDataset(id);
  }, []);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  return (
    <div className="dataset-list">
      {datasets.map((dataset: Dataset) => (
        <div key={dataset.id} className="dataset-item">
          <h3>{dataset.name}</h3>
          <p>{dataset.rowCount} rows</p>
          <button onClick={() => handleDelete(dataset.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## Performance Considerations

### Selector Pattern

```typescript
// /src/stores/selectors.ts

// Memoized selectors for performance
export const selectDatasetById = (datasetId: string) => {
  return (state: DataStoreState) => 
    state.datasets.find(ds => ds.id === datasetId);
};

export const selectReadyDatasets = (state: DataStoreState) =>
  state.datasets.filter(ds => ds.status === 'ready');

export const selectSelectedNodeData = (state: GraphStoreState) =>
  state.currentGraph?.nodes.filter(n => state.selectedNodes.has(n.id)) || [];
```

### Batch Updates

```typescript
// Batch multiple state updates
dataStore.set({
  datasets: [...newDatasets],
  loading: false
});
```

---

## Comparison with Other Approaches

| Feature | Custom Store | Redux | Zustand | Context |
|---------|--------------|-------|---------|---------|
| Bundle Size | ~1KB | ~20KB | ~1KB | ~0KB |
| Learning Curve | Low | High | Low | Medium |
| Boilerplate | Minimal | High | Low | Medium |
| Type Safety | Good | Excellent | Excellent | Good |
| DevTools | Limited | Native | Plugin | Manual |
| Performance | Good | Good | Excellent | Moderate |

---

*Document Version: 1.0*
*Last Updated: 2024-02-12*
