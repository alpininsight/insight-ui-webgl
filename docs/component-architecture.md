# insight-ui-webgl Component Architecture

> Detailed API specification for all components. Generated 2026-04-04 from analysis of
> insight-ui (reference), onto-3dwiz v0.2.0 (working example), and the multi-viewport architecture doc.

---

## 1. Design Principles

1. **insight-ui is the foundation** -- don't fork, extend. Reuse design tokens, base layout, dark mode.
2. **4-part component anatomy** for every component: Template Tag, HTML Template, JS Class, Init Registration.
3. **Domain-agnostic** -- no equity/news/risk terminology in the library. Those are example-specific.
4. **Two rendering domains**: HTML (htmx-driven panels, controls) and WebGL (Three.js 3D scene).
5. **Custom DOM events** as the universal communication bus between all components.
6. **Phantom div pattern** for WebGL config: hidden `<div>` carries `data-*` attributes, JS creates Three.js objects.
7. **htmx for HTML content, JS for WebGL content** -- bridged by shared custom events.

---

## 2. Django App Structure

```
insight_ui_webgl/
  __init__.py
  apps.py                              # InsightUiWebglConfig
  config.py                            # CDN URLs, default settings
  templatetags/
    __init__.py
    insight_webgl_tags.py              # All template tags
  templates/insight_ui_webgl/components/
    # WebGL atoms (phantom divs -- config carriers for Three.js objects)
    viewport.html
    axis.html
    grid.html
    overlay_text.html
    overlay_link.html
    threshold_plane.html
    # HTML atoms (visible UI elements)
    stream_status.html
    data_badge.html
    data_item.html
    # Molecules (composed atoms)
    streaming_chart.html
    overlay_panel.html
    data_feed.html
    entity_legend.html
    playback_controls.html
    layer_controls.html
    # Event system (phantom divs)
    sse_transport.html
    ws_transport.html
    event_queue.html
    event_registry.html
  static/insight_ui_webgl/
    js/
      insight-webgl-init.js            # Master init + window.InsightWebGL
      insight-webgl-viewport.js
      insight-webgl-axis.js
      insight-webgl-grid.js
      insight-webgl-overlay-text.js
      insight-webgl-overlay-link.js
      insight-webgl-threshold-plane.js
      insight-webgl-stream-status.js
      insight-webgl-data-badge.js
      insight-webgl-data-item.js
      insight-webgl-streaming-chart.js
      insight-webgl-overlay-panel.js
      insight-webgl-data-feed.js
      insight-webgl-entity-legend.js
      insight-webgl-playback-controls.js
      insight-webgl-layer-controls.js
      insight-webgl-event-queue.js
      insight-webgl-event-registry.js
      insight-webgl-sse-transport.js
      insight-webgl-ws-transport.js
    vendor/
      three.module.min.js              # Three.js ESM bundle
      OrbitControls.js
```

---

## 3. JS Class Pattern (strict insight-ui compliance)

Every JS class follows this exact pattern, matching `insight-ui-accordion.js`:

```javascript
export class ComponentName {
    static instances = new WeakMap();

    constructor(element) {
        if (ComponentName.instances.has(element))
            return ComponentName.instances.get(element);

        this.element = element;
        // Read data-* attributes into this.config
        this.boundHandlers = [];
        this.bindEvents();
        element.__insightInstance = this;  // For lifecycle cleanup
        ComponentName.instances.set(element, this);
        debugLog("New ComponentName:", element);
    }

    bindEvents() {
        // Attach event listeners
        // Store references in this.boundHandlers for cleanup
    }

    destroy() {
        // Remove all event listeners
        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];
        ComponentName.instances.delete(this.element);
        delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-component-name]")
            .forEach(el => new ComponentName(el));
    }
}
```

Key details from insight-ui source:
- `__insightInstance` property on DOM element enables `InsightUI.lifecycle.registerHTMXHooks()` cleanup
- `static instances = new WeakMap()` prevents double-init when htmx re-swaps content
- `boundHandlers` array stores all listener references for clean teardown

---

## 4. WebGL Atom Components

### 4.1 `webgl_viewport` -- Canvas + Scene3D Wrapper

The foundation component. Every other WebGL component targets a viewport.

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/viewport.html")
def webgl_viewport(
    tag_id: str = "webgl-viewport",
    capacity: int = 500,
    max_entities: int = 20,
    camera_mode: str = "perspective",    # "perspective" | "orthographic"
    camera_position: str = "50,30,50",   # comma-separated x,y,z
    camera_target: str = "50,30,0",      # comma-separated x,y,z
    fov: int = 60,
    bg_color: str = "#1a1a2e",
    show_axes: bool = True,
    css_class: str = "",
) -> dict:
    return {
        "tag_id": tag_id, "capacity": capacity, "max_entities": max_entities,
        "camera_mode": camera_mode, "camera_position": camera_position,
        "camera_target": camera_target, "fov": fov, "bg_color": bg_color,
        "show_axes": show_axes, "css_class": css_class,
    }
