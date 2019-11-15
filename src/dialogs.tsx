import React, { RefObject } from 'react';
import { IconNames } from '@blueprintjs/icons';
import { getApplicationKeyMap, ApplicationKeyMap, KeyMapDisplayOptions } from 'react-hotkeys';
import {
    Text, Classes, KeyCombo, Tabs, Tab, InputGroup, Intent, Button, Spinner, Icon, Callout, ControlGroup, Checkbox, Tooltip,
} from '@blueprintjs/core';
import classNames from 'classnames';
import { ChildProcess } from 'child_process';
import * as YTDL from 'youtube-dl';
import {
    HotkeyInfo, ExtClasses, DialogContent, os, youtube, path, spawn,
} from './types';
import './dialogs.scss'
import { DispatcherService, DispatchEvents } from './services/dispatcher';

const isWin = os.platform() === "win32";
const isMac = os.platform() === "darwin";
const { shell, app } = window.require("electron").remote;

export const youtubedl = window.require("youtube-dl");

type keyMapType = {
    [key: string]: KeyMapDisplayOptions;
}
type groupKeymapType = {
    [key: string]: keyMapType;
};

/* HotKey Dialog */
const getKeymapGroups = (keyMap: ApplicationKeyMap) => {
    const groups: groupKeymapType = {};
    Object.keys(keyMap).forEach((key) => {
        if (key in HotkeyInfo) {
            const i = HotkeyInfo[key];
            const obj: { [key: string]: KeyMapDisplayOptions } = {}
            obj[key] = keyMap[key];
            if (i.group) {
                if (!(i.group in groups)) {
                    groups[i.group] = {};
                }
                groups[i.group][key] = keyMap[key];
            }
            else {
                if (!("general" in groups)) {
                    groups.general = {}
                }
                groups.general[key] = keyMap[key];
            }
        }
    });
    return groups;
}

const getKeyMapForGroup = (group: string, km: keyMapType) => {
    return (
        <div key={group}>
            {
                Object.keys(km).map((actionName) => {
                    const { sequences, name } = km[actionName];
                    return (
                        <div key={name || actionName} className={Classes.HOTKEY}>
                            <div className={Classes.HOTKEY_LABEL}>
                                {HotkeyInfo[actionName].info}
                            </div>
                            <span className={Classes.KEY_COMBO}>
                                {
                                    sequences.map(({ sequence }) => {
                                        let s = null;
                                        if (typeof sequence === 'string') s = sequence;
                                        else s = sequence.join();
                                        if (s.includes("ctrl")) {
                                            if (isWin) {
                                                return <KeyCombo key={s} combo={s} />
                                            }
                                        }
                                        else if (s.includes("command")) {
                                            if (isMac) {
                                                return <KeyCombo key={s} combo={s} />
                                            }
                                        }
                                        else {
                                            return <KeyCombo key={s} combo={s} />
                                        }
                                        return null;
                                    })
                                }
                            </span>
                        </div>
                    );
                })
            }
        </div>
    );
}

export const getHotkeyDialog = (): DialogContent => {
    const keyMap: ApplicationKeyMap = getApplicationKeyMap();
    const groups = getKeymapGroups(keyMap);

    const content = (
        <React.Fragment>
            <div className={classNames(Classes.DIALOG_BODY)}>
                <div className={classNames(Classes.HOTKEY_COLUMN, "dialog-body")}>

                    <Tabs key="tabs" id="tabs">
                        {
                            Object.keys(groups).map((group: string) => {
                                const km = groups[group];
                                console.log(group, Object.keys(km).length);
                                return (
                                    <Tab
                                        key={group}
                                        id={group}
                                        title={group.toLocaleUpperCase()}
                                        panel={getKeyMapForGroup(group, km)}
                                    />
                                );
                            })
                        }
                    </Tabs>
                </div>
            </div>
        </React.Fragment>
    );
    const text = (
        <Text className={classNames(ExtClasses.TEXT_LARGER, Classes.HEADING, "font-weight-unset", "dialog-header")}>
            Global Hotkeys
        </Text>
    );
    return {
        content,
        text,
        icon: IconNames.KEY_COMMAND,
        class: Classes.HOTKEY_DIALOG,
        canEscapeKeyClose: true,
        canOutsideClickClose: false,
        onClose: (): void => { },
    }
}

/* Import URL Dialog */
interface ImportURLDialogState {
    url: string;
    downloading: boolean;
    searching: boolean;
    metadata: YTDLInfoExtended | null;
    message: {
        text: string | React.ReactNode;
        intent: Intent;
    };
    embed: {
        metadata: boolean;
        thumbnail: boolean;
    };
}

