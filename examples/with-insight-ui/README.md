# Example: insight-ui-webgl with insight-ui

Demonstrates insight-ui-webgl integrated with insight-ui's base template
and design token system. Mirrors the pattern from
`insight-ui-user/examples/with-insight-ui/` (see insight-ui-user PR #21).

## Principle

insight-ui-webgl is a **sibling library** to insight-ui, not a fork. All
layout, typography, colors, and dark/light mode flow from insight-ui.
WebGL-specific components consume insight-ui design tokens via CSS
custom properties with hardcoded fallbacks:

```css
background-color: var(--color-insight-webgl-bg, #1a1a2e);
```

When insight-ui ships the WebGL tokens (upstream issue #129), the
fallbacks become dead code.

## Setup

```bash
cd examples/with-insight-ui
uv sync
uv run python manage.py runserver 8766
```

Open <http://localhost:8766/> — the page extends `insight_ui/base.html`,
uses insight-ui navbar + heading + footer, and renders an
insight-ui-webgl viewport inside the content block.

## What to see

- **Navbar**, **heading decoration**, **footer** — all from insight-ui
- **Dark/light toggle** — built into insight-ui's theme toggle
- **3D viewport** — from insight-ui-webgl, theme-colored via CSS variables
- **No custom layout CSS** — all from insight-ui's `@layer components`

## How it works

1. `settings.py` adds both `insight_ui` and `insight_ui_webgl` to
   `INSTALLED_APPS`
2. The demo template `{% extends "insight_ui/base.html" %}`
3. Blocks overridden: `title`, `extra_head` (Three.js importmap),
   `content` (viewport + overlays), `extra_scripts` (demo seeding)
4. All colors come from `--color-insight-*` variables defined by
   insight-ui's `@theme` block

## Upstream issues referenced

- [insight-ui#129](https://github.com/alpininsight/insight-ui/issues/129)
  — proposed WebGL design tokens
- [insight-ui#130](https://github.com/alpininsight/insight-ui/issues/130)
  — document `with-<lib>` example pattern
