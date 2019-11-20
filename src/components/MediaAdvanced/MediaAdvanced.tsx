import React from 'react'
import {
    Drawer, Position, Navbar, Tabs, Tab, Alignment, Icon, TabId,
} from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'

import './MediaAdvanced.scss'
import { Mixer } from './Mixer'
import { ProjectMetadata } from '../../types'
import ProjectService from '../../services/project'
import { DispatcherService, DispatchEvents } from '../../services/dispatcher'

interface MediaAdvancedProps {
    show: boolean;
}
interface MediaAdvancedState {
    currentTab: TabId | undefined;
    metadata: ProjectMetadata | null;
}

const TABID_AUDIO = "audio" as TabId;
const TABID_SPEC = "spectrogram" as TabId;
const TABID_ISOLATION = "isolation" as TabId;

class MediaAdvaned extends React.Component<MediaAdvancedProps, MediaAdvancedState> {
    constructor(props: MediaAdvancedProps) {
        super(props)
        this.state = { currentTab: TABID_AUDIO, metadata: null }
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.ProjectOpened, this.projectOpened);
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.ProjectOpened, this.projectOpened);
    }

    projectOpened = async () => {
        const metadata = await ProjectService.getProjectMetadata();
        this.setState({ metadata })
    }

    handleTabChange = (newTab: React.ReactText, prevTab: React.ReactText, event: React.MouseEvent<HTMLElement>) => {
        this.setState({ currentTab: newTab });
    }

    title = () => {
        return (
            <Navbar className="mi-header">
                <Navbar.Group className="mi-header-group">
                    <Navbar.Heading className="mi-heading">
                        <Icon iconSize={Icon.SIZE_LARGE} icon={IconNames.LAYOUT_AUTO} className="mi-header-icon" />
                        <span>[meend-intelligence]</span>
                    </Navbar.Heading>
                </Navbar.Group>
                <Navbar.Group align={Alignment.RIGHT}>
                    {/* controlled mode & no panels (see h1 below): */}
                    <Tabs
                        animate
                        id="navbar"
                        large
                        onChange={this.handleTabChange}
                        selectedTabId={this.state.currentTab}
                    >
                        <Tab id={TABID_AUDIO} title="MIxer" />
                        <Tab id={TABID_SPEC} title="Spectrogram" />
                        <Tab id={TABID_ISOLATION} title="Track Isolation" />
                    </Tabs>
                </Navbar.Group>
            </Navbar>
        );
    }

    render = () => {
        return (
            <Drawer
                isOpen={this.props.show}
                position={Position.BOTTOM}
                size={45 + '%'}
                portalClassName="mi-drawer"
                className="mi-drawer-bottom"
            >
                {this.title()}
                {this.state.metadata && this.state.currentTab === TABID_AUDIO ? <Mixer metadata={this.state.metadata} /> : null}
            </Drawer>
        )
    }
}

export default MediaAdvaned;