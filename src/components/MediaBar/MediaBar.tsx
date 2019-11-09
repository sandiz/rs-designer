import React, { Component, FunctionComponent } from 'react'
import {
    Navbar, Button, Elevation, Card, Classes, Text, Icon, Slider,
} from '@blueprintjs/core';
import { GlobalHotKeys } from 'react-hotkeys';
import { IconNames } from "@blueprintjs/icons";
import classNames from 'classnames';
import { ExtClasses, MediaInfo, ProjectInfo } from '../../types';

import './MediaBar.scss'
import { HotkeyInfo } from '../../dialogs';

interface MediaBarState {
    mediaInfo: MediaInfo;
}

interface MediaBarProps {
    project?: ProjectInfo;
}
class MediaBar extends Component<MediaBarProps, MediaBarState> {
    public keyMap = {
        PLAY_PAUSE: HotkeyInfo.PLAY_PAUSE.hotkey,
        FWD: HotkeyInfo.FWD.hotkey,
        REWIND: HotkeyInfo.REWIND.hotkey,
        VOL_UP: HotkeyInfo.VOL_UP.hotkey,
        VOL_DOWN: HotkeyInfo.VOL_DOWN.hotkey,
    };

    public handlers = {
        PLAY_PAUSE: () => this.play(),
        FWD: () => this.fwd(),
        REWIND: () => this.rewind(),
    };

    constructor(props: MediaBarProps) {
        super(props);
        this.state = {
            mediaInfo: {
                song: "A More Perfect Union",
                album: "The Monitor",
                artist: "Titus Andronicus",
                cover: "https://upload.wikimedia.org/wikipedia/en/6/68/Titus_andronicus_The_Monitor_album_cover.jpg",
            },
        };
    }

    play = () => { console.log("play") }

    fwd = () => { console.log("fwd") }

    rewind = () => { console.log("rewind") }

    render = () => {
        return (
            <GlobalHotKeys keyMap={this.keyMap} handlers={this.handlers}>
                <Card className={classNames("media-bar-sticky")} elevation={Elevation.FOUR}>
                    <div className="media-bar-container">
                        <Button icon={<Icon icon={IconNames.PROPERTIES} iconSize={20} />} large className={Classes.ELEVATION_2} />
                        <Navbar.Divider className="tall-divider" />
                        <div className="media-bar-song-info">
                            <div className="media-bar-albumart-container">
                                <AlbumArt
                                    className="media-bar-albumart"
                                    url={this.state.mediaInfo.cover} />
                            </div>
                            <div className="media-bar-titles">
                                <Text>
                                    <Text ellipsize className={ExtClasses.TEXT_LARGER}>{this.state.mediaInfo.song}</Text>
                                    <span className={Classes.TEXT_MUTED}>from</span>
                                    <span>&nbsp;{this.state.mediaInfo.album}</span>
                                    <span className={Classes.TEXT_MUTED}>&nbsp;by</span>
                                    <span>&nbsp;{this.state.mediaInfo.artist}</span>
                                </Text>
                            </div>
                        </div>
                        <Navbar.Divider className="tall-divider" />
                        <div className="media-bar-controls">
                            <div>
                                <Button icon={<Icon icon={IconNames.FAST_BACKWARD} iconSize={20} />} large className={Classes.ELEVATION_2} />
                            </div>
                            <div>
                                <Button icon={<Icon icon={IconNames.PLAY} iconSize={35} />} className={classNames(Classes.ELEVATION_2, "media-bar-button")} />
                            </div>
                            <div>
                                <Button icon={<Icon icon={IconNames.FAST_FORWARD} iconSize={20} />} large className={Classes.ELEVATION_2} />
                            </div>
                        </div>
                        <Navbar.Divider className="tall-divider" />
                        <div className="media-bar-progress">
                            <div className="media-bar-timer">
                                <span className={classNames("number", ExtClasses.TEXT_LARGER_2)}>00:00:00.000</span>
                            </div>
                            <div className="media-bar-progress-bar">
                                <div className={classNames("progress-start", Classes.TEXT_DISABLED, Classes.TEXT_SMALL, "number")}>0:00</div>
                                <div className="progressbar">
                                    <Slider min={0} max={100} labelRenderer={false} value={50} />
                                </div>
                                <div className={classNames("progress-end", Classes.TEXT_DISABLED, Classes.TEXT_SMALL, "number")}>5:00</div>
                            </div>
                        </div>
                        <Navbar.Divider className="tall-divider" />
                        <div className="volume">
                            <Icon icon={IconNames.VOLUME_UP} />
                            <div>
                                <Slider className="volume-slider" min={0} max={100} labelRenderer={false} value={50} />
                            </div>
                        </div>
                        <div className="more-button">
                            <Button icon={<Icon icon={IconNames.CHEVRON_UP} iconSize={20} />} large className={Classes.ELEVATION_2} />
                        </div>
                    </div>
                </Card>
            </GlobalHotKeys>
        )
    }
}

type AlbumArtProps = {
    url?: string;
    className?: string;
}

// we can use children even though we haven't defined them in our CardProps
export const AlbumArt: FunctionComponent<AlbumArtProps> = (props: AlbumArtProps) => (
    <aside className={props.className}>
        <Card interactive elevation={Elevation.TWO} className="album-art-card">
            <img src={props.url} alt="album art" width="100%" height="100%" />
        </Card>
    </aside>
);

export default MediaBar;
