import React, { Suspense } from 'react'
import {
    Navbar, Tabs, Tab, Alignment, Icon, TabId, Button, Drawer, Position,
} from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import classNames from 'classnames';
import './MediaAdvanced.scss'
import { ProjectMetadata } from '../../types'
import ProjectService, { ProjectUpdateType } from '../../services/project'
import { DispatcherService, DispatchEvents, DispatchData } from '../../services/dispatcher'

const MixerTab = React.lazy(() => import('./MixerTab'));
const HomeTab = React.lazy(() => import('./HomeTab'));
const SpectrogramTab = React.lazy(() => import('./SpectrogramTab'));
interface MediaAdvancedState {
    currentTab: TabId | undefined;
    metadata: ProjectMetadata;
}

interface MediaAdvancedProps {
    isPopout: boolean;
    popoutFunc?: () => void;
    isOpen: boolean;
}

const TABID_HOME = "home" as TabId;
const TABID_MIXER = "mixer" as TabId;
const TABID_CLOUDANALYSIS = "cloud" as TabId;
const TABID_SPEC = "spectrogram" as TabId;
const TABID_ISOLATION = "isolation" as TabId;
const TABID_PITCH_TRACKING = "pitch-tracking" as TabId;
const TABID_REGIONS = "regions" as TabId;
const TABID_CDLC = "cdlc" as TabId;
const TABID_LYRICS = "lyrics" as TabId;
const TABID_VIDEO = "video-ref" as TabId;

class MediaAdvanced extends React.Component<MediaAdvancedProps, MediaAdvancedState> {
    constructor(props: MediaAdvancedProps) {
        super(props)
        this.state = { currentTab: TABID_HOME, metadata: new ProjectMetadata() }
    }

    componentDidMount = async () => {
        DispatcherService.on(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.on(DispatchEvents.ProjectUpdated, this.projectUpdated);
        DispatcherService.on(DispatchEvents.ProjectClosed, this.projectClosed);
        if (ProjectService.isProjectLoaded()) {
            this.projectOpened();
        }
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.off(DispatchEvents.ProjectUpdated, this.projectUpdated);
        DispatcherService.off(DispatchEvents.ProjectClosed, this.projectClosed);
    }

    projectOpened = async () => {
        const metadata = await ProjectService.getProjectMetadata();
        if (metadata) this.setState({ metadata })
    }

    projectUpdated = async (data: DispatchData) => {
        if (typeof data === 'string'
            && (data === ProjectUpdateType.ExternalFilesUpdate
                || data === ProjectUpdateType.MediaInfoUpdated)) {
            const metadata = await ProjectService.getProjectMetadata();
            if (metadata) this.setState({ metadata });
        }
    }

    projectClosed = () => {
        this.setState({ metadata: new ProjectMetadata() });
    }

    handleTabChange = (newTab: React.ReactText) => {
        this.setState({ currentTab: newTab });
    }

    getTab = (tabid: TabId | undefined): React.ReactElement | null => {
        let elem: React.ReactElement | null = null;
        switch (tabid) {
            case TABID_MIXER:
                elem = <MixerTab key={TABID_MIXER} metadata={this.state.metadata} />
                break;
            case TABID_HOME:
                elem = <HomeTab key={TABID_HOME} metadata={this.state.metadata} />
                break;
            case TABID_SPEC:
                elem = <SpectrogramTab key={TABID_SPEC} />
                break;
            default:
                elem = null;
                break;
        }
        return elem;
    }

    render = () => {
        const popout = (
            !this.props.isPopout
                ? (
                    <Button
                        key="popout"
                        onClick={this.props.popoutFunc}
                        minimal
                        className="popout"
                        icon={IconNames.ARROW_TOP_RIGHT}
                    />
                )
                : null
        );
        return (
            <Drawer
                isOpen={this.props.isOpen}
                position={Position.BOTTOM}
                size={(this.props.isPopout ? 100 : 45) + '%'}
                portalClassName="mi-drawer"
                className={classNames({ "mi-drawer-bottom": !this.props.isPopout })}
                key="mi-drawer"
                transitionName={this.props.isPopout ? "" : undefined}
            >
                <Navbar key="mi-title" className={classNames("mi-header", { "mi-popout": this.props.isPopout })}>
                    <Navbar.Group className="mi-header-group">
                        <Navbar.Heading className="mi-heading">
                            {
                                this.state.currentTab
                                    ? [
                                        <Icon key="layout_auto" iconSize={Icon.SIZE_LARGE} icon={IconNames.LAYOUT_AUTO} className="mi-header-icon" />,
                                        <span key="title">[ meend-intelligence ]</span>,
                                        popout,
                                    ]
                                    : null
                            }
                        </Navbar.Heading>
                    </Navbar.Group>
                    <Navbar.Group align={Alignment.RIGHT}>
                        <Tabs
                            animate
                            id="navbar"
                            large
                            onChange={this.handleTabChange}
                            selectedTabId={this.state.currentTab}
                        >
                            <Tab id={TABID_HOME} title="Home" />
                            <Tab id={TABID_MIXER} title="Mixer" />
                            <Tab id={TABID_SPEC} title="Chromagram" />
                            <Tab id={TABID_CLOUDANALYSIS} title="Cloud Analysis" />
                            <Tab id={TABID_ISOLATION} title="Track Isolation" />
                            <Tab id={TABID_PITCH_TRACKING} title="Pitch Tracking" />
                            <Tab id={TABID_REGIONS} title="Regions" />
                            <Tab id={TABID_CDLC} title="CDLC" />
                            <Tab id={TABID_LYRICS} title="Lyrics" />
                            <Tab id={TABID_VIDEO} title="Video Refs" />
                        </Tabs>
                    </Navbar.Group>
                </Navbar>
                {
                    <Suspense fallback={<div>Loading...</div>}>
                        {this.getTab(this.state.currentTab)}
                    </Suspense>
                }

            </Drawer>
        )
    }
}

export default MediaAdvanced;
