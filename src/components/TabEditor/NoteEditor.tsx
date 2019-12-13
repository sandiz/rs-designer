import React, { RefObject } from 'react';
import classNames from 'classnames';
import { Classes, ResizeSensor } from '@blueprintjs/core';
import Selection from '@simonwep/selection-js';
import { GlobalHotKeys } from 'react-hotkeys';
import MediaPlayerService from '../../services/mediaplayer';
import ProjectService from '../../services/project';
import {
    BeatTime, NoteTime, Instrument, InstrumentNotesInMem, HotkeyInfo,
} from '../../types';
import './TabEditor.scss';
import { jsonStringifyCompare, clone } from '../../lib/utils';

const beatCache: { [key: string]: [number, BeatTime] } = {}; //TODO: clear on beat change
export function snapToGrid(x: number, rect: DOMRect, offset: number, beats: BeatTime[]): [number, BeatTime] {
    const duration = MediaPlayerService.getDuration();
    const time = ((x + offset) / rect.width) * duration;
    if (beatCache[time]) {
        return beatCache[time];
    }
    if (beats.length > 0) {
        const closest = beats.reduce((prev: BeatTime, curr: BeatTime) => {
            return (Math.abs(parseFloat(curr.start) - time) < Math.abs(parseFloat(prev.start) - time) ? curr : prev);
        });
        const result: [number, BeatTime] = [((parseFloat(closest.start) / duration) * rect.width) - offset, closest];
        beatCache[time.toString()] = result;
        return result;
    }
    const beat: BeatTime = { start: "0", beatNum: "0" };
    return [x, beat];
}
//const _snapToGrid = snapToGrid;_.memoize(snapToGrid, (...args) => args.join("_"));
interface NoteEditorProps {
    width: number;
    instrument?: Instrument;
    instrumentNotes?: InstrumentNotesInMem;
    instrumentNoteIdx?: number;
    insertHeadBeatIdx?: number;
}
interface NoteEditorState {
    beats: BeatTime[];
    instrumentNotes: NoteTime[];
    instrumentTags: string[];
    selectedNotes: NoteTime[];
}
const STRING_COLORS: string[] = [
    "linear-gradient(0deg, rgba(193,55,211,1) 12%, rgba(237,101,255,1) 100%)", //"#C137D3",
    "linear-gradient(0deg, rgba(91,228,42,1) 12%, rgba(134,255,91,1) 100%)", //"#5BE42A",
    "linear-gradient(0deg, rgba(228,149,52,1) 12%, rgba(255,184,96,1) 100%)", //"#E49534",
    "linear-gradient(0deg, rgba(48,147,195,1) 12%, rgba(98,204,255,1) 100%)", //"#3093C3",
    "linear-gradient(0deg, rgba(208,181,36,1) 12%, rgba(255,232,106,1) 100%)", //"#D0B524",
    "linear-gradient(0deg, rgba(213,22,41,1) 12%, rgba(255,117,131,1) 100%)", //"#DB4251",
]
const NOTE_WIDTH = 40; /* see .note css class */
const HOVER_NOTE_TOP_OFFSET = 10;
enum FRET { MAX = 24, MIN = 0 }
export enum keyShortcuts { SELECT_ALL, DELETE, CUT, COPY, PASTE, MOVE_LEFT, MOVE_RIGHT }
class NoteEditor extends React.Component<NoteEditorProps, NoteEditorState> {
    public keyMap = {
        SELECT_ALL_NOTES: HotkeyInfo.SELECT_ALL_NOTES.hotkey,
        DELETE_NOTES: HotkeyInfo.DELETE_NOTES.hotkey,
        CUT_NOTES: HotkeyInfo.CUT_NOTES.hotkey,
        COPY_NOTES: HotkeyInfo.COPY_NOTES.hotkey,
        PASTE_NOTES: HotkeyInfo.PASTE_NOTES.hotkey,
        MOVE_NOTES_LEFT: HotkeyInfo.MOVE_NOTES_LEFT.hotkey,
        MOVE_NOTES_RIGHT: HotkeyInfo.MOVE_NOTES_RIGHT.hotkey,
    }

