/* eslint-disable */
const bone = require('./1').bone_cmap;
const spawn = require('threads').spawn;
const { DispatcherService, DispatchEvents } = require("../../services/dispatcher");
const PNG = require('pngjs').PNG;
const THREE = require('three');
const Stats = require('stats-js');

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

        this.frequenciesDataUrl = params.frequenciesDataUrl;
        this._onScroll = e => {
            this.updateScroll(e);
        };
        this._onRender = () => {
            this.render();
        };
        this._onWrapperClick = e => {
            this._wrapperClickHandler(e);
        };
        this._onAudioprocess = currentTime => {
        };
        this._onReady = () => {
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
            this.fftSamples =
                this.params.fftSamples || ws.params.fftSamples || 512;
            this.specData = params.specData;

            this.createWrapper();
            this.createCanvas();
            this.render();

            this.stats = new Stats()
            this.renderID = null
            this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
            this.wrapper.appendChild(this.stats.dom);


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
            this.texture = null;

            drawer.wrapper.addEventListener('scroll', this._onScroll);
            ws.on('redraw', this._onRender);
            this.wavesurfer.on('audioprocess', this._onAudioprocess);
            DispatcherService.dispatch(DispatchEvents.MASpectrogramStart);
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
        this.wavesurfer.un('audioprocess', this._onAudioprocess);
        this.drawer.wrapper.removeEventListener('scroll', this._onScroll);
        this.wavesurfer = null;
        this.util = null;
        this.params = null;
        this.specData = [];
        if (this.wrapper) {
            this.wrapper.removeEventListener('click', this._onWrapperClick);
            this.wrapper.parentNode.removeChild(this.wrapper);
            this.wrapper = null;
        }
        if (this.texture) this.texture.dispose();
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
            display: 'block',
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
        this.updateCanvasStyle();

        if (this.frequenciesDataUrl) {
            this.loadFrequenciesData(this.frequenciesDataUrl);
        } else {
            const data = this.specData
            this.drawSpectrogram(data);
            return;
        }
    }

    updateCanvasStyle() {
        const width = Math.round(this.width / this.pixelRatio) + 'px';
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = this.width;
    }

    renderCQTScroll = () => {
        if (this.texture) {
            const starthalfw = (this.width / 2 * this.pixelRatio) / this.texture.image.width;
            const endhaflw = 1 - starthalfw

            const pp = this.wavesurfer ? this.wavesurfer.backend.getPlayedPercents() : 0;
            if (pp > starthalfw && pp < endhaflw) {
                this.texture.offset.x = pp - starthalfw; //(i / WIDTH) * t.repeat.x;
            }
            else if (pp < starthalfw || pp > 1) {
                this.texture.offset.x = 0;
            }
        }
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
            DispatcherService.dispatch(DispatchEvents.MASpectrogramEnd);
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
            DispatcherService.dispatch(DispatchEvents.MASpectrogramEnd);
        })*/
        //for raw data
        /* 
        const im = new ImageData(
            new Uint8ClampedArray(data),
            my.width,
            my.height
        );
        my.spectrCc.putImageData(im, 0, 0);
        DispatcherService.dispatch(DispatchEvents.MASpectrogramEnd);
        */
    }

    olddrawSpectrogram(frequenciesData, my) {
        const spectrCc = my.spectrCc;
        const offscrenCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
        const length = my.wavesurfer.backend.getDuration();
        const height = my.height;
        const pixels = my.resample(frequenciesData);
        //const pixels = frequenciesData;
        const heightFactor = 2.2; //my.buffer ? 2 / my.buffer.numberOfChannels : 1;
        let i;
        let j;

        const thread = spawn((input, done) => {
            const offscreenContext = input.canvas.getContext("2d", {
                alpha: false,
            });
            for (i = 0; i < input.pixels.length; i++) {
                for (j = 0; j < input.pixels[i].length; j++) {
                    //const colorValue = 255 - pixels[i][j];
                    var colorValue = 255 - input.pixels[i][j],
                        rgb = input.bone[input.pixels[i][j]];

                    offscreenContext.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
                    offscreenContext.fillRect(
                        i,
                        input.height - j * input.heightFactor,
                        1,
                        input.heightFactor
                    );
                }
            }
            const pixels = offscreenContext.getImageData(0, 0, input.canvas.width, input.canvas.height);
            done.transfer({ pixels: pixels.data.buffer, }, [pixels.data.buffer]);
        });

        thread.send({
            pixels,
            bone,
            height,
            heightFactor,
            canvas: offscrenCanvas
        },
            [offscrenCanvas])
            .on('message', (response) => {
                let pixels = new ImageData(
                    new Uint8ClampedArray(response.pixels),
                    this.canvas.width,
                    this.canvas.height
                );
                spectrCc.putImageData(pixels, 0, 0);
                thread.kill();
            })
            .on('error', (error) => {
                console.error('Worker errored:', error);
            })
            .on('exit', () => {
                console.log("wv-cqt thread ended");
                DispatcherService.dispatch(DispatchEvents.MASpectrogramEnd);
            });

    }

    freqType(freq) {
        return freq >= 1000 ? (freq / 1000).toFixed(1) : Math.round(freq);
    }

    unitType(freq) {
        return freq >= 1000 ? 'KHz' : 'Hz';
    }

    loadLabels(
        bgFill,
        fontSizeFreq,
        fontSizeUnit,
        fontType,
        textColorFreq,
        textColorUnit,
        textAlign,
        container
    ) {
        const frequenciesHeight = this.height;
        bgFill = bgFill || 'rgba(68,68,68,0)';
        fontSizeFreq = fontSizeFreq || '12px';
        fontSizeUnit = fontSizeUnit || '10px';
        fontType = fontType || 'Helvetica';
        textColorFreq = textColorFreq || '#fff';
        textColorUnit = textColorUnit || '#fff';
        textAlign = textAlign || 'center';
        container = container || '#specLabels';
        const getMaxY = frequenciesHeight || 512;
        const labelIndex = 5 * (getMaxY / 256);
        const freqStart = 0;
        const step =
            (this.wavesurfer.backend.ac.sampleRate / 2 - freqStart) /
            labelIndex;

        const ctx = this.labelsEl.getContext('2d');
        this.labelsEl.height = this.height;
        this.labelsEl.width = 55;

        ctx.fillStyle = bgFill;
        ctx.fillRect(0, 0, 55, getMaxY);
        ctx.fill();
        let i;

        for (i = 0; i <= labelIndex; i++) {
            ctx.textAlign = textAlign;
            ctx.textBaseline = 'middle';

            const freq = freqStart + step * i;
            const index = Math.round(
                (freq / (this.sampleRate / 2)) * this.fftSamples
            );
            const label = this.freqType(freq);
            const units = this.unitType(freq);
            const x = 16;
            const yLabelOffset = 2;

            if (i == 0) {
                ctx.fillStyle = textColorUnit;
                ctx.font = fontSizeUnit + ' ' + fontType;
                ctx.fillText(units, x + 24, getMaxY + i - 10);
                ctx.fillStyle = textColorFreq;
                ctx.font = fontSizeFreq + ' ' + fontType;
                ctx.fillText(label, x, getMaxY + i - 10);
            } else {
                ctx.fillStyle = textColorUnit;
                ctx.font = fontSizeUnit + ' ' + fontType;
                ctx.fillText(units, x + 24, getMaxY - i * 50 + yLabelOffset);
                ctx.fillStyle = textColorFreq;
                ctx.font = fontSizeFreq + ' ' + fontType;
                ctx.fillText(label, x, getMaxY - i * 50 + yLabelOffset);
            }
        }
    }

    updateScroll(e) {
        if (this.wrapper) {
            this.wrapper.scrollLeft = e.target.scrollLeft;
        }
    }

    resample(oldMatrix) {
        const columnsNumber = 1;//this.width;
        const newMatrix = [];

        const oldPiece = 1 / oldMatrix.length;
        const newPiece = 1 / columnsNumber;
        let i;

        for (i = 0; i < columnsNumber; i++) {
            const column = new Array(oldMatrix[0].length);
            let j;

            for (j = 0; j < oldMatrix.length; j++) {
                const oldStart = j * oldPiece;
                const oldEnd = oldStart + oldPiece;
                const newStart = i * newPiece;
                const newEnd = newStart + newPiece;

                const overlap =
                    oldEnd <= newStart || newEnd <= oldStart
                        ? 0
                        : Math.min(Math.max(oldEnd, newStart), Math.max(newEnd, oldStart)) -
                        Math.max(Math.min(oldEnd, newStart), Math.min(newEnd, oldStart));
                let k;
                /* eslint-disable max-depth */
                if (overlap > 0) {
                    for (k = 0; k < oldMatrix[0].length; k++) {
                        if (column[k] == null) {
                            column[k] = 0;
                        }
                        column[k] += (overlap / newPiece) * oldMatrix[j][k];
                    }
                }
                /* eslint-enable max-depth */
            }

            const intColumn = new Uint8Array(oldMatrix[0].length);
            let m;

            for (m = 0; m < oldMatrix[0].length; m++) {
                intColumn[m] = column[m];
            }
            newMatrix.push(intColumn);
        }

        return newMatrix;
    }
}
