# Multi-Viewport & Cross-Domain Linking Architecture

## Overview

insight-ui-webgl supports multiple viewports on a single page, each rendering different data domains (equities, graphs, networks). Viewports communicate via events — a click in one viewport can highlight, filter, or navigate in another.

This document describes how to compose viewports, link entities across domains, and build multi-exchange or graph+equity dashboards.

---

## 1. Multi-Viewport Layout

Each viewport is an independent `{% webgl_viewport %}` component with its own Scene3D, camera, and data channel.

### Example: Dual Exchange Dashboard

```html
{% load insight_webgl_tags %}

<div class="viewport-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">

    {% webgl_viewport id="nyse" channel="equity.nyse" title="NYSE" %}
    {% webgl_viewport id="xetra" channel="equity.xetra" title="XETRA" %}

</div>
```

Each viewport:
- Has its own `<canvas>` element
- Subscribes to a different SSE channel (`equity.nyse`, `equity.xetra`)
- Manages its own StreamingNodes, Annotations, RiskLinks
- Can be independently rotated, zoomed, paused

### Example: Equity + Graph Side-by-Side

```html
<div class="viewport-grid" style="display: grid; grid-template-columns: 2fr 1fr;">

    {% webgl_viewport id="equity" channel="equity" mode="streaming" %}
    {% webgl_graph id="supply-chain" channel="ontology" mode="force-directed" %}

</div>
```

---

## 2. Viewport Types

| Type | Component | Data | Rendering |
|------|-----------|------|-----------|
| **Streaming Chart** | `webgl_viewport` | price_tick events | InstancedMesh spheres on time/price/lane axes |
| **Graph** | `webgl_graph` | OntologyNode + OntologyEdge | Force-directed or hierarchical node/edge layout |
| **Network** | `webgl_network` | Connection events | Topology map with animated data flow |
| **Scatter 3D** | `webgl_scatter` | Data points | 3D scatter plot with axes and clustering |

All types share the same base infrastructure:
- Scene3D (renderer, camera, controls, lights)
- Event system (SSE → queue → handlers)
- Overlay system (annotations, links)
- insight-ui-webgl JS class pattern (WeakMap, initAll, destroy)

---

## 3. Cross-Viewport Communication

Viewports communicate through **DOM custom events** — no direct JS references between components.

### Event Flow

```
User clicks "SAP" in Graph viewport
    │
    ▼
Graph JS dispatches: document.dispatchEvent(
    new CustomEvent("webgl:entity-focus", {
        detail: { entity: "SAP", source: "supply-chain" }
    })
)
    │
    ▼
Equity viewport JS listens:
    document.addEventListener("webgl:entity-focus", (e) => {
        nodes.highlightEntity(e.detail.entity);
    })
    │
    ▼
SAP lane highlights in the equity chart
```

### Standard Events

| Event | Payload | Description |
|-------|---------|-------------|
| `webgl:entity-focus` | `{ entity, source }` | Highlight entity across all viewports |
| `webgl:entity-blur` | `{ entity, source }` | Remove highlight |
| `webgl:entity-select` | `{ entity, source }` | Select entity (persistent, triggers detail panel) |
| `webgl:time-sync` | `{ tick, timestamp, source }` | Synchronize time position across viewports |
| `webgl:camera-sync` | `{ position, target, source }` | Synchronize camera (optional, for linked views) |
| `webgl:filter-changed` | `{ filters, source }` | Apply filter across viewports |

### htmx Bridge

WebGL events can trigger htmx swaps for HTML panels:

```javascript
// In the viewport JS class
document.dispatchEvent(new CustomEvent("webgl:entity-select", {
    detail: { entity: "SAP" }
}));

// htmx listens and swaps the detail panel
// <div hx-trigger="webgl:entity-select from:document"
//      hx-get="/api/entity/detail/"
//      hx-vals="js:{entity: event.detail.entity}"
//      hx-target="#entity-detail">
```

---

## 4. Entity Linking

Entities can exist in multiple domains simultaneously:

```
Entity "SAP"
├── Equity viewport (XETRA): price lane with streaming ticks
├── Graph viewport: node in supply chain graph
├── Ontology viewport: node in industry classification
└── HTML sidebar: detail card with fundamentals
```

### Linking Model

```python
# Already exists in onto-3dwiz:
class OntologyNode(models.Model):
    entity_id = models.CharField(unique=True)  # "SAP"
    name = models.CharField()
    node_type = models.CharField()  # "entity", "exchange", "sector"
    tags = models.JSONField(default=dict)

class OntologyEdge(models.Model):
    source = models.ForeignKey(OntologyNode, related_name="edges_out")
    target = models.ForeignKey(OntologyNode, related_name="edges_in")
    edge_type = models.CharField()  # "supply", "credit", "sector"
    weight = models.FloatField(default=1.0)
    metadata = models.JSONField(default=dict)
```

The `entity_id` is the key that links across all viewports. When "SAP" is focused in the graph, the equity viewport finds the SAP lane by `entity_id`.

### Cross-Viewport Links (Visual)

Lines connecting entities across viewports use **HTML overlay** (not WebGL), because they span multiple canvases:

