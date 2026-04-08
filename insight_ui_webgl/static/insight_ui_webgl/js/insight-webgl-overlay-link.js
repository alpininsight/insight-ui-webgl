/**
 * Insight UI WebGL — Overlay Link
 *
 * Manages lines between two 3D points in a target viewport. Generic — no
 * domain-specific terminology. Color is selected from a configurable color
 * map keyed by link type, with fallback to a default color.
 *
 * Extracted from onto-3dwiz RiskLinks (static/js/webgl/links.js).
 */

import * as THREE from "three";
import { WebGLViewport } from "./insight-webgl-viewport.js";

export class WebGLOverlayLink {
    static instances = new WeakMap();

    constructor(element) {
        if (WebGLOverlayLink.instances.has(element)) {
            return WebGLOverlayLink.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this._group = null;
        this._viewport = null;
        this._items = new Map();  // id -> THREE.Line

        // Parse color_map JSON
        let colorMap = {};
        const raw = element.dataset.colorMap;
        if (raw) {
            try {
                colorMap = JSON.parse(raw);
            } catch (err) {
                console.warn("[WebGLOverlayLink] Failed to parse color_map:", err);
            }
        }

        // Color defaults resolve via insight-ui tokens — see issue #129.
        this.config = {
            viewportId: element.dataset.viewport ?? "webgl-viewport",
            colorMap,
            defaultColor: InsightWebGLUtils.resolveColor(
                element.dataset.defaultColor, "--color-insight-webgl-link", "#ffffff"),
        };

        this.bindEvents();
        this._tryInit();

        element.__insightInstance = this;
        WebGLOverlayLink.instances.set(element, this);
        debugLog("New WebGLOverlayLink:", element.id);
    }

    // ---- Public API ----

    /**
     * Create a line between two 3D points.
     * @param {string} id — unique link id
     * @param {Array<number>} from — [x, y, z] source position
     * @param {Array<number>} to — [x, y, z] target position
     * @param {string} [linkType] — key into color_map
     * @param {number} [weight=0.5] — 0..1, controls opacity
     */
    create(id, from, to, linkType, weight = 0.5) {
        if (!this._group) return;
        this.remove(id);

        const colorHex = this.config.colorMap[linkType] ?? this.config.defaultColor;
        const opacity = 0.3 + Math.max(0, Math.min(1, weight)) * 0.7;

        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...from),
            new THREE.Vector3(...to),
        ]);
        const material = new THREE.LineBasicMaterial({
            color: new THREE.Color(colorHex),
            transparent: true,
            opacity,
        });
        const line = new THREE.Line(geometry, material);
        line.userData = { linkType, weight };

        this._items.set(id, line);
        this._group.add(line);
    }

    remove(id) {
        const line = this._items.get(id);
        if (!line) return;
        this._group.remove(line);
        line.geometry.dispose();
        line.material.dispose();
        this._items.delete(id);
    }

    /**
     * Update link endpoints.
     * @param {string} id
     * @param {Array<number>} from
     * @param {Array<number>} to
     */
    updatePosition(id, from, to) {
        const line = this._items.get(id);
        if (!line) return;
        const positions = line.geometry.attributes.position.array;
        positions[0] = from[0]; positions[1] = from[1]; positions[2] = from[2];
        positions[3] = to[0]; positions[4] = to[1]; positions[5] = to[2];
        line.geometry.attributes.position.needsUpdate = true;
    }

    setVisible(visible) {
        if (this._group) this._group.visible = visible;
    }

    /**
     * Set opacity for all links in the group.
     * @param {number} opacity 0..1
     */
    setGroupOpacity(opacity) {
        if (!this._group) return;
        this._group.traverse((child) => {
            if (child.material) child.material.opacity = opacity;
        });
    }

    has(id) {
        return this._items.has(id);
    }

    getIds() {
        return [...this._items.keys()];
    }

    // ---- Internal ----

    _tryInit() {
        const canvas = document.getElementById(this.config.viewportId);
        if (!canvas) return;
        this._viewport = WebGLViewport.instances.get(canvas);
        if (this._viewport) this._createGroup();
    }

    _createGroup() {
        const scene = this._viewport.getScene();
        if (!scene) return;
        this._group = new THREE.Group();
        this._group.name = `overlay-link-${this.element.id}`;
        scene.add(this._group);
    }

    // ---- Events ----

    bindEvents() {
        this._onViewportReady = (e) => {
            if (e.detail.viewportId === this.config.viewportId && !this._viewport) {
                this._tryInit();
            }
        };
        document.addEventListener("webgl:viewport-ready", this._onViewportReady);
        this.boundHandlers.push({
            element: document,
            event: "webgl:viewport-ready",
            handler: this._onViewportReady,
        });
    }

    // ---- Lifecycle ----

    destroy() {
        debugLog("Destroy WebGLOverlayLink:", this.element?.id);

        for (const id of [...this._items.keys()]) {
            this.remove(id);
        }
        if (this._group) {
            this._group.parent?.remove(this._group);
            this._group = null;
        }

        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];

        WebGLOverlayLink.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-webgl-overlay-link]")
            .forEach((el) => new WebGLOverlayLink(el));
    }
}
