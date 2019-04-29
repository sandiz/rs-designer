import React, { Component } from 'react'
import PropTypes from 'prop-types';
import '../../css/ControlsBar.css'
import '../../css/slider.css'

import { DispatcherService, DispatchEvents } from '../../services/dispatcher'
import { MediaPlayer } from '../../lib/libWaveSurfer'
import { AudioMotionInitialize } from './audioMotion'

class FrequencyGraph extends Component {
    constructor(props) {
        super(props);
        this.state = {
        }
        this.audioMotion = null;
    }

    componentDidUpdate(prevProps) {
        if (this.props.show !== prevProps.show) {
            if (this.audioMotion) {
                if (this.props.show) {
                    this.audioMotion.start();
                }
                else {
                    this.audioMotion.stop();
                }
            }
        }
    }

    componentDidMount() {
        DispatcherService.on(DispatchEvents.MediaReset, this.reset);
        DispatcherService.on(DispatchEvents.MediaReady, this.ready);
        this.canvas = document.querySelector('#frequency-canvas');

        this.cWidth = this.canvas.width;
        this.cHeight = this.canvas.height;

        this.analyser = null;
        this.bufferLength = 0;

        this.ready();
    }

    reset = () => {
    }

    ready = () => {
        const mediaPlayer = MediaPlayer.instance;
        if (mediaPlayer) {
            this.analyser = mediaPlayer.getPostAnalyser();
            this.analyser.fftSize = 8192;
            this.bufferLength = this.analyser.frequencyBinCount;

            this.audioMotion = AudioMotionInitialize(mediaPlayer.wavesurfer.backend.ac, this.analyser, this.canvas, this.bufferLength);
        }
    }

    render() {
        return (
            <div className="freq-container">
                <canvas id="frequency-canvas" />
            </div>
        );
    }
}

FrequencyGraph.propTypes = {
    show: PropTypes.bool,
};

FrequencyGraph.defaultProps = {
    show: false,
};

export default FrequencyGraph;
