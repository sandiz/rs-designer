import React from 'react';
import {
    Classes, InputGroup, Intent, Button, Spinner, Tooltip, Position,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import classNames from 'classnames';

import { OnChangeHandler } from '../../types/base';
import { MediaInfo } from '../../types/media'
import ProjectService from '../../services/project';
import { AlbumArt } from '../MediaController/MediaController';
import { base64ImageData, fetchCover, readFile } from '../../lib/utils';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import { successToaster, errorToaster } from '../Extended/Toasters';

const { dialog } = window.require('electron').remote;
interface MEState {
    mediaInfo: MediaInfo | null;
    projectLoaded: boolean;
    imageDownloadInProgress: boolean;
}

class MetadataEditorDialog extends React.Component<{}, MEState> {
    constructor(props: {}) {
        super(props);
        this.state = { mediaInfo: null, projectLoaded: false, imageDownloadInProgress: false };
    }

    componentDidMount = () => {
        this.initMetadata();
    }

    onChange = (type: string, event: OnChangeHandler) => {
        const { mediaInfo } = this.state;
        const { value } = event.target;
        if (mediaInfo) {
            switch (type) {
                case "artist":
                    mediaInfo.artist = value;
                    break;
                case "album":
                    mediaInfo.album = value;
                    break;
                case "song":
                    mediaInfo.song = value;
                    break;
                case "year":
                    mediaInfo.year = value;
                    break;
                default:
                    break;
            }
            this.setState({ mediaInfo })
        }
    }

    initMetadata = async () => {
        if (ProjectService.isProjectLoaded()) {
            const mediaInfo = await ProjectService.readMetadata();
            this.setState({ mediaInfo, projectLoaded: true });
        }
        else {
            this.setState({ mediaInfo: null, projectLoaded: false });
        }
    }

    onSearchImage = async () => {
        this.setState({ imageDownloadInProgress: true });
        let url = "";
        const { mediaInfo } = this.state;
        if (mediaInfo) {
            if (mediaInfo.album.length > 0) {
                url = await fetchCover(mediaInfo.artist, mediaInfo.album);
            }
            else {
                url = await fetchCover(mediaInfo.artist, mediaInfo.song, false);
            }
            if (url.toString().toLowerCase().includes("error:")) {
                errorToaster(url.toString());
            }
            else {
                const data = await fetch(url);
                const body = await data.arrayBuffer();
                mediaInfo.image = Buffer.from(body).toString("base64");
                this.setState({
                    mediaInfo,
                });
            }
        }
        this.setState({ imageDownloadInProgress: false })
    }

    onLocalImage = async () => {
        if (!this.state.mediaInfo) return;
        const out = await dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                { name: 'JPG', extensions: ['jpg'] },
                { name: 'PNG', extensions: ['png'] },
            ],
        });
        const files = out.filePaths;
        if (files === null || typeof files === 'undefined' || files.length <= 0) {
            return;
        }
        const file = files[0];
        const data = await readFile(file);
        const { mediaInfo } = this.state;
        if (mediaInfo) {
            mediaInfo.image = data.toString("base64");
            this.setState({
                mediaInfo,
            });
        }
    }

    onSave = () => {
        if (this.state.mediaInfo) ProjectService.updateMetadata(this.state.mediaInfo);
        DispatcherService.dispatch(DispatchEvents.CloseDialog);
        successToaster("Metadata Saved");
    }

    close = () => {

    }

    render = () => {
        return (
            <div className={classNames(Classes.DIALOG_BODY)}>
                <div className={classNames(Classes.HOTKEY_COLUMN, "dialog-body")}>
                    <div style={{ marginTop: 2 + "vh", display: 'flex' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', width: 60 + '%' }}>
                            <InputGroup
                                disabled={this.state.projectLoaded === false}
                                autoFocus
                                value={this.state.mediaInfo ? this.state.mediaInfo.song : ""}
                                large
                                fill
                                onChange={(v: OnChangeHandler) => this.onChange("song", v)}
                                leftIcon={IconNames.MUSIC}
                                intent={Intent.PRIMARY}
                                className="metadata-input"
                                placeholder="Track" />
                            <InputGroup
                                disabled={this.state.projectLoaded === false}
                                value={this.state.mediaInfo ? this.state.mediaInfo.artist : ""}
                                large
                                fill
                                onChange={(v: OnChangeHandler) => this.onChange("artist", v)}
                                leftIcon={IconNames.PEOPLE}
                                className="metadata-input"
                                placeholder="Artist" />
                            <InputGroup
                                disabled={this.state.projectLoaded === false}
                                value={this.state.mediaInfo ? this.state.mediaInfo.album : ""}
                                large
                                fill
                                onChange={(v: OnChangeHandler) => this.onChange("album", v)}
                                leftIcon={IconNames.BOOK}
                                className="metadata-input"
                                placeholder="Album" />
                            <InputGroup
                                disabled={this.state.projectLoaded === false}
                                value={this.state.mediaInfo ? this.state.mediaInfo.year : ""}
                                large
                                fill
                                onChange={(v: OnChangeHandler) => this.onChange("year", v)}
                                leftIcon={IconNames.CALENDAR}
                                className="metadata-input number"
                                placeholder="Year" />
                        </div>
                        <div className="metadata-album-art-container">
                            <AlbumArt
                                interactive={false}
                                className="metadata-albumart"
                                url={this.state.mediaInfo ? base64ImageData(this.state.mediaInfo.image) : ''} />
                            <div style={{ marginTop: 1 + 'vh', marginLeft: 2 + 'vw', display: 'flex' }}>
                                {
                                    this.state.imageDownloadInProgress
                                        ? <Spinner size={Spinner.SIZE_SMALL} />
                                        : (
                                            <Tooltip lazy content="Search last.fm for cover image" hoverOpenDelay={1000} position={Position.BOTTOM}>
                                                <Button
                                                    onClick={this.onSearchImage}
                                                    minimal
                                                    icon={IconNames.SEARCH} />
                                            </Tooltip>
                                        )
                                }
                                <Tooltip content="Upload an image from disk" hoverOpenDelay={1000} lazy position={Position.BOTTOM}>
                                    <Button
                                        onClick={this.onLocalImage}
                                        minimal
                                        icon={IconNames.UPLOAD} />
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: 2 + "vh", display: 'flex', justifyContent: 'center' }}>
                        <Button
                            onClick={this.onSave}
                            large
                            intent={Intent.PRIMARY}
                            disabled={this.state.projectLoaded === false}
                        >
                            {
                                this.state.projectLoaded
                                    ? <span>Save</span>
                                    : <span>No Project Loaded</span>
                            }
                        </Button>
                    </div>
                </div>
            </div>
        )
    }
}

export default MetadataEditorDialog;
