import React, { Component } from 'react'
import PropTypes from 'prop-types';
import '../css/ControlsBar.css'
import '../css/slider.css'

const { Dispatcher, DispatchEvents } = window.Project;
const { requestAnimationFrame, cancelAnimationFrame } = window;


class FrequencyGraph extends Component {
    constructor(props) {
        super(props);
        this.state = {
        }
    }

    componentDidMount() {
        Dispatcher.on(DispatchEvents.MediaReset, this.reset);
        Dispatcher.on(DispatchEvents.MediaReady, this.ready);
        this.canvas = document.querySelector('#frequency-canvas');
        this.canvasCtx = this.canvas.getContext("2d");

        this.cWidth = this.canvas.width;
        this.cHeight = this.canvas.height;
        this.canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        this.canvasCtx.fillRect(0, 0, this.cWidth, this.cHeight);

        this.drawRAF = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = 0;

        this.ready();
    }

    drawGraph = () => {
        if (this.analyser && this.dataArray && this.bufferLength > 0) {
            const WIDTH = this.cWidth;
            const HEIGHT = this.cHeight;

            this.canvasCtx.fillStyle = 'rgb(0, 0, 0)';
            this.canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

            if (this.props.show) {
                this.drawRAF = requestAnimationFrame(this.drawGraph);
            }
            else {
                return;
            }

            this.analyser.getByteFrequencyData(this.dataArray);
            const barWidth = (WIDTH / this.bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < this.bufferLength; i += 1) {
                barHeight = this.dataArray[i];

                this.canvasCtx.fillStyle = 'rgb(50,' + (barHeight + 100) + ',50)';
                this.canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);

                x += barWidth + 1;
            }
        }
    }

    reset = () => {
        if (this.drawRAF) {
            cancelAnimationFrame(this.drawRAF);
        }
        this.canvasCtx.clearRect(0, 0, this.cWidth, this.cHeight);
    }

    ready = () => {
        const mediaPlayer = window.Project.MediaPlayer.instance;
        if (mediaPlayer) {
            this.analyser = mediaPlayer.getPostAnalyser();
            this.analyser.fftSize = 256;
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);

            this.canvasCtx.clearRect(0, 0, this.cWidth, this.cHeight);
        }
        this.drawGraph();
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
