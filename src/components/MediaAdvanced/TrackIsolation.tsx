import { ChildProcess } from 'child_process';
import React, { Component } from 'react';
import {
    Card, Elevation, Callout,
    Intent, Button, Pre, Spinner,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons'
import './TrackIsolation.scss';
import MusicAnalysisService from '../../lib/musicanalysis';

interface TIState {
    stems: string[];
    isRunning: boolean;
    output: string;
}
export default class TrackIsolationTab extends Component<{}, TIState> {
    private runner: ChildProcess | null = null;
    constructor(props: {}) {
        super(props);

        this.state = {
            stems: [],
            isRunning: false,
            output: '-- no output --',
        }
        console.log("stems", this.state.stems)
    }

    spleet = async () => {
        this.setState({ isRunning: true, output: 'Starting spleet...' });
        this.runner = await MusicAnalysisService.spleet(
            (s) => this.setState({ output: this.state.output + '\n' + s }),
            (s) => this.setState({ output: this.state.output + '\n' + s }),
            () => this.setState({ isRunning: false }),
        );
    }

    cancelSpleet = () => {
        this.setState({ isRunning: false });
        if (this.runner) {
            this.runner.kill("SIGKILL");
        }
    }

    render() {
        const { isRunning, output } = this.state;
        return (
            <div className="container">
                <Card className="stem-panel" elevation={Elevation.TWO}>
                    asd
                </Card>
                <Card className="output" elevation={Elevation.TWO}>
                    <Callout intent={Intent.PRIMARY} icon={false} className="output-button">
                        <div className="buttons">
                            <Button
                                onClick={this.spleet}
                                icon={IconNames.SPLIT_COLUMNS}
                                large
                                intent={Intent.NONE}
                                text="Spleet It!"
                                disabled={isRunning}
                            />
                            {
                                isRunning
                                    ? (
                                        <Button
                                            onClick={this.cancelSpleet}
                                            icon={IconNames.CROSS}
                                            large
                                            intent={Intent.DANGER}
                                            text="Cancel"
                                        />
                                    )
                                    : null
                            }
                        </div>
                        {
                            isRunning
                                ? (
                                    <div className="spinner">
                                        <Spinner />
                                    </div>
                                )
                                : null
                        }
                    </Callout>
                    <Pre className="output-logs">
                        {output}
                    </Pre>
                </Card>
            </div>
        );
    }
}