```

**HTML template:**
```html
<div id="{{ tag_id }}-container" class="relative w-full h-full {{ css_class }}">
  <canvas
    id="{{ tag_id }}"
    data-webgl-viewport
    data-capacity="{{ capacity }}"
    data-max-entities="{{ max_entities }}"
    data-camera-mode="{{ camera_mode }}"
    data-camera-position="{{ camera_position }}"
    data-camera-target="{{ camera_target }}"
    data-fov="{{ fov }}"
    data-bg-color="{{ bg_color }}"
    data-show-axes="{{ show_axes|yesno:'true,false' }}"
    class="block w-full h-full"
  ></canvas>
</div>
```

**JS class public API:**
```javascript
export class WebGLViewport {
    // Constructor: creates THREE.WebGLRenderer, Camera, OrbitControls, lights
    getScene()           // returns THREE.Scene
    getCamera()          // returns THREE.Camera
    getControls()        // returns OrbitControls
    onUpdate(fn)         // register per-frame callback
    offUpdate(fn)        // remove per-frame callback
    start()              // begin render loop
    stop()               // pause render loop
    resize()             // manual resize trigger

    // Events dispatched:
    //   "webgl:viewport-ready"   { detail: { viewportId } }
    //   "webgl:viewport-resize"  { detail: { viewportId, width, height } }

    // Events listened:
    //   "webgl:camera-sync"      { detail: { position, target, source } }
}
```

**htmx integration:** Canvas itself is never htmx-swapped. Parent container can be. On `htmx:beforeCleanupElement`, `__insightInstance.destroy()` disposes Three.js resources. On `htmx:afterSwap`, `initAll()` re-initializes.

**Source:** Extracted from `onto-3dwiz/static/js/webgl/scene.js` (Scene3D class).

---

### 4.2 `webgl_axis` -- Axis Labels

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/axis.html")
def webgl_axis(
    tag_id: str = "webgl-axis",
    viewport_id: str = "webgl-viewport",
    x_label: str = "",
    y_label: str = "",
    z_label: str = "",
    x_color: str = "#ff4444",
    y_color: str = "#44ff44",
    z_color: str = "#4444ff",
    x_length: int = 100,
    y_length: int = 60,
    z_length: int = 50,
) -> dict:
    return { ... }
```

**HTML template:** Phantom div with `data-webgl-axis`, `data-viewport="{{ viewport_id }}"`.

**JS class API:**
```javascript
export class WebGLAxis {
    setLabel(axis, text)      // axis: "x"|"y"|"z"
    setVisible(visible)
    // Binds to "webgl:viewport-ready" to delay init until target viewport exists
}
```

---

### 4.3 `webgl_grid` -- Reference Grid Plane

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/grid.html")
def webgl_grid(
    tag_id: str = "webgl-grid",
    viewport_id: str = "webgl-viewport",
    size: int = 100,
    divisions: int = 10,
    color_center: str = "#444444",
    color_grid: str = "#222222",
    plane: str = "xz",            # "xz" | "xy" | "yz"
    visible: bool = True,
) -> dict:
    return { ... }
```

**JS class API:**
```javascript
export class WebGLGrid {
    // Uses THREE.GridHelper
    setVisible(visible)
    setSize(size, divisions)
}
```

---

### 4.4 `webgl_overlay_text` -- Text Sprite Annotation

Generalizes `onto-3dwiz/static/js/webgl/annotations.js`. No "news" terminology.

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/overlay_text.html")
def webgl_overlay_text(
    tag_id: str = "webgl-overlay-text",
    viewport_id: str = "webgl-viewport",
    offset_y: int = 8,
    default_color: str = "#ffcc00",
    bg_color: str = "rgba(0,0,0,0.7)",
    max_width: int = 200,
) -> dict:
    return { ... }
```

**JS class API:**
```javascript
export class WebGLOverlayText {
    create(id, text, anchorPosition, options)  // options: { offsetY, color, bgColor, maxWidth }
    remove(id)
    updatePosition(id, newAnchor, offsetY)
    has(id)
    getIds()
    setVisible(visible)

    // Events dispatched:
    //   "webgl:overlay-text-click" { detail: { overlayId, viewportId } }
}
```

---

### 4.5 `webgl_overlay_link` -- Line Between Two 3D Points

Generalizes `onto-3dwiz/static/js/webgl/links.js`. No "risk" terminology.

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/overlay_link.html")
def webgl_overlay_link(
    tag_id: str = "webgl-overlay-link",
    viewport_id: str = "webgl-viewport",
    color_map: str = "",   # JSON: {"type1": "#ff6b6b", "type2": "#4ecdc4"}
    default_color: str = "#ffffff",
) -> dict:
    return { ... }
