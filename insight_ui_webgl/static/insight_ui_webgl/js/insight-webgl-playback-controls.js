/**
 * Insight UI WebGL — Playback Controls (Molecule)
 *
 * Play/pause/step buttons + speed selector. Dispatches webgl:playback-*
 * custom events consumed by transports and charts.
 */

export class PlaybackControls {
    static instances = new WeakMap();

    constructor(element) {
        if (PlaybackControls.instances.has(element)) {
            return PlaybackControls.instances.get(element);
        }

        this.element = element;
        this.boundHandlers = [];
        this._paused = false;
        this._tickCount = 0;

        this.config = {
            viewportId: element.dataset.viewport ?? "",
        };

        // Populate speed select from data-speeds
        const speeds = (element.dataset.speeds ?? "0.5,1,2,5").split(",");
        const defaultSpeed = parseFloat(element.dataset.defaultSpeed ?? "1");
        const select = element.querySelector("[data-action='speed']");
        if (select && select.options.length === 0) {
            for (const s of speeds) {
                const opt = document.createElement("option");
                opt.value = s;
                opt.textContent = `${s}x`;
                if (parseFloat(s) === defaultSpeed) opt.selected = true;
                select.appendChild(opt);
            }
        }

        this.bindEvents();

        element.__insightInstance = this;
        PlaybackControls.instances.set(element, this);
        debugLog("New PlaybackControls:", element.id);
    }

    bindEvents() {
        const dispatch = (name, extra = {}) => {
            document.dispatchEvent(new CustomEvent(name, {
                detail: { viewportId: this.config.viewportId, ...extra },
            }));
        };

        this.element.querySelectorAll("[data-action]").forEach((btn) => {
            const action = btn.dataset.action;
            const handler = () => {
                if (action === "play") { this._paused = false; dispatch("webgl:playback-play"); }
                if (action === "pause") { this._paused = true; dispatch("webgl:playback-pause"); }
                if (action === "step-forward") dispatch("webgl:playback-step", { direction: "forward" });
                if (action === "step-back") dispatch("webgl:playback-step", { direction: "backward" });
                if (action === "speed") dispatch("webgl:playback-speed", { speed: parseFloat(btn.value) });
            };
            const event = action === "speed" ? "change" : "click";
            btn.addEventListener(event, handler);
            this.boundHandlers.push({ element: btn, event, handler });
        });

        // Update tick counter
        this._onTick = (e) => {
            this._tickCount = e.detail.timeOffset ?? this._tickCount + 1;
            const counter = this.element.querySelector("[data-tick-counter]");
            if (counter) counter.textContent = `${this._tickCount} ticks`;
        };
        document.addEventListener("webgl:chart-tick", this._onTick);
        this.boundHandlers.push({ element: document, event: "webgl:chart-tick", handler: this._onTick });
    }

    destroy() {
        this.boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.boundHandlers = [];
        PlaybackControls.instances.delete(this.element);
        if (this.element) delete this.element.__insightInstance;
        this.element = null;
    }

    static initAll() {
        document.querySelectorAll("[data-playback-controls]")
            .forEach((el) => new PlaybackControls(el));
    }
}
