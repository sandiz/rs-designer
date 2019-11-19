import React, { Component } from 'react'
import classNames from 'classnames';
import {
    Card, Text, Tooltip, Button,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ProjectDetails, ZOOM } from '../../types';
import SliderExtended from '../Extended/FadeoutSlider';
import MediaPlayerService from '../../services/mediaplayer';

const { shell } = window.require("electron").remote;

interface InfoPanelProps {
    project: ProjectDetails;
}
interface InfoPanelState {
    zoom: number;
}

class InfoPanel extends Component<InfoPanelProps, InfoPanelState> {
    constructor(props: InfoPanelProps) {
        super(props);
        this.state = { zoom: ZOOM.DEFAULT };
    }
    setZoom = (cur: number) => {
        MediaPlayerService.zoom(cur);
        this.setState({ zoom: cur });
    }

    render = () => {
        let keymsg = "";
        if (this.props.project.metadata) {
            const [key, type, _ignored] = this.props.project.metadata.key;
            if (key === "-") keymsg = "-";
            else {
                keymsg = `${key} ${type}`;
            }
        }
        return (
            <div className="info-panel">
                <div style={{
                    width: 100 + '%',
                    display: 'flex',
                    visibility: (this.props.project && this.props.project.loaded) ? "visible" : "hidden",
                }}>
                    <Card
                        interactive
                        onClick={() => shell.showItemInFolder(this.props.project.metadata ? this.props.project.metadata.path : "")}
                        elevation={0}
                        className={classNames("info-item", "info-item-large", "number")}>
                        <Text ellipsize>
                            Project: <span>{this.props.project.metadata ? this.props.project.metadata.name : "-"}</span>
                        </Text>
                    </Card>
                    <Card elevation={0} id="" className={classNames("info-item", "number")}>
                        Key: <span>{keymsg}</span>
                    </Card>
                    <Card elevation={0} id="" className={classNames("info-item", "number")}>
                        Tempo: <span>
                            {
                                this.props.project && this.props.project.metadata
                                    ? (this.props.project.metadata.tempo === 0 ? "-" : `${this.props.project.metadata.tempo} bpm`)
                                    : "-"
                            }</span>
                    </Card>
                    <Card elevation={0} id="" className={classNames("info-item", "number", "zoomer")}>
                        <Button
                            small
                            minimal
                            icon={IconNames.ZOOM_OUT}
                            className={classNames("zoom-item", "zoom-item-button")}
                            onClick={() => {
                                const cur = this.state.zoom;
                                if (cur > ZOOM.MIN) {
                                    this.setZoom(cur - 1);
                                }
                            }} />
                        <div className="zoom-item">
                            <SliderExtended
                                min={ZOOM.MIN}
                                max={ZOOM.MAX}
                                value={this.state.zoom}
                                stepSize={1}
                                labelRenderer={false}
                                className="zoom-item"
                                dragStart={(v: number) => this.setZoom(v)}
                                dragEnd={(v: number) => this.setZoom(v)}
                            />
                        </div>
                        <Button
                            small
                            minimal
                            className={classNames("zoom-item-button")}
                            icon={IconNames.ZOOM_IN}
                            onClick={() => {
                                const cur = this.state.zoom;
                                if (cur < ZOOM.MAX) {
                                    this.setZoom(cur + 1)
                                }
                            }}
                        />
                    </Card>
                </div>
                <div style={{ width: (this.props.project.loaded ? 50 : 100) + '%', display: 'flex', justifyContent: 'flex-end' }}>
                    <Tooltip
                        hoverOpenDelay={1000}
                        lazy
                        inheritDarkTheme
                        popoverClassName="tooltip"
                        content={(
                            <span>
                                The number of milliseconds of processing latency
                                incurred by the app passing an audio buffer from
                                the audio graph — into the audio subsystem ready for playing.
                 </span>
                        )}>
                        <Card elevation={0} id="latency" className={classNames("latency-meter", "number", "info-item")}>- ms</Card>
                    </Tooltip>
                    <Tooltip
                        hoverOpenDelay={1000}
                        lazy
                        inheritDarkTheme
                        popoverClassName="tooltip"
                        content={(
                            <span>
                                Total amount of memory used / total allocated by JS objects.
                 </span>
                        )}>
                        <Card elevation={0} id="memory" className={classNames("memory-meter", "number", "info-item")}>0 / 0 mb</Card>
                    </Tooltip>
                    <Tooltip
                        hoverOpenDelay={1000}
                        lazy
                        inheritDarkTheme
                        content={(
                            <span>
                                Frames per second.
                 </span>
                        )}>
                        <Card elevation={0} id="fps" className={classNames("fps-meter", "number")}>0 fps</Card>
                    </Tooltip>
                </div>
            </div>
        );
    }
}

export default InfoPanel;