```

**JS class API:**
```javascript
export class WebGLOverlayLink {
    create(id, from, to, linkType, weight)
    remove(id)
    updatePosition(id, from, to)
    setVisible(visible)
    setGroupOpacity(opacity)
    has(id)
    getIds()
}
```

---

### 4.6 `webgl_threshold_plane` -- Horizontal Reference Plane

Generalizes `onto-3dwiz/static/js/webgl/threshold.js`.

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/threshold_plane.html")
def webgl_threshold_plane(
    tag_id: str = "webgl-threshold",
    viewport_id: str = "webgl-viewport",
    height: float = 0.0,
    color: str = "#ff000066",
    size: int = 100,
    visible: bool = False,
) -> dict:
    return { ... }
```

**JS class API:**
```javascript
export class WebGLThresholdPlane {
    setHeight(y)
    setVisible(visible)
    setColor(hex)
    // Listens for "webgl:threshold-change" { detail: { height } }
}
```

---

## 5. HTML Atom Components

### 5.1 `stream_status` -- Connection Status Indicator

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/stream_status.html")
def stream_status(
    tag_id: str = "stream-status",
    transport_id: str = "",
    label_connected: str = "Connected",
    label_disconnected: str = "Disconnected",
    label_connecting: str = "Connecting...",
) -> dict:
    return { ... }
```

**HTML template:**
```html
{% load i18n %}
<div
  id="{{ tag_id }}"
  data-stream-status
  data-transport="{{ transport_id }}"
  data-label-connected="{{ label_connected }}"
  data-label-disconnected="{{ label_disconnected }}"
  data-label-connecting="{{ label_connecting }}"
  class="inline-flex items-center gap-2 px-2 py-1 rounded text-xs"
  role="status"
  aria-live="polite"
>
  <span data-status-dot class="inline-block w-2 h-2 rounded-full bg-red-500"></span>
  <span data-status-text>{% trans label_disconnected %}</span>
</div>
```

**JS class API:**
```javascript
export class StreamStatus {
    // Listens for "webgl:transport-status" { detail: { transportId, status } }
    // Updates dot color: green=connected, red=disconnected, yellow=connecting
}
```

---

### 5.2 `data_badge` -- Entity Badge/Chip

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/data_badge.html")
def data_badge(
    tag_id: str = "",
    entity_id: str = "",
    label: str = "",
    color: str = "#888888",
    value: str = "",
    active: bool = True,
) -> dict:
    return { ... }
```

**HTML template:**
```html
<span
  {% if tag_id %}id="{{ tag_id }}"{% endif %}
  data-data-badge
  data-entity="{{ entity_id }}"
  data-color="{{ color }}"
  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs
         border border-gray-200 dark:border-gray-600
         {% if active %}text-primary{% else %}text-secondary opacity-50{% endif %}
         cursor-pointer select-none"
  role="button"
  tabindex="0"
  aria-pressed="{{ active|yesno:'true,false' }}"
>
  <span class="inline-block w-2 h-2 rounded-full" style="background-color: {{ color }}"></span>
  <span data-badge-label>{{ label }}</span>
  {% if value %}
    <span data-badge-value class="font-mono text-secondary">{{ value }}</span>
  {% endif %}
</span>
```

**JS class API:**
```javascript
export class DataBadge {
    toggle()
    setValue(val)
    setActive(bool)
    // On click dispatches "webgl:entity-focus" / "webgl:entity-blur"
    // Listens for "webgl:entity-focus" to highlight self when entity matches
}
```

---

### 5.3 `data_item` -- Single Feed Item

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/data_item.html")
def data_item(
    tag_id: str = "",
    entity_id: str = "",
    title: str = "",
    subtitle: str = "",
    timestamp: str = "",
    color: str = "",
    icon: str = "",
) -> dict:
    return { ... }
```

**HTML template:**
```html
{% load i18n %}
<div
  {% if tag_id %}id="{{ tag_id }}"{% endif %}
  data-data-item
  data-entity="{{ entity_id }}"
  class="flex items-start gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700
         rounded cursor-pointer transition-colors text-sm"
  role="listitem"
>
  {% if color %}
    <span class="mt-1 w-2 h-2 rounded-full shrink-0" style="background: {{ color }}"></span>
  {% endif %}
  <div class="min-w-0 flex-1">
    <p class="text-primary truncate">{{ title }}</p>
    {% if subtitle %}
      <p class="text-secondary text-xs truncate">{{ subtitle }}</p>
    {% endif %}
  </div>
  {% if timestamp %}
    <time class="text-secondary text-xs whitespace-nowrap shrink-0">{{ timestamp }}</time>
  {% endif %}
