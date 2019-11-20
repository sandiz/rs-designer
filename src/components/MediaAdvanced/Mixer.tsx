import React, { FunctionComponent } from 'react';
import {
    Card, Elevation, Callout, Tag, Slider, Switch,
} from '@blueprintjs/core';

export const Mixer: FunctionComponent<{}> = (props: {}) => (
    <div className="mixer">
        <div className="mixer-root">
            <div className="mixer-left">
                <Card elevation={Elevation.TWO} className="mixer-panel key-panel"><KeyPanel /></Card>
                <Card elevation={Elevation.TWO} className="mixer-panel tempo-panel"><TempoPanel /></Card>
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
            <Callout className="mixer-info-key" icon={false}>
                <div className="mixer-key-font">F</div>
                <div className="mixer-tonality-font">minor</div>
            </Callout>
            <div className="mixer-chords-container">
                <Callout className="mixer-chords-flex">
                    <div className="mixer-chords">
                        <Tag large minimal interactive>Key Chords</Tag>
                        <Tag large minimal interactive>E</Tag>
                        <Tag large minimal interactive>F#m</Tag>
                        <Tag large minimal interactive>G#m</Tag>
                        <Tag large minimal interactive>A</Tag>
                        <Tag large minimal interactive>B</Tag>
                        <Tag large minimal interactive>C#m</Tag>
                        <Tag large minimal interactive>D#dim</Tag>
                    </div>
                    <div className="mixer-chords">
                        <Tag large minimal interactive>Relative Chords</Tag>
                        <Tag large minimal interactive>E</Tag>
                        <Tag large minimal interactive>F#m</Tag>
                        <Tag large minimal interactive>G#m</Tag>
                        <Tag large minimal interactive>A</Tag>
                        <Tag large minimal interactive>B</Tag>
                        <Tag large minimal interactive>C#m</Tag>
                        <Tag large minimal interactive>D#dim</Tag>
                    </div>
                    <div className="mixer-chords">
                        <Tag large minimal interactive>Parallel Chords</Tag>
                        <Tag large minimal interactive>E</Tag>
                        <Tag large minimal interactive>F#m</Tag>
                        <Tag large minimal interactive>G#m</Tag>
                        <Tag large minimal interactive>A</Tag>
                        <Tag large minimal interactive>B</Tag>
                        <Tag large minimal interactive>C#m</Tag>
                        <Tag large minimal interactive>D#dim</Tag>
                    </div>
                    <div className="mixer-chords">
                        <Tag large minimal interactive className="mixer-key-tag">Change Key</Tag>
                        <div className="mixer-key-slider">
                            <Slider min={0} max={10} labelRenderer={false} value={5} />
                        </div>
                        <div className="mixer-key-switch">
                            <Switch inline label="Transpose" style={{ margin: 'auto' }} />
                        </div>
                    </div>
                </Callout>
            </div>
        </div>
    </React.Fragment>
);

export const TempoPanel: FunctionComponent<{}> = (props: {}) => (
    <React.Fragment>
        <div className="mixer-info">
            <Callout className="mixer-info-key" icon={false}>
                <div className="mixer-key-font number">120</div>
                <div className="mixer-bpm-font">bpm</div>
            </Callout>
            <div className="mixer-chords-container">
                <Callout className="mixer-tempo-flex">
                    <div className="mixer-tempo-list">
                        <Tag large minimal interactive className="mixer-tempo-cat">Markings</Tag>
                        <Tag large minimal interactive className="mixer-tempo-cat">adagio</Tag>
                        <Tag large minimal interactive>rubato</Tag>
                    </div>
                    <div className="mixer-chords">
                        <Tag large minimal interactive className="mixer-tempo-tag">Change Tempo</Tag>
                        <div className="mixer-tempo-slider">
                            <Slider min={0} max={10} labelRenderer={false} value={5} />
                        </div>
                    </div>
                </Callout>
            </div>
        </div>
    </React.Fragment>
);

export default {};
