import React, { RefObject } from 'react';
import classNames from 'classnames';
import { Classes, ResizeSensor } from '@blueprintjs/core';
import Selection from '@simonwep/selection-js';
import MediaPlayerService from '../../services/mediaplayer';
import ProjectService from '../../services/project';
import {
    BeatTime, NoteTime, Instrument, InstrumentNotesInMem,
} from '../../types';
import './TabEditor.scss';
import { jsonStringifyCompare } from '../../lib/utils';

export function snapToGrid(x: number, rect: DOMRect, offset: number, beats: BeatTime[]): [number, BeatTime] {
    const duration = MediaPlayerService.getDuration();
    const time = ((x + offset) / rect.width) * duration;
    if (beats.length > 0) {
        const closest = beats.reduce((prev: BeatTime, curr: BeatTime) => {
            return (Math.abs(parseFloat(curr.start) - time) < Math.abs(parseFloat(prev.start) - time) ? curr : prev);
        });
        return [((parseFloat(closest.start) / duration) * rect.width) - offset, closest];
    }
    const beat: BeatTime = { start: "0", beatNum: "0" };
    return [x, beat];
}
interface NoteEditorProps {
    width: number;
    instrument?: Instrument;
    instrumentNotes?: InstrumentNotesInMem;
    instrumentNoteIdx?: number;
}
interface NoteEditorState {
    beats: BeatTime[];
    instrumentNotes: InstrumentNotesInMem;
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
class NoteEditor extends React.Component<NoteEditorProps, NoteEditorState> {
    private hoverRef: RefObject<HTMLDivElement>;
    private notesRef: RefObject<HTMLDivElement>;
    private neckRef: RefObject<HTMLDivElement>;
    private currentString: HTMLElement | null;
    private strings: HTMLDivElement[];
    private selection: Selection | null = null;;
    constructor(props: NoteEditorProps) {
        super(props);
        this.hoverRef = React.createRef();
        this.notesRef = React.createRef();
        this.neckRef = React.createRef();
        this.state = {
            beats: [],
            instrumentNotes: props.instrumentNotes ? props.instrumentNotes : { notes: [], tags: [] },
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
                        const note = this.state.instrumentNotes.notes[idx];
                        selectedNotes.push(note);
                    }
                }

                for (let i = 0; i < removed.length; i += 1) {
                    const el = removed[i];
                    const attrib = el.getAttribute("data-note-idx");
                    if (attrib) {
                        const idx = parseInt(attrib, 10);
                        const note = this.state.instrumentNotes.notes[idx];
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

    static getDerivedStateFromProps(props: NoteEditorProps, state: NoteEditorState) {
        if (JSON.stringify(state.instrumentNotes) !== JSON.stringify(props.instrumentNotes)) {
            return {
                instrumentNotes: props.instrumentNotes ? props.instrumentNotes : { notes: [], tags: [] },
            }
        }
        return null;
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
        if (this.hoverRef.current) {
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
                    const { notes } = instrumentNotes;
                    const string = parseInt(this.currentString.getAttribute("data-string-idx") as string, 10);
                    const startTime = parseFloat(closest[1].start);
                    const endTime = parseFloat(closest[1].start);
                    // if a note is already there
                    const idx = notes.findIndex(i => i.startTime === startTime && i.string === string)
                    if (idx !== -1) {
                        return;
                    }
                    else {
                        notes.push({
                            string,
                            fret: 0,
                            type: "note",
                            startTime,
                            endTime,
                        })
                    }
                    instrumentNotes.notes = notes;
                    this.setState({ instrumentNotes });
                    ProjectService.saveInstrument(instrument, instrumentNotes, instrumentNoteIdx);
                }
            }
        }
    }

    onMouseClickNote = (event: React.MouseEvent, idx: number) => {
        const {
            instrumentNotes,
        } = this.state;
        let {
            selectedNotes,
        } = this.state;
        const {
            instrument, instrumentNoteIdx,
        } = this.props;

        const { notes } = instrumentNotes;
        if (notes && instrument && instrumentNoteIdx !== undefined) {
            if (event.button === 2) {
                // delete
                notes.splice(idx, 1);
                selectedNotes = [];
            }
            else {
                const sidx = this.state.selectedNotes.findIndex(p => jsonStringifyCompare(p, notes[idx]));
                if (sidx !== -1) selectedNotes.splice(sidx, 1);
                else {
                    if (event.shiftKey) selectedNotes.push(notes[idx]);
                    else selectedNotes = [notes[idx]];
                }
            }
            instrumentNotes.notes = notes;
            this.setState({ instrumentNotes, selectedNotes });
            ProjectService.saveInstrument(instrument, instrumentNotes, instrumentNoteIdx);
        }
    }

    onNeckMouseMove = (event: React.MouseEvent) => {
        if (this.hoverRef.current) {
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const hr = this.hoverRef.current.getBoundingClientRect();
            let x = event.clientX - (rect.left) - (hr.width / 2);
            const y = event.clientY - (rect.top) - (hr.height / 2);
            const closest = snapToGrid(x, rect, hr.width / 2, this.state.beats);
            x = closest[0]
            if (this.currentString) {
                this.hoverRef.current.style.transform = `translate(${x}px,${this.currentString.offsetTop - (hr.height - HOVER_NOTE_TOP_OFFSET)}px)`;
            }
            else this.hoverRef.current.style.transform = `translate(${x}px,${y}px)`;
        }
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

    render = () => {
        return (
            <ResizeSensor onResize={() => this.forceUpdate()}>
                <div
                    onMouseEnter={this.onNeckMouseEnter}
                    onMouseMove={this.onNeckMouseMove}
                    onMouseLeave={this.onNeckMouseLeave}
                    className="neck"
                    ref={this.neckRef}
                >
                    <div ref={this.notesRef} className="notes-container">
                        {
                            this.state.instrumentNotes.notes.map((note: NoteTime, idx: number) => {
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
        );
    }
}

export default NoteEditor;
