import React from 'react';
import {
    Callout, Tag, Intent, Tooltip, Slider,
} from '@blueprintjs/core';
import classNames from 'classnames';
import {
    findTempoMarkings,
} from '../../lib/music-utils';
import { MixerProps } from './Mixer';

interface TempoPanelState {
    tempoChange: number;
    tempoMin: number;
    tempoMax: number;
}

export class TempoPanel extends React.Component<MixerProps, TempoPanelState> {
    constructor(props: MixerProps) {
        super(props);
        this.state = { tempoChange: 100, tempoMax: 120, tempoMin: 50 }
    }

    private _cur = () => Math.round((this.state.tempoChange / 100) * this.props.metadata.tempo);

    handleChange = (v: number) => {
        this.setState({ tempoChange: v });
    }

    resetTempo = () => this.setState({ tempoChange: 100 });

    render = () => {
        const diff = this._cur() - this.props.metadata.tempo;
        const markings = findTempoMarkings(this._cur());
        const { tempoChange } = this.state;
        const keyMsg = (tempoChange) === 100 ? "" : ((tempoChange >= 100 ? `(${tempoChange}%)` : `(${tempoChange}%)`));
        const cur = this._cur() === 0
            ? (
                <div className="mixer-key-font">n/a</div>
            )
            : (
                <div className="mixer-key-font number">{this._cur()}</div>
            )
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
                            <div className="mixer-chords">
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
                                        disabled={this._cur() === 0}
                                        className={classNames({ warningslider: diff !== 0 })}
                                        min={this.state.tempoMin}
                                        max={this.state.tempoMax}
                                        labelRenderer={false}
                                        value={this.state.tempoChange}
                                        onChange={this.handleChange}
                                        onRelease={this.handleChange}
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
