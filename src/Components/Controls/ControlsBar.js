import React, { Component } from 'react'
import '../../css/ControlsBar.css'
import '../../css/slider.css'
import CircleControls from './ControlsBar.circle'
import EqualizerControls from './ControlsBar.equalizer'
import { KeyboardEvents, DispatcherService } from '../../services/dispatcher';
import ForageService, { SettingsForageKeys } from '../../services/forage.js';

class ControlBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: true,
        }
    }

    componentWillMount = async () => {
        const savedState = await ForageService.get(SettingsForageKeys.CONTROL_SETTINGS);
        if (savedState) {
            this.setState({ ...this.state, ...savedState });
        }
    }

    componentDidMount() {
        DispatcherService.on(KeyboardEvents.ToggleControls, this.toggle);
    }

    toggle = () => {
        this.setState(prevState => ({
            expanded: !prevState.expanded,
        }), async () => {
            await ForageService.serializeState(SettingsForageKeys.CONTROL_SETTINGS, this.state);
        });
    }

    render() {
        const expanded = "controls-collapse-root bg-light " + (this.state.expanded ? "collapse show" : "collapse");
        const faclass = this.state.expanded ? "fas fa-caret-down" : "fas fa-caret-right"
        return (
            <div className="controls-header" id="a">
                <div className="controls-text-div">
                    <span className="waveform-a" onClick={this.toggle}>
                        <i className={faclass} />
                        <span style={{ marginLeft: 5 + 'px' }}>CONTROLS</span>
                    </span>
                </div>
                <div className={expanded} id="">
                    <div className="controls-root-flex">
                        <div className="root-flex1">
                            <CircleControls />
                        </div>
                        <div className="root-flex2">
                            <EqualizerControls />
                        </div>
                    </div>
                </div>

            </div>
        )
    }
}

export default ControlBar;

//volume
//tempo
//key

//equalizer
//low pass
//high pass
//remove vocals
