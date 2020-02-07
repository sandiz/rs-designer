
import React from 'react'
import {
    Card, Elevation, Callout, Intent,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons'
import { toTitleCase, fpsize } from '../../lib/utils';
import * as AppLogo from '../../assets/icons/icon-1024x1024.png';
import './Sidebar.scss';

const pkgInfo = require("../../../package.json");

class Sidebar extends React.Component<{}, {}> {
    constructor(props: {}) {
        super(props);
        console.log("asd");
    }

    componentDidMount = () => {
        fpsize();
    }

    render = () => {
        return (
            <Card className="sidebar" elevation={Elevation.TWO}>
                <Card className="sidebar-title number" elevation={Elevation.THREE}>
                    <img className="app-logo" alt="logo" src={AppLogo.default} />
                    <div className="app-title">
                        <span className="app-name">{toTitleCase(pkgInfo.name)}</span>
                        <span>{toTitleCase(pkgInfo.version)}</span>
                    </div>
                    <div className="number app-info">
                        <span>FPS: <span id="fps">60</span></span>
                        <span>MEM: <span id="memory">65m</span></span>
                        <span>LAT: <span id="latency">6ms</span></span>
                    </div>
                </Card>
                <Card className="sidebar-card sidebar-audio-track" elevation={Elevation.THREE}>
                    <Callout
                        className="card-header"
                        intent={Intent.SUCCESS}
                        icon={IconNames.MUSIC}>
                        Audio Track
                    </Callout>
                    <br />
                    <br />
                </Card>
                <Card className="sidebar-card sidebar-score-track" elevation={Elevation.THREE}>
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
