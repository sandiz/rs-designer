import React, { FunctionComponent } from 'react';
import {
    Card, Elevation, Callout, Tag, Slider, Switch, Intent, Tooltip,
} from '@blueprintjs/core';
import { ProjectMetadata } from '../../types';
import {
    getParalleKey, getChordsInKey, getRelativeKey, getUniqueChords, findTempoMarkings, countChords,
} from '../../lib/music-utils';

interface MixerProps {
    metadata: ProjectMetadata;
}

export const Mixer: FunctionComponent<MixerProps> = (props: MixerProps) => (
    <div className="mixer">
        <div className="mixer-root">
            <div className="mixer-left">
                <Card elevation={Elevation.TWO} className="mixer-panel key-panel"><KeyPanel metadata={props.metadata} /></Card>
                <Card elevation={Elevation.TWO} className="mixer-panel tempo-panel"><TempoPanel metadata={props.metadata} /></Card>
            </div>
            <div className="mixer-right">
                <Card elevation={Elevation.ZERO} className="mixer-panel"> Equalizer</Card>
            </div>
        </div>
    </div>
);

export const KeyPanel: FunctionComponent<MixerProps> = (props: MixerProps) => {
    const currentKey = props.metadata.key[0];
    const keyTonality = props.metadata.key[1];
    const parallelKey = getParalleKey(currentKey, keyTonality);
    const relativeKey = getRelativeKey(currentKey, keyTonality);

    const parallelChords = getChordsInKey(parallelKey[0], parallelKey[1])
    const keyChords = getChordsInKey(currentKey, keyTonality);
    const unique = getUniqueChords(props.metadata.chords);
    return (
        <React.Fragment>
            <div className="mixer-info">
                <Callout className="mixer-info-key" icon={false} intent={Intent.PRIMARY}>
                    <div className="mixer-key-font">{props.metadata.key[0]}</div>
                    <div className="mixer-tonality-font">{props.metadata.key[1].toLowerCase()}</div>
                </Callout>
                <div className="mixer-chords-container">
                    <Callout className="mixer-chords-flex">
                        <div className="mixer-chords">
                            <Tooltip>
                                <Tag large minimal>Relative Key</Tag>
                            </Tooltip>
                            <Tag interactive large>{relativeKey.join(" ")}</Tag>
                        </div>
                        <div className="mixer-chords">
                            <Tooltip>
                                <Tag large minimal>Key Chords</Tag>
                            </Tooltip>
                            {
                                keyChords.map((item) => {
                                    return (
                                        <Tooltip
                                            key={item}
                                            content={(
                                                <span className="number">used {countChords(item, props.metadata.chords)} times</span>
                                            )}>
                                            <Tag large intent={unique.includes(item) ? Intent.PRIMARY : Intent.NONE} interactive>{item}</Tag>
                                        </Tooltip>
                                    );
                                })
                            }
                        </div>
                        <div className="mixer-chords">
                            <Tooltip>
                                <Tag large minimal>Parallel Chords</Tag>
                            </Tooltip>
                            {
                                parallelChords.map((item) => {
                                    return (
                                        <Tooltip
                                            key={item}
                                            content={(
                                                <span className="number">used {countChords(item, props.metadata.chords)} times</span>
                                            )}>
                                            <Tag large intent={unique.includes(item) ? Intent.PRIMARY : Intent.NONE} interactive>{item}</Tag>
                                        </Tooltip>
                                    );
                                })
                            }
                        </div>
                        <div className="mixer-chords">
                            <Tag large minimal className="mixer-key-tag">Change Key</Tag>
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
}

export const TempoPanel: FunctionComponent<MixerProps> = (props: MixerProps) => {
    const markings = findTempoMarkings(props.metadata.tempo);
    return (
        <React.Fragment>
            <div className="mixer-info">
                <Callout className="mixer-info-key" icon={false} intent={Intent.PRIMARY}>
                    <div className="mixer-key-font number">{props.metadata.tempo}</div>
                    <div className="mixer-bpm-font">bpm</div>
                </Callout>
                <div className="mixer-chords-container">
                    <Callout className="mixer-tempo-flex">
                        <div className="mixer-chords">
                            <Tooltip>
                                <Tag large minimal interactive className="mixer-tempo-cat">Category</Tag>
                            </Tooltip>
                            {
                                markings.map((mark) => {
                                    return (
                                        <Tooltip
                                            key={mark[0]}
                                            className="mixer-tempo-tooltip mixer-tempo-cat"
                                            content={(
                                                <span className="number">
                                                    {`${mark[1].tag} (${mark[1].min} - ${mark[1].max}) bpm`}
                                                </span>
                                            )}>
                                            <Tag large interactive>{mark[0]}</Tag>
                                        </Tooltip>
                                    )
                                })
                            }
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
}

export default {};