    public handlers = {
        SELECT_ALL_NOTES: () => this.kbdHandler(keyShortcuts.SELECT_ALL),
        DELETE_NOTES: () => this.kbdHandler(keyShortcuts.DELETE),
        CUT_NOTES: () => this.kbdHandler(keyShortcuts.CUT),
        COPY_NOTES: () => this.kbdHandler(keyShortcuts.COPY),
        PASTE_NOTES: () => this.kbdHandler(keyShortcuts.PASTE),
        MOVE_NOTES_LEFT: () => this.kbdHandler(keyShortcuts.MOVE_LEFT),
        MOVE_NOTES_RIGHT: () => this.kbdHandler(keyShortcuts.MOVE_RIGHT),
    }

    private hoverRef: RefObject<HTMLDivElement>;
    private notesRef: RefObject<HTMLDivElement>;
    private neckRef: RefObject<HTMLDivElement>;
    private currentString: HTMLElement | null;
    private strings: HTMLDivElement[];
    private selection: Selection | null = null;;
    private clipboard: NoteTime[] = [];
    constructor(props: NoteEditorProps) {
        super(props);
        this.hoverRef = React.createRef();
        this.notesRef = React.createRef();
        this.neckRef = React.createRef();
        this.state = {
            beats: [],
            instrumentNotes: props.instrumentNotes ? props.instrumentNotes.notes : [],
            instrumentTags: props.instrumentNotes ? props.instrumentNotes.tags : [],
            selectedNotes: [],
        };
        this.currentString = null;
        this.strings = [];
    }

    componentDidMount = async () => {
        const metadata = await ProjectService.getProjectMetadata();
        if (metadata) {
            this.setState({ beats: metadata.beats });
            this.selection = Selection.create({
                class: 'selection',
                // All elements in this container can be selected
                selectables: ['.neck > .notes-container > div'],
                // The container is also the boundary in this case
                boundaries: ['.neck'],
                singleClick: false,
            });
            this.selection.on('start', ({ inst, selected }) => {
                if (this.hoverRef.current) this.hoverRef.current.style.visibility = "hidden";

                for (let i = 0; i < selected.length; i += 1) {
                    const el = selected[i];
                    inst.removeFromSelection(el);
                }
                this.setState({ selectedNotes: [] });
                inst.clearSelection();
            });
            this.selection.on('move', ({ changed: { removed, added } }) => {
                if (this.hoverRef.current) this.hoverRef.current.style.visibility = "hidden";
                const { selectedNotes } = this.state;

                for (let i = 0; i < added.length; i += 1) {
                    const el = added[i];
                    const attrib = el.getAttribute("data-note-idx");
                    if (attrib) {
                        const idx = parseInt(attrib, 10);
                        const note = this.state.instrumentNotes[idx];
                        selectedNotes.push(note);
                    }
                }

                for (let i = 0; i < removed.length; i += 1) {
                    const el = removed[i];
                    const attrib = el.getAttribute("data-note-idx");
                    if (attrib) {
                        const idx = parseInt(attrib, 10);
                        const note = this.state.instrumentNotes[idx];
                        const idx2 = selectedNotes.indexOf(note);
                        if (idx2 !== -1) selectedNotes.splice(idx2, 1);
                    }
                }
                this.setState({ selectedNotes });
            });
            this.selection.on('stop', ({ inst }) => {
                if (this.hoverRef.current) this.hoverRef.current.style.visibility = "unset";
                inst.keepSelection();
            });
        }
    }

    componentWillUnmount = () => {
        if (this.selection) this.selection.destroy();
    }

    componentDidUpdate = (prevProps: NoteEditorProps) => {
        if (this.props.instrumentNotes) {
            if (JSON.stringify(prevProps.instrumentNotes?.notes) !== JSON.stringify(this.props.instrumentNotes.notes)) {
                /*https://github.com/yannickcr/eslint-plugin-react/issues/1707*/
                //eslint-disable-next-line 
                this.setState({
                    instrumentNotes: this.props.instrumentNotes.notes,
                })
            }
            else if (JSON.stringify(prevProps.instrumentNotes?.tags) !== JSON.stringify(this.props.instrumentNotes.tags)) {
                //eslint-disable-next-line 
                this.setState({
                    instrumentTags: this.props.instrumentNotes.tags,
                })
            }
        }
    }

