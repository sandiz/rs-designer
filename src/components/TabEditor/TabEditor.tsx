import React, { RefObject } from 'react';
import classNames from 'classnames';
import {
    Card, Slider, TagInput, MenuItem, Button, Classes, Menu, Popover,
    NumericInput, TagInputAddMethod, Position, Intent, NavbarDivider, Elevation, Callout, Tooltip,
} from '@blueprintjs/core';
import { Select } from "@blueprintjs/select";
import { clamp } from '@blueprintjs/core/lib/esm/common/utils';
import { IconNames, IconName } from '@blueprintjs/icons';
import { CardExtended, ButtonExtended } from '../Extended/FadeoutSlider';
import './TabEditor.scss'
import MediaPlayerService from '../../services/mediaplayer';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import ProjectService from '../../services/project';
import NoteEditor, { keyShortcuts, snapToGrid } from './NoteEditor';
import {
    InstrumentListItem, filterIFile, renderFile, isInstrumentFileDisabled,
    areFilesEqual, getAllFiles, getIndexFromDivider,
} from './InstrumentFile';
import {
    Instrument, InstrumentOptions,
} from '../../types/project';
import {
    BeatTime, allTunings, baseTuning,
} from '../../types/musictheory'
import {
    getTransposedKey, Metronome,
} from '../../lib/music-utils';
import { deletePopover } from '../../dialogs';
import { metronomeSVG, clapSVG } from '../../svgIcons';

const { nativeTheme } = window.require("electron").remote;
const InstrumentalFileSelect = Select.ofType<InstrumentListItem>();

enum TagItem { DD = "dd", TUNING = "tuning", CENT = "centoffset", CAPO = "capo" }
interface TabEditorState {
    duration: number;
    zoom: number;
    files: InstrumentListItem[];
    currentFile: InstrumentListItem | null;
    currentFileIdx: number;
    beats: BeatTime[];
    insertHeadBeatIdx: number;
    metronome: boolean;
    clap: boolean;
    notePlay: boolean;
}
const PX_PER_SEC = 40;
export const ZOOM_MIN = PX_PER_SEC;
export const ZOOM_MAX = PX_PER_SEC * 10
export const ZOOM_DEFAULT = PX_PER_SEC;
class TabEditor extends React.Component<{}, TabEditorState> {
    private beatsRef: RefObject<HTMLDivElement>;
    private timelineRef: RefObject<HTMLDivElement>;
    private imageRef: RefObject<HTMLImageElement>;
    private neckContainerRef: RefObject<HTMLDivElement>;
    private progressRef: RefObject<HTMLDivElement>;
    private tabImgRef: RefObject<HTMLDivElement>;
    private tabNoteRef: RefObject<HTMLDivElement>;
    private overflowRef: RefObject<HTMLDivElement>;
    private noteEditorRef: RefObject<NoteEditor>;
    private insertHeadRef: RefObject<HTMLDivElement>;
    private noteCountRef: RefObject<HTMLSpanElement>;
    private progressRAF = 0;
    private prevX = 0;
    private insertHeadDragging = false;

    constructor(props: {}) {
        super(props);
        this.state = {
            duration: 0,
            zoom: ZOOM_DEFAULT,
            files: [],
            currentFile: null,
            currentFileIdx: 0,
            beats: [],
            insertHeadBeatIdx: 0,
            metronome: false,
            clap: false,
            notePlay: false,
        };
        this.beatsRef = React.createRef();
        this.timelineRef = React.createRef();
        this.imageRef = React.createRef();
        this.neckContainerRef = React.createRef();
        this.progressRef = React.createRef();
        this.tabImgRef = React.createRef();
        this.tabNoteRef = React.createRef();
        this.overflowRef = React.createRef();
        this.noteEditorRef = React.createRef();
        this.insertHeadRef = React.createRef();
        this.noteCountRef = React.createRef();
    }

    componentDidMount = async () => {
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.on(DispatchEvents.ProjectUpdated, this.projectUpdated);
        nativeTheme.on('updated', this.updateImage);
        if (MediaPlayerService.isActive()) {
            this.mediaReady();
        }
        this.updateFiles()
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.off(DispatchEvents.ProjectUpdated, this.projectUpdated);
        nativeTheme.on('updated', this.updateImage);
        cancelAnimationFrame(this.progressRAF);
    }

