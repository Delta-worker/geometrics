# GeoMetrics Event Bus & Message Passing System

## Overview

This document specifies the event bus architecture and message passing patterns for the GeoMetrics frontend application, enabling decoupled, reactive communication between components.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Bus System                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Publisher  │  │   Event     │  │      Subscriber     │  │
│  │  (Source)   │──│   Bus       │──│     (Consumer)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                        │                                       │
│                        ▼                                       │
│              ┌─────────────────┐                               │
│              │  Event Middleware│                              │
│              │  (Logging, etc.) │                              │
│              └─────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

## Core Event Bus Implementation

```javascript
// /src/system/EventBus.js

/**
 * EventBus - Central event hub for decoupled communication
 * Supports event types, priorities, wildcards, and middleware
 */
class EventBus {
  constructor() {
    this.events = new Map();
    this.middleware = [];
    this.eventHistory = [];
    this.maxHistorySize = 100;
    this.idCounter = 0;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name (supports wildcards like 'node:*')
   * @param {Function} callback - Callback function
   * @param {Object} options - Subscription options
   * @returns {string} - Subscription ID
   */
  subscribe(event, callback, options = {}) {
    const subscriptionId = `sub_${++this.idCounter}`;
    
    if (!this.events.has(event)) {
      this.events.set(event, new Map());
    }
    
    this.events.get(event).set(subscriptionId, {
      callback,
      options: {
        priority: options.priority || 0,
        once: options.once || false,
        filter: options.filter || null,
        context: options.context || null
      }
    });
    
    // Sort by priority (higher first)
    this._sortSubscriptions(event);
    
    return subscriptionId;
  }

  /**
   * Subscribe once (auto-unsubscribes after first event)
   */
  subscribeOnce(event, callback, options = {}) {
    return this.subscribe(event, callback, { ...options, once: true });
  }

  /**
   * Publish an event
   * @param {string} event - Event name
   * @param {Object} payload - Event data
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Result of publication
   */
  publish(event, payload = {}, metadata = {}) {
    const eventId = `evt_${++this.idCounter}`;
    const timestamp = Date.now();
    
    const eventData = {
      id: eventId,
      name: event,
      payload,
      metadata: {
        timestamp,
        source: metadata.source || 'anonymous',
        correlationId: metadata.correlationId || this._generateCorrelationId(),
        ...metadata
      }
    };

    // Run middleware pipeline
    const middlewareResult = this._runMiddleware(eventData);
    if (middlewareResult.cancelled) {
      return { cancelled: true, eventData };
    }

    // Find matching subscriptions (including wildcards)
    const subscriptions = this._findSubscriptions(event);
    
    if (subscriptions.length === 0) {
      return { delivered: 0, eventData };
    }

    // Deliver to subscribers
    let delivered = 0;
    const errors = [];

    subscriptions.forEach(({ subId, subscription }) => {
      try {
        // Apply filter if present
        if (subscription.options.filter && 
            !subscription.options.filter(eventData)) {
          return;
        }

        subscription.callback.call(
          subscription.options.context,
          eventData,
          this
        );
        
        delivered++;
        
        // Remove if once subscription
        if (subscription.options.once) {
          this.events.get(event)?.delete(subId);
        }
      } catch (error) {
        errors.push({ subId, error: error.message });
      }
    });

    // Store in history
    this._addToHistory(eventData);

    return { delivered, errors, eventData };
  }

  /**
   * Unsubscribe by ID or event pattern
   */
  unsubscribe(subscriptionIdOrEvent) {
    // If it's a subscription ID
    if (subscriptionIdOrEvent.startsWith('sub_')) {
      for (const [event, subscriptions] of this.events) {
        if (subscriptions.has(subscriptionIdOrEvent)) {
          subscriptions.delete(subscriptionIdOrEvent);
          return true;
        }
      }
      return false;
    }

    // If it's an event pattern
    if (this.events.has(subscriptionIdOrEvent)) {
      this.events.delete(subscriptionIdOrEvent);
      return true;
    }

    // Handle wildcards
    const pattern = subscriptionIdOrEvent;
    let deleted = false;
    
    for (const [event] of this.events) {
      if (this._matchWildcard(event, pattern)) {
        this.events.delete(event);
        deleted = true;
      }
    }
    
    return deleted;
  }

  /**
   * Add middleware
   */
  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Get event history
   */
  getHistory(eventName = null, limit = 50) {
    let history = this.eventHistory;
    
    if (eventName) {
      history = history.filter(e => e.name === eventName);
    }
    
    return history.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }

  // Private methods
  _sortSubscriptions(event) {
    const subscriptions = this.events.get(event);
    if (!subscriptions) return;
    
    const sorted = Array.from(subscriptions.entries())
      .sort((a, b) => b[1].options.priority - a[1].options.priority);
    
    this.events.set(event, new Map(sorted));
  }

  _findSubscriptions(event) {
    const results = [];
    
    // Direct match
    if (this.events.has(event)) {
      for (const [subId, sub] of this.events.get(event)) {
        results.push({ subId, subscription: sub });
      }
    }
    
    // Wildcard matches
    for (const [pattern, subscriptions] of this.events) {
      if (pattern !== event && this._matchWildcard(event, pattern)) {
        for (const [subId, sub] of subscriptions) {
          results.push({ subId, subscription: sub });
        }
      }
    }
    
    return results;
  }

  _matchWildcard(event, pattern) {
    const eventParts = event.split('.');
    const patternParts = pattern.split('.');
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '*') continue;
      if (patternParts[i] === '**') return true;
      if (patternParts[i] !== eventParts[i]) return false;
    }
    
    return patternParts.length === eventParts.length;
  }

  _runMiddleware(eventData) {
    for (const middleware of this.middleware) {
      const result = middleware(eventData, this);
      if (result && result.cancelled) {
        return { cancelled: true };
      }
    }
    return { cancelled: false };
  }

  _addToHistory(eventData) {
    this.eventHistory.push(eventData);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  _generateCorrelationId() {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Logger middleware
eventBus.use((event, bus) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[EventBus] ${event.name}:`, event.payload);
  }
});
```

---

## Event Types

### Naming Convention

Events follow the pattern: `category.action`

```
node.selected
node.deselected
node.updated
graph.loaded
graph.zoomed
dataset.uploaded
dataset.mapped
selection.changed
filter.applied
undo.stackChanged
```

### Core Events

```javascript
// /src/events/EventTypes.js