interface ImportURLDialogProps {
    ref: RefObject<ImportURLDialog>;
}

interface YTDLInfoExtended extends YTDL.Info {
    thumbnail: string | null;
    artist: string | null;
    album: string | null;
    title: string | null;
    track: string | null;
    filesize: number;
}

const defaultMsg = {
    text: "Powered by Youtube-DL",
    intent: Intent.PRIMARY,
}
export class ImportURLDialog extends React.Component<ImportURLDialogProps, ImportURLDialogState> {
    private video: ChildProcess | null = null;
    private position = 0;
    private downloadedFile = "";

    constructor(props: ImportURLDialogProps) {
        super(props);
        this.state = {
            url: "",
            downloading: false,
            searching: false,
            metadata: null,
            message: { ...defaultMsg },
            embed: {
                metadata: true,
                thumbnail: true,
            },
        };
    }

    componentDidMount = () => {
    }

    onChange = (e: React.FormEventHandler<HTMLElement> & React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ url: e.target.value });
    }

    onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.keyCode === 13) this.youtubeDLSearch();
    }

    onEmbedThumb = (e: React.FormEvent<HTMLInputElement>) => {
        this.setState({
            embed: {
                thumbnail: e.currentTarget.checked,
                metadata: this.state.embed.metadata,
            },
        });
    }

    onEmbedMetadata = (e: React.FormEvent<HTMLInputElement>) => {
        this.setState({
            embed: {
                thumbnail: this.state.embed.thumbnail,
                metadata: e.currentTarget.checked,
            },
        });
    }

    youtubeDLSearch = () => {
        this.setState({ searching: true, metadata: null })
        this.getYTMetadata();
    }

    getYTMetadata = async () => {
        const _d = (): Promise<YTDLInfoExtended> => new Promise((resolve, reject) => {
            youtube.getInfo(this.state.url, (err, files) => {
                if (err) reject(err);
                else resolve(files as YTDLInfoExtended);
            })
        });

        try {
            this.setState({
                message: {
                    text: "Verifying URL",
                    intent: Intent.PRIMARY,
                },
            });
            const info: YTDLInfoExtended = await _d();
            if (info) {
                this.setState({
                    metadata: info,
                    searching: false,
                    message: {
                        text: "Valid URL",
                        intent: Intent.SUCCESS,
                    },
                });
            }
        }
        catch (e) {
            this.setState({
                metadata: null,
                searching: false,
                message: {
                    text: "Failed to verify url",
                    intent: Intent.DANGER,
                },
            });
        }
    }

    getDownloadMessage = (msg: string, percent: string, size: string) => {
        return (
            <div style={{ display: 'flex' }}>
                <Text className="message">{msg} ({size} mb)</Text>
                {
                    percent !== "0"
                        ? <div className="percent">{percent} %</div>
                        : null
                }
            </div>
        )
    }

    cancelDownload = () => {
        if (this.video) {
            this.video.kill();
            this._on_video_error(new Error("cancelled"));
        }
    }

    _on_video_error = (err: Error) => {
        console.log("youtubedl-error", err.message);
        this.setState({
            downloading: false,
            searching: false,
            message: {
                text: err.message,
                intent: Intent.DANGER,
            },
        });
    }
    _on_video_end = () => {
        this.setState({
            downloading: false,
            message: {
                text: this.state.message.text + "[meend] Download finished \n[meend] Starting import",
                intent: Intent.SUCCESS,
            },
        });
        console.log("file to import", this.downloadedFile);
        DispatcherService.dispatch(DispatchEvents.ImportMedia, this.downloadedFile);
        DispatcherService.dispatch(DispatchEvents.CloseDialog);
    }

    startDownload = async () => {
        this.setState({
            downloading: true,
            message: {
                text: this.getDownloadMessage("Downloading Audio from URL", "0", this.state.metadata ? ((this.state.metadata.filesize / (1024 * 1024)).toFixed(2)) : "0"),
                intent: Intent.PRIMARY,
            },
        });
        const tmp = app.getPath("temp");
        this.downloadedFile = path.join(tmp, "meend-download-media.mp3")
        const template = path.join(tmp, "meend-download-media.%(ext)s")
        const options = [
            "--extract-audio", "--audio-format", "mp3",
            "--audio-quality", "0", "--newline",
            "-o", `"${template}"`, `"${this.state.url}"`,
        ];
        if (this.state.embed.metadata) options.unshift("--add-metadata");
        if (this.state.embed.thumbnail) options.unshift("--embed-thumbnail");
        const binary = youtubedl.getYtdlBinary();
        this.video = spawn.spawn(
            binary,
            options,
            {
                detached: true,
                windowsHide: true,
                shell: true,
            },
        );
        let messageLog = ""
        if (this.video) {
            if (this.video.stdout) {
                this.video.stdout.on('data', (data: Buffer) => {
                    const s: string = data.toString();
                    messageLog += (s);
                    this.setState({
                        message: {
                            text: messageLog,
                            intent: Intent.PRIMARY,
                        },
                    });
                });
            }

            this.video.on('close', (code: number) => {
                if (code === 0) {
                    this._on_video_end();
                }
            });

            this.video.on('error', (err: Error) => {
                this._on_video_error(err);
            });
        }
        else {
            this._on_video_error(new Error("failed to create child process"));
        }
    };

    render = () => {
        return (
            <React.Fragment>
                <div className={classNames(Classes.DIALOG_BODY)}>
                    <div className={classNames(Classes.HOTKEY_COLUMN, "dialog-body")}>
                        <Text className="import-url-supported-sites">
                            <a onClick={() => shell.openExternal("https://github.com/ytdl-org/youtube-dl/blob/master/docs/supportedsites.md")}>
                                Supported Websites
                            </a>
                        </Text>
                        <div className="import-url-search-bar" style={{ marginTop: "1vh" }}>
                            <InputGroup
                                disabled={this.state.downloading || this.state.searching}
                                autoFocus
                                value={this.state.url}
                                onChange={this.onChange}
                                large
                                fill
                                intent={Intent.PRIMARY}
                                leftIcon={IconNames.VIDEO}
                                placeholder="Enter a video url.."
                                rightElement={
                                    (
                                        this.state.searching || this.state.downloading
                                            ? (
                                                <Spinner size={Icon.SIZE_STANDARD} />
                                            )
                                            : (
                                                <Button
                                                    disabled={this.state.url.length === 0}
                                                    icon={IconNames.KEY_ENTER}
                                                    intent={Intent.PRIMARY}
                                                    minimal
                                                    onClick={this.youtubeDLSearch}
                                                />
                                            )
                                    )
                                }
                                onKeyDown={this.onKeyDown}
                            />
                        </div>
                        <div style={{ marginTop: "2vh", textAlign: 'center' }}>
                            <Callout className="no-pad">
                                {
                                    this.state.metadata && this.state.metadata.thumbnail
                                        ? <img className="import-url-preview" alt="thumbnail" src={this.state.metadata.thumbnail} />
                                        : <Icon className="import-url-icon" icon={IconNames.VIDEO} iconSize={100} onClick={this.youtubeDLSearch} />
                                }
                            </Callout>
                            <Callout intent={this.state.message.intent} className={classNames("import-url-message", "number")}>
                                <pre className="log">
                                    {this.state.message.text}
                                </pre>
                            </Callout>
                        </div>
                        <div style={{ marginTop: "2vh" }}>
                            {
                                this.state.metadata
                                    ? (
                                        <div className="import-url-buttons">
                                            <ControlGroup className="import-url-checkbox">
                                                <Tooltip content="Embed artist/album/track to the media file" hoverOpenDelay={1000}>
                                                    <Checkbox onChange={this.onEmbedMetadata} checked={this.state.embed.metadata}>Embed Metadata</Checkbox>
                                                </Tooltip>
                                                <Tooltip content="Embed thumbnail as a cover image for the media file" hoverOpenDelay={1000}>
                                                    <Checkbox onChange={this.onEmbedThumb} checked={this.state.embed.thumbnail}>Embed Thumbnail</Checkbox>
                                                </Tooltip>
                                            </ControlGroup>
                                            <Button
                                                className="import-url-download-button"
                                                large
                                                intent={this.state.downloading ? Intent.DANGER : Intent.PRIMARY}
                                                onClick={this.state.downloading ? this.cancelDownload : this.startDownload}>
                                                {
                                                    this.state.downloading
                                                        ? <span>Cancel</span>
                                                        : <span>Download & Import</span>
                                                }
                                            </Button>
                                        </div>
                                    )
                                    : null
                            }
                        </div>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

export const getImportUrlDialog = (): DialogContent => {
    const ref: RefObject<ImportURLDialog> = React.createRef();
    const content = (
        <ImportURLDialog ref={ref} />
    );

    const text = (
        <Text className={classNames(ExtClasses.TEXT_LARGER, Classes.HEADING, "font-weight-unset", "dialog-header")}>
            Import URL
        </Text>
    );
    return {
        content,
        text,
        icon: IconNames.CLOUD_DOWNLOAD,
        class: classNames(Classes.HOTKEY_DIALOG, "import-url-dialog"),
        canEscapeKeyClose: false,
        canOutsideClickClose: false,
        onClose: () => {
            if (ref.current) ref.current.cancelDownload();
        },
    }
}

export default {};
