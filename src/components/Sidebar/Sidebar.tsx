import React from 'react';
import {
    Card, Elevation, Callout, Intent,
    Tooltip,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { toTitleCase, fpsize } from '../../lib/utils';
import { ProjectDetails } from '../../types/project';
import * as AppLogo from '../../assets/icons/icon-1024x1024.png';
import './Sidebar.scss';
import AudioTrackModule from './AudioTrackModule';

const pkgInfo = require("../../../package.json");

interface SidebarState {
    activeBar: number;
}

interface SidebarProps {
    project: ProjectDetails;
}

class Sidebar extends React.Component<SidebarProps, SidebarState> {
    constructor(props: SidebarProps) {
        super(props);
        this.state = { activeBar: 0 }
        console.log(this.state.activeBar);
    }

    componentDidMount = () => {
        fpsize();
    }

    render = () => {
        return (
            <Card className="sidebar" elevation={Elevation.TWO}>
                <Card className="sidebar-title number" elevation={Elevation.THREE}>
                    <div className="sidebar-main">
                        <img className="app-logo" alt="logo" src={AppLogo.default} />
                        <div className="app-title">
                            <span className="app-name">{toTitleCase(pkgInfo.name)}</span>
                            <span>{toTitleCase(pkgInfo.version)}</span>
                        </div>
                        <div className="number app-info">
                            <Tooltip
                                hoverOpenDelay={1000}
                                lazy
                                inheritDarkTheme
                                //popoverClassName="tooltip"
                                targetClassName="tooltip-target"
                                content="Frames per second">
                                <span>FPS: <span id="fps">60</span></span>
                            </Tooltip>
                            <Tooltip
                                hoverOpenDelay={1000}
                                lazy
                                inheritDarkTheme
                                //popoverClassName="tooltip"
                                targetClassName="tooltip-target"
                                content="Total amount of memory used by JS objects">
                                <span>MEM: <span id="memory">65m</span></span>
                            </Tooltip>
                            <Tooltip
                                hoverOpenDelay={1000}
                                lazy
                                inheritDarkTheme
                                popoverClassName="tooltip"
                                targetClassName="tooltip-target"
                                content="The number of milliseconds of processing latency
                                incurred by the app passing an audio buffer from
                                the audio graph — into the audio subsystem ready for playing.">
                                <span>LAT: <span id="latency">6ms</span></span>
                            </Tooltip>
                        </div>
                    </div>
                </Card>
                <AudioTrackModule project={this.props.project} />
                <Card style={{ display: 'none' }} className="sidebar-card sidebar-score-track" elevation={Elevation.THREE}>
                    <Callout
                        className="card-header"
                        intent={Intent.PRIMARY}
                        icon={IconNames.ANNOTATION}>
                        Chart - Lead
                    </Callout>
                    <br />
                    <br />
                </Card>
            </Card>
        )
    }
}

export default Sidebar;