</div>
```

**JS class API:**
```javascript
export class DataItem {
    // On click dispatches "webgl:entity-focus" with entity_id
    // Listens for "webgl:entity-focus" to highlight self
}
```

**htmx integration:** Items are server-rendered. New items arrive via htmx `hx-swap="afterbegin"` into parent feed container. JS auto-initializes via `initAll()` in `htmx:afterSwap`.

---

## 6. Molecule Components

### 6.1 `webgl_streaming_chart` -- Viewport + Nodes + Axes

Composes `webgl_viewport` + `webgl_axis` + `webgl_grid` and adds the `StreamingNodes` engine (from `onto-3dwiz/static/js/webgl/nodes.js`).

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/streaming_chart.html")
def webgl_streaming_chart(
    tag_id: str = "webgl-chart",
    capacity: int = 500,
    max_entities: int = 20,
    lane_spacing: int = 8,
    time_scale: float = 0.2,
    value_scale: float = 0.5,
    sphere_radius: float = 0.3,
    sphere_detail: int = 6,
    x_label: str = "Time",
    y_label: str = "Value",
    z_label: str = "Entity",
    show_grid: bool = True,
    css_class: str = "",
) -> dict:
    return { ... }
```

**HTML template:**
```html
{% load insight_webgl_tags %}
<div
  id="{{ tag_id }}"
  data-webgl-streaming-chart
  data-lane-spacing="{{ lane_spacing }}"
  data-time-scale="{{ time_scale }}"
  data-value-scale="{{ value_scale }}"
  data-sphere-radius="{{ sphere_radius }}"
  data-sphere-detail="{{ sphere_detail }}"
  class="relative w-full h-full {{ css_class }}"
>
  {% webgl_viewport tag_id=tag_id|add:"-viewport" capacity=capacity max_entities=max_entities %}
  {% webgl_axis tag_id=tag_id|add:"-axis" viewport_id=tag_id|add:"-viewport" x_label=x_label y_label=y_label z_label=z_label %}
  {% if show_grid %}
    {% webgl_grid tag_id=tag_id|add:"-grid" viewport_id=tag_id|add:"-viewport" %}
  {% endif %}
</div>
```

**JS class API:**
```javascript
export class WebGLStreamingChart {
    // Internally creates StreamingNodes (InstancedMesh + ring buffer)
    addPoint(entity, value)       // add data point to entity's lane
    tick()                        // advance time, rebuild positions
    getEntities()                 // list registered entity names
    getEntityLane(entity)         // Z position for entity
    getEntityCount(entity)        // points in entity's buffer
    getTimePosition()             // current X head position
    getXForAge(entity, ticksAgo)  // X for overlay sync
    getWindowWidth()              // visible X range in world units
    setVisible(visible)

    // Events dispatched:
    //   "webgl:chart-tick"       { detail: { chartId, timeOffset } }
    //   "webgl:entity-register"  { detail: { chartId, entity, lane, color } }

    // Events listened:
    //   "webgl:data-point"       { detail: { entity, value } }
}
```

**Source:** `StreamingNodes` internals from `onto-3dwiz/static/js/webgl/nodes.js` -- InstancedMesh with ring buffer, sliding window `_rebuildPositions()`.

---

### 6.2 `webgl_overlay_panel` -- Viewport Overlay Manager

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/overlay_panel.html")
def webgl_overlay_panel(
    tag_id: str = "webgl-overlay",
    viewport_id: str = "webgl-viewport",
    enable_text: bool = True,
    enable_links: bool = True,
    link_color_map: str = "",   # JSON
    max_annotations: int = 20,
    max_links: int = 50,
) -> dict:
    return { ... }
```

**HTML template:** Composes `webgl_overlay_text` + `webgl_overlay_link` atoms.

**JS class API:**
```javascript
export class WebGLOverlayPanel {
    // Finds child OverlayText and OverlayLink instances
    addAnnotation(id, text, anchor, options)
    addLink(id, from, to, type, weight)
    removeAll()
    setLayerVisible(layer, visible)  // layer: "text" | "links"

    // Events listened:
    //   "webgl:annotation-add"   { detail: { id, text, anchor, options } }
    //   "webgl:link-add"         { detail: { id, from, to, type, weight } }
}
```

---

### 6.3 `data_feed` -- Scrollable Feed with htmx

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/data_feed.html")
def data_feed(
    tag_id: str = "data-feed",
    max_items: int = 50,
    api_url: str = "",
    hx_trigger: str = "",            # e.g. "sse:news_event" or custom event
    empty_message: str = "Waiting for data...",
    css_class: str = "",
) -> dict:
    return { ... }
```

**HTML template:**
```html
{% load i18n %}
<div
  id="{{ tag_id }}"
  data-data-feed
  data-max-items="{{ max_items }}"
  class="overflow-y-auto max-h-64 space-y-0.5 {{ css_class }}"
  role="list"
  aria-label="{% trans 'Data feed' %}"
  {% if api_url %}
    hx-get="{{ api_url }}"
    hx-trigger="{{ hx_trigger }}"
    hx-swap="afterbegin"
  {% endif %}
>
  <p class="text-secondary text-sm px-2 py-1" data-empty-message>
    {% trans empty_message %}
  </p>
</div>
```

**JS class API:**
```javascript
export class DataFeed {
    // Manages max-items pruning (removes oldest when over limit)
    // Hides empty message when first item arrives
    // Dispatches "webgl:feed-item-count" { detail: { feedId, count } }
}
```

