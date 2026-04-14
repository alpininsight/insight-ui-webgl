/**
 * Insight UI WebGL — Data Item
 *
 * HTML atom: single item in a data feed. Dispatches "webgl:entity-focus"
 * on click. Listens for "webgl:entity-focus" to highlight itself.
 * Items are typically server-rendered and arrive via htmx partial swaps.
 */

export class DataItem {
    static instances = new WeakMap();

    constructor(element) {
        if (DataItem.instances.has(element)) {
            return DataItem.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];

        this.config = {
            entityId: element.dataset.entity ?? "",
        };

        this.bindEvents();

        element.__insightInstance = this;
        DataItem.instances.set(element, this);
    }

    // ---- Events ----

    bindEvents() {
        this._onClick = () => {
            if (this.config.entityId) {
                document.dispatchEvent(new CustomEvent("webgl:entity-focus", {
                    detail: { entity: this.config.entityId, source: this.element.id },
                }));
            }
        };
        this.element.addEventListener("click", this._onClick);
        this.boundHandlers.push({ element: this.element, event: "click", handler: this._onClick });

        this._onFocus = (e) => {
            if (e.detail.entity === this.config.entityId && e.detail.source !== this.element.id) {
                this.element.classList.add("bg-gray-100", "dark:bg-gray-600");
            }
        };
        this._onBlur = (e) => {
            if (e.detail.entity === this.config.entityId) {
                this.element.classList.remove("bg-gray-100", "dark:bg-gray-600");
            }
        };
        document.addEventListener("webgl:entity-focus", this._onFocus);
        document.addEventListener("webgl:entity-blur", this._onBlur);
        this.boundHandlers.push(
            { element: document, event: "webgl:entity-focus", handler: this._onFocus },
            { element: document, event: "webgl:entity-blur", handler: this._onBlur },
        );
    }

    // ---- Lifecycle ----

    destroy() {
        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];
        DataItem.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-data-item]")
            .forEach((el) => new DataItem(el));
    }
}
