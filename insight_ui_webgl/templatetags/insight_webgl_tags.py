"""Template tags for insight-ui-webgl components.

Design-token policy
-------------------
Color parameters default to the empty string. A non-empty value is an
**explicit override** and passed through to the HTML ``data-*`` attribute.
An empty value signals "use the insight-ui design token" — the JS class
reads the appropriate CSS custom property (e.g. ``--color-insight-webgl-axis-x``)
with a last-resort hardcoded fallback.

This keeps insight-ui-webgl themable by the host app without every tag
repeating hex codes. See insight-ui issue #129 for the upstream token proposal.
"""

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
    bg_color: str = "",
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
    x_color: str = "",
    y_color: str = "",
    z_color: str = "",
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
    color_center: str = "",
    color_grid: str = "",
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
    default_color: str = "",
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
    default_color: str = "",
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
    color: str = "",
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


# ---------------------------------------------------------------------------
# Event System (Phase 3) — phantom div pattern
# ---------------------------------------------------------------------------


@register.inclusion_tag("insight_ui_webgl/components/event_queue.html")
def event_queue(
    tag_id: str = "event-queue",
) -> dict[str, Any]:
    """Render a FIFO event queue (infrastructure, invisible)."""
    return {"tag_id": tag_id}


@register.inclusion_tag("insight_ui_webgl/components/event_registry.html")
def event_registry(
    tag_id: str = "event-registry",
) -> dict[str, Any]:
    """Render a handler registry (infrastructure, invisible)."""
    return {"tag_id": tag_id}


@register.inclusion_tag("insight_ui_webgl/components/sse_transport.html")
def sse_transport(
    tag_id: str = "sse-transport",
    url: str = "",
    channel: str = "",
    reconnect_delay: int = 1000,
    max_reconnect_delay: int = 30000,
    auto_connect: bool = True,
) -> dict[str, Any]:
    """Render an SSE transport with reconnect logic (infrastructure, invisible)."""
    full_url = url
    if channel and "?" not in url:
        full_url = f"{url}?channel={channel}"
    elif channel:
        full_url = f"{url}&channel={channel}"
    return {
        "tag_id": tag_id,
        "url": full_url,
        "reconnect_delay": reconnect_delay,
        "max_reconnect_delay": max_reconnect_delay,
        "auto_connect": auto_connect,
    }


@register.inclusion_tag("insight_ui_webgl/components/ws_transport.html")
def ws_transport(
    tag_id: str = "ws-transport",
    url: str = "",
    auto_connect: bool = True,
) -> dict[str, Any]:
    """Render a WebSocket transport bridging htmx ws extension (infrastructure, invisible)."""
    return {
        "tag_id": tag_id,
        "url": url,
        "auto_connect": auto_connect,
    }


# ---------------------------------------------------------------------------
# HTML Atoms (Phase 4)
# ---------------------------------------------------------------------------


@register.inclusion_tag("insight_ui_webgl/components/stream_status.html")
def stream_status(
    tag_id: str = "stream-status",
    transport_id: str = "",
    label_connected: str = "Connected",
    label_disconnected: str = "Disconnected",
    label_connecting: str = "Connecting...",
) -> dict[str, Any]:
    """Render a connection status indicator (dot + text)."""
    return {
        "tag_id": tag_id,
        "transport_id": transport_id,
        "label_connected": label_connected,
        "label_disconnected": label_disconnected,
        "label_connecting": label_connecting,
    }


@register.inclusion_tag("insight_ui_webgl/components/data_badge.html")
def data_badge(
    tag_id: str = "",
    entity_id: str = "",
    label: str = "",
    color: str = "#888888",
    value: str = "",
    active: bool = True,
) -> dict[str, Any]:
    """Render a clickable entity badge/chip with color dot."""
    return {
        "tag_id": tag_id,
        "entity_id": entity_id,
        "label": label,
        "color": color,
        "value": value,
        "active": active,
    }


@register.inclusion_tag("insight_ui_webgl/components/data_item.html")
def data_item(
    tag_id: str = "",
    entity_id: str = "",
    title: str = "",
    subtitle: str = "",
    timestamp: str = "",
    color: str = "",
) -> dict[str, Any]:
    """Render a single data feed item."""
    return {
        "tag_id": tag_id,
        "entity_id": entity_id,
        "title": title,
        "subtitle": subtitle,
        "timestamp": timestamp,
        "color": color,
    }


# ---------------------------------------------------------------------------
# Molecules (Phase 5)
# ---------------------------------------------------------------------------


@register.inclusion_tag("insight_ui_webgl/components/streaming_chart.html")
def webgl_streaming_chart(
    tag_id: str = "webgl-chart",
    capacity: int = 500,
    max_entities: int = 20,
    lane_spacing: int = 10,
    time_scale: float = 0.2,
    value_scale: float = 0.3,
    sphere_radius: float = 0.25,
    sphere_detail: int = 5,
    tick_debounce: int = 30,
    x_label: str = "Time",
    y_label: str = "Value",
    z_label: str = "Entity",
    show_grid: bool = True,
    camera_position: str = "",
    camera_target: str = "",
    fov: int = 55,
    css_class: str = "",
) -> dict[str, Any]:
    """Render a streaming 3D chart with InstancedMesh spheres + sliding window."""
    return {
        "tag_id": tag_id,
        "capacity": capacity,
        "max_entities": max_entities,
        "lane_spacing": lane_spacing,
        "time_scale": time_scale,
        "value_scale": value_scale,
        "sphere_radius": sphere_radius,
        "sphere_detail": sphere_detail,
        "tick_debounce": tick_debounce,
        "x_label": x_label,
        "y_label": y_label,
        "z_label": z_label,
        "show_grid": show_grid,
        "camera_position": camera_position,
        "camera_target": camera_target,
        "fov": fov,
        "css_class": css_class,
    }


@register.inclusion_tag("insight_ui_webgl/components/playback_controls.html")
def playback_controls(
    tag_id: str = "playback-controls",
    viewport_id: str = "",
    speeds: str = "0.5,1,2,5",
    default_speed: float = 1.0,
    show_step: bool = True,
) -> dict[str, Any]:
    """Render playback controls (play/pause/step + speed selector)."""
    return {
        "tag_id": tag_id,
        "viewport_id": viewport_id,
        "speeds": speeds,
        "default_speed": default_speed,
        "show_step": show_step,
    }


@register.inclusion_tag("insight_ui_webgl/components/layer_controls.html")
def layer_controls(
    tag_id: str = "layer-controls",
    viewport_id: str = "",
    layers: str = "",
) -> dict[str, Any]:
    """Render checkbox toggles for visibility layers."""
    import json as _json

    parsed = []
    if layers:
        try:
            parsed = _json.loads(layers)
        except (ValueError, TypeError):
            pass
    return {
        "tag_id": tag_id,
        "viewport_id": viewport_id,
        "layers": parsed,
    }


@register.inclusion_tag("insight_ui_webgl/components/entity_legend.html")
def entity_legend(
    tag_id: str = "entity-legend",
    viewport_id: str = "",
    orientation: str = "vertical",
) -> dict[str, Any]:
    """Render an auto-growing entity legend (populates via webgl:entity-register)."""
    return {
        "tag_id": tag_id,
        "viewport_id": viewport_id,
        "orientation": orientation,
    }
