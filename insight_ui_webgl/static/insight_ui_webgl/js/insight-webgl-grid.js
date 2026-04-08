/**
 * Insight UI WebGL — Grid
 *
 * Renders a reference grid plane in a target viewport's scene.
 * Supports xz, xy, and yz orientations.
 * Phantom div pattern: hidden HTML element carries config, JS creates Three.js objects.
 */

import * as THREE from "three";
import { WebGLViewport } from "./insight-webgl-viewport.js";

export class WebGLGrid {
    static instances = new WeakMap();

    constructor(element) {
        if (WebGLGrid.instances.has(element)) {
            return WebGLGrid.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this._gridHelper = null;
        this._viewport = null;

        // Read config from data attributes.
        // Grid colors resolve via insight-ui tokens — see issue #129.
        this.config = {
            viewportId: element.dataset.viewport ?? "webgl-viewport",
            size: parseInt(element.dataset.size ?? "100", 10),
            divisions: parseInt(element.dataset.divisions ?? "10", 10),
            colorCenter: InsightWebGLUtils.resolveColor(
                element.dataset.colorCenter, "--color-insight-webgl-grid-center", "#444466"),
            colorGrid: InsightWebGLUtils.resolveColor(
                element.dataset.colorGrid, "--color-insight-webgl-grid-line", "#22223a"),
            plane: element.dataset.plane ?? "xz",
            visible: element.dataset.visible !== "false",
        };

        this.bindEvents();
        this._tryInit();

        element.__insightInstance = this;
        WebGLGrid.instances.set(element, this);
        debugLog("New WebGLGrid:", element.id);
    }

    // ---- Public API ----

    /**
     * Set visibility of the grid.
     * @param {boolean} visible
     */
    setVisible(visible) {
        if (this._gridHelper) this._gridHelper.visible = visible;
    }

    /**
     * Update grid size and divisions.
     * @param {number} size
     * @param {number} divisions
     */
    setSize(size, divisions) {
        this.config.size = size;
        this.config.divisions = divisions;
        if (this._viewport) {
            this._removeFromScene();
            this._createGrid();
        }
    }

    // ---- Internal ----

    _tryInit() {
        const canvas = document.getElementById(this.config.viewportId);
        if (!canvas) return;

        this._viewport = WebGLViewport.instances.get(canvas);
        if (this._viewport) {
            this._createGrid();
        }
    }

    _createGrid() {
        const scene = this._viewport.getScene();
        if (!scene) return;

        const { size, divisions, colorCenter, colorGrid, plane, visible } = this.config;

        this._gridHelper = new THREE.GridHelper(
            size,
            divisions,
            new THREE.Color(colorCenter),
            new THREE.Color(colorGrid)
        );
        this._gridHelper.name = `grid-${this.element.id}`;
        this._gridHelper.visible = visible;

        // GridHelper defaults to xz plane. Rotate for other orientations.
        if (plane === "xy") {
            this._gridHelper.rotation.x = Math.PI / 2;
        } else if (plane === "yz") {
            this._gridHelper.rotation.z = Math.PI / 2;
        }

        // Center the grid at half its size (so it starts at origin)
        if (plane === "xz") {
            this._gridHelper.position.set(size / 2, 0, size / 2);
        } else if (plane === "xy") {
            this._gridHelper.position.set(size / 2, size / 2, 0);
        } else if (plane === "yz") {
            this._gridHelper.position.set(0, size / 2, size / 2);
        }

        scene.add(this._gridHelper);
    }

    _removeFromScene() {
        if (this._gridHelper) {
            this._gridHelper.parent?.remove(this._gridHelper);
            this._gridHelper.geometry?.dispose();
            this._gridHelper.material?.dispose();
            this._gridHelper = null;
        }
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
        debugLog("Destroy WebGLGrid:", this.element?.id);

        this._removeFromScene();

        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];

        WebGLGrid.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-webgl-grid]")
            .forEach((el) => new WebGLGrid(el));
    }
}
