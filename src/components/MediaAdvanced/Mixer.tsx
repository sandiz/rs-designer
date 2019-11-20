import React, { FunctionComponent } from 'react'
import {
    Card, Elevation, Callout,
} from '@blueprintjs/core'

export const Mixer: FunctionComponent<{}> = (props: {}) => (
    <div className="mixer">
        <div className="mixer-root">
            <div className="mixer-left">
                <Card elevation={Elevation.ZERO} className="mixer-panel"><KeyPanel /></Card>
                <Card elevation={Elevation.ZERO} className="mixer-panel"><TempoPanel /></Card>
            </div>
            <div className="mixer-right">
                <Card elevation={Elevation.ZERO} className="mixer-panel"> Equalizer</Card>
            </div>
        </div>
    </div>
);

export const KeyPanel: FunctionComponent<{}> = (props: {}) => (
    <React.Fragment>
        <div className="mixer-info">
            <div className="mixer-info-details">Key</div>
            <Callout className="mixer-info-key" icon={false}>
                <div className="mixer-key-font">F</div>
                <div className="mixer-tonality-font">minor</div>
            </Callout>
        </div>
    </React.Fragment>
);

export const TempoPanel: FunctionComponent<{}> = (props: {}) => (
    <React.Fragment>
        <div className="mixer-info">
            <div className="mixer-info-details">Tempo</div>
            <Callout className="mixer-info-key" icon={false}>
                <div className="mixer-key-font mixer-bpm">120</div>
                <div className="mixer-tonality-font">bpm</div>
            </Callout>
        </div>
    </React.Fragment>
);

export default {};