**htmx integration:** Primary htmx-driven component. New items arrive as server-rendered partials via `hx-get` + `hx-trigger`. Trigger can be SSE event name or custom DOM event.

---

### 6.4 `entity_legend` -- Auto-Growing Badge Container

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/entity_legend.html")
def entity_legend(
    tag_id: str = "entity-legend",
    viewport_id: str = "",
    entities: list | None = None,   # [{"id": "X", "label": "X", "color": "#..."}]
    orientation: str = "vertical",  # "vertical" | "horizontal"
) -> dict:
    return {
        "tag_id": tag_id, "viewport_id": viewport_id,
        "entities": entities or [], "orientation": orientation,
    }
```

**JS class API:**
```javascript
export class EntityLegend {
    addEntity(id, label, color)   // Creates DataBadge dynamically
    removeEntity(id)

    // Listens for "webgl:entity-register" to auto-add new badges
    // On badge click dispatches "webgl:entity-toggle" { detail: { entity, visible } }
}
```

---

### 6.5 `playback_controls` -- Play/Pause/Step/Speed

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/playback_controls.html")
def playback_controls(
    tag_id: str = "playback-controls",
    viewport_id: str = "",
    speeds: str = "0.5,1,2,5",
    default_speed: float = 1.0,
    show_step: bool = True,
) -> dict:
    return { ... }
```

**HTML template:**
```html
{% load i18n %}
<div
  id="{{ tag_id }}"
  data-playback-controls
  data-viewport="{{ viewport_id }}"
  data-speeds="{{ speeds }}"
  data-default-speed="{{ default_speed }}"
  class="flex items-center gap-2 px-3 py-2"
>
  {% if show_step %}
    <button data-action="step-back" class="btn btn-sm btn-subtil"
            aria-label="{% trans 'Step back' %}">&#9664;&#9664;</button>
  {% endif %}
  <button data-action="play" class="btn btn-sm btn-subtil"
          aria-label="{% trans 'Play' %}">&#9654;</button>
  <button data-action="pause" class="btn btn-sm btn-subtil"
          aria-label="{% trans 'Pause' %}">&#9646;&#9646;</button>
  {% if show_step %}
    <button data-action="step-forward" class="btn btn-sm btn-subtil"
            aria-label="{% trans 'Step forward' %}">&#9654;&#9654;</button>
  {% endif %}
  <label class="flex items-center gap-1 text-xs text-secondary">
    <span>{% trans "Speed" %}</span>
    <select data-action="speed" class="text-xs border rounded px-1 py-0.5 dark:bg-gray-800">
      <!-- Populated from data-speeds -->
    </select>
  </label>
  <span data-tick-counter class="text-xs text-secondary font-mono">0 ticks</span>
</div>
```

**JS class API:**
```javascript
export class PlaybackControls {
    // Dispatches:
    //   "webgl:playback-play"    { detail: { viewportId } }
    //   "webgl:playback-pause"   { detail: { viewportId } }
    //   "webgl:playback-speed"   { detail: { viewportId, speed } }
    //   "webgl:playback-step"    { detail: { viewportId, direction: "forward"|"backward" } }
}
```

---

### 6.6 `layer_controls` -- Checkbox Toggles

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/layer_controls.html")
def layer_controls(
    tag_id: str = "layer-controls",
    viewport_id: str = "",
    layers: list | None = None,   # [{"id": "annotations", "label": "Annotations", "checked": True}]
) -> dict:
    return {
        "tag_id": tag_id, "viewport_id": viewport_id,
        "layers": layers or [],
    }
```

**HTML template:**
```html
{% load i18n %}
<div
  id="{{ tag_id }}"
  data-layer-controls
  data-viewport="{{ viewport_id }}"
  class="flex flex-col gap-1 p-2"
>
  {% for layer in layers %}
    <label class="flex items-center gap-2 text-sm text-primary cursor-pointer">
      <input type="checkbox" data-layer="{{ layer.id }}"
             {% if layer.checked %}checked{% endif %}
             class="accent-insight-primary">
      {{ layer.label }}
    </label>
  {% endfor %}
