"""Context processor wiring insight-ui config into every template.

insight-ui's ``config.get_config()`` is designed to be called inside
views, not as a Django context processor. This small wrapper adapts it
so ``{% extends "insight_ui/base.html" %}`` works without every view
having to build the context manually.
"""

from __future__ import annotations

from typing import Any

from django.http import HttpRequest

from insight_ui.config import get_config


def insight_ui_context(request: HttpRequest) -> dict[str, Any]:
    """Expose INSIGHT_UI config + PROJECT_NAME to every template."""
    cfg = get_config()
    assert isinstance(cfg, dict)  # noqa: S101 — guarded by get_config signature
    return {
        **cfg,
        "PROJECT_NAME": "insight-ui-webgl",
        "productive": True,  # skip tailwind_cli.html include (issue #117)
    }
