"""URL configuration for standalone example."""

from django.urls import path
from django.views.generic import TemplateView

from events.views import sse_stream

urlpatterns = [
    path("", TemplateView.as_view(template_name="demo.html"), name="home"),
    path("api/events/sse/", sse_stream, name="sse-stream"),
]
