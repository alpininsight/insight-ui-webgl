"""Tests for insight_ui_webgl template tags — Phase 1 atoms."""

import pytest
from django.template import Context, Template


@pytest.mark.django_db(transaction=False)
class TestWebGLViewportTag:
    """Test the webgl_viewport template tag."""

    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default_viewport(self) -> None:
        html = self._render("{% webgl_viewport %}")
        assert 'data-webgl-viewport' in html
        assert 'id="webgl-viewport"' in html
        assert 'data-capacity="500"' in html
        assert 'data-camera-mode="perspective"' in html
        # Default bg_color is empty — JS resolves via CSS var
        assert 'data-bg-color=""' in html

    def test_custom_viewport(self) -> None:
        html = self._render(
            '{% webgl_viewport tag_id="my-vp" capacity=1000 camera_mode="orthographic" %}'
        )
        assert 'id="my-vp"' in html
        assert 'data-capacity="1000"' in html
        assert 'data-camera-mode="orthographic"' in html

    def test_viewport_container(self) -> None:
        html = self._render("{% webgl_viewport %}")
        assert 'id="webgl-viewport-container"' in html
        assert '<canvas' in html

    def test_custom_css_class(self) -> None:
        html = self._render('{% webgl_viewport css_class="h-96" %}')
        assert 'h-96' in html

    def test_bg_color_explicit(self) -> None:
        html = self._render('{% webgl_viewport bg_color="#000000" %}')
        assert 'data-bg-color="#000000"' in html

    def test_camera_position(self) -> None:
        html = self._render('{% webgl_viewport camera_position="10,20,30" %}')
        assert 'data-camera-position="10,20,30"' in html


class TestWebGLAxisTag:
    """Test the webgl_axis template tag."""

    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default_axis(self) -> None:
        html = self._render("{% webgl_axis %}")
        assert 'data-webgl-axis' in html
        assert 'data-viewport="webgl-viewport"' in html
        assert 'class="hidden"' in html
        assert 'aria-hidden="true"' in html

    def test_custom_labels(self) -> None:
        html = self._render(
            '{% webgl_axis x_label="Time" y_label="Price" z_label="Entity" %}'
        )
        assert 'data-x-label="Time"' in html
        assert 'data-y-label="Price"' in html
        assert 'data-z-label="Entity"' in html

    def test_custom_viewport_binding(self) -> None:
        html = self._render('{% webgl_axis viewport_id="chart-viewport" %}')
        assert 'data-viewport="chart-viewport"' in html

    def test_default_colors_empty(self) -> None:
        """Default axis colors are empty — JS resolves via insight-ui CSS vars."""
        html = self._render("{% webgl_axis %}")
        assert 'data-x-color=""' in html
        assert 'data-y-color=""' in html
        assert 'data-z-color=""' in html

    def test_custom_colors(self) -> None:
        html = self._render('{% webgl_axis x_color="#ff0000" %}')
        assert 'data-x-color="#ff0000"' in html

    def test_custom_lengths(self) -> None:
        html = self._render('{% webgl_axis x_length=200 %}')
        assert 'data-x-length="200"' in html


class TestWebGLGridTag:
    """Test the webgl_grid template tag."""

    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default_grid(self) -> None:
        html = self._render("{% webgl_grid %}")
        assert 'data-webgl-grid' in html
        assert 'data-viewport="webgl-viewport"' in html
        assert 'data-size="100"' in html
        assert 'data-divisions="10"' in html
        assert 'data-plane="xz"' in html
        assert 'data-visible="true"' in html

    def test_custom_grid(self) -> None:
        html = self._render(
            '{% webgl_grid size=200 divisions=20 plane="xy" visible=False %}'
        )
        assert 'data-size="200"' in html
        assert 'data-divisions="20"' in html
        assert 'data-plane="xy"' in html
        assert 'data-visible="false"' in html

    def test_custom_colors(self) -> None:
        html = self._render(
            '{% webgl_grid color_center="#ffffff" color_grid="#cccccc" %}'
        )
        assert 'data-color-center="#ffffff"' in html
        assert 'data-color-grid="#cccccc"' in html


# ---------------------------------------------------------------------------
# Phase 2: WebGL Overlay Tags
# ---------------------------------------------------------------------------


class TestWebGLOverlayTextTag:
    """Test the webgl_overlay_text template tag."""

    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default(self) -> None:
        html = self._render("{% webgl_overlay_text %}")
        assert 'data-webgl-overlay-text' in html
        assert 'data-viewport="webgl-viewport"' in html
        assert 'data-offset-y="8"' in html
        # Default color is empty — JS resolves via insight-ui CSS var
        assert 'data-default-color=""' in html
        assert 'data-max-width="200"' in html

    def test_custom(self) -> None:
        html = self._render(
            '{% webgl_overlay_text tag_id="my-overlay" viewport_id="vp" '
            'offset_y=12 default_color="#ff0000" max_width=300 %}'
        )
        assert 'id="my-overlay"' in html
        assert 'data-viewport="vp"' in html
        assert 'data-offset-y="12"' in html
        assert 'data-default-color="#ff0000"' in html
        assert 'data-max-width="300"' in html


