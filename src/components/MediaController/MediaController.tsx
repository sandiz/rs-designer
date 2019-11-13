import React, { Component, FunctionComponent, RefObject } from 'react'
import {
    Navbar, Elevation, Card, Classes, Text, Icon,
    MenuItem, Popover, Position, Menu,
} from '@blueprintjs/core';
import { GlobalHotKeys } from 'react-hotkeys';
import { IconNames } from "@blueprintjs/icons";
import classNames from 'classnames';

import * as PATH from 'path'
import {
    ExtClasses, MediaInfo, HotkeyInfo, MEDIA_STATE, VOLUME,
} from '../../types';
import SliderExtended, { CardExtended, ButtonExtended } from '../Extended/FadeoutSlider';

import './MediaController.scss';
import * as nothumb from '../../assets/nothumb.jpg'
import ProjectService, { ProjectUpdateType } from '../../services/project';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import { readFile, sec2time } from '../../lib/utils';
import MediaPlayerService from '../../services/mediaplayer';

const { app } = window.require('electron').remote;
const path: typeof PATH = window.require('path');
const { platform } = window.require('os');
const isWin = platform() === "win32";
const isMac = platform() === "darwin";


interface MediaBarState {
    mediaInfo: MediaInfo | null;
    settingsMenu: React.ReactElement | null;
    mediaState: MEDIA_STATE;
    volume: number;
    duration: number;
}

class MediaController extends Component<{}, MediaBarState> {
    public keyMap = {
        PLAY_PAUSE: HotkeyInfo.PLAY_PAUSE.hotkey,
        FWD: HotkeyInfo.FWD.hotkey,
        REWIND: HotkeyInfo.REWIND.hotkey,
        VOL_UP: HotkeyInfo.VOL_UP.hotkey,
        VOL_DOWN: HotkeyInfo.VOL_DOWN.hotkey,
        OPEN_PROJECT: HotkeyInfo.OPEN_PROJECT.hotkey,
        SAVE_PROJECT: HotkeyInfo.SAVE_PROJECT.hotkey,
        OPEN_LAST_PROJECT: HotkeyInfo.OPEN_LAST_PROJECT.hotkey,
        CLOSE_PROJECT: HotkeyInfo.CLOSE_PROJECT.hotkey,
    };

