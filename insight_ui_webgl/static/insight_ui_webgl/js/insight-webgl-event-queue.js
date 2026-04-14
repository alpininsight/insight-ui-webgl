/**
 * Insight UI WebGL — Event Queue
 *
 * Dumb FIFO with sequential async processing. Zero framework dependencies.
 * Handlers self-declare persistence via the registry metadata, not through
 * the queue itself. One event at a time — async handlers are awaited.
 *
 * Extracted from onto-3dwiz EventQueue (static/js/event-queue/queue.js).
 */

import { WebGLViewport } from "./insight-webgl-viewport.js";

export class InsightEventQueue {
    static instances = new WeakMap();

    constructor(element) {
        if (InsightEventQueue.instances.has(element)) {
            return InsightEventQueue.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this._queue = [];
        this._processing = false;
        this._dispatcher = null;

        this.bindEvents();

        element.__insightInstance = this;
        InsightEventQueue.instances.set(element, this);
        debugLog("New InsightEventQueue:", element.id);
    }

    // ---- Public API ----

    /**
     * Set the dispatch function called for each event.
     * @param {function(object): void|Promise<void>} fn
     */
    setDispatcher(fn) {
        this._dispatcher = fn;
    }

    /**
     * Add an event to the end of the queue.
     * @param {object} event — must have a `type` property.
     */
    enqueue(event) {
        if (!event || typeof event.type !== "string") {
            console.warn("[InsightEventQueue] Event must have a string 'type' property:", event);
            return;
        }
        this._queue.push(event);
        this._processNext();
    }

    get length() {
        return this._queue.length;
    }

    clear() {
        this._queue = [];
    }

    // ---- Internal ----

    async _processNext() {
        if (this._processing || this._queue.length === 0) return;
        this._processing = true;

        while (this._queue.length > 0) {
            const event = this._queue.shift();
            if (this._dispatcher) {
                try {
                    await this._dispatcher(event);
                } catch (err) {
                    console.error(`[InsightEventQueue] Handler error for ${event.type}:`, err);
                }
            }
        }

        this._processing = false;
    }

    // ---- Events ----

    bindEvents() {
        // Listen for SSE/WS events and auto-enqueue
        this._onSSE = (e) => {
            const data = e.detail?.data;
            if (!data) return;
            try {
                const event = typeof data.event === "string" ? JSON.parse(data.event) : data;
                if (event.type) this.enqueue(event);
            } catch (err) {
                console.error("[InsightEventQueue] Parse error:", err);
            }
        };
        document.addEventListener("webgl:sse-event", this._onSSE);
        this.boundHandlers.push({ element: document, event: "webgl:sse-event", handler: this._onSSE });

        this._onWS = (e) => {
            const data = e.detail?.data;
            if (!data) return;
            try {
                const event = typeof data === "string" ? JSON.parse(data) : data;
                if (event.type) this.enqueue(event);
            } catch (err) {
                console.error("[InsightEventQueue] WS parse error:", err);
            }
        };
        document.addEventListener("webgl:ws-event", this._onWS);
        this.boundHandlers.push({ element: document, event: "webgl:ws-event", handler: this._onWS });
    }

    // ---- Lifecycle ----

    destroy() {
        debugLog("Destroy InsightEventQueue:", this.element?.id);
        this.clear();
        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];
        InsightEventQueue.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-event-queue]")
            .forEach((el) => new InsightEventQueue(el));
    }
}
