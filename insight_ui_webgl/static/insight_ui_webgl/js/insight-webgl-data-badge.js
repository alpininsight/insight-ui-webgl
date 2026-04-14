/**
 * Insight UI WebGL — Data Badge
 *
 * HTML atom: clickable entity chip with color dot. Dispatches
 * "webgl:entity-focus" / "webgl:entity-blur" on click. Listens for
 * "webgl:entity-focus" to highlight itself when its entity matches.
 */

export class DataBadge {
    static instances = new WeakMap();

    constructor(element) {
        if (DataBadge.instances.has(element)) {
            return DataBadge.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this._active = element.getAttribute("aria-pressed") !== "false";

        this.config = {
            entityId: element.dataset.entity ?? "",
            color: element.dataset.color ?? "#888888",
        };

        this.bindEvents();

        element.__insightInstance = this;
        DataBadge.instances.set(element, this);
    }

    // ---- Public API ----

    toggle() {
        this._active = !this._active;
        this.element.setAttribute("aria-pressed", this._active ? "true" : "false");
        this.element.classList.toggle("opacity-50", !this._active);

        document.dispatchEvent(new CustomEvent(
            this._active ? "webgl:entity-focus" : "webgl:entity-blur",
            { detail: { entity: this.config.entityId, source: this.element.id } },
        ));
    }

    setActive(active) {
        this._active = active;
        this.element.setAttribute("aria-pressed", active ? "true" : "false");
        this.element.classList.toggle("opacity-50", !active);
    }

    setValue(val) {
        const el = this.element.querySelector("[data-badge-value]");
        if (el) el.textContent = val;
    }

    // ---- Events ----

    bindEvents() {
        this._onClick = () => this.toggle();
        this.element.addEventListener("click", this._onClick);
        this.boundHandlers.push({ element: this.element, event: "click", handler: this._onClick });

        this._onKeydown = (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.toggle();
            }
        };
        this.element.addEventListener("keydown", this._onKeydown);
        this.boundHandlers.push({ element: this.element, event: "keydown", handler: this._onKeydown });

        // Highlight when entity-focus matches
        this._onFocus = (e) => {
            if (e.detail.entity === this.config.entityId && e.detail.source !== this.element.id) {
                this.element.classList.add("ring-2", "ring-insight-primary");
            }
        };
        this._onBlur = (e) => {
            if (e.detail.entity === this.config.entityId) {
                this.element.classList.remove("ring-2", "ring-insight-primary");
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
        DataBadge.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-data-badge]")
            .forEach((el) => new DataBadge(el));
    }
}
