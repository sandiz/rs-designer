import React, { Component } from 'react'
import '../css/ControlsBar.css'
import '../css/slider.css'
import "../lib/radiaslider/src/slider-circular"

const { Dispatcher, DispatchEvents } = window.Project;

class CircleControls extends Component {
    constructor(props) {
        super(props);
        this.volRef = React.createRef();
        this.pitchRef = React.createRef();
        this.tempoRef = React.createRef();
    }
    //eslint-disable-next-line
    volCallback = (v) => {
        this.volRef.current.innerHTML = "Vol: " + v.value;
        const volume = v.value / 100;
        const mediaPlayer = window.Project.MediaPlayer.instance;
        if (mediaPlayer) {
            mediaPlayer.setVolume(volume);
        }
    }
    //eslint-disable-next-line
    createCircularSliders() {
        this.volSlider = new window.Slider({
            canvasId: "volume-canvas",
            continuousMode: 'true',
        });

        this.volSlider.addSlider({
            id: 1,
            radius: 45,
            min: 0,
            max: 100,
            step: 1,
            color: "#104b63",
            changed: v => this.volCallback(v),
        });
        this.volCallback({ value: 100 });

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
    }
    //eslint-disable-next-line
    componentDidMount() {
        this.createCircularSliders();

        const cb = () => {
            const mediaPlayer = window.Project.MediaPlayer.instance;
            if (mediaPlayer) {
                const volume = mediaPlayer.getVolume() * 100
                this.volSlider.setSliderValue(1, volume);
                this.volRef.current.innerHTML = "Vol: " + volume;
                this.volCallback({ value: volume });
            }
            else {
                const volume = 100;
                this.volSlider.setSliderValue(1, volume);
                this.volRef.current.innerHTML = "Vol: " + volume;
                this.volCallback({ value: volume });
            }
        };
        Dispatcher.on(DispatchEvents.MediaReady, cb);
        cb(); //set default values
    }

    render() {
        return (
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
        )
    }
}

export default CircleControls;
