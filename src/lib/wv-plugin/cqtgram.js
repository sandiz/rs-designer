/* eslint-disable */
const bone = require('./1').bone_cmap;
const spawn = require('threads').spawn;
const { DispatcherService, DispatchEvents } = require("../../services/dispatcher");
const PNG = require('pngjs').PNG;
const THREE = require('three');
const Stats = require('stats-js');

import * as PIXI from 'pixi.js'
import { SettingsService } from '../../services/settings';
/**
 * Render a constantq visualisation of the audio.
 */
export default class ConstantQPlugin {
    /**
     * Spectrogram plugin definition factory
     *
     * This function must be used to create a plugin definition which can be
     * used by wavesurfer to correctly instantiate the plugin.
     *
     * @param  {SpectrogramPluginParams} params Parameters used to initialise the plugin
     * @return {PluginDefinition} An object representing the plugin.
     */
    static create(params) {
        return {
            name: 'constantq',
            deferInit: params && params.deferInit ? params.deferInit : false,
            params: params,
            staticProps: {
            },
            instance: ConstantQPlugin
        };
    }

    constructor(params, ws) {
        this.params = params;
        this.wavesurfer = ws;
        this.util = ws.util;
        this.farTexture = null;
        this.farSprite = null;
        this.defaultZoom = 20; /*default zoom */

        this._onScroll = e => {
            this.updateScroll(e);
        };
        this._onRender = () => {
            this.render();
        };
        this._onWrapperClick = e => {
            this._wrapperClickHandler(e);
        };
        this._onZoom = pxPerSec => {
            console.log(pxPerSec)
            const diff = pxPerSec - this.defaultZoom;
            if (this.farSprite) {
                //  this.farSprite.scale.x += diff * 0.025;
                //  this.scalex = this.farSprite.scale.x;
            }
        }
        this._onReady = () => {
            DispatcherService.dispatch(DispatchEvents.AboutToDraw, "cqt");
            const drawer = (this.drawer = ws.drawer);
            this.container =
                'string' == typeof params.container
                    ? document.querySelector(params.container)
                    : params.container;

            if (!this.container) {
                throw Error('No container for WaveSurfer constantq-gram');
            }
            this.pixelRatio = this.params.pixelRatio || ws.params.pixelRatio;
            this.width = this.container.offsetWidth;
            this.height = this.params.height; //this.fftSamples / 2;
            this.specData = params.specData;

            this.renderID = null
            this.stats = null;

            this.createWrapper();
            this.createCanvas();
            this.render();
            console.log(this.width)

            if (SettingsService.getSettingValue("advanced", "show_fps") === true) {
                this.stats = new Stats()
                this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
                this.wrapper.appendChild(this.stats.dom);
            }

            /*
            this.renderer = new THREE.WebGLRenderer({
                alpha: false,
                antialias: false,
                depth: false,
                powerPreference: "high-performance",
                canvas: this.canvas,
            });
            this.renderer.setSize(this.width, this.height);
            this.renderer.setClearColor(0x000000, 1);
            this.renderer.setPixelRatio(window.devicePixelRatio);

            this.scene = new THREE.Scene();
            this.camera = new THREE.OrthographicCamera(0, this.width / this.height, 0.1, 10000);
            this.scene.add(this.camera);
            */

            //this.farTexture = null;

            this.renderer = PIXI.autoDetectRenderer({
                width: this.width,
                height: this.height,
                view: this.canvas,
                resolution: 1,
                desynchronized: true,
                backgroundColor: 0x303030,
            });
            this.stage = new PIXI.Container();
            this.line = new PIXI.Graphics();
            this.line.position.x = 0;
            this.line.position.y = 0;
            this.line.lineStyle(1, 0xFFFFFF, 1);
            this.line.pivot.set(0, 0);
            this.line.moveTo(0, 0);
            this.line.lineTo(0, this.height);

            this.scalex = 0.5 / 1;
            this.scaley = 0.5 / 1


            drawer.wrapper.addEventListener('scroll', this._onScroll);
            //ws.on('redraw', this._onRender);
            //ws.on('zoom', this._onZoom);
        };
    }

