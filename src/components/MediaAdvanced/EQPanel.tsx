import React, { RefObject } from 'react';
import {
    Callout, Tag, Switch, Intent,
    Popover, H4, Classes, Slider,
    HTMLSelect, FormGroup, Menu, MenuItem, Card, Colors,
} from '@blueprintjs/core';
import classNames from 'classnames';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { IconNames } from '@blueprintjs/icons';
import {
    EQTag, EQPreset, ExtendedBiquadFilterType,
} from '../../types';
import MediaPlayerService from '../../services/mediaplayer';
import { DispatcherService, DispatchEvents, DispatchData } from '../../services/dispatcher';
import { setStateAsync, UUID } from '../../lib/utils';
import ProjectService from '../../services/project';
import { MixerProps } from './Mixer';

const { nativeTheme, shell } = window.require("electron").remote;
interface EqualizerState {
    enableSpectrum: boolean;
    enableEQ: boolean;
    errorMsg: React.ReactNode | null;
    tags: EQTag[];
    presets: React.ReactElement | null;
    lastUsedTag: EQTag | null;
}

const GAIN_MIN = -20;
const GAIN_MAX = 20;
const Q_MIN = 0;
const Q_MAX = 15;
const FREQ_MIN = 30;
const FREQ_MAX = 16000;
const CANVAS_BG_FILL = { dark: "#30404E", light: Colors.WHITE };
export class EqualizerPanel extends React.Component<MixerProps, EqualizerState> {
    static MAX_TAGS = 8;
    static TAG_COLORS = ["#2965CC", "#29A634", "#D99E0B", "#D13913", "#8F398F", "#00B3A4", "#DB2C6F", "#9BBF30", "#96622D", "#7157D9"];
    static Q_FILTERS: Partial<ExtendedBiquadFilterType>[] = ["lowpass", "highpass", "bandpass", "notch", "allpass", "peaking"];
    static G_FILTERS: Partial<ExtendedBiquadFilterType>[] = ["lowshelf", "highshelf", "peaking"];
    private canvasRef: RefObject<Callout> = React.createRef();
    //eslint-disable-next-line
    private audioMotion: any | null = null;
    constructor(props: MixerProps) {
        super(props);
        this.state = {
            enableSpectrum: false, enableEQ: false, errorMsg: null, tags: [], presets: null, lastUsedTag: null,
        };
        this.initEQ();
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReady);
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.on(DispatchEvents.EqualizerToggled, this.eqToggled);
    }

    componentWillUnmount = () => {
        ProjectService.saveLastEQTags(this.state.tags);
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReady);
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.off(DispatchEvents.EqualizerToggled, this.eqToggled);
        this.endSpectrum();
    }

    mediaReady = () => {
        this.initEQ();
    }

    mediaReset = () => {
        this.endSpectrum();
    }

    initEQ = async () => {
        const eqP = await MediaPlayerService.getEQPresets();
        const def = eqP.filter((item) => item.default === true);
        const curP = MediaPlayerService.getFilters();
        this.setState({
            enableEQ: MediaPlayerService.isEQOn,
            // tags: curP.length > 0 ? curP.map(item => item.tag) : def[0],
            presets: this.getEQPresetsMenu(eqP),
        })
        if (curP.length === 0) {
            this.addPreset(def[0]);
        }
        else {
            this.setState({ tags: curP.map(item => item.tag) });
        }
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
                    showScale: false,
                    showBgColor: false,
                    gradient: 'cool',
                    audioCtx: MediaPlayerService.getAudioContext(),
                    analyzer: MediaPlayerService.getPostAnalyzer(),
                    mode: 2,
                    colorCb: () => { return nativeTheme.shouldUseDarkColors ? CANVAS_BG_FILL.dark : CANVAS_BG_FILL.light },
                    onCanvasDraw: (instance: unknown) => {
                        //displayCanvasMsg(instance);
                        //drawEQTags(instance, MediaPlayerService.getFilters());
                    },
                },
            );
            this.audioMotion.registerGradient('cool', {
                name: 'Summer',
                bgColor: '#041919',
                colorStops: [
                    { pos: 0.1, color: '#fdbb2d' },
                    { pos: 1, color: '#22c1c3' },
                ],
            });
            this.audioMotion.gradient = 'cool';
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
        const container = document.getElementById("container");
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
        this.setState({ enableSpectrum: false });
    }

    addTag = () => {
        const t: EQTag = {
            freq: 0, gain: 0, q: 1, type: "edit", id: UUID(), color: EqualizerPanel.TAG_COLORS[this.state.tags.length],
        };
        const { tags } = this.state;
        if (tags.length < EqualizerPanel.MAX_TAGS) {
            tags.unshift(t);
            this.setState({ tags });
            MediaPlayerService.addEQFilter(t);
        }
    }

    addPreset = (item: EQPreset) => {
        const tags: EQTag[] = [];
        for (let i = 0; i < item.tags.length; i += 1) {
            const t = item.tags[i];

            const newt: EQTag = {
                freq: t.freq ? t.freq : 0,
                gain: t.gain ? t.gain : 0,
                q: t.q ? t.q : 1,
                type: t.type ? t.type : "edit",
                id: UUID(),
                color: EqualizerPanel.TAG_COLORS[i],
            };
            tags.push(newt);
        }
        this.setState({ tags });
        MediaPlayerService.addEQFilters(tags);
    }

    removeTag = (id: string) => {
        const { tags } = this.state;
        for (let i = 0; i < tags.length; i += 1) {
            if (tags[i].id === id) {
                MediaPlayerService.removeFilter(tags[i]);
                tags.splice(i, 1);
                break;
            }
        }
        this.setState({ tags });
    }

    toggleSpectrum = (e: React.FormEvent<HTMLInputElement>) => {
        if (e.currentTarget.checked) {
            this.startSpectrum();
        }
        else {
            this.endSpectrum();
        }
        e.currentTarget.blur();
    }

    toggleEQ = (e: React.FormEvent<HTMLInputElement>) => {
        if (e.currentTarget.checked) {
            DispatcherService.dispatch(DispatchEvents.EqualizerToggle, true);
        }
        else {
            DispatcherService.dispatch(DispatchEvents.EqualizerToggle, false);
        }
        e.currentTarget.blur();
    }

    eqToggled = (val: DispatchData) => {
        this.setState({ enableEQ: val as boolean });
    }

    onChangeFilterType = (item: EQTag, event: React.ChangeEvent<HTMLSelectElement>) => {
        const { tags } = this.state;
        let lastUsedTag = null;
        for (let i = 0; i < tags.length; i += 1) {
            if (tags[i].id === item.id) {
                tags[i].type = event.target.value as BiquadFilterType;
                const filter = MediaPlayerService.getFilterFrom(tags[i]);
                if (filter) {
                    filter.type = event.target.value as BiquadFilterType;
                    lastUsedTag = tags[i];
                }
            }
        }
        this.setState({ tags, lastUsedTag });
    }

    onChangeQGainType = (type: string, item: EQTag, v: number) => {
        const { tags } = this.state;
        let lastUsedTag = null;
        for (let i = 0; i < tags.length; i += 1) {
            if (tags[i].id === item.id) {
                const filter = MediaPlayerService.getFilterFrom(tags[i]);
                lastUsedTag = tags[i];
                if (type === "gain") {
                    tags[i].gain = v;
                    if (filter) filter.gain.value = v;
                }
                else if (type === "q") {
                    tags[i].q = v;
                    if (filter) filter.Q.value = v;
                }
                else if (type === "freq") {
                    tags[i].freq = v;
                    if (filter) filter.frequency.value = v;
                }
            }
        }
        this.setState({ tags, lastUsedTag });
    }

    getTagDialog = (item: EQTag): string | JSX.Element | undefined => {
        const isQ = EqualizerPanel.Q_FILTERS.includes(item.type);
        const isG = EqualizerPanel.G_FILTERS.includes(item.type)
        return (
            <div className="eq-edit">
                <H4 className="font-weight-unset">Edit Filter</H4>
                <FormGroup inline label={(<a onClick={() => shell.openExternal("https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/type")}>Filter Type</a>)}>
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
                                    min={FREQ_MIN}
                                    max={FREQ_MAX}
                                    stepSize={100}
                                    labelStepSize={FREQ_MAX - FREQ_MIN}
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
                                    min={Q_MIN}
                                    max={Q_MAX}
                                    stepSize={0.5}
                                    labelStepSize={Q_MAX - Q_MIN}
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
                                    min={GAIN_MIN}
                                    max={GAIN_MAX}
                                    stepSize={1}
                                    labelStepSize={40}
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

    getEQPresetsMenu = (presets: EQPreset[]) => {
        return (
            <Menu>
                {
                    presets.map((item) => {
                        return (
                            <MenuItem
                                onClick={() => this.addPreset(item)}
                                key={item.name}
                                icon={IconNames.DOCUMENT}
                                text={item.name} />
                        )
                    })
                }
            </Menu>
        );
    }

    render = () => {
        return (
            <React.Fragment>
                <div className="mixer-eq">
                    <div className="mixer-eq-top">
                        <Callout className="mixer-eq-list" icon={false} intent={this.state.enableEQ ? Intent.WARNING : Intent.PRIMARY}>
                            <div className="mixer-key-font">EQ</div>
                            <div className="">
                                <Switch checked={this.state.enableEQ} className={classNames({ "eq-checked-warning": this.state.enableEQ })} onChange={this.toggleEQ}>Enable</Switch>
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
                            <Popover content={this.state.presets ? this.state.presets : undefined}>
                                <Tag
                                    key="add-preset"
                                    className="eq-tag eq-tag-no-grow"
                                    minimal
                                    interactive
                                    large
                                    icon={IconNames.PROPERTIES}>
                                    EQ Presets
                             </Tag>
                            </Popover>
                            {
                                this.state.tags.map((item: EQTag) => {
                                    const v = item.freq;
                                    const t = v >= 1000 ? Math.round(v / 1000) + "k" : v.toString();
                                    return (
                                        <Popover
                                            popoverClassName={classNames(Classes.POPOVER_CONTENT_SIZING, "eq-extra-padding")}
                                            key={item.id}
                                            content={this.getTagDialog(item)}
                                        >
                                            <Tag
                                                //style={{ backgroundColor: item.color }}
                                                className="eq-tag"
                                                interactive
                                                large
                                                key={item.id}
                                                intent={Intent.NONE}
                                                onRemove={() => this.removeTag(item.id)}
                                            >
                                                <span className="number">{t}Hz</span>
                                            </Tag>
                                        </Popover>
                                    )
                                })
                            }
                        </Callout>
                    </div>
                    <div className="eq-slider-row">
                        <div className="eq-toggle-spectrum"><Switch onChange={this.toggleSpectrum}>Spectrum</Switch> </div>
                        <div className="eq-slider-flex">
                            {
                                this.state.tags.map((item) => {
                                    const t = item.freq >= 1000 ? Math.round(item.freq / 1000) + "k" : item.freq.toString();
                                    return (
                                        <div key={item.id} style={{ display: 'flex', flexDirection: "column" }}>
                                            <Slider
                                                className={classNames({ warningslider: item.gain !== 0 })}
                                                min={GAIN_MIN}
                                                max={GAIN_MAX}
                                                stepSize={1}
                                                labelStepSize={40}
                                                value={item.gain}
                                                labelRenderer={(
                                                    this.state.lastUsedTag && this.state.lastUsedTag.id === item.id
                                                        ? v => {
                                                            return (
                                                                <span className="number">{v}dB</span>
                                                            );
                                                        }
                                                        : false
                                                )}
                                                onRelease={v => this.onChangeQGainType("gain", item, v)}
                                                onChange={v => this.onChangeQGainType("gain", item, v)}
                                                vertical
                                            />
                                            <Tag className="number hznum">{t}</Tag>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                    <Card className="mixer-eq-container" id="container" ref={this.canvasRef}>
                        {this.state.errorMsg}
                    </Card>
                </div>
            </React.Fragment>
        )
    }
}

export default EqualizerPanel;