    mediaReset = async () => {
        if (MediaPlayerService.wavesurfer) {
            MediaPlayerService.wavesurfer.off('seek', this.onSeek);
            MediaPlayerService.wavesurfer.off('play', this.onPlay);
            MediaPlayerService.wavesurfer.off('pause', this.onStop);
            MediaPlayerService.wavesurfer.off('stop', this.onStop);
        }
        this.setState({
            currentFile: null, currentFileIdx: 0, files: [],
        });
    }

    mediaReady = async () => {
        await this.updateBeatMap();
        this.moveInsertHeadToBeat(2);
        this.updateTimeline();
        this.updateImage();
        this.updateProgress();
        this.updateFiles();
        const info = ProjectService.getProjectInfo();
        if (info) {
            const zoom = info.settings.tabEditor.getZL();
            if (zoom) this.setState({ zoom });
        }
        if (MediaPlayerService.wavesurfer) {
            MediaPlayerService.wavesurfer.on('seek', this.onSeek);
            MediaPlayerService.wavesurfer.on('play', this.onPlay);
            MediaPlayerService.wavesurfer.on('pause', this.onStop);
            MediaPlayerService.wavesurfer.on('stop', this.onStop);
        }
    }

    projectUpdated = () => {
        this.updateBeatMap();
    }

    onSeek = () => {
        const time = MediaPlayerService.getCurrentTime();
        const per = (time / MediaPlayerService.getDuration()) * 100;

        if (this.overflowRef.current && this.neckContainerRef.current) {
            const width = this.neckContainerRef.current.clientWidth;
            const pos = (per / 100) * width;
            const times = Math.floor(pos / this.overflowRef.current.clientWidth);
            this.overflowRef.current.scrollLeft = times * this.overflowRef.current.clientWidth;
        }
    }

    onPlay = () => {
        if (this.state.metronome) {
            Metronome.start(this.state.beats);
        }
        if (this.state.clap && this.noteEditorRef.current) {
            Metronome.startClapping(
                this.noteEditorRef.current.state.instrumentNotes,
                this.noteEditorRef.current.highlightNotes,
            );
        }
        else if (this.state.notePlay && this.noteEditorRef.current && this.state.currentFile) {
            Metronome.startClapping(
                this.noteEditorRef.current.state.instrumentNotes,
                this.noteEditorRef.current.highlightNotes,
                true,
                InstrumentOptions[this.state.currentFile.key as Instrument].tuning,
            );
        }
    }

    onStop = () => {
        if (this.state.metronome) {
            Metronome.stop();
        }
        if (this.state.clap || this.state.notePlay) {
            Metronome.stopClapping();
        }
        this.setState({ metronome: false, clap: false });
    }

    updateProgress = () => {
        this.progressRAF = requestAnimationFrame(this.updateProgress);
        const time = MediaPlayerService.getCurrentTime();
        const per = (time / MediaPlayerService.getDuration()) * 100;
        if (this.neckContainerRef.current && this.progressRef.current && this.insertHeadRef.current) {
            const width = this.neckContainerRef.current.clientWidth;
            this.progressRef.current.style.transform = `translateX(${(per / 100) * width}px)`;

            if (this.state.insertHeadBeatIdx < this.state.beats.length) {
                const beatStart = parseFloat(this.state.beats[this.state.insertHeadBeatIdx].start);
                const beatPer = (beatStart / MediaPlayerService.getDuration()) * 100;
                this.insertHeadRef.current.style.transform = `translateX(${(beatPer / 100) * width}px)`;
            }

            if (this.overflowRef.current && MediaPlayerService.isPlaying()) {
                const sl = this.overflowRef.current.scrollLeft + this.overflowRef.current.clientWidth;
                const pos = (per / 100) * width;
                if (pos > sl) {
                    this.overflowRef.current.scrollLeft += this.overflowRef.current.clientWidth;
                }
            }
        }

        if (this.noteEditorRef.current && this.noteCountRef.current) {
            const total = this.noteEditorRef.current.state.instrumentNotes.length;
            const selected = this.noteEditorRef.current.state.selectedNotes.length;
            this.noteCountRef.current.textContent = `s: ${selected} n: ${total}`;
        }
    }

