import React from 'react';
import {
    Card, Elevation, Callout, Intent,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ProjectDetails } from '../../types/project';

interface NotesProps {
    project: ProjectDetails;
}

class NotesModule extends React.Component<NotesProps, {}> {
    constructor(props: NotesProps) {
        super(props);
        console.log("NotesModule");
    }

    render = () => {
        return (
            <Card className="sidebar-card sidebar-audio-track" elevation={Elevation.THREE}>
                <Callout
                    className="card-header"
                    intent={Intent.PRIMARY}
                    icon={IconNames.MUSIC}>
                    Notes Toolbox
                </Callout>
            </Card>
        )
    }
}

export default NotesModule;
