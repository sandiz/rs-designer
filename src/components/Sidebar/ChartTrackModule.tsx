import React from 'react';
import classNames from 'classnames';
import {
    Card, Elevation, Callout, Intent, Icon,
    Collapse, Button, HTMLSelect, Switch, NumericInput,
    TagInput, Classes, Popover, Position, Tooltip,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ProjectDetails } from '../../types/project';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import { InstrumentListItem, getAllFiles } from '../TabEditor/InstrumentFile';
import { toTitleCase } from '../../lib/utils';
import { allTunings } from '../../types/musictheory';
import { CHART_ZOOM } from '../../types/base';
import SliderExtended, { ButtonExtended } from '../Extended/FadeoutSlider';
import { settingsPopover, deletePopover } from '../../dialogs';
import { TabEditorSettings } from '../../types/settings';

interface ChartTrackProps {
    project: ProjectDetails;
}

interface ChartTrackState {
    allFiles: InstrumentListItem[];
    expandedCharts: boolean[];
    expanded: boolean;
}

class ChartTrackModule extends React.Component<ChartTrackProps, ChartTrackState> {
    constructor(props: ChartTrackProps) {
        super(props);
        this.state = { allFiles: [], expandedCharts: [], expanded: true };
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
        this.setState({ allFiles: fs, expandedCharts: closed });
    }

    projectClosed = () => {
        this.setState({ allFiles: [], expandedCharts: [] });
    }

    toggleChartCollapse = (idx: number) => {
        const expanded = [...this.state.expandedCharts];
        expanded[idx] = !expanded[idx];
        this.setState({ expandedCharts: expanded });
    }

    toggleCollapse = () => {
        const ex = this.state.expanded;
        this.setState({ expanded: !ex });
    }

    render = () => {
        const delChartMsg = <p>Are you sure you want to remove all transcribed notes? <br /></p>
        return (
            <Card className="sidebar-card sidebar-score-track" elevation={Elevation.THREE}>
                <Callout
                    className="card-header"
                    intent={Intent.PRIMARY}
                    icon={IconNames.ANNOTATION}>
                    Transcriptions
                    <Button
                        onClick={() => this.toggleCollapse()}
                        className="score-item-icon"
                        minimal
                        icon={(
                            <Icon
                                className=""
                                iconSize={18}
                                icon={this.state.expanded ? IconNames.CHEVRON_DOWN : IconNames.CHEVRON_UP}
                            />
                        )}
                    />
                </Callout>
                <Collapse
                    keepChildrenMounted
                    isOpen={this.state.expanded}
                >
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
                                                            onClick={() => this.toggleChartCollapse(i)}
                                                            className="score-item-icon"
                                                            minimal
                                                            icon={(
                                                                <Icon
                                                                    className=""
                                                                    iconSize={18}
                                                                    icon={this.state.expandedCharts[idx] ? IconNames.CHEVRON_DOWN : IconNames.CHEVRON_UP}
                                                                />
                                                            )}
                                                        />
                                                    </Callout>
                                                    <Collapse
                                                        keepChildrenMounted
                                                        isOpen={this.state.expandedCharts[idx]}>
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
                                                            <div className="score-item-row score-item-gap">
                                                                <div className="score-left-text">Tags</div>
                                                            </div>
                                                            <TagInput
                                                                fill
                                                                className={classNames("tags", Classes.ELEVATION_1)}
                                                                leftIcon={IconNames.TAG}
                                                                addOnPaste={false}
                                                                tagProps={{ minimal: true }}
                                                                values={[]}
                                                                placeholder="Tags.."
                                                                onAdd={() => { }}
                                                                onRemove={() => { }}
                                                            />
                                                            <div className="score-item-row score-item-gap">
                                                                <div className="score-left-text">Zoom</div>
                                                            </div>
                                                            <div className="zoom-item">
                                                                <SliderExtended
                                                                    min={CHART_ZOOM.MIN}
                                                                    max={CHART_ZOOM.MAX}
                                                                    value={CHART_ZOOM.DEFAULT}
                                                                    stepSize={1}
                                                                    labelRenderer={false}
                                                                    className="zoom-item"
                                                                    onChange={() => { }}
                                                                    onRelease={() => { }}
                                                                />
                                                            </div>
                                                            <br />
                                                            <div>
                                                                <Popover content={settingsPopover(new TabEditorSettings(), () => { })} position={Position.BOTTOM_RIGHT}>
                                                                    <Tooltip
                                                                        hoverOpenDelay={1000}
                                                                        lazy
                                                                        inheritDarkTheme
                                                                        content="Tab editor Settings">
                                                                        <ButtonExtended className="info-item-control" small icon={IconNames.COG} intent={Intent.NONE} />
                                                                    </Tooltip>
                                                                </Popover>
                                                                <Popover content={deletePopover(() => { }, delChartMsg)} position={Position.BOTTOM_RIGHT}>
                                                                    <Tooltip
                                                                        hoverOpenDelay={1000}
                                                                        lazy
                                                                        inheritDarkTheme
                                                                        content="Clears all notes from the chart">
                                                                        <ButtonExtended className="info-item-control" small icon={IconNames.CROSS} intent={Intent.NONE} />
                                                                    </Tooltip>
                                                                </Popover>
                                                                <Popover content={deletePopover(() => { })} position={Position.BOTTOM_RIGHT}>
                                                                    <Tooltip
                                                                        hoverOpenDelay={1000}
                                                                        lazy
                                                                        inheritDarkTheme
                                                                        content="Deletes the chart from the project">
                                                                        <ButtonExtended small icon={IconNames.TRASH} intent={Intent.NONE} />
                                                                    </Tooltip>
                                                                </Popover>
                                                            </div>
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
                </Collapse>
            </Card>
        );
    }
}

export default ChartTrackModule;
