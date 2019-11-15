import React from 'react';
import {
    Classes, InputGroup, Intent, Button,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import classNames from 'classnames';

import { MediaInfo, OnChangeHandler } from '../../types';
import ProjectService from '../../services/project';
import { AlbumArt } from '../MediaController/MediaController';
import { base64ImageData } from '../../lib/utils';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import { successToaster } from '../Extended/Toasters';

interface MEState {
    mediaInfo: MediaInfo | null;
    projectLoaded: boolean;
}

class MetadataEditorDialog extends React.Component<{}, MEState> {
    constructor(props: {}) {
        super(props);
        this.state = { mediaInfo: null, projectLoaded: false };
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

    onSearchImage = () => {

    }

    onLocalImage = () => {

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
                                className="metadata-input"
                                placeholder="Year" />
                        </div>
                        <div className="metadata-album-art-container">
                            <AlbumArt
                                interactive={false}
                                className="metadata-albumart"
                                url={this.state.mediaInfo ? base64ImageData(this.state.mediaInfo.image) : ''} />
                            <div style={{ marginTop: 1 + 'vh', marginLeft: 2 + 'vw' }}>
                                <Button
                                    onClick={this.onSearchImage}
                                    minimal
                                    icon={IconNames.SEARCH} />
                                <Button
                                    onClick={this.onLocalImage}
                                    minimal
                                    icon={IconNames.UPLOAD} />
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
