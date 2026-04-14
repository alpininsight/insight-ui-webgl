/**
 * Insight UI WebGL — Streaming Chart (Molecule)
 *
 * Composes viewport + axis + grid and adds the StreamingNodes engine
 * (InstancedMesh + ring buffer + sliding window). Provides the public
 * API for adding data points and ticking the time axis.
 *
 * Extracted from onto-3dwiz StreamingNodes (static/js/webgl/nodes.js)
 * and app.js wiring code.
 */

import * as THREE from "three";
import { WebGLViewport } from "./insight-webgl-viewport.js";

const _dummy = new THREE.Object3D();

export class WebGLStreamingChart {
    static instances = new WeakMap();

    constructor(element) {
        if (WebGLStreamingChart.instances.has(element)) {
            return WebGLStreamingChart.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this._viewport = null;
        this._mesh = null;
        this._entities = new Map();
        this._nextLane = 0;
        this._timeOffset = 0;
        this._tickPending = false;
        this._tickTimer = null;

        this.config = {
            laneSpacing: parseInt(element.dataset.laneSpacing ?? "10", 10),
            timeScale: parseFloat(element.dataset.timeScale ?? "0.2"),
            valueScale: parseFloat(element.dataset.valueScale ?? "0.3"),
            sphereRadius: parseFloat(element.dataset.sphereRadius ?? "0.25"),
            sphereDetail: parseInt(element.dataset.sphereDetail ?? "5", 10),
            tickDebounceMs: parseInt(element.dataset.tickDebounce ?? "30", 10),
        };

        // Derived from viewport capacity
        this._capacity = 500;
        this._maxEntities = 20;
        this._windowWidth = 100;
        this._totalSlots = 0;

        this.bindEvents();
        this._tryInit();

        element.__insightInstance = this;
        WebGLStreamingChart.instances.set(element, this);
        debugLog("New WebGLStreamingChart:", element.id);
    }

    // ---- Public API ----

    /**
     * Add a data point for an entity.
     * @param {string} entity — unique entity identifier (e.g. "BTC-USD")
     * @param {number} value — the Y-axis value (e.g. price)
     */
    addPoint(entity, value) {
        if (!this._mesh) return;

        if (!this._entities.has(entity)) {
            if (this._entities.size >= this._maxEntities) return;
            this._registerEntity(entity);
        }

        const info = this._entities.get(entity);
        info.prices[info.head] = value;
        info.head = (info.head + 1) % this._capacity;
        info.count = Math.min(info.count + 1, this._capacity);

        this._scheduleTick();
    }

    /**
     * Advance time and reposition all visible points. Called automatically
     * via debounced timer after addPoint, or manually for step-forward.
     */
    tick() {
        if (!this._mesh) return;
        this._timeOffset++;
        this._rebuildPositions();

        document.dispatchEvent(new CustomEvent("webgl:chart-tick", {
            detail: { chartId: this.element.id, timeOffset: this._timeOffset },
        }));
    }

    getEntities() {
        return [...this._entities.keys()];
    }

    getEntityLane(entity) {
        const info = this._entities.get(entity);
        return info ? info.lane * this.config.laneSpacing : null;
    }

    getEntityCount(entity) {
        const info = this._entities.get(entity);
        return info ? info.count : 0;
    }

    getEntityColor(entity) {
        const info = this._entities.get(entity);
        return info ? "#" + info.color.getHexString() : null;
    }

    getTimePosition() {
        return this._timeOffset * this.config.timeScale;
    }

    getXForAge(entity, ticksAgo) {
        const info = this._entities.get(entity);
        if (!info) return null;
        const count = info.count;
        if (ticksAgo >= count) return null;
        const i = count - 1 - ticksAgo;
        return (i / Math.max(count - 1, 1)) * this._windowWidth;
    }

    getWindowWidth() {
        return this._windowWidth;
    }

    setVisible(visible) {
        if (this._mesh) this._mesh.visible = visible;
    }

    // ---- Internal ----

    _tryInit() {
        // Find the child viewport
        const vpEl = this.element.querySelector("[data-webgl-viewport]");
        if (!vpEl) return;

        this._viewport = WebGLViewport.instances.get(vpEl);
        if (!this._viewport) return;

        // Read capacity from viewport config
        this._capacity = this._viewport.config.capacity;
        this._maxEntities = this._viewport.config.maxEntities;
        this._windowWidth = this._capacity * this.config.timeScale;
        this._totalSlots = this._capacity * this._maxEntities;

        this._createMesh();

        // Register per-frame update for debounced ticking
        this._viewport.onUpdate(() => {
            if (this._tickPending) {
                this.tick();
                this._tickPending = false;
            }
        });
    }

    _createMesh() {
        const scene = this._viewport.getScene();
        const { sphereRadius, sphereDetail } = this.config;

        const geometry = new THREE.SphereGeometry(sphereRadius, sphereDetail, sphereDetail);
        const material = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 40 });

