import React from 'react';
import { IconNames, IconName } from '@blueprintjs/icons';
import {
    Callout, Card, Elevation, Intent, Switch,
    Button, FormGroup, InputGroup, Checkbox,
} from '@blueprintjs/core';
import './HomeTab.scss';
import { ProjectMetadata } from '../../types/project';
import { DispatchEvents, DispatcherService } from '../../services/dispatcher';
import ProjectService from '../../services/project';

interface HomeTabProps {
    metadata: ProjectMetadata;
}
interface Msg {
    text: React.ReactElement | string | null;
    icon: IconName;
    intent: Intent;
}
const emptyMsg: Msg = { text: null, icon: IconNames.INFO_SIGN, intent: Intent.NONE }

interface HomeTabState {
    currentAnalysisMode: "offline" | "online";
    defaultMsg: Msg;
    updateMsg: Msg | null;
}

interface PurchaseItems {
    title: string;
    cost: number;
    per: number;
    clickFn: () => void;
    showPerPrice?: boolean;
    subscription?: boolean;
}


class HomeTab extends React.Component<HomeTabProps, HomeTabState> {
    constructor(props: HomeTabProps) {
        super(props);
        this.state = {
            currentAnalysisMode: "online", defaultMsg: { ...emptyMsg }, updateMsg: null,
        };
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.on(DispatchEvents.ProjectClosed, this.projectClosed);
        DispatcherService.on(DispatchEvents.ProjectUpdated, this.projectOpened);
        DispatcherService.on(DispatchEvents.MusicAnalysisStarted, this.maStatus);
        DispatcherService.on(DispatchEvents.MusicAnalysisEnded, this.maStatus);
        this.projectOpened();
        this.maStatus();
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.ProjectOpened, this.projectOpened);
        DispatcherService.off(DispatchEvents.ProjectClosed, this.projectClosed);
        DispatcherService.off(DispatchEvents.ProjectUpdated, this.projectOpened);
        DispatcherService.off(DispatchEvents.MusicAnalysisStarted, this.maStatus);
        DispatcherService.off(DispatchEvents.MusicAnalysisEnded, this.maStatus);
    }

    maStatus = () => {
    }

    projectClosed = async () => {
        this.setState({ defaultMsg: { ...emptyMsg }, updateMsg: null });
    }

    projectOpened = async () => {
        const total = 4;
        const items: string[] = [];
        let i = 0;
        if (this.state.currentAnalysisMode === "offline") {
            if (ProjectService.isProjectLoaded()) {
                const metadata = await ProjectService.getProjectMetadata();
                if (metadata) {
                    if (metadata.key[0] !== '-') i += 1; else items.push("key");
                    if (metadata.tempo > 0) i += 1; else items.push("tempo");
                    if (metadata.chords.length > 0) i += 1; else items.push("chords");
                    if (metadata.beats.length > 0) i += 1; else items.push("beats");
                }
                if (i === total) {
                    this.setState({ defaultMsg: { text: "Analysis up-to-date!", icon: IconNames.TICK, intent: Intent.SUCCESS } });
                }
                else {
                    this.setState({ defaultMsg: { text: `Analysis pending for ${items.join(", ")}!`, icon: IconNames.INFO_SIGN, intent: Intent.NONE } });
                }
            }
        }
        else {
            this.setState({ defaultMsg: { text: "Connection Started", icon: IconNames.GLOBE_NETWORK, intent: Intent.NONE } });
        }
    }

    changeMode = () => {
        this.setState(prevState => ({
            currentAnalysisMode: prevState.currentAnalysisMode === "online" ? "offline" : "online",
            updateMsg: null,
        }), () => this.projectOpened());
    }

    onlineRender = () => {
        const analysisOptions: PurchaseItems[] = [
            {
                title: "1 Song Pack",
                cost: 3.99,
                per: 3.99,
                clickFn: () => { },
            },
            {
                title: "3 Song Pack",
                cost: 5.99,
                per: parseFloat((5.99 / 3).toFixed(2)),
                clickFn: () => { },
                showPerPrice: true,
            },
            {
                title: "5 Song Pack",
                cost: 8.99,
                per: parseFloat((8.99 / 5).toFixed(2)),
                clickFn: () => { },
                showPerPrice: true,
            },
            {
                title: "Subscription",
                cost: 19.99,
                per: 0,
                subscription: true,
                clickFn: () => { },
            },
        ];
        const cur = "$";
        return (
            <div className="home-online-content">
                <div style={{ width: 65 + '%' }}>
                    <Callout>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat
                    </Callout>
                    <br />
                    <Callout icon={IconNames.INFO_SIGN}>
                        Privacy policy note goes as well as support
                    </Callout>
                    <br />
                    <div
                        className="d-flex"
                        style={{
                            justifyContent: 'space-evenly', alignItems: 'flex-start', height: 100 + '%', flexWrap: "wrap",
                        }}>
                        {
                            analysisOptions.map((item) => {
                                return (
                                    <Card className="cta" key={item.title} elevation={Elevation.TWO} style={{ width: 23 + '%', padding: 10 + 'px' }}>
                                        <div className="d-flex">
                                            <div className="number">{item.title}&nbsp;</div>
                                            {
                                                item.showPerPrice
                                                    ? <div className="number" style={{ width: 50 + '%', textAlign: 'right' }}>({cur}{item.per}/song)</div>
                                                    : null
                                            }
                                        </div>
                                        <br />
                                        <div className="">
                                            <Button
                                                fill
                                                minimal
                                                //intent={item.subscription ? Intent.PRIMARY : Intent.PRIMARY}
                                                icon={IconNames.ENDORSED}
                                                className=""
                                            >
                                                Buy for  <span className="number">{cur}{item.cost}</span>
                                                {
                                                    item.subscription
                                                        ? <span>&nbsp;/ month</span>
                                                        : null
                                                }
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })
                        }
                    </div>
                </div>
                <Callout style={{ width: 30 + '%' }}>
                    <FormGroup
                        label="Email"
                        labelFor="email-input"
                        labelInfo="(required)"
                    >
                        <InputGroup id="email-input" placeholder="Email Address" />
                    </FormGroup>
                    <FormGroup
                        label="License"
                        labelFor="license-input"
                        labelInfo="(required)"
                    >
                        <InputGroup id="license-input" placeholder="License Key" />
                    </FormGroup>
                    <Checkbox>
                        I agree to terms of service and privacy policy.
                    </Checkbox>
                    <div style={{ textAlign: 'right' }}>
                        <Button intent={Intent.PRIMARY}>Connect</Button>
                    </div>
                </Callout>
            </div>
        );
    }


    render = () => {
        const isOnline = this.state.currentAnalysisMode === "online";
        let msg: Msg = { ...emptyMsg };
        if (this.props.metadata.isEmpty()) {
            if (isOnline) msg.text = "Not Connected";
            else msg.text = "No Project Opened";
        }
        else {
            if (this.state.updateMsg) msg = this.state.updateMsg;
            else msg = this.state.defaultMsg;
        }
        return (
            <Card className="home-main" elevation={Elevation.TWO}>
                <Callout className="d-flex home-analysis-panel">
                    <Callout intent={Intent.PRIMARY} icon={null} className="home-heading-left font-weight-unset">
                        <div className="home-key-font">[ {this.state.currentAnalysisMode} - mode ]</div>
                        <Switch
                            checked={isOnline}
                            onChange={this.changeMode} />
                    </Callout>
                    <Callout icon={msg.icon} intent={msg.intent} className="home-info home-heading-right">
                        {msg.text}
                        <br />
                        <br />
                        [ online - mode &nbsp;] - runs the analysis on azure cloud, switch the flip to learn more!
                        <br />
                        [ offline - mode ] - runs local analysis, supports the following providers:
                    </Callout>
                </Callout>
            </Card>
        )
    }
}

export default HomeTab;
