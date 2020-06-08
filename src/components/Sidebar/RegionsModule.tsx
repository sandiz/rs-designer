import React, { CSSProperties, FunctionComponent, useState } from 'react';
import {
    Card, Elevation, Callout, Intent, Collapse, Icon, Classes, Colors, EditableText, NumericInput,
} from '@blueprintjs/core';
import classNames from 'classnames';
import { IconNames } from '@blueprintjs/icons';
import { ProjectDetails } from '../../types/project';
import { Region } from '../../types/regions';
import CollapseButton from './CollapseButton';
import { ButtonExtended } from '../Extended/FadeoutSlider';
import MediaPlayerService from '../../services/mediaplayer';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import AppContext from '../../context';
import './Sidebar.scss'
import { sec2timeObj } from '../../lib/utils';

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

    onChange = (i: number, value: string) => {
        const { regions } = this.state;
        regions[i].name = value;
        this.setState({ regions });
    }

    onConfirm = (i: number, value: string) => {
        if (value === "") {
            this.onCancel();
        }
        else {
            if (MediaPlayerService.regionHandler) {
                MediaPlayerService.regionHandler.copyRegion(i, this.state.regions[i]);
            }
        }
    }

    onCancel = () => {
        const r = MediaPlayerService.getRegions();
        this.setState({ regions: r });
    }

    deleteRegion = (id: string) => {
        if (MediaPlayerService.regionHandler) {
            MediaPlayerService.regionHandler.deleteRegion(id)
        }
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
                            const idx = i;
                            return (
                                <React.Fragment
                                    key={r.name + r.color + r.id}
                                >
                                    <RegionRow
                                        idx={idx}
                                        region={r}
                                        regions={this.state.regions}
                                        onCancel={this.onCancel}
                                        onChange={this.onChange}
                                        onConfirm={this.onConfirm}
                                        toggleLoop={this.toggleLoop}
                                        deleteRegion={this.deleteRegion}
                                    />
                                </React.Fragment>
                            );
                        })
                    }
                </Collapse>
            </Card>
        )
    }
}

interface RRProps {
    region: Region;
    idx: number;
    regions: Region[];
    onChange: (i: number, v: string) => void;
    onCancel: () => void;
    onConfirm: (i: number, v: string) => void;
    toggleLoop: (i: number) => void;
    deleteRegion: (i: string) => void;
}

export const RegionRow: FunctionComponent<RRProps> = (props: RRProps) => {
    const [isOpen, setIsOpen] = useState(false);
    let s: CSSProperties = {
        //color: `${r.color}`,
        color: `${Colors.DARK_GRAY5}`,
        backgroundColor: `${props.region.color}`,
        borderRadius: 0 + 'px',
        borderBottomLeftRadius: 0 + 'px',
        borderBottomRightRadius: 0 + 'px',
    };
    if (props.idx === props.regions.length - 1) {
        s = {
            ...s,
            borderBottomLeftRadius: 8 + 'px',
            borderBottomRightRadius: 8 + 'px',
        }
    }
    const [region, setRegion] = useState(props.region);
    const [startTime, setST] = useState(sec2timeObj(props.region.start));
    const [endTime, setET] = useState(sec2timeObj(props.region.end));
    const onChange = (value: string, chtype: string, type: string) => {
        const time = sec2timeObj(type === "start" ? props.region.start : props.region.end);
        if (value === "") {
            if (type === "start") setST(time);
            else setET(time);
        }
        else {
            switch (chtype) {
                case "mins":
                    time.mins = value;
                    break;
                case "seconds":
                    time.seconds = value;
                    break;
                case "ms":
                    time.ms = value;
                    break;
                default:
                    break;
            }
            if (type === "start") setST(time);
            else setET(time);
        }
        const t: number = (parseInt(time.mins, 10) * 60)
            + parseInt(time.seconds, 10)
            + (parseInt(time.ms, 10) / 1000);

        if (type === "start") region.start = t;
        else region.end = t;
        setRegion(region);
        if (MediaPlayerService.regionHandler) {
            MediaPlayerService.regionHandler.copyRegion(props.idx, region);
        }
    }

    return (
        <React.Fragment
            key={props.region.id + props.region.color + props.region.name}
        >
            <Callout
                style={s}
                className="region-row">
                <ButtonExtended
                    small
                    icon={
                        (
                            <Icon
                                icon={!isOpen ? IconNames.CHEVRON_RIGHT : IconNames.CHEVRON_DOWN}
                                color={Colors.DARK_GRAY5}
                            />
                        )
                    }
                    onClick={() => setIsOpen(!isOpen)}
                    minimal
                    className="region-button"
                />
                <EditableText
                    value={props.region.name}
                    className="region-name"
                    multiline={false}
                    confirmOnEnterKey
                    maxLines={1}
                    onChange={(v) => props.onChange(props.idx, v)}
                    onCancel={props.onCancel}
                    onConfirm={(v) => props.onConfirm(props.idx, v)}
                />
                <div className="region-button-container">
                    <ButtonExtended
                        active={props.region.loop}
                        onClick={() => props.toggleLoop(props.idx)}
                        icon={
                            (
                                <Icon
                                    icon={IconNames.REFRESH}
                                    color={props.region.loop ? "green" : Colors.GRAY5}
                                />
                            )
                        }
                        small
                        className={Classes.ELEVATION_1}
                    />
                </div>
            </Callout>
            <Collapse
                keepChildrenMounted
                isOpen={isOpen}
            >
                <Card className="region-card">
                    {
                        ["start", "end"].map((type: string) => {
                            return (
                                <React.Fragment key={type + startTime + endTime}>
                                    <div className={classNames("number", type === "start" ? "region-start-time-text" : "region-start-time-text-2", Classes.TEXT_MUTED, Classes.TEXT_LARGE)}>
                                        {type.toLocaleUpperCase()}
                                    </div>
                                    <div className="region-start-time">
                                        {
                                            Object.keys(startTime).map((chtype: string) => {
                                                const time = type === "start" ? startTime : endTime;
                                                let max = 99;
                                                let extra: JSX.Element | null = null;
                                                switch (chtype) {
                                                    case "mins": max = 99; extra = (<div>&nbsp;:&nbsp;</div>); break;
                                                    case "seconds": max = 59; extra = (<div>&nbsp;.&nbsp;</div>); break;
                                                    case "ms": max = 999; break;
                                                    default: break;
                                                }
                                                return (
                                                    <React.Fragment key={chtype + type + startTime + endTime}>
                                                        <div className="region-time-picker-container">
                                                            <NumericInput
                                                                large
                                                                buttonPosition="none"
                                                                className="region-time-picker"
                                                                value={time[chtype as keyof typeof startTime]}
                                                                min={0}
                                                                max={max}
                                                                allowNumericCharactersOnly
                                                                clampValueOnBlur
                                                                onValueChange={(p: number, v: string) => onChange(v, chtype, type)}

                                                            />
                                                        </div>
                                                        {extra}
                                                    </React.Fragment>
                                                );
                                            })
                                        }
                                    </div>
                                </React.Fragment>
                            );
                        })
                    }
                    <br />
                    <ButtonExtended
                        intent={Intent.DANGER}
                        icon={IconNames.DELETE}
                        text="Delete"
                        onClick={() => props.deleteRegion(props.region.id)}
                    />
                </Card>
            </Collapse>
        </React.Fragment>
    )
}

RegionsModule.contextType = AppContext;
export default RegionsModule;
