import React, { Suspense } from 'react'
import {
    Navbar, Tabs, Tab, Alignment, Icon, TabId, Button,
} from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import classNames from 'classnames';
import './MediaAdvanced.scss'
import { ProjectMetadata } from '../../types'
import ProjectService, { ProjectUpdateType } from '../../services/project'
import { DispatcherService, DispatchEvents, DispatchData } from '../../services/dispatcher'

const Mixer = React.lazy(() => import('./Mixer'));
interface MediaAdvancedState {
    currentTab: TabId | undefined;
    metadata: ProjectMetadata;
}

interface MediaAdvancedProps {
    allowPopout?: boolean;
    popoutFunc?: () => void;
}

const TABID_AUDIO = "audio" as TabId;
const TABID_SPEC = "spectrogram" as TabId;
const TABID_ISOLATION = "isolation" as TabId;
const TABID_HOME = "home" as TabId;

class MediaAdvanced extends React.Component<MediaAdvancedProps, MediaAdvancedState> {
    constructor(props: MediaAdvancedProps) {
        super(props)
        this.state = { currentTab: TABID_HOME, metadata: new ProjectMetadata() }
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.on(DispatchEvents.ProjectUpdated, this.projectUpdated);
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.off(DispatchEvents.ProjectUpdated, this.projectUpdated);
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

    handleTabChange = (newTab: React.ReactText, prevTab: React.ReactText, event: React.MouseEvent<HTMLElement>) => {
        this.setState({ currentTab: newTab });
    }

    render = () => {
        return (
            <React.Fragment>
                <Navbar key="mi-title" className={classNames("mi-header", { "mi-popout": this.props.allowPopout })}>
                    <Navbar.Group className="mi-header-group">
                        <Navbar.Heading className="mi-heading">
                            <Icon iconSize={Icon.SIZE_LARGE} icon={IconNames.LAYOUT_AUTO} className="mi-header-icon" />
                            <span>[ meend-intelligence ]</span>
                            {
                                this.props.allowPopout
                                    ? (
                                        <Button
                                            onClick={this.props.popoutFunc}
                                            minimal
                                            className="popout"
                                            icon={IconNames.ARROW_TOP_RIGHT}
                                        />
                                    )
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
                            <Tab id={TABID_AUDIO} title="Mixer" />
                            <Tab id={TABID_SPEC} title="Spectrogram" />
                            <Tab id={TABID_ISOLATION} title="Track Isolation" />
                        </Tabs>
                    </Navbar.Group>
                </Navbar>
                {
                    this.state.currentTab === TABID_AUDIO
                        ? (
                            <Suspense fallback={<div>Loading...</div>}>
                                <Mixer key={TABID_AUDIO} metadata={this.state.metadata} />
                            </Suspense>
                        )
                        : null
                }

            </React.Fragment>
        )
    }
}

export default MediaAdvanced;
