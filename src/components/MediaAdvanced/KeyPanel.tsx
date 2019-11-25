
import React from 'react';
import {
    Callout, Tag, Switch, Intent, Tooltip, Slider,
} from '@blueprintjs/core';
import classNames from 'classnames';
import {
    getParalleKey, getChordsInKey, getRelativeKey, getUniqueChords,
    countChords, getTransposedKey, getTransposedChords,
} from '../../lib/music-utils';
import { MixerProps } from './Mixer';
import { KEY } from '../../types';
import { DispatchEvents, DispatcherService } from '../../services/dispatcher';
import MediaPlayerService from '../../services/mediaplayer';

interface KeyPanelState {
    keyChange: number;
}

const KEY_MIN = KEY.MIN;
const KEY_MAX = KEY.MAX;
const KEY_DEFAULT = KEY.DEFAULT;

export class KeyPanel extends React.Component<MixerProps, KeyPanelState> {
    private minKey = KEY_MIN;
    private maxKey = KEY_MAX;
    private diff = 0;//12;
    private fixSliderHack = false;

    constructor(props: MixerProps) {
        super(props);
        this.state = { keyChange: KEY_DEFAULT + this.diff };
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
        console.log(MediaPlayerService.getPitchSemitones());
        this.setState({ keyChange: MediaPlayerService.getPitchSemitones() });
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
    }

    mediaReady = () => {
        this.setState({ keyChange: MediaPlayerService.getPitchSemitones() });
    }

    handleRelease = (v: number) => {
        this.setState({ keyChange: v });
        MediaPlayerService.changePitchSemitones(v);
    }

    handleChange = (v: number) => {
        if (this.fixSliderHack === false) {
            if (v === this.minKey || v === this.maxKey) v = 0;
            this.fixSliderHack = true;
        }
        this.setState({ keyChange: v });
        MediaPlayerService.changePitchSemitones(v);
    }

    resetKey = () => this.setState({ keyChange: 0 });

    render = () => {
        const props = this.props;
        const mKey = props.metadata.key[0];
        const kcdiff = this.state.keyChange - this.diff;
        const currentKey = getTransposedKey(props.metadata.key[0], this.state.keyChange - this.diff);
        const keyMsg = (kcdiff) === 0 ? currentKey : ((kcdiff > 0 ? `+${kcdiff}` : `${kcdiff}`));
        const currentChords = getTransposedChords(props.metadata.chords, this.state.keyChange - this.diff);

        const keyTonality = props.metadata.key[1];
        const parallelKey = getParalleKey(currentKey, keyTonality);
        const relativeKey = getRelativeKey(currentKey, keyTonality);

        const parallelChords = getChordsInKey(parallelKey[0], parallelKey[1]);
        const keyChords = getChordsInKey(currentKey, keyTonality);
        const unique = getUniqueChords(currentChords);
        return (
            <React.Fragment>
                <div className="mixer-info">
                    <Callout className="mixer-info-key" icon={false} intent={kcdiff === 0 ? Intent.PRIMARY : Intent.WARNING}>
                        <div className="mixer-key-font">{mKey === '-' ? "n/a" : currentKey}</div>
                        <div className="mixer-tonality-font">{keyTonality === '-' ? "" : keyTonality.toLowerCase()}</div>
                        {
                            kcdiff !== 0
                                ? <div className="number">({keyMsg})</div>
                                : null
                        }
                    </Callout>
                    <div className="mixer-chords-container">
                        <Callout className="mixer-chords-flex">
                            <div className="mixer-chords">
                                <Tooltip>
                                    <Tag large minimal>Relative Key</Tag>
                                </Tooltip>
                                {
                                    mKey === '-'
                                        ? null
                                        : <Tag interactive large>{relativeKey.join(" ")}</Tag>
                                }
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
                                                    <span className="number">used {countChords(item, currentChords)} times</span>
                                                )}>
                                                <Tag large intent={unique.includes(item) ? (kcdiff === 0 ? Intent.PRIMARY : Intent.WARNING) : Intent.NONE} interactive>{item}</Tag>
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
                                                    <span className="number">used {countChords(item, currentChords)} times</span>
                                                )}>
                                                <Tag large intent={unique.includes(item) ? (kcdiff === 0 ? Intent.PRIMARY : Intent.WARNING) : Intent.NONE} interactive>{item}</Tag>
                                            </Tooltip>
                                        );
                                    })
                                }
                            </div>
                            <div className="mixer-slider">
                                <Tag minimal interactive large className="mixer-key-tag" onClick={this.resetKey}>
                                    {
                                        kcdiff !== 0
                                            ? <span>Reset Key</span>
                                            : <span>Change Key</span>
                                    }
                                </Tag>
                                <div className="mixer-key-slider">
                                    <Slider
                                        className={classNames({ warningslider: kcdiff !== 0 })}
                                        stepSize={1}
                                        min={this.minKey}
                                        max={this.maxKey}
                                        labelStepSize={24}
                                        labelRenderer={false}
                                        value={this.state.keyChange}
                                        onChange={this.handleChange}
                                        onRelease={this.handleRelease}
                                        disabled={mKey === '-'}
                                    />
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
}

export default KeyPanel;
