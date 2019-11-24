import React, { FunctionComponent } from 'react';
import {
    Card, Elevation,
} from '@blueprintjs/core';
import {
    ProjectMetadata,
} from '../../types';

const EqualizerPanel = React.lazy(() => import("./EQPanel"));
const TempoPanel = React.lazy(() => import("./TempoPanel"));
const KeyPanel = React.lazy(() => import("./KeyPanel"));

export interface MixerProps {
    metadata: ProjectMetadata;
    style?: React.CSSProperties;
}

export const Mixer: FunctionComponent<MixerProps> = (props: MixerProps) => (
    <div key="mixer" className="mixer" style={props.style}>
        <div key="mixer-root" className="mixer-root">
            <div key="left" className="mixer-left">
                <Card key="key-panel" elevation={Elevation.TWO} className="mixer-panel key-panel">
                    <KeyPanel key="key" metadata={props.metadata} />
                </Card>
                <Card key="tempo-panel" elevation={Elevation.TWO} className="mixer-panel tempo-panel">
                    <TempoPanel key="tempo" metadata={props.metadata} />
                </Card>
            </div>
            <div key="right" className="mixer-right">
                <Card key="eq-panel" elevation={Elevation.TWO} className="mixer-panel eq-panel">
                    <EqualizerPanel key="eq" metadata={props.metadata} />
                </Card>
            </div>
        </div>
    </div>
);

export default Mixer;
