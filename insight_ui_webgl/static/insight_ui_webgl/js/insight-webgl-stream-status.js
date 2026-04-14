/**
 * Insight UI WebGL — Stream Status
 *
 * HTML atom: connection status indicator (dot + text). Listens for
 * "webgl:transport-status" events and updates the visual state.
 */

export class StreamStatus {
    static instances = new WeakMap();

    constructor(element) {
        if (StreamStatus.instances.has(element)) {
            return StreamStatus.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];

        this.config = {
            transportId: element.dataset.transport ?? "",
            labelConnected: element.dataset.labelConnected ?? "Connected",
            labelDisconnected: element.dataset.labelDisconnected ?? "Disconnected",
            labelConnecting: element.dataset.labelConnecting ?? "Connecting...",
        };

        this._dot = element.querySelector("[data-status-dot]");
        this._text = element.querySelector("[data-status-text]");

        this.bindEvents();

        element.__insightInstance = this;
        StreamStatus.instances.set(element, this);
        debugLog("New StreamStatus:", element.id);
    }

    // ---- Public API ----

    setStatus(status) {
        const colors = { connected: "#10b981", disconnected: "#ef4444", connecting: "#f59e0b" };
        const labels = {
            connected: this.config.labelConnected,
            disconnected: this.config.labelDisconnected,
            connecting: this.config.labelConnecting,
        };
        if (this._dot) this._dot.style.backgroundColor = colors[status] ?? colors.disconnected;
        if (this._text) this._text.textContent = labels[status] ?? status;
    }

    // ---- Events ----

    bindEvents() {
        this._onStatus = (e) => {
            const { transportId, status } = e.detail;
            if (this.config.transportId && transportId !== this.config.transportId) return;
            this.setStatus(status);
        };
        document.addEventListener("webgl:transport-status", this._onStatus);
        this.boundHandlers.push({
            element: document,
            event: "webgl:transport-status",
            handler: this._onStatus,
        });
    }

    // ---- Lifecycle ----

    destroy() {
        debugLog("Destroy StreamStatus:", this.element?.id);
        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];
        StreamStatus.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-stream-status]")
            .forEach((el) => new StreamStatus(el));
    }
}