export const GraphEvents = {
  LOADED: 'graph.loaded',
  NODE_SELECTED: 'graph.node.selected',
  NODE_DESELECTED: 'graph.node.deselected',
  NODE_UPDATED: 'graph.node.updated',
  EDGE_CREATED: 'graph.edge.created',
  EDGE_DELETED: 'graph.edge.deleted',
  ZOOM_CHANGED: 'graph.zoom.changed',
  PAN_CHANGED: 'graph.pan.changed',
  FILTER_APPLIED: 'graph.filter.applied',
  FILTER_CLEARED: 'graph.filter.cleared'
};

export const DatasetEvents = {
  UPLOADED: 'dataset.uploaded',
  MAPPED: 'dataset.mapped',
  DELETED: 'dataset.deleted',
  STATUS_CHANGED: 'dataset.status.changed'
};

export const SelectionEvents = {
  CHANGED: 'selection.changed',
  MODE_CHANGED: 'selection.mode.changed',
  MULTI_ENABLED: 'selection.multi.enabled',
  MULTI_DISABLED: 'selection.multi.disabled'
};

export const HistoryEvents = {
  ACTION_PERFORMED: 'history.action.performed',
  UNDO_STACK_CHANGED: 'history.undo.changed',
  REDO_STACK_CHANGED: 'history.redo.changed'
};

export const UIEvents = {
  TOGGLE_PANEL: 'ui.panel.toggle',
  OPEN_MODAL: 'ui.modal.open',
  CLOSE_MODAL: 'ui.modal.close',
  TOAST_SHOWN: 'ui.toast.shown'
};
```

---

## Event Payloads

```javascript
// /src/events/EventPayloads.js

/**
 * Standard event payload structures
 */

