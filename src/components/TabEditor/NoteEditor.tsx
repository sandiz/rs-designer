import React, { RefObject } from 'react';
import classNames from 'classnames';
import { Classes, ResizeSensor } from '@blueprintjs/core';
import Selection from '@simonwep/selection-js';
import { HotKeys } from 'react-hotkeys';
import MediaPlayerService from '../../services/mediaplayer';
import ProjectService from '../../services/project';
import {
    STRING_COLORS,
} from '../../types/base'
import {
    BeatTime, NoteTime, NoteType,
} from '../../types/musictheory'
import {
    Instrument, InstrumentNotesInMem,
} from '../../types/project'
import {
    HotkeyInfo,
} from '../../types/hotkey'
import { jsonStringifyCompare, clone } from '../../lib/utils';
import { TabEditorSettings } from '../../types/settings';
import './TabEditor.scss';
import TabEditor from './TabEditor';

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
    toggleMetronome: () => void;
    toggleClap: () => void;
    toggleNotePlay: () => void;
    settings: TabEditorSettings;
    tabEditor: TabEditor;
}
interface NoteEditorState {
    beats: BeatTime[];
    instrumentNotes: NoteTime[];
    instrumentTags: string[];
    selectedNotes: NoteTime[];
    cursorPosition: [number, number]; /* string & beat */
    inFocus: boolean;
}
const NOTE_WIDTH = 25; /* see .note css class */
const HOVER_NOTE_TOP_OFFSET = 12.5;
export enum keyShortcuts {
    SELECT_ALL,
    DELETE,
    CUT,
    COPY,
    PASTE,
    MOVE_LEFT,
    MOVE_RIGHT,
    MOVE_UP,
    MOVE_DOWN,
    MOVE_CURSOR_LEFT,
    MOVE_CURSOR_RIGHT,
    MOVE_CURSOR_UP,
    MOVE_CURSOR_DOWN,
    INSERT_NOTE_AT_CURSOR,
    EDIT_NOTE_AT_CURSOR,
    FWD,
    REWIND,
    VOL_UP,
    VOL_DOWN,
}
class NoteEditor extends React.Component<NoteEditorProps, NoteEditorState> {
    public keyMap = {
        SELECT_ALL_NOTES: HotkeyInfo.SELECT_ALL_NOTES.hotkey,
        DELETE_NOTES: HotkeyInfo.DELETE_NOTES.hotkey,
        CUT_NOTES: HotkeyInfo.CUT_NOTES.hotkey,
        COPY_NOTES: HotkeyInfo.COPY_NOTES.hotkey,
        PASTE_NOTES: HotkeyInfo.PASTE_NOTES.hotkey,
        MOVE_NOTES_LEFT: HotkeyInfo.MOVE_NOTES_LEFT.hotkey,
        MOVE_NOTES_RIGHT: HotkeyInfo.MOVE_NOTES_RIGHT.hotkey,
        MOVE_NOTES_UP: HotkeyInfo.MOVE_NOTES_UP.hotkey,
        MOVE_NOTES_DOWN: HotkeyInfo.MOVE_NOTES_DOWN.hotkey,
        TOGGLE_METRONOME: HotkeyInfo.TOGGLE_METRONOME.hotkey,
        TOGGLE_CLAPS: HotkeyInfo.TOGGLE_CLAPS.hotkey,
        TOGGLE_NOTE_PLAY: HotkeyInfo.TOGGLE_NOTE_PLAY.hotkey,
        MOVE_CURSOR_LEFT: HotkeyInfo.MOVE_CURSOR_LEFT.hotkey,
        MOVE_CURSOR_RIGHT: HotkeyInfo.MOVE_CURSOR_RIGHT.hotkey,
        MOVE_CURSOR_UP: HotkeyInfo.MOVE_CURSOR_UP.hotkey,
        MOVE_CURSOR_DOWN: HotkeyInfo.MOVE_CURSOR_DOWN.hotkey,
        INSERT_NOTE_AT_CURSOR: HotkeyInfo.INSERT_NOTE_AT_CURSOR.hotkey,
        EDIT_NOTE_AT_CURSOR: HotkeyInfo.EDIT_NOTE_AT_CURSOR.hotkey,
        FWD: HotkeyInfo.FWD.hotkey,
        REWIND: HotkeyInfo.REWIND.hotkey,
        VOL_DOWN: HotkeyInfo.VOL_DOWN.hotkey,
        VOL_UP: HotkeyInfo.VOL_UP.hotkey,
    }

