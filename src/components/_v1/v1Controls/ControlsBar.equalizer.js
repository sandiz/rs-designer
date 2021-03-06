import React, { Component } from 'react'
import '../../css/ControlsBar.css'
import '../../css/slider.css'
import "../../lib/radiaslider/src/slider-linear"
import FrequencyGraph from './ControlsBar.frequencygraph';

import { DispatcherService, DispatchEvents } from '../../services/dispatcher'
import { MediaPlayer } from '../../lib/libWaveSurfer'
import WebAudioFilters, { FilterTypes } from '../../lib/filters/filters'

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
        enableTranspose: false,
    }

    constructor(props) {
        super(props);

        this.numBands = 10;
        this.bandRef = [];
        for (let i = 0; i < this.numBands; i += 1) {
            this.bandRef[i] = React.createRef();
        }
        this.state = { ...this.initialState }
        this.filters = [];
    }

    componentDidMount() {
        this.slider = new window.LinearSlider({
            canvasId: "equalizer-canvas",
            continuousMode: true,
            vertical: true,
        });
        this.initSliders();

        DispatcherService.on(DispatchEvents.MediaReset, this.reset);
        DispatcherService.on(DispatchEvents.MediaReady, this.ready);
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
        const color = "#3b7eac"
        for (let i = 0; i < this.numBands; i += 1) {
            //horizontal sliders
            const t = temp;
            t.color = color;
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

    toggleKaraoke = async () => {
        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
            const backend = mediaPlayer.getBackend();
            const sp = await WebAudioFilters.createFilter(FilterTypes.karaoke, backend);
            if (sp == null) { return; }
            if (this.state.enableKaraoke) {
                this.filters[this.numBands - 1].disconnect(0);
                this.filters[this.numBands - 1].connect(sp).connect(backend.gainNode);
                //sp.connect(backend.gainNode)
            } else {
                this.filters[this.numBands - 1].connect(backend.gainNode);
                sp.disconnect(0);////this.filters[0]);
            }
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

    toggle = async (e, type) => {
        e.currentTarget.blur()
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
            case "transpose":
                this.setState(prevState => ({
                    enableTranspose: !prevState.enableTranspose,
                }), () => {
                    DispatcherService.dispatch(DispatchEvents.TransposeMode, this.state.enableTranspose);
                });
            default:
                break;
        }
    }

    render() {
        return (
            <div className="controls-container">

                <div className="controls-flex">

                    <div className="eqflex1">
                        <div className="eq-meter-flex">
                            <div className="eq-meter">
                                <span className="eq-set" onClick={() => this.setEQFilterAndText(40)}>+40</span>
                            </div>
                            <div className="eq-meter2">
                                <span className="eq-set" onClick={() => this.setEQFilterAndText(0)}>0</span>
                            </div>
                            <div className="eq-meter3">
                                <span className="eq-set" onClick={() => this.setEQFilterAndText(-40)}>-40</span>
                            </div>
                        </div>
                        <div className="">
                            <canvas id="equalizer-canvas" width="420" height="170" />
                        </div>
                        <div className="eq-text">
                            <span className="eq-subtext10">32</span>&nbsp;
                            <span className="eq-subtext10">60</span>&nbsp;
                            <span className="eq-subtext10">170</span>&nbsp;
                            <span className="eq-subtext10">310</span>&nbsp;
                            <span className="eq-subtext10">600</span>&nbsp;
                            <span className="eq-subtext10">1K</span>&nbsp;
                            <span className="eq-subtext10">3K</span>&nbsp;
                            <span className="eq-subtext10">6K</span>&nbsp;
                            <span className="eq-subtext10">12K</span>&nbsp;
                            <span className="eq-subtext10">16K</span>&nbsp;
                        </div>
                    </div>
                    <div className="eqflex2">
                        <FrequencyGraph show={this.state.enableSpectrum} key={"fg_" + (this.state.enableSpectrum ? "true" : "true")} />
                    </div>
                    <div className="eqflex3">
                        <div>
                            <span>Enable Equalizer</span>
                            <div className="custom-control custom-switch checkbox-right">
                                <input type="checkbox" className="custom-control-input" id="customSwitch1" checked={this.state.enableEQ} readOnly onMouseDown={e => e.preventDefault()} onClick={e => this.toggle(e, 'eq')} />
                                <label className="custom-control-label" htmlFor="customSwitch1"> </label>
                            </div>
                        </div>
                        <div>
                            <span>Visualize Spectrum</span>
                            <div className="custom-control custom-switch checkbox-right">
                                <input type="checkbox" className="custom-control-input" id="customSwitch2" checked={this.state.enableSpectrum} readOnly onMouseDown={e => e.preventDefault()} onClick={e => this.toggle(e, "spectrum")} />
                                <label className="custom-control-label" htmlFor="customSwitch2"> </label>
                            </div>
                        </div>
                        <div>
                            <span>Remove Vocals</span>
                            <div className="custom-control custom-switch checkbox-right">
                                <input type="checkbox" className="custom-control-input" id="customSwitch3" checked={this.state.enableKaraoke} readOnly onMouseDown={e => e.preventDefault()} onClick={e => this.toggle(e, "karaoke")} />
                                <label className="custom-control-label" htmlFor="customSwitch3"> </label>
                            </div>
                        </div>
                        <div title="Pitch slider transpoes instead of affecting pitch">
                            <span>Transpose Mode</span>
                            <div className="custom-control custom-switch checkbox-right">
                                <input type="checkbox" className="custom-control-input" id="customSwitch4" checked={this.state.enableTranspose} readOnly onMouseDown={e => e.preventDefault()} onClick={e => this.toggle(e, "transpose")} />
                                <label className="custom-control-label" htmlFor="customSwitch4"> </label>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        )
    }
}

export default EqualizerControls;
