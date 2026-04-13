# insight-ui-webgl

WebGL + HTML components for 3D data visualization — built on [insight-ui](https://github.com/alpininsight/insight-ui) patterns.

## Vision

A Django component library that brings the insight-ui architecture (template tags, JS classes, HTML templates) to 3D data visualization. Components live both **inside the WebGL viewport** (3D scene) and **around it** (HTML panels, controls, legends).

**insight-ui-webgl is not a fork of insight-ui** — it's a sibling library that follows the same patterns and uses insight-ui as a foundation for design tokens, dark mode, and base layout.

## Discipline: Don't Reinvent, Consume insight-ui

We hold ourselves to the same discipline as `insight-ui-user`: **anything that is
generic enough to belong in insight-ui gets filed as an upstream issue and used
with a local fallback until adopted**.

### What lives here
- 3D viewport, axes, grid, overlays, streaming charts — **WebGL specific**
- Three.js wrapping, ring buffers, sliding windows — **WebGL specific**
- Event queue / transports for SSE and WebSocket — **data flow specific**

### What goes upstream to insight-ui
Anything we'd otherwise reinvent: layout helpers, design tokens, base template,
HTML panel components (feeds, legends, status indicators, playback controls).

### Active upstream issues
- [insight-ui#129](https://github.com/alpininsight/insight-ui/issues/129) —
  WebGL/3D design tokens (axis, grid, canvas, threshold, overlay colors)
- [insight-ui#130](https://github.com/alpininsight/insight-ui/issues/130) —
  document the `with-<sibling>` example pattern

Until these are adopted, `insight-ui-webgl` ships local fallback values via the
`var(--color-insight-webgl-*, #hardcoded)` pattern. The moment insight-ui
defines the variables, our fallbacks become dead code — no migration needed.

### Design token resolution (3-tier)
Every color in insight-ui-webgl goes through this policy:
1. **Explicit** — `data-*` attribute set by the template tag user
2. **insight-ui CSS variable** — resolved via `getComputedStyle`
3. **Hardcoded fallback** — last resort, baked into the JS class

See `insight-webgl-utils.js` for `InsightWebGLUtils.resolveColor()`.

### Examples

| Example | Description | Run |
|---------|-------------|-----|
| [`examples/standalone/`](examples/standalone/) | Minimal demo without insight-ui base template. Own CSS with design token fallbacks. | `cd examples/standalone && uv sync && DJANGO_SETTINGS_MODULE=settings uv run python manage.py runserver 8765` |
| [`examples/with-insight-ui/`](examples/with-insight-ui/) | Full integration: extends `insight_ui/base.html`, uses navbar, footer, dark mode. Mirrors the `insight-ui-user` pattern (PR #21). | `cd examples/with-insight-ui && uv sync && uv run python manage.py runserver 8766` |

## Use Cases

The library is designed for interactive data visualization applications:

- **Financial data** — streaming equity prices, news annotations, risk links (showcase: onto-3dwiz)
- **Ontology graphs** — 3D node/edge visualization with interactive exploration
- **Network topology** — infrastructure, dependency, and flow visualization
- **Scientific data** — 3D scatter plots, surfaces, volumetric rendering
- **Any domain** where 2D charts aren't enough and full 3D interaction adds value

## Architecture

### Component Anatomy (4 parts — same as insight-ui)

Every component follows the insight-ui pattern:

| Part | File | Purpose |
|------|------|---------|
| 1. Template Tag | `templatetags/insight_webgl_tags.py` | Django template tag with typed params |
| 2. HTML Template | `templates/insight_ui_webgl/components/<name>.html` | HTML structure with data-attributes |
| 3. JS Class | `static/insight_ui_webgl/js/insight-webgl-<name>.js` | Behavior with WeakMap singleton guard |
| 4. Init Registration | `static/insight_ui_webgl/js/insight-webgl-init.js` | Auto-init + htmx re-init |

### Two Component Domains

```
┌─────────────────────────────────────────────────────────────┐
│  HTML Domain (insight-ui + insight-ui-webgl HTML components) │
│                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────────┐ │
│  │  {% webgl_viewport %}    │  │  {% news_feed %}         │ │
│  │  ┌────────────────────┐  │  │  {% equity_legend %}     │ │
│  │  │  WebGL Domain      │  │  │  {% time_scrubber %}     │ │
│  │  │  (Three.js scene)  │  │  │  {% risk_panel %}        │ │
│  │  │                    │  │  │  {% stream_status %}      │ │
│  │  │  Viewport          │  │  │                          │ │
│  │  │  ├── Axes          │  │  │  These are HTML/htmx     │ │
│  │  │  ├── Lanes         │  │  │  components — scrollable,│ │
│  │  │  ├── Annotations   │  │  │  styled, dark mode,      │ │
│  │  │  ├── Links         │  │  │  i18n-ready              │ │
│  │  │  └── Overlays      │  │  │                          │ │
│  │  └────────────────────┘  │  └──────────────────────────┘ │
│  └──────────────────────────┘                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  {% webgl_controls %}  — Play/Pause, Scrubber, Dial     ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**HTML components** (`news_feed`, `equity_legend`, etc.):
- Standard Django template tags
- Styled with insight-ui design tokens + Tailwind
- Updated via htmx partial swaps
- Scrollable, accessible, dark mode, i18n

**WebGL components** (`viewport`, `lane`, `annotation`, etc.):
- Three.js objects managed by JS classes
- Configured via `data-*` attributes on the `<canvas>` element
- Communicate with HTML components via custom DOM events

**Bridge** between domains:
- SSE events → JS dispatches to both WebGL scene AND htmx triggers
- User interaction in HTML → JS updates WebGL scene
- User interaction in WebGL → custom events trigger htmx swaps

### Atomic Design for WebGL Components

Components follow atomic design, same as the onto-3dwiz work order:

#### Atoms (smallest units)

| Atom | Domain | Description |
|------|--------|-------------|
| `webgl_viewport` | WebGL | Canvas + Scene + Camera + Controls + Lights |
| `webgl_axis` | WebGL | Single labeled axis (configurable direction, color, labels) |
| `webgl_lane` | WebGL | One data series as streaming spheres on a Z-lane |
| `webgl_annotation` | WebGL | Text sprite with connecting line to data point |
| `webgl_link` | WebGL | Line between two lanes (color/opacity encoded) |
| `webgl_grid` | WebGL | Background grid for the viewport floor |
| `news_item` | HTML | Single news entry (2 lines, truncated, timestamp) |
| `equity_badge` | HTML | Entity name + color dot + current price |
| `stream_status` | HTML | Connection status indicator |

#### Molecules (joined atoms)

| Molecule | Components | Description |
|----------|-----------|-------------|
| `webgl_chart` | viewport + axes + lanes + grid | Complete streaming chart |
| `webgl_overlay` | annotations + links | News + risk overlay layer |
| `news_feed` | news_item × N | Scrollable news list panel |
| `equity_legend` | equity_badge × N | Entity list with toggle/color |
| `time_controls` | scrubber + play/pause | Timeline control bar |

#### Organisms (features)

| Organism | Molecules | Description |
|----------|-----------|-------------|
| `streaming_display` | chart + overlay + legend + status | Live data visualization |
| `news_panel` | news_feed + chart (linked) | News highlights price points |
| `risk_dashboard` | chart + risk_panel + link overlay | Risk relationship view |

### JS Class Pattern (identical to insight-ui)

```javascript
// insight-webgl-viewport.js
export class WebGLViewport {
    static instances = new WeakMap();

    constructor(element) {
        if (WebGLViewport.instances.has(element)) {
            return WebGLViewport.instances.get(element);
        }
        this.canvas = element;
        this.capacity = parseInt(element.dataset.capacity ?? "500");
        this.maxEntities = parseInt(element.dataset.maxEntities ?? "20");
        // Initialize Three.js scene, camera, controls, renderer
        this._initScene();
        this.bindEvents();
        WebGLViewport.instances.set(element, this);
    }

    _initScene() { /* Three.js setup */ }
    bindEvents() { /* resize, SSE, custom events */ }
    destroy() {
        // Dispose Three.js resources
        // Remove event listeners
        WebGLViewport.instances.delete(this.canvas);
    }

    static initAll() {
        document.querySelectorAll("[data-webgl-viewport]").forEach(
            el => new WebGLViewport(el)
        );
    }
}
```

### Template Tag Pattern

```python
# templatetags/insight_webgl_tags.py
from django import template

register = template.Library()

@register.inclusion_tag("insight_ui_webgl/components/viewport.html")
def webgl_viewport(
    tag_id: str = "webgl-main",
    capacity: int = 500,
    max_entities: int = 20,
    camera_mode: str = "2d",  # "2d" or "3d"
    sse_url: str = "/api/events/sse/",
) -> dict:
    return {
        "tag_id": tag_id,
        "capacity": capacity,
        "max_entities": max_entities,
        "camera_mode": camera_mode,
        "sse_url": sse_url,
    }

@register.inclusion_tag("insight_ui_webgl/components/news_feed.html")
def news_feed(
    tag_id: str = "news-feed",
    max_items: int = 50,
    api_url: str = "/api/events/?channel=news",
) -> dict:
    return {
        "tag_id": tag_id,
        "max_items": max_items,
        "api_url": api_url,
    }
```

### HTML Template Pattern

```html
{# components/viewport.html #}
{% load i18n %}
<canvas
  id="{{ tag_id }}"
  data-webgl-viewport
  data-capacity="{{ capacity }}"
  data-max-entities="{{ max_entities }}"
  data-camera-mode="{{ camera_mode }}"
  data-sse-url="{{ sse_url }}"
  class="w-full h-full block"
></canvas>
```

```html
{# components/news_feed.html #}
{% load i18n %}
<div
  id="{{ tag_id }}"
  data-news-feed
  data-max-items="{{ max_items }}"
  class="overflow-y-auto max-h-64 space-y-1"
  hx-get="{{ api_url }}"
  hx-trigger="sse:news_event"
  hx-swap="afterbegin"
>
  <p class="text-secondary text-sm px-2">{% trans "Waiting for news..." %}</p>
</div>
```

## Design Principles

1. **insight-ui is the foundation** — use its design tokens, dark mode, base layout. Don't fork, extend.
2. **Components are domain-agnostic** — `webgl_chart` renders any streaming data, not just equities.
3. **HTML and WebGL components coexist** — both follow the same 4-part anatomy.
4. **Bridge via events** — WebGL ↔ HTML communication through custom DOM events and htmx triggers.
5. **Atomic design at every level** — atoms compose into molecules into organisms, for both HTML and WebGL.
6. **Configuration over code** — components are configured via `data-*` attributes and template tag parameters.
7. **htmx for HTML updates** — no manual DOM manipulation for panels/lists. Let Django render, htmx swap.
8. **Three.js for 3D only** — Three.js never touches HTML. HTML never touches the canvas.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| 3D Rendering | Three.js (WebGL 2.0) via importmap or bundled |
| HTML Components | Django template tags + Tailwind CSS |
| Interactivity | htmx (HTML) + custom events (bridge) |
| Design Tokens | insight-ui color/typography/dark mode tokens |
| Package | Django app, installable via uv/pip |
| JS Pattern | ES modules, WeakMap singleton, data-attribute binding |

## Relationship to Other Repos

```
insight-ui              → Base component library (HTML only)
insight-ui-webgl        → This repo: WebGL + HTML components for 3D viz
onto-3dwiz              → Showcase app using insight-ui-webgl
insight-ui-flow         → SVG flow components (sibling pattern)
```

## Roadmap

### Phase 1: Extract from onto-3dwiz
- [ ] Extract WebGL atoms (viewport, axis, lane, annotation, link)
- [ ] Extract HTML atoms (news_item, equity_badge, stream_status)
- [ ] Create Django app structure with template tags
- [ ] Port JS classes to insight-ui WeakMap pattern

### Phase 2: Generalize
- [ ] Make components domain-agnostic (not equity-specific)
- [ ] Add configuration for different data types (graphs, networks, scatter)
- [ ] Build molecule-level template tags (webgl_chart, news_feed, equity_legend)
- [ ] Add insight-ui design token integration

### Phase 3: Compose
- [ ] Organism-level components (streaming_display, risk_dashboard)
- [ ] htmx bridge for HTML↔WebGL communication
- [ ] SSE integration as a reusable pattern
- [ ] Documentation site with live demos

## License

MIT — same as insight-ui.
