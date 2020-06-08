import React from 'react';
import classNames from 'classnames';
import {
    Card, Elevation, Callout,
    Classes, Icon, Collapse,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ProjectDetails } from '../../types/project';
import { SongKey } from '../../types/musictheory';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import ProjectService from '../../services/project';
import SliderExtended from '../Extended/FadeoutSlider';
import MediaPlayerService from '../../services/mediaplayer';
import { ZOOM } from '../../types/base';
import { metronomeSVG } from '../../svgIcons';
import CollapseButton from './CollapseButton';

interface AudioTrackProps {
    project: ProjectDetails;
}

interface AudioTrackState {
    key: SongKey;
    tempo: number;
    expanded: boolean;
}

class AudioTrackModule extends React.Component<AudioTrackProps, AudioTrackState> {
    constructor(props: AudioTrackProps) {
        super(props);
        this.state = { key: ["", "", -1], tempo: 0, expanded: false };
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.ProjectOpened, this.updateInfo);
        DispatcherService.on(DispatchEvents.ProjectUpdated, this.updateInfo);
        DispatcherService.on(DispatchEvents.ProjectClosed, this.resetInfo);
        DispatcherService.on(DispatchEvents.PitchChange, this.updateInfo);
        DispatcherService.on(DispatchEvents.TempoChange, this.updateInfo);
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.ProjectOpened, this.updateInfo);
        DispatcherService.on(DispatchEvents.ProjectUpdated, this.updateInfo);
        DispatcherService.off(DispatchEvents.ProjectClosed, this.resetInfo);
        DispatcherService.off(DispatchEvents.PitchChange, this.updateInfo);
        DispatcherService.off(DispatchEvents.TempoChange, this.updateInfo);
    }

    updateInfo = async () => {
        const kp = ProjectService.getLatestKey();
        const kt = ProjectService.getLatestTempo();
        const res: [SongKey, number] = await Promise.all([kp, kt]);
        this.setState({ key: res[0], tempo: res[1] });
    }

    resetInfo = () => {
        this.setState({ key: ["", "", -1], tempo: 0 });
    }

    render = () => {
        const key = this.state.key[0] === "" ? "-" : `${this.state.key[0]} ${this.state.key[1]}`;
        const tempo = this.state.tempo === 0 ? "-" : `${this.state.tempo}`;
        return (
            <Card className="sidebar-card sidebar-audio-track" elevation={Elevation.THREE}>
                <Callout
                    className="card-header"
                    icon={IconNames.MUSIC}>
                    Audio
                    <CollapseButton parent={this} expanded={this.state.expanded} />
                </Callout>
                <Collapse
                    keepChildrenMounted
                    isOpen={this.state.expanded}
                >
                    {
                        this.props.project.loaded
                            ? (
                                <div className="audio-track-content">
                                    <div className="key-tempo-header">
                                        <Callout>
                                            <div className="key-box">
                                                <div className="key-box-header">
                                                    <div>
                                                        <Icon icon={metronomeSVG()} />
                                                    </div>
                                                </div>
                                                <div className="key-box-content">
                                                    <span>{key}</span>
                                                </div>
                                            </div>
                                        </Callout>
                                        <Callout>
                                            <div className="key-box">
                                                <div>
                                                    <Icon icon={metronomeSVG()} />
                                                </div>
                                                <div className="number bpm-box-content">
                                                    <span>{tempo}</span>
                                                </div>
                                            </div>
                                        </Callout>
                                    </div>
                                    <br />
                                    <span className={classNames({ [Classes.TEXT_DISABLED]: !this.props.project.loaded }, "region-text")}>Zoom</span>
                                    <SliderExtended
                                        min={ZOOM.MIN}
                                        max={ZOOM.MAX}
                                        timerSource={MediaPlayerService.getZoom}
                                        stepSize={1}
                                        labelRenderer={false}
                                        className="zoom-item"
                                        dragStart={MediaPlayerService.zoom}
                                        dragEnd={MediaPlayerService.zoom}
                                    />
                                </div>
                            )
                            : null
                    }
                </Collapse>
            </Card>
        );
    }
}

export default AudioTrackModule;
