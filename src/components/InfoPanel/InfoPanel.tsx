import React from 'react'
import classNames from 'classnames';
import { Card, Text, Tooltip } from '@blueprintjs/core';
import { ProjectDetails } from '../../types';

const { shell } = window.require("electron").remote;

interface InfoPanelProps {
    project: ProjectDetails;
}

const InfoPanel = (props: InfoPanelProps) => {
    return (
        <div className="info-panel">
            {
                props.project.loaded
                    ? (
                        <div style={{ width: 50 + '%', display: 'flex' }}>
                            <Card
                                interactive
                                onClick={() => shell.showItemInFolder(props.project.metadata ? props.project.metadata.path : "")}
                                elevation={0}
                                className={classNames("info-item", "info-item-large", "number")}>
                                <Text ellipsize>
                                    Project: <span>{props.project.metadata ? props.project.metadata.name : "-"}</span>
                                </Text>
                            </Card>
                            <Card elevation={0} id="" className={classNames("info-item", "number")}>
                                Key: <span>{props.project.metadata ? props.project.metadata.key : "-"}</span>
                            </Card>
                            <Card elevation={0} id="" className={classNames("info-item", "number")}>
                                Tempo: <span>
                                    {
                                        props.project && props.project.metadata
                                            ? (props.project.metadata.tempo === 0 ? "-" : `${props.project.metadata.tempo} bpm`)
                                            : "-"
                                    }</span>
                            </Card>
                        </div>
                    )
                    : null
            }
            <div style={{ width: (props.project.loaded ? 50 : 100) + '%', display: 'flex', justifyContent: 'flex-end' }}>
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

export default InfoPanel;
