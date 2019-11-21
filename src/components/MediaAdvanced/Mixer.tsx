import React, { FunctionComponent, RefObject } from 'react';
import {
    Card, Elevation, Callout, Tag, Switch, Intent, Tooltip,
} from '@blueprintjs/core';
import classNames from 'classnames';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { ProjectMetadata } from '../../types';
import {
    getParalleKey, getChordsInKey, getRelativeKey, getUniqueChords, findTempoMarkings, countChords, getTransposedKey, getTransposedChords,
} from '../../lib/music-utils';
import SliderExtended from '../Extended/FadeoutSlider';
import MediaPlayerService from '../../services/mediaplayer';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';

interface MixerProps {
    metadata: ProjectMetadata;
    style?: React.CSSProperties;
}

interface KeyPanelState {
    keyChange: number;
}

interface TempoPanelState {
    tempoChange: number;
    tempoMin: number;
    tempoMax: number;
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

export class KeyPanel extends React.Component<MixerProps, KeyPanelState> {
    private minKey = 0;
    private maxKey = 23;
    private diff = 12;

    constructor(props: MixerProps) {
        super(props);
        this.state = { keyChange: 0 + this.diff };
    }

    handleChange = (v: number) => {
        this.setState({ keyChange: v });
    }

    resetKey = () => this.setState({ keyChange: 0 + this.diff });

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
                            <div className="mixer-chords">
                                <Tag interactive large minimal className="mixer-key-tag" onClick={this.resetKey}>Change Key</Tag>
                                <div className="mixer-key-slider">
                                    <SliderExtended
                                        className={classNames({ warningslider: kcdiff !== 0 })}
                                        stepSize={1}
                                        min={this.minKey}
                                        max={this.maxKey}
                                        labelRenderer={false}
                                        value={this.state.keyChange}
                                        dragStart={this.handleChange}
                                        dragEnd={this.handleChange}
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
                <div className="mixer-key-font">{this._cur()}</div>
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
                                <Tag large minimal interactive className="mixer-tempo-tag" onClick={this.resetTempo}>Change Tempo</Tag>
                                <div className="mixer-tempo-slider">
                                    <SliderExtended
                                        stepSize={1}
                                        disabled={this._cur() === 0}
                                        className={classNames({ warningslider: diff !== 0 })}
                                        min={this.state.tempoMin}
                                        max={this.state.tempoMax}
                                        labelRenderer={false}
                                        value={this.state.tempoChange}
                                        dragStart={this.handleChange}
                                        dragEnd={this.handleChange}
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

interface EqualizerState {
    eqsLoaded: string[];
    errorMsg: React.ReactNode | null;
}
export class EqualizerPanel extends React.Component<MixerProps, EqualizerState> {
    private canvasRef: RefObject<Callout> = React.createRef();
    //eslint-disable-next-line
    private audioMotion: any | null = null;
    constructor(props: MixerProps) {
        super(props);
        this.state = { eqsLoaded: [], errorMsg: null };
        console.log(this.state.eqsLoaded);
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReady);
        if (MediaPlayerService.isActive()) this.mediaReady();
        console.log("eq panel mount")
    }

    mediaReady = () => {
        try {
            this.audioMotion = new AudioMotionAnalyzer(
                document.getElementById("container"),
                {
                    showFPS: false,
                    loRes: true,
                    start: true,
                    width: undefined,
                    showPeaks: false,
                    showScale: true,
                    audioCtx: MediaPlayerService.getAudioContext(),
                    analyzer: MediaPlayerService.getPostAnalyzer(),
                    ///onCanvasDraw: displayCanvasMsg
                },
            );
        }
        catch (err) {
            if (this.canvasRef.current) {
                this.setState({ errorMsg: <div>audioMotion failed with error: <em>{err.toString()}</em></div> })
                console.log("audioMotion error: " + err);
            }
        }
    }

    mediaReset = () => {
        this.audioMotion = null;
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReady);
        console.log("eq panel dismount")
    }

    render = () => {
        return (
            <React.Fragment>
                <div className="mixer-eq">
                    <div className="mixer-eq-top">
                        <Callout className="mixer-eq-list" icon={false} intent={Intent.PRIMARY}>
                            <div className="mixer-key-font">EQ</div>
                            <div className="">
                                <Switch>Active</Switch>
                            </div>
                        </Callout>
                        <Callout className="mixer-eq-tags">
                            test
                        </Callout>
                    </div>
                    <Callout className="mixer-eq-container" id="container" ref={this.canvasRef}>
                        {this.state.errorMsg}
                    </Callout>
                </div>
            </React.Fragment>
        )
    }
}

export default {};
