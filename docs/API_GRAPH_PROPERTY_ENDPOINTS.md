# GeoMetrics API Specification - Graph & Property Endpoints

## Overview

This document specifies the REST API endpoints for graph data operations and property management in the GeoMetrics platform.

## Base URL

```
Production: https://api.geometrics.example.com
Development: http://localhost:3001
```

## Authentication

All API endpoints require authentication via Bearer token:

```
Authorization: Bearer <token>
```

---

## Graph Endpoints

### Graph Management

#### Create Graph

**POST** `/api/graphs`

**Request Body:**

```json
{
  "name": "Sample Analysis Network",
  "description": "Network graph of assay samples",
  "projectId": "uuid-project-id",
  "graphType": "NETWORK",
  "config": {
    "layout": "force-directed",
    "nodeSize": "dynamic",
    "edgeWidth": 1.5,
    "showLabels": true,
    "colorScheme": "category10"
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "graph": {
    "id": "uuid-graph-id",
    "name": "Sample Analysis Network",
    "graphType": "NETWORK",
    "nodeCount": 0,
    "edgeCount": 0,
    "createdAt": "2024-02-12T10:30:00Z"
  }
}
```

#### Get Graph

**GET** `/api/graphs/:id`

**Response (200 OK):**

```json
{
  "success": true,
  "graph": {
    "id": "uuid-graph-id",
    "name": "Sample Analysis Network",
    "description": "Network graph of assay samples",
    "projectId": "uuid-project-id",
    "graphType": "NETWORK",
    "config": {
      "layout": "force-directed",
      "nodeSize": "dynamic"
    },
    "nodeCount": 150,
    "edgeCount": 200,
    "createdAt": "2024-02-12T10:30:00Z",
    "updatedAt": "2024-02-12T14:45:00Z"
  }
}
```

#### List Graphs

**GET** `/api/graphs`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| projectId | string | - | Filter by project |
| graphType | string | - | Filter by graph type |
| limit | number | 20 | Number of results |
| offset | number | 0 | Pagination offset |
| sortBy | string | "createdAt" | Sort field |
| sortOrder | string | "desc" | Sort direction |

**Response (200 OK):**

