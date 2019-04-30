/* eslint-disable */
/**
 * @since 3.0.0
 */
import * as PIXI from 'pixi.js'

import style from 'wavesurfer.js/src/util/style';
import getId from 'wavesurfer.js/src/util/get-id';
import { string2hex } from '../utils';

/**
 * The `CanvasEntry` class represents an element consisting of a wave `canvas`
 * and an (optional) progress wave `canvas`.
 *
 * The `MultiCanvas` renderer uses one or more `CanvasEntry` instances to
 * render a waveform, depending on the zoom level.
 */
export default class PixiCanvasEntry {
    constructor() {
        /**
         * The wave node
         *
         * @type {HTMLCanvasElement}
         */
        this.wave = null;
        /**
         * The wave canvas rendering context
         *
         * @type {CanvasRenderingContext2D}
         */
        this.waveCtx = null;
        /**
         * The (optional) progress wave node
         *
         * @type {HTMLCanvasElement}
         */
        this.progress = null;
        /**
         * The (optional) progress wave canvas rendering context
         *
         * @type {CanvasRenderingContext2D}
         */
        this.progressCtx = null;
        /**
         * Start of the area the canvas should render, between 0 and 1
         *
         * @type {number}
         * @private
         */
        this.start = 0;
        /**
         * End of the area the canvas should render, between 0 and 1
         *
         * @type {number}
         * @private
         */
        this.end = 1;
        /**
         * Unique identifier for this entry
         *
         * @type {string}
         */
        this.id = getId(this.constructor.name.toLowerCase() + '_');
        /**
         * Whether or not the render process completed for this entry.
         *
         * @type {boolean}
         */
        this.renderComplete = false;
        /**
         * Cached coordinates that can be used to redraw this entry at a later
         * time.
         *
         * @type {object}
         */
        this.cachedCoordinates = null;
        /**
         * Whether or not this entry is currently intersecting in the
         * view-port.
         *
         * @type {boolean}
         */
        this.intersecting = false;
        /**
         * Whether or not the intersection observer API is enabled.
         *
         * @type {boolean}
         */
        this.usesIntersectionObserver = false;
    }

    /**
     * Store the wave canvas element and create the 2D rendering context
     *
     * @param {HTMLCanvasElement} element The wave `canvas` element.
     */
    initWave(element) {
        this.wave = element;
        //this.waveCtx = this.wave.getContext('2d');
        //console.log("wave", width, height)
        this.wavePixi = new PIXI.Application({
            view: this.wave,
            resolution: devicePixelRatio,
            desynchronized: true,
            transparent: false,
            antialias: true,
            backgroundColor: 0x303030,
        });
        this.chords = this.beats = this.timeline = this.minimap = this.waveCo = null;
        this.waveGr = null;
        this.initPixi();
    }