```
┌─ Canvas 1 ─────────┐     ┌─ Canvas 2 ─────────┐
│ ACME ●──────────    │     │    ●──ACME node     │
│               │     │     │   ╱                  │
│               │     │     │  ╱                   │
└───────────────┼─────┘     └─╱────────────────────┘
                │              │
                └──── HTML SVG overlay line ────┘
```

Implementation: An absolutely-positioned SVG element covers both canvases. JS computes screen-space positions of linked entities and draws SVG lines between them.

---

## 5. Channel Architecture for Multi-Exchange

```
EventStore
├── channel: equity.nyse     → NYSE Viewport subscribes via SSE
├── channel: equity.xetra    → XETRA Viewport subscribes via SSE
├── channel: equity.lse      → LSE Viewport subscribes via SSE
├── channel: news            → All viewports + News Feed panel
├── channel: risk            → Cross-exchange risk links
├── channel: ontology        → Graph viewport
└── channel: analytics       → Correlation heatmap, aggregations
```

Each viewport's SSE connection filters by channel:
```
GET /api/events/sse/?channel=equity.nyse
GET /api/events/sse/?channel=equity.xetra
```

### Ingest Sources per Exchange

```
WebSocket (NYSE feed)  → ingest_ws --channel=equity.nyse  → EventStore
WebSocket (XETRA feed) → ingest_ws --channel=equity.xetra → EventStore
MQ (aggregated news)   → ingest_mq --channel=news         → EventStore
```

---

## 6. Graph Rendering

The `webgl_graph` component renders OntologyNode/OntologyEdge as a 3D force-directed graph.

### Atom Decomposition

| Atom | Description |
|------|-------------|
| `webgl_graph_node` | Single node (InstancedMesh sphere, labeled) |
| `webgl_graph_edge` | Single edge (Line between nodes) |
| `webgl_graph_layout` | Force-directed layout algorithm (d3-force-3d or custom) |
| `webgl_graph_picker` | Raycaster for node click/hover detection |

### Molecule

| Molecule | Components |
|----------|-----------|
| `webgl_graph` | viewport + nodes + edges + layout + picker |

### Data Flow

```
Django OntologyNode/Edge API
    │
    ▼
GET /api/ontology/nodes/    → { nodes: [...] }
GET /api/ontology/edges/    → { edges: [...] }
    │
    ▼
webgl_graph JS class
    ├── Creates InstancedMesh for all nodes
    ├── Creates Lines for all edges
    ├── Runs force-directed layout (iterative, per frame)
    └── Raycaster detects hover/click → dispatches webgl:entity-focus
```

---

## 7. Composition Examples

### Financial Dashboard (onto-3dwiz evolved)

```html
<div class="dashboard-grid">
    <!-- Main chart: streaming prices -->
    {% webgl_viewport id="main" channel="equity" %}

    <!-- Supply chain graph -->
    {% webgl_graph id="supply" channel="ontology" filter="edge_type=supply" %}

    <!-- HTML panels -->
    {% news_feed channel="news" max_items="20" %}
    {% equity_legend viewport="main" %}
    {% entity_detail id="detail" %}
</div>
```

### Multi-Exchange Comparison

```html
<div class="exchange-grid" style="display: grid; grid-template-columns: repeat(3, 1fr);">
    {% webgl_viewport id="nyse" channel="equity.nyse" title="NYSE" %}
    {% webgl_viewport id="xetra" channel="equity.xetra" title="XETRA" %}
    {% webgl_viewport id="lse" channel="equity.lse" title="LSE" %}
</div>

<!-- Cross-exchange risk overlay (HTML SVG) -->
{% cross_viewport_links source="nyse" target="xetra" channel="risk" %}
```

### Ontology Explorer

```html
<div class="explorer-grid" style="display: grid; grid-template-columns: 2fr 1fr;">
    {% webgl_graph id="ontology" channel="ontology" layout="force-directed" %}

    <div class="detail-panels">
        {% node_detail id="node-detail" %}
        {% edge_list id="edge-list" %}
        {% path_finder source="" target="" %}
    </div>
</div>
```

---

## 8. Implementation Roadmap

### Phase 1: Single Viewport (done in onto-3dwiz)
- [x] StreamingNodes with sliding window
- [x] Annotations and RiskLinks
- [x] SSE event pipeline
- [x] HTML controls (layers, toggles, threshold)

### Phase 2: Extract to insight-ui-webgl
- [ ] Extract viewport as reusable Django template tag
- [ ] Extract HTML panels as template tags
- [ ] JS classes follow WeakMap/initAll pattern
- [ ] Design token integration with insight-ui

### Phase 3: Graph Renderer
- [ ] webgl_graph component with force-directed layout
- [ ] Node/edge rendering with InstancedMesh
- [ ] Raycaster for interaction
- [ ] API integration with OntologyNode/Edge

### Phase 4: Multi-Viewport
- [ ] Multiple viewports on one page
- [ ] Cross-viewport event communication
- [ ] Entity linking via entity_id
- [ ] HTML SVG overlay for cross-canvas links

### Phase 5: Multi-Exchange
- [ ] Channel namespacing (equity.nyse, equity.xetra)
- [ ] Per-viewport SSE channel subscription
- [ ] Cross-exchange risk visualization
- [ ] Time synchronization across viewports
