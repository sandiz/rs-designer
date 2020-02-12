import React from 'react';
import {
    Card, Elevation, Callout, Intent, Icon,
    Collapse, Button, HTMLSelect, Switch, NumericInput,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ProjectDetails } from '../../types/project';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import { InstrumentListItem, getAllFiles } from '../TabEditor/InstrumentFile';
import { toTitleCase } from '../../lib/utils';
import { allTunings } from '../../types/musictheory';

interface ChartTrackProps {
    project: ProjectDetails;
}

interface ChartTrackState {
    allFiles: InstrumentListItem[];
    expanded: boolean[];
}

class ChartTrackModule extends React.Component<ChartTrackProps, ChartTrackState> {
    constructor(props: ChartTrackProps) {
        super(props);
        this.state = { allFiles: [], expanded: [] };
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.on(DispatchEvents.ProjectClosed, this.projectClosed);
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.off(DispatchEvents.ProjectClosed, this.projectClosed);
    }

    projectOpened = () => {
        const fs = getAllFiles();
        const closed: boolean[] = new Array<boolean>(fs.length).fill(false);
        if (fs.length > 0) closed[0] = true;
        this.setState({ allFiles: fs, expanded: closed });
    }

    projectClosed = () => {
        this.setState({ allFiles: [], expanded: [] });
    }

    toggleCollapse = (idx: number) => {
        const expanded = [...this.state.expanded];
        expanded[idx] = !expanded[idx];
        this.setState({ expanded })
    }

    render = () => {
        return (
            <Card className="sidebar-card sidebar-score-track" elevation={Elevation.THREE}>
                <Callout
                    className="card-header"
                    intent={Intent.PRIMARY}
                    icon={IconNames.ANNOTATION}>
                    Transcriptions
                    </Callout>
                {
                    this.props.project.loaded
                        ? (
                            <div className="score-item-collection">
                                {
                                    this.state.allFiles.map((item, idx) => {
                                        const i = idx;
                                        return (
                                            <Card
                                                key={item.hash}
                                                className="track-card sidebar-score-item score-collapsed"
                                                elevation={Elevation.ZERO}>
                                                <Callout
                                                    className="track-callout"
                                                    intent={Intent.NONE}
                                                    icon={IconNames.DOCUMENT}
                                                >
                                                    {toTitleCase(item.title)}
                                                    <Button
                                                        onClick={() => this.toggleCollapse(i)}
                                                        className="score-item-icon"
                                                        minimal
                                                        icon={(
                                                            <Icon
                                                                className=""
                                                                iconSize={18}
                                                                icon={this.state.expanded[idx] ? IconNames.CHEVRON_DOWN : IconNames.CHEVRON_UP}
                                                            />
                                                        )}
                                                    />
                                                </Callout>
                                                <Collapse
                                                    keepChildrenMounted
                                                    isOpen={this.state.expanded[idx]}>
                                                    <div className="score-item-elements">
                                                        <div className="score-item-row">
                                                            <div className="score-left-text">Tuning</div>
                                                            <HTMLSelect id="tuning">
                                                                {
                                                                    Object.keys(allTunings).map((item2) => {
                                                                        return (
                                                                            <option key={item2}>
                                                                                {item2.replace(/_/g, " ")}
                                                                            </option>
                                                                        )
                                                                    })
                                                                }
                                                            </HTMLSelect>
                                                        </div>
                                                        <div className="score-item-row score-item-gap">
                                                            <div className="score-left-text">Capo</div>
                                                            <Switch className="score-right-toggle" />
                                                        </div>
                                                        <div className="score-item-row score-item-gap">
                                                            <div className="score-left-text">Cents</div>
                                                            <NumericInput
                                                                className="score-right-numeric-input number"
                                                                max={10}
                                                                min={-10}
                                                                stepSize={0.1}
                                                                value={0}
                                                            />
                                                        </div>
                                                        <br />
                                                    </div>
                                                </Collapse>
                                            </Card>
                                        )
                                    })
                                }
                            </div>
                        )
                        : null
                }
            </Card>
        );
    }
}

export default ChartTrackModule;
