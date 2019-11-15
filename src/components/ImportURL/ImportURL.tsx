
import React, { RefObject } from 'react';
import {
    InputGroup, Intent, Button, Spinner, Icon, Callout, ControlGroup, Checkbox, Tooltip, Text,
    Classes,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ChildProcess } from 'child_process';
import classNames from 'classnames';
import * as YTDL from 'youtube-dl';

import {
    youtube, path, spawn, OnChangeHandler,
} from '../../types'
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';

const { shell, app } = window.require("electron").remote;
export const youtubedl = window.require("youtube-dl");

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

class ImportURLDialog extends React.Component<ImportURLDialogProps, ImportURLDialogState> {
    private video: ChildProcess | null = null;
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

    onChange = (e: OnChangeHandler) => {
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
                        text: info.title,
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
        );
    }
}

export default ImportURLDialog;
