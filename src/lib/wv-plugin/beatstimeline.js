import { DispatcherService, DispatchEvents } from "../../services/dispatcher";
import { string2hex } from "../utils";

/* eslint-disable */
/**
 * @typedef {Object} TimelinePluginParams
 * @desc Extends the `WavesurferParams` wavesurfer was initialised with
 * @property {!string|HTMLElement} container CSS selector or HTML element where
 * the timeline should be drawn. This is the only required parameter.
 * @property {number} notchPercentHeight=90 Height of notches in percent
 * @property {string} unlabeledNotchColor='#c0c0c0' The colour of the notches
 * that do not have labels
 * @property {string} primaryColor='#000' The colour of the main notches
 * @property {string} secondaryColor='#c0c0c0' The colour of the secondary
 * notches
 * @property {string} primaryFontColor='#000' The colour of the labels next to
 * the main notches
 * @property {string} secondaryFontColor='#000' The colour of the labels next to
 * the secondary notches
 * @property {number} labelPadding=5 The padding between the label and the notch
 * @property {?number} zoomDebounce A debounce timeout to increase rendering
 * performance for large files
 * @property {string} fontFamily='Arial'
 * @property {number} fontSize=10 Font size of labels in pixels
 * @property {?number} duration Length of the track in seconds. Overrides
 * getDuration() for setting length of timeline
 * @property {function} formatTimeCallback (sec, pxPerSec) -> label
 * @property {function} timeInterval (pxPerSec) -> seconds between notches
 * @property {function} primaryLabelInterval (pxPerSec) -> cadence between
 * labels in primary color
 * @property {function} secondaryLabelInterval (pxPerSec) -> cadence between
 * labels in secondary color
 * @property {?boolean} deferInit Set to true to manually call
 * `initPlugin('timeline')`
 */


export default class BeatsTimelinePlugin {
    /**
     * Timeline plugin definition factory
     *
     * This function must be used to create a plugin definition which can be
     * used by wavesurfer to correctly instantiate the plugin.
     *
     * @param  {TimelinePluginParams} params parameters use to initialise the plugin
     * @return {PluginDefinition} an object representing the plugin
     */
    static create(params) {
        return {
            name: 'beatstimeline',
            deferInit: params && params.deferInit ? params.deferInit : false,
            params: params,
            instance: BeatsTimelinePlugin
        };
    }

    // event handlers
    /** @private */
    _onScroll = () => {
        if (this.wrapper && this.drawer.wrapper) {
            this.wrapper.scrollLeft = this.drawer.wrapper.scrollLeft;
        }
    };

    /** @private */
    _onRedraw = () => this.render();

    /** @private */
    _onReady = () => {
        const ws = this.wavesurfer;
        this.drawer = ws.drawer;
        this.pixelRatio = ws.drawer.params.pixelRatio;
        this.maxCanvasWidth = ws.drawer.maxCanvasWidth || ws.drawer.width;
        this.maxCanvasElementWidth =
            ws.drawer.maxCanvasElementWidth ||
            Math.round(this.maxCanvasWidth / this.pixelRatio);

        // add listeners
        ws.drawer.wrapper.addEventListener('scroll', this._onScroll);
        ws.on('redraw', this._onRedraw);
        ws.on('zoom', this._onZoom);

        this.render();
    };

    /** @private */
    _onWrapperClick = e => {
        e.preventDefault();
        const relX = 'offsetX' in e ? e.offsetX : e.layerX;
        this.fireEvent('click', relX / this.wrapper.scrollWidth || 0);
    };

