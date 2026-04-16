/**
 * Insight UI WebGL — Layer Controls (Molecule)
 *
 * Checkbox toggles for visibility layers. Dispatches webgl:layer-toggle
 * consumed by overlay components.
 */

export class LayerControls {
    static instances = new WeakMap();

    constructor(element) {
        if (LayerControls.instances.has(element)) {
            return LayerControls.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this.config = { viewportId: element.dataset.viewport ?? "" };

        this.bindEvents();

        element.__insightInstance = this;
        LayerControls.instances.set(element, this);
        debugLog("New LayerControls:", element.id);
    }

    bindEvents() {
        this.element.querySelectorAll("[data-layer]").forEach((cb) => {
            const handler = () => {
                document.dispatchEvent(new CustomEvent("webgl:layer-toggle", {
                    detail: {
                        viewportId: this.config.viewportId,
                        layerId: cb.dataset.layer,
                        visible: cb.checked,
                    },
                }));
            };
            cb.addEventListener("change", handler);
            this.boundHandlers.push({ element: cb, event: "change", handler });
        });
    }

    destroy() {
        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];
        LayerControls.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-layer-controls]")
            .forEach((el) => new LayerControls(el));
    }
}
