import React, { Component } from 'react';
import {
    Classes, Button, Intent, Popover, Position,
    MenuItem, Menu,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import classNames from 'classnames';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import NonIdealExtended from '../Extended/NonIdealExtended';
import './WaveformController.scss';
import * as AppLogo from '../../assets/icons/icon-1024x1024.png';
import { CardExtended } from '../Extended/FadeoutSlider';

interface WaveformState {
    show: boolean;
}

class WaveformController extends Component<{}, WaveformState> {
    constructor(props: {}) {
        super(props);
        this.state = { show: false };
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
    }

    mediaReset = () => {
        this.setState({ show: false });
    }

    mediaReady = () => {
        this.setState({ show: true });
    }

    importMedia = (external: string | null) => {
        DispatcherService.dispatch(DispatchEvents.ImportMedia, external);
    }

    getImportMenu = () => {
        return (
            <React.Fragment>
                <Menu large>
                    <MenuItem text="from Local File" icon={IconNames.DOWNLOAD} onClick={() => this.importMedia(null)} />
                    <MenuItem text="from URL" icon={IconNames.CLOUD} />
                </Menu>
            </React.Fragment>
        );
    }

    openProject = () => {
        DispatcherService.dispatch(DispatchEvents.ProjectOpen);
    }

    render = () => {
        const title = (
            <div style={{ fontWeight: 100 }}>
                Meend: Transcribe and Analyse Music.
            </div>
        )
        const icon = (
            <div>
                <img src={AppLogo.default} alt="app logo" className="appLogo-waveform" />
            </div>
        )
        const description = (
            <div className="description-buttons">
                <Button large intent={Intent.PRIMARY} icon={IconNames.FOLDER_OPEN} onClick={this.openProject}>Open Project</Button>
                <Popover content={this.getImportMenu()} position={Position.BOTTOM}>
                    <Button large icon={IconNames.IMPORT}>Import Media</Button>
                </Popover>
            </div>
        );
        return (
            <CardExtended className={classNames("waveform-root")} elevation={3}>
                <NonIdealExtended
                    className={classNames(Classes.TEXT_DISABLED)}
                    icon={icon}
                    title={title}
                    description={description} />
                <div style={{ visibility: this.state.show ? "visible" : "hidden" }}>
                    <div id="waveform" />
                    <div id="timeline" />
                </div>
            </CardExtended>
        );
    }
}

export default WaveformController;