    public handlers = {
        PLAY_PAUSE: () => this.play(),
        FWD: () => this.fwd(),
        REWIND: () => this.rewind(),
        OPEN_PROJECT: () => this.openProject(null),
        SAVE_PROJECT: () => this.saveProject(),
        OPEN_LAST_PROJECT: () => this.openLastProject(),
        CLOSE_PROJECT: () => this.closeProject(),
    };
    private timer: number | null = null;
    private ProgressTimerRef: RefObject<HTMLDivElement> = React.createRef();
    constructor(props: {}) {
        super(props);
        this.state = {
            mediaInfo: null,
            settingsMenu: null,
            volume: MediaPlayerService.getVolume(),
            duration: 0,
            mediaState: MEDIA_STATE.STOPPED,
        };
        DispatcherService.on(DispatchEvents.ProjectUpdated, this.projectUpdated);
        DispatcherService.on(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.on(DispatchEvents.ProjectClosed, this.projectClosed);
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
    }

    componentDidMount = async () => {
        await this.settingsMenu();
    }

    componentWillUnmount() {
        DispatcherService.off(DispatchEvents.ProjectUpdated, this.projectUpdated);
        DispatcherService.off(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.off(DispatchEvents.ProjectClosed, this.projectClosed)
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
    }

    stop = (): void => {
        this.setState({ mediaState: MEDIA_STATE.STOPPED });
        MediaPlayerService.stop();
    }

    play = async (): Promise<void> => {
        await MediaPlayerService.playPause();
        if (MediaPlayerService.isPlaying()) {
            this.setState({ mediaState: MEDIA_STATE.PLAYING });
        }
        else {
            this.setState({ mediaState: MEDIA_STATE.PAUSED });
        }
    }

    fwd = (): void => MediaPlayerService.rewind()

    rewind = (): void => MediaPlayerService.ffwd()

    clearRecents = async () => {
        await ProjectService.clearRecents();
        await this.settingsMenu();
    }

    openLastProject = async () => {
        this.stop();
        await ProjectService.openLastProject();
    }

    openProject = async (external: string | null) => {
        this.stop();
        DispatcherService.dispatch(DispatchEvents.ProjectOpen, external);
    }

    projectOpened = async () => {
        await this.settingsMenu();
    }

    saveProject = async () => {
        DispatcherService.dispatch(DispatchEvents.ProjectSave);
    }

    closeProject = async () => {
        this.stop();
        DispatcherService.dispatch(DispatchEvents.ProjectClose);
    }

    projectClosed = async () => {
        this.setState({ mediaInfo: null });
        await this.settingsMenu();
    }

    projectUpdated = async (data: unknown) => {
        /* update media bar state with metadata, when external-files-update is complete*/
        if (typeof data === 'string' && data === ProjectUpdateType.ExternalFilesUpdate) {
            const mm = await ProjectService.readMetadata();
            if (mm) {
                const mediaInfo: MediaInfo = {
                    song: mm.song.length === 0 ? "-" : mm.song,
                    artist: mm.artist.length === 0 ? "-" : mm.artist,
                    album: mm.album.length === 0 ? "-" : mm.album,
                    image: 'data:image/jpeg;base64,' + mm.image,
                    year: mm.year,
                }
                this.setState({ mediaInfo });
            }
        }
        await this.settingsMenu();
    }

    mediaReady = () => {
        console.log("media-ready");
        this.setState({
            mediaState: MEDIA_STATE.STOPPED, duration: MediaPlayerService.getDuration(), volume: MediaPlayerService.getVolume(),
        });
        if (this.ProgressTimerRef.current) {
            this.ProgressTimerRef.current.innerText = sec2time(0, true);
        }
        if (this.timer) cancelAnimationFrame(this.timer);
        this.progressUpdate();
    }

    mediaReset = () => {
        console.log("media-reset");
        this.setState({
            mediaInfo: null, mediaState: MEDIA_STATE.STOPPED, duration: 0, volume: MediaPlayerService.getVolume(),
        });
        if (this.timer) cancelAnimationFrame(this.timer);
    }

    progressUpdate = () => {
        if (MediaPlayerService.wavesurfer && this.ProgressTimerRef.current) {
            const value = MediaPlayerService.wavesurfer.getCurrentTime();
            this.ProgressTimerRef.current.childNodes[0].nodeValue = sec2time(value, true);
        }
        this.timer = requestAnimationFrame(this.progressUpdate);
    }

    QUIT = () => {
        if (ProjectService.isProjectLoaded()) {
            this.saveProject();
        }
        app.quit();
    }

    settingsMenu = async () => {
        const recents = await ProjectService.getRecents();
        const map = recents.map(async (item) => {
            const mmFile = item.metadata;
            const pathInfo = path.parse(mmFile);
            const dirName = path.basename(pathInfo.dir);
            const data = await readFile(item.metadata);
            const json: MediaInfo = JSON.parse(data.toString());
            const text = `${json.artist} - ${json.song} [${dirName}]`;
            let projectName = "";
            if (isWin) {
                console.error("TODO: add windows support");
            }
            else if (isMac) {
                projectName = pathInfo.dir;
            }
            return (
                <MenuItem
                    key={item.media}
                    text={text}
                    icon={IconNames.DOCUMENT}
                    title={pathInfo.dir}
                    onClick={() => this.openProject(projectName)}
                />
            );
        });
        const recentMenu = await Promise.all(map);
        const menu = (
            <Menu large>
                <MenuItem text="Open Project" icon={IconNames.FOLDER_OPEN} onClick={() => this.openProject(null)} />
                <MenuItem text="Save Project" icon={IconNames.DOWNLOAD} disabled={this.state.mediaInfo === null} onClick={this.saveProject} />
                <MenuItem text="Close Project" disabled={this.state.mediaInfo === null} icon={IconNames.FOLDER_CLOSE} onClick={this.closeProject} />
                <Menu.Divider />
                <MenuItem text="Recent Projects" icon={IconNames.HISTORY}>
                    {
                        recents.length > 0
                            ? recentMenu
                            : null
                    }
                    {
                        recents.length > 0
                            ? (
                                <React.Fragment>
                                    <Menu.Divider />
                                    <MenuItem text="Clear Recents" icon={IconNames.TRASH} onClick={this.clearRecents} />
                                </React.Fragment>
                            )
                            : null
                    }
                </MenuItem>
                <MenuItem text="Import Media" icon={IconNames.IMPORT}>
                    <MenuItem text="from Local File" icon={IconNames.DOWNLOAD} />
                    <MenuItem text="from URL" icon={IconNames.CLOUD} />
                </MenuItem>
                <Menu.Divider />
                <MenuItem text="Settings" icon={IconNames.SETTINGS} />
                <MenuItem text="Quit" icon={IconNames.POWER} onClick={this.QUIT} />
            </Menu>
        );
        this.setState({ settingsMenu: menu });
    }

    render = () => {
        return (
            <GlobalHotKeys keyMap={this.keyMap} handlers={this.handlers}>
                <CardExtended className={classNames("media-bar-sticky")} elevation={Elevation.FOUR}>
                    <div className="media-bar-container">
                        <Popover content={this.state.settingsMenu ? this.state.settingsMenu : undefined} position={Position.TOP}>
                            <ButtonExtended icon={<Icon icon={IconNames.PROPERTIES} iconSize={20} />} large className={Classes.ELEVATION_2} />
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
                                                <Text ellipsize>No Project Opened</Text>
                                            </Text>
                                        )
                                }
                            </div>
                        </div>
                        <Navbar.Divider className="tall-divider" />
                        <div className="media-bar-controls">
                            <div>
                                <ButtonExtended icon={<Icon icon={IconNames.FAST_BACKWARD} iconSize={20} />} large className={Classes.ELEVATION_2} onClick={this.rewind} />
                            </div>
                            <div>
                                <ButtonExtended
                                    type="button"
                                    active={this.state.mediaState === MEDIA_STATE.PLAYING}
                                    icon={(
                                        <Icon
                                            icon={this.state.mediaState === MEDIA_STATE.PLAYING ? IconNames.PAUSE : IconNames.PLAY}
                                            iconSize={35} />
                                    )}
                                    className={classNames(Classes.ELEVATION_2, "media-bar-button")}
                                    onClick={this.play}
                                />
                            </div>
                            <div>
                                <ButtonExtended icon={<Icon icon={IconNames.FAST_FORWARD} iconSize={20} />} large className={Classes.ELEVATION_2} onClick={this.fwd} />
                            </div>
                        </div>
                        <Navbar.Divider className="tall-divider" />
                        <div className="media-bar-progress">
                            <div className="media-bar-timer">
                                <div
                                    id="progress-time"
                                    ref={this.ProgressTimerRef}
                                    className={classNames("number", ExtClasses.TEXT_LARGER_2, "progress-time")}>
                                    00:00.000
                                </div>
                            </div>
                            <div className="media-bar-progress-bar">
                                <div className={classNames("progress-start", Classes.TEXT_DISABLED, Classes.TEXT_SMALL, "number")}>00:00</div>
                                <div className="progressbar">
                                    <SliderExtended
                                        timerSource={MediaPlayerService.getCurrentTime}
                                        min={0}
                                        max={this.state.duration === 0 ? 100 : this.state.duration}
                                        labelRenderer={false}
                                    />
                                </div>
                                <div className={classNames("progress-end", Classes.TEXT_DISABLED, Classes.TEXT_SMALL, "number")}>{sec2time(this.state.duration)}</div>
                            </div>
                        </div>
                        <Navbar.Divider className="tall-divider" />
                        <div className="volume">
                            <Icon icon={IconNames.VOLUME_UP} />
                            <div>
                                <SliderExtended className="volume-slider" min={VOLUME.MIN} max={VOLUME.MAX} labelRenderer={false} value={this.state.volume} />
                            </div>
                        </div>
                        <div className="more-button">
                            <ButtonExtended icon={<Icon icon={IconNames.CHEVRON_UP} iconSize={20} />} large className={Classes.ELEVATION_2} />
                        </div>
                    </div>
                </CardExtended>
            </GlobalHotKeys>
        );
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

export default MediaController;
