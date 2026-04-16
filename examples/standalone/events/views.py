"""SSE endpoint that streams events from the EventStore to the browser."""

import json
import time

from django.http import StreamingHttpResponse

from .models import Event


def sse_stream(request):
    """Server-Sent Events endpoint. Streams new events as they arrive."""
    channel = request.GET.get("channel", "")
    last_id = int(request.GET.get("last_id", "0"))

    def event_stream():
        nonlocal last_id
        while True:
            qs = Event.objects.filter(id__gt=last_id)
            if channel:
                qs = qs.filter(channel=channel)
            events = list(qs[:50])

            for event in events:
                data = json.dumps({
                    "id": event.id,
                    "channel": event.channel,
                    "type": event.event_type,
                    "event": json.dumps(event.payload),
                })
                yield f"data: {data}\n\n"
                last_id = event.id

            if not events:
                yield ": keepalive\n\n"
                time.sleep(0.1)

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