    updateImage = async () => {
        if (!MediaPlayerService.wavesurfer) return;
        try {
            const image = await MediaPlayerService.exportImage(this.state.zoom * this.state.duration);
            if (this.imageRef.current) {
                this.imageRef.current.src = image;
                this.imageRef.current.style.visibility = ""
            }
        }
        catch (e) {
            console.log("update-image exception", e);
        }
    }

    updateFiles = () => {
        const file = getAllFiles().filter(item => !item.isDivider)[this.state.currentFileIdx];
        this.setState({ files: getAllFiles(), currentFile: file });
    }

    updateBeatMap = async () => {
        const duration = MediaPlayerService.getDuration();
        this.setState({ duration })
        const metadata = await ProjectService.getProjectMetadata();
        let gridColumns = "";
        let prev = 0;
        let onecounter = 0;
        if (metadata) {
            const beats = metadata.beats;
            this.setState({ beats });
            if (this.beatsRef.current) {
                while (this.beatsRef.current.firstChild) {
                    this.beatsRef.current.removeChild(this.beatsRef.current.firstChild);
                }
            }
            if (beats.length > 0) {
                await beats.forEach((beatData, i) => {
                    const start = parseFloat(beatData.start);
                    const bn = parseInt(beatData.beatNum, 10);

                    let diff = 0;
                    if (i === 0) diff = start;
                    else diff = start - prev;

                    const c = document.createElement('div');
                    let j = i + 1;
                    c.style.gridArea = `1 / ${j} / 2 / ${j += 1}`;

                    if (bn === 1) {
                        c.className = "beats-start";
                        onecounter += 1;
                        const sp = document.createElement('div');
                        c.appendChild(sp);
                        sp.className = classNames("beats-num-span", { "beats-num-span-0": onecounter === 1 && i === 0 });
                        sp.textContent = onecounter.toString();
                    }
                    else {
                        c.className = "beats-other";
                    }
                    c.setAttribute('data-bn', bn.toString());
                    const per = (diff / duration) * 100;
                    if (this.beatsRef.current) {
                        this.beatsRef.current.appendChild(c);
                    }
                    gridColumns += `${per}% `;

                    prev = start;
                });
                if (this.beatsRef.current) {
                    this.beatsRef.current.style.gridTemplateColumns = gridColumns;
                    this.beatsRef.current.style.display = "grid";
                    this.moveInsertHeadToBeat(2);
                }
            }
            else {
                const c = document.createElement('div');
                c.className = "number";
                c.innerHTML = "Beats unavailable";
                if (this.beatsRef.current) {
                    this.beatsRef.current.appendChild(c);
                    this.beatsRef.current.style.display = "inline-block";
                }
            }
        }
    }

    updateTimeline = async () => {
        const duration = MediaPlayerService.getDuration();
        let timelinegridColumns = "";
        await [...new Array(Math.round(duration)).keys()].forEach((item, i) => {
            const diff = 1

            const c = document.createElement('div');
            let j = i + 1;
            c.style.gridArea = `1 / ${j} / 2 / ${j += 1}`;

            c.className = classNames(
                //{ "time-notch-left": i === 0 },
                { "time-notch": true },
                { "time-notch-half": i % 5 !== 0 },
            )

            const sp = document.createElement('span');
            c.appendChild(sp);
            sp.className = "time-num-span";
            let seconds = i;
            let output = ""
            if (seconds / 60 > 1) {
                const minutes = parseInt((seconds / 60).toString(), 10);
                seconds = parseInt((seconds % 60).toString(), 10);
                const tseconds = seconds < 10 ? '0' + seconds : seconds;
                output = `${minutes}:${tseconds}`;
            }
            else {
                output = "" + Math.round(seconds * 1000) / 1000;
            }

            if (i % 5 === 0) sp.textContent = output;

            const per = (diff / duration) * 100;
            if (this.timelineRef.current) {
                this.timelineRef.current.appendChild(c);
            }
            timelinegridColumns += `${per}% `;
        });
        if (this.timelineRef.current) this.timelineRef.current.style.gridTemplateColumns = timelinegridColumns;
    }

    zoomIn = () => {
        const cur = this.state.zoom;
        if (cur < ZOOM_MAX) {
            this.setState({ zoom: cur + 1 }, () => {
                const info = ProjectService.getProjectInfo();
                console.log(info);
                if (info) info.settings.tabEditor.ZL(this.state.zoom)
            });
        }
    }

