import React, { Component } from 'react'
import "../css/MusicInformationBar.css"

class MusicInformationBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: true,
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
                <div className={expanded} id="" />
            </div>
        )
    }
}

export default MusicInformationBar;
