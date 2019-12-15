import React, { Component } from 'react'
import classNames from 'classnames';
import {
    Card, Tooltip, Classes, MenuItem,
} from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { IconNames } from '@blueprintjs/icons';
import { CommitDescription } from 'isomorphic-git';
import { ZOOM } from '../../types/base';
import { ProjectDetails } from '../../types/project'
import SliderExtended, { ButtonExtended } from '../Extended/FadeoutSlider';
import MediaPlayerService from '../../services/mediaplayer';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import { getTransposedKey } from '../../lib/music-utils';
import { filterCommit, renderCommit, areCommitsEqual } from './CommitItem'

interface InfoPanelProps {
    project: ProjectDetails;
    lastCommits: CommitDescription[];
}
interface InfoPanelState {
    keyChange: number;
    tempoChange: number;
}

const CommitSelect = Select.ofType<CommitDescription>();

class InfoPanel extends Component<InfoPanelProps, InfoPanelState> {
    constructor(props: InfoPanelProps) {
        super(props);
        this.state = { keyChange: 0, tempoChange: 1 };
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.on(DispatchEvents.PitchChange, this.pitchChange);
        DispatcherService.on(DispatchEvents.TempoChange, this.tempoChange);
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.off(DispatchEvents.PitchChange, this.pitchChange);
        DispatcherService.off(DispatchEvents.TempoChange, this.tempoChange);
    }


    pitchChange = () => {
        this.setState({ keyChange: MediaPlayerService.getPitchSemitones() });
    }

    tempoChange = () => {
        this.setState({ tempoChange: MediaPlayerService.getPlaybackRate() });
    }

    mediaReset = () => {
    }

    setZoom = (cur: number) => {
        MediaPlayerService.zoom(cur);
    }

    render = () => {
        let keymsg = "";
        let tempomsg = null;
        if (this.props.project.metadata) {
            const [key, type] = this.props.project.metadata.key;
            if (key === "-") keymsg = "-";
            else {
                keymsg = `${getTransposedKey(key, this.state.keyChange)} ${type}`;
            }
            tempomsg = (
                <span className="number">
                    {this.props.project.metadata.tempo === 0 ? "-" : `${Math.round(this.props.project.metadata.tempo * this.state.tempoChange)}`}
                    <span className="dark-toast">&nbsp;bpm</span>
                </span>
            );
        }
        return (
            <div className="info-panel">
                <div style={{
                    width: 100 + '%',
                    display: 'flex',
                    visibility: (this.props.project && this.props.project.loaded) ? "visible" : "hidden",
                    height: 100 + '%',
                    alignItems: "flex-end",
                }}>
                    <CommitSelect
                        //activeItem={props.file}
                        filterable
                        resetOnClose
                        className={classNames("info-item-control", Classes.ELEVATION_1, "info-item", "history-list")}
                        itemPredicate={filterCommit}
                        itemRenderer={(item, ps) => renderCommit(item, ps, '')}
                        //itemDisabled={isInstrumentFileDisabled}
                        itemsEqual={areCommitsEqual}
                        items={this.props.lastCommits}
                        noResults={<MenuItem disabled text="No files." />}
                        onItemSelect={(i, e) => { if (e) e.currentTarget.blur() }}
                        popoverProps={{
                            popoverClassName: "commit-list",
                        }}
                    >
                        {/* children become the popover target; render value here */}
                        <ButtonExtended
                            text={(
                                <span>{this.props.project.metadata ? this.props.project.metadata.name : "-"}</span>
                            )}
                            rightIcon="double-caret-vertical" />
                    </CommitSelect>
                    <Tooltip
                        hoverOpenDelay={1000}
                        lazy
                        inheritDarkTheme
                        content={(
                            keymsg === "-"
                                ? <span>Key unavailable or pending analysis</span>
                                : (
                                    <span>
                                        Key of the song detected using the key_madmom algorithm
                                    </span>
                                )
                        )}>
                        <Card
                            elevation={0}
                            id=""
                            className={classNames("info-item")}>
                            {keymsg}
                        </Card>
                    </Tooltip>
                    <Tooltip
                        hoverOpenDelay={1000}
                        lazy
                        inheritDarkTheme
                        content={(
                            keymsg === "-"
                                ? <span>Tempo unavailable or pending analysis</span>
                                : (
                                    <span>
                                        Tempo of the song in beats per minute, detected using the tempo_madmom algorithm.
                                    </span>
                                )
                        )}>
                        <Card elevation={0} id="" className={classNames("info-item")}>
                            {tempomsg}
                        </Card>
                    </Tooltip>
                    <Card elevation={0} id="" className={classNames("info-item", "number", "zoomer")}>
                        <ButtonExtended
                            small
                            minimal
                            icon={IconNames.ZOOM_OUT}
                            className={classNames("zoom-item", "zoom-item-button")}
                            onClick={() => {
                                const cur = MediaPlayerService.getZoom();
                                if (cur > ZOOM.MIN) {
                                    this.setZoom(cur - 1);
                                }
                            }} />
                        <div className="zoom-item">
                            <SliderExtended
                                min={ZOOM.MIN}
                                max={ZOOM.MAX}
                                timerSource={MediaPlayerService.getZoom}
                                stepSize={1}
                                labelRenderer={false}
                                className="zoom-item"
                                dragStart={(v: number) => this.setZoom(v)}
                                dragEnd={(v: number) => this.setZoom(v)}
                            />
                        </div>
                        <ButtonExtended
                            small
                            minimal
                            className={classNames("zoom-item-button")}
                            icon={IconNames.ZOOM_IN}
                            onClick={() => {
                                const cur = MediaPlayerService.getZoom();
                                if (cur < ZOOM.MAX) {
                                    this.setZoom(cur + 1)
                                }
                            }}
                        />
                    </Card>
                </div>
                <div
                    style={{
                        width: (this.props.project.loaded ? 50 : 100) + '%',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        height: 100 + '%',
                        alignItems: 'flex-end',
                        marginBottom: -5 + 'px',
                    }}>
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
                        <Card elevation={0} id="latency" className={classNames("latency-meter", "number", "info-item")}>-<span className="dark-toast">&nbsp;ms</span></Card>
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
                        <Card elevation={0} id="memory" className={classNames("memory-meter", "number", "info-item")}>0 / 0<span className="dark-toast">&nbsp;mb</span></Card>
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
                        <Card elevation={0} id="fps" className={classNames("fps-meter", "number")}>0 <span className="dark-toast">&nbsp;fps</span></Card>
                    </Tooltip>
                </div>
            </div>
        );
    }
}

export default InfoPanel;