</div>
```

**JS class API:**
```javascript
export class LayerControls {
    // On checkbox change dispatches:
    //   "webgl:layer-toggle" { detail: { viewportId, layerId, visible } }
}
```

---

## 7. Event System Components

### 7.1 `event_queue` -- Generic FIFO Processor

**Source:** `onto-3dwiz/static/js/event-queue/queue.js`

**Template tag:** `{% event_queue tag_id="eq-main" %}`

**HTML:** Phantom div with `data-event-queue`.

**JS class API:**
```javascript
export class InsightEventQueue {
    setDispatcher(fn)       // fn(event) called for each dequeued event
    enqueue(event)          // add to FIFO
    get length()
    clear()
}
```

### 7.2 `event_registry` -- Handler Registration

**Source:** `onto-3dwiz/static/js/event-queue/registry.js`

**Template tag:** `{% event_registry tag_id="er-main" %}`

**JS class API:**
```javascript
export class InsightEventRegistry {
    register(eventType, handler, metadata)   // metadata: { persist: bool }
    getHandlers(eventType)                   // returns [{ handler, metadata }]
    has(eventType)
    shouldPersist(eventType)
    unregister(eventType)
    clear()
}
```

### 7.3 `sse_transport` -- SSE Connection Manager

**Source:** `onto-3dwiz/static/js/event-queue/transport.js`

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/sse_transport.html")
def sse_transport(
    tag_id: str = "sse-transport",
    url: str = "",
    channel: str = "",
    reconnect_delay: int = 1000,
    max_reconnect_delay: int = 30000,
    auto_connect: bool = True,
) -> dict:
    return { ... }
```

**HTML template:**
```html
<div
  id="{{ tag_id }}"
  data-sse-transport
  data-url="{{ url }}{% if channel %}?channel={{ channel }}{% endif %}"
  data-reconnect-delay="{{ reconnect_delay }}"
  data-max-reconnect-delay="{{ max_reconnect_delay }}"
  data-auto-connect="{{ auto_connect|yesno:'true,false' }}"
  class="hidden"
  aria-hidden="true"
></div>
```

**JS class API:**
```javascript
export class InsightSSETransport {
    connect()
    disconnect()
    get connected()

    // Events dispatched:
    //   "webgl:transport-status"  { detail: { transportId, status: "connected"|"disconnected"|"connecting" } }
    //   "webgl:sse-event"         { detail: { transportId, data } }
}
```

### 7.4 `ws_transport` -- WebSocket Bridge

Bridges the htmx WebSocket extension (`hx-ext="ws"`) to the `webgl:*` event system.

**Template tag:**
```python
@register.inclusion_tag("insight_ui_webgl/components/ws_transport.html")
def ws_transport(
    tag_id: str = "ws-transport",
    url: str = "",
    auto_connect: bool = True,
) -> dict:
    return { ... }
```

**HTML template:**
```html
<div
  id="{{ tag_id }}"
  data-ws-transport
  data-url="{{ url }}"
  data-auto-connect="{{ auto_connect|yesno:'true,false' }}"
  hx-ext="ws"
  ws-connect="{{ url }}"
  class="hidden"
  aria-hidden="true"
></div>
```

**JS class API:**
```javascript
export class InsightWSTransport {
    // Listens for htmx:wsAfterMessage → dispatches "webgl:ws-event"
    // Listens for htmx:wsOpen/wsClose/wsError → dispatches "webgl:transport-status"
}
```

---

## 8. Init Registration

**`insight-webgl-init.js`:**

```javascript
import { WebGLViewport } from "./insight-webgl-viewport.js";
import { WebGLAxis } from "./insight-webgl-axis.js";
import { WebGLGrid } from "./insight-webgl-grid.js";
import { WebGLOverlayText } from "./insight-webgl-overlay-text.js";
import { WebGLOverlayLink } from "./insight-webgl-overlay-link.js";
import { WebGLThresholdPlane } from "./insight-webgl-threshold-plane.js";
import { StreamStatus } from "./insight-webgl-stream-status.js";
import { DataBadge } from "./insight-webgl-data-badge.js";
import { DataItem } from "./insight-webgl-data-item.js";
import { WebGLStreamingChart } from "./insight-webgl-streaming-chart.js";
import { WebGLOverlayPanel } from "./insight-webgl-overlay-panel.js";
import { DataFeed } from "./insight-webgl-data-feed.js";
import { EntityLegend } from "./insight-webgl-entity-legend.js";
import { PlaybackControls } from "./insight-webgl-playback-controls.js";
import { LayerControls } from "./insight-webgl-layer-controls.js";
import { InsightEventQueue } from "./insight-webgl-event-queue.js";
import { InsightEventRegistry } from "./insight-webgl-event-registry.js";
import { InsightSSETransport } from "./insight-webgl-sse-transport.js";
import { InsightWSTransport } from "./insight-webgl-ws-transport.js";

window.InsightWebGL = window.InsightWebGL || {};
Object.assign(window.InsightWebGL, {
    WebGLViewport, WebGLAxis, WebGLGrid,
    WebGLOverlayText, WebGLOverlayLink, WebGLThresholdPlane,
    StreamStatus, DataBadge, DataItem,
    WebGLStreamingChart, WebGLOverlayPanel, DataFeed,
    EntityLegend, PlaybackControls, LayerControls,
    InsightEventQueue, InsightEventRegistry,
    InsightSSETransport, InsightWSTransport,
});

function initAll() {
    // 1. Event system (infrastructure)
    InsightEventQueue.initAll();
    InsightEventRegistry.initAll();
    InsightSSETransport.initAll();
    InsightWSTransport.initAll();

    // 2. WebGL atoms (viewport must be first)
    WebGLViewport.initAll();
    WebGLAxis.initAll();
    WebGLGrid.initAll();
    WebGLOverlayText.initAll();
    WebGLOverlayLink.initAll();
    WebGLThresholdPlane.initAll();

    // 3. HTML atoms
    StreamStatus.initAll();
    DataBadge.initAll();
    DataItem.initAll();

    // 4. Molecules (after atoms -- they find child atom instances)
    WebGLStreamingChart.initAll();
    WebGLOverlayPanel.initAll();
    DataFeed.initAll();
    EntityLegend.initAll();
    PlaybackControls.initAll();
    LayerControls.initAll();
}

document.addEventListener("DOMContentLoaded", () => {
    if (typeof htmx !== "undefined") {
        htmx.on("htmx:beforeCleanupElement", (evt) => {
            const el = evt.detail.elt;
            if (el.__insightInstance?.destroy) {
                el.__insightInstance.destroy();
            }
        });
    }

    initAll();

    if (typeof htmx !== "undefined") {
        htmx.on("htmx:afterSwap", () => initAll());
    }
});
```