    init() {
        // Check if wavesurfer is ready
        if (this.wavesurfer.isReady) {
            this._onReady();
        } else {
            this.wavesurfer.once('ready', this._onReady);
        }
    }

    destroy() {
        cancelAnimationFrame(this.renderID)
        this.unAll();
        this.wavesurfer.un('ready', this._onReady);
        this.wavesurfer.un('redraw', this._onRender);
        this.drawer.wrapper.removeEventListener('scroll', this._onScroll);
        this.wavesurfer = null;
        this.util = null;
        this.params = null;
        this.specData = "";
        if (this.wrapper) {
            this.wrapper.removeEventListener('click', this._onWrapperClick);
            this.wrapper.parentNode.removeChild(this.wrapper);
            this.wrapper = null;
        }
    }

    createWrapper() {
        const prevSpectrogram = this.container.querySelector('constantq');
        if (prevSpectrogram) {
            this.container.removeChild(prevSpectrogram);
        }
        const wsParams = this.wavesurfer.params;
        this.wrapper = document.createElement('constantq');
        // if labels are active
        this.drawer.style(this.wrapper, {
            display: 'flex',
            position: 'relative',
            userSelect: 'none',
            webkitUserSelect: 'none',
            height: `${this.height}px`
        });

        if (wsParams.fillParent || wsParams.scrollParent) {
            this.drawer.style(this.wrapper, {
                width: '100%',
                overflowX: 'hidden',
                overflowY: 'hidden'
            });
        }
        this.container.appendChild(this.wrapper);
        this.progress = document.createElement("div");
        this.drawer.style(this.progress, {
            zIndex: 10,
            height: 590 + 'px',
            borderRight: "1px solid white",
        });
        this.wrapper.appendChild(this.progress);

        this.wrapper.addEventListener('click', this._onWrapperClick);
        //this.wrapper.addEventListener('scroll', (e) => this.drawer.fireEvent('scroll', e))
    }

    _wrapperClickHandler(event) {
        event.preventDefault();

        const relX = 'offsetX' in event ? event.offsetX : event.layerX;
        this.fireEvent('click', relX / this.scrollWidth || 0);
    }

    createCanvas() {
        const canvas = (this.canvas = this.wrapper.appendChild(
            document.createElement('canvas')
        ));

        this.util.style(canvas, {
            position: 'absolute',
            zIndex: 4
        });
    }

    render() {
        DispatcherService.dispatch(DispatchEvents.AboutToDraw, "cqt");
        const data = this.specData
        //this.drawSpectrogram(data);
        this.drawPixi(data);
        DispatcherService.dispatch(DispatchEvents.FinishedDrawing, "cqt");
        return;
    }

    pauseUpdate = () => {
        if (this.renderID)
            cancelAnimationFrame(this.renderID);
    }

    resumeUpdate = () => {
        this.renderID = requestAnimationFrame(this.update);
    }

    drawPixi = (data) => {
        const dataURI = 'data:image/png;base64,' + data.toString('base64')
        if (this.farTexture === null) {
            this.farTexture = PIXI.Texture.from(dataURI);
            this.farTexture.on('update', () => {
                // console.log(this.farTexture.width, this.farTexture.height);
                // console.log(this.width, this.height);
                this.initScene();
            });
        }
        else {
            this.initScene();
        }
    }

    initScene = () => {
        if (this.farSprite === null)
            this.farSprite = new PIXI.TilingSprite(this.farTexture, this.farTexture.width, this.farTexture.height);
        this.farSprite.scale.y = this.scaley;
        this.farSprite.scale.x = this.scalex;
        this.farSprite.tilePosition.x = 0;
        this.farSprite.position.x = 0;
        this.farSprite.position.y = 0;
        this.stage.addChild(this.farSprite);
        this.stage.addChild(this.line)
        if (this.renderID != null)
            cancelAnimationFrame(this.renderID)
        this.update();
    }

