import React, { Component } from 'react'
import '../css/ControlsBar.css'
import '../css/slider.css'
import "../lib/radiaslider/src/slider-linear"

import { OverlayTrigger, Popover, Button } from 'react-bootstrap'
import { setStateAsync } from '../lib/utils';

const { Dispatcher, DispatchEvents } = window.Project;

const temp = {
    min: -40,
    max: 40,
    step: 1,
};

class EqualizerControls extends Component {
    initialState = {
        enableEQ: false,
        enableFilter: false,
        enableKaraoke: false,
        currentPassFilter: "",
        passFilterFreq: 440,
        passFilterQ: 0,
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
        this.passFilter = null;
    }

    componentDidMount() {
        this.slider = new window.LinearSlider({
            canvasId: "equalizer-canvas",
            continuousMode: true,
            vertical: true,
        });
        this.pslider = new window.LinearSlider({ canvasId: "passfilter-canvas", continuousMode: true, vertical: false });
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
                f: 64,
                type: 'peaking',
            },
            {
                f: 125,
                type: 'peaking',
            },
            {
                f: 250,
                type: 'peaking',
            },
            {
                f: 500,
                type: 'peaking',
            },
            {
                f: 1000,
                type: 'peaking',
            },
            {
                f: 2000,
                type: 'peaking',
            },
            {
                f: 4000,
                type: 'peaking',
            },
            {
                f: 8000,
                type: 'peaking',
            },
            {
                f: 16000,
                type: 'highshelf',
            },
        ];

        // Create filters
        const mediaPlayer = window.Project.MediaPlayer.instance;
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

                this.passFilter = backend.ac.createBiquadFilter();
                this.passFilter.type = "allpass";
                this.passFilter.gain.value = 0;
                this.passFilter.Q.value = 1;
                this.passFilter.frequency.value = 0;

                const allFilters = [...this.filters, this.passFilter];

                mediaPlayer.setFilters(allFilters);
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
        for (let i = 0; i < 2; i += 1) {
            const t = i === 0 ? {
                min: 20,
                max: 20000,
                step: 10,
            } : {
                    min: 0,
                    max: 100,
                    step: 0,
                };
            t.width = 200;
            t.id = i;
            t.x0 = 90;
            t.y0 = 40 + 60 * i;
            t.color = "#104b63"
            t.scaleWidth = 25;
            t.fillWidth = 25;
            t.knobWidth = 25;
            //eslint-disable-next-line
            t.changed = v => this.onPassFilterChanged(v, i);
            this.pslider.addSlider(t);
            this.pslider.setSliderValue(i, i === 0 ? 440 : 0);
        }
    }

    onPassDropdownChange = async (event) => {
        await setStateAsync(this, { currentPassFilter: event.target.value })
        console.log(this.state.currentPassFilter)
    }

    onPassFilterChanged = async (v, index) => {
        if (index === 0) {
            await setStateAsync(this, { passFilterFreq: v.value });
        }
        else {
            await setStateAsync(this, { passFilterQ: v.value });
        }
        if (this.state.enableFilter) {
            //this.onChangeSetFilter();
        }
    }

    ready = () => {
        this.createEQFilters();
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
            case "filters":
                this.setState(prevState => ({
                    enableFilter: !prevState.enableFilter,
                }));
                break;
            case "karaoke":
                this.setState(prevState => ({
                    enableKaraoke: !prevState.enableKaraoke,
                }));
                break;
            default:
                break;
        }
    }

    render() {
        let filterData;
        switch (this.state.currentPassFilter) {
            case "lowpass":
                filterData = (<div>
                    <strong>Lowpass filter: </strong>
                    <span>
                        A lowpass filter allows frequencies below the cutoff frequency
                        to pass through and attenuates frequencies above the cutoff.
                        LOWPASS implements a standard second-order resonant lowpass filter with 12dB/octave rolloff.
                    </span>
                    <br /> <br />
                    <strong>Frequency:</strong>
                    The cutoff frequency above which the frequencies are attenuated <br />
                    <strong>Q:</strong>Controls how peaked the response will be at the cutoff frequency.A large value makes the response more peaked.
                    </div>
                )
                break;
            case "highpass":
                filterData = (<div>
                    <strong>Highpass filter: </strong>
                    <span>
                        A highpass filter is the opposite of a lowpass filter. Frequencies above the cutoff frequency are passed through, but frequencies below the cutoff are attenuated. HIGHPASS implements a standard second-order resonant highpass filter with 12dB/octave rolloff.
                    </span>
                    <br /> <br />
                    <strong>Frequency:</strong>
                    The cutoff frequency above which the frequencies are attenuated <br />
                    <strong>Q: </strong>Controls how peaked the response will be at the cutoff frequency.A large value makes the response more peaked.
                    </div>
                )
                break;
            case "bandpass":
                filterData = (<div>
                    <strong>Bandpass filter: </strong>
                    <span>
                        A bandpass filter allows a range of frequencies to pass through and attenuates the frequencies below and above this frequency range. BANDPASS implements a second-order bandpass filter.
                                            </span>
                    <br /> <br />
                    <strong>Frequency: </strong>
                    The center of the frequency band <br />
                    <strong>Q: </strong>Controls the width of the band. The width becomes narrower as the Q value increases.
                    </div>
                )
                break;
            default:
                filterData = (
                    <div>
                        Choose between lowpass, highpass and bandpass filter.
                        </div>
                )
                break;
        }
        const filterFreqText = `${this.state.passFilterFreq} Hz`
        const filterQText = `${this.state.passFilterQ}`
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
                            <span className="eq-subtext1">64</span>&nbsp;
                            <span className="eq-subtext2">125</span>&nbsp;
                            <span className="eq-subtext3">250</span>&nbsp;
                            <span className="eq-subtext4">500</span>&nbsp;
                            <span className="eq-subtext5">1K</span>&nbsp;
                            <span className="eq-subtext6">2K</span>&nbsp;
                            <span className="eq-subtext7">4K</span>&nbsp;
                            <span className="eq-subtext8">8K</span>&nbsp;
                            <span className="eq-subtext9">16K</span>&nbsp;
                        </div>
                    </div>
                    <div className="eqflex2">
                        <div className="ta-center">
                            <select className="custom-select eq-select" onChange={this.onPassDropdownChange}>
                                <option defaultValue>Pass Filters</option>
                                <option value="lowpass">Lowpass</option>
                                <option value="highpass">Highpass</option>
                                <option value="bandpass">Bandpass</option>
                            </select>

                        </div>
                        <div className="eq-info">
                            <OverlayTrigger
                                trigger="hover"
                                placement="bottom"
                                overlay={
                                    (
                                        <Popover
                                            id="popover-positioned-bottom"
                                            title="Filter Info">
                                            {filterData}
                                        </Popover>
                                    )
                                }
                            >
                                <Button className="badge badge-primary">info</Button>
                            </OverlayTrigger>
                        </div>
                        <div className="">
                            <div className="eq-filter-text">
                                Frequency
                            </div>
                            <div className="eq-filter-text-right">
                                {filterFreqText}
                            </div>
                            <canvas id="passfilter-canvas" width="320" height="300" />
                        </div>
                        <div className="">
                            <div className="eq-filter-text2">
                                Q-factor
                            </div>
                            <div className="eq-filter-text2-right">
                                {filterQText}
                            </div>
                            <canvas id="passfilter2-canvas" width="320" height="300" />
                        </div>
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
                            <span>Enable Filters</span>
                            <div className="custom-control custom-switch checkbox-right">
                                <input type="checkbox" className="custom-control-input" id="customSwitch2" checked={this.state.enableFilter} readOnly onClick={e => this.toggle("filters")} />
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
