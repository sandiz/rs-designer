import React, { RefObject } from 'react';
import { scale, Scale } from 'chroma-js';
import {
    Callout, Card, Elevation, Intent, Switch, Slider, FormGroup, HTMLSelect, Text, Colors,
} from '@blueprintjs/core';
import classNames from 'classnames';
import colormap from 'colormap';
import MediaPlayerService from '../../services/mediaplayer';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';

import './Spectrogram.scss'
import { pitchesFromC, getNoteFrom, colorMaps } from '../../lib/music-utils';
import { setStateAsync } from '../../lib/utils';

type ctype = 'default' | typeof colorMaps[number];
interface SpecState {
    sensitivity: number;
    colormap: ctype;
    eqAware: boolean;
}

function getAWeighting(f: number) {
    const f2 = f * f;
    return 1.5 * 1.2588966 * 148840000 * f2 * f2
        / ((f2 + 424.36) * Math.sqrt((f2 + 11599.29) * (f2 + 544496.41)) * (f2 + 148840000));
}

const chromaScale: { [key: string]: Scale } = {
    default: scale([
        '#000000',
        '#0000a0',
        '#6000a0',
        '#962761',
        '#dd1440',
        '#f0b000',
        '#ffffa0',
        '#ffffff',
    ]).domain([0, 255]),
}
colorMaps.forEach(item => {
    chromaScale[item] = scale(colormap({
        colormap: item,
        format: 'hex',
        alpha: 1,
    })).domain([0, 255])
});
export class SpectrogramTab extends React.Component<{}, SpecState> {
    private specCanvas: RefObject<HTMLCanvasElement>;
    private freqCanvas: RefObject<HTMLCanvasElement>;
    private tempCanvas: HTMLCanvasElement;
    private keyRef: HTMLDivElement[];
    private tempCtx: CanvasRenderingContext2D | null;
    private specCtx: CanvasRenderingContext2D | null;
    private freqCtx: CanvasRenderingContext2D | null;
    private dataPtr: unknown;
    private cqtSize = 0;
    private memory: WebAssembly.Memory | null;
    private analyserNode: AnalyserNode | null;
    private cqtCalc: Function | null;
    private cqtRenderLine: Function | null;
    private aWeightingLUT: Array<number> = [];
    private cqtFreqs: Array<number> = [];
    private _calcTime = 0;
    private _totalTime = 0;
    private _timeCount = 0;
    private _lastTime = 0;
    private raf = 0;
    private lastMax = 0;

    constructor(props: {}) {
        super(props);
        this.specCanvas = React.createRef();
        this.freqCanvas = React.createRef();
        this.tempCanvas = document.createElement("canvas");
        this.tempCtx = null;
        this.specCtx = null;
        this.freqCtx = null;
        this.memory = null;
        this.analyserNode = null;
        this.cqtCalc = null;
        this.cqtRenderLine = null;
        this.keyRef = [];
        this.state = { sensitivity: 150, colormap: 'default', eqAware: false }
    }