    initPixi() {
        if (this.chords == null) {
            this.chords = new PIXI.Container();
            let bg = new PIXI.Sprite(PIXI.Texture.WHITE);
            bg.tint = 0x436a88;
            this.chords.addChild(bg);
            this.wavePixi.stage.addChild(this.chords);
        }
        this.chords.position.x = 0;
        this.chords.position.y = 0;

        if (this.beats == null) {
            this.beats = new PIXI.Container();
            let bg = new PIXI.Sprite(PIXI.Texture.WHITE);
            bg.tint = 0xf0f8ff;
            this.beats.addChild(bg);
            this.wavePixi.stage.addChild(this.beats);
        }
        this.beats.position.x = 0;
        this.beats.position.y = 20 * window.devicePixelRatio;

        if (this.timeline == null) {
            this.timeline = new PIXI.Container();
            this.timelineGr = new PIXI.Graphics();
            this.timeline.addChild(this.timelineGr)
            //let bg = new PIXI.Sprite(PIXI.Texture.WHITE);
            //bg.tint = 0xf0f8ff;
            //this.timeline.addChild(bg);
            this.wavePixi.stage.addChild(this.timeline)
        }
        this.timelineGr.beginFill(0xf0f8ff);
        this.timelineGr.drawRect(0, 0, this.wave.width / devicePixelRatio, 20 * window.devicePixelRatio);
        this.timelineGr.endFill();
        this.timeline.position.x = 0;
        this.timeline.position.y = this.wave.height / devicePixelRatio - (40 * window.devicePixelRatio);


        if (this.minimap == null) {
            this.minimap = new PIXI.Container();
            let bg = new PIXI.Sprite(PIXI.Texture.WHITE);
            bg.tint = 0x436a88;
            this.minimap.addChild(bg);
            this.wavePixi.stage.addChild(this.minimap)
            //this.minimap.position.y = 60 * window.devicePixelRatio
        }
        this.minimap.position.x = 0;
        this.minimap.position.y = (this.wave.height / window.devicePixelRatio) - (20 * window.devicePixelRatio);

        // for (var i = this.wavePixi.stage.children.length - 1; i >= 0; i--) { this.wavePixi.stage.removeChild(this.wavePixi.stage.children[i]); };
        this.waveCo = new PIXI.Container();
        this.waveGr = new PIXI.Graphics();
        this.waveCo.addChild(this.waveGr);
        this.waveCo.position.x = 0;
        this.waveCo.position.y = 40 * window.devicePixelRatio;
        this.waveCo.width = this.width
        this.waveCo.height = this.height
        this.waveGr.width = this.width
        this.waveGr.height = this.height
        this.wavePixi.stage.addChild(this.waveCo);
    }

    /**
     * Store the progress wave canvas element and create the 2D rendering
     * context
     *
     * @param {HTMLCanvasElement} element The progress wave `canvas` element.
     */
    initProgress(element) {
        this.progress = element;
        //this.waveCtx = this.wave.getContext('2d');
        //console.log("progress", width, height)
        this.progressPixi = new PIXI.Application({
            view: this.progress,
            resolution: 1,
            desynchronized: true,
            transparent: true,
        });
        this.progressGr = new PIXI.Graphics();
        this.progressPixi.stage.addChild(this.progressGr);
    }

    /**
     * Update the dimensions
     *
     * @param {number} elementWidth
     * @param {number} totalWidth
     * @param {number} width The new width of the element
     * @param {number} height The new height of the element
     */
    updateDimensions(elementWidth, totalWidth, width, height, screenWidth) {
        // where the canvas starts and ends in the waveform, represented as a
        // decimal between 0 and 1
        this.start = this.wave.offsetLeft / totalWidth || 0;
        this.end = this.start + elementWidth / totalWidth;

        //console.log(elementWidth, totalWidth, width, height, screenWidth);
        // set wave canvas dimensions
        this.wave.width = width;
        this.wave.height = height;
        let elementSize = { width: screenWidth + 'px', height: height / window.devicePixelRatio + 'px' };
        style(this.wave, elementSize);
        this.wavePixi.renderer.resize(screenWidth, height);
        this.wavePixi.stage.width = totalWidth;


        this.width = totalWidth;
        this.height = height;
        this.initPixi();

        this.waveCo.width = this.chords.width =
            this.beats.width = this.timeline.width = screenWidth;

        this.minimap.width = screenWidth; //width / window.devicePixelRatio;

        this.chords.height = 20 * window.devicePixelRatio;
        this.beats.height = 20 * window.devicePixelRatio;
        this.timeline.height = 20 * window.devicePixelRatio
        this.minimap.height = 20 * window.devicePixelRatio

        const unscaledheight = height / window.devicePixelRatio;
        this.waveGr.scale.y = (unscaledheight - 80) / unscaledheight;

        this.wavePixi.ticker.add((delta) => {
            //this.waveCo.position.x -= 0.5 * delta;
        })


        if (this.hasProgressCanvas) {
            // set progress canvas dimensions
            this.progress.width = width;
            this.progress.height = height;
            style(this.progress, elementSize);
            this.progressPixi.renderer.resize(width, height);
        }
    }

