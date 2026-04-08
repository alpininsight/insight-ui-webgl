/**
 * Insight UI WebGL — Utilities
 *
 * Shared utilities for insight-ui-webgl components:
 * - debugLog: same pattern as insight-ui's insight-ui-debug.js
 * - getCssVar: resolves insight-ui design tokens with fallback
 *
 * Design token policy: components should NEVER hardcode colors as their
 * primary source. Colors flow through:
 *   1. data-* attribute on the HTML element (user override)
 *   2. CSS variable on :root (insight-ui theme token)
 *   3. Hardcoded fallback baked into the JS class (last resort)
 *
 * The CSS variable path is what makes insight-ui-webgl themable by the
 * host app — dark/light mode, brand colors, and accessibility overrides
 * all flow through insight-ui's existing token system.
 *
 * See insight-ui issue #129 for the WebGL-specific tokens this reader
 * is designed to consume once they ship upstream.
 */

window.debugLog = window.debugLog || function (...args) {
    if (window.JS_DEBUG) {
        console.log("[InsightWebGL]", ...args);
    }
};

/**
 * Read a CSS custom property from :root, with fallback.
 * Resolution order:
 *   1. getComputedStyle(document.documentElement).getPropertyValue(name)
 *   2. fallback
 *
 * @param {string} name — CSS custom property name (e.g. "--color-insight-primary")
 * @param {string} fallback — value to use when the variable is not defined
 * @returns {string}
 */
window.InsightWebGLUtils = window.InsightWebGLUtils || {};
window.InsightWebGLUtils.getCssVar = function (name, fallback) {
    try {
        const value = getComputedStyle(document.documentElement)
            .getPropertyValue(name)
            .trim();
        return value || fallback;
    } catch {
        return fallback;
    }
};

/**
 * Resolve a color config value using the 3-tier policy:
 *   1. explicit (from data attribute)
 *   2. CSS variable
 *   3. hardcoded fallback
 *
 * @param {string|undefined|null} explicit
 * @param {string} cssVarName
 * @param {string} hardcodedFallback
 * @returns {string}
 */
window.InsightWebGLUtils.resolveColor = function (explicit, cssVarName, hardcodedFallback) {
    if (explicit && explicit.length > 0) return explicit;
    return window.InsightWebGLUtils.getCssVar(cssVarName, hardcodedFallback);
};