    zoomOut = () => {
        const cur = this.state.zoom;
        if (cur > ZOOM_MIN) {
            this.setState({ zoom: cur - 1 }, () => {
                const info = ProjectService.getProjectInfo();
                if (info) info.settings.tabEditor.ZL(this.state.zoom)
            });
        }
    }

    zoom = (v: number) => {
        this.setState({ zoom: clamp(v, ZOOM_MIN, ZOOM_MAX) }, () => {
            const info = ProjectService.getProjectInfo();
            if (info) info.settings.tabEditor.ZL(this.state.zoom)
        });
    }

    handleFileChange = (item: InstrumentListItem) => {
        if (item.isDivider) {
            ProjectService.createInstrument(item.key as Instrument);
            this.updateFiles();
        }
        else {
            const idx = getAllFiles().filter(p => !p.isDivider).findIndex(p => p.hash === item.hash)
            this.setState({ currentFile: item, currentFileIdx: idx });
        }
    }

    handleTagChange = (values: React.ReactNode[]) => {
        const v = values as string[];
        const { currentFile } = this.state;
        if (currentFile) {
            const obj = { ...currentFile }
            obj.instrumentNotes.tags = v;
            this.setState({ currentFile: obj }, () => {
                ProjectService.saveTags(currentFile.key as Instrument, currentFile.instrumentNotes, this.state.currentFileIdx);
                this.updateFiles();
            });
        }
    }

    changeTag = (tagType: string, value: string) => {
        if (this.state.currentFile) {
            const tags = this.state.currentFile.instrumentNotes.tags;
            const currentPairIdx = tags.findIndex(i => i.includes(`${tagType}=`));
            if (currentPairIdx === -1) {
                tags.push(`${tagType}=${value}`);
            }
            else {
                tags[currentPairIdx] = `${tagType}=${value}`;
            }
            this.handleTagChange(tags);
        }
    }

    addTag = (values: string[]) => {
        const { currentFile } = this.state;
        if (currentFile) {
            const { tags } = currentFile.instrumentNotes;
            for (let i = 0; i < values.length; i += 1) {
                const value = values[i];
                if (value.startsWith(TagItem.CAPO)
                    || value.startsWith(TagItem.TUNING)
                    || value.startsWith(TagItem.CENT)
                    || value.startsWith(TagItem.DD)
                ) {
                    console.log("protected word");
                }
                else {
                    tags.push(value);
                }
            }
            this.handleTagChange(tags);
        }
    }

    removeTag = (v: string, index: number) => {
        const { currentFile } = this.state;
        if (currentFile) {
            const { tags } = currentFile.instrumentNotes;
            tags.splice(index, 1);
            this.handleTagChange(tags);
        }
    }

    deleteFile = () => {
        const files = this.state.files.filter(p => !p.isDivider);
        if (files.length === 1) {
            this.deleteNotes();
            this.handleTagChange([]);
        }
        else {
            if (this.state.currentFile) {
                const idx = getIndexFromDivider(this.state.currentFile, this.state.files)
                ProjectService.removeInstrumentNotes(this.state.currentFile.key as Instrument, (idx[0] - idx[1]) - 1);
                this.setState({ currentFileIdx: 0 }, () => this.updateFiles());
            }
        }
    }

    deleteNotes = () => {
        if (this.noteEditorRef.current) {
            this.noteEditorRef.current.deleteNotes();
        }
    }

    moveInsertHead = (e: MouseEvent) => {
        if (!this.insertHeadDragging) return;
        if (this.prevX === -1) {
            this.prevX = e.pageX;
            return;
        }
        const { insertHeadBeatIdx } = this.state;
        // dragged left
        if (this.prevX - 20 > (e.pageX)) {
            if (insertHeadBeatIdx > 0) {
                this.setState({ insertHeadBeatIdx: insertHeadBeatIdx - 1 });
            }
            this.prevX = e.pageX;
        }
        else if (this.prevX + 20 < (e.pageX)) { // dragged right
            if (insertHeadBeatIdx < this.state.beats.length - 1) {
                this.setState({ insertHeadBeatIdx: insertHeadBeatIdx + 1 });
            }
            this.prevX = e.pageX;
        }
    }

