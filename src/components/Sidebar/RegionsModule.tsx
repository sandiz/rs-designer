import React from 'react';
import {
    Card, Elevation, Callout, Intent, Classes, HTMLSelect, Button, Collapse,
} from '@blueprintjs/core';
import classNames from 'classnames';
import { IconNames } from '@blueprintjs/icons';
import { ProjectDetails } from '../../types/project';
import { Regions, DEFAULT_REGIONS } from '../../types/regions';
import CollapseButton from './CollapseButton';

interface RegionsProps {
    project: ProjectDetails;
}

interface RegionsState {
    regions: Regions[];
    expanded: boolean;
}

class RegionsModule extends React.Component<RegionsProps, RegionsState> {
    constructor(props: RegionsProps) {
        super(props);
        console.log("RegionsModule");
        this.state = { regions: DEFAULT_REGIONS, expanded: false };
    }

    render = () => {
        return (
            <Card className="sidebar-card sidebar-audio-track" elevation={Elevation.THREE}>
                <Callout
                    className="card-header"
                    intent={Intent.PRIMARY}
                    icon={IconNames.MUSIC}>
                    Regions
                    <CollapseButton parent={this} expanded={this.state.expanded} />
                </Callout>
                <Collapse
                    keepChildrenMounted
                    isOpen={this.state.expanded}
                >
                    <Card>
                        <span className={classNames({ [Classes.TEXT_DISABLED]: !this.props.project.loaded }, "region-text")}>Regions</span>
                        <div className="region-body">
                            <HTMLSelect className="region-select" disabled={!this.props.project.loaded}>
                                {
                                    this.state.regions.map(item => {
                                        return <option key={item.name}>{item.name}</option>
                                    })
                                }
                            </HTMLSelect>
                            <Button icon={IconNames.PLUS} minimal />
                            <Button icon={IconNames.MINUS} minimal />
                        </div>
                    </Card>
                    <br />
                    <br />
                </Collapse>
            </Card>
        )
    }
}

export default RegionsModule;