class TestWebGLOverlayLinkTag:
    """Test the webgl_overlay_link template tag."""

    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default(self) -> None:
        html = self._render("{% webgl_overlay_link %}")
        assert 'data-webgl-overlay-link' in html
        assert 'data-viewport="webgl-viewport"' in html
        assert 'data-default-color=""' in html

    def test_color_map(self) -> None:
        html = self._render(
            '{% webgl_overlay_link color_map=\'{"credit":"#ff6b6b"}\' %}'
        )
        assert '#ff6b6b' in html


class TestWebGLThresholdPlaneTag:
    """Test the webgl_threshold_plane template tag."""

    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default(self) -> None:
        html = self._render("{% webgl_threshold_plane %}")
        assert 'data-webgl-threshold' in html
        assert 'data-viewport="webgl-viewport"' in html
        # Default color is empty — JS resolves via insight-ui CSS var
        assert 'data-color=""' in html
        assert 'data-visible="true"' in html

    def test_custom(self) -> None:
        html = self._render(
            '{% webgl_threshold_plane height=20.5 color="#00ff00" '
            'opacity=0.3 width=200 depth=80 visible=False %}'
        )
        assert 'data-height="20.5"' in html
        assert 'data-color="#00ff00"' in html
        assert 'data-opacity="0.3"' in html
        assert 'data-width="200"' in html
        assert 'data-depth="80"' in html
        assert 'data-visible="false"' in html


# ---------------------------------------------------------------------------
# Phase 3: Event System Tags
# ---------------------------------------------------------------------------


class TestEventQueueTag:
    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default(self) -> None:
        html = self._render("{% event_queue %}")
        assert 'data-event-queue' in html
        assert 'id="event-queue"' in html
        assert 'class="hidden"' in html

    def test_custom_id(self) -> None:
        html = self._render('{% event_queue tag_id="eq-main" %}')
        assert 'id="eq-main"' in html


class TestEventRegistryTag:
    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default(self) -> None:
        html = self._render("{% event_registry %}")
        assert 'data-event-registry' in html
        assert 'id="event-registry"' in html


class TestSSETransportTag:
    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default(self) -> None:
        html = self._render("{% sse_transport %}")
        assert 'data-sse-transport' in html
        assert 'data-auto-connect="true"' in html

    def test_with_channel(self) -> None:
        html = self._render('{% sse_transport url="/api/events/sse/" channel="equity" %}')
        assert 'data-url="/api/events/sse/?channel=equity"' in html

    def test_custom_reconnect(self) -> None:
        html = self._render('{% sse_transport reconnect_delay=2000 max_reconnect_delay=60000 %}')
        assert 'data-reconnect-delay="2000"' in html
        assert 'data-max-reconnect-delay="60000"' in html


class TestWSTransportTag:
    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default(self) -> None:
        html = self._render("{% ws_transport %}")
        assert 'data-ws-transport' in html
        assert 'hx-ext="ws"' in html

    def test_with_url(self) -> None:
        html = self._render('{% ws_transport url="ws://localhost:8765" %}')
        assert 'ws-connect="ws://localhost:8765"' in html


# ---------------------------------------------------------------------------
# Phase 4: HTML Atom Tags
# ---------------------------------------------------------------------------


class TestStreamStatusTag:
    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default(self) -> None:
        html = self._render("{% stream_status %}")
        assert 'data-stream-status' in html
        assert 'data-status-dot' in html
        assert 'data-status-text' in html
        assert 'role="status"' in html
        assert 'aria-live="polite"' in html

    def test_custom_labels(self) -> None:
        html = self._render(
            '{% stream_status label_connected="Online" label_disconnected="Offline" %}'
        )
        assert 'data-label-connected="Online"' in html
        assert 'data-label-disconnected="Offline"' in html


class TestDataBadgeTag:
    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default(self) -> None:
        html = self._render("{% data_badge %}")
        assert 'data-data-badge' in html
        assert 'role="button"' in html
        assert 'tabindex="0"' in html

    def test_with_entity(self) -> None:
        html = self._render('{% data_badge entity_id="SAP" label="SAP SE" color="#ff0000" %}')
        assert 'data-entity="SAP"' in html
        assert 'SAP SE' in html
        assert 'background-color: #ff0000' in html

    def test_inactive(self) -> None:
        html = self._render('{% data_badge active=False %}')
        assert 'aria-pressed="false"' in html
        assert 'opacity-50' in html


class TestDataItemTag:
    def _render(self, tag_string: str) -> str:
        template = Template(f"{{% load insight_webgl_tags %}}{tag_string}")
        return template.render(Context())

    def test_default(self) -> None:
        html = self._render("{% data_item %}")
        assert 'data-data-item' in html
        assert 'role="listitem"' in html

    def test_with_content(self) -> None:
        html = self._render(
            '{% data_item entity_id="AAPL" title="Earnings Beat" subtitle="+5.2%" timestamp="14:30" %}'
        )
        assert 'data-entity="AAPL"' in html
        assert 'Earnings Beat' in html
        assert '+5.2%' in html
        assert '14:30' in html

    def test_with_color(self) -> None:
        html = self._render('{% data_item color="#10b981" %}')
        assert 'background: #10b981' in html