        this._mesh = new THREE.InstancedMesh(geometry, material, this._totalSlots);
        this._mesh.name = `streaming-nodes-${this.element.id}`;
        this._mesh.count = 0;
        this._mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this._mesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(this._totalSlots * 3), 3,
        );
        this._mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

        // Hide all instances off-screen
        _dummy.position.set(0, -10000, 0);
        _dummy.updateMatrix();
        for (let i = 0; i < this._totalSlots; i++) {
            this._mesh.setMatrixAt(i, _dummy.matrix);
        }

        scene.add(this._mesh);
    }

    _registerEntity(entity) {
        const hue = (this._nextLane * 0.618033988749895) % 1;
        const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
        this._entities.set(entity, {
            lane: this._nextLane,
            head: 0,
            count: 0,
            color,
            prices: new Float32Array(this._capacity),
        });
        this._nextLane++;

        // Dispatch entity-register for legend auto-population
        document.dispatchEvent(new CustomEvent("webgl:entity-register", {
            detail: {
                chartId: this.element.id,
                entity,
                lane: (this._nextLane - 1) * this.config.laneSpacing,
                color: "#" + color.getHexString(),
            },
        }));
    }

    _scheduleTick() {
        if (this._tickTimer) clearTimeout(this._tickTimer);
        this._tickTimer = setTimeout(() => {
            this._tickPending = true;
            this._tickTimer = null;
        }, this.config.tickDebounceMs);
    }

    _rebuildPositions() {
        for (const [, info] of this._entities) {
            const count = info.count;
            const startIdx = (info.head - count + this._capacity) % this._capacity;

            for (let i = 0; i < count; i++) {
                const bufferIdx = (startIdx + i) % this._capacity;
                const price = info.prices[bufferIdx];

                const x = (i / Math.max(count - 1, 1)) * this._windowWidth;
                const y = price * this.config.valueScale;
                const z = info.lane * this.config.laneSpacing;

                const slotIdx = info.lane * this._capacity + i;
                _dummy.position.set(x, y, z);
                _dummy.updateMatrix();
                this._mesh.setMatrixAt(slotIdx, _dummy.matrix);
                this._mesh.setColorAt(slotIdx, info.color);
            }

            for (let i = count; i < this._capacity; i++) {
                const slotIdx = info.lane * this._capacity + i;
                _dummy.position.set(0, -10000, 0);
                _dummy.updateMatrix();
                this._mesh.setMatrixAt(slotIdx, _dummy.matrix);
            }
        }

        this._mesh.instanceMatrix.needsUpdate = true;
        if (this._mesh.instanceColor) this._mesh.instanceColor.needsUpdate = true;

        let total = 0;
        for (const info of this._entities.values()) total += info.count;
        this._mesh.count = total;
    }

    // ---- Events ----

    bindEvents() {
        this._onViewportReady = (e) => {
            if (!this._viewport) this._tryInit();
        };
        document.addEventListener("webgl:viewport-ready", this._onViewportReady);
        this.boundHandlers.push({ element: document, event: "webgl:viewport-ready", handler: this._onViewportReady });
    }

    // ---- Lifecycle ----

    destroy() {
        debugLog("Destroy WebGLStreamingChart:", this.element?.id);
        if (this._tickTimer) clearTimeout(this._tickTimer);
        if (this._mesh) {
            this._mesh.geometry.dispose();
            this._mesh.material.dispose();
            this._mesh.dispose();
            this._mesh.parent?.remove(this._mesh);
        }
        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];
        this._entities.clear();
        WebGLStreamingChart.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-webgl-streaming-chart]")
            .forEach((el) => new WebGLStreamingChart(el));
    }
}