export const NodeSelectedPayload = {
  nodeId: string,           // Node identifier
  nodeType: string,          // Type of node
  source: string,            // Component that triggered selection
  multiSelect: boolean,     // Whether multi-select is active
  timestamp: number
};

export const GraphLoadedPayload = {
  graphId: string,
  graphType: string,
  nodeCount: number,
  edgeCount: number,
  source: string
};

export const DatasetUploadedPayload = {
  datasetId: string,
  filename: string,
  rowCount: number,
  columnCount: number,
  uploaderId: string
};

export const SelectionChangedPayload = {
  selectedIds: string[],    // Array of selected item IDs
  selectionType: 'node' | 'edge' | 'mixed',
  source: string,
  timestamp: number
};
```

---

## Selection Propagation Protocol

```javascript
// /src/system/SelectionManager.js

import { eventBus } from './EventBus';
import { GraphEvents, SelectionEvents } from '../events/EventTypes';

/**
 * SelectionManager - Handles selection state and propagation
 * Implements the Selection Propagation Protocol
 */
class SelectionManager {
  constructor() {
    this.selectedNodes = new Set();
    this.selectedEdges = new Set();
    this.selectionHistory = [];
    this.maxHistorySize = 20;
    
    // Listen for selection events
    eventBus.subscribe(GraphEvents.NODE_SELECTED, this._handleNodeSelected.bind(this));
    eventBus.subscribe(GraphEvents.NODE_DESELECTED, this._handleNodeDeselected.bind(this));
  }

  /**
   * Select a node
   */
  selectNode(nodeId, options = {}) {
    const { multi = false, source = 'unknown' } = options;
    
    if (!multi) {
      this.clearSelection();
    }
    
    if (!this.selectedNodes.has(nodeId)) {
      this.selectedNodes.add(nodeId);
      
      eventBus.publish(GraphEvents.NODE_SELECTED, {
        nodeId,
        multiSelect: multi,
        source
      });
      
      this._propagateSelection(nodeId, 'node', 'selected');
    }
  }

  /**
   * Deselect a node
   */
  deselectNode(nodeId, options = {}) {
    const { source = 'unknown' } = options;
    
    if (this.selectedNodes.has(nodeId)) {
      this.selectedNodes.delete(nodeId);
      
      eventBus.publish(GraphEvents.NODE_DESELECTED, {
        nodeId,
        source
      });
      
      this._propagateSelection(nodeId, 'node', 'deselected');
    }
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    const previousSelection = [...this.selectedNodes];
    
    this.selectedNodes.forEach(nodeId => {
      eventBus.publish(GraphEvents.NODE_DESELECTED, {
        nodeId,
        source: 'clearAll'
      });
    });
    
    this.selectedNodes.clear();
    this.selectedEdges.clear();
    
    eventBus.publish(SelectionEvents.CHANGED, {
      selectedIds: [],
      selectionType: null,
      previousSelection,
      source: 'clearAll'
    });
  }

  /**
   * Get current selection
   */
  getSelection() {
    return {
      nodes: [...this.selectedNodes],
      edges: [...this.selectedEdges],
      count: this.selectedNodes.size + this.selectedEdges.size
    };
  }

  /**
   * Propagate selection to connected components
   */
  _propagateSelection(itemId, itemType, action) {
    // Publish selection change event
    eventBus.publish(SelectionEvents.CHANGED, {
      selectedIds: this.getSelection().nodes,
      selectionType: itemType,
      changedItem: { id: itemId, type: itemType, action },
      timestamp: Date.now()
    });
    
    // Store in history
    this._addToHistory({
      type: 'selection',
      itemType,
      itemId,
      action,
      timestamp: Date.now()
    });
  }

  _handleNodeSelected(event) {
    // Additional handling when node is selected
    // Can trigger side effects like fetching related data
  }

  _handleNodeDeselected(event) {
    // Additional handling when node is deselected
  }

  _addToHistory(action) {
    this.selectionHistory.push(action);
    if (this.selectionHistory.length > this.maxHistorySize) {
      this.selectionHistory.shift();
    }
  }
}

