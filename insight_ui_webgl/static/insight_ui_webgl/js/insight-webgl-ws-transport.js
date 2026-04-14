/**
 * Insight UI WebGL — WebSocket Transport
 *
 * Bridges the htmx WebSocket extension (hx-ext="ws", ws-connect="...")
 * to the webgl:* custom event system. Listens for htmx:wsAfterMessage
 * and dispatches "webgl:ws-event" so the EventQueue can consume them.
 *
 * New component — not extracted from onto-3dwiz. Based on insight-ui's
 * websocket.html component pattern (insight-ui-user PR #21 reference).
 */

export class InsightWSTransport {
    static instances = new WeakMap();

    constructor(element) {
        if (InsightWSTransport.instances.has(element)) {
            return InsightWSTransport.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];

        this.config = {
            url: element.dataset.url ?? "",
            autoConnect: element.dataset.autoConnect !== "false",
        };

        this.bindEvents();

        element.__insightInstance = this;
        InsightWSTransport.instances.set(element, this);
        debugLog("New InsightWSTransport:", element.id, this.config.url);
    }

    // ---- Events ----

    bindEvents() {
        // Bridge htmx WebSocket extension events to webgl:* events

        this._onWsOpen = (evt) => {
            if (!this.element.contains(evt.target) && evt.target !== this.element) return;
            this._dispatchStatus("connected");
        };

        this._onWsClose = (evt) => {
            if (!this.element.contains(evt.target) && evt.target !== this.element) return;
            this._dispatchStatus("disconnected");
        };

        this._onWsError = (evt) => {
            if (!this.element.contains(evt.target) && evt.target !== this.element) return;
            this._dispatchStatus("disconnected");
        };

        this._onWsMessage = (evt) => {
            if (!this.element.contains(evt.target) && evt.target !== this.element) return;
            const message = evt.detail?.message;
            if (!message) return;

            // Skip HTML messages (htmx processes those automatically)
            if (typeof message === "string" && message.trim().startsWith("<")) return;

            try {
                const data = typeof message === "string" ? JSON.parse(message) : message;
                document.dispatchEvent(new CustomEvent("webgl:ws-event", {
                    detail: { transportId: this.element.id, data },
                }));
            } catch (err) {
                console.error("[InsightWSTransport] Failed to parse WS message:", err);
            }
        };

        document.body.addEventListener("htmx:wsOpen", this._onWsOpen);
        document.body.addEventListener("htmx:wsClose", this._onWsClose);
        document.body.addEventListener("htmx:wsError", this._onWsError);
        document.body.addEventListener("htmx:wsAfterMessage", this._onWsMessage);

        this.boundHandlers.push(
            { element: document.body, event: "htmx:wsOpen", handler: this._onWsOpen },
            { element: document.body, event: "htmx:wsClose", handler: this._onWsClose },
            { element: document.body, event: "htmx:wsError", handler: this._onWsError },
            { element: document.body, event: "htmx:wsAfterMessage", handler: this._onWsMessage },
        );
    }

    _dispatchStatus(status) {
        document.dispatchEvent(new CustomEvent("webgl:transport-status", {
            detail: { transportId: this.element.id, status },
        }));
    }

    // ---- Lifecycle ----

    destroy() {
        debugLog("Destroy InsightWSTransport:", this.element?.id);
        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];
        InsightWSTransport.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-ws-transport]")
            .forEach((el) => new InsightWSTransport(el));
    }
}
