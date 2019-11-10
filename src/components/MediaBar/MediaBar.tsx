import React, { Component, FunctionComponent } from 'react'
import {
    Navbar, Button, Elevation, Card, Classes, Text, Icon,
    MenuItem, Popover, Position, Menu,
} from '@blueprintjs/core';
import { GlobalHotKeys } from 'react-hotkeys';
import { IconNames } from "@blueprintjs/icons";
import classNames from 'classnames';
import {
    ExtClasses, MediaInfo, ProjectInfo, HotkeyInfo,
} from '../../types';
import FadeOutSlider from '../Extended/FadeoutSlider';

import './MediaBar.scss'
import * as nothumb from '../../assets/nothumb.jpg'
import { ProjectService } from '../../singletons';

interface MediaBarState {
    mediaInfo?: MediaInfo;
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
            /*
            mediaInfo: {
                song: "A More Perfect Union",
                album: "The Monitor",
                artist: "Titus Andronicus",
                image: "https://upload.wikimedia.org/wikipedia/en/6/68/Titus_andronicus_The_Monitor_album_cover.jpg",
            },
            */
        };
        console.log(ProjectService);
    }

    play = (): void => { console.log("play") }

    fwd = (): void => { console.log("fwd") }

    rewind = (): void => { console.log("rewind") }

    settingsMenu = (): React.ReactElement => {
        return (
            <Menu>
                <MenuItem text="Open Project" icon={IconNames.FOLDER_OPEN} />
                <MenuItem text="Close Project" disabled icon={IconNames.FOLDER_CLOSE} />
                <MenuItem text="Import Media" icon={IconNames.IMPORT}>
                    <MenuItem text="from Local File" icon={IconNames.DOWNLOAD} />
                    <MenuItem text="from URL" icon={IconNames.CLOUD} />
                </MenuItem>
                <MenuItem text="Recent Files" icon={IconNames.HISTORY}>
                    {

                    }
                </MenuItem>
                <Menu.Divider />
                <MenuItem text="Settings" icon={IconNames.SETTINGS} />
                <MenuItem text="Quit" icon={IconNames.POWER} />
            </Menu>
        );
    }

    render = (): React.ReactElement => {
        return (
            <GlobalHotKeys keyMap={this.keyMap} handlers={this.handlers}>
                <Card className={classNames("media-bar-sticky")} elevation={Elevation.FOUR}>
                    <div className="media-bar-container">
                        <Popover content={this.settingsMenu()} position={Position.TOP}>
                            <Button icon={<Icon icon={IconNames.PROPERTIES} iconSize={20} />} large className={Classes.ELEVATION_2} />
                        </Popover>
                        <Navbar.Divider className="tall-divider" />
                        <div className="media-bar-song-info">
                            <div className="media-bar-albumart-container">
                                <AlbumArt
                                    className="media-bar-albumart"
                                    url={this.state.mediaInfo ? this.state.mediaInfo.image : ''} />
                            </div>
                            <div className="media-bar-titles">
                                {
                                    this.state.mediaInfo
                                        ? (
                                            <Text>
                                                <Text ellipsize className={ExtClasses.TEXT_LARGER}>{this.state.mediaInfo.song}</Text>
                                                <span className={Classes.TEXT_MUTED}>from</span>
                                                <span>&nbsp;{this.state.mediaInfo.album}</span>
                                                <span className={Classes.TEXT_MUTED}>&nbsp;by</span>
                                                <span>&nbsp;{this.state.mediaInfo.artist}</span>
                                            </Text>
                                        )
                                        : (
                                            <Text>
                                                <Text ellipsize className={ExtClasses.TEXT_LARGER}>No Project Loaded</Text>
                                            </Text>
                                        )
                                }
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
                                    <FadeOutSlider min={0} max={100} labelRenderer={false} value={50} />
                                </div>
                                <div className={classNames("progress-end", Classes.TEXT_DISABLED, Classes.TEXT_SMALL, "number")}>5:00</div>
                            </div>
                        </div>
                        <Navbar.Divider className="tall-divider" />
                        <div className="volume">
                            <Icon icon={IconNames.VOLUME_UP} />
                            <div>
                                <FadeOutSlider className="volume-slider" min={0} max={100} labelRenderer={false} value={50} />
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
            <img src={props.url === "" ? nothumb.default : props.url} alt="album art" width="100%" height="100%" />
        </Card>
    </aside>
);

export default MediaBar;
