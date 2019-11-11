import React, { Component } from 'react';
import { Card, Classes } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import classNames from 'classnames';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import NonIdealExtended from '../Extended/NonIdealExtended';
import './WaveformController.scss';

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

    render = () => {
        return (
            <Card className="waveform-root" elevation={3}>
                <NonIdealExtended
                    className={classNames(Classes.TEXT_DISABLED)}
                    icon={IconNames.MUSIC}
                    description="open a project or import any media to load it's waveform." />
                <div style={{ visibility: this.state.show ? "visible" : "hidden" }}>
                    <div id="waveform" />
                    <div id="timeline" />
                </div>
            </Card>
        );
    }
}

export default WaveformController;
