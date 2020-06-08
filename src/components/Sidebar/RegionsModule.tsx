import React, { CSSProperties } from 'react';
import {
    Card, Elevation, Callout, Intent, Collapse, Icon, Classes, Colors,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ProjectDetails } from '../../types/project';
import { Region } from '../../types/regions';
import CollapseButton from './CollapseButton';
import { ButtonExtended } from '../Extended/FadeoutSlider';
import MediaPlayerService from '../../services/mediaplayer';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import AppContext from '../../context';

interface RegionsProps {
    project: ProjectDetails;
}

interface RegionsState {
    regions: Region[];
    expanded: boolean;
}

class RegionsModule extends React.Component<RegionsProps, RegionsState> {
    context!: React.ContextType<typeof AppContext>;
    constructor(props: RegionsProps) {
        super(props);
        this.state = { regions: [], expanded: true };
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.off(DispatchEvents.ProjectUpdated, this.projectUpdated);
        DispatcherService.off(DispatchEvents.AppThemeChanged, this.projectUpdated);
    }

    componentDidMount = () => {
        this.setState({ regions: MediaPlayerService.getRegions() });
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.on(DispatchEvents.ProjectUpdated, this.projectUpdated);
        DispatcherService.on(DispatchEvents.AppThemeChanged, this.projectUpdated);
    }

    mediaReady = () => {
        const wv = MediaPlayerService.wavesurfer;
        if (wv) {
            wv.on('region-created', this.regionUpdated);
            wv.on('region-removed', this.regionUpdated);
            wv.on('region-updated', this.regionUpdated);
            wv.on('region-update-end', this.regionUpdated);
            wv.on('play', this.regionUpdated);
        }
        this.setState({ regions: MediaPlayerService.getRegions() });
    }

    mediaReset = () => {
        const wv = MediaPlayerService.wavesurfer;
        if (wv) {
            wv.off('region-created', this.regionUpdated);
            wv.off('region-removed', this.regionUpdated);
            wv.off('region-updated', this.regionUpdated);
            wv.off('region-update-end', this.regionUpdated);
            wv.off('play', this.regionUpdated);
        }
        this.setState({ regions: [] });
    }

    projectUpdated = () => {
        this.setState({ regions: MediaPlayerService.getRegions() });
    }

    regionUpdated = () => {
        this.setState({ regions: MediaPlayerService.getRegions() });
    }

    toggleLoop = (i: number) => {
        const s = this.state.regions[i];
        if (s.loop) {
            MediaPlayerService.stopLooping();
        }
        else {
            MediaPlayerService.loopRegion(i);
        }
        this.setState({ regions: MediaPlayerService.getRegions() });
    }

    render = () => {
        return (
            <Card className="sidebar-card sidebar-audio-track" elevation={Elevation.THREE}>
                <Callout
                    className="card-header"
                    intent={Intent.PRIMARY}
                    icon={IconNames.LAYERS}>
                    Regions
                    <CollapseButton parent={this} expanded={this.state.expanded} />
                </Callout>
                <Collapse
                    keepChildrenMounted
                    isOpen={this.state.expanded}
                >
                    {
                        this.state.regions.map((r: Region, i: number) => {
                            let s: CSSProperties = {
                                //color: `${r.color}`,
                                color: `${Colors.DARK_GRAY5}`,
                                backgroundColor: `${r.color}`,
                                borderRadius: 0 + 'px',
                                borderBottomLeftRadius: 0 + 'px',
                                borderBottomRightRadius: 0 + 'px',
                            };
                            if (i === this.state.regions.length - 1) {
                                s = {
                                    ...s,
                                    borderBottomLeftRadius: 8 + 'px',
                                    borderBottomRightRadius: 8 + 'px',
                                }
                            }
                            const idx = i;
                            return (
                                <Callout
                                    key={r.name}
                                    style={s}
                                    className="region-row">
                                    <Icon icon={IconNames.CHEVRON_RIGHT} />
                                    <div className="region-name">{r.name}</div>
                                    <ButtonExtended
                                        active={r.loop}
                                        onClick={() => this.toggleLoop(idx)}
                                        icon={
                                            (
                                                <Icon
                                                    icon={IconNames.REFRESH}
                                                    color={r.loop ? "green" : Colors.GRAY5}
                                                />
                                            )
                                        }
                                        small
                                        className={Classes.ELEVATION_1}
                                    />
                                </Callout>
                            );
                        })
                    }
                </Collapse>
            </Card>
        )
    }
}

RegionsModule.contextType = AppContext;
export default RegionsModule;
