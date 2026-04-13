# Example: insight-ui-webgl Standalone

Demonstrates insight-ui-webgl **without** insight-ui's base template.
Uses its own minimal CSS with `var(--color-insight-*, #fallback)` tokens.

For the full insight-ui integration (navbar, footer, dark mode toggle),
see [`../with-insight-ui/`](../with-insight-ui/).

## Setup

```bash
cd examples/standalone
uv sync
DJANGO_SETTINGS_MODULE=settings uv run python manage.py runserver 8765
```

Open <http://localhost:8765/>