    /**
     * Creates an instance of TimelinePlugin.
     *
     * You probably want to use TimelinePlugin.create()
     *
     * @param {TimelinePluginParams} params Plugin parameters
     * @param {object} ws Wavesurfer instance
     */
    constructor(params, ws) {
        /** @private */
        this.container =
            'string' == typeof params.container
                ? document.querySelector(params.container)
                : params.container;

        if (!this.container) {
            throw new Error('No container for wavesurfer timeline');
        }
        /** @private */
        this.wavesurfer = ws;
        /** @private */
        this.util = ws.util;
        /** @private */
        this.params = this.util.extend(
            {},
            {
                height: 20,
                notchPercentHeight: 50,
                labelPadding: 3,
                unlabeledNotchColor: '#c0c0c0',
                primaryColor: '#000',
                secondaryColor: '#c0c0c0',
                primaryFontColor: '#000',
                secondaryFontColor: '#000',
                fontFamily: 'Roboto Condensed',
                fontSize: 10,
                duration: null,
                zoomDebounce: false,
                formatTimeCallback: this.defaultFormatTimeCallback,
                timeInterval: this.defaultTimeInterval,
                primaryLabelInterval: this.defaultPrimaryLabelInterval,
                secondaryLabelInterval: this.defaultSecondaryLabelInterval
            },
            params
        );

        /** @private */
        this.canvases = [];
        /** @private */
        this.wrapper = null;
        /** @private */
        this.drawer = null;
        /** @private */
        this.pixelRatio = null;
        /** @private */
        this.maxCanvasWidth = null;
        /** @private */
        this.maxCanvasElementWidth = null;
        /**
         * This event handler has to be in the constructor function because it
         * relies on the debounce function which is only available after
         * instantiation
         *
         * Use a debounced function if zoomDebounce is defined
         *
         * @private
         */
        this._onZoom = this.params.zoomDebounce
            ? this.wavesurfer.util.debounce(
                () => this.render(),
                this.params.zoomDebounce
            )
            : () => this.render();
    }

    /**
     * Initialisation function used by the plugin API
     */
    init() {
        // Check if ws is ready
        if (this.wavesurfer.isReady) {
            this._onReady();
        } else {
            this.wavesurfer.once('ready', this._onReady);
        }
    }

