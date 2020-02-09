import React from 'react';
import classNames from 'classnames';
import {
    Card, Elevation, Callout, Intent,
    Classes, HTMLSelect, Button,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ProjectDetails } from '../../types/project';
import { Regions, DEFAULT_REGIONS } from '../../types/regions';
import { SongKey } from '../../types/musictheory';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import ProjectService from '../../services/project';

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
        return (
            <Card className="sidebar-card sidebar-audio-track" elevation={Elevation.THREE}>
                <Callout
                    className="card-header"
                    intent={Intent.PRIMARY}
                    icon={IconNames.MUSIC}>
                    Audio
                    </Callout>
                <div className="audio-track-content">
                    <div className="key-tempo">
                        <Card
                            id="key"
                            className={
                                classNames({ [Classes.TEXT_DISABLED]: !this.props.project.loaded })
                            }
                            elevation={Elevation.TWO}>
                            {this.state.key[0] === "" ? "KEY" : `${this.state.key[0]} ${this.state.key[1]}`}
                        </Card>
                        <Card
                            id="tempo"
                            className={
                                classNames({ [Classes.TEXT_DISABLED]: !this.props.project.loaded }, "number")
                            }
                            elevation={Elevation.TWO}>
                            <span className={classNames("number", { hidden: this.state.tempo === 0 })}>{this.state.tempo}</span>
                            {this.state.tempo === 0 ? "TEMPO" : " bpm"}
                        </Card>
                    </div>
                    <br />
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

                </div>
            </Card>
        );
    }
}

export default AudioTrackModule;
