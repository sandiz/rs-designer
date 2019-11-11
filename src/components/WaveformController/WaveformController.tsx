import React, { Component } from 'react';
import './WaveformController.scss';
import { Card } from '@blueprintjs/core';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';

interface WaveformState {
    show: boolean;
}

class WaveformController extends Component<{}, WaveformState> {
    constructor(props: {}) {
        super(props);
        this.state = { show: false };
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
    }

    mediaReady = () => {
        this.setState({ show: true });
    }

    render = () => {
        return (
            <Card className="waveform-root" elevation={3}>
                <div style={{ visibility: this.state.show ? "visible" : "hidden" }}>
                    <div id="waveform" />
                    <div id="timeline" />
                </div>
            </Card>
        );
    }
}

export default WaveformController;
