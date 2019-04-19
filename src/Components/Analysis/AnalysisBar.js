import React, { Component } from 'react'
import { toast } from 'react-toastify';

import "../../css/AnalysisBar.css"

import { DispatcherService, DispatchEvents, KeyboardEvents } from '../../services/dispatcher'
import { MediaPlayer } from '../../lib/libWaveSurfer'
import ForageService, { SettingsForageKeys } from '../../services/forage.js';

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

    analyseStart = (method) => {
        this.setState({ analysing: true });
        //this.toastId = toaster('', 'fas fa-hourglass-half', 'Analysing media in the background...', { autoClose: false });
        this.toastId = toast(({ closeToast }) => (
            <div
                style={{
                    fontSize: 16 + 'px',
                    color: 'black',
                }}
                className="flex-col">
                {
                    method === "generate" ? "Analysing.." : "Reading From Disk.."
                }
                <div className="flex-row" style={{ fontSize: 14 + 'px' }}>
                    <div className="notif-item">Key + Chords</div>
                    <div className="notif-item-2">
                        <div className="spin spinner-border text-primary float-right" role="status" />
                    </div>
                </div>
                <div className="flex-row" style={{ fontSize: 14 + 'px' }}>
                    <div className="notif-item">Tempo + Beats</div>
                    <div className="notif-item-2">
                        <div className="spin spinner-border text-primary float-right" role="status" />
                    </div>
                </div>
                <div className="flex-row" style={{ fontSize: 14 + 'px' }}>
                    <div className="notif-item">Chromagram</div>
                    <div className="notif-item-2">
                        <div className="spin spinner-border text-primary float-right" role="status" />
                    </div>
                </div>
            </div>
        ), {
                autoClose: (640 / window.os.cpus().length) * 1000, /* dumb heuristic, mbp i7-4770HQ CPU @ 2.20GHz * 8 takes ~80 seconds */
                pauseOnFocusLoss: false,
                pauseOnHover: false,
            })
    }

    analyseEnd = (method) => {
        const type = method === "generate" ? "cached" : "loaded"
        this.setState({ analysing: false });
        toast.update(this.toastId, {
            type: toast.TYPE.SUCCESS,
            autoClose: 5000,
            render: (
                <div style={{
                    fontSize: 18 + 'px',
                }}>
                    <i className="far fa-check-circle" />
                    <span style={{ marginLeft: 5 + 'px' }}>
                        Analysis data {type} successfully!
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
                            !this.state.analysing
                                ? <span style={{ marginLeft: 5 + 'px' }}>CHROMAGRAM</span>
                                : (
                                    <div style={{ display: 'inline' }}>
                                        <span style={{ marginLeft: 5 + 'px' }}>WAITING FOR ANALYSIS TO END...</span>
                                        <div style={{ display: 'inline', float: 'right' }}>
                                            <div style={{ marginBottom: 4 + 'px' }} className="spinner-grow text-primary" role="status" />
                                        </div>
                                    </div>
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

export default AnalysisBar;
