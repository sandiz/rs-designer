import React, { FunctionComponent, RefObject } from 'react';
import {
    Card, Elevation, Callout, Tag, Switch, Intent, Tooltip,
    NonIdealState, Popover, H4, Classes, Slider, HTMLSelect, FormGroup,
} from '@blueprintjs/core';
import classNames from 'classnames';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { IconNames } from '@blueprintjs/icons';
import { ProjectMetadata, EQTag, BiQuadFilterNames } from '../../types';
import {
    getParalleKey, getChordsInKey, getRelativeKey, getUniqueChords, findTempoMarkings, countChords, getTransposedKey, getTransposedChords,
} from '../../lib/music-utils';
import MediaPlayerService from '../../services/mediaplayer';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import { setStateAsync, UUID } from '../../lib/utils';
import ProjectService from '../../services/project';
import { drawEQTags } from './EQRenderer';

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

    resetKey = () => this.setState({ keyChange: 12 });

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
                                        labelRenderer={false}
                                        value={this.state.keyChange}
                                        onChange={this.handleChange}
                                        onRelease={this.handleChange}
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

interface EqualizerState {
    enableSpectrum: boolean;
    errorMsg: React.ReactNode | null;
    tags: EQTag[];
}
export class EqualizerPanel extends React.Component<MixerProps, EqualizerState> {
    static MAX_TAGS = 8;
    private canvasRef: RefObject<Callout> = React.createRef();
    //eslint-disable-next-line
    private audioMotion: any | null = null;
    constructor(props: MixerProps) {
        super(props);
        this.state = { enableSpectrum: false, errorMsg: null, tags: [] };
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReset);
    }

    componentWillUnmount = () => {
        ProjectService.saveLastEQTags(this.state.tags);
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReset);
        this.endSpectrum();
    }

    mediaReset = () => {
        this.endSpectrum();
    }

    initAudioMotion = () => {
        try {
            this.audioMotion = new AudioMotionAnalyzer(
                document.getElementById("container"),
                {
                    showFPS: false,
                    showLogo: true,
                    loRes: true,
                    start: true,
                    width: undefined,
                    showPeaks: false,
                    showScale: true,
                    audioCtx: MediaPlayerService.getAudioContext(),
                    analyzer: MediaPlayerService.getPostAnalyzer(),
                    onCanvasDraw: (instance: unknown) => {
                        //displayCanvasMsg(instance);
                        drawEQTags(instance, this.state.tags);
                    },
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

    componentDidUpdate = () => {
        if (this.state.enableSpectrum && this.audioMotion == null) {
            this.initAudioMotion();
        }
    }

    startSpectrum = async () => {
        setStateAsync(this, { enableSpectrum: true });
    }

    endSpectrum = () => {
        if (this.audioMotion) {
            this.audioMotion.toggleAnalyzer(false);
            this.audioMotion = null;
        }
        this.setState({ enableSpectrum: false });
    }

    addTag = () => {
        const t: EQTag = {
            freq: 0, gain: 0, q: 1, type: "edit", id: UUID(),
        };
        const { tags } = this.state;
        if (tags.length < EqualizerPanel.MAX_TAGS) {
            tags.unshift(t);
            this.setState({ tags });
        }
    }

    removeTag = (id: string) => {
        const { tags } = this.state;
        for (let i = 0; i < tags.length; i += 1) {
            if (tags[i].id === id) {
                tags.splice(i, 1);
                break;
            }
        }
        this.setState({ tags });
    }

    onChangeFilterType = (item: EQTag, event: React.ChangeEvent<HTMLSelectElement>) => {
        const { tags } = this.state;
        for (let i = 0; i < tags.length; i += 1) {
            if (tags[i].id === item.id) {
                tags[i].type = event.target.value as BiquadFilterType;
            }
        }
        this.setState({ tags });
    }

    onChangeQGainType = (type: string, item: EQTag, v: number) => {
        const { tags } = this.state;
        for (let i = 0; i < tags.length; i += 1) {
            if (tags[i].id === item.id) {
                if (type === "gain") tags[i].gain = v;
                else if (type === "q") tags[i].q = v;
                else if (type === "freq") tags[i].freq = v;
            }
        }
        this.setState({ tags });
    }

    getTagDialog = (item: EQTag): string | JSX.Element | undefined => {
        const isQ = ["lowpass", "highpass", "bandpass", "notch", "allpass"].includes(item.type);
        const isG = ["lowshelf", "highshelf", "peaking"].includes(item.type)
        return (
            <div className="eq-edit">
                <H4 className="font-weight-unset">Edit Filter</H4>
                <FormGroup inline label="Filter Type">
                    <HTMLSelect onChange={v => this.onChangeFilterType(item, v)} value={item.type}>
                        <option value="lowpass">lowpass</option>
                        <option value="highpass">highpass</option>
                        <option value="bandpass">bandpass</option>
                        <option value="lowshelf">lowshelf</option>
                        <option value="highshelf">highshelf</option>
                        <option value="peaking">peaking</option>
                        <option value="notch">notch</option>
                        <option value="allpass">allpass</option>
                        <option value="edit">disabled</option>
                    </HTMLSelect>
                </FormGroup>
                {
                    item.type === "edit"
                        ? null
                        : (
                            <FormGroup label="Freq." className="eq-form">
                                <Slider
                                    min={20}
                                    max={22050}
                                    stepSize={100}
                                    labelStepSize={22050 - 20}
                                    value={item.freq}
                                    labelRenderer={v => {
                                        const t = v >= 1000 ? Math.round(v / 1000) + "k" : v.toString();
                                        return (
                                            <span className="number">{t}Hz</span>
                                        );
                                    }}
                                    onRelease={v => this.onChangeQGainType("freq", item, v)}
                                    onChange={v => this.onChangeQGainType("freq", item, v)}
                                />
                            </FormGroup>
                        )
                }
                {
                    isQ
                        ? (
                            <FormGroup label="Q" className="eq-form">
                                <Slider
                                    min={0}
                                    max={1000}
                                    stepSize={10}
                                    labelStepSize={1000 - 0}
                                    value={item.q}
                                    labelRenderer={v => {
                                        return (
                                            <span className="number">{v}</span>
                                        );
                                    }}
                                    onRelease={v => this.onChangeQGainType("q", item, v)}
                                    onChange={v => this.onChangeQGainType("q", item, v)} />
                            </FormGroup>
                        )
                        : null
                }
                {
                    isG
                        ? (
                            <FormGroup label="Gain" className="eq-form">
                                <Slider
                                    min={-40}
                                    max={40}
                                    stepSize={1}
                                    labelStepSize={80}
                                    value={item.gain}
                                    labelRenderer={v => {
                                        return (
                                            <span className="number">{v}dB</span>
                                        );
                                    }}
                                    onRelease={v => this.onChangeQGainType("gain", item, v)}
                                    onChange={v => this.onChangeQGainType("gain", item, v)}
                                />
                            </FormGroup>
                        )
                        : null
                }
            </div>
        );
    }

    render = () => {
        return (
            <React.Fragment>
                <div className="mixer-eq">
                    <div className="mixer-eq-top">
                        <Callout className="mixer-eq-list" icon={false} intent={Intent.PRIMARY}>
                            <div className="mixer-key-font">EQ</div>
                            <div className="">
                                <Switch>Enable</Switch>
                            </div>
                        </Callout>
                        <Callout className="mixer-eq-tags">
                            <Tag
                                key="add-eq"
                                onClick={this.addTag}
                                className="eq-tag eq-tag-no-grow"
                                minimal
                                interactive={this.state.tags.length < EqualizerPanel.MAX_TAGS}
                                large
                                icon={IconNames.ADD}>
                                EQ FIlter
                                </Tag>
                            <Tag
                                key="add-preset"
                                className="eq-tag eq-tag-no-grow"
                                minimal
                                interactive
                                large
                                icon={IconNames.PROPERTIES}>
                                EQ Presets
                             </Tag>
                            {
                                this.state.tags.map((item: EQTag) => {
                                    const v = item.freq;
                                    const t = v >= 1000 ? Math.round(v / 1000) + "k" : v.toString();
                                    return (
                                        <Popover
                                            popoverClassName={classNames(Classes.POPOVER_CONTENT_SIZING, "eq-extra-padding")}
                                            key={item.id}
                                        >
                                            <Tag
                                                className="eq-tag"
                                                interactive
                                                large
                                                key={item.id}
                                                intent={Intent.NONE}
                                                onRemove={() => this.removeTag(item.id)}
                                            >
                                                <span>{BiQuadFilterNames[item.type]}</span>
                                                <span className="number">&nbsp;[{t}]</span>
                                            </Tag>
                                            {this.getTagDialog(item)}
                                        </Popover>
                                    )
                                })
                            }
                        </Callout>
                    </div>
                    {
                        this.state.enableSpectrum
                            ? (
                                <Callout className="mixer-eq-container" id="container" ref={this.canvasRef}>
                                    {this.state.errorMsg}
                                </Callout>
                            )
                            : (
                                <NonIdealState
                                    className="mixer-eq-container"
                                    icon={IconNames.TIMELINE_BAR_CHART}
                                    description={(
                                        <Tag minimal interactive large onClick={this.startSpectrum} intent={Intent.NONE}>Display Spectrum</Tag>
                                    )}
                                />
                            )
                    }
                </div>
            </React.Fragment>
        )
    }
}
export default {};
