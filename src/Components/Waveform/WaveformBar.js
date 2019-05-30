import React, { Component } from 'react'
import PropTypes from 'prop-types';
import '../../css/WaveformBar.css'
import "../../lib/radiaslider/src/slider-linear"
import { setStateAsync, toggleNeverland } from '../../lib/utils';

import { DispatcherService, DispatchEvents, KeyboardEvents } from '../../services/dispatcher'
import { MediaPlayer } from '../../lib/libWaveSurfer'
import ForageService, { SettingsForageKeys } from '../../services/forage.js';

class WaveformBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: true,
            currentZoom: 1,
            analysing: false,
            showTimeline: false,
        }
        this.zoom = {
            max: 80,
            min: 1,
            default: 1,
        }
        this.se_includes = ['expanded']
        this.containerRef = React.createRef();
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
        DispatcherService.on(DispatchEvents.MediaAnalysisStart, () => this.setState({ analysing: true }));
        DispatcherService.on(DispatchEvents.MediaAnalysisEnd, () => this.setState({ analysing: false }));
        DispatcherService.on(DispatchEvents.AboutToDraw, this.aboutoDraw);
        DispatcherService.on(DispatchEvents.FinishedDrawing, this.finishedDrawing);
    }

    aboutoDraw = (type) => {
        if (type !== "waveform") return;
        if (this.state.expanded === false) {
            toggleNeverland(this.containerRef, true);
            this.containerRef.current.classList.toggle("show", true);
        }
    }

    finishedDrawing = (type) => {
        if (type !== "waveform") return;
        if (this.state.expanded === false) {
            toggleNeverland(this.containerRef, false);
            this.containerRef.current.classList.toggle("show", false);
        }
    }

    reset = () => {
        this.setState({ showTimeline: false });
    }

    ready = () => {
        this.setState({ showTimeline: true });
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
            await setStateAsync(this, { currentZoom: 1 });
        }
    }

    toggle = () => {
        this.setState(prevState => ({
            expanded: !prevState.expanded,
        }), async () => {
            await ForageService.serializeState(SettingsForageKeys.WAVEFORM_SETTINGS, this.state, this.se_includes);
        });
    }

    refresh = async () => {
        const mp = MediaPlayer.instance;
        if (mp) {
            mp.wavesurfer.drawer.fireEvent('redraw');
            await mp.WAVEFORM();
        }
    }

    render() {
        const expanded = "waveform-collapse-root bg-light " + (this.state.expanded ? "collapse show" : "collapse");
        const faclass = this.state.expanded ? "fas fa-caret-down" : "fas fa-caret-right"
        return (
            <div className="waveform-header" id={this.props.id} {...this.props}>
                <div className="waveform-text-div">
                    <span className="waveform-a" onClick={this.toggle}>
                        <i className={faclass} />
                        <span style={{ marginLeft: 5 + 'px' }}>WAVEFORM</span>
                    </span>
                    <span className="ta-right float-right" style={{ display: this.state.expanded ? "block" : "none" }}>
                        <span>
                            <i className="cur-pointer fas fa-sync-alt" onClick={this.refresh} />
                        </span>
                        <span className="dot-separator"> • </span>
                        <i className="cur-pointer fas fa-search-minus" onClick={this.decreaseZoom} />
                        &nbsp;
                        <span>{this.state.currentZoom}x</span>
                        &nbsp;&nbsp;
                        <i className="cur-pointer fas fa-search-plus" onClick={this.increaseZoom} />
                        <i className="cur-pointer fas fa-search" onClick={this.resetZoom} />
                    </span>
                </div>
                <div
                    ref={this.containerRef}
                    className={expanded}
                >
                    <div className="waveform-container" id="container">
                        <div id="waveform" />
                        <div id="timeline" style={{ display: this.state.showTimeline ? "block" : "none" }} />
                    </div>
                </div>
            </div>
        )
    }
}

export default WaveformBar;

WaveformBar.propTypes = {
    id: PropTypes.string,
};

WaveformBar.defaultProps = {
    id: "b",
};