    public handlers = {
        //SELECT_PREV_NOTE: (e: KeyboardEvent | undefined) => { if (e) e.preventDefault(); this.kbdHandler(keyShortcuts.SELECT_PREV_NOTE); },
        //SELECT_NEXT_NOTE: (e: KeyboardEvent | undefined) => { if (e) e.preventDefault(); this.kbdHandler(keyShortcuts.SELECT_NEXT_NOTE); },
        //SELECT_NOTE_ABOVE: (e: KeyboardEvent | undefined) => { if (e) e.preventDefault(); this.kbdHandler(keyShortcuts.SELECT_NOTE_ABOVE); },
        //SELECT_NOTE_BELOW: (e: KeyboardEvent | undefined) => { if (e) e.preventDefault(); this.kbdHandler(keyShortcuts.SELECT_NOTE_BELOW); },
        SELECT_ALL_NOTES: () => this.kbdHandler(keyShortcuts.SELECT_ALL),
        DELETE_NOTES: () => this.kbdHandler(keyShortcuts.DELETE),
        CUT_NOTES: () => this.kbdHandler(keyShortcuts.CUT),
        COPY_NOTES: () => this.kbdHandler(keyShortcuts.COPY),
        PASTE_NOTES: () => this.kbdHandler(keyShortcuts.PASTE),
        MOVE_NOTES_LEFT: () => this.kbdHandler(keyShortcuts.MOVE_LEFT),
        MOVE_NOTES_RIGHT: () => this.kbdHandler(keyShortcuts.MOVE_RIGHT),
        MOVE_NOTES_UP: () => this.kbdHandler(keyShortcuts.MOVE_UP),
        MOVE_NOTES_DOWN: () => this.kbdHandler(keyShortcuts.MOVE_DOWN),
        MOVE_CURSOR_LEFT: (e: KeyboardEvent | undefined) => { if (e) e.preventDefault(); this.cursorHandler(keyShortcuts.MOVE_CURSOR_LEFT) },
        MOVE_CURSOR_RIGHT: (e: KeyboardEvent | undefined) => { if (e) e.preventDefault(); this.cursorHandler(keyShortcuts.MOVE_CURSOR_RIGHT) },
        MOVE_CURSOR_UP: (e: KeyboardEvent | undefined) => { if (e) e.preventDefault(); this.cursorHandler(keyShortcuts.MOVE_CURSOR_UP) },
        MOVE_CURSOR_DOWN: (e: KeyboardEvent | undefined) => { if (e) e.preventDefault(); this.cursorHandler(keyShortcuts.MOVE_CURSOR_DOWN) },
        INSERT_NOTE_AT_CURSOR: (e: KeyboardEvent | undefined) => { if (e) e.preventDefault(); this.cursorHandler(keyShortcuts.INSERT_NOTE_AT_CURSOR) },
        EDIT_NOTE_AT_CURSOR: (e: KeyboardEvent | undefined) => { if (e) e.preventDefault(); this.cursorHandler(keyShortcuts.EDIT_NOTE_AT_CURSOR) },
        TOGGLE_METRONOME: this.props.toggleMetronome,
        TOGGLE_CLAPS: this.props.toggleClap,
        TOGGLE_NOTE_PLAY: this.props.toggleNotePlay,
        FWD: (e: KeyboardEvent | undefined) => { if (e) { e.preventDefault(); e.stopPropagation(); } this.cursorHandler(keyShortcuts.MOVE_CURSOR_RIGHT); },
        REWIND: (e: KeyboardEvent | undefined) => { if (e) { e.preventDefault(); e.stopPropagation(); } this.cursorHandler(keyShortcuts.MOVE_CURSOR_LEFT); },
        VOL_UP: (e: KeyboardEvent | undefined) => { if (e) e.preventDefault(); this.cursorHandler(keyShortcuts.MOVE_CURSOR_UP); },
        VOL_DOWN: (e: KeyboardEvent | undefined) => { if (e) e.preventDefault(); this.cursorHandler(keyShortcuts.MOVE_CURSOR_DOWN); },
    }

