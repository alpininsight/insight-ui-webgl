"""Management command: consume CloudEvents from Kafka and store in EventStore.

Usage:
    uv run python manage.py consume_kafka
    uv run python manage.py consume_kafka --broker 100.64.0.9:19092
    uv run python manage.py consume_kafka --topic acquisition.raw.finance.yahoo
"""

import json
import signal
import sys

from django.core.management.base import BaseCommand

from events.models import Event


class Command(BaseCommand):
    help = "Consume CloudEvents from Kafka and store as price_tick events."

    def add_arguments(self, parser):
        parser.add_argument(
            "--broker",
            default="100.64.0.9:19092",
            help="Kafka broker address (default: 100.64.0.9:19092)",
        )
        parser.add_argument(
            "--topic",
            default="acquisition.raw.finance.yahoo",
            help="Kafka topic to consume from",
        )
        parser.add_argument(
            "--group",
            default="insight-ui-webgl-demo",
            help="Consumer group ID",
        )

    def handle(self, *args, **options):
        try:
            from confluent_kafka import Consumer, KafkaError
        except ImportError:
            self.stderr.write(
                "confluent-kafka not installed. Run:\n"
                "  uv add confluent-kafka\n"
            )
            sys.exit(1)

        broker = options["broker"]
        topic = options["topic"]
        group = options["group"]

        self.stdout.write(f"Connecting to {broker} topic={topic} group={group}")

        consumer = Consumer({
            "bootstrap.servers": broker,
            "group.id": group,
            "auto.offset.reset": "latest",
            "enable.auto.commit": True,
        })
        consumer.subscribe([topic])

        running = True

        def shutdown(signum, frame):
            nonlocal running
            running = False
            self.stdout.write("\nShutting down...")

        signal.signal(signal.SIGINT, shutdown)
        signal.signal(signal.SIGTERM, shutdown)

        count = 0
        self.stdout.write("Consuming... (Ctrl+C to stop)")

        while running:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                self.stderr.write(f"Kafka error: {msg.error()}")
                continue

            try:
                cloud_event = json.loads(msg.value().decode("utf-8"))
                data = cloud_event.get("data", {})

                # Map CloudEvent to price_tick
                symbol = data.get("symbol", "")
                price = data.get("price")
                if not symbol or price is None:
                    continue

                payload = {
                    "type": "price_tick",
                    "entity": symbol,
                    "price": float(price),
                    "currency": data.get("currency", "USD"),
                    "exchange": data.get("exchange", ""),
                    "change_percent": data.get("change_percent", 0),
                    "time_iso": data.get("time_iso", ""),
                }

                Event.objects.create(
                    channel="equity",
                    event_type="price_tick",
                    payload=payload,
                )

                count += 1
                if count % 10 == 0:
                    self.stdout.write(f"  {count} events stored (latest: {symbol} ${price:.2f})")

            except (json.JSONDecodeError, KeyError, TypeError) as e:
                self.stderr.write(f"Parse error: {e}")

        consumer.close()
        self.stdout.write(f"Done. {count} events stored total.")
