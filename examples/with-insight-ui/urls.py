"""URL configuration for the with-insight-ui example."""

from django.urls import path
from django.views.generic import TemplateView

urlpatterns = [
    path("", TemplateView.as_view(template_name="demo_with_insight_ui.html"), name="home"),
]
