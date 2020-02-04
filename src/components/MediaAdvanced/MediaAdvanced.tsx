import React, { Suspense } from 'react'
import {
    Navbar, Tabs, Tab, Alignment, Icon, Button, Drawer, Position,
} from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import classNames from 'classnames';
import './MediaAdvanced.scss'
import { ProjectMetadata } from '../../types/project'
import ProjectService, { ProjectUpdateType } from '../../services/project'
import { DispatcherService, DispatchEvents, DispatchData } from '../../services/dispatcher'
import HomeTab from './HomeTab';
import { PRODUCT_ADVANCED } from '../../types/base';
import { toTitleCase } from '../../lib/utils';

const MixerTab = React.lazy(() => import('./MixerTab'));
const SpectrogramTab = React.lazy(() => import('./SpectrogramTab'));
const EqualizerTab = React.lazy(() => import("./EQPanel"));

export enum TABID {
    HOME = "home",
    ANALYSIS = "analysis",
    EQUALIZER = "equalizer",
    SPEC = "chromagram",
    CLOUDANALYSIS = "cloud analysis",
    ISOLATION = "track isolation",
    PITCH_TRACKING = "pitch tracking",
    REGIONS = "regions",
    LYRICS = "lyrics",
    NOTES = "notes",
    EXPORT = "export",
}

interface MediaAdvancedState {
    currentTab: TABID;
    metadata: ProjectMetadata;
}

interface MediaAdvancedProps {
    isPopout: boolean;
    popoutFunc?: () => void;
    isOpen: boolean;
    openTab: TABID;
}

class MediaAdvanced extends React.Component<MediaAdvancedProps, MediaAdvancedState> {
    constructor(props: MediaAdvancedProps) {
        super(props)
        this.state = { currentTab: props.openTab, metadata: new ProjectMetadata() }
    }

    componentDidUpdate = (prevProps: MediaAdvancedProps) => {
        if (prevProps.openTab !== this.props.openTab) {
            //eslint-disable-next-line
            this.setState({ currentTab: this.props.openTab });
        }
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
        this.setState({ currentTab: newTab as TABID });
    }

    getTab = (tabid: TABID | undefined): React.ReactElement | null => {
        let elem: React.ReactElement | null = null;
        switch (tabid) {
            case TABID.ANALYSIS:
                elem = <MixerTab key={TABID.ANALYSIS} metadata={this.state.metadata} />
                break;
            case TABID.HOME:
                elem = <HomeTab key={TABID.HOME} metadata={this.state.metadata} />
                break;
            case TABID.EQUALIZER:
                elem = <EqualizerTab key={TABID.EQUALIZER} metadata={this.state.metadata} />
                break;
            case TABID.SPEC:
                elem = <SpectrogramTab key={TABID.SPEC} />
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
                                this.state.currentTab !== undefined
                                    ? [
                                        <Icon key="layout_auto" iconSize={Icon.SIZE_LARGE} icon={IconNames.LAYOUT_AUTO} className="mi-header-icon" />,
                                        <span key="title">[ {PRODUCT_ADVANCED} ]</span>,
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
                            {
                                Object.values(TABID).map(t => {
                                    return <Tab id={t} title={toTitleCase(t)} />
                                })
                            }
                        </Tabs>
                    </Navbar.Group>
                </Navbar>
                <Suspense fallback={<div>Loading...</div>}>
                    {this.getTab(this.state.currentTab)}
                </Suspense>

            </Drawer>
        )
    }
}

export default MediaAdvanced;