**Init order matters:** Event system first (so transports connect), then viewport atoms (so scenes exist), then other atoms, then molecules (which find child instances).

---

## 9. Communication Architecture

```
SSE/WS data arrives
  |
  v
InsightSSETransport dispatches "webgl:sse-event" { detail: { data } }
  |
  +---> InsightEventQueue.enqueue() --> InsightEventRegistry handlers
  |       |
  |       +---> WebGLStreamingChart.addPoint()   (WebGL domain)
  |       +---> WebGLOverlayPanel.addAnnotation() (WebGL domain)
  |       +---> custom DOM event --> htmx hx-trigger (HTML domain)
  |
  +---> htmx hx-trigger="webgl:sse-event" --> server renders data_item partial
        --> hx-swap="afterbegin" into DataFeed container

User clicks DataBadge
  |
  v
"webgl:entity-focus" { detail: { entity } }
  |
  +---> WebGLStreamingChart highlights lane
  +---> Other DataBadges highlight/dim
  +---> htmx hx-trigger --> server renders entity detail panel
```

### Standard Custom Events

| Event | Payload | Source | Consumers |
|-------|---------|--------|-----------|
| `webgl:viewport-ready` | `{ viewportId }` | WebGLViewport | WebGLAxis, WebGLGrid, overlays |
| `webgl:sse-event` | `{ transportId, data }` | InsightSSETransport | EventQueue, htmx triggers |
| `webgl:ws-event` | `{ transportId, data }` | InsightWSTransport | EventQueue, htmx triggers |
| `webgl:transport-status` | `{ transportId, status }` | Transports | StreamStatus |
| `webgl:entity-focus` | `{ entity, source }` | DataBadge, DataItem | Chart, badges, htmx |
| `webgl:entity-blur` | `{ entity, source }` | DataBadge | Chart, badges |
| `webgl:entity-register` | `{ chartId, entity, lane, color }` | StreamingChart | EntityLegend |
| `webgl:entity-toggle` | `{ entity, visible }` | EntityLegend | StreamingChart |
| `webgl:chart-tick` | `{ chartId, timeOffset }` | StreamingChart | Overlays |
| `webgl:layer-toggle` | `{ viewportId, layerId, visible }` | LayerControls | OverlayPanel |
| `webgl:threshold-change` | `{ height }` | External (slider) | ThresholdPlane |
| `webgl:playback-play` | `{ viewportId }` | PlaybackControls | SSETransport |
| `webgl:playback-pause` | `{ viewportId }` | PlaybackControls | SSETransport |
| `webgl:playback-speed` | `{ viewportId, speed }` | PlaybackControls | App handler |
| `webgl:playback-step` | `{ viewportId, direction }` | PlaybackControls | App handler |
| `webgl:camera-sync` | `{ position, target, source }` | External | WebGLViewport |
| `webgl:time-sync` | `{ tick, timestamp, source }` | External | Multi-viewport |

---

## 10. Example: onto-3dwiz Using insight-ui-webgl

The current 400-line `app.js` is replaced by template declarations + ~50 lines domain handler:

