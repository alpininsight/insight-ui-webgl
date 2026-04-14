"""Minimal event store — append-only SQLite table for SSE streaming."""

from django.db import models


class Event(models.Model):
    channel = models.CharField(max_length=64, default="equity")
    event_type = models.CharField(max_length=64)
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.channel}:{self.event_type} #{self.id}"