    /**
     * Destroy function used by the plugin API
     */
    destroy() {
        this.unAll();
        this.wavesurfer.un('redraw', this._onRedraw);
        this.wavesurfer.un('zoom', this._onZoom);
        this.wavesurfer.un('ready', this._onReady);
        this.wavesurfer.drawer.wrapper.removeEventListener(
            'scroll',
            this._onScroll
        );
        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.removeEventListener('click', this._onWrapperClick);
            this.wrapper.parentNode.removeChild(this.wrapper);
            this.wrapper = null;
        }
        for (let i = 0; i < this.canvases.length; i += 1) {
            this.canvases[i].destroy();
        }
    }

    /**
     * Create a timeline element to wrap the canvases drawn by this plugin
     *
     * @private
     */
    createWrapper() {
        const wsParams = this.wavesurfer.params;
        this.container.innerHTML = '';
        this.wrapper = this.container.appendChild(
            document.createElement('timeline')
        );
        this.util.style(this.wrapper, {
            display: 'block',
            position: 'relative',
            userSelect: 'none',
            webkitUserSelect: 'none',
            height: `${this.params.height}px`
        });

        if (wsParams.fillParent || wsParams.scrollParent) {
            this.util.style(this.wrapper, {
                width: '100%',
                overflowX: 'hidden',
                overflowY: 'hidden'
            });
        }

        this.wrapper.addEventListener('click', this._onWrapperClick);
    }

    /**
     * Render the timeline (also updates the already rendered timeline)
     *
     * @private
     */
    render() {
        DispatcherService.dispatch(DispatchEvents.AboutToDraw, "waveform");
        if (!this.wrapper) {
            this.createWrapper();
        }
        this.updateCanvases();
        this.updateCanvasesPositioning();
        this.renderCanvases();
        DispatcherService.dispatch(DispatchEvents.FinishedDrawing, "waveform");
    }

    /**
     * Add new timeline canvas
     *
     * @private
     */
    addCanvas() {
        const canvas = this.wrapper.appendChild(
            document.createElement('canvas')
        );
        const app = new PIXI.Application({
            view: canvas,
            transparent: true,
        })
        this.canvases.push(app);
        this.util.style(canvas, {
            position: 'absolute',
            zIndex: 4
        });
    }

    /**
     * Remove timeline canvas
     *
     * @private
     */
    removeCanvas() {
        const app = this.canvases.pop();
        app.view.parentElement.removeChild(app.view);
    }

    /**
     * Make sure the correct of timeline canvas elements exist and are cached in
     * this.canvases
     *
     * @private
     */
    updateCanvases() {
        const totalWidth = Math.round(this.drawer.wrapper.scrollWidth);
        const requiredCanvases = Math.ceil(
            totalWidth / this.maxCanvasElementWidth
        );


        while (this.canvases.length < requiredCanvases) {
            this.addCanvas();
        }

        while (this.canvases.length > requiredCanvases) {
            this.removeCanvas();
        }
    }

    /**
     * Update the dimensions and positioning style for all the timeline canvases
     *
     * @private
     */
    updateCanvasesPositioning() {
        // cache length for performance
        const canvasesLength = this.canvases.length;
        this.canvases.forEach((app, i) => {
            // canvas width is the max element width, or if it is the last the
            // required width
            const canvasWidth =
                i === canvasesLength - 1
                    ? this.drawer.wrapper.scrollWidth -
                    this.maxCanvasElementWidth * (canvasesLength - 1)
                    : this.maxCanvasElementWidth;
            // set dimensions and style
            app.view.width = canvasWidth * this.pixelRatio;
            // on certain pixel ratios the canvas appears cut off at the bottom,
            // therefore leave 1px extra
            app.view.height = (this.params.height + 1) * this.pixelRatio;
            app.renderer.resize(app.view.width, app.view.height);
            this.util.style(app.view, {
                width: `${canvasWidth}px`,
                height: `${this.params.height}px`,
                left: `${i * this.maxCanvasElementWidth}px`
            });
        });
    }

    /**
     * Render the timeline labels and notches
     *
     * @private
     */
    renderCanvases() {
        const duration =
            this.wavesurfer.timeline.params.duration ||
            this.wavesurfer.backend.getDuration();

        if (duration <= 0) {
            return;
        }
        const wsParams = this.wavesurfer.params;
        const fontSize = this.params.fontSize * wsParams.pixelRatio;
        const totalSeconds = parseInt(duration, 10) + 1;
        const width =
            wsParams.fillParent && !wsParams.scrollParent
                ? this.drawer.getWidth()
                : this.drawer.wrapper.scrollWidth * wsParams.pixelRatio;
        const height1 = this.params.height * this.pixelRatio;
        const height2 =
            this.params.height *
            (this.params.notchPercentHeight / 100) *
            this.pixelRatio;
        const pixelsPerSecond = width / duration;
        const formatTime = this.params.formatTimeCallback;
        // if parameter is function, call the function with
        // pixelsPerSecond, otherwise simply take the value as-is
        const intervalFnOrVal = option =>
            typeof option === 'function' ? option(pixelsPerSecond) : option;
        const timeInterval = intervalFnOrVal(this.params.timeInterval);
        const primaryLabelInterval = intervalFnOrVal(
            this.params.primaryLabelInterval
        );
        const secondaryLabelInterval = intervalFnOrVal(
            this.params.secondaryLabelInterval
        );

        this.canvases.forEach((app) => {
            while (app.stage.children[0]) { app.stage.removeChild(app.stage.children[0]); }
            const gr = new PIXI.Graphics();
            app.stage.addChild(gr);
        })

        this.setFonts(`22px Roboto Condensed`);
        let idx = 1;
        this.params.beats.forEach((beatsData, i) => {
            let [start, bn] = beatsData;
            const startPixel = Number.parseFloat(start) * pixelsPerSecond

            bn = Number.parseInt(bn);
            if (bn === 1) {
                this.setFillStyles("#000000")
                this.fillRect(startPixel, 0, 1, height1);
            }
            else {
                this.setFillStyles(this.params.unlabeledNotchColor);
                this.fillRect(startPixel, 0, 1, height2);

            }

            if (bn === 1) {
                this.setFillStyles("#000");
                this.fillText(
                    idx,
                    startPixel + this.params.labelPadding * this.pixelRatio,
                    height1 / 2 + 15, "#000000"
                );
                idx++;
            }

        });

    }
    /**
     * Set the canvas fill style
     *
     * @param {DOMString|CanvasGradient|CanvasPattern} fillStyle
     * @private
     */
    setFillStyles(fillStyle) {
        this.canvases.forEach(app => {
            const gr = app.stage.getChildAt(0);
            gr.endFill();
            gr.beginFill(string2hex(fillStyle));
        });
    }

    /**
     * Set the canvas font
     *
     * @param {DOMString} font
     * @private
     */
    setFonts(font) {
        //this.canvases.forEach(canvas => {
        //    canvas.getContext('2d').font = font;
        //});
    }

    /**
     * Draw a rectangle on the canvases
     *
     * (it figures out the offset for each canvas)
     *
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @private
     */
    fillRect(x, y, width, height) {
        this.canvases.forEach((app, i) => {
            const leftOffset = i * this.maxCanvasWidth;

            const intersection = {
                x1: Math.max(x, i * this.maxCanvasWidth),
                y1: y,
                x2: Math.min(x + width, i * this.maxCanvasWidth + app.view.width),
                y2: y + height
            };

            if (intersection.x1 < intersection.x2) {
                const gr = app.stage.getChildAt(0);
                gr.drawRect(
                    intersection.x1 - leftOffset,
                    intersection.y1,
                    intersection.x2 - intersection.x1,
                    intersection.y2 - intersection.y1
                );
            }
        });
    }

    /**
     * Fill a given text on the canvases
     *
     * @param {string} text
     * @param {number} x
     * @param {number} y
     * @private
     */
    fillText(text, x, y, color) {
        let textWidth;
        let xOffset = 0;

        this.canvases.forEach(app => {
            const canvasWidth = app.view.width;

            if (xOffset > x + textWidth) {
                return;
            }

            if (xOffset + canvasWidth > x) {
                const wsParams = this.wavesurfer.params;
                let style = new PIXI.TextStyle({
                    fontFamily: 'Roboto Condensed',
                    fontSize: '22px',
                    fill: string2hex(color),
                    align: 'center',
                    dropShadow: false,
                    fontWeight: 'lighter',
                })
                text = text.toString();
                const textObj = new PIXI.Text(text, style)
                textWidth = PIXI.TextMetrics.measureText(text, style).width;
                textObj.position.x = x - xOffset;
                textObj.position.y = app.view.height - y;
                app.stage.addChild(textObj);
            }

            xOffset += canvasWidth;
        });
    }

    /**
     * Turn the time into a suitable label for the time.
     *
     * @param {number} seconds
     * @param {number} pxPerSec
     */
    defaultFormatTimeCallback(seconds, pxPerSec) {
        if (seconds / 60 > 1) {
            // calculate minutes and seconds from seconds count
            const minutes = parseInt(seconds / 60, 10);
            seconds = parseInt(seconds % 60, 10);
            // fill up seconds with zeroes
            seconds = seconds < 10 ? '0' + seconds : seconds;
            return `${minutes}:${seconds}`;
        }
        return Math.round(seconds * 1000) / 1000;
    }

    /**
     * Return how many seconds should be between each notch
     *
     * @param pxPerSec
     */
    defaultTimeInterval(pxPerSec) {
        if (pxPerSec >= 25) {
            return 0.10;
        } else if (pxPerSec * 5 >= 25) {
            return 5;
        } else if (pxPerSec * 15 >= 25) {
            return 15;
        }
        return Math.ceil(0.5 / pxPerSec) * 60;
    }

    /**
     * Return the cadence of notches that get labels in the primary color.
     *
     * @param pxPerSec
     */
    defaultPrimaryLabelInterval(pxPerSec) {
        if (pxPerSec >= 25) {
            return 10;
        } else if (pxPerSec * 5 >= 25) {
            return 6;
        } else if (pxPerSec * 15 >= 25) {
            return 4;
        }
        return 4;
    }

    /**
     * Return the cadence of notches that get labels in the secondary color.
     *
     * @param pxPerSec
     */
    defaultSecondaryLabelInterval(pxPerSec) {
        if (pxPerSec >= 25) {
            return 5;
        } else if (pxPerSec * 5 >= 25) {
            return 2;
        } else if (pxPerSec * 15 >= 25) {
            return 2;
        }
        return 2;
    }
}
