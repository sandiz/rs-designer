import { ChildProcess } from 'child_process';
import React, { Component, FunctionComponent, RefObject } from 'react';
import classNames from 'classnames';
import {
    Card, Elevation, Callout,
    Intent, Button, Pre, Spinner, Tag, Switch,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons'
import './TrackIsolation.scss';
import MusicAnalysisService from '../../lib/musicanalysis';
import { STEM } from '../../types/musictheory';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import MediaPlayerService from '../../services/mediaplayer';
import ProjectService from '../../services/project';
import SliderExtended from '../Extended/FadeoutSlider';
import { REGION_COLORS } from '../../types/regions';
import { VOLUME } from '../../types/base';

interface TIState {
    stems: string[];
    isRunning: boolean;
    output: string;
    image: string;
}
export default class TrackIsolationTab extends Component<{}, TIState> {
    private runner: ChildProcess | null = null;
    private stemRef: RefObject<HTMLDivElement> = React.createRef();
    constructor(props: {}) {
        super(props);

        this.state = {
            stems: [],
            isRunning: false,
            output: '-- no output --',
            image: '',
        }
        console.log("stems", this.state.stems)
    }

    componentDidMount() {
        DispatcherService.on(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.on(DispatchEvents.ProjectUpdated, this.projectOpened);
        this.projectOpened();
    }

    componentWillUnmount() {
        DispatcherService.off(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.off(DispatchEvents.ProjectUpdated, this.projectOpened);
    }

    spleet = async () => {
        this.setState({ isRunning: true, output: 'Starting spleet...' });
        this.runner = await MusicAnalysisService.spleet(
            (s) => this.setState({ output: this.state.output + s }),
            (s) => this.setState({ output: this.state.output + s }),
            () => this.setState({ isRunning: false }),
        );
    }

    cancelSpleet = () => {
        this.setState({ isRunning: false });
        if (this.runner) {
            this.runner.kill('SIGKILL');
        }
    }

    projectOpened = async () => {
        const w = this.stemRef.current?.clientWidth ?? 300;
        const image = await MediaPlayerService.exportImage(w);
        this.setState({ image });
    }

    isWaveformAvailable = (s: STEM) => {
        return ProjectService.isStemAvailable(s);
    }

    render() {
        const { isRunning, output } = this.state;
        return (
            <div className="container">
                <Card className="stem-panel" elevation={Elevation.TWO}>
                    <div ref={this.stemRef} className="stems-callout">
                        <Callout intent={Intent.PRIMARY} icon={false} className="stems-panel-2">
                            <div className="stems-header">
                                <div>STEMS</div>
                                <div className="stems-h-switch">
                                    <Switch>
                                        Enable
                                    </Switch>
                                </div>
                            </div>
                        </Callout>
                        <Callout intent={Intent.NONE} icon={false} className="stems-panel-3">
                            <div className="stems-tag">
                                {
                                    Object.keys(STEM).map((i, idx) => {
                                        return (
                                            <Tag
                                                style={{
                                                    backgroundColor: REGION_COLORS[idx],
                                                }}
                                                key={i}
                                            >
                                                {i}
                                            </Tag>
                                        );
                                    })
                                }
                            </div>
                        </Callout>
                    </div>
                    {
                        !ProjectService.isProjectLoaded()
                            ? (
                                <Card className="stem-tracks">
                                    no project loaded
                                </Card>
                            )
                            : (
                                <div className="stem-tracks">
                                    {
                                        Object.keys(STEM).map((i, idx) => {
                                            const s = i as keyof typeof STEM;
                                            return (
                                                <StemTrack
                                                    key={i}
                                                    stem={STEM[s]}
                                                    image={this.state.image}
                                                    index={idx}
                                                    available={this.isWaveformAvailable(STEM[s])}
                                                >
                                                    {i}
                                                </StemTrack>
                                            );
                                        })
                                    }
                                </div>
                            )
                    }
                </Card>
                <Card className="output" elevation={Elevation.TWO}>
                    <Callout intent={Intent.PRIMARY} icon={false} className="output-button">
                        <div className="buttons">
                            <Button
                                onClick={this.spleet}
                                icon={IconNames.SPLIT_COLUMNS}
                                large
                                intent={Intent.NONE}
                                text="Spleet It!"
                                disabled={isRunning}
                            />
                            {
                                isRunning
                                    ? (
                                        <Button
                                            onClick={this.cancelSpleet}
                                            icon={IconNames.CROSS}
                                            large
                                            intent={Intent.DANGER}
                                            text="Cancel"
                                        />
                                    )
                                    : null
                            }
                        </div>
                        {
                            isRunning
                                ? (
                                    <div className="spinner">
                                        <Spinner />
                                    </div>
                                )
                                : <div className="powered">Powered by spleeter</div>
                        }
                    </Callout>
                    <Pre className="output-logs">
                        {output}
                    </Pre>
                </Card>
            </div>
        );
    }
}

interface StemProps {
    stem: STEM;
    image: string | null;
    index: number;
    available: boolean;
}
const StemTrack: FunctionComponent<StemProps> = (props: StemProps) => (
    <Card
        className="stem-track"
        elevation={Elevation.THREE}
    >
        <Card
            style={{
                backgroundColor: REGION_COLORS[props.index],
            }}
            className="track-controls"
        >
            <Tag>
                {props.stem.toUpperCase()}
            </Tag>
            <div className="controls-buttons">
                <Button disabled={!props.available} icon={IconNames.VOLUME_OFF}>MUTE</Button>
                <Button disabled={!props.available} icon={IconNames.FILTER}>SOLO</Button>
            </div>
            <SliderExtended
                stepSize={1 / 100}
                min={VOLUME.MIN}
                max={VOLUME.MAX}
                timerSource={() => MediaPlayerService.getStemVolume(props.stem)}
                disabled={!props.available}
                labelRenderer={false}
                drag={(v: number) => MediaPlayerService.setStemVolume(props.stem, v)}
                dragStart={(v: number) => MediaPlayerService.setStemVolume(props.stem, v)}
                dragEnd={(v: number) => MediaPlayerService.setStemVolume(props.stem, v)}
            />
        </Card>
        {
            props.available
                ? (
                    <div className="stem-img-div">
                        <img src={props.image as string} alt="track-img" className="stem-img" />
                    </div>
                )
                : (
                    <div className={classNames("stem-na")}>
                        Not Available
                    </div>
                )
        }
    </Card>
)
