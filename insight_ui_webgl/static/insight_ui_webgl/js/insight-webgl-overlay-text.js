/**
 * Insight UI WebGL — Overlay Text
 *
 * Manages text sprite annotations with connecting lines in a target viewport.
 * Generic — no domain-specific terminology. Suitable for any annotation use case.
 *
 * Extracted from onto-3dwiz Annotations (static/js/webgl/annotations.js).
 */

import * as THREE from "three";
import { WebGLViewport } from "./insight-webgl-viewport.js";

export class WebGLOverlayText {
    static instances = new WeakMap();

    constructor(element) {
        if (WebGLOverlayText.instances.has(element)) {
            return WebGLOverlayText.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this._group = null;
        this._viewport = null;
        this._items = new Map();  // id -> { sprite, line }

        // Color defaults resolve via insight-ui tokens — see issue #129.
        this.config = {
            viewportId: element.dataset.viewport ?? "webgl-viewport",
            offsetY: parseFloat(element.dataset.offsetY ?? "8"),
            defaultColor: InsightWebGLUtils.resolveColor(
                element.dataset.defaultColor, "--color-insight-webgl-annotation", "#ffcc00"),
            bgColor: element.dataset.bgColor ?? "rgba(0,0,0,0.7)",
            maxWidth: parseInt(element.dataset.maxWidth ?? "200", 10),
        };

        this.bindEvents();
        this._tryInit();

        element.__insightInstance = this;
        WebGLOverlayText.instances.set(element, this);
        debugLog("New WebGLOverlayText:", element.id);
    }

    // ---- Public API ----

    /**
     * Create a text annotation anchored at a 3D position.
     * @param {string} id — unique annotation id
     * @param {string} text — text content
     * @param {Array<number>} anchorPosition — [x, y, z] anchor in world space
     * @param {object} [options]
     * @param {number} [options.offsetY] — vertical offset above anchor
     * @param {string} [options.color]
     * @param {string} [options.bgColor]
     * @param {number} [options.maxWidth]
     */
    create(id, text, anchorPosition, options = {}) {
        if (!this._group) return;

        const offsetY = options.offsetY ?? this.config.offsetY;
        const color = options.color ?? this.config.defaultColor;
        const bgColor = options.bgColor ?? this.config.bgColor;
        const maxWidth = options.maxWidth ?? this.config.maxWidth;

        // Remove existing with same id
        this.remove(id);

        // Build text sprite via canvas texture
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const fontSize = 28;
        ctx.font = `${fontSize}px sans-serif`;

        let displayText = text;
        if (ctx.measureText(text).width > maxWidth) {
            while (ctx.measureText(displayText + "…").width > maxWidth && displayText.length > 0) {
                displayText = displayText.slice(0, -1);
            }
            displayText += "…";
        }

        const metrics = ctx.measureText(displayText);
        canvas.width = Math.ceil(metrics.width) + 20;
        canvas.height = fontSize + 16;

        // Background
        ctx.fillStyle = bgColor;
        if (ctx.roundRect) {
            ctx.roundRect(0, 0, canvas.width, canvas.height, 4);
        } else {
            ctx.rect(0, 0, canvas.width, canvas.height);
        }
        ctx.fill();

        // Text
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = color;
        ctx.textBaseline = "middle";
        ctx.fillText(displayText, 10, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;

        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        const spritePos = [
            anchorPosition[0],
            anchorPosition[1] + offsetY,
            anchorPosition[2],
        ];
        sprite.position.set(...spritePos);
        sprite.scale.set((canvas.width / canvas.height) * 4, 4, 1);

        // Connecting line
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...anchorPosition),
            new THREE.Vector3(...spritePos),
        ]);
        const lineMat = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0.8,
        });
        const line = new THREE.Line(lineGeom, lineMat);

        this._items.set(id, { sprite, line, offsetY });
        this._group.add(sprite, line);
    }

    /**
     * Remove an annotation by id.
     * @param {string} id
     */
    remove(id) {
        const entry = this._items.get(id);
        if (!entry) return;
        this._group.remove(entry.sprite, entry.line);
        entry.sprite.material.map?.dispose();
        entry.sprite.material.dispose();
        entry.line.geometry.dispose();
        entry.line.material.dispose();
        this._items.delete(id);
    }

    /**
     * Update an annotation's anchor position. Used for sliding-window charts.
     * @param {string} id
     * @param {Array<number>} newAnchor — [x, y, z]
     * @param {number} [offsetY] — override offset
     */
    updatePosition(id, newAnchor, offsetY) {
        const entry = this._items.get(id);
        if (!entry) return;
        const oy = offsetY ?? entry.offsetY;
        const spritePos = [newAnchor[0], newAnchor[1] + oy, newAnchor[2]];
        entry.sprite.position.set(...spritePos);

        const positions = entry.line.geometry.attributes.position.array;
        positions[0] = newAnchor[0];
        positions[1] = newAnchor[1];
        positions[2] = newAnchor[2];
        positions[3] = spritePos[0];
        positions[4] = spritePos[1];
        positions[5] = spritePos[2];
        entry.line.geometry.attributes.position.needsUpdate = true;
    }

    has(id) {
        return this._items.has(id);
    }

    getIds() {
        return [...this._items.keys()];
    }

    setVisible(visible) {
        if (this._group) this._group.visible = visible;
    }

    // ---- Internal ----

    _tryInit() {
        const canvas = document.getElementById(this.config.viewportId);
        if (!canvas) return;

        this._viewport = WebGLViewport.instances.get(canvas);
        if (this._viewport) {
            this._createGroup();
        }
    }

    _createGroup() {
        const scene = this._viewport.getScene();
        if (!scene) return;
        this._group = new THREE.Group();
        this._group.name = `overlay-text-${this.element.id}`;
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
        debugLog("Destroy WebGLOverlayText:", this.element?.id);

        // Dispose all items
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

        WebGLOverlayText.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-webgl-overlay-text]")
            .forEach((el) => new WebGLOverlayText(el));
    }
}
