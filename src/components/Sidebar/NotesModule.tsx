import React from 'react';
import {
    Card, Elevation, Callout, Intent, Collapse,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ProjectDetails } from '../../types/project';
import { NoteTime } from '../../types/musictheory';
import CollapseButton from './CollapseButton';
import './NotesModule.scss';

interface NotesProps {
    project: ProjectDetails;
}

interface NotesState {
    notes: NoteTime[];
    expanded: boolean;
}

class NotesModule extends React.Component<NotesProps, NotesState> {
    constructor(props: NotesProps) {
        super(props);
        this.state = { notes: [], expanded: false };
        console.log(this.state.notes, this.state.expanded);
    }

    componentDidMount = () => {

    }

    render = () => {
        return (
            <Card className="sidebar-card sidebar-audio-track" elevation={Elevation.THREE}>
                <Callout
                    className="card-header"
                    intent={Intent.PRIMARY}
                    icon={IconNames.MUSIC}>
                    Note Editor
                    <CollapseButton parent={this} expanded={this.state.expanded} />
                </Callout>
                <Collapse
                    keepChildrenMounted={false}
                    isOpen={this.state.expanded}
                >
                    <Card className="note-container">
                        test
                    </Card>
                </Collapse>
            </Card>
        )
    }
}

export default NotesModule;
