import React, { Component } from 'react'
import '../../css/ControlsBar.css'
import '../../css/slider.css'
import "../../lib/radiaslider/src/slider-circular"
import { SoundTouch, SimpleFilter, getWebAudioNode } from 'soundtouchjs';

import { DispatcherService, DispatchEvents, KeyboardEvents } from '../../services/dispatcher'
import { MediaPlayer } from '../../lib/libWaveSurfer'

class CircleControls extends Component {
    constructor(props) {
        super(props);
        this.volRef = React.createRef();
        this.pitchRef = React.createRef();
        this.tempoRef = React.createRef();
        this.soundTouchNode = null;
        this.st = new SoundTouch();
    }
    //eslint-disable-next-line
    volCallback = (v) => {
        this.volRef.current.innerHTML = v.value;
        const volume = v.value / 100;
        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
            mediaPlayer.setVolume(volume);
        }
    }

    tempoCallback = (v) => {
        this.tempoRef.current.innerHTML = v.value + "%";
        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
            DispatcherService.dispatch(DispatchEvents.TempoChange, v.value);
            mediaPlayer.setPlaybackRate(v.value / 100);
        }
    }

    pitchCallback = (v) => {
        this.pitchRef.current.innerHTML = v.value;
        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
            DispatcherService.dispatch(DispatchEvents.PitchChange, v.value);
            if (mediaPlayer.isPlaying()) {
                mediaPlayer.playPause();
                mediaPlayer.playPause();
            }
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
            color: "#3b7eac",
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
            min: 50,
            max: 150,
            step: 10,
            color: "#3b7eac",
            changed: v => this.tempoCallback(v),
        });
        this.tempoCallback({ value: 100 })

        this.pitchSlider = new window.Slider({
            canvasId: "pitch-canvas",
            continuousMode: 'false',
        });
        this.pitchSlider.addSlider({
            id: 1,
            radius: 45,
            min: -12,
            max: 12,
            step: 1,
            color: "#3b7eac",
            changed: v => this.pitchCallback(v),
        });
        this.pitchCallback({ value: 0 })
    }

    initTempoNode = (mp) => {
        const bk = mp.getBackend();
        const buffer = bk.buffer;
        const channels = buffer.numberOfChannels;
        const l = buffer.getChannelData(0);
        const r = channels > 1 ? buffer.getChannelData(1) : l;
        const length = buffer.length;
        let seekingPos = null;
        let seekingDiff = 0;

        const source = {
            extract: (target, numFrames, position) => {
                if (seekingPos != null) {
                    seekingDiff = seekingPos - position;
                    seekingPos = null;
                }

                position += seekingDiff;

                for (let i = 0; i < numFrames; i += 1) {
                    target[i * 2] = l[i + position];
                    target[i * 2 + 1] = r[i + position];
                }

                return Math.min(numFrames, length - position);
            },
        };
        mp.onplay(() => {
            const mediaPlayer = MediaPlayer.instance;
            const backend = mediaPlayer.getBackend();
            //eslint-disable-next-line
            seekingPos = ~~(backend.getPlayedPercents() * length);
            this.st.tempo = mediaPlayer.getPlaybackRate();
            this.st.pitchSemitones = this.pitchSlider.sliders[1].normalizedValue;
            if (this.st.tempo === 1 && this.st.pitchSemitones === 0) {
                if (this.soundTouchNode) {
                    this.soundTouchNode.disconnect();
                    backend.source.connect(backend.analyser);
                }
            }
            else {
                if (!this.soundTouchNode) {
                    const filter = new SimpleFilter(source, this.st);
                    this.soundTouchNode = getWebAudioNode(
                        backend.ac,
                        filter,
                    );
                }
                backend.source.disconnect(backend.analyser);
                backend.source.connect(this.soundTouchNode);
                this.soundTouchNode.connect(backend.analyser);
            }
        })
        mp.onpause(() => {
            if (this.soundTouchNode) {
                this.soundTouchNode.disconnect();
                const mediaPlayer = MediaPlayer.instance;
                const backend = mediaPlayer.getBackend();
                backend.source.connect(backend.analyser);
            }
        })
        mp.onseek((per) => {
            const mediaPlayer = MediaPlayer.instance;
            const backend = mediaPlayer.getBackend();
            //eslint-disable-next-line
            seekingPos = ~~(backend.getPlayedPercents() * length);
        })
    }

    reset = () => {
        if (this.soundTouchNode) {
            this.soundTouchNode.disconnect();
        }
        this.soundTouchNode = null;
        this.st.tempo = 1;
        this.st.pitch = 0;
        DispatcherService.off(KeyboardEvents.IncreaseTempo, this.incTempo);
        DispatcherService.off(KeyboardEvents.DecreaseTempo, this.decTempo);
        DispatcherService.off(KeyboardEvents.IncreasePitch, this.incPitch);
        DispatcherService.off(KeyboardEvents.DecreasePitch, this.decPitch);
    }

    ready = () => {
        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
            const volume = mediaPlayer.getVolume() * 100
            this.volSlider.setSliderValue(1, volume);
            this.volRef.current.innerHTML = "Vol: " + volume;
            this.volCallback({ value: volume });
            this.initTempoNode(mediaPlayer);

            DispatcherService.on(KeyboardEvents.IncreaseTempo, this.incTempo);
            DispatcherService.on(KeyboardEvents.DecreaseTempo, this.decTempo);
            DispatcherService.on(KeyboardEvents.IncreasePitch, this.incPitch);
            DispatcherService.on(KeyboardEvents.DecreasePitch, this.decPitch);
        }
        else {
            const volume = 100;
            this.volSlider.setSliderValue(1, volume);
            this.volCallback({ value: volume });

            const speed = 100;
            this.tempoSlider.setSliderValue(1, speed);
            this.tempoCallback({ value: speed });

            const semitones = 0;
            this.pitchSlider.setSliderValue(1, semitones);
            this.pitchCallback({ value: semitones });
        }
    };

    change = (type, dir) => {
        switch (type) {
            case "tempo":
                this.tempoSlider.changeSlider(1, dir);
                break;
            case "pitch":
                this.pitchSlider.changeSlider(1, dir);
                break;
            default:
                break;
        }
    }

    incTempo = () => this.change('tempo', 'inc');

    decTempo = () => this.change('tempo', 'dec');

    incPitch = () => this.change('pitch', 'inc');

    decPitch = () => this.change('pitch', 'dec');

    //eslint-disable-next-line
    componentDidMount() {
        this.createCircularSliders();

        DispatcherService.on(DispatchEvents.MediaReset, this.reset);
        DispatcherService.on(DispatchEvents.MediaReady, this.ready);
        this.ready(); //set default values (fail path)
    }

    render() {
        return (
            <div className="controls-container">
                <div className="controls-flex">

                    <div className="flex1">
                        <div className="canvas-root">
                            <canvas id="volume-canvas" width="130" height="130" />
                        </div>
                        <div className="volume-text"> VOLUME </div>
                        <div id="vol_val" ref={this.volRef} className="volume-inner-text" />
                    </div>
                    <div className="flex2">
                        <div className="canvas-root">
                            <canvas id="tempo-canvas" width="130" height="130" />
                        </div>
                        <div className="tempo-text"> TEMPO </div>
                        <div id="tempo_val" ref={this.tempoRef} className="tempo-inner-text" />
                    </div>
                    <div className="flex3">
                        <div className="canvas-root">
                            <canvas id="pitch-canvas" width="130" height="130" />
                        </div>
                        <div className="pitch-text"> PITCH </div>
                        <div id="pitch_val" ref={this.pitchRef} className="pitch-inner-text" />
                    </div>
                </div>
            </div>
        )
    }
}

export default CircleControls;
