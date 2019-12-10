import React, { RefObject } from 'react';
import classNames from 'classnames';
import {
    Card, Slider, TagInput, MenuItem, Button, Classes, Menu, Popover,
    NumericInput, TagInputAddMethod, Position, Intent, NavbarDivider,
} from '@blueprintjs/core';
import { Select } from "@blueprintjs/select";
import { clamp } from '@blueprintjs/core/lib/esm/common/utils';
import { IconNames, IconName } from '@blueprintjs/icons';
import { CardExtended, ButtonExtended } from '../Extended/FadeoutSlider';
import './TabEditor.scss'
import MediaPlayerService from '../../services/mediaplayer';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import ProjectService from '../../services/project';
import NoteEditor from './NoteEditor';
import {
    InstrumentListItem, filterIFile, renderFile, isInstrumentFileDisabled, areFilesEqual, getAllFiles, getIndexFromDivider,
} from './InstrumentFile';
import { Instrument, allTunings, baseTuning } from '../../types';
import { getTransposedKey } from '../../lib/music-utils';
import { deletePopover } from '../../dialogs';

const { nativeTheme } = window.require("electron").remote;
const InstrumentalFileSelect = Select.ofType<InstrumentListItem>();

enum TagItem { DD = "dd", TUNING = "tuning", CENT = "centoffset", CAPO = "capo" }
interface TabEditorState {
    duration: number;
    zoom: number;
    files: InstrumentListItem[];
    currentFile: InstrumentListItem | null;
    currentFileIdx: number;
}
const PX_PER_SEC = 40;
const ZOOM_MIN = PX_PER_SEC;
const ZOOM_MAX = PX_PER_SEC * 10
const ZOOM_DEFAULT = PX_PER_SEC;
class TabEditor extends React.Component<{}, TabEditorState> {
    private beatsRef: RefObject<HTMLDivElement>;
    private timelineRef: RefObject<HTMLDivElement>;
    private imageRef: RefObject<HTMLImageElement>;
    private neckContainerRef: RefObject<HTMLDivElement>;
    private progressRef: RefObject<HTMLDivElement>;
    private tabImgRef: RefObject<HTMLDivElement>;
    private tabNoteRef: RefObject<HTMLDivElement>;
    private overflowRef: RefObject<HTMLDivElement>;
    private progressRAF = 0;

    constructor(props: {}) {
        super(props);
        this.state = {
            duration: 0, zoom: ZOOM_DEFAULT, files: [], currentFile: null, currentFileIdx: 0,
        };
        this.beatsRef = React.createRef();
        this.timelineRef = React.createRef();
        this.imageRef = React.createRef();
        this.neckContainerRef = React.createRef();
        this.progressRef = React.createRef();
        this.tabImgRef = React.createRef();
        this.tabNoteRef = React.createRef();
        this.overflowRef = React.createRef();
    }

