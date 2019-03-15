import React, { Component } from 'react'
import '../css/ControlsBar.css'
import '../css/slider.css'
import "../lib/radiaslider/src/slider-circular"

const { Dispatcher, DispatchEvents } = window.Project;

class ControlBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: true,
        }
        this.volRef = React.createRef();
        this.pitchRef = React.createRef();
        this.tempoRef = React.createRef();
    }

    componentDidMount() {
        this.volSlider = new window.Slider({
            canvasId: "volume-canvas",
            continuousMode: 'true',
        });
        const volCb = (v) => {
            this.volRef.current.innerHTML = "Vol: " + v.value;
            const volume = v.value / 100;
            const mediaPlayer = window.Project.MediaPlayer.instance;
            if (mediaPlayer) {
                mediaPlayer.setVolume(volume);
            }
        }
        this.volSlider.addSlider({
            id: 1,
            radius: 45,
            min: 0,
            max: 100,
            step: 1,
            color: "#104b63",
            changed: v => volCb(v),
        });

        this.tempoSlider = new window.Slider({
            canvasId: "tempo-canvas",
            continuousMode: 'true',
        });
        this.tempoSlider.addSlider({
            id: 1,
            radius: 45,
            min: 25,
            max: 150,
            step: 25,
            color: "#104b63",
            changed: (v) => {
                this.tempoRef.current.innerHTML = "Speed: " + v.value + "%";
            },
        });

        this.pitchSlider = new window.Slider({
            canvasId: "pitch-canvas",
            continuousMode: 'false',
        });
        this.pitchSlider.addSlider({
            id: 1,
            radius: 45,
            min: 0,
            max: 12,
            step: 1,
            color: "#104b63",
            changed: (v) => {
                this.pitchRef.current.innerHTML = "Key: " + v.value;
            },
        });

        const cb = () => {
            const mediaPlayer = window.Project.MediaPlayer.instance;
            if (mediaPlayer) {
                const volume = mediaPlayer.getVolume() * 100
                this.volSlider.setSliderValue(1, volume);
                this.volRef.current.innerHTML = "Vol: " + volume;
                volCb({ value: volume });
            }
        };
        Dispatcher.on(DispatchEvents.MediaReady, cb);
    }

    toggle = () => {
        this.setState(prevState => ({
            expanded: !prevState.expanded,
        }));
    }

    render() {
        const expanded = "controls-collapse-root " + (this.state.expanded ? "collapse show" : "collapse");
        const faclass = this.state.expanded ? "fas fa-caret-down" : "fas fa-caret-right"
        return (
            <div className="controls-header" id="b">
                <div className="controls-text-div">
                    <span className="waveform-a" onClick={this.toggle}>
                        <i className={faclass} />
                        <span style={{ marginLeft: 5 + 'px' }}>CONTROLS</span>
                    </span>
                </div>
                <div className={expanded} id="collapseExample">
                    <div className="controls-container">
                        <div className="controls-flex">

                            <div className="flex1">
                                <div className="canvas-root">
                                    <canvas id="volume-canvas" width="130" height="130" />
                                </div>
                                <div id="vol_val" ref={this.volRef} className="volume-text" />
                            </div>
                            <div className="flex2">
                                <div className="canvas-root">
                                    <canvas id="tempo-canvas" width="130" height="130" />
                                </div>
                                <div id="tempo_val" ref={this.tempoRef} className="tempo-text" />
                            </div>
                            <div className="flex3">
                                <div className="canvas-root">
                                    <canvas id="pitch-canvas" width="130" height="130" />
                                </div>
                                <div id="pitch_val" ref={this.pitchRef} className="pitch-text" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default ControlBar;

//volume
//tempo
//key

//equalizer
//low pass
//high pass
//remove vocals
