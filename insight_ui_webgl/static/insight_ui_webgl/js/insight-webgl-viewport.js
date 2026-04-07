/**
 * Insight UI WebGL — Viewport
 *
 * Foundation component: wraps Three.js renderer, camera, OrbitControls, and lighting.
 * Every other WebGL component targets a viewport by ID.
 *
 * Extracted from onto-3dwiz Scene3D (static/js/webgl/scene.js).
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class WebGLViewport {
    static instances = new WeakMap();

    constructor(element) {
        if (WebGLViewport.instances.has(element)) {
            return WebGLViewport.instances.get(element);
        }

        this.canvas = element;
        this.element = element;
        this.boundHandlers = [];

        // Read config from data attributes
        this.config = {
            capacity: parseInt(element.dataset.capacity ?? "500", 10),
            maxEntities: parseInt(element.dataset.maxEntities ?? "20", 10),
            cameraMode: element.dataset.cameraMode ?? "perspective",
            cameraPosition: (element.dataset.cameraPosition ?? "50,30,50")
                .split(",").map(Number),
            cameraTarget: (element.dataset.cameraTarget ?? "50,30,0")
                .split(",").map(Number),
            fov: parseInt(element.dataset.fov ?? "60", 10),
            bgColor: element.dataset.bgColor ?? "#1a1a2e",
            showAxes: element.dataset.showAxes === "true",
        };

        // Three.js core
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this._animationId = null;
        this._updateCallbacks = new Set();

        this._initScene();
        this.bindEvents();

        element.__insightInstance = this;
        WebGLViewport.instances.set(element, this);
        debugLog("New WebGLViewport:", element.id);

        // Notify other components that this viewport is ready
        document.dispatchEvent(new CustomEvent("webgl:viewport-ready", {
            detail: { viewportId: element.id },
        }));
    }

    // ---- Scene Setup ----

    _initScene() {
        const { cameraMode, cameraPosition, cameraTarget, fov, bgColor } = this.config;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false,
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(new THREE.Color(bgColor));

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight || 1;
        if (cameraMode === "orthographic") {
            const frustum = 50;
            this.camera = new THREE.OrthographicCamera(
                -frustum * aspect, frustum * aspect,
                frustum, -frustum, 0.1, 2000
            );
        } else {
            this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000);
        }
        this.camera.position.set(...cameraPosition);

        // Controls
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(...cameraTarget);
        this.camera.lookAt(...cameraTarget);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(50, 50, 50);
        this.scene.add(ambient, directional);

        // Initial resize
        this._handleResize();
    }

    // ---- Public API ----

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getControls() {
        return this.controls;
    }

    /**
     * Register a per-frame callback.
     * @param {function(number): void} fn — receives delta time in seconds
     */
    onUpdate(fn) {
        this._updateCallbacks.add(fn);
    }

    /**
     * Remove a per-frame callback.
     * @param {function} fn
     */
    offUpdate(fn) {
        this._updateCallbacks.delete(fn);
    }

    /**
     * Start the render loop.
     */
    start() {
        if (this._animationId !== null) return;
        let lastTime = performance.now();
        const animate = (now) => {
            this._animationId = requestAnimationFrame(animate);
            const dt = (now - lastTime) / 1000;
            lastTime = now;

            this.controls.update();
            for (const cb of this._updateCallbacks) {
                cb(dt);
            }
            this.renderer.render(this.scene, this.camera);
        };
        this._animationId = requestAnimationFrame(animate);
    }

    /**
     * Stop the render loop.
     */
    stop() {
        if (this._animationId !== null) {
            cancelAnimationFrame(this._animationId);
            this._animationId = null;
        }
    }

    /**
     * Manually trigger a resize.
     */
    resize() {
        this._handleResize();
    }

    // ---- Events ----

    bindEvents() {
        // Resize observer on parent container
        this._resizeObserver = new ResizeObserver(() => this._handleResize());
        const container = this.canvas.parentElement;
        if (container) {
            this._resizeObserver.observe(container);
        }

        // Camera sync for multi-viewport
        this._onCameraSync = (e) => {
            const { position, target, source } = e.detail;
            if (source === this.canvas.id) return;  // Don't sync with self
            if (position) this.camera.position.set(...position);
            if (target) this.controls.target.set(...target);
        };
        document.addEventListener("webgl:camera-sync", this._onCameraSync);
        this.boundHandlers.push({
            element: document,
            event: "webgl:camera-sync",
            handler: this._onCameraSync,
        });
    }

    _handleResize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;

        this.renderer.setSize(w, h);

        if (this.camera.isPerspectiveCamera) {
            this.camera.aspect = w / h;
        } else {
            const frustum = 50;
            this.camera.left = -frustum * (w / h);
            this.camera.right = frustum * (w / h);
        }
        this.camera.updateProjectionMatrix();

        document.dispatchEvent(new CustomEvent("webgl:viewport-resize", {
            detail: { viewportId: this.canvas.id, width: w, height: h },
        }));
    }

    // ---- Lifecycle ----

    destroy() {
        debugLog("Destroy WebGLViewport:", this.canvas?.id);

        this.stop();

        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }

        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];

        if (this.controls) this.controls.dispose();
        if (this.renderer) this.renderer.dispose();
        if (this.scene) this.scene.clear();
        this._updateCallbacks.clear();

        WebGLViewport.instances.delete(this.canvas);
        if (this.canvas) delete this.canvas.__insightInstance;
        this.canvas = null;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-webgl-viewport]")
            .forEach((el) => {
                const vp = new WebGLViewport(el);
                vp.start();
            });
    }
}
