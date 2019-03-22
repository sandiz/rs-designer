import React, { Component } from 'react'
import "../css/MusicInformationBar.css"

const { Dispatcher, DispatchEvents } = window.Project;

class MusicInformationBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: true,
            showMIR: false,
        }
    }

    componentDidMount() {
        Dispatcher.on(DispatchEvents.MediaReset, this.reset);
        Dispatcher.on(DispatchEvents.MediaReady, this.ready);
    }

    reset = () => {
        this.setState({ showMIR: false });
    }

    ready = () => {
        this.setState({ showMIR: true });
    }

    loadSpec = () => {
        const mediaPlayer = window.Project.MediaPlayer.instance;
        if (mediaPlayer) {
            mediaPlayer.wavesurfer.initPlugin("spectrogram");
        }
    }

    toggle = () => {
        this.setState(prevState => ({
            expanded: !prevState.expanded,
        }))
    }

    render() {
        const expanded = "mir-collapse-root " + (this.state.expanded ? "collapse show" : "collapse");
        const faclass = this.state.expanded ? "fas fa-caret-down" : "fas fa-caret-right"
        return (
            <div className="mir-header" id="c">
                <div className="mir-text-div">
                    <span className="waveform-a" onClick={this.toggle}>
                        <i className={faclass} />
                        <span style={{ marginLeft: 5 + 'px' }}>Music Information</span>
                    </span>
                </div>
                <div className={expanded} id="">
                    <div className="mir-container">
                        <div id="spectrogram" style={{ display: this.state.showMIR ? "block" : "none" }} />
                    </div>
                </div>
            </div>
        )
    }
}

export default MusicInformationBar;