    onMouseEnter = (event: React.MouseEvent) => {
        this.currentString = event.currentTarget.children[0] as HTMLElement
        if (this.hoverRef.current) this.hoverRef.current.style.visibility = "unset";
        const idx = this.currentString.getAttribute("data-string-idx");
        if (idx) {
            const color = STRING_COLORS[parseInt(idx, 10)];
            if (this.hoverRef.current) this.hoverRef.current.style.background = color;
        }
    }

    onMouseMove = () => {
    }

    onMouseLeave = () => {
        this.currentString = null;
        if (this.hoverRef.current) this.hoverRef.current.style.visibility = "hidden";
    }

    onMouseClick = (event: React.MouseEvent) => {
        if (this.hoverRef.current && this.state.beats.length > 0) {
            if (this.state.selectedNotes.length > 0) {
                this.setState({ selectedNotes: [] });
                return;
            }
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const hr = this.hoverRef.current.getBoundingClientRect();
            const x = event.clientX - (rect.left) - (hr.width / 2);
            const closest = snapToGrid(x, rect, hr.width / 2, this.state.beats);
            if (this.currentString) {
                const {
                    instrument, instrumentNoteIdx,
                } = this.props;
                const {
                    instrumentNotes,
                } = this.state
                if (instrumentNotes && instrument && instrumentNoteIdx !== undefined) {
                    const string = parseInt(this.currentString.getAttribute("data-string-idx") as string, 10);
                    const startTime = parseFloat(closest[1].start);
                    const endTime = parseFloat(closest[1].start);
                    // if a note is already there
                    const idx = instrumentNotes.findIndex(i => i.startTime === startTime && i.string === string)
                    if (idx !== -1) {
                        return;
                    }
                    else {
                        const newNote: NoteTime = {
                            string,
                            fret: 0,
                            type: "note",
                            startTime,
                            endTime,
                        };
                        this.setState(state => {
                            const list = [...state.instrumentNotes, newNote];
                            return {
                                instrumentNotes: list,
                            }
                        }, () => {
                            ProjectService.saveInstrument(instrument, { notes: this.state.instrumentNotes, tags: this.state.instrumentTags }, instrumentNoteIdx);
                        });
                    }
                }
            }
        }
        event.stopPropagation();
        event.preventDefault();
    }

    onMouseClickNote = (event: React.MouseEvent, idx: number) => {
        const {
            instrumentNotes,
            instrumentTags,
        } = this.state;
        let {
            selectedNotes,
        } = this.state;
        const {
            instrument, instrumentNoteIdx,
        } = this.props;

        if (instrument && instrumentNoteIdx !== undefined) {
            if (event.button === 2) {
                // delete
                instrumentNotes.splice(idx, 1);
                selectedNotes = [];
            }
            else {
                const sidx = this.state.selectedNotes.findIndex(p => jsonStringifyCompare(p, instrumentNotes[idx]));
                if (sidx !== -1) selectedNotes.splice(sidx, 1);
                else {
                    if (event.shiftKey) selectedNotes.push(instrumentNotes[idx]);
                    else selectedNotes = [instrumentNotes[idx]];
                }
            }
            this.setState({ instrumentNotes, selectedNotes });
            ProjectService.saveInstrument(instrument, { notes: instrumentNotes, tags: instrumentTags }, instrumentNoteIdx);
        }
        event.stopPropagation();
        event.preventDefault();
    }

