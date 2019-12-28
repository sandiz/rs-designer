import React, { FunctionComponent, RefObject, Suspense } from 'react'
import {
    Navbar, Elevation, Card, Classes, Text, Icon,
    MenuItem, Popover, Position, Menu,
} from '@blueprintjs/core';
import { GlobalHotKeys } from 'react-hotkeys';
import { IconNames } from "@blueprintjs/icons";
import classNames from 'classnames';

import * as PATH from 'path'
import {
    ExtClasses, MEDIA_STATE, VOLUME, PRODUCT_ADVANCED,
} from '../../types/base';
import {
    HotkeyInfo, HotKeyState, HotKeyComponent,
} from '../../types/hotkey';
import {
    MediaInfo,
} from '../../types/media';
import SliderExtended, { CardExtended, ButtonExtended } from '../Extended/FadeoutSlider';

import './MediaController.scss';
import * as nothumb from '../../assets/nothumb.jpg'
import ProjectService, { ProjectUpdateType } from '../../services/project';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import {
    readFile, sec2time, base64ImageData, setStateAsync,
} from '../../lib/utils';
import MediaPlayerService from '../../services/mediaplayer';
import { getImportUrlDialog, getMetadataEditorDialog } from '../../dialogs';

const MediaAdvanced = React.lazy(() => import('../MediaAdvanced/MediaAdvanced'));
const { app } = window.require('electron').remote;
const { ipcRenderer } = window.require("electron");

const path: typeof PATH = window.require('path');
const { platform } = window.require('os');
const isWin = platform() === "win32";
const isMac = platform() === "darwin";


interface MediaBarState extends HotKeyState {
    mediaInfo: MediaInfo | null;
    settingsMenu: React.ReactElement | null;
    recentMenu: JSX.Element[];
    mediaState: MEDIA_STATE;
    duration: number;
    showAdvanced: boolean;
}

class MediaController extends HotKeyComponent<{}, MediaBarState> {
    public keyMap = {
        PLAY_PAUSE: HotkeyInfo.PLAY_PAUSE.hotkey,
        FWD: HotkeyInfo.FWD.hotkey,
        REWIND: HotkeyInfo.REWIND.hotkey,
        STOP: HotkeyInfo.STOP.hotkey,
        VOL_UP: HotkeyInfo.VOL_UP.hotkey,
        VOL_DOWN: HotkeyInfo.VOL_DOWN.hotkey,
        OPEN_PROJECT: HotkeyInfo.OPEN_PROJECT.hotkey,
        SAVE_PROJECT: HotkeyInfo.SAVE_PROJECT.hotkey,
        OPEN_LAST_PROJECT: HotkeyInfo.OPEN_LAST_PROJECT.hotkey,
        CLOSE_PROJECT: HotkeyInfo.CLOSE_PROJECT.hotkey,
        IMPORT_MEDIA: HotkeyInfo.IMPORT_MEDIA.hotkey,
        MEDIA_ADVANCED: HotkeyInfo.MEDIA_ADVANCED.hotkey,
    };

    public handlers = {
        PLAY_PAUSE: () => this.play(),
        FWD: () => this.fwd(),
        REWIND: () => this.rewind(),
        STOP: () => this.stop(),
        VOL_UP: () => this.volUp(),
        VOL_DOWN: () => this.volDown(),
        OPEN_PROJECT: () => this.kbdProxy(() => this.openProject(null)),
        SAVE_PROJECT: () => this.kbdProxy(() => this.saveProject()),
        OPEN_LAST_PROJECT: () => this.kbdProxy(() => this.openLastProject()),
        CLOSE_PROJECT: () => this.kbdProxy(() => this.closeProject()),
        IMPORT_MEDIA: () => this.kbdProxy(() => this.importMedia(null)),
        MEDIA_ADVANCED: () => this.kbdProxy(() => this.showAdvanced()),
    };

