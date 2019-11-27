import React, { Component } from 'react';
import classNames from 'classnames';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import './Waveform.scss';
import { CardExtended } from '../Extended/FadeoutSlider';
import { IntroPanel } from '../InfoPanel/Intro';

interface WaveformState {
    show: boolean;
}

class Waveform extends Component<{}, WaveformState> {
    constructor(props: {}) {
        super(props);
        this.state = { show: false };
    }

    shouldComponentUpdate(nextProps: {}) {
        return this.props !== nextProps
    }

    componentDidMount = async () => {
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

    mediaReady = async () => {
        this.setState({ show: true });
    }

    render = () => {
        return (
            <CardExtended className={classNames("waveform-root")} elevation={3}>
                <IntroPanel />
                <div style={{ visibility: this.state.show ? "visible" : "hidden" }} className="canvas-container">
                    <div id="chordstimeline" />
                    <div id="beatstimeline" />
                    <div id="waveform" />
                    <div id="timeline" />
                </div>
            </CardExtended>
        );
    }
}

export default Waveform;