    onNeckMouseWheel = (event: React.WheelEvent) => {
        const { selectedNotes } = this.state;
        selectedNotes.forEach((item) => {
            const diff = event.shiftKey ? 5 : 1;
            const downDirection = event.deltaY > 0;
            const upDirection = event.deltaY < 0;
            if (downDirection) {
                if (item.fret - diff < FRET.MIN) return;
                item.fret -= diff;
            }
            else if (upDirection) {
                if (item.fret + diff > FRET.MAX) return;
                item.fret += diff;
            }
        });
        this.setState({ selectedNotes });
    }

    onNeckMouseMove = (event: React.MouseEvent) => {
        //console.time('start');
        if (this.hoverRef.current) {
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const hr = this.hoverRef.current.getBoundingClientRect();
            let x = event.clientX - (rect.left) - (hr.width / 2);
            const y = event.clientY - (rect.top) - (hr.height / 2);
            const closest = snapToGrid(x, rect, hr.width / 2, this.state.beats);

            if (this.state.beats.length <= 0) {
                this.hoverRef.current.style.transition = "0ms";
            }
            x = closest[0]
            if (this.currentString) {
                this.hoverRef.current.style.transform = `translate(${x}px,${this.currentString.offsetTop - (hr.height - HOVER_NOTE_TOP_OFFSET)}px)`;
            }
            else this.hoverRef.current.style.transform = `translate(${x}px,${y}px)`;
        }
        //console.timeEnd("start");
    }

    onNeckMouseEnter = (event: React.MouseEvent) => {
        if (this.hoverRef.current) {
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const hr = this.hoverRef.current.getBoundingClientRect();
            let x = event.clientX - (rect.left) - (hr.width / 2); //x position within the element.
            const y = event.clientY - (rect.top) - (hr.height / 2);  //y position within the element.
            x = snapToGrid(x, rect, hr.width / 2, this.state.beats)[0];
            this.hoverRef.current.style.transform = `translate(${x}px,${y}px)`
        }
    }

    onNeckMouseLeave = () => {
    }

    addString = (ref: HTMLDivElement | null) => {
        if (ref) {
            this.strings.push(ref);
        }
    }

