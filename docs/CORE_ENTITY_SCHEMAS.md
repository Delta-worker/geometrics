# GeoMetrics Core Entity Schemas

## Overview

This document defines the core entity schemas for the GeoMetrics platform, including Users, Projects, Datasets, Graph Data structures, and spatial data types.

## Entity Relationship Overview

```
User ──┬── Project ──┬── Dataset ──┬── ColumnMapping
       │             │
       │             └── GraphData ──┬── GraphNode
       │                              └── GraphEdge
       │
       └── ProjectMember
```

---

## Core Entities

### User

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String?
  avatar        String?
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  projects      ProjectMember[]
  datasets      Dataset[]
  graphs        GraphData[]
  sessions      Session[]
}

enum UserRole {
  USER
  EDITOR
  ADMIN
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  token        String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Project

```prisma
model Project {
  id           String         @id @default(uuid())
  name         String
  description  String?
  crs          String         @default("EPSG:4326") // Coordinate Reference System
  ownerId      String
  isPublic     Boolean        @default(false)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  
  // Relations
  owner        User           @relation(fields: [ownerId], references: [id])
  members      ProjectMember[]
  datasets     Dataset[]
  graphs       GraphData[]
  versions     ProjectVersion[]
}

model ProjectMember {
  id        String      @id @default(uuid())
  projectId String
  userId    String
  role      MemberRole  @default(VIEWER)
  joinedAt  DateTime    @default(now())
  
  project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, userId])
}

enum MemberRole {
  VIEWER
  EDITOR
  ADMIN
}
```

### Dataset

```prisma
model Dataset {
  id             String          @id @default(uuid())
  name           String
  filename       String
  filePath       String
  rowCount       Int
  columnCount    Int
  status         DatasetStatus   @default(PENDING)
  projectId      String?
  uploaderId     String
  metadata       Json?           // Additional metadata (source, date, etc.)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  
  // Relations
  project        Project?        @relation(fields: [projectId], references: [id], onDelete: SetNull)
  uploader       User            @relation(fields: [uploaderId], references: [id])
  columnMappings ColumnMapping[]
  versions       DatasetVersion[]
}

enum DatasetStatus {
  PENDING
  MAPPING
  READY
  PROCESSING
  ERROR
}
```

### ColumnMapping

```prisma
model ColumnMapping {
  id           String     @id @default(uuid())
  datasetId    String
  sourceColumn String
  targetField  String
  dataType     DataType   @default(STRING)
  isRequired   Boolean    @default(false)
  defaultValue Json?
  validation   Json?     // Validation rules
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  dataset      Dataset    @relation(fields: [datasetId], references: [id], onDelete: Cascade)
}

enum DataType {
  STRING
  NUMBER
  INTEGER
  FLOAT
  BOOLEAN
  DATE
  DATETIME
  COORDINATE_LAT
  COORDINATE_LON
  ELEVATION
  DEPTH
  ASSAY_VALUE
}
```

---

## Graph Data Entities

### GraphData

```prisma
model GraphData {
  id           String       @id @default(uuid())
  name         String
  description  String?
  projectId    String?
  ownerId      String
  graphType    GraphType
  config       Json?        // Visualization configuration
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  
  // Relations
  project      Project?     @relation(fields: [projectId], references: [id], onDelete: SetNull)
  owner        User         @relation(fields: [ownerId], references: [id])
  nodes        GraphNode[]
  edges        GraphEdge[]
  versions     GraphVersion[]
}

enum GraphType {
  DATA_TREE
  NETWORK
  HIERARCHY
  SCATTER
  PARALLEL_COORDS
}
```

### GraphNode

```prisma
model GraphNode {
  id          String    @id @default(uuid())
  graphId     String
  nodeId      String    // External identifier (e.g., sample ID, well ID)
  nodeType    NodeType
  label       String
  properties  Json      // Flexible properties
  positionX   Float?
  positionY   Float?
  style       Json?     // Visual styling
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Relations
  graph       GraphData @relation(fields: [graphId], references: [id], onDelete: Cascade)
  outgoingEdges GraphEdge[] @relation("SourceNode")
  incomingEdges GraphEdge[] @relation("TargetNode")
  
  @@unique([graphId, nodeId])
}

enum NodeType {
  SAMPLE
  WELL
  INTERVAL
  LITHOLOGY
  STRUCTURE
  ASSAY
  CUSTOM
}
```

### GraphEdge

```prisma
model GraphEdge {
  id           String    @id @default(uuid())
  graphId      String
  sourceNodeId String
  targetNodeId String
  edgeType     EdgeType
  weight       Float?
  properties   Json?
  style        Json?     // Visual styling
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  // Relations
  graph        GraphData @relation(fields: [graphId], references: [id], onDelete: Cascade)
  sourceNode   GraphNode @relation("SourceNode", fields: [sourceNodeId], references: [id], onDelete: Cascade)
  targetNode   GraphNode @relation("TargetNode", fields: [targetNodeId], references: [id], onDelete: Cascade)
  
  @@unique([graphId, sourceNodeId, targetNodeId])
}

enum EdgeType {
  PARENT_CHILD
  ASSOCIATED
  SEQUENTIAL
  DEPENDENT
  SIMILARITY
  CUSTOM
}
```

---

## Version Tracking Entities

### ProjectVersion

```prisma
model ProjectVersion {
  id           String    @id @default(uuid())
  projectId    String
  version      Int
  snapshot     Json      // Complete project snapshot
  changelog    String?
  createdAt    DateTime  @default(now())
  createdBy    String
  
  project      Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, version])
}
```

### DatasetVersion

```prisma
model DatasetVersion {
  id           String    @id @default(uuid())
  datasetId    String
  version      Int
  rowCount     Int
  columnCount  Int
  snapshot     Json?     // Schema snapshot
  changes      Json?     // List of changes
  createdAt    DateTime  @default(now())
  createdBy    String
  
  dataset      Dataset   @relation(fields: [datasetId], references: [id], onDelete: Cascade)
  
  @@unique([datasetId, version])
}
```

### GraphVersion

```prisma
model GraphVersion {
  id           String    @id @default(uuid())
  graphId      String
  version      Int
  nodeCount    Int
  edgeCount    Int
  snapshot     Json?     // Graph structure snapshot
  changes      Json?     // Changes made
  createdAt    DateTime  @default(now())
  createdBy    String
  
  graph        GraphData @relation(fields: [graphId], references: [id], onDelete: Cascade)
  
  @@unique([graphId, version])
}
```

---

## Spatial Data Types

### SpatialData

While we use JSON for flexible storage, here are the standard spatial data types:

```typescript
// Coordinate Point
interface CoordinatePoint {
  latitude: number;  // Decimal degrees
  longitude: number; // Decimal degrees
  elevation?: number; // Meters (positive = above sea level)
  depth?: number;     // Meters (positive = below surface)
  srid: string;       // EPSG code, e.g., "EPSG:4326"
}

// Wellbore Trajectory
interface WellboreTrajectory {
  wellId: string;
  md: number[];       // Measured depth array
  tvd: number[];      // True vertical depth array
  inclination: number[];
  azimuth: number[];
  srid: string;
}

// Assay Value
interface AssayValue {
  sampleId: string;
  element: string;   // e.g., "Au", "Cu", "Fe"
  value: number;
  unit: string;      // e.g., "g/t", "%", "ppm"
  detectionLimit?: number;
  measurementMethod?: string;
}
```

---

## API Endpoints

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/members` | List project members |
| POST | `/api/projects/:id/members` | Add member |
| PUT | `/api/projects/:id/members/:userId` | Update member role |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |

### Datasets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/datasets` | List all datasets |
| POST | `/api/datasets` | Upload new dataset |
| GET | `/api/datasets/:id` | Get dataset details |
| PUT | `/api/datasets/:id` | Update dataset |
| DELETE | `/api/datasets/:id` | Delete dataset |
| POST | `/api/datasets/:id/mappings` | Save column mappings |
| GET | `/api/datasets/:id/versions` | List versions |
| POST | `/api/datasets/:id/versions` | Create version |

### Graphs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graphs` | List all graphs |
| POST | `/api/graphs` | Create new graph |
| GET | `/api/graphs/:id` | Get graph details |
| PUT | `/api/graphs/:id` | Update graph |
| DELETE | `/api/graphs/:id` | Delete graph |
| GET | `/api/graphs/:id/nodes` | List graph nodes |
| POST | `/api/graphs/:id/nodes` | Add node |
| PUT | `/api/graphs/:id/nodes/:nodeId` | Update node |
| DELETE | `/api/graphs/:id/nodes/:nodeId` | Delete node |
| GET | `/api/graphs/:id/edges` | List graph edges |
| POST | `/api/graphs/:id/edges` | Add edge |
| PUT | `/api/graphs/:id/edges/:edgeId` | Update edge |
| DELETE | `/api/graphs/:id/edges/:edgeId` | Delete edge |
| GET | `/api/graphs/:id/versions` | List versions |
| POST | `/api/graphs/:id/versions` | Create version |

---

## Relationships

### Data Tree Structure

The data tree follows a hierarchical structure:

```
Project
├── Datasets
│   ├── Assay Data
│   ├── Lithology Data
│   └── Trajectory Data
└── Graphs
    ├── Sample Network
    ├── Well Hierarchy
    └── Correlation Graph
```

### Selection Propagation

When a user selects a node in a graph:
1. The selection event is published to the event bus
2. All subscribed components receive the event
3. Related data is fetched and displayed
4. Selection state is maintained in the global store

---

*Document Version: 1.0*
*Last Updated: 2024-02-12*