```html
{% extends "insight_ui/base.html" %}
{% load insight_tags insight_webgl_tags %}

{% block content %}
<div class="grid grid-cols-[1fr_280px] grid-rows-[1fr_auto] h-[calc(100vh-4rem)] gap-2 p-2">

  <!-- Main 3D Chart -->
  <div class="relative">
    {% webgl_streaming_chart tag_id="equity-chart" capacity=2000 max_entities=20
       lane_spacing=10 value_scale=0.3 sphere_radius=0.25
       x_label="Time" y_label="Price" z_label="Entity" %}

    {% webgl_overlay_panel tag_id="equity-overlays" viewport_id="equity-chart-viewport"
       link_color_map='{"credit":"#ff6b6b","market":"#4ecdc4","liquidity":"#ffe66d"}' %}

    {% webgl_threshold_plane tag_id="price-threshold" viewport_id="equity-chart-viewport" %}

    <div class="absolute top-2 left-2 z-10">
      {% stream_status tag_id="sse-status" transport_id="equity-sse" %}
    </div>
  </div>

  <!-- Sidebar -->
  <div class="flex flex-col gap-2 overflow-hidden">
    {% entity_legend tag_id="equity-legend" viewport_id="equity-chart" %}
    {% data_feed tag_id="news-feed" max_items=50 empty_message="Waiting for news..." %}
    {% layer_controls tag_id="layers" viewport_id="equity-chart"
       layers='[{"id":"text","label":"News","checked":true},{"id":"links","label":"Risk Links","checked":true}]' %}
  </div>

  <!-- Bottom Controls -->
  <div class="col-span-2">
    {% playback_controls tag_id="playback" viewport_id="equity-chart" speeds="0.5,1,2,5,10" %}
  </div>
</div>

<!-- Event Infrastructure (invisible) -->
{% sse_transport tag_id="equity-sse" url="/api/events/sse/" channel="equity" %}
{% event_queue tag_id="eq" %}
{% event_registry tag_id="er" %}
{% endblock %}

{% block extra_scripts %}
<script type="module">
  // Domain-specific wiring (~50 lines) -- maps equity events to generic components
  document.addEventListener("DOMContentLoaded", () => {
    const chart = InsightWebGL.WebGLStreamingChart.instances
      .get(document.getElementById("equity-chart"));
    const overlays = InsightWebGL.WebGLOverlayPanel.instances
      .get(document.getElementById("equity-overlays"));
    const registry = InsightWebGL.InsightEventRegistry.instances
      .get(document.querySelector("[data-event-registry]"));
    const queue = InsightWebGL.InsightEventQueue.instances
      .get(document.querySelector("[data-event-queue]"));

    if (!chart || !registry || !queue) return;

    // price_tick --> chart
    registry.register("price_tick", (e) => {
      if (e.entity && e.price != null) chart.addPoint(e.entity, e.price);
    });

    // news_event --> annotation overlay
    registry.register("news_event", (e) => {
      if (!overlays || !e.entity_id || !e.headline) return;
      const lane = chart.getEntityLane(e.entity_id);
      if (lane !== null) {
        overlays.addAnnotation(e.id, e.headline,
          [chart.getWindowWidth(), (e.price ?? 100) * 0.3, lane]);
      }
    });

    // risk_link --> link overlay
    registry.register("risk_link", (e) => {
      if (!overlays || !e.source_entity || !e.target_entity) return;
      const sLane = chart.getEntityLane(e.source_entity);
      const tLane = chart.getEntityLane(e.target_entity);
      if (sLane !== null && tLane !== null) {
        const x = chart.getWindowWidth();
        overlays.addLink(e.id, [x, 10, sLane], [x, 10, tLane],
          e.risk_type || "credit", e.weight ?? 0.5);
      }
    });

    // Wire SSE --> queue --> registry
    document.addEventListener("webgl:sse-event", (e) => {
      try {
        const data = e.detail.data;
        const event = typeof data.event === "string" ? JSON.parse(data.event) : data;
        if (event.type) queue.enqueue(event);
      } catch (err) { console.error("[onto-3dwiz] Parse error:", err); }
    });

    queue.setDispatcher(async (event) => {
      for (const entry of registry.getHandlers(event.type)) {
        try { await entry.handler(event); }
        catch (err) { console.error(`Handler error for ${event.type}:`, err); }
      }
    });
  });
</script>
{% endblock %}
```

---

## 11. Implementation Roadmap

| Phase | Components | Depends On |
|-------|-----------|------------|
| 1. Foundation | pyproject.toml, apps.py, `webgl_viewport`, `webgl_axis`, `webgl_grid`, `insight-webgl-init.js` | -- |
| 2. WebGL Overlays | `webgl_overlay_text`, `webgl_overlay_link`, `webgl_threshold_plane` | Phase 1 |
| 3. Event System | `event_queue`, `event_registry`, `sse_transport`, `ws_transport` | Phase 1 |
| 4. HTML Atoms | `stream_status`, `data_badge`, `data_item` | Phase 1 |
| 5. Molecules | `streaming_chart`, `overlay_panel`, `data_feed`, `entity_legend`, `playback_controls`, `layer_controls` | Phases 1-4 |
| 6. Example Migration | Rewrite onto-3dwiz templates, replace app.js, smoke tests | Phase 5 |

---

## 12. Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Three.js distribution | Vendor in `static/vendor/`, app declares importmap | Apps control CDN vs local; library provides files |
| insight-ui dependency | Python dependency in pyproject.toml | Design tokens, base layout, dark mode required |
| Package naming | `insight_ui_webgl` | Consistent with `insight_ui` |
| CDN policy | Cloudflare only | Team policy -- no unpkg/jsdelivr in production |
| JS module format | ES modules with importmap | Modern, matches insight-ui pattern |