    private hoverRef: RefObject<HTMLDivElement>;
    private notesRef: RefObject<HTMLDivElement>;
    private neckRef: RefObject<HTMLDivElement>;
    private currentString: HTMLElement | null;
    private strings: HTMLDivElement[];
    private selection: Selection | null = null;
    private cursorNoteRef: RefObject<HTMLDivElement>;
    private cursorTimer: NodeJS.Timeout | null = null;
    private clipboard: NoteTime[] = [];
    private noteDivRefs: HTMLDivElement[] = [];
    constructor(props: NoteEditorProps) {
        super(props);
        this.hoverRef = React.createRef();
        this.notesRef = React.createRef();
        this.neckRef = React.createRef();
        this.cursorNoteRef = React.createRef();
        this.state = {
            beats: [],
            instrumentNotes: props.instrumentNotes ? props.instrumentNotes.notes : [],
            instrumentTags: props.instrumentNotes ? props.instrumentNotes.tags : [],
            selectedNotes: [],
            cursorPosition: [0, 2],
            inFocus: false,
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

            if (this.selection == null) return;
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
            this.selection.on('beforestart', () => {
                return this.state.inFocus;
            })
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

    onFocus = () => {
        this.setState({ inFocus: true })
    }

    onFocusOut = () => {
        this.setState({ inFocus: false, selectedNotes: [] })
        if (this.selection) this.selection.clearSelection();
    }

    onMouseEnter = (event: React.MouseEvent) => {
        if (!this.state.inFocus) return;
        this.currentString = event.currentTarget.children[0] as HTMLElement
        if (this.hoverRef.current) this.hoverRef.current.style.visibility = "unset";
        const idx = this.currentString.getAttribute("data-string-idx");
        if (idx) {
            if (event.metaKey || event.ctrlKey) {
                if (this.hoverRef.current) this.hoverRef.current.style.background = "unset";
                return;
            }
            const color = STRING_COLORS[this.props.settings.getCS()][parseInt(idx, 10)];
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
        if (!this.state.inFocus) return;
        if (this.hoverRef.current && this.state.beats.length > 0) {
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const hr = this.hoverRef.current.getBoundingClientRect();
            const x = event.clientX - (rect.left) - (hr.width / 2);
            const closest = snapToGrid(x, rect, hr.width / 2, this.state.beats);

            if (event.ctrlKey || event.metaKey) {
                if (this.currentString) {
                    let { cursorPosition } = this.state;
                    const string = parseInt(this.currentString.getAttribute("data-string-idx") as string, 10);
                    const beat = this.state.beats.findIndex(i => i.start === closest[1].start);
                    if (beat !== -1) {
                        cursorPosition = [string, beat];
                        this.setState({ cursorPosition, selectedNotes: [] });
                    }
                }
                return;
            }
            if (this.state.selectedNotes.length > 0) {
                this.setState({ selectedNotes: [] });
                return;
            }
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
                    if (idx === -1) {
                        const newNote: NoteTime = new NoteTime({
                            string,
                            fret: 0,
                            type: NoteType.NOTE,
                            startTime,
                            endTime,
                        });
                        this.setState(state => {
                            const list = [...state.instrumentNotes, newNote];
                            list.sort((a, b) => a.startTime - b.startTime);
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
        //event.stopPropagation();
        //event.preventDefault();
    }

    onMouseClickNote = (event: React.MouseEvent, idx: number) => {
        if (!this.state.inFocus) return;
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
        //event.stopPropagation();
        //event.preventDefault();
    }


    onNeckMouseWheel = () => {
        /*
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
        */
    }

    onNeckMouseMove = (event: React.MouseEvent) => {
        if (!this.state.inFocus) return;
        if (this.hoverRef.current) {
            if (event.metaKey || event.ctrlKey) {
                this.hoverRef.current.style.background = "unset";
                this.hoverRef.current.classList.add(...["cursor-note"])
            }
            else {
                if (this.currentString) {
                    const idx = this.currentString.getAttribute("data-string-idx");
                    if (idx) {
                        const color = STRING_COLORS[this.props.settings.getCS()][parseInt(idx, 10)];
                        this.hoverRef.current.style.background = color;
                    }
                }
                this.hoverRef.current.classList.remove(...["cursor-note"])
            }
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const hr = this.hoverRef.current.getBoundingClientRect();
            let x = event.clientX - (rect.left) - (hr.width / 2);
            const y = event.clientY - (rect.top) - (hr.height / 2);
            const closest = snapToGrid(x, rect, hr.width / 2, this.state.beats);

            this.hoverRef.current.style.transition = "0";
            x = closest[0]
            if (this.currentString) {
                this.hoverRef.current.style.transform = `translate(${x}px,${this.currentString.offsetTop - (hr.height - HOVER_NOTE_TOP_OFFSET)}px)`;
            }
            else this.hoverRef.current.style.transform = `translate(${x}px,${y}px)`;
        }
    }

    onNeckMouseEnter = (event: React.MouseEvent) => {
        if (!this.state.inFocus) return;
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

    cursorHandler = (h: keyShortcuts) => {
        if (!this.state.inFocus) return;
        let { cursorPosition, selectedNotes } = this.state;
        let [string, beatNum] = cursorPosition;
        /*
            left, right, up, down 
                -> if(!shift) clear selectedNotes
                -> move cursor respectively, if cursor lands on a note, that note is selected or added if(shift) and cursor is hidden
                
        */
        const _isNoteAtCursor = (s = string, bn = beatNum): number => {
            const beat = this.state.beats[bn];
            return this.state.instrumentNotes.findIndex(i => i.startTime === parseFloat(beat.start) && i.string === s);
        }

        switch (h) {
            case keyShortcuts.MOVE_CURSOR_UP:
                string -= 1;
                if (string < 0) string = this.strings.length - 1;
                break;
            case keyShortcuts.MOVE_CURSOR_DOWN:
                string += 1;
                if (string > this.strings.length - 1) string = 0;
                break;
            case keyShortcuts.MOVE_CURSOR_LEFT:
                beatNum -= 1;
                if (beatNum < 0) beatNum = 0;
                break;
            case keyShortcuts.MOVE_CURSOR_RIGHT:
                beatNum += 1;
                if (beatNum > this.state.beats.length - 1) beatNum = this.state.beats.length - 1;
                break;
            case keyShortcuts.INSERT_NOTE_AT_CURSOR:
                if (_isNoteAtCursor() !== -1) {
                    console.warn("existing note under cursor, skipping insert");
                }
                else {
                    console.log("place note here", string, beatNum);
                }
                break;
            case keyShortcuts.EDIT_NOTE_AT_CURSOR:
                if (_isNoteAtCursor() !== -1) {
                    console.log("edit note here", string, beatNum);
                }
                break;
            default:
                break;
        }
        const noteIdx = _isNoteAtCursor(string, beatNum);
        if (noteIdx !== -1) {
            const note = this.state.instrumentNotes[noteIdx];
            selectedNotes = [note];
        }
        else {
            selectedNotes = [];
        }
        cursorPosition = [string, beatNum];
        this.setState({ cursorPosition, selectedNotes });
        this.props.tabEditor.updateProgressAt(
            parseFloat(this.state.beats[beatNum].start),
            h === keyShortcuts.MOVE_CURSOR_LEFT ? "left" : "right",
        );
        if (this.cursorNoteRef.current) {
            this.cursorNoteRef.current.classList.remove("blink-cursor");
        }
        if (this.cursorTimer) clearTimeout(this.cursorTimer)
        this.cursorTimer = setTimeout(() => {
            if (this.cursorNoteRef.current) {
                this.cursorNoteRef.current.classList.add("blink-cursor");
            }
        }, 1000);
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
                        const new1 = [...instrumentNotes];
                        this.setState({ selectedNotes: [], instrumentNotes: new1 });
                        const {
                            instrument, instrumentNoteIdx, insertHeadBeatIdx,
                        } = this.props;
                        const { instrumentTags } = this.state;

                        if (instrument && instrumentNoteIdx !== undefined && insertHeadBeatIdx !== undefined) {
                            ProjectService.saveInstrument(instrument, { notes: new1, tags: instrumentTags }, instrumentNoteIdx);
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
                        instrument, instrumentNoteIdx,
                    } = this.props;
                    if (instrument !== undefined && instrumentNoteIdx !== undefined && this.clipboard.length > 0) {
                        const {
                            instrumentNotes,
                            instrumentTags,
                        } = this.state
                        const minStart = items.reduce((min, p) => (p.startTime < min ? p.startTime : min), items[0].startTime);
                        const minBeat = this.state.beats.findIndex(i => parseFloat(i.start) === minStart);
                        if (minBeat !== -1) {
                            const pasteStart = this.state.cursorPosition[1];
                            items.forEach(i => {
                                const c: NoteTime = clone(i);
                                const beatStart = this.state.beats.findIndex(k => parseFloat(k.start) === c.startTime);
                                const beatEnd = this.state.beats.findIndex(k => parseFloat(k.start) === c.endTime);
                                if (beatStart !== -1) {
                                    const diff = beatStart - minBeat;
                                    const newPos = pasteStart + diff;
                                    const newBeat = this.state.beats[newPos];
                                    c.startTime = parseFloat(newBeat.start);
                                }
                                if (beatEnd !== -1) {
                                    const diff = beatEnd - minBeat;
                                    const newPos = pasteStart + diff;
                                    const newBeat = this.state.beats[newPos];
                                    c.endTime = parseFloat(newBeat.start);
                                }
                                const idx = instrumentNotes.findIndex(item => item.startTime === c.startTime && item.string === c.string);
                                if (idx !== -1) {
                                    instrumentNotes.splice(idx, 1);
                                }
                                newItems.push(c);
                            });
                        }
                        const new1 = [...instrumentNotes, ...newItems]
                        this.setState({ instrumentNotes: new1, selectedNotes: newItems });
                        ProjectService.saveInstrument(instrument, { notes: new1, tags: instrumentTags }, instrumentNoteIdx);
                    }
                }
                break;
            /*
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
            case keyShortcuts.MOVE_UP:
            case keyShortcuts.MOVE_DOWN:
                {
                    const {
                        instrument, instrumentNoteIdx, insertHeadBeatIdx,
                    } = this.props;
                    const { selectedNotes, instrumentNotes, instrumentTags } = this.state;
                    for (let i = 0; i < selectedNotes.length; i += 1) {
                        const { startTime, string } = selectedNotes[i];
                        if (string === 0 && h === keyShortcuts.MOVE_UP) return;
                        if (instrument && string === InstrumentOptions[instrument].strings - 1 && h === keyShortcuts.MOVE_DOWN) return;
                        const isntIdx = instrumentNotes.findIndex(item => item.startTime === startTime && item.string === string);
                        if (isntIdx !== -1) {
                            const newString = h === keyShortcuts.MOVE_UP ? string - 1 : string + 1;
                            const newIdx = instrumentNotes.findIndex(item => item.startTime === startTime && item.string === newString);
                            if (newIdx === -1) {
                                selectedNotes[i].string = newString;
                                instrumentNotes[isntIdx].string = newString;
                            }
                            else {
                                console.warn("note exists in spot not moving", newIdx);
                            }
                        }
                        else {
                            console.warn("Selected note not found in note store", selectedNotes[i], instrumentNotes);
                        }
                    }
                    const new1 = [...instrumentNotes];
                    const new2 = [...selectedNotes]
                    this.setState({ instrumentNotes: new1, selectedNotes: new2 });
                    if (instrument && instrumentNoteIdx !== undefined && insertHeadBeatIdx !== undefined) {
                        ProjectService.saveInstrument(instrument, { notes: new1, tags: instrumentTags }, instrumentNoteIdx);
                    }
                }
                break;
            case keyShortcuts.SELECT_PREV_NOTE:
            case keyShortcuts.SELECT_NEXT_NOTE:
            case keyShortcuts.SELECT_NOTE_ABOVE:
            case keyShortcuts.SELECT_NOTE_BELOW:
                {
                    const { selectedNotes, instrumentNotes } = this.state;
                    const newNotes = [];
                    if (selectedNotes.length === 0) return;
                    for (let i = 0; i < 1; i += 1) {
                        const { startTime, string } = selectedNotes[i];
                        let next: NoteTime | undefined;
                        if (h === keyShortcuts.SELECT_PREV_NOTE) {
                            const cur = instrumentNotes.findIndex(item => item.startTime === startTime && item.string === string);
                            for (let j = cur - 1; j >= 0; j -= 1) {
                                if (instrumentNotes[j].string === string) {
                                    next = instrumentNotes[j];
                                    break;
                                }
                            }
                        }
                        else if (h === keyShortcuts.SELECT_NOTE_ABOVE) {
                            //const cur = instrumentNotes.findIndex(item => item.startTime === startTime && item.string === string);
                            if (string === 0) return;
                            const closest = instrumentNotes.filter(ino => ino.string === string - 1).reduce((prev: NoteTime, curr: NoteTime) => {
                                return (Math.abs(curr.startTime - startTime) < Math.abs(prev.startTime - startTime) ? curr : prev);
                            });
                            //next = instrumentNotes.find(item => item.startTime > startTime && item.string === string - 1);
                            next = closest;
                        }
                        else if (h === keyShortcuts.SELECT_NOTE_BELOW) {
                            const {
                                instrument,
                            } = this.props;
                            if (instrument) {
                                if (string === InstrumentOptions[instrument].strings - 1) return;
                                const closest = instrumentNotes.filter(ino => ino.string === string + 1).reduce((prev: NoteTime, curr: NoteTime) => {
                                    return (Math.abs(curr.startTime - startTime) < Math.abs(prev.startTime - startTime) ? curr : prev);
                                });
                                //next = instrumentNotes.find(item => item.startTime > startTime && item.string === string + 1);
                                next = closest;
                            }
                        }
                        else {
                            next = instrumentNotes.find(item => item.startTime > startTime && item.string === string);
                        }
                        if (next) {
                            selectedNotes.splice(i, 1);
                            newNotes.push(next);
                            const new2 = [...newNotes]
                            this.setState({ selectedNotes: new2 });
                        }
                    }
                }
                break;
            */
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

    highlightNotes = (e: unknown) => {
        //TODO: leave loop if startTime is too far
        const b = e as { args: { startTime: number } };
        const items: HTMLDivElement[] = []
        for (let i = 0; i < this.state.instrumentNotes.length; i += 1) {
            const item = this.state.instrumentNotes[i];
            if (item.startTime === b.args.startTime) {
                const div = this.noteDivRefs[i];
                div.classList.add("note-highlight");
                //div.style.filter = "grayscale(1)";
                div.style.transition = "filter 0.1s"
                //div.style.transitionTimingFunction = "ease-out"
                items.push(div);
            }
        }
        if (items.length > 0) {
            setTimeout(() => {
                items.forEach((div) => {
                    div.classList.remove("note-highlight");
                    //div.style.filter = "unset";
                    div.style.transition = "0s"
                })
            }, 200);
        }
    }

    render = () => {
        this.noteDivRefs = [];
        const cursorString = this.strings[this.state.cursorPosition[0]];
        let cursorTime = 0;
        let cursorPer = 0;
        if (this.state.beats.length > 0) {
            const downBeat = this.state.cursorPosition[1];
            const dnb = this.state.beats;//.filter(i => i.beatNum === "1");
            if (downBeat < dnb.length) {
                cursorTime = parseFloat(dnb[downBeat].start);
                cursorPer = (cursorTime / MediaPlayerService.getDuration()) * (this.props.width) - (NOTE_WIDTH / 2);
            }
        }
        return (
            <HotKeys
                keyMap={this.keyMap}
                handlers={this.handlers}
                style={{
                    width: 100 + '%',
                    height: 100 + '%',
                }}
                id="neck-hotkey"
            >
                <ResizeSensor onResize={() => this.forceUpdate()}>
                    <div
                        //eslint-disable-next-line
                        tabIndex={0}
                        onMouseEnter={this.onNeckMouseEnter}
                        onMouseMove={this.onNeckMouseMove}
                        onMouseLeave={this.onNeckMouseLeave}
                        onWheel={this.onNeckMouseWheel}
                        className="neck"
                        ref={this.neckRef}
                        onBlur={this.onFocusOut}
                        onFocus={this.onFocus}
                        onKeyDown={e => e.preventDefault()}
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
                                            ref={ref => {
                                                if (ref) this.noteDivRefs.push(ref);
                                            }}
                                            data-note-idx={i}
                                            onMouseUp={e => this.onMouseClickNote(e, i)}
                                            key={note.string + "_" + note.fret + "_" + note.startTime}
                                            className={
                                                classNames(
                                                    "note",
                                                    Classes.CARD,
                                                    Classes.ELEVATION_3,
                                                    "number",
                                                    { "note-selected": this.state.selectedNotes.findIndex(p => jsonStringifyCompare(p, note)) !== -1 },
                                                )
                                            }
                                            style={{
                                                //position
                                                textAlign: "center",
                                                background: STRING_COLORS[this.props.settings.getCS()][note.string],
                                                position: "absolute",
                                                transform: `translate(${per}px, ${string.offsetTop - (NOTE_WIDTH / 2)}px)`,
                                            }}
                                        >
                                            {note.fret}
                                        </div>
                                    )
                                })
                            }
                            {
                                this.state.beats.length > 0
                                    ? (
                                        <div
                                            ref={this.cursorNoteRef}
                                            data-note-idx={0}
                                            onMouseUp={() => { }}
                                            key="cursor-note"
                                            className={
                                                classNames("note", Classes.CARD, Classes.ELEVATION_3, "number", "cursor-note", { "blink-cursor": this.state.inFocus })
                                            }
                                            style={{
                                                textAlign: "center",
                                                position: "absolute",
                                                transform: `translate(${cursorPer}px, ${cursorString.offsetTop - (NOTE_WIDTH / 2)}px)`,
                                            }}
                                        />
                                    )
                                    : null
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
                            <span className={classNames("tuning-name", Classes.TEXT_MUTED)}>E</span>
                        </div>
                        <div
                            className="strings-hitbox"
                            onMouseMove={this.onMouseMove}
                            onMouseEnter={this.onMouseEnter}
                            onMouseLeave={this.onMouseLeave}
                            onClick={this.onMouseClick}>
                            <div className="strings" data-string-idx="1" data-string="B" ref={this.addString} />
                            <span className={classNames("tuning-name", Classes.TEXT_MUTED)}>B</span>
                        </div>
                        <div
                            className="strings-hitbox"
                            onMouseMove={this.onMouseMove}
                            onMouseEnter={this.onMouseEnter}
                            onMouseLeave={this.onMouseLeave}
                            onClick={this.onMouseClick}>
                            <div className="strings" data-string-idx="2" data-string="G" ref={this.addString} />
                            <span className={classNames("tuning-name", Classes.TEXT_MUTED)}>G</span>
                        </div>
                        <div
                            className="strings-hitbox"
                            onMouseMove={this.onMouseMove}
                            onMouseEnter={this.onMouseEnter}
                            onMouseLeave={this.onMouseLeave}
                            onClick={this.onMouseClick}>
                            <div className="strings" data-string-idx="3" data-string="D" ref={this.addString} />
                            <span className={classNames("tuning-name", Classes.TEXT_MUTED)}>D</span>
                        </div>
                        <div
                            className="strings-hitbox"
                            onMouseMove={this.onMouseMove}
                            onMouseEnter={this.onMouseEnter}
                            onMouseLeave={this.onMouseLeave}
                            onClick={this.onMouseClick}>
                            <div className="strings" data-string-idx="4" data-string="A" ref={this.addString} />
                            <span className={classNames("tuning-name", Classes.TEXT_MUTED)}>A</span>
                        </div>
                        <div
                            className="strings-hitbox"
                            onMouseMove={this.onMouseMove}
                            onMouseOver={this.onMouseEnter}
                            onMouseOut={this.onMouseLeave}
                            onMouseDown={this.onMouseClick}>
                            <div className="strings" data-string-idx="5" data-string="E" ref={this.addString} />
                            <span className={classNames("tuning-name", Classes.TEXT_MUTED)}>E</span>
                        </div>
                        <div
                            className="strings-extra"
                        />
                    </div>
                </ResizeSensor>
            </HotKeys>
        );
    }
}

export default NoteEditor;
