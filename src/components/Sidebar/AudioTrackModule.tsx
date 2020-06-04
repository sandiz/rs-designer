import React from 'react';
import classNames from 'classnames';
import {
    Card, Elevation, Callout,
    Classes, HTMLSelect, Button,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ProjectDetails } from '../../types/project';
import { Regions, DEFAULT_REGIONS } from '../../types/regions';
import { SongKey } from '../../types/musictheory';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import ProjectService from '../../services/project';
import SliderExtended from '../Extended/FadeoutSlider';
import MediaPlayerService from '../../services/mediaplayer';
import { ZOOM } from '../../types/base';

interface AudioTrackProps {
    project: ProjectDetails;
}

interface AudioTrackState {
    regions: Regions[];
    key: SongKey;
    tempo: number;
}

class AudioTrackModule extends React.Component<AudioTrackProps, AudioTrackState> {
    constructor(props: AudioTrackProps) {
        super(props);
        this.state = { regions: DEFAULT_REGIONS, key: ["", "", -1], tempo: 0 };
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.ProjectOpened, this.updateInfo);
        DispatcherService.on(DispatchEvents.ProjectClosed, this.resetInfo);
        DispatcherService.on(DispatchEvents.PitchChange, this.updateInfo);
        DispatcherService.on(DispatchEvents.TempoChange, this.updateInfo);
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.ProjectOpened, this.updateInfo);
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
        const key = this.state.key[0] === "" ? "" : `${this.state.key[0]} ${this.state.key[1]}`;
        const tempo = this.state.tempo === 0 ? "" : `${this.state.tempo}`;
        return (
            <Card className="sidebar-card sidebar-audio-track" elevation={Elevation.THREE}>
                <Callout
                    className="card-header"
                    icon={IconNames.MUSIC}>
                    Audio
                    {
                        this.props.project.loaded
                            ? (
                                <div className="key-tempo-header">
                                    <span>&nbsp;&nbsp;</span>
                                    <span>{key}</span>
                                    <span>&nbsp;|&nbsp;</span>
                                    <span className="number">{tempo} <span className="dark-toast">bpm</span></span>
                                </div>
                            )
                            : null
                    }
                </Callout>
                {
                    this.props.project.loaded
                        ? (
                            <div className="audio-track-content">
                                <span className={classNames({ [Classes.TEXT_DISABLED]: !this.props.project.loaded }, "region-text")}>Regions</span>
                                <div className="region-body">
                                    <HTMLSelect className="region-select" disabled={!this.props.project.loaded}>
                                        {
                                            this.state.regions.map(item => {
                                                return <option key={item.name}>{item.name}</option>
                                            })
                                        }
                                    </HTMLSelect>
                                    <Button icon={IconNames.PLUS} minimal />
                                    <Button icon={IconNames.MINUS} minimal />
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
            </Card>
        );
    }
}

export default AudioTrackModule;
