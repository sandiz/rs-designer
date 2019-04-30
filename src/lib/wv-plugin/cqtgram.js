/* eslint-disable */
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

        this._onScroll = e => {
            this.updateScroll(e);
        };
        this._onRender = () => {
            this.render();
        };
        this._onWrapperClick = e => {
            this._wrapperClickHandler(e);
        };
        this._onReady = async () => {
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

            this.createWrapper();
            this.createCanvas();

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
            const ppref = await SettingsService.getSettingValue('advanced', 'power_preference');
            console.log("using gpu power preference: " + ppref);
            this.renderer = PIXI.autoDetectRenderer({
                width: this.width,
                height: this.height,
                view: this.canvas,
                resolution: 1,
                desynchronized: true,
                backgroundColor: 0x303030,
                powerPreference: ppref,
            });
            this.stage = null;
            this.defaultHeight = 512;
            this.defaultZoom = 0.5 / 1;
            this.zoomdiff = 0.1;
            this.min = this.defaultZoom;
            this.max = this.min * 20;
            this.scalex = this.defaultZoom;
            this.scaley = 0.5 / 1

            this.render();

            //drawer.wrapper.addEventListener('scroll', this._onScroll);
            //ws.on('redraw', this._onRender);
            //ws.on('zoom', this._onZoom);
            window.addEventListener('resize', this.resize);
        };
    }

    zoom = (type) => {
        switch (type) {
            case "inc":
                if (this.scalex >= this.max)
                    break;
                this.scalex += this.zoomdiff;
                break;
            case "dec":
                if (this.scalex <= this.min)
                    break;
                this.scalex -= this.zoomdiff;
                break;
            case "reset":
                this.scalex = this.defaultZoom;
                break;
            case "stretch":
                if (this.params.height === this.defaultHeight) {
                    this.height = this.params.height = this.defaultHeight * 2;
                    this.scaley = this.defaultZoom * 2;
                }
                else {
                    this.height = this.params.height = this.defaultHeight;
                    this.scaley = this.defaultZoom;
                }
                this.renderer.resize(this.renderer.width, this.params.height);
                this.wrapper.style.height = this.height + "px";
                break;
        }
        this.render();
        return Math.round((this.scalex - this.defaultZoom) * 10);
    }

    resize = () => {
        if (this.renderer)
            this.renderer.resize(this.container.offsetWidth, this.params.height);
        this.width = this.container.offsetWidth;
        this.height = this.params.height
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
        if (this.stage) {
            this.stage.destroy();
            this.stage = null;
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
        const data = this.specData
        //this.drawSpectrogram(data);
        this.drawPixi(data);
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

    initScene = async () => {
        //if (this.stage != null) {
        //    this.stage.destroy();
        //}
        this.stage = new PIXI.Container();
        this.line = new PIXI.Graphics();
        this.line.position.x = 0;
        this.line.position.y = 0;
        this.line.lineStyle(1, 0xFFFFFF, 1);
        this.line.pivot.set(0, 0);
        this.line.moveTo(0, 0);
        this.line.lineTo(0, this.height);
        if (this.farSprite === null) {
            this.farSprite = new PIXI.Sprite(this.farTexture, this.farTexture.width, this.farTexture.height);
            // this.farSprite.on('pointerup', this.onClick);
            // this.farSprite.on('mouseover', this.onMouseOver);
            // this.farSprite.on('mouseout', this.onMouseOut);
            // this.farSprite.on('mousemove', this.onMouseMove);
        }
        this.farSprite.scale.y = this.scaley;
        this.farSprite.scale.x = this.scalex;
        this.farSprite.position.x = 0;
        this.farSprite.position.y = 0;
        this.farSprite.interactive = true;

        /*
        this.cursorline = new PIXI.Graphics();
        this.cursorline.position.x = 0;
        this.cursorline.position.y = 0;
        this.cursorline.lineStyle(1, 0xbb4034, 1);
        this.cursorline.pivot.set(0, 0);
        this.cursorline.moveTo(0, 0);
        this.cursorline.lineTo(0, this.height);
        this.cursorline.visible = false;
        */


        this.stage.addChild(this.farSprite);
        this.stage.addChild(this.line);
        //this.stage.addChild(this.cursorline);
        this.drawScale();

        if (this.renderID != null)
            cancelAnimationFrame(this.renderID)
        this.update();
    }

    update = () => {
        if (this.farTexture && this.farSprite) {
            const pp = this.wavesurfer ? this.wavesurfer.backend.getPlayedPercents() : 0;
            const farscaledwidth = this.farSprite.width;
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
                this.farSprite.position.x = 0;
            }
            else if (w > farw) {
                const newpp = pp - farpp
                const percent = newpp / farrppend
                const newwidth = (halfwidth) + (percent * (halfwidth))
                this.line.clear();
                this.line.lineStyle(1, 0xFFFFFF, 1);
                this.line.moveTo(newwidth, 0);
                this.line.lineTo(newwidth, this.height);
                this.farSprite.position.x = -(farpp - startpp) * (this.farSprite.width);
            }
            else {
                this.line.clear();
                this.line.lineStyle(1, 0xFFFFFF, 1);
                this.line.moveTo(halfwidth, 0);
                this.line.lineTo(halfwidth, this.height);
                this.farSprite.position.x = -(pp - startpp) * (this.farSprite.width);
            }
        }
        this.renderer.render(this.stage);
        this.renderID = requestAnimationFrame(this.update);
    }

    drawScale = () => {
        const repeat = this.height / (12 * 7)
        let y = 0;
        let note = 8;
        for (let i = 0; i < 12 * 7; i += 1) {
            let width = 60
            let text = null
            const smallwidth = width / 1.5
            const newscaleline = new PIXI.Graphics();
            newscaleline.position.x = 0;
            newscaleline.position.y = y;
            if (i % 12 === 0) {
                text = new PIXI.Text('C' + note, {
                    fontFamily: 'Roboto Condensed',
                    fontSize: 16,
                    fill: 0xffffff,
                    align: 'center',
                    stroke: "black",
                    strokeThickness: 3
                });
                text.position.x = width / 2;
                text.position.y = y
                newscaleline.lineStyle(2, 0x4b4c4e, 1);
                note--;
            }
            else {
                width = smallwidth;
                newscaleline.lineStyle(1, 0xffffff, 1);
            }
            newscaleline.pivot.set(0, width / 2);
            newscaleline.rotation = 1.5708
            newscaleline.moveTo(0, 0);
            newscaleline.lineTo(0, width);
            this.stage.addChild(newscaleline)
            if (text)
                this.stage.addChild(text)
            y += repeat;
        }
    }

    onMouseOut = (e) => {
        this.cursorline.visible = false;
    }

    onMouseOver = (e) => {
        this.cursorline.visible = true;
    }

    onMouseMove = (e) => {
        const x = e.data.global.x;
        this.cursorline.position.x = x;
    }

    onClick = (e) => {
        const x = e.data.global.x;
        const tpx = Math.abs(this.farSprite.tilePosition.x) * this.scalex
        let pos = 0
        if (tpx > this.width)
            pos = (x + tpx + this.width)
        else
            pos = (x + tpx)
        const per = pos / (this.farSprite.width * this.scalex)
        console.log(per, this.farSprite.tilePosition.x, pos);
        if (per <= 1)
            this.wavesurfer.seekTo(per);
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