    componentDidMount = async () => {
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.on(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.on(DispatchEvents.ProjectClosed, this.projectClosed);
        nativeTheme.on('updated', this.updateImage);
        if (MediaPlayerService.isActive()) {
            this.mediaReady();
        }
        this.updateFiles();
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.off(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.off(DispatchEvents.ProjectClosed, this.projectClosed);
        nativeTheme.on('updated', this.updateImage);
        cancelAnimationFrame(this.progressRAF);
    }

    projectOpened = () => {
        this.setState({
            currentFile: null, currentFileIdx: 0, files: [],
        });
    }
    projectClosed = () => {
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

    mediaReset = async () => {
        if (MediaPlayerService.wavesurfer) {
            MediaPlayerService.wavesurfer.off('seek', this.onSeek);
        }
    }

    mediaReady = async () => {
        const duration = MediaPlayerService.getDuration();
        this.setState({ duration })
        const metadata = await ProjectService.getProjectMetadata();
        let gridColumns = "";
        let prev = 0;
        let onecounter = 0;
        if (metadata) {
            const beats = metadata.beats;
            beats.forEach((beatData, i) => {
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
            let timelinegridColumns = "";
            for (let i = 0; i < Math.round(duration); i += 1) {
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
            }
            if (this.beatsRef.current) this.beatsRef.current.style.gridTemplateColumns = gridColumns;
            if (this.timelineRef.current) this.timelineRef.current.style.gridTemplateColumns = timelinegridColumns;
        }
        this.updateImage();
        this.updateProgress();
        this.updateFiles();
        if (MediaPlayerService.wavesurfer) {
            MediaPlayerService.wavesurfer.on('seek', this.onSeek);
        }
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

    updateProgress = () => {
        this.progressRAF = requestAnimationFrame(this.updateProgress);
        const time = MediaPlayerService.getCurrentTime();
        const per = (time / MediaPlayerService.getDuration()) * 100;
        if (this.neckContainerRef.current && this.progressRef.current) {
            const width = this.neckContainerRef.current.clientWidth;
            this.progressRef.current.style.transform = `translateX(${(per / 100) * width}px)`;

            if (this.overflowRef.current && MediaPlayerService.isPlaying()) {
                const sl = this.overflowRef.current.scrollLeft + this.overflowRef.current.clientWidth;
                const pos = (per / 100) * width;
                if (pos > sl) {
                    this.overflowRef.current.scrollLeft += this.overflowRef.current.clientWidth;
                }
            }
        }
    }

    zoomIn = () => {
        const cur = this.state.zoom;
        if (cur < ZOOM_MAX) {
            this.setState({ zoom: cur + 1 });
        }
    }
    zoomOut = () => {
        const cur = this.state.zoom;
        if (cur > ZOOM_MIN) {
            this.setState({ zoom: cur - 1 });
        }
    }

    zoom = (v: number) => this.setState({ zoom: clamp(v, ZOOM_MIN, ZOOM_MAX) })

    updateFiles = () => {
        const file = getAllFiles().filter(item => !item.isDivider)[this.state.currentFileIdx];
        this.setState({ files: getAllFiles(), currentFile: file });
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
                ProjectService.saveInstrument(currentFile.key as Instrument, currentFile.instrumentNotes, this.state.currentFileIdx);
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
        const { currentFile } = this.state;
        if (currentFile) {
            currentFile.instrumentNotes.notes = []
            this.setState({ currentFile });
        }
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
                                <NoteEditor
                                    width={this.state.zoom * this.state.duration}
                                    instrument={this.state.currentFile?.key as Instrument}
                                    instrumentNotes={this.state.currentFile?.instrumentNotes}
                                    instrumentNoteIdx={this.state.currentFileIdx}
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
                            style={{
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
                                                const notes = indices.map((i, idx) => getTransposedKey(baseTuning[idx], i)).join(" ");
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
                addOnPaste
                tagProps={{ minimal: true }}
                values={props.file?.instrumentNotes.tags}
                placeholder="Tags.."
                onAdd={props.addTag}
                onRemove={props.removeTag}
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
                <ButtonExtended small icon={IconNames.PLUS} className="info-item-control" intent={Intent.NONE} />
                <ButtonExtended small icon={IconNames.SOCIAL_MEDIA} intent={Intent.NONE} />

                <NavbarDivider className="tab-button-divider" />
                <Popover content={deletePopover(props.deleteNotes, delChartMsg)} position={Position.BOTTOM_RIGHT}>
                    <ButtonExtended className="info-item-control" small icon={IconNames.CROSS} intent={Intent.NONE} />
                </Popover>
                <Popover content={deletePopover(props.deleteFile)} position={Position.BOTTOM_RIGHT}>
                    <ButtonExtended small icon={IconNames.TRASH} intent={Intent.NONE} />
                </Popover>
            </div>
        </div>
    )
}

export default TabEditor;
