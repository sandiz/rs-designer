import React, { Component } from 'react'
import '../css/ControlsBar.css'
import '../css/slider.css'
import "../lib/radiaslider/src/slider-linear"

const { Dispatcher, DispatchEvents } = window.Project;

const temp = {
    min: 0,
    max: 100,
    step: 10,
};

class EqualizerControls extends Component {
    initialState = {
        enableEQ: false,
        enableFilter: false,
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
    }

    // dispatch media ready and enable equalizer state
    // enable equalizer enable -> call this
    // disable equalizer disable filter
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
            const filters = EQ.map((band) => {
                const filter = mediaPlayer.backend.ac.createBiquadFilter();
                filter.type = band.type;
                filter.gain.value = 0;
                filter.Q.value = 1;
                filter.frequency.value = band.f;
                return filter;
            });
            console.log(filters);
        }
    }

    initSliders = () => {
        for (let i = 0; i < 10; i += 1) {
            //horizontal sliders
            const t = temp;
            t.color = "#104b63";//colors[i];
            t.id = i;

            //vertical sliders
            t.width = 100;
            t.x0 = 40 + 40 * i;
            t.y0 = 130;
            this.slider.addSlider(t);
            this.slider.setSliderValue(i, 50);
        }
        for (let i = 0; i < 2; i += 1) {
            const t = temp;
            t.width = 200;
            t.id = i;
            t.x0 = 90;
            t.y0 = 40 + 40 * i;
            t.color = "#104b63"
            t.scaleWidth = 25;
            t.fillWidth = 25;
            t.knobWidth = 25;
            this.pslider.addSlider(t);
            this.pslider.setSliderValue(i, 50);
        }
    }

    reset = () => {
        this.setState({ ...this.initialState })
    }

    toggle = (type) => {
        switch (type) {
            case "eq":
                this.setState(prevState => ({
                    enableEQ: !prevState.enableEQ,
                }));
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
        return (
            <div className="controls-container">

                <div className="controls-flex">

                    <div className="eqflex1">
                        <div className="eq-meter">
                            <span>+40</span>
                        </div>
                        <div className="eq-meter2">
                            <span>0</span>
                        </div>
                        <div className="eq-meter3">
                            <span>-40</span>
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
                            <select className="custom-select eq-select">
                                <option defaultValue>Pass Filters</option>
                                <option value="1">Lowpass</option>
                                <option value="2">Highpass</option>
                                <option value="3">Bandpass</option>
                            </select>
                        </div>
                        <div className="">
                            <canvas id="passfilter-canvas" width="320" height="300" />
                        </div>
                        <div className="">
                            <canvas id="passfilter2-canvas" width="320" height="300" />
                        </div>
                    </div>
                    <div className="eqflex3">
                        <div>
                            <span>Enable Equalizer</span>
                            <div className="custom-control custom-switch checkbox-right">
                                <input type="checkbox" className="custom-control-input" id="customSwitch1" checked={this.state.enableEQ} onClick={e => this.toggle('eq')} />
                                <label className="custom-control-label" htmlFor="customSwitch1" />
                            </div>
                        </div>
                        <div>
                            <span>Enable Filters</span>
                            <div className="custom-control custom-switch checkbox-right">
                                <input type="checkbox" className="custom-control-input" id="customSwitch2" checked={this.state.enableFilter} onClick={e => this.toggle("filters")} />
                                <label className="custom-control-label" htmlFor="customSwitch2" />
                            </div>
                        </div>
                        <div>
                            <span>Remove Vocals</span>
                            <div className="custom-control custom-switch checkbox-right">
                                <input type="checkbox" className="custom-control-input" id="customSwitch3" checked={this.state.enableKaraoke} onClick={e => this.toggle("karaoke")} />
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
