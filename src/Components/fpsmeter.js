import React, { Component } from 'react'
import { SettingsService } from '../services/settings';
import { DispatcherService, DispatchEvents } from '../services/dispatcher';

const Stats = require('stats-js');

class FPSMeter extends Component {
    constructor(props) {
        super(props)
        this.fpsRef = React.createRef();
        this.renderID = null;
        this.initStats();
    }

    componentDidMount = async () => {
        DispatcherService.on(DispatchEvents.SettingsUpdate, () => this.initStats());
    }

    initStats = async () => {
        const show = await SettingsService.getSettingValue("advanced", "show_fps");
        if (show) {
            if (this.stats != null) return;
            this.stats = new Stats();
            this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
            this.fpsRef.current.appendChild(this.stats.dom);
            this.update();
        }
        else {
            const node = this.fpsRef.current;
            while (node.firstChild) {
                node.removeChild(node.firstChild);
            }
            if (this.renderID) {
                cancelAnimationFrame(this.renderID);
            }
            this.stats = null;
        }
    }

    update = () => {
        if (this.stats) {
            this.stats.update();
        }
        this.renderID = requestAnimationFrame(this.update);
    }

    render = () => {
        return (
            <div ref={this.fpsRef} style={{ position: "absolute", bottom: 0 + 'px' }} />
        )
    }
}

export default FPSMeter;
