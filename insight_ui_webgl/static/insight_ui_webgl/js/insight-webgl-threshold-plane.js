/**
 * Insight UI WebGL — Threshold Plane
 *
 * Renders a horizontal semi-transparent plane at a configurable Y height,
 * with a border line for visibility. Useful for thresholds, alert levels,
 * baselines, or any horizontal reference in a 3D scene.
 *
 * Extracted from onto-3dwiz ThresholdPlane (static/js/webgl/threshold.js).
 */

import * as THREE from "three";
import { WebGLViewport } from "./insight-webgl-viewport.js";

export class WebGLThresholdPlane {
    static instances = new WeakMap();

    constructor(element) {
        if (WebGLThresholdPlane.instances.has(element)) {
            return WebGLThresholdPlane.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this._plane = null;
        this._border = null;
        this._viewport = null;

        this.config = {
            viewportId: element.dataset.viewport ?? "webgl-viewport",
            height: parseFloat(element.dataset.height ?? "0"),
            color: element.dataset.color ?? "#ff4444",
            opacity: parseFloat(element.dataset.opacity ?? "0.15"),
            width: parseInt(element.dataset.width ?? "100", 10),
            depth: parseInt(element.dataset.depth ?? "50", 10),
            visible: element.dataset.visible !== "false",
        };

        this.bindEvents();
        this._tryInit();

        element.__insightInstance = this;
        WebGLThresholdPlane.instances.set(element, this);
        debugLog("New WebGLThresholdPlane:", element.id);
    }

    // ---- Public API ----

    /**
     * Set the Y height of the plane.
     * @param {number} y
     */
    setHeight(y) {
        this.config.height = y;
        if (this._plane) this._plane.position.y = y;
        if (this._border) {
            const positions = this._border.geometry.attributes.position.array;
            positions[1] = y;
            positions[4] = y;
            this._border.geometry.attributes.position.needsUpdate = true;
        }
    }

    setVisible(visible) {
        this.config.visible = visible;
        if (this._plane) this._plane.visible = visible;
        if (this._border) this._border.visible = visible;
    }

    /**
     * Set the plane and border color.
     * @param {string} hexColor
     */
    setColor(hexColor) {
        this.config.color = hexColor;
        const c = new THREE.Color(hexColor);
        if (this._plane) this._plane.material.color.copy(c);
        if (this._border) this._border.material.color.copy(c);
    }

    // ---- Internal ----

    _tryInit() {
        const canvas = document.getElementById(this.config.viewportId);
        if (!canvas) return;
        this._viewport = WebGLViewport.instances.get(canvas);
        if (this._viewport) this._createPlane();
    }

    _createPlane() {
        const scene = this._viewport.getScene();
        if (!scene) return;

        const { width, depth, height, color, opacity, visible } = this.config;
        const colorObj = new THREE.Color(color);

        // Semi-transparent plane
        const geometry = new THREE.PlaneGeometry(width, depth);
        const material = new THREE.MeshBasicMaterial({
            color: colorObj,
            transparent: true,
            opacity,
            side: THREE.DoubleSide,
        });
        this._plane = new THREE.Mesh(geometry, material);
        this._plane.name = `threshold-plane-${this.element.id}`;
        this._plane.rotation.x = -Math.PI / 2;
        this._plane.position.set(width / 2, height, depth / 2);
        this._plane.visible = visible;

        // Border line for visibility
        const borderGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, height, 0),
            new THREE.Vector3(width, height, 0),
        ]);
        const borderMat = new THREE.LineBasicMaterial({
            color: colorObj,
            transparent: true,
            opacity: 0.6,
        });
        this._border = new THREE.Line(borderGeo, borderMat);
        this._border.name = `threshold-border-${this.element.id}`;
        this._border.visible = visible;

        scene.add(this._plane);
        scene.add(this._border);

        // Listen for height changes via custom event
        this._onHeightChange = (e) => {
            if (e.detail.thresholdId && e.detail.thresholdId !== this.element.id) return;
            if (typeof e.detail.height === "number") this.setHeight(e.detail.height);
        };
        document.addEventListener("webgl:threshold-change", this._onHeightChange);
        this.boundHandlers.push({
            element: document,
            event: "webgl:threshold-change",
            handler: this._onHeightChange,
        });
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
        debugLog("Destroy WebGLThresholdPlane:", this.element?.id);

        if (this._plane) {
            this._plane.parent?.remove(this._plane);
            this._plane.geometry.dispose();
            this._plane.material.dispose();
            this._plane = null;
        }
        if (this._border) {
            this._border.parent?.remove(this._border);
            this._border.geometry.dispose();
            this._border.material.dispose();
            this._border = null;
        }

        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];

        WebGLThresholdPlane.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-webgl-threshold]")
            .forEach((el) => new WebGLThresholdPlane(el));
    }
}