    startInsertHead = () => {
        if (this.state.beats.length <= 0) return;
        this.insertHeadDragging = true;
        document.addEventListener('mousemove', this.moveInsertHead);
        document.addEventListener('mouseup', this.stopInsertHead);
    }

    stopInsertHead = () => {
        this.insertHeadDragging = false;
        document.removeEventListener('mousemove', this.moveInsertHead);
        document.removeEventListener('mouseup', this.stopInsertHead);
    }

    moveInsertHeadToBeat = (downBeat: number) => {
        downBeat -= 1;
        const dnb = this.state.beats.filter(i => i.beatNum === "1");
        if (downBeat < dnb.length) {
            const d = dnb[downBeat];
            this.setState({ insertHeadBeatIdx: this.state.beats.findIndex(i => JSON.stringify(i) === JSON.stringify(d)) });
        }
    }

    clickTimeline = (event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const x = event.clientX - (rect.left);
        const closest = snapToGrid(x, rect, 0, this.state.beats);
        const beat: BeatTime = closest[1];
        this.setState({ insertHeadBeatIdx: this.state.beats.findIndex(i => JSON.stringify(i) === JSON.stringify(beat)) });
    }

    toggleMetronome = () => {
        //if (!MediaPlayerService.isPlaying()) return;
        this.setState((ps) => {
            return {
                metronome: !ps.metronome,
                clap: false,
                notePlay: false,
            }
        }, () => {
            if (this.state.metronome) {
                Metronome.start(this.state.beats);
            } else {
                Metronome.stop();
            }
        })
    }

    toggleClap = () => {
        //if (!MediaPlayerService.isPlaying()) return;
        this.setState((ps) => {
            return {
                clap: !ps.clap,
                metronome: false,
                notePlay: false,
            }
        }, () => {
            if (this.noteEditorRef.current) {
                if (this.state.clap) {
                    Metronome.startClapping(
                        this.noteEditorRef.current.state.instrumentNotes,
                        this.noteEditorRef.current.highlightNotes,
                    );
                } else {
                    Metronome.stopClapping();
                }
            }
        })
    }

    toggleNotePlay = () => {
        //if (!MediaPlayerService.isPlaying()) return;
        this.setState((ps) => {
            return {
                notePlay: !ps.notePlay,
                metronome: false,
                clap: false,
            }
        }, () => {
            if (this.noteEditorRef.current && this.state.currentFile) {
                if (this.state.notePlay) {
                    Metronome.startClapping(
                        this.noteEditorRef.current.state.instrumentNotes,
                        this.noteEditorRef.current.highlightNotes,
                        true,
                        InstrumentOptions[this.state.currentFile.key as Instrument].tuning,
                    );
                } else {
                    Metronome.stopClapping();
                }
            }
        })
    }

