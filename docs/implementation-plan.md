# Implementation Plan: insight-ui-webgl

> Compact execution plan. For detailed API specifications see [component-architecture.md](component-architecture.md).
> For multi-viewport and cross-domain linking see [multi-viewport-architecture.md](multi-viewport-architecture.md).

---

## Context

onto-3dwiz v0.2.0 has a working 3D streaming equity visualization with ~400 lines of monolithic `app.js`.
The goal is to extract generic WebGL + HTML capabilities into **insight-ui-webgl** -- a sibling Django library
to insight-ui -- following the exact same 4-part component pattern. Domain-specific code (equity, news, risk)
stays in the onto-3dwiz example; generic visualization code moves to the library.

---

## Component Inventory (20 components)

### WebGL Atoms (6) -- phantom div pattern

| # | Component | JS Class | Extracts from |
|---|-----------|----------|---------------|
| 1 | `webgl_viewport` | `WebGLViewport` | `scene.js` |
| 2 | `webgl_axis` | `WebGLAxis` | `scene.js` (inline) |
| 3 | `webgl_grid` | `WebGLGrid` | New |
| 4 | `webgl_overlay_text` | `WebGLOverlayText` | `annotations.js` |
| 5 | `webgl_overlay_link` | `WebGLOverlayLink` | `links.js` |
| 6 | `webgl_threshold_plane` | `WebGLThresholdPlane` | `threshold.js` |

### HTML Atoms (3)

| # | Component | JS Class |
|---|-----------|----------|
| 7 | `stream_status` | `StreamStatus` |
| 8 | `data_badge` | `DataBadge` |
| 9 | `data_item` | `DataItem` |

### Molecules (6)

| # | Component | JS Class | Composes |
|---|-----------|----------|----------|
| 10 | `webgl_streaming_chart` | `WebGLStreamingChart` | viewport + axis + grid + StreamingNodes |
| 11 | `webgl_overlay_panel` | `WebGLOverlayPanel` | overlay_text + overlay_link |
| 12 | `data_feed` | `DataFeed` | data_item container + htmx |
| 13 | `entity_legend` | `EntityLegend` | data_badge container |
| 14 | `playback_controls` | `PlaybackControls` | play/pause/step/speed |
| 15 | `layer_controls` | `LayerControls` | checkbox toggles |

### Event System (4) -- phantom div pattern

| # | Component | JS Class | Extracts from |
|---|-----------|----------|---------------|
| 16 | `event_queue` | `InsightEventQueue` | `queue.js` |
| 17 | `event_registry` | `InsightEventRegistry` | `registry.js` |
| 18 | `sse_transport` | `InsightSSETransport` | `transport.js` |
| 19 | `ws_transport` | `InsightWSTransport` | New (htmx ws bridge) |

### Infrastructure (1)

| # | Component | Purpose |
|---|-----------|---------|
| 20 | `insight-webgl-init.js` | Master init + `window.InsightWebGL` |

---

## Implementation Phases

### Phase 1: Foundation
- [ ] `pyproject.toml`, `apps.py`, `__init__.py`, `templatetags/__init__.py`
- [ ] `webgl_viewport` (template tag + HTML + JS + init)
- [ ] `webgl_axis`, `webgl_grid`
- [ ] `insight-webgl-init.js` scaffold

### Phase 2: WebGL Overlays
- [ ] `webgl_overlay_text` (from annotations.js)
- [ ] `webgl_overlay_link` (from links.js)
- [ ] `webgl_threshold_plane` (from threshold.js)

### Phase 3: Event System
- [ ] `event_queue` (from queue.js)
- [ ] `event_registry` (from registry.js)
- [ ] `sse_transport` (from transport.js)
- [ ] `ws_transport` (new, htmx ws bridge)

### Phase 4: HTML Atoms
- [ ] `stream_status`
- [ ] `data_badge`
- [ ] `data_item`

### Phase 5: Molecules
- [ ] `webgl_streaming_chart` (viewport + axis + StreamingNodes)
- [ ] `webgl_overlay_panel` (overlay_text + overlay_link)
- [ ] `data_feed` (htmx-driven)
- [ ] `entity_legend` (auto-growing badges)
- [ ] `playback_controls`
- [ ] `layer_controls`

### Phase 6: Example Migration
- [ ] Rewrite onto-3dwiz template with insight-ui-webgl tags
- [ ] Replace app.js with ~50 line domain handler script
- [ ] Smoke tests (playwright)
- [ ] Regression: visual parity with v0.2.0

---

## Verification

| Test Type | Scope | Tool |
|-----------|-------|------|
| Template tag unit tests | Each tag renders correct data-attributes | pytest-django |
| JS class unit tests | WeakMap, initAll, destroy, event dispatch | jsdom or playwright |
| Smoke test | Canvas renders, SSE connects, entities appear | playwright |
| Regression | onto-3dwiz example identical to v0.2.0 | playwright screenshot diff |

---

## Decisions

| Decision | Choice |
|----------|--------|
| Three.js | Vendor in `static/vendor/`, app declares importmap |
| insight-ui | Python dependency in pyproject.toml |
| Naming | `insight_ui_webgl` |
| CDN | Cloudflare only |
| JS format | ES modules with importmap |
