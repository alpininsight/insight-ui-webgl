/**
 * Insight UI WebGL — SSE Transport
 *
 * Manages a Server-Sent Events connection with exponential backoff reconnect.
 * Dispatches received events as "webgl:sse-event" custom DOM events so
 * the EventQueue and htmx hx-trigger can both consume them.
 *
 * Extracted from onto-3dwiz SSETransport (static/js/event-queue/transport.js).
 */

export class InsightSSETransport {
    static instances = new WeakMap();

    constructor(element) {
        if (InsightSSETransport.instances.has(element)) {
            return InsightSSETransport.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this._source = null;
        this._intentionallyClosed = false;

        this.config = {
            url: element.dataset.url ?? "",
            reconnectDelay: parseInt(element.dataset.reconnectDelay ?? "1000", 10),
            maxReconnectDelay: parseInt(element.dataset.maxReconnectDelay ?? "30000", 10),
            autoConnect: element.dataset.autoConnect !== "false",
        };
        this._currentDelay = this.config.reconnectDelay;

        this.bindEvents();

        if (this.config.autoConnect && this.config.url) {
            this.connect();
        }

        element.__insightInstance = this;
        InsightSSETransport.instances.set(element, this);
        debugLog("New InsightSSETransport:", element.id, this.config.url);
    }

    // ---- Public API ----

    connect() {
        if (typeof EventSource === "undefined") {
            console.error("[InsightSSETransport] EventSource not available");
            return;
        }
        if (!this.config.url) {
            console.warn("[InsightSSETransport] No URL configured");
            return;
        }

        this._intentionallyClosed = false;
        this._source = new EventSource(this.config.url);
        this._dispatchStatus("connecting");

        this._source.onopen = () => {
            this._currentDelay = this.config.reconnectDelay;
            this._dispatchStatus("connected");
        };

        this._source.onmessage = (messageEvent) => {
            this._currentDelay = this.config.reconnectDelay;
            try {
                const data = JSON.parse(messageEvent.data);
                document.dispatchEvent(new CustomEvent("webgl:sse-event", {
                    detail: { transportId: this.element.id, data },
                }));
            } catch (err) {
                console.error("[InsightSSETransport] Failed to parse event:", err);
            }
        };

        this._source.onerror = () => {
            if (!this._intentionallyClosed) {
                this._dispatchStatus("disconnected");
                this._reconnect();
            }
        };
    }

    disconnect() {
        this._intentionallyClosed = true;
        if (this._source) {
            this._source.close();
            this._source = null;
        }
        this._dispatchStatus("disconnected");
    }

    get connected() {
        return this._source !== null && this._source.readyState !== 2;
    }

    // ---- Internal ----

    _reconnect() {
        const source = this._source;
        if (source) {
            source.close();
            this._source = null;
        }
        setTimeout(() => {
            if (!this._intentionallyClosed) {
                this._currentDelay = Math.min(
                    this._currentDelay * 2,
                    this.config.maxReconnectDelay,
                );
                this.connect();
            }
        }, this._currentDelay);
    }

    _dispatchStatus(status) {
        document.dispatchEvent(new CustomEvent("webgl:transport-status", {
            detail: { transportId: this.element.id, status },
        }));
    }

    // ---- Events ----

    bindEvents() {
        // Listen for playback controls
        this._onPlay = (e) => {
            if (!this.connected) this.connect();
        };
        this._onPause = (e) => {
            this.disconnect();
        };
        document.addEventListener("webgl:playback-play", this._onPlay);
        document.addEventListener("webgl:playback-pause", this._onPause);
        this.boundHandlers.push(
            { element: document, event: "webgl:playback-play", handler: this._onPlay },
            { element: document, event: "webgl:playback-pause", handler: this._onPause },
        );
    }

    // ---- Lifecycle ----

    destroy() {
        debugLog("Destroy InsightSSETransport:", this.element?.id);
        this.disconnect();
        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];
        InsightSSETransport.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-sse-transport]")
            .forEach((el) => new InsightSSETransport(el));
    }
}
