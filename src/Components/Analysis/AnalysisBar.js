import React, { Component } from 'react'
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { ChordBox } from 'vexchords';

import "../../css/AnalysisBar.css"

import { DispatcherService, DispatchEvents, KeyboardEvents } from '../../services/dispatcher'
import { MediaPlayer } from '../../lib/libWaveSurfer'
import ForageService, { SettingsForageKeys } from '../../services/forage.js';
import ProjectService from '../../services/project';
import { SettingsService } from '../../services/settings';
import { setStateAsync, toTitleCase } from '../../lib/utils';
import { getTransposedKey, getChordInfo } from '../../lib/music-utils';

class AnalysisBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: true,
            showMIR: false,
            analysing: false,
            currentVZoom: 1,
            currentZoom: 1,
            showChordTip: false,
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
        this.chordTipRef = React.createRef();
        this.beatsRef = React.createRef();

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
        this.chordNameTip = document.querySelector(".chord-name");
        this.chordBoxTip = new ChordBox('#selector', {
            // Customizations (all optional, defaults shown)
            width: 190, // canvas width
            height: 200, // canvas height

            numStrings: 6, // number of strings (e.g., 4 for bass)
            numFrets: 5, // number of frets (e.g., 7 for stretch chords)
            showTuning: true, // show tuning keys

            defaultColor: '#666', // default color
            bgColor: '#FFF', // background color
            strokeColor: '#666', // stroke color (overrides defaultColor)
            textColor: '#666', // text color (overrides defaultColor)
            stringColor: '#666', // string color (overrides defaultColor)
            fretColor: '#666', // fret color (overrides defaultColor)
            labelColor: '#666', // label color (overrides defaultColor)

            fretWidth: 1, // fret width
            stringWidth: 1, // string width

            fontFamily: 'Roboto Condensed',
            fontSize: 15,
            fontWeight: 100,
        });
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

        DispatcherService.on(DispatchEvents.PitchChange, this.chordsRender);
        await this.cqtImageRender();
    }

    _onFinish = () => {
        this.playHeadRef.current.style.transform = `translate3d(0px, 0px, 0px)`
        this.imgRef.current.style.transform = `translate3d(0px, 0px, 0px)`;
        this.chordsRef.current.style.transform = `translate3d(0px, 0px, 0px)`;
        this.beatsRef.current.style.transform = `translate3d(0px, 0px, 0px)`;
        this.specRef.current.style.overflow = "";
        this.setState({ showChordTip: false });
    }

    _onSeek = (progress) => {
        if (progress <= 0 && !this.mediaPlayer.isPlaying()) {
            //stop called
            this._onFinish();
        }
    }

    _onPlay = () => {
        this.specRef.current.style.overflow = "hidden";
        this.setState({ showChordTip: false });
    }

    _onPause = () => {
        // this.imgRef.current.style.transform = `translate3d(0px, 0px, 0px)`;
        // this.specRef.current.style.overflow = "auto";
        // this.specRef.current.style.position = "";
        this.setState({ showChordTip: false });
    }

    _onChordGridClick = async (e) => {
        const v = this.state.showChordTip;
        const t = e.target;
        //eslint-disable-next-line
        if (v && e.target === this._lastTarget) await setStateAsync(this, { showChordTip: false });
        else await setStateAsync(this, { showChordTip: true });

        if (this.state.showChordTip) {
            if (this.specRef.current.style.overflow === "hidden") {
                const left = e.clientX - 150;
                this.chordTipRef.current.style.left = left + 'px';
            } else {
                let left = t.offsetLeft + (t.clientWidth / 2) - 100;
                left = left < 0 ? 0 : left;
                const f = parseFloat(this.imgRef.current.style.width);
                left = left + 200 > f ? f - 200 : left;
                this.chordTipRef.current.style.left = left + 'px';
            }
            this._lastTarget = t;

            const chord = t.getAttribute("data-chord");
            this.chordBoxTip.canvas.clear();
            this.chordNameTip.textContent = ``;

            let nochordinfo = false;
            if (chord) {
                const dctype = t.getAttribute("data-chord-type");
                let index = t.getAttribute("data-chord-index");

                index = index ? parseInt(index, 10) : 0;
                let type = dctype === '' ? 'maj' : dctype;
                type = type === 'min' ? 'm' : type;
                const cinfo = await getChordInfo(chord, type, dctype);
                if (cinfo) {
                    const chordfret = [];
                    const chart = cinfo.chord_charts[index];
                    const positions = chart.positions;
                    for (let i = 0; i < positions.length; i += 1) {
                        let p = positions[i];
                        p = p !== 'x' ? parseInt(p, 10) : 'x';
                        chordfret.push([positions.length - i, p])
                    }
                    this.chordBoxTip.draw({
                        chord: chordfret,
                        position: chart.fret, // start render at fret 5
                    });
                    const notes = cinfo.notes.map(x => toTitleCase(x)).join(' ');
                    this.chordNameTip.textContent = `${chord}${type} - (${notes})`
                }
                else {
                    nochordinfo = true;
                }
            }
            else {
                nochordinfo = true;
            }
            if (nochordinfo) {
                console.log("no-chord-info");
            }
        }
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
                const diff = end - start; // Math.round((end - start) * 100) / 100;

                let c = null;
                if (i in this.chordsGridElements) c = this.chordsGridElements[i];
                else c = document.createElement('div');

                let j = i + 1;
                c.style.gridArea = `1 / ${j} / 2 / ${j += 1}`;
                c.style.backgroundColor = (i % 2 ? '#3b7eac' : '#436a88');
                c.className = "chords-grid-div";
                c.textContent = text;
                c.title = `${text}`;
                c.onclick = this._onChordGridClick;
                c.setAttribute('data-chord', chord);
                c.setAttribute('data-chord-type', type);

                if (!(i in this.chordsGridElements)) {
                    this.chordsRef.current.appendChild(c);
                    this.chordsGridElements[i] = c;
                    const per = (diff / duration) * 100;
                    gridColums += `${per}% `;
                }
            });
            this.chordsRef.current.style['grid-template-columns'] = gridColums;
        }
    }

    beatsRender = async () => {
        let beats = [];
        try {
            beats = await ProjectService.readBeats();
        }
        catch (ex) {
            if (!Array.isArray(beats)) beats = []
        }
        if (beats.length > 0) {
            const duration = Math.round(this.mediaPlayer.getDuration() * 100) / 100;

            let gridColums = "";
            let prev = 0;
            let onecounter = 0;
            beats.forEach((beatData, i) => {
                let [start, bn] = beatData;
                start = parseFloat(start);
                bn = parseInt(bn, 10);

                let diff = 0;
                if (i === 0) { diff = start; }
                else {
                    diff = start - prev;
                }
                //diff = Math.round(diff * 100) / 100;

                const c = document.createElement('div');
                let j = i + 1;
                c.style.gridArea = `1 / ${j} / 2 / ${j += 1}`;

                if (bn === 1) {
                    c.className = "beats-start";
                    onecounter += 1;
                    const sp = document.createElement('span');
                    c.appendChild(sp);
                    sp.className = "beats-num-span";
                    sp.textContent = onecounter;
                }
                else {
                    c.className = "beats-other";
                }
                c.setAttribute('data-bn', bn);
                const per = (diff / duration) * 100;
                this.beatsRef.current.appendChild(c);
                gridColums += `${per}% `;

                prev = start;
            });
            this.beatsRef.current.style['grid-template-columns'] = gridColums;
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
                    this.chordsRef.current.style.transform = `translate3d(0px, 0px, 0px)`;
                    this.beatsRef.current.style.transform = `translate3d(0px, 0px, 0px)`;
                }
                else if (currPos >= rightx) {
                    //move playhead
                    const rightpos = (currPos - rightx) + leftx;
                    const rightfullx = totalWidth - this.containerRef.current.offsetWidth;
                    this.playHeadRef.current.style.transform = `translate3d(${rightpos}px, 0px, 0px)`;
                    this.imgRef.current.style.transform = `translate3d(${-(rightfullx)}px, 0px, 0px)`;
                    this.chordsRef.current.style.transform = `translate3d(${-(rightfullx)}px, 0px, 0px)`;
                    this.beatsRef.current.style.transform = `translate3d(${-(rightfullx)}px, 0px, 0px)`;
                }
                else {
                    //console.log("mid");
                    const midpos = -(currPos - leftx);
                    this.playHeadRef.current.style.transform = `translate3d(${leftx}px, 0px, 0px)`
                    this.imgRef.current.style.transform = `translate3d(${midpos}px, 0px, 0px)`;
                    this.chordsRef.current.style.transform = `translate3d(${midpos}px, 0px, 0px)`;
                    this.beatsRef.current.style.transform = `translate3d(${midpos}px, 0px, 0px)`;
                }
            }
            this.raf = requestAnimationFrame(this.playHeadRender);
        }
    }

    cqtImageRender = async () => {
        if (await SettingsService.isLayoutAvailable("chromagram")) {
            DispatcherService.dispatch(DispatchEvents.AboutToDraw, "cqt");
            console.time("analysis-render");
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

                await this.playHeadRender();

                this.chordsRef.current.style.width = this.currDims.w + 'px';
                this.beatsRef.current.style.width = this.currDims.w + 'px';
                await this.chordsRender();
                await this.beatsRender();
                await this.zoomfn("inc", this.zoom.default);

                console.timeEnd("analysis-render");
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
            this.beatsRef.current.style.width = (p + (diff * this.zoom.increment)) + 'px';
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
            this.beatsRef.current.style.width = (p + (diff * this.zoom.increment)) + 'px';
        }
        else if (type === "reset") {
            this.imgRef.current.style.height = this.cqtDims.defaultHeight + 'px';
            this.imgRef.current.style.width = this.containerRef.current.offsetWidth + 'px';
            this.chordsRef.current.style.width = this.containerRef.current.offsetWidth + 'px';
            this.beatsRef.current.style.width = this.containerRef.current.offsetWidth + 'px';
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
                                style={{ display: this.state.showChordTip ? 'block' : 'none' }}
                                ref={this.chordTipRef}
                                id="selector"
                                className="popover bs-popover-bottom chord-tooltip">
                                <div className="arrow" />
                                <div className="chord-name popover-header h3"> Fmin </div>
                            </div>
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
                            <div
                                ref={this.beatsRef}
                                className="beats-timeline"
                            />
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
