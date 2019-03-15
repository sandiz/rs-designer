import React, { Component } from 'react'
import '../css/WaveformBar.css'

class WaveformBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: true,
        }
    }

    toggle = () => {
        this.setState(prevState => ({
            expanded: !prevState.expanded,
        }));
    }

    render() {
        const expanded = "waveform-collapse-root " + (this.state.expanded ? "collapse show" : "collapse");
        const faclass = this.state.expanded ? "fas fa-caret-down" : "fas fa-caret-right"
        return (
            <div className="waveform-header" id="a">
                <div className="waveform-text-div">
                    <span className="waveform-a" onClick={this.toggle}>
                        <i className={faclass} />
                        <span style={{ marginLeft: 5 + 'px' }}>WAVEFORM</span>
                    </span>
                </div>
                <div className={expanded} id="collapseExample">
                    <div className="waveform-container">
                        <div id="waveform" />
                    </div>
                </div>
            </div>
        )
    }
}

export default WaveformBar;
