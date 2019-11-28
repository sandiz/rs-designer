import React from 'react';
import { IconNames } from '@blueprintjs/icons';
import {
    Callout, Card, Elevation, Intent, Switch, Classes, Button,
} from '@blueprintjs/core';
import classNames from 'classnames';
import './HomeTab.scss';

export interface HomeTabState {
    currentAnalysisMode: "offline" | "online";
}

interface OfflineItems {
    title: string;
    description: string;
    analyseFn: () => void;
}

class HomeTab extends React.Component<{}, HomeTabState> {
    constructor(props: {}) {
        super(props);
        this.state = { currentAnalysisMode: "offline" };
    }

    componentDidMount = () => {
    }

    changeMode = () => {

    }

    render = () => {
        const analysisOptions: OfflineItems[] = [
            { title: "Key Detection", description: "detects the key of the song using the Temperley-Krumhansl-Schmuckler algorithm.", analyseFn: () => { } },
            { title: "Tempo Detection", description: "detects the tempo in beats-per-minute (bpm) using the Zapata-Gomez algorithm.", analyseFn: () => { } },
            { title: "Beat Tracking", description: "detects the beat positions using the Zapata-Gomez algorithm.", analyseFn: () => { } },
            { title: "Chord Analysis", description: "detects chords used in the song using a Conditional Random Field.", analyseFn: () => { } },
        ];
        const isOnline = this.state.currentAnalysisMode === "online";
        return (
            <Card className="home-main" elevation={Elevation.TWO}>
                <Callout className="d-flex home-analysis-panel">
                    <Callout intent={Intent.PRIMARY} icon={null} className="home-heading-left font-weight-unset">
                        <div className="home-key-font">Analysis</div>
                        <Switch
                            checked={isOnline}
                            className={classNames({ "eq-checked-warning": isOnline })}
                            onChange={this.changeMode}>
                            AI
                            </Switch>
                    </Callout>
                    <Callout icon={IconNames.INFO_SIGN} className="home-info home-heading-right">
                        here is an info for meend intelligence, Lorem ipsum dolor sit amet
                    </Callout>
                </Callout>
                <div className="home-analysis-buttons">
                    {
                        analysisOptions.map((item) => {
                            return (
                                <Callout key={item.title} icon={IconNames.LAYOUT_AUTO} className="d-flex offline-icon">
                                    <div className="offline-item-name">
                                        <div>{item.title}</div>
                                        <span className={Classes.TEXT_MUTED}>{item.description}</span>
                                    </div>
                                    <div className="offline-item-action">
                                        <Button className="offline-buttons" onClick={item.analyseFn}>Analyse</Button>
                                    </div>
                                </Callout>
                            )
                        })
                    }

                </div>
            </Card>
        )
    }
}

export default HomeTab;