    update = () => {
        if (this.farTexture && this.farSprite) {
            const pp = this.wavesurfer ? this.wavesurfer.backend.getPlayedPercents() : 0;
            const farscaledwidth = this.farSprite.width * this.scalex;
            const halfwidth = this.width / 2;
            const farw = (farscaledwidth) - (halfwidth);
            const farpp = farw / (farscaledwidth)
            const startpp = (halfwidth) / (farscaledwidth);
            const farrppend = 1 - farpp

            const w = pp * (farscaledwidth)
            if (w < halfwidth) {
                this.line.clear();
                this.line.lineStyle(1, 0xFFFFFF, 1);
                this.line.moveTo(w, 0);
                this.line.lineTo(w, this.height);
                this.lastw = this.width / 2;
                this.farSprite.tilePosition.x = 0;
            }
            else if (w > farw) {
                const newpp = pp - farpp
                const percent = newpp / farrppend
                const newwidth = (halfwidth) + (percent * (halfwidth))
                this.line.clear();
                this.line.lineStyle(1, 0xFFFFFF, 1);
                this.line.moveTo(newwidth, 0);
                this.line.lineTo(newwidth, this.height);
                this.farSprite.tilePosition.x = -(farpp - startpp) * (this.farSprite.width);
            }
            else {
                this.line.clear();
                this.line.lineStyle(1, 0xFFFFFF, 1);
                this.line.moveTo(halfwidth, 0);
                this.line.lineTo(halfwidth, this.height);
                this.farSprite.tilePosition.x = -(pp - startpp) * (this.farSprite.width);
            }
        }
        if (this.stats)
            this.stats.update();
        this.renderer.render(this.stage);
        this.renderID = requestAnimationFrame(this.update);
    }

    updateCanvasStyle() {
        //const width = Math.round(this.width / this.pixelRatio) + 'px';
        //this.canvas.width = this.width;
        //this.canvas.height = this.height;
        //this.canvas.style.width = this.width;
    }

    renderCQTScroll = () => {
        if (this.texture) {
            const starthalfw = (this.width / 2 * this.pixelRatio) / this.texture.image.width;
            const endhaflw = 1 - starthalfw

            const pp = this.wavesurfer ? this.wavesurfer.backend.getPlayedPercents() : 0;
            const rx = this.texture.image.width / this.pixelRatio;
            if (pp > starthalfw && pp < endhaflw) {
                this.texture.offset.x = pp - starthalfw; //(i / WIDTH) * t.repeat.x;
            }
            else if (pp < starthalfw) {
                this.texture.offset.x = 0;
                //this.progress.style.width = (pp * rx) + "px"
            }
            else if (pp > endhaflw) {
                //this.progress.style.width = (pp * rx) + "px"
            }
            else if (pp > 1) {
                //this.progress.style.width = 0 + "px"
            }

        }
        if (this.stats)
            this.stats.update()
        this.renderID = requestAnimationFrame(this.renderCQTScroll);
        this.renderer.render(this.scene, this.camera);
    }

    asyncTextureLoad = uri => new Promise((resolve, reject) => {
        const tloader = new THREE.TextureLoader();
        const texture = tloader.load(uri, t => resolve(t), undefined, err => reject(err))
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
    })

    drawSpectrogram = async (data) => {
        const WIDTH = this.width;
        const dataURI = 'data:image/png;base64,' + data.toString('base64')
        try {
            const t = await this.asyncTextureLoad(dataURI);
            this.texture = t;
            const imgwidth = t.image.width
            t.repeat.x = (WIDTH * this.pixelRatio) / imgwidth;

            //t.repeat.y = HEIGHT / imgheight;
            //t.offset.y = (0 / HEIGHT) * t.repeat.y;
            this.scene.background = t;
            this.renderCQTScroll();
        }
        catch (ex) {
            console.log(ex)
        }

        //for png
        /*new PNG({
            inputHasAlpha: false,
            colorType: 2,
        }).parse(data, (error, data) => {
            const im = new ImageData(
                new Uint8ClampedArray(data.data),
                data.width,
                data.height
            );
            my.spectrCc.putImageData(im, 0, 0);
        })*/
        //for raw data
        /* 
        const im = new ImageData(
            new Uint8ClampedArray(data),
            my.width,
            my.height
        );
        my.spectrCc.putImageData(im, 0, 0);
        */
    }

    updateScroll(e) {
        if (this.wrapper) {
            this.wrapper.scrollLeft = e.target.scrollLeft;
        }
    }
}
