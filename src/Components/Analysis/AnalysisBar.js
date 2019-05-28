import React, { Component } from 'react'
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

import "../../css/AnalysisBar.css"

import { DispatcherService, DispatchEvents, KeyboardEvents } from '../../services/dispatcher'
import { MediaPlayer } from '../../lib/libWaveSurfer'
import ForageService, { SettingsForageKeys } from '../../services/forage.js';
import ProjectService from '../../services/project';
import { SettingsService } from '../../services/settings';
import { setStateAsync } from '../../lib/utils';

class AnalysisBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: true,
            showMIR: false,
            analysing: false,
            currentVZoom: 1,
            currentZoom: 1,
        }
        this.zoom = {
            max: 40,
            min: 1,
            default: 5,
            increment: 1000, /* increment by 1000 pixels */
        }
        this.se_excludes = ['showMIR', 'analysing']
        this.containerRef = React.createRef();
        this.specRef = React.createRef();
        this.playHeadRef = React.createRef();
        this.cqtDims = { w: 0, h: 0 };
        this.currDims = { w: 0, h: 0 };
        this.raf = 0;
        this.mediaPlayer = null;
        this.defaultLeft = 44;
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
        DispatcherService.on(DispatchEvents.AboutToDraw, this.aboutoDraw);
        DispatcherService.on(DispatchEvents.FinishedDrawing, this.finishedDrawing);
    }

    aboutoDraw = (type) => {
        if (type !== "cqt") return;
        if (this.state.expanded === false) {
            this.containerRef.current.classList.toggle("show", true);
        }
    }

    finishedDrawing = (type) => {
        if (type !== "cqt") return;
        if (this.state.expanded === false) {
            this.containerRef.current.classList.toggle("show", false);
        }
    }

    analyseStart = (method) => {
        this.mediaPlayer = null;
        if (this.raf) cancelAnimationFrame(this.raf);
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
                autoClose: (800 / window.os.cpus().length) * 1000, /* dumb heuristic, mbp i7-4770HQ CPU @ 2.20GHz * 8 takes ~100 seconds */
                pauseOnFocusLoss: false,
                pauseOnHover: false,
            });
    }

    analyseEnd = async (method) => {
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
        this.mediaPlayer = MediaPlayer.instance.getBackend();
        await this.cqtImageRender();
    }

    playHeadRender = async () => {
        if (this.mediaPlayer) {
            const totalWidth = this.currDims.w;
            const leftx = this.containerRef.current.offsetWidth / 2;
            const rightx = (totalWidth) - leftx;
            const pp = this.mediaPlayer.getPlayedPercents();
            const currPos = totalWidth * pp;
            if (currPos <= leftx) {
                //move playhead
                const css = `translate3d(${currPos}px, 0px, 0px)`;
                this.playHeadRef.current.style.transform = css;
            }
            else if (currPos >= rightx) {
                //move playhead
                console.log("end");
            }
            else {
                console.log("mid");
            }
            this.raf = requestAnimationFrame(this.playHeadRender);
        }
    }

    cqtImageRender = async () => {
        if (await SettingsService.isLayoutAvailable("chromagram")) {
            DispatcherService.dispatch(DispatchEvents.AboutToDraw, "cqt");
            const img = document.querySelector("#spectrogram img");
            const info = ProjectService.getProjectInfo();
            img.src = "file:///" + info.cqt;
            // eslint-disable-next-line
            img.onload = () => {
                this.cqtDims.w = img.width;
                this.cqtDims.h = img.height;
                img.style.display = "";
                img.style.width = this.containerRef.current.offsetWidth + 'px';
                img.style.height = this.containerRef.current.offsetHeight + 'px';

                this.currDims.w = parseFloat(this.specRef.current.style.width);
                this.currDims.h = parseFloat(this.specRef.current.style.height);

                this.playHeadRender();
                DispatcherService.dispatch(DispatchEvents.FinishedDrawing, "cqt");
            }
        }
    }

    reset = () => {
        this.setState({ showMIR: false });
    }

    ready = () => {
        this.setState({ showMIR: true });
    }

    zoomfn = async (type) => {
        if (type === "stretch") {
            let zoom = this.state.currentVZoom;
            if (zoom === 1) zoom = 2;
            else zoom = 1;
            this.setState({ currentVZoom: zoom })
            this.specRef.current.style.height = (this.containerRef.current.offsetHeight * zoom) + 'px';
        }
        else if (type === "inc") {
            const curr = this.state.currentZoom;
            if (curr < this.zoom.max) {
                await setStateAsync(this, { currentZoom: curr + 1 });
            }
            const diff = (this.state.currentZoom - curr);
            const p = parseFloat(this.specRef.current.style.width);
            this.specRef.current.style.width = (p + (diff * this.zoom.increment)) + 'px';
        }
        else if (type === "dec") {
            const curr = this.state.currentZoom;
            if (curr > this.zoom.min) {
                await setStateAsync(this, { currentZoom: curr - 1 });
            }
            const diff = (this.state.currentZoom - curr);
            const p = parseFloat(this.specRef.current.style.width);
            this.specRef.current.style.width = (p + (diff * this.zoom.increment)) + 'px';
        }
        else if (type === "reset") {
            this.specRef.current.style.width = this.containerRef.current.offsetWidth + 'px';
            this.specRef.current.style.height = this.containerRef.current.offsetHeight + 'px';
        }
        this.currDims.w = parseFloat(this.specRef.current.style.width);
        this.currDims.h = parseFloat(this.specRef.current.style.height);
    }

    toggle = () => {
        this.setState(prevState => ({
            expanded: !prevState.expanded,
        }), async () => {
            /* (old cqt method)
            const mediaPlayer = MediaPlayer.instance;
            if (mediaPlayer) {
                const acPlugins = mediaPlayer.wavesurfer.getActivePlugins();
                if (acPlugins.constantq === true) {
                    if (this.state.expanded) {
                        // start update
                        mediaPlayer.wavesurfer.constantq.resumeUpdate();
                    }
                    else {
                        mediaPlayer.wavesurfer.constantq.pauseUpdate();
                    }
                }
            }
            */
            await ForageService.serializeState(SettingsForageKeys.ANALYSIS_SETTINGS, this.state, this.se_excludes);
        });
    }

    refresh = async () => {
        const mp = MediaPlayer.instance;
        if (mp) {
            await mp.CQT();
        }
    }

    render = () => {
        const expanded = "mir-collapse-root bg-light " + (this.state.expanded ? "collapse show" : "collapse");
        const faclass = this.state.expanded ? "fas fa-caret-down" : "fas fa-caret-right"
        return (
            <div className="mir-header" id={this.props.id} {...this.props}>
                <div className="mir-text-div">
                    <span className="waveform-a" onClick={this.toggle}>
                        <i className={faclass} />
                        {
                            !this.state.analysing
                                ? <span style={{ marginLeft: 5 + 'px' }}>ANALYSIS</span>
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
                    <span className="ta-right float-right" style={{ display: this.state.expanded ? "block" : "none" }}>
                        <span>
                            <i className="cur-pointer fas fa-sync-alt" onClick={this.refresh} title="Re-analyse" />
                        </span>
                        <span className="dot-separator"> • </span>
                        <span>
                            <i className="cur-pointer fas fa-arrows-alt-v" title="Zoom Vertically" onClick={e => this.zoomfn('stretch')} />
                        </span>
                        <span className="dot-separator"> • </span>
                        <i className="cur-pointer fas fa-search-minus" onClick={e => this.zoomfn('dec')} />
                        &nbsp;
                        <span>{this.state.currentZoom}x</span>
                        &nbsp;&nbsp;
                        <i className="cur-pointer fas fa-search-plus" onClick={e => this.zoomfn('inc')} />
                        <i className="cur-pointer fas fa-search" onClick={e => this.zoomfn('reset')} />
                    </span>
                </div>
                <div ref={this.containerRef} className={expanded} id="mir-vis-container">
                    <div className="mir-container d-flex flex-row">
                        <div
                            className="progress-playhead"
                            id="playhead"
                            ref={this.playHeadRef}
                            style={{
                                height: 514 + 'px',
                                borderRight: '1px solid white',
                                position: 'absolute',
                                left: this.defaultLeft + 'px',
                                zIndex: 5,
                                width: 0 + 'px',
                                willChange: 'transform',
                                transform: 'translate3d(0px, 0px, 0px)',
                            }} />
                        <div id="spectrogram" style={{ display: this.state.showMIR ? "block" : "none" }}>
                            <img
                                ref={this.specRef}
                                alt="spectrogram"
                                style={{
                                    display: 'none',
                                    position: 'relative',
                                    width: 0 + 'px',
                                }} />
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default AnalysisBar;


AnalysisBar.propTypes = {
    id: PropTypes.string,
};

AnalysisBar.defaultProps = {
    id: "c",
};