    private timer: number | null = null;
    private ProgressTimerRef: RefObject<HTMLDivElement> = React.createRef();
    constructor(props: {}) {
        super(props);
        const b = {
            mediaInfo: null,
            settingsMenu: null,
            recentMenu: [],
            duration: 0,
            mediaState: MEDIA_STATE.STOPPED,
            isHKEnabled: true,
            showAdvanced: false,
        };
        this.state = { ...super.getInitialState(), ...b };
        DispatcherService.on(DispatchEvents.ProjectUpdated, this.projectUpdated);
        DispatcherService.on(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.on(DispatchEvents.ProjectClosed, this.projectClosed);
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.on(DispatchEvents.MediaFinishedPlaying, this.stop);
        DispatcherService.on(DispatchEvents.MediaStartedPlaying, this._set_media_playing);
        DispatcherService.on(DispatchEvents.MediaWasPaused, this._set_media_paused);
    }

    componentDidMount = async () => {
        super._componentDidMount();
        await this.recentsMenu();
        await this.settingsMenu();
    }

    componentWillUnmount() {
        super._componentWillUnmount();
        DispatcherService.off(DispatchEvents.ProjectUpdated, this.projectUpdated);
        DispatcherService.off(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.off(DispatchEvents.ProjectClosed, this.projectClosed)
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.off(DispatchEvents.MediaFinishedPlaying, this.stop);
        DispatcherService.off(DispatchEvents.MediaStartedPlaying, this._set_media_playing);
        DispatcherService.off(DispatchEvents.MediaWasPaused, this._set_media_paused);
    }

    stop = (): void => {
        MediaPlayerService.seekTo(0);
        MediaPlayerService.stop();
        this.progressUpdate();
        this.setState({ mediaState: MEDIA_STATE.STOPPED });
    }

    _set_media_playing = () => this.setState({ mediaState: MEDIA_STATE.PLAYING });
    _set_media_paused = () => this.setState({ mediaState: MEDIA_STATE.PAUSED });

    volUp = () => MediaPlayerService.increaseVolume();

    volDown = () => MediaPlayerService.decreaseVolume();

    play = async (): Promise<void> => {
        await MediaPlayerService.playPause();
        if (MediaPlayerService.isPlaying()) this._set_media_playing()
        else this._set_media_paused();
    }

    fwd = (): void => MediaPlayerService.ffwd();

    rewind = (): void => MediaPlayerService.rewind();

    clearRecents = async () => {
        await ProjectService.clearRecents();
        await this.settingsMenu();
    }

    importMedia = (external: string | null) => {
        this.stop();
        DispatcherService.dispatch(DispatchEvents.ImportMedia, external);
    }

    importURL = () => {
        DispatcherService.dispatch(DispatchEvents.OpenDialog,
            getImportUrlDialog());
    }

    metadataEdit = () => {
        DispatcherService.dispatch(DispatchEvents.OpenDialog,
            getMetadataEditorDialog());
    }

    openLastProject = () => {
        this.stop();
        ProjectService.openLastProject();
    }

    openProject = (external: string | null) => {
        this.stop();
        DispatcherService.dispatch(DispatchEvents.ProjectOpen, external);
    }

    projectOpened = () => {
        this.settingsMenu();
    }

    closeProject = () => {
        this.stop();
        DispatcherService.dispatch(DispatchEvents.ProjectClose);
    }

    projectClosed = () => {
        this.setState({ mediaInfo: null });
        this.settingsMenu();
    }

    saveProject = () => {
        DispatcherService.dispatch(DispatchEvents.ProjectSave);
    }

    projectUpdated = async (data: unknown) => {
        /* update media bar state with metadata, when external-files-update is complete*/
        if (typeof data === 'string'
            && (data === ProjectUpdateType.ExternalFilesUpdate
                || data === ProjectUpdateType.MediaInfoUpdated)) {
            const mm = await ProjectService.readMetadata();
            if (mm) {
                const mediaInfo: MediaInfo = {
                    song: mm.song.length === 0 ? "-" : mm.song,
                    artist: mm.artist.length === 0 ? "-" : mm.artist,
                    album: mm.album.length === 0 ? "-" : mm.album,
                    image: mm.image,
                    year: mm.year,
                }
                this.setState({ mediaInfo });
            }
        }
        this.settingsMenu();
    }

    mediaReady = () => {
        console.log("media-ready");
        this.setState({
            mediaState: MEDIA_STATE.STOPPED, duration: MediaPlayerService.getDuration(),
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
            mediaInfo: null, mediaState: MEDIA_STATE.STOPPED, duration: 0,
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

    showAdvanced = () => {
        this.setState(prevState => ({
            showAdvanced: !prevState.showAdvanced,
        }));
    }

    QUIT = () => {
        if (ProjectService.isProjectLoaded()) {
            this.saveProject();
        }
        app.quit();
    }

    getMenuItemText = (text: string) => {
        return (
            <div className="menuitem">
                <span>{text}</span>
                {
                    //   <span className="menuitem-hotkey">{getHotkey(hotkey)}</span>
                }
            </div>
        );
    }

    recentsMenu = async () => {
        const recents = await ProjectService.getRecents();
        const map = recents.map(async (item) => {
            const mmFile = item.metadata;
            const pathInfo = path.parse(mmFile);
            const dirName = path.basename(pathInfo.dir);
            let text = "";
            let json: MediaInfo | null = null;
            try {
                const data = await readFile(item.metadata);
                json = JSON.parse(data.toString());
                if (json) {
                    text = `${json.artist} - ${json.song} [${dirName}]`;
                }
            }
            catch (e) {
                text = `[${dirName}]`;
            }
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
                    text={(
                        <Text ellipsize className="recent-text">
                            {text}
                        </Text>
                    )}
                    icon={
                        json
                            ? (
                                <img className="recent-image" alt="cover art" src={json.image === '' ? nothumb.default : base64ImageData(json.image)} width={25} height={25} />
                            )
                            : IconNames.DOCUMENT
                    }
                    title={pathInfo.dir}
                    onClick={() => this.openProject(projectName)}
                />
            );
        });
        const recentMenu = await Promise.all(map);
        await setStateAsync(this, { recentMenu });
    }

    settingsMenu = async () => {
        await this.recentsMenu();
        const { recentMenu } = this.state;
        const menu = (
            <Menu large>
                <MenuItem
                    text={this.getMenuItemText("Open Project")}
                    icon={IconNames.FOLDER_OPEN}
                    onClick={() => this.openProject(null)}
                />
                <MenuItem
                    text={this.getMenuItemText("Save Project")}
                    icon={IconNames.DOWNLOAD}
                    disabled={this.state.mediaInfo === null}
                    onClick={this.saveProject} />
                <MenuItem
                    text={this.getMenuItemText("Close Project")}
                    disabled={this.state.mediaInfo === null}
                    icon={IconNames.FOLDER_CLOSE}
                    onClick={this.closeProject} />
                <Menu.Divider />
                <MenuItem
                    text={this.getMenuItemText(`[ ${PRODUCT_ADVANCED} ]`)}
                    icon={IconNames.LAYOUT_AUTO}
                    onClick={this.showAdvanced} />
                <MenuItem
                    text="Recent Projects"
                    icon={IconNames.HISTORY}
                    disabled={recentMenu.length === 0}
                    popoverProps={{ openOnTargetFocus: false }}
                >
                    {
                        recentMenu.length > 0
                            ? (
                                <React.Fragment>
                                    {recentMenu}
                                    <Menu.Divider />
                                    <MenuItem text="Clear Recents" icon={IconNames.TRASH} onClick={this.clearRecents} />
                                </React.Fragment>
                            )
                            : null
                    }
                </MenuItem>
                <MenuItem
                    text="Import Media"
                    icon={IconNames.IMPORT}
                    popoverProps={{ openOnTargetFocus: false }}
                >
                    <MenuItem text="from Local File" icon={IconNames.DOWNLOAD} onClick={() => this.importMedia(null)} />
                    <MenuItem
                        text="from URL"
                        icon={IconNames.CLOUD}
                        onClick={this.importURL} />
                </MenuItem>
                <Menu.Divider />
                <MenuItem text="Settings" icon={IconNames.SETTINGS} />
                <MenuItem text="Quit" icon={IconNames.POWER} onClick={this.QUIT} />
            </Menu>
        );
        this.setState({ settingsMenu: menu });
    }

    sideWindow = (): void => {
        ipcRenderer.send('open-mi-window');
        this.setState({ showAdvanced: false });
    }

    render = () => {
        const c = (
            <React.Fragment>
                <GlobalHotKeys keyMap={this.keyMap} handlers={this.handlers} />
                <Suspense fallback={<div>Loading...</div>}>
                    <MediaAdvanced isOpen={this.state.showAdvanced} isPopout={false} popoutFunc={this.sideWindow} />
                </Suspense>
                <CardExtended className={classNames("media-bar-sticky")} elevation={Elevation.FOUR}>
                    <div className="media-bar-container">
                        <Popover content={this.state.settingsMenu ? this.state.settingsMenu : undefined} position={Position.TOP}>
                            <ButtonExtended icon={<Icon icon={IconNames.PROPERTIES} iconSize={20} />} large className={Classes.ELEVATION_2} />
                        </Popover>
                        <Navbar.Divider className="tall-divider" />

                        <div className="media-bar-song-info">
                            <div className="media-bar-albumart-container">
                                <AlbumArt
                                    onClick={this.metadataEdit}
                                    className="media-bar-albumart"
                                    url={this.state.mediaInfo ? base64ImageData(this.state.mediaInfo.image) : ''} />
                            </div>
                            <div className="media-bar-titles">
                                {
                                    this.state.mediaInfo
                                        ? (
                                            <Text>
                                                <Text ellipsize className={ExtClasses.TEXT_LARGER}>{this.state.mediaInfo.song}</Text>
                                                <Text>
                                                    <span className={Classes.TEXT_MUTED}>from</span>
                                                    <span>&nbsp;{this.state.mediaInfo.album}</span>
                                                    <span className={Classes.TEXT_MUTED}>&nbsp;by</span>
                                                    <span>&nbsp;{this.state.mediaInfo.artist}</span>
                                                </Text>
                                            </Text>
                                        )
                                        : (
                                            <Text>No Project Opened</Text>
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
                                        stepSize={1}
                                        timerSource={MediaPlayerService.getCurrentTime}
                                        min={0}
                                        max={this.state.duration === 0 ? 100 : this.state.duration}
                                        labelRenderer={false}
                                        dragStart={(v: number) => MediaPlayerService.seekTo(v / MediaPlayerService.getDuration())}
                                        dragEnd={(v: number) => MediaPlayerService.seekTo(v / MediaPlayerService.getDuration())}
                                    />
                                </div>
                                <div className={classNames("progress-end", Classes.TEXT_DISABLED, Classes.TEXT_SMALL, "number")}>{sec2time(this.state.duration)}</div>
                            </div>
                        </div>
                        <Navbar.Divider className="tall-divider" />

                        <div className="volume">
                            <Icon icon={IconNames.VOLUME_UP} />
                            <div>
                                <SliderExtended
                                    stepSize={1 / 100}
                                    timerSource={MediaPlayerService.getVolume}
                                    className="volume-slider"
                                    min={VOLUME.MIN}
                                    max={VOLUME.MAX}
                                    labelRenderer={false}
                                    drag={(v: number) => MediaPlayerService.setVolume(v)}
                                    dragStart={(v: number) => MediaPlayerService.setVolume(v)}
                                    dragEnd={(v: number) => MediaPlayerService.setVolume(v)}
                                />
                            </div>
                        </div>
                        <div className="more-button">
                            <ButtonExtended
                                active={this.state.showAdvanced}
                                onClick={this.showAdvanced}
                                icon={<Icon icon={this.state.showAdvanced ? IconNames.CHEVRON_DOWN : IconNames.CHEVRON_UP} iconSize={20} />}
                                large
                                className={Classes.ELEVATION_2}
                            />
                        </div>
                    </div>
                </CardExtended>
            </React.Fragment>
        );
        return c;
    }
}

type AlbumArtProps = {
    url?: string;
    className?: string;
    onClick?(): void;
    interactive?: boolean;
}

// we can use children even though we haven't defined them in our CardProps
export const AlbumArt: FunctionComponent<AlbumArtProps> = (props: AlbumArtProps) => (
    <div className={props.className}>
        <Card interactive={typeof (props.interactive) !== 'undefined' ? props.interactive : true} elevation={Elevation.TWO} className="album-art-card" onClick={props.onClick}>
            <img src={props.url === "" ? nothumb.default : props.url} alt="album art" width="100%" height="100%" />
        </Card>
    </div>
);

export default MediaController;
