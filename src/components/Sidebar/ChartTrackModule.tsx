import React from 'react';
import {
    Card, Elevation, Callout, Intent,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ProjectDetails } from '../../types/project';


interface ChartTrackProps {
    project: ProjectDetails;
}

class ChartTrackModule extends React.Component<ChartTrackProps, {}> {
    constructor(props: ChartTrackProps) {
        super(props);
        console.log("asd");
    }

    render = () => {
        return (
            <Card className="sidebar-card sidebar-score-track" elevation={Elevation.THREE}>
                <Callout
                    className="card-header"
                    intent={Intent.PRIMARY}
                    icon={IconNames.ANNOTATION}>
                    Transcription
                    </Callout>
                <br />
                <br />
            </Card>
        );
    }
}

export default ChartTrackModule;
