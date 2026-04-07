"""Template tags for insight-ui-webgl components."""

from __future__ import annotations

from typing import Any

from django import template

register = template.Library()


# ---------------------------------------------------------------------------
# WebGL Atoms
# ---------------------------------------------------------------------------


@register.inclusion_tag("insight_ui_webgl/components/viewport.html")
def webgl_viewport(
    tag_id: str = "webgl-viewport",
    capacity: int = 500,
    max_entities: int = 20,
    camera_mode: str = "perspective",
    camera_position: str = "50,30,50",
    camera_target: str = "50,30,0",
    fov: int = 60,
    bg_color: str = "#1a1a2e",
    show_axes: bool = True,
    css_class: str = "",
) -> dict[str, Any]:
    """Render a WebGL viewport with canvas, camera, and controls."""
    return {
        "tag_id": tag_id,
        "capacity": capacity,
        "max_entities": max_entities,
        "camera_mode": camera_mode,
        "camera_position": camera_position,
        "camera_target": camera_target,
        "fov": fov,
        "bg_color": bg_color,
        "show_axes": show_axes,
        "css_class": css_class,
    }


@register.inclusion_tag("insight_ui_webgl/components/axis.html")
def webgl_axis(
    tag_id: str = "webgl-axis",
    viewport_id: str = "webgl-viewport",
    x_label: str = "X",
    y_label: str = "Y",
    z_label: str = "Z",
    x_color: str = "#ff4444",
    y_color: str = "#44ff44",
    z_color: str = "#4444ff",
    x_length: int = 100,
    y_length: int = 60,
    z_length: int = 50,
) -> dict[str, Any]:
    """Render labeled axes in a WebGL viewport."""
    return {
        "tag_id": tag_id,
        "viewport_id": viewport_id,
        "x_label": x_label,
        "y_label": y_label,
        "z_label": z_label,
        "x_color": x_color,
        "y_color": y_color,
        "z_color": z_color,
        "x_length": x_length,
        "y_length": y_length,
        "z_length": z_length,
    }


@register.inclusion_tag("insight_ui_webgl/components/grid.html")
def webgl_grid(
    tag_id: str = "webgl-grid",
    viewport_id: str = "webgl-viewport",
    size: int = 100,
    divisions: int = 10,
    color_center: str = "#444444",
    color_grid: str = "#222222",
    plane: str = "xz",
    visible: bool = True,
) -> dict[str, Any]:
    """Render a reference grid plane in a WebGL viewport."""
    return {
        "tag_id": tag_id,
        "viewport_id": viewport_id,
        "size": size,
        "divisions": divisions,
        "color_center": color_center,
        "color_grid": color_grid,
        "plane": plane,
        "visible": visible,
    }


# ---------------------------------------------------------------------------
# WebGL Overlays (Phase 2)
# ---------------------------------------------------------------------------


@register.inclusion_tag("insight_ui_webgl/components/overlay_text.html")
def webgl_overlay_text(
    tag_id: str = "webgl-overlay-text",
    viewport_id: str = "webgl-viewport",
    offset_y: int = 8,
    default_color: str = "#ffcc00",
    bg_color: str = "rgba(0,0,0,0.7)",
    max_width: int = 200,
) -> dict[str, Any]:
    """Render a text overlay manager (sprites + connecting lines)."""
    return {
        "tag_id": tag_id,
        "viewport_id": viewport_id,
        "offset_y": offset_y,
        "default_color": default_color,
        "bg_color": bg_color,
        "max_width": max_width,
    }


@register.inclusion_tag("insight_ui_webgl/components/overlay_link.html")
def webgl_overlay_link(
    tag_id: str = "webgl-overlay-link",
    viewport_id: str = "webgl-viewport",
    color_map: str = "",
    default_color: str = "#ffffff",
) -> dict[str, Any]:
    """Render a link overlay manager (lines between two 3D points)."""
    return {
        "tag_id": tag_id,
        "viewport_id": viewport_id,
        "color_map": color_map,
        "default_color": default_color,
    }


@register.inclusion_tag("insight_ui_webgl/components/threshold_plane.html")
def webgl_threshold_plane(
    tag_id: str = "webgl-threshold",
    viewport_id: str = "webgl-viewport",
    height: float = 0.0,
    color: str = "#ff4444",
    opacity: float = 0.15,
    width: int = 100,
    depth: int = 50,
    visible: bool = True,
) -> dict[str, Any]:
    """Render a horizontal reference plane at a configurable height."""
    return {
        "tag_id": tag_id,
        "viewport_id": viewport_id,
        "height": height,
        "color": color,
        "opacity": opacity,
        "width": width,
        "depth": depth,
        "visible": visible,
    }
