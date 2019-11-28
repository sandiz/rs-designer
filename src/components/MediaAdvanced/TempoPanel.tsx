import React from 'react';
import {
    Callout, Tag, Intent, Tooltip, Slider,
} from '@blueprintjs/core';
import classNames from 'classnames';
import {
    findTempoMarkings,
} from '../../lib/music-utils';
import { MixerProps } from './MixerTab';
import { TEMPO } from '../../types';
import MediaPlayerService from '../../services/mediaplayer';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';

interface TempoPanelState {
    tempoChange: number;
}

const TEMPO_MIN = TEMPO.MIN;
const TEMPO_MAX = TEMPO.MAX;
const TEMPO_DEFAULT = TEMPO.DEFAULT;
export class TempoPanel extends React.Component<MixerProps, TempoPanelState> {
    private fixSliderHack = false;

    constructor(props: MixerProps) {
        super(props);
        this.state = { tempoChange: TEMPO_DEFAULT }
    }

    private _cur = () => Math.round((this.state.tempoChange / 100) * this.props.metadata.tempo);

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
        this.setState({ tempoChange: MediaPlayerService.getPlaybackRate() * 100 });
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
    }

    mediaReady = () => {
        this.setState({ tempoChange: MediaPlayerService.getPlaybackRate() * 100 });
    }

    handleRelease = (v: number) => {
        //this.setState({ tempoChange: v });
        //MediaPlayerService.changeTempo(v);
    }

    handleChange = (v: number) => {
        if (this.fixSliderHack === false) {
            if (v === TEMPO_MAX || v === TEMPO_MIN) v = TEMPO_DEFAULT;
            this.fixSliderHack = true;
        }
        this.setState({ tempoChange: v });
        MediaPlayerService.changeTempo(v);
    }

    resetTempo = () => {
        this.setState({ tempoChange: TEMPO_DEFAULT });
        MediaPlayerService.changeTempo(TEMPO_DEFAULT);
    }

    render = () => {
        const diff = this._cur() - this.props.metadata.tempo;
        const markings = findTempoMarkings(this._cur());
        const { tempoChange } = this.state;
        const keyMsg = (tempoChange) === 100 ? "" : ((tempoChange >= 100 ? `(${tempoChange}%)` : `(${tempoChange}%)`));
        const cur = this._cur() === 0
            ? <div className="mixer-key-font">n/a</div>
            : <div className="mixer-key-font number">{this._cur()}</div>
        return (
            <React.Fragment>
                <div className="mixer-info">
                    <Callout className="mixer-info-key" icon={false} intent={diff === 0 ? Intent.PRIMARY : Intent.WARNING}>
                        {cur}
                        <div className="mixer-bpm-font">bpm</div>
                        <div className="number">
                            {keyMsg}
                        </div>
                    </Callout>
                    <div className="mixer-chords-container">
                        <Callout className="mixer-tempo-flex">
                            <div className="mixer-chords">
                                <Tooltip>
                                    <Tag large minimal className="mixer-tempo-cat">Category</Tag>
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
                            <div className="mixer-slider">
                                <Tag interactive minimal large className="mixer-tempo-tag" onClick={this.resetTempo}>
                                    {
                                        diff !== 0
                                            ? <span>Reset Tempo</span>
                                            : <span>Change Tempo</span>
                                    }
                                </Tag>
                                <div className="mixer-tempo-slider">
                                    <Slider
                                        stepSize={1}
                                        //disabled={this._cur() === 0}
                                        className={classNames({ warningslider: diff !== 0 })}
                                        min={TEMPO_MIN}
                                        max={TEMPO_MAX}
                                        labelRenderer={false}
                                        labelStepSize={TEMPO_MAX - TEMPO_MIN}
                                        value={this.state.tempoChange}
                                        onChange={this.handleChange}
                                        onRelease={this.handleRelease}
                                    />
                                </div>
                            </div>
                        </Callout>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

export default TempoPanel;
