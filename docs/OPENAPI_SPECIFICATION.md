# GeoMetrics OpenAPI Specification

## Overview

This document provides the OpenAPI 3.0 specification for the GeoMetrics REST API, covering data operations, graph endpoints, and administrative functions.

## API Documentation

```yaml
openapi: 3.0.3
info:
  title: GeoMetrics API
  description: |
    GeoMetrics is a geospatial metrics platform for drilling operations analysis.
    This API provides endpoints for managing datasets, graphs, and visualization data.
  version: 1.0.0
  contact:
    name: GeoMetrics Support
    email: support@geometrics.example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.geometrics.example.com/v1
    description: Production server
  - url: http://localhost:3001
    description: Development server

tags:
  - name: Health
    description: System health and status endpoints
  - name: Datasets
    description: Dataset upload and management
  - name: Graphs
    description: Graph data operations
  - name: Projects
    description: Project management
  - name: Users
    description: User management

paths:
  /health:
    get:
      tags:
        - Health
      summary: Health check
      description: Returns the current system status
      operationId: getHealth
      responses:
        '200':
          description: System is healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'
              example:
                status: ok
                timestamp: 2024-02-12T10:30:00Z
                version: 1.0.0

  /api/datasets:
    get:
      tags:
        - Datasets
      summary: List datasets
      description: Returns a list of all available datasets
      operationId: listDatasets
      parameters:
        - name: projectId
          in: query
          schema:
            type: string
          description: Filter by project ID
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, mapping, ready, processing, error]
          description: Filter by status
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
          description: Maximum number of results
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
          description: Pagination offset
      responses:
        '200':
          description: List of datasets
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DatasetListResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      tags:
        - Datasets
      summary: Upload dataset
      description: |
        Upload a CSV file to create a new dataset.
        Supports files up to 100MB.
      operationId: uploadDataset
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - file
              properties:
                file:
                  type: string
                  format: binary
                  description: CSV file to upload
                projectId:
                  type: string
                  description: Optional project ID to associate
      responses:
        '201':
          description: Dataset created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DatasetUploadResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '413':
          $ref: '#/components/responses/PayloadTooLarge'

  /api/datasets/{id}:
    get:
      tags:
        - Datasets
      summary: Get dataset details
      operationId: getDataset
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: Dataset ID
      responses:
        '200':
          description: Dataset details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Dataset'
        '404':
          $ref: '#/components/responses/NotFound'
        '401':
          $ref: '#/components/responses/Unauthorized'

    put:
      tags:
        - Datasets
      summary: Update dataset
      operationId: updateDataset
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: Dataset ID
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DatasetUpdate'
      responses:
        '200':
          description: Dataset updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Dataset'
        '400':
          $ref: '#/components/responses/BadRequest'
        '404':
          $ref: '#/components/responses/NotFound'

    delete:
      tags:
        - Datasets
      summary: Delete dataset
      operationId: deleteDataset
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: Dataset ID
      responses:
        '200':
          description: Dataset deleted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeleteResponse'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/datasets/{id}/mappings:
    post:
      tags:
        - Datasets
      summary: Save column mappings
      description: |
        Map source CSV columns to target fields.
        This is required before a dataset can be used.
      operationId: saveColumnMappings
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: Dataset ID
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required:
                - mappings
              properties:
                mappings:
                  type: array
                  items:
                    $ref: '#/components/schemas/ColumnMapping'
      responses:
        '200':
          description: Mappings saved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SaveMappingsResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/datasets/{id}/data:
    get:
      tags:
        - Datasets
      summary: Get dataset data
      description: Returns paginated data rows from the dataset
      operationId: getDatasetData
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: Dataset ID
        - name: limit
          in: query
          schema:
            type: integer
            default: 100
            maximum: 1000
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
        - name: columns
          in: query
          schema:
            type: string
          description: Comma-separated list of columns to return
      responses:
        '200':
          description: Data rows
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DatasetDataResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/graphs:
    get:
      tags:
        - Graphs
      summary: List graphs
      operationId: listGraphs
      parameters:
        - name: projectId
          in: query
          schema:
            type: string
        - name: graphType
          in: query
          schema:
            type: string
            enum: [DATA_TREE, NETWORK, HIERARCHY, SCATTER, PARALLEL_COORDS]
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: List of graphs
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GraphListResponse'

    post:
      tags:
        - Graphs
      summary: Create graph
      operationId: createGraph
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GraphCreate'
      responses:
        '201':
          description: Graph created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Graph'

  /api/graphs/{id}:
    get:
      tags:
        - Graphs
      summary: Get graph details
      operationId: getGraph
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Graph details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Graph'
        '404':
          $ref: '#/components/responses/NotFound'

    put:
      tags:
        - Graphs
      summary: Update graph
      operationId: updateGraph
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GraphUpdate'
      responses:
        '200':
          description: Graph updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Graph'

    delete:
      tags:
        - Graphs
      summary: Delete graph
      operationId: deleteGraph
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Graph deleted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeleteResponse'

  /api/graphs/{id}/nodes:
    get:
      tags:
        - Graphs
      summary: List graph nodes
      operationId: listGraphNodes
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: nodeType
          in: query
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 100
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: List of nodes
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NodeListResponse'

    post:
      tags:
        - Graphs
      summary: Add node to graph
      operationId: addGraphNode
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NodeCreate'
      responses:
        '201':
          description: Node created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Node'

  /api/graphs/{id}/nodes/{nodeId}:
    get:
      tags:
        - Graphs
      summary: Get node details
      operationId: getGraphNode
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: nodeId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Node details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Node'
        '404':
          $ref: '#/components/responses/NotFound'

    put:
      tags:
        - Graphs
      summary: Update node
      operationId: updateGraphNode
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: nodeId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NodeUpdate'
      responses:
        '200':
          description: Node updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Node'

    delete:
      tags:
        - Graphs
      summary: Delete node
      operationId: deleteGraphNode
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: nodeId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Node deleted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeleteResponse'

  /api/graphs/{id}/edges:
    get:
      tags:
        - Graphs
      summary: List graph edges
      operationId: listGraphEdges
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: edgeType
          in: query
          schema:
            type: string
        - name: sourceNodeId
          in: query
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 100
      responses:
        '200':
          description: List of edges
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EdgeListResponse'

    post:
      tags:
        - Graphs
      summary: Add edge to graph
      operationId: addGraphEdge
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EdgeCreate'
      responses:
        '201':
          description: Edge created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Edge'

  /api/graphs/{id}/edges/{edgeId}:
    put:
      tags:
        - Graphs
      summary: Update edge
      operationId: updateGraphEdge
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: edgeId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EdgeUpdate'
      responses:
        '200':
          description: Edge updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Edge'

    delete:
      tags:
        - Graphs
      summary: Delete edge
      operationId: deleteGraphEdge
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: edgeId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Edge deleted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeleteResponse'

components:
  schemas:
    HealthResponse:
      type: object
      properties:
        status:
          type: string
          example: ok
        timestamp:
          type: string
          format: date-time
        version:
          type: string
          example: 1.0.0

    Dataset:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        filename:
          type: string
        filePath:
          type: string
        rowCount:
          type: integer
        columnCount:
          type: integer
        status:
          type: string
          enum: [pending, mapping, ready, processing, error]
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    DatasetListResponse:
      type: object
      properties:
        datasets:
          type: array
          items:
            $ref: '#/components/schemas/Dataset'
        pagination:
          type: object
          properties:
            total:
              type: integer
            limit:
              type: integer
            offset:
              type: integer
            hasMore:
              type: boolean

    DatasetUploadResponse:
      type: object
      properties:
        success:
          type: boolean
        dataset:
          type: object
          properties:
            id:
              type: string
            name:
              type: string
            rowCount:
              type: integer
            columnCount:
              type: integer
            columns:
              type: array
              items:
                type: string

    DatasetUpdate:
      type: object
      properties:
        name:
          type: string
        status:
          type: string
          enum: [pending, mapping, ready, processing, error]

    ColumnMapping:
      type: object
      properties:
        sourceColumn:
          type: string
        targetField:
          type: string
        dataType:
          type: string
          enum: [STRING, NUMBER, INTEGER, FLOAT, BOOLEAN, DATE, DATETIME, COORDINATE_LAT, COORDINATE_LON, ELEVATION, DEPTH, ASSAY_VALUE]

    Graph:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        projectId:
          type: string
        graphType:
          type: string
          enum: [DATA_TREE, NETWORK, HIERARCHY, SCATTER, PARALLEL_COORDS]
        nodeCount:
          type: integer
        edgeCount:
          type: integer
        config:
          type: object
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    GraphListResponse:
      type: object
      properties:
        graphs:
          type: array
          items:
            $ref: '#/components/schemas/Graph'
        pagination:
          $ref: '#/components/schemas/Pagination'

    GraphCreate:
      type: object
      required:
        - name
        - graphType
      properties:
        name:
          type: string
        description:
          type: string
        projectId:
          type: string
        graphType:
          type: string
          enum: [DATA_TREE, NETWORK, HIERARCHY, SCATTER, PARALLEL_COORDS]
        config:
          type: object

    GraphUpdate:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        config:
          type: object

    Node:
      type: object
      properties:
        id:
          type: string
          format: uuid
        nodeId:
          type: string
        nodeType:
          type: string
          enum: [SAMPLE, WELL, INTERVAL, LITHOLOGY, STRUCTURE, ASSAY, CUSTOM]
        label:
          type: string
        properties:
          type: object
        positionX:
          type: number
        positionY:
          type: number
        style:
          type: object

    NodeCreate:
      type: object
      required:
        - nodeId
        - nodeType
        - label
      properties:
        nodeId:
          type: string
        nodeType:
          type: string
          enum: [SAMPLE, WELL, INTERVAL, LITHOLOGY, STRUCTURE, ASSAY, CUSTOM]
        label:
          type: string
        properties:
          type: object
        positionX:
          type: number
        positionY:
          type: number
        style:
          type: object

    NodeUpdate:
      type: object
      properties:
        label:
          type: string
        properties:
          type: object
        positionX:
          type: number
        positionY:
          type: number
        style:
          type: object

    NodeListResponse:
      type: object
      properties:
        nodes:
          type: array
          items:
            $ref: '#/components/schemas/Node'
        pagination:
          $ref: '#/components/schemas/Pagination'

    Edge:
      type: object
      properties:
        id:
          type: string
          format: uuid
        sourceNodeId:
          type: string
        targetNodeId:
          type: string
        edgeType:
          type: string
          enum: [PARENT_CHILD, ASSOCIATED, SEQUENTIAL, DEPENDENT, SIMILARITY, CUSTOM]
        weight:
          type: number
        properties:
          type: object
        style:
          type: object

    EdgeCreate:
      type: object
      required:
        - sourceNodeId
        - targetNodeId
        - edgeType
      properties:
        sourceNodeId:
          type: string
        targetNodeId:
          type: string
        edgeType:
          type: string
          enum: [PARENT_CHILD, ASSOCIATED, SEQUENTIAL, DEPENDENT, SIMILARITY, CUSTOM]
        weight:
          type: number
        properties:
          type: object
        style:
          type: object

    EdgeUpdate:
      type: object
      properties:
        edgeType:
          type: string
        weight:
          type: number
        properties:
          type: object
        style:
          type: object

    EdgeListResponse:
      type: object
      properties:
        edges:
          type: array
          items:
            $ref: '#/components/schemas/Edge'
        pagination:
          $ref: '#/components/schemas/Pagination'

    DeleteResponse:
      type: object
      properties:
        success:
          type: boolean
        message:
          type: string
          example: Resource deleted successfully

    SaveMappingsResponse:
      type: object
      properties:
        success:
          type: boolean
        mappingsCount:
          type: integer

    DatasetDataResponse:
      type: object
      properties:
        data:
          type: array
          items:
            type: object
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      properties:
        total:
          type: integer
        limit:
          type: integer
        offset:
          type: integer
        hasMore:
          type: boolean

  responses:
    BadRequest:
      description: Invalid request
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    example: VALIDATION_ERROR
                  message:
                    type: string
                  details:
                    type: object

    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    example: UNAUTHORIZED
                  message:
                    type: string
                    example: Invalid or missing authentication token

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    example: NOT_FOUND
                  message:
                    type: string
                    example: Resource not found

    PayloadTooLarge:
      description: File too large
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    example: PAYLOAD_TOO_LARGE
                  message:
                    type: string
                    example: File size exceeds maximum limit of 100MB

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

---

## API Authentication

### Authentication Header

All API requests require authentication using a Bearer token:

```
Authorization: Bearer <token>
```

### Obtaining a Token

Tokens are obtained via the authentication endpoints:

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-02-12T18:30:00Z"
}
```

### Token Refresh

```bash
POST /api/auth/refresh
Authorization: Bearer <expired_token>

{
  "token": "new_refreshed_token"
}
```

---

## Rate Limiting

| Plan | Requests/minute | Requests/hour |
|------|-----------------|---------------|
| Free | 60 | 1,000 |
| Pro | 300 | 10,000 |
| Enterprise | 1,000 | 50,000 |

Rate limit headers included in responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1649923200
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request data |
| UNAUTHORIZED | 401 | Invalid or missing token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

*Document Version: 1.0*
*Last Updated: 2024-02-12*