    kbdHandler = (h: keyShortcuts) => {
        switch (h) {
            case keyShortcuts.SELECT_ALL:
                {
                    let n: NoteTime[] = [];
                    if (this.state.instrumentNotes) {
                        n = this.state.instrumentNotes;
                    }
                    this.setState({ selectedNotes: [...n] });
                }
                break;
            case keyShortcuts.DELETE:
                {
                    const { instrumentNotes } = this.state;
                    if (instrumentNotes) {
                        this.state.selectedNotes.forEach((item) => {
                            const idx = instrumentNotes.findIndex(p => p.startTime === item.startTime && p.string === item.string);
                            if (idx !== -1) {
                                instrumentNotes.splice(idx, 1);
                            }
                        })
                        this.setState({ selectedNotes: [], instrumentNotes: [...instrumentNotes] });
                        const {
                            instrument, instrumentNoteIdx, insertHeadBeatIdx,
                        } = this.props;
                        const { instrumentTags } = this.state;

                        if (instrument && instrumentNoteIdx !== undefined && insertHeadBeatIdx !== undefined) {
                            ProjectService.saveInstrument(instrument, { notes: [], tags: instrumentTags }, instrumentNoteIdx);
                        }
                    }
                }
                break;
            case keyShortcuts.CUT:
                {
                    const { selectedNotes } = this.state;
                    this.clipboard = [...selectedNotes];
                    this.setState({ selectedNotes });
                }
                break;
            case keyShortcuts.COPY:
                {
                    const { selectedNotes } = this.state;
                    this.clipboard = [...selectedNotes];
                }
                break;
            case keyShortcuts.PASTE:
                {
                    const items = this.clipboard;
                    const newItems: NoteTime[] = [];
                    const {
                        instrument, instrumentNoteIdx, insertHeadBeatIdx,
                    } = this.props;
                    if (instrument && insertHeadBeatIdx !== undefined && instrumentNoteIdx !== undefined && this.clipboard.length > 0) {
                        const minStart = items.reduce((min, p) => (p.startTime < min ? p.startTime : min), items[0].startTime);
                        const {
                            instrumentNotes,
                            instrumentTags,
                        } = this.state
                        const beatStart = parseFloat(this.state.beats[insertHeadBeatIdx].start);
                        items.forEach(i => {
                            const c: NoteTime = clone(i);
                            const diff = c.startTime - minStart;
                            c.startTime = beatStart + (diff);
                            c.endTime = beatStart + diff;
                            const idx = instrumentNotes.findIndex(item => item.startTime === c.startTime && item.string === c.string);
                            if (idx !== -1) {
                                instrumentNotes.splice(idx, 1);
                            }
                            newItems.push(c);
                        });
                        const new1 = [...instrumentNotes, ...newItems]
                        this.setState({ instrumentNotes: new1, selectedNotes: newItems });
                        ProjectService.saveInstrument(instrument, { notes: new1, tags: instrumentTags }, instrumentNoteIdx);
                    }
                }
                break;
            case keyShortcuts.MOVE_LEFT:
                {
                    const { selectedNotes, instrumentNotes, instrumentTags } = this.state;
                    for (let i = 0; i < selectedNotes.length; i += 1) {
                        const { startTime, string } = selectedNotes[i];
                        const startIdx = this.state.beats.findIndex(item => {
                            return item.start === startTime.toString()
                        });
                        const isntIdx = instrumentNotes.findIndex(item => item.startTime === startTime && item.string === string);
                        if (startIdx !== -1 && startIdx > 0) {
                            const prevBeat = parseFloat(this.state.beats[startIdx - 1].start);
                            const prevNoteIdx = instrumentNotes.findIndex(p => p.startTime === prevBeat && p.string === string);
                            if (prevNoteIdx === -1) {
                                selectedNotes[i].startTime = prevBeat;
                                selectedNotes[i].endTime = prevBeat;
                                instrumentNotes[isntIdx].startTime = prevBeat;
                                instrumentNotes[isntIdx].endTime = prevBeat;
                            }
                        }
                    }
                    const new1 = [...instrumentNotes];
                    const new2 = [...selectedNotes]
                    this.setState({ instrumentNotes: new1, selectedNotes: new2 });
                    const {
                        instrument, instrumentNoteIdx, insertHeadBeatIdx,
                    } = this.props;
                    if (instrument && instrumentNoteIdx !== undefined && insertHeadBeatIdx !== undefined) {
                        ProjectService.saveInstrument(instrument, { notes: new1, tags: instrumentTags }, instrumentNoteIdx);
                    }
                }
                break;
            case keyShortcuts.MOVE_RIGHT:
                {
                    const { selectedNotes, instrumentNotes } = this.state;
                    for (let i = 0; i < selectedNotes.length; i += 1) {
                        const { startTime, string } = selectedNotes[i];
                        const startIdx = this.state.beats.findIndex(item => item.start === startTime.toString());
                        const isntIdx = instrumentNotes.findIndex(item => item.startTime === startTime && item.string === string);
                        if (startIdx !== -1 && startIdx < this.state.beats.length - 1) {
                            const nextBeat = parseFloat(this.state.beats[startIdx + 1].start);
                            const nextNoteIdx = instrumentNotes.findIndex(p => p.startTime === nextBeat && p.string === string);
                            if (nextNoteIdx === -1) {
                                selectedNotes[i].startTime = nextBeat;
                                selectedNotes[i].endTime = nextBeat;
                                instrumentNotes[isntIdx].startTime = nextBeat;
                                instrumentNotes[isntIdx].endTime = nextBeat;
                            }
                        }
                    }
                    this.setState({ instrumentNotes, selectedNotes })
                }
                break;
            default:
                break;
        }
    }

    deleteNotes = () => {
        this.setState({ instrumentNotes: [], selectedNotes: [] }, () => {
            const {
                instrument, instrumentNoteIdx,
            } = this.props;
            if (instrument && instrumentNoteIdx !== undefined) {
                ProjectService.saveInstrument(instrument, { notes: [], tags: this.state.instrumentTags }, instrumentNoteIdx);
            }
        });
    }