export const selectionManager = new SelectionManager();
```

---

## Undo/Redo Stack Design

```javascript
// /src/system/HistoryManager.js

import { eventBus } from './EventBus';
import { HistoryEvents } from '../events/EventTypes';

/**
 * HistoryManager - Manages undo/redo stacks for actions
 * Implements command pattern for reversible actions
 */
class HistoryManager {
  constructor(maxHistorySize = 50) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistorySize = maxHistorySize;
    this.currentAction = null;
    
    // Bind keyboard shortcuts
    this._bindShortcuts();
  }

  /**
   * Execute a reversible action
   */
  execute(action) {
    // Execute the action
    const result = action.execute();
    
    // Store in undo stack
    this.undoStack.push(action);
    this.redoStack = []; // Clear redo stack on new action
    
    // Limit stack size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    
    // Notify listeners
    this._notifyChange();
    
    return result;
  }

  /**
   * Undo the last action
   */
  undo() {
    if (this.undoStack.length === 0) {
      console.warn('Nothing to undo');
      return null;
    }

    const action = this.undoStack.pop();
    const result = action.undo();
    
    this.redoStack.push(action);
    this._notifyChange();
    
    eventBus.publish(HistoryEvents.ACTION_PERFORMED, {
      type: 'undo',
      actionName: action.name,
      timestamp: Date.now()
    });
    
    return result;
  }

  /**
   * Redo the last undone action
   */
  redo() {
    if (this.redoStack.length === 0) {
      console.warn('Nothing to redo');
      return null;
    }

    const action = this.redoStack.pop();
    const result = action.execute();
    
    this.undoStack.push(action);
    this._notifyChange();
    
    eventBus.publish(HistoryEvents.ACTION_PERFORMED, {
      type: 'redo',
      actionName: action.name,
      timestamp: Date.now()
    });
    
    return result;
  }

  /**
   * Check if undo is available
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get undo stack snapshot
   */
  getUndoStack() {
    return this.undoStack.map(action => ({
      name: action.name,
      timestamp: action.timestamp
    }));
  }

  /**
   * Clear history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this._notifyChange();
  }

  _notifyChange() {
    eventBus.publish(HistoryEvents.UNDO_STACK_CHANGED, {
      size: this.undoStack.length,
      canUndo: this.canUndo()
    });
    
    eventBus.publish(HistoryEvents.REDO_STACK_CHANGED, {
      size: this.redoStack.length,
      canRedo: this.canRedo()
    });
  }

  _bindShortcuts() {
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
        }
      });
    }
  }
}

/**
 * Base Action class for command pattern
 */
class Action {
  constructor(name) {
    this.name = name;
    this.timestamp = Date.now();
  }

  execute() {
    throw new Error('execute() must be implemented');
  }

  undo() {
    throw new Error('undo() must be implemented');
  }
}

/**
 * Example: Node Move Action
 */
class MoveNodeAction extends Action {
  constructor(nodeId, oldPosition, newPosition) {
    super('Move Node');
    this.nodeId = nodeId;
    this.oldPosition = oldPosition;
    this.newPosition = newPosition;
  }

  execute() {
    // Move node to new position
    eventBus.publish('node.position.changed', {
      nodeId: this.nodeId,
      position: this.newPosition
    });
    return { success: true };
  }

  undo() {
    // Restore old position
    eventBus.publish('node.position.changed', {
      nodeId: this.nodeId,
      position: this.oldPosition
    });
    return { success: true };
  }
}

export const historyManager = new HistoryManager();
export { Action, MoveNodeAction };
```

---

## React Integration Hooks

```javascript
// /src/hooks/useEventBus.js

import { useEffect, useRef, useCallback } from 'react';
import { eventBus } from '../system/EventBus';

/**
 * Hook to subscribe to events
 */
export function useEventBus(event, callback, options = {}) {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    const subscriptionId = eventBus.subscribe(event, (data) => {
      callbackRef.current(data);
    }, options);
    
    return () => {
      eventBus.unsubscribe(subscriptionId);
    };
  }, [event]);
}

/**
 * Hook to publish events
 */
