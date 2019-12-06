import React, { RefObject } from 'react';

import './TabEditor.scss';
import MediaPlayerService from '../../services/mediaplayer';
import ProjectService from '../../services/project';
import { BeatTime } from '../../types';

export function snapToGrid(x: number, rect: DOMRect, offset: number, beats: BeatTime[]) {
    const duration = MediaPlayerService.getDuration();
    const time = ((x + offset) / rect.width) * duration;
    if (beats.length > 0) {
        const closest = beats.reduce((prev: BeatTime, curr: BeatTime) => {
            return (Math.abs(parseFloat(curr.start) - time) < Math.abs(parseFloat(prev.start) - time) ? curr : prev);
        });
        return ((parseFloat(closest.start) / duration) * rect.width) - offset;
    }
    return x;
}

interface NoteEditorState {
    beats: BeatTime[];
}
class NoteEditor extends React.Component<{}, NoteEditorState> {
    private hoverRef: RefObject<HTMLDivElement>;
    private currentString: HTMLElement | null;
    constructor(props: {}) {
        super(props);
        this.hoverRef = React.createRef();
        this.state = { beats: [] };
        this.currentString = null;
    }

    componentDidMount = async () => {
        const metadata = await ProjectService.getProjectMetadata();
        if (metadata) {
            this.setState({ beats: metadata.beats });
        }
    }

    onMouseEnter = (event: React.MouseEvent) => {
        this.currentString = event.currentTarget as HTMLElement
        if (this.hoverRef.current) this.hoverRef.current.style.visibility = "unset";
    }
    onMouseMove = () => {
    }
    onMouseLeave = () => {
        this.currentString = null;
        if (this.hoverRef.current) this.hoverRef.current.style.visibility = "hidden";
    }
    onMouseDown = () => { }
    onMouseUp = () => { }

    onNeckMouseMove = (event: React.MouseEvent) => {
        if (this.hoverRef.current) {
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const hr = this.hoverRef.current.getBoundingClientRect();
            let x = event.clientX - (rect.left) - (hr.width / 2) //x position within the element.
            const y = event.clientY - (rect.top) - (hr.height / 2);  //y position within the element.
            x = snapToGrid(x, rect, hr.width / 2, this.state.beats);
            if (this.currentString) {
                this.hoverRef.current.style.transform = `translate(${x}px,${this.currentString.offsetTop - (hr.height - 10)}px)`;
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
            x = snapToGrid(x, rect, hr.width / 2, this.state.beats);
            this.hoverRef.current.style.transform = `translate(${x}px,${y}px)`
        }
    }

    onNeckMouseLeave = () => {
    }

    render = () => {
        return (
            <div
                onMouseEnter={this.onNeckMouseEnter}
                onMouseMove={this.onNeckMouseMove}
                onMouseLeave={this.onNeckMouseLeave}
                className="neck">
                <div ref={this.hoverRef} className="hover-note" />
                <div
                    onMouseMove={this.onMouseMove}
                    onMouseEnter={this.onMouseEnter}
                    onMouseLeave={this.onMouseLeave}
                    onMouseDown={this.onMouseDown}
                    className="strings strings-first" />
                <div
                    onMouseMove={this.onMouseMove}
                    onMouseEnter={this.onMouseEnter}
                    onMouseLeave={this.onMouseLeave}
                    onMouseDown={this.onMouseDown}
                    className="strings" />
                <div
                    onMouseMove={this.onMouseMove}
                    onMouseEnter={this.onMouseEnter}
                    onMouseLeave={this.onMouseLeave}
                    onMouseDown={this.onMouseDown}
                    className="strings" />
                <div
                    onMouseMove={this.onMouseMove}
                    onMouseEnter={this.onMouseEnter}
                    onMouseLeave={this.onMouseLeave}
                    onMouseDown={this.onMouseDown}
                    className="strings" />
                <div
                    onMouseMove={this.onMouseMove}
                    onMouseEnter={this.onMouseEnter}
                    onMouseLeave={this.onMouseLeave}
                    onMouseDown={this.onMouseDown}
                    className="strings" />
                <div
                    onMouseMove={this.onMouseMove}
                    onMouseOver={this.onMouseEnter}
                    onMouseOut={this.onMouseLeave}
                    onMouseDown={this.onMouseDown}
                    className="strings" />
            </div>
        );
    }
}

export default NoteEditor;
