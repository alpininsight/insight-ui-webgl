/**
 * Insight UI WebGL — Component Initializer
 *
 * Follows the same pattern as insight-ui's insight-ui-init.js:
 * - Import all component classes
 * - Expose on window.InsightWebGL for lifecycle cleanup
 * - initAll() on DOMContentLoaded and htmx:afterSwap
 * - HTMX cleanup hooks via __insightInstance
 */

// Phase 1: WebGL Atoms (Foundation)
import { WebGLViewport } from "./insight-webgl-viewport.js";
import { WebGLAxis } from "./insight-webgl-axis.js";
import { WebGLGrid } from "./insight-webgl-grid.js";

// Phase 2: WebGL Overlays
import { WebGLOverlayText } from "./insight-webgl-overlay-text.js";
import { WebGLOverlayLink } from "./insight-webgl-overlay-link.js";
import { WebGLThresholdPlane } from "./insight-webgl-threshold-plane.js";

// Phase 3: Event System
import { InsightEventQueue } from "./insight-webgl-event-queue.js";
import { InsightEventRegistry } from "./insight-webgl-event-registry.js";
import { InsightSSETransport } from "./insight-webgl-sse-transport.js";
import { InsightWSTransport } from "./insight-webgl-ws-transport.js";

// Phase 4: HTML Atoms
import { StreamStatus } from "./insight-webgl-stream-status.js";
import { DataBadge } from "./insight-webgl-data-badge.js";
import { DataItem } from "./insight-webgl-data-item.js";

// Phase 5: Molecules — uncomment when implemented
// import { WebGLStreamingChart } from "./insight-webgl-streaming-chart.js";
// import { WebGLOverlayPanel } from "./insight-webgl-overlay-panel.js";
// import { DataFeed } from "./insight-webgl-data-feed.js";
// import { EntityLegend } from "./insight-webgl-entity-legend.js";
// import { PlaybackControls } from "./insight-webgl-playback-controls.js";
// import { LayerControls } from "./insight-webgl-layer-controls.js";

// Expose component classes for lifecycle cleanup lookups
window.InsightWebGL = window.InsightWebGL || {};
Object.assign(window.InsightWebGL, {
    // Phase 1
    WebGLViewport,
    WebGLAxis,
    WebGLGrid,
    // Phase 2
    WebGLOverlayText,
    WebGLOverlayLink,
    WebGLThresholdPlane,
    // Phase 3
    InsightEventQueue,
    InsightEventRegistry,
    InsightSSETransport,
    InsightWSTransport,
    // Phase 4
    StreamStatus,
    DataBadge,
    DataItem,
    // Phase 5
    // WebGLStreamingChart,
    // WebGLOverlayPanel,
    // DataFeed,
    // EntityLegend,
    // PlaybackControls,
    // LayerControls,
});

function initAll() {
    // Phase 3: Event system first (infrastructure — transports may auto-connect)
    InsightEventQueue.initAll();
    InsightEventRegistry.initAll();
    InsightSSETransport.initAll();
    InsightWSTransport.initAll();

    // Phase 1: WebGL atoms (viewport must be first)
    WebGLViewport.initAll();
    WebGLAxis.initAll();
    WebGLGrid.initAll();

    // Phase 2: WebGL overlays
    WebGLOverlayText.initAll();
    WebGLOverlayLink.initAll();
    WebGLThresholdPlane.initAll();

    // Phase 4: HTML atoms
    StreamStatus.initAll();
    DataBadge.initAll();
    DataItem.initAll();

    // Phase 5: Molecules (after atoms — they find child atom instances)
    // WebGLStreamingChart.initAll();
    // WebGLOverlayPanel.initAll();
    // DataFeed.initAll();
    // EntityLegend.initAll();
    // PlaybackControls.initAll();
    // LayerControls.initAll();
}

document.addEventListener("DOMContentLoaded", () => {
    debugLog("InsightWebGL initializing...");

    // Register HTMX cleanup hooks to prevent memory leaks
    // Same pattern as insight-ui: __insightInstance.destroy() on element removal
    if (typeof htmx !== "undefined") {
        htmx.on("htmx:beforeCleanupElement", (evt) => {
            const el = evt.detail.elt;
            if (el.__insightInstance?.destroy) {
                el.__insightInstance.destroy();
            }
        });
    }

    // Initialize all component instances
    initAll();

    // Re-init after htmx DOM manipulation (WeakMap guard prevents duplicates)
    if (typeof htmx !== "undefined") {
        htmx.on("htmx:afterSwap", () => {
            debugLog("InsightWebGL: re-initializing after htmx swap...");
            initAll();
        });
    }

    debugLog("InsightWebGL initialized!");
});
