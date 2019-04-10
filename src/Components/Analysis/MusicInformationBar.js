import React, { Component } from 'react'
import "../../css/MusicInformationBar.css"

import { Dispatcher, DispatchEvents } from '../../lib/libDispatcher'
import { MediaPlayer } from '../../lib/libWaveSurfer'

class MusicInformationBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: true,
            showMIR: false,
            analysing: false,
        }
    }

    componentWillUnmount() {
        Dispatcher.off(DispatchEvents.MediaReset, this.reset);
        Dispatcher.off(DispatchEvents.MediaReady, this.ready);
        Dispatcher.off(DispatchEvents.MediaAnalysisStart, this.analyseStart);
        Dispatcher.off(DispatchEvents.MediaAnalysisEnd, this.analyseEnd);
    }

    componentDidMount() {
        Dispatcher.on(DispatchEvents.MediaReset, this.reset);
        Dispatcher.on(DispatchEvents.MediaReady, this.ready);
        Dispatcher.on(DispatchEvents.MediaAnalysisStart, this.analyseStart);
        Dispatcher.on(DispatchEvents.MediaAnalysisEnd, this.analyseEnd);
    }

    analyseStart = () => {
        this.setState({ analysing: true });
    }

    analyseEnd = () => {
        this.setState({ analysing: false });
    }

    reset = () => {
        this.setState({ showMIR: false });
    }

    ready = () => {
        this.setState({ showMIR: true });
    }

    loadSpec = () => {
        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
            mediaPlayer.wavesurfer.initPlugin("spectrogram");
        }
    }

    toggle = () => {
        this.setState(prevState => ({
            expanded: !prevState.expanded,
        }))
    }

    render() {
        const expanded = "mir-collapse-root bg-light " + (this.state.expanded ? "collapse show" : "collapse");
        const faclass = this.state.expanded ? "fas fa-caret-down" : "fas fa-caret-right"
        return (
            <div className="mir-header" id="c">
                <div className="mir-text-div">
                    <span className="waveform-a" onClick={this.toggle}>
                        <i className={faclass} />
                        {
                            !this.state.analysing
                                ? <span style={{ marginLeft: 5 + 'px' }}>ANALYSIS</span>
                                : (
                                    <span
                                        style={{ marginLeft: 5 + 'px' }}>Background Processing...
                                        <span className="spinner-grow text-info analysisspinner" role="status">
                                            <span className="sr-only">Loading...</span>
                                        </span>
                                    </span>
                                )
                        }
                    </span>
                </div>
                <div className={expanded} id="">
                    <div className="mir-container">
                        <div id="spectrogram" style={{ display: this.state.showMIR ? "block" : "none" }} />
                    </div>
                </div>
            </div>
        )
    }
}

export default MusicInformationBar;
