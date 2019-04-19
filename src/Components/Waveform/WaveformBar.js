import React, { Component } from 'react'
import '../../css/WaveformBar.css'
import "../../lib/radiaslider/src/slider-linear"
import { setStateAsync } from '../../lib/utils';

import { DispatcherService, DispatchEvents, KeyboardEvents } from '../../services/dispatcher'
import { MediaPlayer } from '../../lib/libWaveSurfer'
import ForageService, { SettingsForageKeys } from '../../services/forage.js';

class WaveformBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: true,
            showTimeline: false,
            showMinimap: false,
            showChordsTimeline: false,
            showBeatsTimeline: false,
            currentZoom: 1,
        }
        this.zoom = {
            max: 200,
            min: 1,
            default: 20,
        }
        this.se_excludes = ['showTimeline', 'showMinimap', 'showChordsTimeline', 'showBeatsTimeline']
    }

    componentWillMount = async () => {
        const savedState = await ForageService.get(SettingsForageKeys.WAVEFORM_SETTINGS);
        if (savedState) {
            this.setState({ ...this.state, ...savedState });
        }
    }

    componentDidMount() {
        DispatcherService.on(DispatchEvents.MediaReset, this.reset);
        DispatcherService.on(DispatchEvents.MediaReady, this.ready);
        DispatcherService.on(KeyboardEvents.ToggleWaveform, this.toggle);
    }

    reset = () => {
        this.setState({
            showTimeline: false, showMinimap: false, showChordsTimeline: false, showBeatsTimeline: false,
        });
    }

    ready = () => {
        this.setState({
            showTimeline: true, showMinimap: true, showChordsTimeline: true, showBeatsTimeline: true,
        });
        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
            const min = mediaPlayer.wavesurfer.params.minPxPerSec;

            this.setState({ currentZoom: min });
            mediaPlayer.zoom(Number(min));
        }
    }

    increaseZoom = async () => {
        const curr = this.state.currentZoom;
        if (curr < this.zoom.max) {
            await setStateAsync(this, { currentZoom: curr + 1 });
            const mediaPlayer = MediaPlayer.instance;
            if (mediaPlayer) {
                mediaPlayer.zoom(Number(this.state.currentZoom));
            }
        }
    }

    decreaseZoom = async () => {
        const curr = this.state.currentZoom;
        if (curr > this.zoom.min) {
            await setStateAsync(this, { currentZoom: curr - 1 });
            const mediaPlayer = MediaPlayer.instance;
            if (mediaPlayer) {
                mediaPlayer.zoom(Number(this.state.currentZoom));
            }
        }
    }

    resetZoom = async () => {
        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
            await setStateAsync(this, { currentZoom: this.zoom.default });

            mediaPlayer.zoom(Number(this.state.currentZoom));
        } else {
            console.log("rezb");
            await setStateAsync(this, { currentZoom: 1 });
        }
    }

    toggle = () => {
        this.setState(prevState => ({
            expanded: !prevState.expanded,
        }), async () => {
            await ForageService.serializeState(SettingsForageKeys.WAVEFORM_SETTINGS, this.state, this.se_excludes);
        });
    }

    render() {
        const expanded = "waveform-collapse-root bg-light " + (this.state.expanded ? "collapse show" : "collapse");
        const faclass = this.state.expanded ? "fas fa-caret-down" : "fas fa-caret-right"
        return (
            <div className="waveform-header" id="b">
                <div className="waveform-text-div">
                    <span className="waveform-a" onClick={this.toggle}>
                        <i className={faclass} />
                        <span style={{ marginLeft: 5 + 'px' }}>WAVEFORM</span>
                    </span>
                    <span className="waveform-zoom">
                        <i className="cur-pointer fas fa-search-minus" onClick={this.decreaseZoom} />
                        &nbsp;
                        <span>{this.state.currentZoom}x</span>
                        &nbsp;&nbsp;
                        <i className="cur-pointer fas fa-search-plus" onClick={this.increaseZoom} />
                        <i className="cur-pointer fas fa-search" onClick={this.resetZoom} />
                    </span>
                </div>
                <div className={expanded} id="">
                    <div className="waveform-container">
                        <div id="chordstimeline" style={{ display: this.state.showChordsTimeline ? "block" : "none" }} />
                        <div id="beatstimeline" style={{ display: this.state.showBeatsTimeline ? "block" : "none" }} />
                        <div id="waveform" />
                        <div id="timeline" style={{ display: this.state.showTimeline ? "block" : "none" }} />
                        <div id="minimap" style={{ display: this.state.showMinimap ? "block" : "none" }} />
                    </div>
                </div>
            </div>
        )
    }
}

export default WaveformBar;