    componentDidMount = async () => {
        DispatcherService.on(DispatchEvents.MediaReady, this.initLiveCQT);
        DispatcherService.on(DispatchEvents.MediaReset, this.freeCQT);
        if (MediaPlayerService.isActive()) {
            this.initLiveCQT();
        }
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReady, this.initLiveCQT);
        DispatcherService.off(DispatchEvents.MediaReset, this.freeCQT);
        this.freeCQT();
    }

    toggleEQAware = async (event: React.FormEvent<HTMLInputElement>) => {
        event.currentTarget.blur();
        const { eqAware } = this.state;
        await setStateAsync(this, { eqAware: !eqAware });
        this.analyserNode = this.state.eqAware ? MediaPlayerService.getPostAnalyzer() as AnalyserNode
            : MediaPlayerService.getAnalyzer() as AnalyserNode;
        this.analyserNode.fftSize = this.cqtSize;
        this.analyserNode.smoothingTimeConstant = 0;
        this.analyserNode.minDecibels = -90;
        this.analyserNode.maxDecibels = -30;
    }

    private initLiveCQT = () => {
        const CQT_INIT = MediaPlayerService.getCQTProvider("cqt_init");
        if (!CQT_INIT) return console.error("cqt provider entry point not found", "cqt_init");
        if (!this.specCanvas.current) return console.error("canvas not found");
        if (!this.freqCanvas.current) return console.error("canvas not found");
        const db = 32;
        const supersample = 0;
        const cqtBins = this.freqCanvas.current.width;
        const fMin = 25.95;
        const fMax = 4504.0;
        this.cqtSize = CQT_INIT(MediaPlayerService.getSampleRate(), cqtBins, db, fMin, fMax, supersample);
        if (!this.cqtSize) throw Error('Error initializing constant Q transform.');

        const CQT_BIN_TO_FREQ = MediaPlayerService.getCQTProvider("cqt_bin_to_freq");
        if (!CQT_BIN_TO_FREQ) return console.error("cqt provider entry point not found", "cqt_bin_to_freq");
        this.cqtFreqs = Array(cqtBins).fill(0).map((_, i) => CQT_BIN_TO_FREQ(i));
        this.aWeightingLUT = this.cqtFreqs.map(f => 0.5 + 0.5 * getAWeighting(f));

        const CQT_MALLOC = MediaPlayerService.getCQTProvider("cqt_malloc");
        if (!CQT_MALLOC) return console.error("cqt provider entry point not found", "cqt_malloc");
        this.dataPtr = CQT_MALLOC(this.cqtSize * 4);

        this.analyserNode = this.state.eqAware ? MediaPlayerService.getPostAnalyzer() as AnalyserNode
            : MediaPlayerService.getAnalyzer() as AnalyserNode;
        if (!this.analyserNode) return console.error("cqt failed to get post analyser");
        this.analyserNode.fftSize = this.cqtSize;
        this.analyserNode.smoothingTimeConstant = 0;
        this.analyserNode.minDecibels = -90;
        this.analyserNode.maxDecibels = -30;

        this.tempCanvas.width = this.specCanvas.current.width;
        this.tempCanvas.height = this.specCanvas.current.height;

        this.tempCtx = this.tempCanvas.getContext('2d', { alpha: false });
        this.specCtx = this.specCanvas.current.getContext('2d', { alpha: false });
        this.freqCtx = this.freqCanvas.current.getContext('2d', { alpha: false });

        this.memory = MediaPlayerService.getCQTProvider("memory") as unknown as WebAssembly.Memory;
        this.cqtCalc = MediaPlayerService.getCQTProvider("cqt_calc");
        this.cqtRenderLine = MediaPlayerService.getCQTProvider("cqt_render_line");
        this.updateFrame();
        return true;
    }

    private resetKeys = () => {
        this.keyRef.forEach(item => {
            if (item.parentElement && item.parentElement.classList.contains("piano-key-sharp")) item.style.backgroundColor = "#10161a";
            else item.style.backgroundColor = "white";
        });
    }

    private updateFrame = () => {
        this.raf = requestAnimationFrame(this.updateFrame);
        if (this.memory
            && this.analyserNode
            && this.cqtCalc
            && this.cqtRenderLine
            && this.specCanvas.current
            && this.freqCanvas.current
            && this.specCtx && this.tempCtx && this.freqCtx
        ) {
            const fqHeight = this.freqCanvas.current.height;
            const canvasWidth = this.freqCanvas.current.width;
            const specSpeed = 2;
            const hCoeff = fqHeight / 256.0;

            const colorMap = chromaScale[this.state.colormap as string];
            this.freqCtx.fillStyle = 'black';//'#30404E';
            this.freqCtx.fillRect(0, 0, this.freqCanvas.current.width, this.freqCanvas.current.height);
            this.tempCtx.fillStyle = '000033';//'#30404E';
            this.tempCtx.fillRect(0, 0, this.tempCanvas.width, specSpeed);

            let dataHeap: Float32Array | null = new Float32Array(this.memory.buffer, this.dataPtr as number, this.cqtSize);
            //const start = performance.now();
            this.analyserNode.getFloatTimeDomainData(dataHeap);
            if (!dataHeap.every(n => n === 0)) {
                this.cqtCalc(this.dataPtr, this.dataPtr);
                this.cqtRenderLine(this.dataPtr);

                //const each = (canvasWidth / 88);
                this.resetKeys();
                let cnt = 0;
                for (let x = 0; x < canvasWidth; x += 1) {
                    const weighting = this.aWeightingLUT[x];
                    //eslint-disable-next-line
                    const val = 255 * weighting * dataHeap[x] | 0;
                    //eslint-disable-next-line
                    const h = val * hCoeff | 0;
                    const style = colorMap(val).hex();
                    if (val > this.state.sensitivity) {
                        const freq = this.cqtFreqs[x];
                        const idx = getNoteFrom(Math.round(freq))[0];
                        //const note = getNoteFrom(freq)[1];
                        if (idx !== -1 && cnt <= 10) {
                            /* limit max keys highlighted to 10 */
                            if (this.keyRef.length > idx) {
                                const div = this.keyRef[idx];
                                div.style.backgroundColor = Colors.BLUE5;
                                cnt += 1
                            }
                        }
                    }
                    this.freqCtx.fillStyle = style;
                    this.freqCtx.fillRect(x, fqHeight - h, 1, h);
                    this.tempCtx.fillStyle = style;
                    this.tempCtx.fillRect(x, 0, 1, specSpeed)
                }
            }
            this.lastMax = 0;
            //const middle = performance.now();
            this.tempCtx.translate(0, specSpeed);
            this.tempCtx.drawImage(this.tempCanvas, 0, 0);
            this.tempCtx.setTransform(1, 0, 0, 1, 0, 0);
            this.specCtx.drawImage(this.tempCanvas, 0, 0);

            /*
            const end = performance.now();
            this._calcTime += middle - start;
            this._totalTime += end - start;
            this._timeCount += 1;
            if (this._timeCount >= 200) {
                console.log(
                    '[Spectrogram] %s ms analysis, %s ms total (%s fps) (%s% utilization)',
                    (this._calcTime / this._timeCount).toFixed(2),
                    (this._totalTime / this._timeCount).toFixed(2),
                    (1000 * this._timeCount / (start - this._lastTime)).toFixed(1),
                    (100 * this._totalTime / (end - this._lastTime)).toFixed(1),
                );
                this._calcTime = 0;
                this._timeCount = 0;
                this._totalTime = 0;
                this._lastTime = start;
            }*/
            dataHeap = null;
        }
    }

    private mediaReset = () => this.freeCQT();

    private freeCQT = () => {
        cancelAnimationFrame(this.raf);
        const CQT_FREE = MediaPlayerService.getCQTProvider("cqt_free");
        if (CQT_FREE) CQT_FREE(this.dataPtr);
        if (this.freqCtx && this.freqCanvas.current) {
            this.freqCtx.clearRect(0, 0, this.freqCanvas.current.width, this.freqCanvas.current.height);
        }
        if (this.specCtx && this.specCanvas.current) {
            this.specCtx.clearRect(0, 0, this.specCanvas.current.width, this.specCanvas.current.height);
        }
        this.resetKeys();

        this.freqCtx = null;
        this.tempCtx = null;
        this.specCtx = null;
    }

    render = () => {
        return (
            <div className="spec-root">
                <Card key="spec-controls" className="spec-controls" elevation={Elevation.TWO}>
                    <Callout className="spec-callout font-weight-unset" intent={Intent.PRIMARY} icon={false}>
                        <div className="spec-name">
                            <span style={{ fontSize: 30 + 'px' }}>Chromagram</span>
                            <Switch> online</Switch>
                        </div>
                        <Callout style={{ width: 80 + '%' }}>
                            <Text>Options</Text>
                            <br />
                            <FormGroup label="Note Sensitivity">
                                <Slider
                                    min={0}
                                    max={255}
                                    value={this.state.sensitivity}
                                    labelStepSize={255}
                                    labelRenderer={false}
                                    onChange={v => this.setState({ sensitivity: v })}
                                    onRelease={v => this.setState({ sensitivity: v })}
                                /* labelRenderer={item => {
                                    return <span className="number">{item}</span>
                                }} */
                                />
                            </FormGroup>
                            <FormGroup label="Colormap" inline>
                                <HTMLSelect
                                    onChange={v => {
                                        this.setState({ colormap: v.target.value as ctype });
                                        v.target.blur();
                                    }}
                                    value={this.state.colormap}>
                                    <option value="default">default</option>
                                    {
                                        colorMaps.map((item) => {
                                            return <option key={item} value={item}>{item}</option>
                                        })
                                    }
                                </HTMLSelect>
                            </FormGroup>
                            <FormGroup label="EQ Aware" inline>
                                <Switch checked={this.state.eqAware} onChange={this.toggleEQAware} />
                            </FormGroup>
                        </Callout>
                    </Callout>
                </Card>
                <Card key="spec-panel" elevation={Elevation.TWO} className="spec-info">
                    <Callout className="spec-info-options" icon={false}>
                        <div className="piano-key">
                            <div className="bp3-elevation-2" ref={ref => { if (ref) this.keyRef.push(ref) }}>
                                <div className="piano-key-text">
                                    <span className="piano-key-note">A</span>
                                    <br />
                                </div>
                            </div>
                        </div>
                        <div className="piano-key piano-key-sharp">
                            <div className="" ref={ref => { if (ref) this.keyRef.push(ref) }}>
                                <div className="piano-key-text">
                                    <span className="piano-key-note" />
                                    <br />
                                </div>
                            </div>
                        </div>
                        <div className="piano-key">
                            <div className="bp3-elevation-2" ref={ref => { if (ref) this.keyRef.push(ref) }}>
                                <div className="piano-key-text">
                                    <span className="piano-key-note">B</span>
                                    <br />
                                </div>
                            </div>
                        </div>
                        {
                            [1, 2, 3, 4, 5, 6, 7].map((idx) => {
                                return pitchesFromC.map((note) => {
                                    return (
                                        <div key={note + idx} className={classNames('piano-key', { 'piano-key-sharp': note.includes("#") })}>
                                            <div className="bp3-elevation-2" ref={ref => { if (ref) this.keyRef.push(ref) }}>
                                                <div className="piano-key-text">
                                                    <span className="piano-key-note">{note.includes("#") ? "" : note}</span>
                                                    <br />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            })

                        }
                        <div className="piano-key">
                            <div className="bp3-elevation-2" ref={ref => { if (ref) this.keyRef.push(ref) }}>
                                <div className="piano-key-text">
                                    <span className="piano-key-note">C</span>
                                    <br />
                                </div>
                            </div>
                        </div>
                    </Callout>
                    <div className="spec-info-canvas">
                        <canvas
                            className="freq-canvas"
                            ref={this.freqCanvas}
                            width={448}
                            height={60}
                        />
                        <canvas
                            className="spec-canvas"
                            ref={this.specCanvas}
                            width={448}
                            height={250}
                        />
                    </div>
                </Card>
            </div>
        )
    }
}

export default SpectrogramTab;