```json
{
  "success": true,
  "graphs": [
    {
      "id": "uuid-graph-id",
      "name": "Sample Analysis Network",
      "graphType": "NETWORK",
      "nodeCount": 150,
      "edgeCount": 200,
      "updatedAt": "2024-02-12T14:45:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Update Graph

**PUT** `/api/graphs/:id`

**Request Body:**

```json
{
  "name": "Updated Graph Name",
  "description": "Updated description",
  "config": {
    "layout": "hierarchical",
    "nodeSize": 20,
    "showLabels": false
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "graph": {
    "id": "uuid-graph-id",
    "name": "Updated Graph Name",
    "updatedAt": "2024-02-12T15:30:00Z"
  }
}
```

#### Delete Graph

**DELETE** `/api/graphs/:id`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Graph deleted successfully"
}
```

---

### Graph Nodes

#### Add Node

**POST** `/api/graphs/:id/nodes`

**Request Body:**

```json
{
  "nodeId": "SAMPLE-001",
  "nodeType": "SAMPLE",
  "label": "Sample 001",
  "properties": {
    "depth": 150.5,
    "assay_value": 2.45,
    "lithology": "andesite",
    "grade": "high"
  },
  "positionX": 100,
  "positionY": 200,
  "style": {
    "color": "#e94560",
    "size": 15,
    "shape": "circle"
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "node": {
    "id": "uuid-node-id",
    "nodeId": "SAMPLE-001",
    "nodeType": "SAMPLE",
    "label": "Sample 001",
    "properties": {
      "depth": 150.5,
      "assay_value": 2.45
    },
    "positionX": 100,
    "positionY": 200
  }
}
```

#### Bulk Add Nodes

**POST** `/api/graphs/:id/nodes/bulk`

**Request Body:**

```json
{
  "nodes": [
    {
      "nodeId": "SAMPLE-001",
      "nodeType": "SAMPLE",
      "label": "Sample 001",
      "properties": { "depth": 150.5 }
    },
    {
      "nodeId": "SAMPLE-002",
      "nodeType": "SAMPLE",
      "label": "Sample 002",
      "properties": { "depth": 200.0 }
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "created": 2,
  "errors": []
}
```

#### Get Nodes

**GET** `/api/graphs/:id/nodes`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| nodeType | string | Filter by node type |
| nodeIds | string | Comma-separated node IDs |
| limit | number | Max results (default: 100) |
| offset | number | Pagination offset |
| properties | string | JSON filter for properties |

**Example:**
```
GET /api/graphs/:id/nodes?nodeType=SAMPLE&limit=50
```

**Response (200 OK):**

```json
{
  "success": true,
  "nodes": [
    {
      "id": "uuid-node-id",
      "nodeId": "SAMPLE-001",
      "nodeType": "SAMPLE",
      "label": "Sample 001",
      "properties": {
        "depth": 150.5,
        "assay_value": 2.45,
        "lithology": "andesite"
      },
      "positionX": 100,
      "positionY": 200
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "offset": 0
  }
}
```

#### Update Node

**PUT** `/api/graphs/:id/nodes/:nodeId`

**Request Body:**

```json
{
  "label": "Updated Label",
  "properties": {
    "assay_value": 3.21
  },
  "positionX": 150,
  "positionY": 250,
  "style": {
    "color": "#667eea"
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "node": {
    "id": "uuid-node-id",
    "nodeId": "SAMPLE-001",
    "label": "Updated Label",
    "updatedAt": "2024-02-12T16:00:00Z"
  }
}
```

#### Delete Node

**DELETE** `/api/graphs/:id/nodes/:nodeId`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Node deleted successfully"
}
```

---

### Graph Edges

#### Add Edge

**POST** `/api/graphs/:id/edges`

**Request Body:**

```json
{
  "sourceNodeId": "uuid-source-node-id",
  "targetNodeId": "uuid-target-node-id",
  "edgeType": "ASSOCIATED",
  "weight": 0.85,
  "properties": {
    "correlation": 0.75,
    "distance": 50.2
  },
  "style": {
    "color": "#888888",
    "width": 2,
    "dashArray": "5,5"
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "edge": {
    "id": "uuid-edge-id",
    "sourceNodeId": "uuid-source-node-id",
    "targetNodeId": "uuid-target-node-id",
    "edgeType": "ASSOCIATED",
    "weight": 0.85,
    "createdAt": "2024-02-12T16:30:00Z"
  }
}
```

#### Bulk Add Edges

**POST** `/api/graphs/:id/edges/bulk`

**Request Body:**

```json
{
  "edges": [
    {
      "sourceNodeId": "node-1",
      "targetNodeId": "node-2",
      "edgeType": "PARENT_CHILD"
    },
    {
      "sourceNodeId": "node-2",
      "targetNodeId": "node-3",
      "edgeType": "PARENT_CHILD"
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "created": 2,
  "errors": []
}
```

#### Get Edges

**GET** `/api/graphs/:id/edges`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| edgeType | string | Filter by edge type |
| sourceNodeId | string | Filter by source node |
| targetNodeId | string | Filter by target node |
| minWeight | number | Minimum edge weight |
| limit | number | Max results |

**Response (200 OK):**

```json
{
  "success": true,
  "edges": [
    {
      "id": "uuid-edge-id",
      "sourceNodeId": "uuid-source",
      "targetNodeId": "uuid-target",
      "edgeType": "ASSOCIATED",
      "weight": 0.85,
      "properties": {
        "correlation": 0.75
      }
    }
  ],
  "pagination": {
    "total": 200,
    "limit": 100,
    "offset": 0
  }
}
```

#### Update Edge

**PUT** `/api/graphs/:id/edges/:edgeId`

**Request Body:**

```json
{
  "weight": 0.92,
  "properties": {
    "correlation": 0.92
  },
  "style": {
    "color": "#e94560",
    "width": 3
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "edge": {
    "id": "uuid-edge-id",
    "weight": 0.92,
    "updatedAt": "2024-02-12T17:00:00Z"
  }
}
```

#### Delete Edge

**DELETE** `/api/graphs/:id/edges/:edgeId`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Edge deleted successfully"
}
```

---

## Property Endpoints

### Property Types

Properties are flexible key-value pairs attached to nodes and edges.

#### Property Types Reference

| Type | Description | Example |
|------|-------------|---------|
| string | Text values | "lithology": "granite" |
| number | Numeric values | "assay_value": 2.45 |
| boolean | True/false | "is_outlier": true |
| date | ISO date | "sampled_at": "2024-01-15" |
| array | Array of values | "elements": ["Au", "Ag"] |
| object | Nested object | "location": { "lat": -25.5, "lon": 135.2 } |

### Get Node Properties

**GET** `/api/graphs/:id/nodes/:nodeId/properties`

**Response (200 OK):**

```json
{
  "success": true,
  "properties": {
    "depth": 150.5,
    "assay_value": 2.45,
    "lithology": "andesite",
    "sampled_at": "2024-01-15T10:30:00Z",
    "elements": ["Au", "Cu", "Ag"]
  }
}
```

### Update Node Properties

**PUT** `/api/graphs/:id/nodes/:nodeId/properties`

**Request Body:**

```json
{
  "properties": {
    "assay_value": 3.21,
    "notes": "Reanalyzed sample"
  },
  "mode": "merge" // or "replace"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "properties": {
    "depth": 150.5,
    "assay_value": 3.21,
    "lithology": "andesite",
    "notes": "Reanalyzed sample"
  }
}
```

### Bulk Property Update

**POST** `/api/graphs/:id/properties/bulk`

**Request Body:**

```json
{
  "updates": [
    {
      "nodeId": "node-1",
      "properties": { "grade": "high" }
    },
    {
      "nodeId": "node-2",
      "properties": { "grade": "medium" }
    }
  ],
  "mode": "merge"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "updated": 2
}
```

### Property Search

**GET** `/api/graphs/:id/properties/search`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| query | string | Search query |
| properties | string | Comma-separated properties |
| nodeTypes | string | Filter by node types |
| limit | number | Max results |

**Example:**
```
GET /api/graphs/:id/properties/search?query=high+grade&properties=grade,lithology&nodeTypes=SAMPLE
```

**Response (200 OK):**

```json
{
  "success": true,
  "results": [
    {
      "nodeId": "SAMPLE-001",
      "nodeType": "SAMPLE",
      "label": "Sample 001",
      "matchedProperties": {
        "grade": "high"
      },
      "score": 0.95
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Graph Traversal Endpoints

### Get Connected Nodes

**GET** `/api/graphs/:id/nodes/:nodeId/connected`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| direction | string | "both" | "in", "out", or "both" |
| edgeType | string | - | Filter by edge type |
| depth | number | 1 | Traversal depth |
| includeEdges | boolean | false | Include edge data |

**Response (200 OK):**

```json
{
  "success": true,
  "nodes": [
    {
      "nodeId": "SAMPLE-002",
      "edgeType": "ASSOCIATED",
      "distance": 1
    },
    {
      "nodeId": "SAMPLE-003",
      "edgeType": "ASSOCIATED",
      "distance": 2
    }
  ],
  "edges": [
    {
      "sourceNodeId": "SAMPLE-001",
      "targetNodeId": "SAMPLE-002",
      "edgeType": "ASSOCIATED"
    }
  ]
}
```

### Get Shortest Path

**GET** `/api/graphs/:id/path`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| source | string | Source node ID |
| target | string | Target node ID |
| algorithm | string | "dijkstra" or "bfs" |

**Response (200 OK):**

```json
{
  "success": true,
  "path": {
    "nodes": ["SAMPLE-001", "SAMPLE-005", "SAMPLE-010"],
    "edges": ["edge-1", "edge-2"],
    "totalWeight": 1.5,
    "length": 2
  }
}
```

### Get Subgraph

**POST** `/api/graphs/:id/subgraph`

**Request Body:**

```json
{
  "nodeIds": ["node-1", "node-2", "node-3"],
  "includeEdges": true,
  "includeProperties": true
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "subgraph": {
    "nodes": [...],
    "edges": [...],
    "nodeCount": 3,
    "edgeCount": 2
  }
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "nodeType",
      "reason": "Must be a valid NodeType enum value"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid input |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| CONFLICT | 409 | Resource conflict |
| INTERNAL_ERROR | 500 | Server error |

---

*Document Version: 1.0*
*Last Updated: 2024-02-12*
