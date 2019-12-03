import React, { RefObject } from 'react';
import { scale } from 'chroma-js';
import MediaPlayerService from '../../services/mediaplayer';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';

function getAWeighting(f: number) {
    const f2 = f * f;
    return 1.5 * 1.2588966 * 148840000 * f2 * f2
        / ((f2 + 424.36) * Math.sqrt((f2 + 11599.29) * (f2 + 544496.41)) * (f2 + 148840000));
}
export class SpectrogramTab extends React.Component<{}, {}> {
    private specCanvas: RefObject<HTMLCanvasElement>;
    private tempCanvas: HTMLCanvasElement;
    private tempCtx: CanvasRenderingContext2D | null;
    private specCtx: CanvasRenderingContext2D | null;
    private dataPtr: unknown;
    private cqtSize = 0;
    private memory: WebAssembly.Memory | null;
    private analyserNode: AnalyserNode | null;
    private cqtCalc: Function | null;
    private cqtRenderLine: Function | null;
    private aWeightingLUT: Array<number> = [];
    private colorMap: chroma.Scale<chroma.Color> | null;
    private _calcTime = 0;
    private _totalTime = 0;
    private _timeCount = 0;
    private _lastTime = 0;

    constructor(props: {}) {
        super(props);
        this.specCanvas = React.createRef();
        this.tempCanvas = document.createElement("canvas");
        this.tempCtx = this.tempCanvas.getContext('2d', { alpha: false });
        this.specCtx = null;
        this.memory = null;
        this.analyserNode = null;
        this.cqtCalc = null;
        this.cqtRenderLine = null;
        this.colorMap = null;
    }
    componentDidMount = async () => {
        DispatcherService.on(DispatchEvents.MediaReady, this.initLiveCQT);
        if (MediaPlayerService.isActive()) {
            this.initLiveCQT();
        }
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReady, this.initLiveCQT);
    }

    private initLiveCQT = () => {
        const CQT_INIT = MediaPlayerService.getCQTProvider("cqt_init");
        if (!CQT_INIT) return console.error("cqt provider entry point not found", "cqt_init");
        if (!this.specCanvas.current) return console.error("canvas not found");
        const db = 32;
        const supersample = 0;
        const cqtBins = this.specCanvas.current.width;
        //                MIDI note  16 ==   20.60 hz
        // Piano key  1 = MIDI note  21 ==   27.50 hz
        // Piano key 88 = MIDI note 108 == 4186.01 hz
        //                MIDI note 127 == 12543.8 hz
        const fMin = 25.95;
        const fMax = 4504.0;
        this.cqtSize = CQT_INIT(44100, cqtBins, db, fMin, fMax, supersample);
        console.log('cqtSize:', this.cqtSize);
        if (!this.cqtSize) throw Error('Error initializing constant Q transform.');
        this.colorMap = scale([
            '#000000',
            '#0000a0',
            '#6000a0',
            '#962761',
            '#dd1440',
            '#f0b000',
            '#ffffa0',
            '#ffffff',
        ]).domain([0, 255]);

        const CQT_BIN_TO_FREQ = MediaPlayerService.getCQTProvider("cqt_bin_to_freq");
        if (!CQT_BIN_TO_FREQ) return console.error("cqt provider entry point not found", "cqt_bin_to_freq");
        const cqtFreqs = Array(cqtBins).fill(0).map((_, i) => CQT_BIN_TO_FREQ(i));
        this.aWeightingLUT = cqtFreqs.map(f => 0.5 + 0.5 * getAWeighting(f));

        const CQT_MALLOC = MediaPlayerService.getCQTProvider("cqt_malloc");
        if (!CQT_MALLOC) return console.error("cqt provider entry point not found", "cqt_malloc");
        this.dataPtr = CQT_MALLOC(this.cqtSize * 4);

        this.analyserNode = MediaPlayerService.getPostAnalyzer() as AnalyserNode;
        if (!this.analyserNode) return console.error("cqt failed to get post analyser");
        this.analyserNode.fftSize = this.cqtSize;

        this.tempCanvas.width = this.specCanvas.current.width;
        this.tempCanvas.height = this.specCanvas.current.height;

        this.specCtx = this.specCanvas.current.getContext('2d', { alpha: false });

        this.memory = MediaPlayerService.getCQTProvider("memory") as unknown as WebAssembly.Memory;
        this.cqtCalc = MediaPlayerService.getCQTProvider("cqt_calc");
        this.cqtRenderLine = MediaPlayerService.getCQTProvider("cqt_render_line");
        this.updateFrame();
        return true;
    }

    updateFrame = () => {
        requestAnimationFrame(this.updateFrame);
        if (this.memory
            && this.analyserNode
            && this.cqtCalc
            && this.cqtRenderLine
            && this.specCanvas.current
            && this.specCtx && this.tempCtx && this.colorMap
        ) {
            const fqHeight = this.specCanvas.current.height;
            const canvasWidth = this.specCanvas.current.width;
            const specSpeed = 2;
            const hCoeff = fqHeight / 256.0;

            //const specCtx = this.specCtx;
            this.specCtx.fillStyle = 'black';
            this.specCtx.fillRect(0, 0, this.specCanvas.current.width, this.specCanvas.current.height);
            this.tempCtx.fillStyle = '#000033';
            this.tempCtx.fillRect(0, 0, this.tempCanvas.width, specSpeed);

            const dataHeap = new Float32Array(this.memory.buffer, this.dataPtr as number, this.cqtSize);
            const start = performance.now();
            this.analyserNode.getFloatTimeDomainData(dataHeap);
            if (!dataHeap.every(n => n === 0)) {
                this.cqtCalc(this.dataPtr, this.dataPtr);
                this.cqtRenderLine(this.dataPtr);
                // copy output to canvas
                for (let x = 0; x < canvasWidth; x += 1) {
                    const weighting = this.aWeightingLUT[x];
                    //eslint-disable-next-line
                    const val = 255 * weighting * dataHeap[x] | 0; //this.lib.getValue(this.cqtOutput + x * 4, 'float') | 0;
                    //eslint-disable-next-line
                    const h = val * hCoeff | 0;
                    const style = this.colorMap(val).hex();
                    this.specCtx.fillStyle = style;
                    this.specCtx.fillRect(x, fqHeight - h, 1, h);
                    this.tempCtx.fillStyle = style;
                    this.tempCtx.fillRect(x, 0, 1, specSpeed);
                }
            }
            const middle = performance.now();
            // tempCtx.drawImage(this.specCanvas, 0, 0);
            // translate the transformation matrix. subsequent draws happen in this frame
            this.tempCtx.translate(0, specSpeed);
            // draw the copied image
            this.tempCtx.drawImage(this.tempCanvas, 0, 0);
            // reset the transformation matrix
            this.tempCtx.setTransform(1, 0, 0, 1, 0, 0);

            this.specCtx.drawImage(this.tempCanvas, 0, 0);
            // Disabled because this is rendered as plain HTML IMG element
            // if (this.mode === MODE_CONSTANT_Q) {
            //   this.specCtx.drawImage(this.pianoKeysImage, 0, 0);
            // }

            const end = performance.now();

            this._calcTime += middle - start;
            this._totalTime += end - start;
            this._timeCount += 1;
            if (this._timeCount >= 200) {
                console.log(
                    '[Viz] %s ms analysis, %s ms total (%s fps) (%s% utilization)',
                    (this._calcTime / this._timeCount).toFixed(2),
                    (this._totalTime / this._timeCount).toFixed(2),
                    (1000 * this._timeCount / (start - this._lastTime)).toFixed(1),
                    (100 * this._totalTime / (end - this._lastTime)).toFixed(1),
                );
                this._calcTime = 0;
                this._timeCount = 0;
                this._totalTime = 0;
                this._lastTime = start;
            }
        }
    }

    render = () => {
        return (
            <div>
                <canvas ref={this.specCanvas} width={800} height={600} />
            </div>
        )
    }
}

export default SpectrogramTab;
