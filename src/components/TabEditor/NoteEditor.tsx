import React, { RefObject } from 'react';
import classNames from 'classnames';
import { Classes } from '@blueprintjs/core';
import MediaPlayerService from '../../services/mediaplayer';
import ProjectService from '../../services/project';
import { BeatTime, NoteTime } from '../../types';
import './TabEditor.scss';

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
}
interface NoteEditorState {
    beats: BeatTime[];
    notes: NoteTime[];
}
const STRING_COLORS: string[] = [
    "#C137D3",
    "#5BE42A",
    "#E49534",
    "#3093C3",
    "#D0B524",
    "#DB4251",
]
const NOTE_WIDTH = 40; /* see .note css class */
const HOVER_NOTE_TOP_OFFSET = 10;
class NoteEditor extends React.Component<NoteEditorProps, NoteEditorState> {
    private hoverRef: RefObject<HTMLDivElement>;
    private notesRef: RefObject<HTMLDivElement>;
    private neckRef: RefObject<HTMLDivElement>;
    private currentString: HTMLElement | null;
    private strings: HTMLDivElement[];
    constructor(props: NoteEditorProps) {
        super(props);
        this.hoverRef = React.createRef();
        this.notesRef = React.createRef();
        this.neckRef = React.createRef();
        this.state = { beats: [], notes: [] };
        this.currentString = null;
        this.strings = [];
    }

    componentDidMount = async () => {
        const metadata = await ProjectService.getProjectMetadata();
        if (metadata) {
            this.setState({ beats: metadata.beats });
        }
    }

    onMouseEnter = (event: React.MouseEvent) => {
        this.currentString = event.currentTarget.children[0] as HTMLElement
        if (this.hoverRef.current) this.hoverRef.current.style.visibility = "unset";
        const idx = this.currentString.getAttribute("data-idx");
        if (idx) {
            const color = STRING_COLORS[parseInt(idx, 10)];
            if (this.hoverRef.current) this.hoverRef.current.style.backgroundColor = color;
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
                const { notes } = this.state;
                const string = parseInt(this.currentString.getAttribute("data-idx") as string, 10);
                const startTime = parseFloat(closest[1].start);
                const endTime = parseFloat(closest[1].start);
                if (notes.findIndex(i => i.startTime === startTime && i.string === string) !== -1) return;
                notes.push({
                    string,
                    fret: 0,
                    type: "note",
                    startTime,
                    endTime,
                })
                this.setState({ notes });
            }
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
            <div
                onMouseEnter={this.onNeckMouseEnter}
                onMouseMove={this.onNeckMouseMove}
                onMouseLeave={this.onNeckMouseLeave}
                className="neck"
                ref={this.neckRef}
            >
                <div ref={this.notesRef} className="notes-container">
                    {
                        this.state.notes.map((note: NoteTime) => {
                            if (!this.neckRef.current) return null;
                            const string = this.strings[note.string];
                            const per = (note.startTime / MediaPlayerService.getDuration()) * (this.props.width) - (NOTE_WIDTH / 2)
                            return (
                                <div
                                    onClick={console.log}
                                    key={note.string + "_" + note.fret + "_" + note.startTime}
                                    className={classNames("note", Classes.CARD, Classes.ELEVATION_3, Classes.INTERACTIVE, "number")}
                                    style={{
                                        //position
                                        textAlign: "center",
                                        backgroundColor: STRING_COLORS[note.string],
                                        position: "absolute",
                                        transform: `translate(${per}px, ${string.offsetTop - (NOTE_WIDTH / 2) - HOVER_NOTE_TOP_OFFSET}px)`,
                                    }}
                                >
                                    0
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
                    <div className="strings" data-idx="0" data-string="E" ref={this.addString} />
                </div>
                <div
                    className="strings-hitbox"
                    onMouseMove={this.onMouseMove}
                    onMouseEnter={this.onMouseEnter}
                    onMouseLeave={this.onMouseLeave}
                    onClick={this.onMouseClick}>
                    <div className="strings" data-idx="1" data-string="B" ref={this.addString} />
                </div>
                <div
                    className="strings-hitbox"
                    onMouseMove={this.onMouseMove}
                    onMouseEnter={this.onMouseEnter}
                    onMouseLeave={this.onMouseLeave}
                    onClick={this.onMouseClick}>
                    <div className="strings" data-idx="2" data-string="G" ref={this.addString} />
                </div>
                <div
                    className="strings-hitbox"
                    onMouseMove={this.onMouseMove}
                    onMouseEnter={this.onMouseEnter}
                    onMouseLeave={this.onMouseLeave}
                    onClick={this.onMouseClick}>
                    <div className="strings" data-idx="3" data-string="D" ref={this.addString} />
                </div>
                <div
                    className="strings-hitbox"
                    onMouseMove={this.onMouseMove}
                    onMouseEnter={this.onMouseEnter}
                    onMouseLeave={this.onMouseLeave}
                    onClick={this.onMouseClick}>
                    <div className="strings" data-idx="4" data-string="A" ref={this.addString} />
                </div>
                <div
                    className="strings-hitbox"
                    onMouseMove={this.onMouseMove}
                    onMouseOver={this.onMouseEnter}
                    onMouseOut={this.onMouseLeave}
                    onMouseDown={this.onMouseClick}>
                    <div className="strings" data-idx="5" data-string="E" ref={this.addString} />
                </div>
            </div>
        );
    }
}

export default NoteEditor;
