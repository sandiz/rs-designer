import React, { Component } from 'react'
import { toast } from 'react-toastify';

import "../../css/MusicInformationBar.css"

import { DispatcherService, DispatchEvents, KeyboardEvents } from '../../services/dispatcher'
import { MediaPlayer } from '../../lib/libWaveSurfer'
import ForageService, { SettingsForageKeys } from '../../services/forage.js';
import { toaster } from '../../lib/utils';

class AnalysisBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: true,
            showMIR: false,
            analysing: false,
        }
        this.se_excludes = ['showMIR', 'analysing']
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReset, this.reset);
        DispatcherService.off(DispatchEvents.MediaReady, this.ready);
        DispatcherService.off(DispatchEvents.MediaAnalysisStart, this.analyseStart);
        DispatcherService.off(DispatchEvents.MediaAnalysisEnd, this.analyseEnd);
    }

    componentWillMount = async () => {
        const savedState = await ForageService.get(SettingsForageKeys.ANALYSIS_SETTINGS);
        if (savedState) {
            this.setState({ ...this.state, ...savedState });
        }
    }

    componentDidMount() {
        DispatcherService.on(DispatchEvents.MediaReset, this.reset);
        DispatcherService.on(DispatchEvents.MediaReady, this.ready);
        DispatcherService.on(DispatchEvents.MediaAnalysisStart, this.analyseStart);
        DispatcherService.on(DispatchEvents.MediaAnalysisEnd, this.analyseEnd);

        DispatcherService.on(KeyboardEvents.ToggleAnalysis, this.toggle);
    }

    analyseStart = () => {
        this.setState({ analysing: true });
        this.toastId = toaster('', 'fas fa-hourglass-half', 'Analysing media in the background...', { autoClose: false });
    }

    analyseEnd = () => {
        this.setState({ analysing: false });
        toast.update(this.toastId, {
            type: toast.TYPE.INFO,
            autoClose: 5000,
            render: (
                <div>
                    <i className="far fa-check-circle" />
                    <span style={{ marginLeft: 5 + 'px' }}>
                        Analysis complete!
                    </span>
                </div>
            ),
        });
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
        }), async () => {
            await ForageService.serializeState(SettingsForageKeys.ANALYSIS_SETTINGS, this.state, this.se_excludes);
        });
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
                            <span style={{ marginLeft: 5 + 'px' }}>ANALYSIS</span>
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

export default AnalysisBar;