    render = () => {
        return (
            <div className="tabeditor-root">
                <InfoPanel
                    zoomIn={this.zoomIn}
                    zoomOut={this.zoomOut}
                    zoomValue={this.state.zoom}
                    zoom={this.zoom}
                    files={this.state.files}
                    file={this.state.currentFile}
                    handleFileChange={this.handleFileChange}
                    changeTag={this.changeTag}
                    addTag={this.addTag}
                    removeTag={this.removeTag}
                    deleteFile={this.deleteFile}
                    deleteNotes={this.deleteNotes}
                    noteEditorRef={this.noteEditorRef}
                    notesCountRef={this.noteCountRef}
                    metronome={this.state.metronome}
                    toggleMetronome={this.toggleMetronome}
                    clap={this.state.clap}
                    toggleClap={this.toggleClap}
                    notePlay={this.state.notePlay}
                    toggleNotePlay={this.toggleNotePlay}
                />
                <CardExtended className={classNames("tabeditor-body")} elevation={3}>
                    <div
                        ref={this.overflowRef}
                        className="tab-overflow-root"
                    >
                        <div
                            ref={this.tabImgRef}
                            className="tab-wv-img"
                            style={{
                                width: this.state.zoom * this.state.duration + 'px',
                                willChange: 'transform',
                            }}>
                            <img
                                ref={this.imageRef}
                                className={classNames("tab-img")}
                                alt="waveform"
                                style={{ visibility: "hidden" }}
                            />
                        </div>
                        <div
                            ref={this.tabNoteRef}
                            style={{
                                width: this.state.zoom * this.state.duration + 'px',
                                willChange: 'transform',
                            }}
                            className="tab-note-edit"
                        >
                            <div className={classNames("neck-container")} ref={this.neckContainerRef}>
                                <div className="tab-progress" ref={this.progressRef} />
                                <div className="tab-insertHead" ref={this.insertHeadRef}>
                                    <Card
                                        interactive
                                        className="tab-insertHeadSlider"
                                        elevation={Elevation.TWO}
                                        onMouseDown={this.startInsertHead}
                                    />
                                </div>
                                <NoteEditor
                                    ref={this.noteEditorRef}
                                    width={this.state.zoom * this.state.duration}
                                    instrument={this.state.currentFile?.key as Instrument}
                                    instrumentNotes={this.state.currentFile?.instrumentNotes}
                                    instrumentNoteIdx={this.state.currentFileIdx}
                                    insertHeadBeatIdx={this.state.insertHeadBeatIdx}
                                    toggleMetronome={this.toggleMetronome}
                                    toggleClap={this.toggleClap}
                                    toggleNotePlay={this.toggleNotePlay}
                                />
                            </div>
                        </div>
                        <div
                            className="tabs-beats-timeline"
                            ref={this.beatsRef}
                            style={{
                                willChange: 'transform',
                                width: this.state.zoom * this.state.duration + 'px',
                            }}
                        />
                        <div
                            className="tabs-timeline"
                            ref={this.timelineRef}
                            onClick={this.clickTimeline}
                            style={{
                                cursor: 'pointer',
                                willChange: 'transform',
                                width: this.state.zoom * this.state.duration + 'px',
                            }}
                        />
                    </div>
                </CardExtended>
            </div>
        )
    }
}

interface InfoPanelProps {
    zoomIn: () => void;
    zoomOut: () => void;
    zoom: (v: number) => void;
    zoomValue: number;

    files: InstrumentListItem[];
    file: InstrumentListItem | null;
    handleFileChange: (item: InstrumentListItem, event?: React.SyntheticEvent<HTMLElement>) => void;

    changeTag: (tagType: string, v: string) => void;
    addTag: (v: string[], m: TagInputAddMethod) => void;
    removeTag: (v: string, i: number) => void;

    deleteFile: () => void;
    deleteNotes: () => void;

    noteEditorRef: RefObject<NoteEditor>;
    notesCountRef: RefObject<HTMLSpanElement>;

    metronome: boolean;
    toggleMetronome: () => void;
    clap: boolean;
    toggleClap: () => void;
    notePlay: boolean;
    toggleNotePlay: () => void;
}

const renderTagMenu = (props: InfoPanelProps): JSX.Element => {
    type TagMenuOptions = { [key: string]: { icon: IconName; text: string; items?: string[]; min?: number; max?: number; placeHolder?: string } };
    const items: TagMenuOptions = {
        [TagItem.TUNING as string]: { icon: IconNames.WRENCH, text: "Tuning", items: Object.keys(allTunings) },
        [TagItem.CAPO as string]: {
            icon: IconNames.FLOW_END, text: "Capo", min: 0, max: 11, placeHolder: "Fret Number",
        },
        [TagItem.CENT as string]: {
            icon: IconNames.FLOW_REVIEW, text: "Cent Offset", min: -10, max: 100, placeHolder: "Offset in Hz",
        },
        [TagItem.DD as string]: {
            icon: IconNames.TIMELINE_BAR_CHART, text: "Difficulty", min: 1, max: 5, placeHolder: "1-Min 5-Max",
        },
    }
    const currentTags = props.file ? props.file.instrumentNotes.tags : [];
    const menu = (
        <Menu>
            {
                Object.keys(items).map(key => {
                    const k = key;
                    const v = items[k]
                    const isItem = Array.isArray(v.items);
                    const currentPair = currentTags.find(i => i.includes(`${key}=`));
                    let currentValue: string | number = key === TagItem.TUNING ? "" : 0;
                    const split = currentPair?.split("=")[1].trim();
                    if (split) currentValue = key === TagItem.TUNING ? split : parseInt(split, 10);
                    return (
                        <MenuItem
                            popoverProps={{ openOnTargetFocus: false }}
                            icon={v.icon as IconName}
                            key={k}
                            text={v.text}
                        >
                            {
                                isItem && v.items
                                    ? v.items.map((vi: string) => {
                                        switch (k) {
                                            case TagItem.TUNING: {
                                                const tuning = vi.replace(/_/g, " ");
                                                const indices = allTunings[vi as keyof typeof allTunings];
                                                const notes = indices.map((i, idx) => getTransposedKey(baseTuning[idx], i, true)).join(" ");
                                                return (
                                                    <MenuItem
                                                        key={vi}
                                                        text={
                                                            (
                                                                <div style={{ display: 'flex', justifyContent: "space-between" }}>
                                                                    <span className="info-item-control">{tuning}</span>
                                                                    <span className={Classes.TEXT_MUTED}>
                                                                        [ {notes} ]
                                                                    </span>
                                                                </div>
                                                            )
                                                        }
                                                        onClick={() => props.changeTag(key, vi)} />
                                                );
                                            }
                                            default: return null;
                                        }
                                    })
                                    : <NumericInput value={currentValue} min={v.min} max={v.max} className="number" allowNumericCharactersOnly fill placeholder={v.placeHolder} onValueChange={newv => props.changeTag(key, newv.toString())} />
                            }
                        </MenuItem>
                    )
                })
            }

        </Menu>
    );
    return menu;
}

