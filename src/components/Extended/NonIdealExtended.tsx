import React, { Component } from 'react';
import { NonIdealState, INonIdealStateProps, Spinner } from '@blueprintjs/core';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';

enum NIESTATES { UNLOADED, LOADING, LOADED }
interface NIEState {
    currentNIEState: NIESTATES;
}

class NonIdealExtended extends Component<INonIdealStateProps, NIEState> {
    constructor(props: INonIdealStateProps) {
        super(props);
        this.state = { currentNIEState: NIESTATES.UNLOADED };
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.on(DispatchEvents.MediaLoading, this.mediaLoading);
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReset);
        DispatcherService.off(DispatchEvents.MediaLoading, this.mediaLoading);
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
    }

    mediaReset = () => {
        this.setState({ currentNIEState: NIESTATES.UNLOADED });
    }

    mediaLoading = () => {
        this.setState({ currentNIEState: NIESTATES.LOADING });
    }

    mediaReady = () => {
        this.setState({ currentNIEState: NIESTATES.LOADED });
    }

    render = () => {
        if (this.state.currentNIEState === NIESTATES.UNLOADED) {
            return <NonIdealState className={this.props.className} icon={this.props.icon} description={this.props.description} />
        }
        else if (this.state.currentNIEState === NIESTATES.LOADING) {
            return (
                <NonIdealState className={this.props.className}>
                    <Spinner />
                </NonIdealState>
            );
        }
        return null;
    }
}

export default NonIdealExtended;
