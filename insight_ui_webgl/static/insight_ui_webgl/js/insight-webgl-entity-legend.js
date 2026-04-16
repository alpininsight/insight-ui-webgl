/**
 * Insight UI WebGL — Entity Legend (Molecule)
 *
 * Auto-growing container of DataBadge atoms. Listens for
 * webgl:entity-register to add new badges dynamically.
 */

import { DataBadge } from "./insight-webgl-data-badge.js";

export class EntityLegend {
    static instances = new WeakMap();

    constructor(element) {
        if (EntityLegend.instances.has(element)) {
            return EntityLegend.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this._entities = new Map();

        this.config = {
            viewportId: element.dataset.viewport ?? "",
        };

        this.bindEvents();

        element.__insightInstance = this;
        EntityLegend.instances.set(element, this);
        debugLog("New EntityLegend:", element.id);
    }

    addEntity(id, label, color) {
        if (this._entities.has(id)) return;

        const badge = document.createElement("span");
        badge.setAttribute("data-data-badge", "");
        badge.setAttribute("data-entity", id);
        badge.setAttribute("data-color", color);
        badge.setAttribute("role", "button");
        badge.setAttribute("tabindex", "0");
        badge.setAttribute("aria-pressed", "true");
        badge.className = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border border-gray-200 dark:border-gray-600 cursor-pointer select-none";
        badge.innerHTML = `<span class="inline-block w-2 h-2 rounded-full" style="background-color:${color}"></span><span data-badge-label>${label}</span>`;

        this.element.appendChild(badge);
        new DataBadge(badge);

        this._entities.set(id, badge);
    }

    removeEntity(id) {
        const badge = this._entities.get(id);
        if (!badge) return;
        const inst = DataBadge.instances.get(badge);
        if (inst) inst.destroy();
        badge.remove();
        this._entities.delete(id);
    }

    bindEvents() {
        this._onRegister = (e) => {
            const { entity, color } = e.detail;
            if (entity) this.addEntity(entity, entity, color || "#888888");
        };
        document.addEventListener("webgl:entity-register", this._onRegister);
        this.boundHandlers.push({ element: document, event: "webgl:entity-register", handler: this._onRegister });
    }

    destroy() {
        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];
        this._entities.clear();
        EntityLegend.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-entity-legend]")
            .forEach((el) => new EntityLegend(el));
    }
}