export function usePublishEvent() {
  const publish = useCallback((event, payload, metadata) => {
    return eventBus.publish(event, payload, metadata);
  }, []);
  
  return publish;
}

/**
 * Hook for selection management
 */
export function useSelection() {
  const [selection, setSelection] = useState({
    nodes: [],
    edges: [],
    count: 0
  });

  useEventBus('selection.changed', (event) => {
    setSelection({
      nodes: event.selectedIds,
      edges: [],
      count: event.selectedIds.length
    });
  });

  const selectNode = useCallback((nodeId, options) => {
    selectionManager.selectNode(nodeId, options);
  }, []);

  const deselectNode = useCallback((nodeId, options) => {
    selectionManager.deselectNode(nodeId, options);
  }, []);

  const clearSelection = useCallback(() => {
    selectionManager.clearSelection();
  }, []);

  return {
    selection,
    selectNode,
    deselectNode,
    clearSelection
  };
}

/**
 * Hook for undo/redo
 */
export function useHistory() {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEventBus('history.undo.changed', (event) => {
    setCanUndo(event.canUndo);
  });

  useEventBus('history.redo.changed', (event) => {
    setCanRedo(event.canRedo);
  });

  const undo = useCallback(() => {
    historyManager.undo();
  }, []);

  const redo = useCallback(() => {
    historyManager.redo();
  }, []);

  return { canUndo, canRedo, undo, redo };
}
```

---

## Middleware Examples

```javascript
// /src/middleware/EventMiddleware.js

/**
 * Logger Middleware
 */
export const loggerMiddleware = (event, bus) => {
  console.group(`[Event] ${event.name}`);
  console.log('Payload:', event.payload);
  console.log('Metadata:', event.metadata);
  console.groupEnd();
};

/**
 * Performance Middleware
 */
export const performanceMiddleware = (event, bus) => {
  const start = performance.now();
  
  // Wrap the callback to measure execution time
  return {
    after: (result) => {
      const duration = performance.now() - start;
      if (duration > 100) {
        console.warn(`Slow event handler: ${event.name} took ${duration.toFixed(2)}ms`);
      }
    }
  };
};

/**
 * Error Boundary Middleware
 */
export const errorBoundaryMiddleware = (event, bus) => {
  return {
    onError: (error) => {
      console.error(`Error in event handler for ${event.name}:`, error);
      bus.publish('system.error', { error, event });
    }
  };
};

/**
 * Analytics Middleware
 */
export const analyticsMiddleware = (event, bus) => {
  // Track important events
  const trackableEvents = [
    'graph.loaded',
    'node.selected',
    'dataset.uploaded'
  ];
  
  if (trackableEvents.includes(event.name)) {
    // Send to analytics (placeholder)
    console.log(`[Analytics] ${event.name}`, event.payload);
  }
};
```

---

## Usage Examples

```javascript
// Example 1: Publishing an event
import { eventBus } from './system/EventBus';

function onNodeClick(nodeId) {
  eventBus.publish('graph.node.selected', {
    nodeId,
    source: 'graph-view'
  });
}

// Example 2: Subscribing to events
import { useEventBus } from './hooks/useEventBus';

function MyComponent() {
  useEventBus('graph.node.selected', (event) => {
    console.log('Node selected:', event.payload.nodeId);
  });
  
  // Example with wildcard
  useEventBus('node.*', (event) => {
    console.log('Node event:', event.name);
  });
}

// Example 3: Using history manager
import { historyManager, MoveNodeAction } from './system/HistoryManager';

function onNodeDrag(nodeId, oldPos, newPos) {
  const action = new MoveNodeAction(nodeId, oldPos, newPos);
  historyManager.execute(action);
}
```

---

## Best Practices

1. **Event Naming**: Use descriptive, hierarchical names (`category.action`)
2. **Payload Structure**: Keep payloads flat and serializable
3. **Unsubscribe**: Always unsubscribe when components unmount
4. **Avoid Dependencies**: Don't assume subscriber order
5. **Performance**: Use middleware for cross-cutting concerns
6. **Testing**: Mock event bus for unit tests

---

*Document Version: 1.0*
*Last Updated: 2024-02-12*
