import React, { Component } from 'react'
import '../css/ControlsBar.css'
import '../css/slider.css'
import "../lib/radiaslider/src/slider-linear"
import FrequencyGraph from './ControlsBar.frequencygraph';

import { Dispatcher, DispatchEvents } from '../lib/libDispatcher'
import { MediaPlayer } from '../lib/libWaveSurfer'

const temp = {
    min: -40,
    max: 40,
    step: 1,
};

class EqualizerControls extends Component {
    initialState = {
        enableEQ: false,
        enableSpectrum: false,
        enableKaraoke: false,
    }

    constructor(props) {
        super(props);

        this.numBands = 10;
        this.bandRef = [];
        for (let i = 0; i < this.numBands; i += 1) {
            this.bandRef[i] = React.createRef();
        }
        this.state = this.initialState;
        this.filters = [];
    }

    componentDidMount() {
        this.slider = new window.LinearSlider({
            canvasId: "equalizer-canvas",
            continuousMode: true,
            vertical: true,
        });
        this.initSliders();

        Dispatcher.on(DispatchEvents.MediaReset, this.reset);
        Dispatcher.on(DispatchEvents.MediaReady, this.ready);
    }

    createEQFilters = () => {
        const EQ = [
            {
                f: 32,
                type: 'lowshelf',
            },
            {
                f: 60,
                type: 'peaking',
            },
            {
                f: 170,
                type: 'peaking',
            },
            {
                f: 310,
                type: 'peaking',
            },
            {
                f: 600,
                type: 'peaking',
            },
            {
                f: 1000,
                type: 'peaking',
            },
            {
                f: 3000,
                type: 'peaking',
            },
            {
                f: 6000,
                type: 'peaking',
            },
            {
                f: 12000,
                type: 'peaking',
            },
            {
                f: 16000,
                type: 'highshelf',
            },
        ];

        // Create filters
        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
            const backend = mediaPlayer.getBackend();
            if (backend) {
                this.filters = EQ.map((band) => {
                    const filter = backend.ac.createBiquadFilter();
                    filter.type = band.type;
                    filter.gain.value = 0;
                    filter.Q.value = 1;
                    filter.frequency.value = band.f;
                    return filter;
                });

                mediaPlayer.setFilters(this.filters);
            }
        }
    }

    initSliders = () => {
        for (let i = 0; i < this.numBands; i += 1) {
            //horizontal sliders
            const t = temp;
            t.color = "#104b63";//colors[i];
            t.id = i;

            //vertical sliders
            t.width = 100;
            t.x0 = 40 + 40 * i;
            t.y0 = 130;
            t.changed = (v) => {
                if (this.state.enableEQ) {
                    this.setEQFilter(i, v);
                }
            };
            this.slider.addSlider(t);
            this.slider.setSliderValue(i, 0);
        }
    }

    ready = () => {
        this.createEQFilters();
        this.toggleKaraoke();
    }

    toggleKaraoke = () => {
        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
            const sp = mediaPlayer.getScriptProcessor();
            const ac = mediaPlayer.getBackend();
            if (this.state.enableKaraoke) {
                this.filters[this.numBands - 1].disconnect(0);
                this.filters[this.numBands - 1].connect(sp);
                sp.connect(ac.gainNode)
            } else {
                this.filters[this.numBands - 1].connect(ac.gainNode);
                sp.disconnect(0);////this.filters[0]);
            }
            sp.onaudioprocess = (evt) => {
                const inputL = evt.inputBuffer.getChannelData(0);
                const inputR = evt.inputBuffer.getChannelData(1);
                const output = evt.outputBuffer.getChannelData(0);
                const len = inputL.length;
                let i = 0;
                for (; i < len; i += 1) {
                    output[i] = (inputL[i] - inputR[i]) / 2;
                }
            };
        }
    }

    reset = () => {
        this.setState({ ...this.initialState })
        this.filters = []
        this.setEQFilterAndText(0);
    }

    setEQFilter = (idx, val) => {
        if (this.filters.length > 0) {
            const filter = this.filters[idx];
            if (filter) {
                //eslint-disable-next-line
                filter.gain.value = ~~(val.value); //~~ perfs better than math.floor
            }
        }
    }

    onChangeSetEQ = () => {
        if (this.state.enableEQ) {
            if (this.filters.length > 0) {
                for (let idx = 0; idx < this.numBands; idx += 1) {
                    const val = this.slider.sliders[idx].normalizedValue
                    this.setEQFilter(idx, { value: val });
                }
            }
        }
        else {
            if (this.filters.length > 0) {
                for (let idx = 0; idx < this.numBands; idx += 1) {
                    this.setEQFilter(idx, { value: 0 });
                }
            }
            this.setEQFilterAndText(0);
        }
    }

    setEQFilterAndText = (val) => {
        for (let i = 0; i < this.numBands; i += 1) {
            this.slider.setSliderValue(i, val);
            if (this.state.enableEQ) {
                this.setEQFilter(i, { value: val });
            }
        }
    }

    toggle = async (type) => {
        switch (type) {
            case "eq":
                this.setState(prevState => ({
                    enableEQ: !prevState.enableEQ,
                }), () => this.onChangeSetEQ());
                break;
            case "spectrum":
                this.setState(prevState => ({
                    enableSpectrum: !prevState.enableSpectrum,
                }));
                break;
            case "karaoke":
                this.setState(prevState => ({
                    enableKaraoke: !prevState.enableKaraoke,
                }), () => this.toggleKaraoke());
                break;
            default:
                break;
        }
    }

    render() {
        return (
            <div className="controls-container">

                <div className="controls-flex">

                    <div className="eqflex1">
                        <div className="eq-meter">
                            <span className="eq-set" onClick={() => this.setEQFilterAndText(40)}>+40</span>
                        </div>
                        <div className="eq-meter2">
                            <span className="eq-set" onClick={() => this.setEQFilterAndText(0)}>0</span>
                        </div>
                        <div className="eq-meter3">
                            <span className="eq-set" onClick={() => this.setEQFilterAndText(-40)}>-40</span>
                        </div>
                        <div className="">
                            <canvas id="equalizer-canvas" width="420" height="170" />
                        </div>
                        <div className="eq-text">
                            <span>32</span>&nbsp;
                            <span className="eq-subtext1">60</span>&nbsp;
                            <span className="eq-subtext2">170</span>&nbsp;
                            <span className="eq-subtext3">310</span>&nbsp;
                            <span className="eq-subtext4">600</span>&nbsp;
                            <span className="eq-subtext5">1K</span>&nbsp;
                            <span className="eq-subtext6">3K</span>&nbsp;
                            <span className="eq-subtext7">6K</span>&nbsp;
                            <span className="eq-subtext8">12K</span>&nbsp;
                            <span className="eq-subtext9">16K</span>&nbsp;
                        </div>
                    </div>
                    <div className="eqflex2">
                        <FrequencyGraph show={this.state.enableSpectrum} key={"fg_" + (this.state.enableSpectrum ? "true" : "false")} />
                    </div>
                    <div className="eqflex3">
                        <div>
                            <span>Enable Equalizer</span>
                            <div className="custom-control custom-switch checkbox-right">
                                <input type="checkbox" className="custom-control-input" id="customSwitch1" checked={this.state.enableEQ} readOnly onClick={e => this.toggle('eq')} />
                                <label className="custom-control-label" htmlFor="customSwitch1" />
                            </div>
                        </div>
                        <div>
                            <span>Visualise Spectrum</span>
                            <div className="custom-control custom-switch checkbox-right">
                                <input type="checkbox" className="custom-control-input" id="customSwitch2" checked={this.state.enableSpectrum} readOnly onClick={e => this.toggle("spectrum")} />
                                <label className="custom-control-label" htmlFor="customSwitch2" />
                            </div>
                        </div>
                        <div>
                            <span>Remove Vocals</span>
                            <div className="custom-control custom-switch checkbox-right">
                                <input type="checkbox" className="custom-control-input" id="customSwitch3" checked={this.state.enableKaraoke} readOnly onClick={e => this.toggle("karaoke")} />
                                <label className="custom-control-label" htmlFor="customSwitch3" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        )
    }
}

export default EqualizerControls;
