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
import { getTransposedKey } from '../../lib/music-utils';

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
            default: 6,
            increment: 1000, /* increment by 1000 pixels */
        }
        this.se_includes = ['expanded'];

        this.containerRef = React.createRef();
        this.imgRef = React.createRef();
        this.playHeadRef = React.createRef();
        this.specRef = React.createRef();
        this.chordsRef = React.createRef();

        this.cqtDims = { w: 0, h: 0, defaultHeight: 512 };
        this.currDims = { w: 0, h: 0 };
        this.raf = 0;
        this.mediaPlayer = null;
        this.chordsColor = { light: '#3b7eac', dark: '#436a88' };
        this.chordsGridElements = [];
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
        this.mediaPlayer = MediaPlayer.instance;

        this.mediaPlayer.wavesurfer.un('play', this._onPlay);
        this.mediaPlayer.wavesurfer.on('play', this._onPlay);

        this.mediaPlayer.wavesurfer.un('pause', this._onPause);
        this.mediaPlayer.wavesurfer.on('pause', this._onPause);

        this.mediaPlayer.wavesurfer.un('finish', this._onFinish);
        this.mediaPlayer.wavesurfer.on('finish', this._onFinish);

        this.mediaPlayer.wavesurfer.un('seek', this._onSeek);
        this.mediaPlayer.wavesurfer.on('seek', this._onSeek);

        DispatcherService.on(DispatchEvents.PitchChange, v => this.chordsRender(v));
        await this.cqtImageRender();
    }

    _onFinish = () => {
        this.playHeadRef.current.style.transform = `translate3d(0px, 0px, 0px)`
        this.imgRef.current.style.transform = `translate3d(0px, 0px, 0px)`;
        this.specRef.current.style.overflow = "";
    }

    _onSeek = (progress) => {
        if (progress <= 0 && !this.mediaPlayer.isPlaying()) {
            //stop called
            this._onFinish();
        }
    }

    _onPlay = () => {
        this.specRef.current.style.overflow = "hidden";
    }

    _onPause = () => {
        // this.imgRef.current.style.transform = `translate3d(0px, 0px, 0px)`;
        // this.specRef.current.style.overflow = "auto";
        // this.specRef.current.style.position = "";
    }

    chordsRender = async (transpose = 0) => {
        let chords = [];
        try {
            chords = await ProjectService.readChords();
        }
        catch (ex) {
            if (!Array.isArray(chords)) chords = []
        }
        if (chords.length > 0) {
            const duration = Math.round(this.mediaPlayer.getDuration() * 100) / 100;
            console.log("num chords: ", chords.length, "song duration", duration);

            let gridColums = "";
            chords.forEach((chordsData, i) => {
                let [start, end, chord, type] = chordsData;
                start = parseFloat(start);
                end = parseFloat(end);

                chord = getTransposedKey(chord, transpose);
                if (type === 'maj') type = '';
                if (!chord) chord = '';
                if (!type) type = '';
                const text = chord + type.toLowerCase();
                const diff = Math.round((end - start) * 100) / 100;

                let c = null;
                if (i in this.chordsGridElements) c = this.chordsGridElements[i];
                else c = document.createElement('div');

                let j = i + 1;
                c.style.gridArea = `1 / ${j} / 2 / ${j += 1}`;
                c.style.backgroundColor = (i % 2 ? '#3b7eac' : '#436a88');
                c.className = "chords-grid-div";
                c.textContent = text;
                c.title = text;

                if (!(i in this.chordsGridElements)) {
                    this.chordsRef.current.appendChild(c);
                    this.chordsGridElements[i] = c;
                    gridColums += `${diff}fr `;
                }
            });
            this.chordsRef.current.style['grid-template-columns'] = gridColums;
        }
    }

    playHeadRender = async () => {
        if (this.mediaPlayer) {
            if (this.mediaPlayer.isPlaying()) {
                const totalWidth = this.currDims.w;
                const leftx = this.containerRef.current.offsetWidth / 2;
                const rightx = (totalWidth) - leftx;
                const pp = this.mediaPlayer.getBackend().getPlayedPercents();
                const currPos = totalWidth * pp;
                if (currPos <= leftx) {
                    //move playhead
                    this.playHeadRef.current.style.transform = `translate3d(${currPos}px, 0px, 0px)`;
                    this.imgRef.current.style.transform = `translate3d(0px, 0px, 0px)`;
                }
                else if (currPos >= rightx) {
                    //move playhead
                    const rightpos = (currPos - rightx) + leftx;
                    const rightfullx = totalWidth - this.containerRef.current.offsetWidth;
                    this.playHeadRef.current.style.transform = `translate3d(${rightpos}px, 0px, 0px)`;
                    this.imgRef.current.style.transform = `translate3d(${-(rightfullx)}px, 0px, 0px)`;
                }
                else {
                    //console.log("mid");
                    const midpos = -(currPos - leftx);
                    this.playHeadRef.current.style.transform = `translate3d(${leftx}px, 0px, 0px)`
                    this.imgRef.current.style.transform = `translate3d(${midpos}px, 0px, 0px)`;
                }
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
            img.onload = async () => {
                this.cqtDims.w = img.width;
                this.cqtDims.h = img.height;
                img.style.display = "";
                img.style.width = this.containerRef.current.offsetWidth + 'px';
                img.style.height = this.cqtDims.defaultHeight + 'px';

                this.currDims.w = parseFloat(this.imgRef.current.style.width);
                this.currDims.h = parseFloat(this.imgRef.current.style.height);

                this.zoomfn("inc", this.zoom.default);
                this.playHeadRender();

                this.chordsRef.current.style.width = this.cqtDims.w + 'px';
                this.chordsRender();
                DispatcherService.dispatch(DispatchEvents.FinishedDrawing, "cqt");
            }
        }
    }

    reset = () => {
        this.setState({ showMIR: false });
        DispatcherService.off(DispatchEvents.PitchChange, this.chordsRender);
    }

    ready = () => {
        this.setState({ showMIR: true });
    }

    zoomfn = async (type, next = 1) => {
        if (type === "stretch") {
            let zoom = this.state.currentVZoom;
            if (zoom === 1) zoom = 2;
            else zoom = 1;
            this.setState({ currentVZoom: zoom })
            this.imgRef.current.style.height = (this.cqtDims.defaultHeight * zoom) + 'px';
        }
        else if (type === "inc") {
            const curr = this.state.currentZoom;
            if (curr < this.zoom.max) {
                await setStateAsync(this, { currentZoom: curr + next });
            }
            const diff = (this.state.currentZoom - curr);
            const p = parseFloat(this.imgRef.current.style.width);
            this.imgRef.current.style.width = (p + (diff * this.zoom.increment)) + 'px';
            this.chordsRef.current.style.width = (p + (diff * this.zoom.increment)) + 'px';
        }
        else if (type === "dec") {
            const curr = this.state.currentZoom;
            if (curr > this.zoom.min) {
                await setStateAsync(this, { currentZoom: curr - 1 });
            }
            const diff = (this.state.currentZoom - curr);
            const p = parseFloat(this.imgRef.current.style.width);
            this.imgRef.current.style.width = (p + (diff * this.zoom.increment)) + 'px';
            this.chordsRef.current.style.width = (p + (diff * this.zoom.increment)) + 'px';
        }
        else if (type === "reset") {
            this.imgRef.current.style.height = this.cqtDims.defaultHeight + 'px';
            this.imgRef.current.style.width = this.containerRef.current.offsetWidth + 'px';
            this.chordsRef.current.style.width = this.containerRef.current.offsetWidth + 'px';
            await setStateAsync(this, { currentZoom: 1 });
            this.zoomfn("inc", this.zoom.default);
        }
        this.currDims.w = parseFloat(this.imgRef.current.style.width);
        this.currDims.h = parseFloat(this.imgRef.current.style.height);
    }

    toggle = () => {
        this.setState(prevState => ({
            expanded: !prevState.expanded,
        }), async () => {
            await ForageService.serializeState(SettingsForageKeys.ANALYSIS_SETTINGS, this.state, this.se_includes);
        });
    }

    refresh = async () => {
        this._onFinish();
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
                        />
                        <div ref={this.specRef} id="spectrogram" style={{ display: this.state.showMIR ? "block" : "none" }}>
                            <div
                                ref={this.chordsRef}
                                className="chords-timeline"
                            />
                            <img
                                ref={this.imgRef}
                                alt="spectrogram"
                                style={{
                                    display: 'none',
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