const InfoPanel: React.FunctionComponent<InfoPanelProps> = (props: InfoPanelProps) => {
    if (props.files.length === 0 || props.file === null) return null;
    const idxDiv = getIndexFromDivider(props.file, props.files);
    const delChartMsg = <p>Are you sure you want to remove all transcribed notes? <br /></p>
    return (
        <div className="tabeditor-panel">
            <InstrumentalFileSelect
                activeItem={props.file}
                filterable
                resetOnClose
                className={classNames("info-item-control", Classes.ELEVATION_1)}
                itemPredicate={filterIFile}
                itemRenderer={(item, ps) => renderFile(item, ps, props.file, props.files)}
                itemDisabled={isInstrumentFileDisabled}
                itemsEqual={areFilesEqual}
                items={props.files}
                noResults={<MenuItem disabled text="No files." />}
                onItemSelect={props.handleFileChange}
            >
                {/* children become the popover target; render value here */}
                <Button text={props.file ? <span>{props.file.title} - Chart #<span className="number">{idxDiv[0] - idxDiv[1]}</span></span> : ""} rightIcon="double-caret-vertical" />
            </InstrumentalFileSelect>
            <TagInput
                className={classNames("info-item-control", "tag-input", Classes.ELEVATION_1)}
                leftIcon={IconNames.TAG}
                addOnPaste={false}
                tagProps={{ minimal: true }}
                values={props.file?.instrumentNotes.tags}
                placeholder="Tags.."
                onAdd={props.addTag}
                onRemove={(v, i) => { props.removeTag(v, i) }}
                rightElement={
                    (
                        <Popover content={renderTagMenu(props)} inheritDarkTheme position={Position.BOTTOM_RIGHT}>
                            <Button minimal icon={IconNames.CHEVRON_DOWN} />
                        </Popover>
                    )
                }
            />
            <Card elevation={0} id="" className={classNames("info-item", "zoomer")}>
                <ButtonExtended
                    small
                    minimal
                    icon={IconNames.ZOOM_OUT}
                    className={classNames("zoom-item", "zoom-item-button")}
                    onClick={props.zoomOut} />
                <div className="zoom-item">
                    <Slider
                        min={ZOOM_MIN}
                        max={ZOOM_MAX}
                        value={props.zoomValue}
                        stepSize={1}
                        labelRenderer={false}
                        className="zoom-item"
                        onChange={props.zoom}
                        onRelease={props.zoom}
                    />
                </div>
                <ButtonExtended
                    small
                    minimal
                    className={classNames("zoom-item-button")}
                    icon={IconNames.ZOOM_IN}
                    onClick={props.zoomIn}
                />
            </Card>
            <div className="tab-button-group">
                <Tooltip
                    hoverOpenDelay={1000}
                    lazy
                    inheritDarkTheme
                    content="Selected/Total notes in the chart">
                    <Callout className={classNames("info-item-no-space", Classes.ELEVATION_1, "number")}>
                        <span ref={props.notesCountRef}> s:0 n:0</span>
                    </Callout>
                </Tooltip>
                <NavbarDivider className="tab-button-divider" />
                <Tooltip
                    hoverOpenDelay={1000}
                    lazy
                    inheritDarkTheme
                    content="Play a clap on every note that's played">
                    <ButtonExtended
                        onClick={props.toggleNotePlay}
                        active={props.notePlay}
                        className="info-item-control"
                        small
                        icon={IconNames.MUSIC}
                        intent={Intent.NONE} />
                </Tooltip>
                <Tooltip
                    hoverOpenDelay={1000}
                    lazy
                    inheritDarkTheme
                    content="Play a clap on every note that's played">
                    <ButtonExtended
                        onClick={props.toggleClap}
                        active={props.clap}
                        className="info-item-control"
                        small
                        icon={clapSVG()}
                        intent={Intent.NONE} />
                </Tooltip>
                <Tooltip
                    hoverOpenDelay={1000}
                    lazy
                    inheritDarkTheme
                    content="Play a metronome (click-track) synced with the current beatmap">
                    <ButtonExtended
                        onClick={props.toggleMetronome}
                        active={props.metronome}
                        small
                        icon={metronomeSVG()}
                        intent={Intent.NONE} />
                </Tooltip>
                <NavbarDivider className="tab-button-divider" />
                <Tooltip
                    hoverOpenDelay={1000}
                    lazy
                    inheritDarkTheme
                    content="TODO: Add a note(s)">
                    <ButtonExtended small icon={IconNames.PLUS} className="info-item-control" intent={Intent.NONE} />
                </Tooltip>
                <Tooltip
                    hoverOpenDelay={1000}
                    lazy
                    inheritDarkTheme
                    content="Shifts all selected note(s) to the previous beat">
                    <ButtonExtended
                        small
                        icon={IconNames.CHEVRON_LEFT}
                        className="info-item-control"
                        intent={Intent.NONE}
                        onClick={() => props.noteEditorRef.current?.kbdHandler(keyShortcuts.MOVE_LEFT)}
                    />
                </Tooltip>
                <Tooltip
                    hoverOpenDelay={1000}
                    lazy
                    inheritDarkTheme
                    content="Shifts all selected note(s) to the next beat">
                    <ButtonExtended
                        small
                        icon={IconNames.CHEVRON_RIGHT}
                        intent={Intent.NONE}
                        onClick={() => props.noteEditorRef.current?.kbdHandler(keyShortcuts.MOVE_RIGHT)}
                    />
                </Tooltip>
                <NavbarDivider className="tab-button-divider" />
                <Tooltip
                    hoverOpenDelay={1000}
                    lazy
                    inheritDarkTheme
                    content="TODO: ddc generation">
                    <ButtonExtended small icon={IconNames.TIMELINE_BAR_CHART} className="info-item-control" intent={Intent.NONE} key="dd" />
                </Tooltip>
                <Tooltip
                    hoverOpenDelay={1000}
                    lazy
                    inheritDarkTheme
                    content="TODO: melody traking">
                    <ButtonExtended small icon={IconNames.SOCIAL_MEDIA} intent={Intent.NONE} key="melody tracking" />
                </Tooltip>
                <NavbarDivider className="tab-button-divider" />
                <Popover content={deletePopover(props.deleteNotes, delChartMsg)} position={Position.BOTTOM_RIGHT}>
                    <Tooltip
                        hoverOpenDelay={1000}
                        lazy
                        inheritDarkTheme
                        content="Clears all notes from the chart">
                        <ButtonExtended className="info-item-control" small icon={IconNames.CROSS} intent={Intent.NONE} />
                    </Tooltip>
                </Popover>
                <Popover content={deletePopover(props.deleteFile)} position={Position.BOTTOM_RIGHT}>
                    <Tooltip
                        hoverOpenDelay={1000}
                        lazy
                        inheritDarkTheme
                        content="Deletes the chart from the project">
                        <ButtonExtended small icon={IconNames.TRASH} intent={Intent.NONE} />
                    </Tooltip>
                </Popover>
            </div>
        </div>
    )
}

export default TabEditor;
