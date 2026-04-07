/**
 * Insight UI WebGL — Utilities
 *
 * Global debugLog function, matching insight-ui's insight-ui-debug.js pattern.
 * Only outputs when window.JS_DEBUG is truthy.
 */

window.debugLog = window.debugLog || function (...args) {
    if (window.JS_DEBUG) {
        console.log("[InsightWebGL]", ...args);
    }
};
