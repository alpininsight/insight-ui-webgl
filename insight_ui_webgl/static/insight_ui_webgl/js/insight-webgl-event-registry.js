/**
 * Insight UI WebGL — Event Registry
 *
 * Handlers self-declare metadata (persist, debounce). The registry stores
 * and looks up handlers — it does NOT process events. The queue's dispatcher
 * uses the registry to find handlers per event type.
 *
 * Extracted from onto-3dwiz HandlerRegistry (static/js/event-queue/registry.js).
 */

export class InsightEventRegistry {
    static instances = new WeakMap();

    constructor(element) {
        if (InsightEventRegistry.instances.has(element)) {
            return InsightEventRegistry.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this._handlers = new Map();

        this.bindEvents();

        element.__insightInstance = this;
        InsightEventRegistry.instances.set(element, this);
        debugLog("New InsightEventRegistry:", element.id);
    }

    // ---- Public API ----

    /**
     * Register a handler for an event type.
     * @param {string} eventType
     * @param {function(object): void|Promise<void>} handler
     * @param {object} [metadata] — { persist: boolean, debounce: number|null }
     */
    register(eventType, handler, metadata = {}) {
        if (typeof eventType !== "string" || !eventType) {
            throw new Error("eventType must be a non-empty string");
        }
        if (typeof handler !== "function") {
            throw new Error("handler must be a function");
        }
        const entry = {
            handler,
            metadata: {
                persist: metadata.persist ?? false,
                debounce: metadata.debounce ?? null,
                ...metadata,
            },
        };
        if (!this._handlers.has(eventType)) {
            this._handlers.set(eventType, []);
        }
        this._handlers.get(eventType).push(entry);
    }

    /**
     * Get all handler entries for an event type.
     * @param {string} eventType
     * @returns {Array<{handler: function, metadata: object}>}
     */
    getHandlers(eventType) {
        return this._handlers.get(eventType) || [];
    }

    has(eventType) {
        return this._handlers.has(eventType) && this._handlers.get(eventType).length > 0;
    }

    shouldPersist(eventType) {
        return this.getHandlers(eventType).some((e) => e.metadata.persist);
    }

    unregister(eventType) {
        this._handlers.delete(eventType);
    }

    clear() {
        this._handlers.clear();
    }

    // ---- Events ----

    bindEvents() {
        // No external event listeners needed — registry is passive.
    }

    // ---- Lifecycle ----

    destroy() {
        debugLog("Destroy InsightEventRegistry:", this.element?.id);
        this.clear();
        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];
        InsightEventRegistry.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-event-registry]")
            .forEach((el) => new InsightEventRegistry(el));
    }
}