    /**
     * Clear the wave and progress rendering contexts
     */
    clearWave() {
        // wave
        /* this.waveCtx.clearRect(
            0,
            0,
            this.waveCtx.canvas.width,
            this.waveCtx.canvas.height
        );

        // progress
        if (this.hasProgressCanvas) {
            this.progressCtx.clearRect(
                0,
                0,
                this.progressCtx.canvas.width,
                this.progressCtx.canvas.height
            );
        } */
        if (this.waveGr)
            this.waveGr.clear();
        if (this.hasProgressCanvas) {
            this.progressGr.clear();
        }
    }

    /**
     * Set the fill styles for wave and progress
     *
     * @param {string} waveColor Fill color for the wave canvas
     * @param {?string} progressColor Fill color for the progress canvas
     */
    setFillStyles(waveColor, progressColor) {
        //this.waveCtx.fillStyle = waveColor;
        this.waveGr.endFill();
        this.waveGr.beginFill(string2hex(waveColor));
        //this.waveGr.lineStyle(1, 0xffffff);

        if (this.hasProgressCanvas) {
            //this.progressCtx.fillStyle = progressColor;
            this.progressGr.endFill();
            this.progressGr.beginFill(string2hex(progressColor));
        }
    }


    /**
     * Draw a rectangle for wave and progress
     *
     * @param {number} x X start position
     * @param {number} y Y start position
     * @param {number} width Width of the rectangle
     * @param {number} height Height of the rectangle
     */
    fillRects(x, y, width, height) {
        this.fillRectToContext(this.waveGr, x, y, width, height);

        if (this.hasProgressCanvas) {
            this.fillRectToContext(this.progressGr, x, y, width, height);
        }
    }

    /**
     * Draw the actual rectangle on a `canvas` element
     *
     * @private
     * @param {PIXI.Graphics} ctx Rendering context of target canvas
     * @param {number} x X start position
     * @param {number} y Y start position
     * @param {number} width Width of the rectangle
     * @param {number} height Height of the rectangle
     */
    fillRectToContext(ctx, x, y, width, height) {
        if (!ctx) {
            return;
        }
        ctx.drawRect(x, y, width, height);
    }

    /**
     * Draw using cached coordinates.
     */
    redraw() {
        // render once
        if (!this.renderComplete && this.cachedCoordinates) {
            this.drawLines(
                this.cachedCoordinates.peaks,
                this.cachedCoordinates.absmax,
                this.cachedCoordinates.halfH,
                this.cachedCoordinates.offsetY,
                this.cachedCoordinates.start,
                this.cachedCoordinates.end
            );
        }
    }

    /**
     * Render the actual wave and progress lines
     *
     * @param {number[]} peaks Array with peaks data
     * @param {number} absmax Maximum peak value (absolute)
     * @param {number} halfH Half the height of the waveform
     * @param {number} offsetY Offset to the top
     * @param {number} start The x-offset of the beginning of the area
     * that should be rendered
     * @param {number} end The x-offset of the end of the area that
     * should be rendered
     */
    drawLines(peaks, absmax, halfH, offsetY, start, end) {
        if (this.usesIntersectionObserver) {
            // do not draw unconditionally, only draw when this entry is
            // visible in the wrapper's viewport. save coordinates until
            // that happens so it can be redrawn later.
            if (this.cachedCoordinates === null) {
                this.cachedCoordinates = {
                    peaks: peaks,
                    absmax: absmax,
                    halfH: halfH,
                    offsetY: offsetY,
                    start: start,
                    end: end
                };
            }
            if (!this.intersecting) {
                // not visible yet
                return;
            }
        }

        // wave
        this.drawLineToContext(
            this.waveGr,
            peaks,
            absmax,
            halfH,
            offsetY,
            start,
            end
        );
        // progress
        if (this.hasProgressCanvas) {
            this.drawLineToContext(
                this.progressGr,
                peaks,
                absmax,
                halfH,
                offsetY,
                start,
                end
            );
        }

        this.renderComplete = true;
    }