    render = () => {
        return (
            <GlobalHotKeys keyMap={this.keyMap} handlers={this.handlers}>
                <ResizeSensor onResize={() => this.forceUpdate()}>
                    <div
                        onMouseEnter={this.onNeckMouseEnter}
                        onMouseMove={this.onNeckMouseMove}
                        onMouseLeave={this.onNeckMouseLeave}
                        onWheel={this.onNeckMouseWheel}
                        className="neck"
                        ref={this.neckRef}
                    >
                        <div ref={this.notesRef} className="notes-container">
                            {
                                this.state.instrumentNotes.map((note: NoteTime, idx: number) => {
                                    const i = idx;
                                    if (!this.neckRef.current) return null;
                                    const string = this.strings[note.string];
                                    const per = (note.startTime / MediaPlayerService.getDuration()) * (this.props.width) - (NOTE_WIDTH / 2)
                                    return (
                                        <div
                                            data-note-idx={idx}
                                            onMouseUp={e => this.onMouseClickNote(e, i)}
                                            key={note.string + "_" + note.fret + "_" + note.startTime}
                                            className={classNames("note", Classes.CARD, Classes.ELEVATION_3, "number",
                                                { "note-selected": this.state.selectedNotes.findIndex(p => jsonStringifyCompare(p, note)) !== -1 })}
                                            style={{
                                                //position
                                                textAlign: "center",
                                                background: STRING_COLORS[note.string],
                                                position: "absolute",
                                                transform: `translate(${per}px, ${string.offsetTop - (NOTE_WIDTH / 2) - HOVER_NOTE_TOP_OFFSET}px)`,
                                            }}
                                        >
                                            {note.fret}
                                        </div>
                                    )
                                })
                            }
                        </div>
                        <div ref={this.hoverRef} className={classNames("hover-note", Classes.CARD, Classes.ELEVATION_3, Classes.INTERACTIVE)} />
                        <div
                            className="strings-hitbox strings-hitbox-first"
                            onMouseMove={this.onMouseMove}
                            onMouseEnter={this.onMouseEnter}
                            onMouseLeave={this.onMouseLeave}
                            onClick={this.onMouseClick}>
                            <div className="strings" data-string-idx="0" data-string="E" ref={this.addString} />
                        </div>
                        <div
                            className="strings-hitbox"
                            onMouseMove={this.onMouseMove}
                            onMouseEnter={this.onMouseEnter}
                            onMouseLeave={this.onMouseLeave}
                            onClick={this.onMouseClick}>
                            <div className="strings" data-string-idx="1" data-string="B" ref={this.addString} />
                        </div>
                        <div
                            className="strings-hitbox"
                            onMouseMove={this.onMouseMove}
                            onMouseEnter={this.onMouseEnter}
                            onMouseLeave={this.onMouseLeave}
                            onClick={this.onMouseClick}>
                            <div className="strings" data-string-idx="2" data-string="G" ref={this.addString} />
                        </div>
                        <div
                            className="strings-hitbox"
                            onMouseMove={this.onMouseMove}
                            onMouseEnter={this.onMouseEnter}
                            onMouseLeave={this.onMouseLeave}
                            onClick={this.onMouseClick}>
                            <div className="strings" data-string-idx="3" data-string="D" ref={this.addString} />
                        </div>
                        <div
                            className="strings-hitbox"
                            onMouseMove={this.onMouseMove}
                            onMouseEnter={this.onMouseEnter}
                            onMouseLeave={this.onMouseLeave}
                            onClick={this.onMouseClick}>
                            <div className="strings" data-string-idx="4" data-string="A" ref={this.addString} />
                        </div>
                        <div
                            className="strings-hitbox"
                            onMouseMove={this.onMouseMove}
                            onMouseOver={this.onMouseEnter}
                            onMouseOut={this.onMouseLeave}
                            onMouseDown={this.onMouseClick}>
                            <div className="strings" data-string-idx="5" data-string="E" ref={this.addString} />
                        </div>
                    </div>
                </ResizeSensor>
            </GlobalHotKeys>
        );
    }
}

export default NoteEditor;
