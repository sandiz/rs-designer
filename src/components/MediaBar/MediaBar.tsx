import React, { Component, FunctionComponent } from 'react'
import {
    Navbar, Alignment, Button, Elevation, Card, Classes,
} from '@blueprintjs/core';
import classNames from 'classnames';
import { MediaInfo, ProjectInfo } from '../../types';
import './MediaBar.scss'

interface MediaBarState {
    mediaInfo?: MediaInfo;
}

interface MediaBarProps {
    project?: ProjectInfo;
}

class MediaBar extends Component<MediaBarProps, MediaBarState> {
    constructor(props: MediaBarProps) {
        super(props);
        this.state = { mediaInfo: undefined };
        console.log(this.state.mediaInfo);
    }

    render = (): React.ReactNode => {
        return (
            <Card className={classNames("media-bar-sticky")} elevation={Elevation.FOUR}>
                <Navbar.Group align={Alignment.LEFT}>
                    <Button icon="properties" large className={Classes.ELEVATION_2} />
                    <Navbar.Divider />
                    <div className="media-bar-controls">
                        <AlbumArt
                            className="media-bar-albumart"
                            url="https://upload.wikimedia.org/wikipedia/en/thumb/2/22/The_Killers_-_Battle_Born.png/220px-The_Killers_-_Battle_Born.png" />
                    </div>
                </Navbar.Group>
            </Card>
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
