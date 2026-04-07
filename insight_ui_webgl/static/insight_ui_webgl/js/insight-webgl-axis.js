/**
 * Insight UI WebGL — Axis
 *
 * Renders labeled X/Y/Z axes in a target viewport's scene.
 * Phantom div pattern: hidden HTML element carries config, JS creates Three.js objects.
 *
 * Extracted from onto-3dwiz Scene3D._createAxes().
 */

import * as THREE from "three";
import { WebGLViewport } from "./insight-webgl-viewport.js";

export class WebGLAxis {
    static instances = new WeakMap();

    constructor(element) {
        if (WebGLAxis.instances.has(element)) {
            return WebGLAxis.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this._group = null;
        this._viewport = null;

        // Read config from data attributes
        this.config = {
            viewportId: element.dataset.viewport ?? "webgl-viewport",
            xLabel: element.dataset.xLabel ?? "X",
            yLabel: element.dataset.yLabel ?? "Y",
            zLabel: element.dataset.zLabel ?? "Z",
            xColor: element.dataset.xColor ?? "#ff4444",
            yColor: element.dataset.yColor ?? "#44ff44",
            zColor: element.dataset.zColor ?? "#4444ff",
            xLength: parseInt(element.dataset.xLength ?? "100", 10),
            yLength: parseInt(element.dataset.yLength ?? "60", 10),
            zLength: parseInt(element.dataset.zLength ?? "50", 10),
        };

        this.bindEvents();
        this._tryInit();

        element.__insightInstance = this;
        WebGLAxis.instances.set(element, this);
        debugLog("New WebGLAxis:", element.id);
    }

    // ---- Public API ----

    /**
     * Update an axis label.
     * @param {"x"|"y"|"z"} axis
     * @param {string} text
     */
    setLabel(axis, text) {
        this.config[`${axis}Label`] = text;
        // Rebuild if already initialized
        if (this._viewport) {
            this._removeFromScene();
            this._createAxes();
        }
    }

    /**
     * Set visibility of the axes group.
     * @param {boolean} visible
     */
    setVisible(visible) {
        if (this._group) this._group.visible = visible;
    }

    // ---- Internal ----

    _tryInit() {
        const canvas = document.getElementById(this.config.viewportId);
        if (!canvas) return;

        this._viewport = WebGLViewport.instances.get(canvas);
        if (this._viewport) {
            this._createAxes();
        }
    }

    _createAxes() {
        const scene = this._viewport.getScene();
        if (!scene) return;

        this._group = new THREE.Group();
        this._group.name = `axes-${this.element.id}`;

        const { xColor, yColor, zColor, xLength, yLength, zLength } = this.config;

        const makeLine = (from, to, color) => {
            const geom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...from),
                new THREE.Vector3(...to),
            ]);
            const mat = new THREE.LineBasicMaterial({ color });
            return new THREE.Line(geom, mat);
        };

        // Axis lines
        this._group.add(makeLine([0, 0, 0], [xLength, 0, 0], xColor));
        this._group.add(makeLine([0, 0, 0], [0, yLength, 0], yColor));
        this._group.add(makeLine([0, 0, 0], [0, 0, zLength], zColor));

        // Labels as sprites
        const makeLabel = (text, position, color) => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = 128;
            canvas.height = 64;
            ctx.font = "bold 32px sans-serif";
            ctx.fillStyle = color;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, 64, 32);

            const texture = new THREE.CanvasTexture(canvas);
            const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(mat);
            sprite.position.set(...position);
            sprite.scale.set(4, 2, 1);
            return sprite;
        };

        const { xLabel, yLabel, zLabel } = this.config;
        this._group.add(makeLabel(xLabel, [xLength + 3, 0, 0], xColor));
        this._group.add(makeLabel(yLabel, [0, yLength + 3, 0], yColor));
        this._group.add(makeLabel(zLabel, [0, 0, zLength + 3], zColor));

        scene.add(this._group);
    }

    _removeFromScene() {
        if (this._group) {
            this._group.parent?.remove(this._group);
            // Dispose geometries and materials
            this._group.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (obj.material.map) obj.material.map.dispose();
                    obj.material.dispose();
                }
            });
            this._group = null;
        }
    }

    // ---- Events ----

    bindEvents() {
        // Listen for viewport-ready in case viewport initializes after us
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
        debugLog("Destroy WebGLAxis:", this.element?.id);

        this._removeFromScene();

        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];

        WebGLAxis.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-webgl-axis]")
            .forEach((el) => new WebGLAxis(el));
    }
}