    /**
     * Render the actual waveform line on a `canvas` element
     *
     * @private
     * @param {CanvasRenderingContext2D} ctx Rendering context of target canvas
     * @param {number[]} peaks Array with peaks data
     * @param {number} absmax Maximum peak value (absolute)
     * @param {number} halfH Half the height of the waveform
     * @param {number} offsetY Offset to the top
     * @param {number} start The x-offset of the beginning of the area that
     * should be rendered
     * @param {number} end The x-offset of the end of the area that
     * should be rendered
     */
    drawLineToContext(ctx, peaks, absmax, halfH, offsetY, start, end) {
        if (!ctx) {
            return;
        }

        const length = peaks.length / 2;
        const first = Math.round(length * this.start);

        // use one more peak value to make sure we join peaks at ends -- unless,
        // of course, this is the last canvas
        const last = Math.round(length * this.end) + 1;

        const canvasStart = first;
        const canvasEnd = last;
        const scale = this.wave.width / (canvasEnd - canvasStart - 1);

        // optimization
        const halfOffset = halfH + offsetY;
        const absmaxHalf = absmax / halfH;

        //ctx.beginPath();
        ctx.moveTo((canvasStart - first) * scale, halfOffset);

        ctx.lineTo(
            (canvasStart - first) * scale,
            halfOffset - Math.round((peaks[2 * canvasStart] || 0) / absmaxHalf)
        );

        let i, peak, h;
        for (i = canvasStart; i < canvasEnd; i++) {
            peak = peaks[2 * i] || 0;
            h = Math.round(peak / absmaxHalf);
            ctx.lineTo((i - first) * scale + this.halfPixel, halfOffset - h);
        }

        // draw the bottom edge going backwards, to make a single
        // closed hull to fill
        let j = canvasEnd - 1;
        for (j; j >= canvasStart; j--) {
            peak = peaks[2 * j + 1] || 0;
            h = Math.round(peak / absmaxHalf);
            ctx.lineTo((j - first) * scale + this.halfPixel, halfOffset - h);
        }

        ctx.lineTo(
            (canvasStart - first) * scale,
            halfOffset -
            Math.round((peaks[2 * canvasStart + 1] || 0) / absmaxHalf)
        );

        ctx.closePath();
        ctx.endFill();
    }

    /**
     * Destroys this entry
     */
    destroy() {
        this.waveGr.destroy();
        if (this.hasProgressCanvas)
            this.progressGr.destroy();

        if (this.hasProgressCanvas)
            this.progressPixi.destroy();
        this.wavePixi.destroy();

        this.renderComplete = false;
        this.intersecting = false;
        this.cachedCoordinates = null;
    }

    /**
     * Return image data of the wave `canvas` element
     *
     * When using a `type` of `'blob'`, this will return a `Promise` that
     * resolves with a `Blob` instance.
     *
     * @param {string} format='image/png' An optional value of a format type.
     * @param {number} quality=0.92 An optional value between 0 and 1.
     * @param {string} type='dataURL' Either 'dataURL' or 'blob'.
     * @return {string|Promise} When using the default `'dataURL'` `type` this
     * returns a data URL. When using the `'blob'` `type` this returns a
     * `Promise` that resolves with a `Blob` instance.
     */
    getImage(format, quality, type) {
        if (type === 'blob') {
            return new Promise(resolve => {
                this.wave.toBlob(resolve, format, quality);
            });
        } else if (type === 'dataURL') {
            return this.wave.toDataURL(format, quality);
        }
    }
}
