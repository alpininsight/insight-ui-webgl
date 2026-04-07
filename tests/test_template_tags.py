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

    def test_bg_color(self) -> None:
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
