import React, { FunctionComponent, useState, useEffect } from 'react';
import {
    Card, Elevation, Callout, Classes, Button,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import {
    ProjectMetadata,
} from '../../types';
import MusicAnalysisService from '../../lib/musicanalysis';
import { DispatchEvents, DispatcherService } from '../../services/dispatcher';

const TempoPanel = React.lazy(() => import("./TempoPanel"));
const KeyPanel = React.lazy(() => import("./KeyPanel"));

export interface MixerProps {
    metadata: ProjectMetadata;
    style?: React.CSSProperties;
}

interface OfflineItems {
    title: string;
    description: string;
    analyseFn: () => void;
}

const analysis = (props: MixerProps, analysisInProgress: boolean) => {
    const analysisOptions: OfflineItems[] = [
        {
            title: "Key Detection",
            description: "detects the key of the song using the Temperley-Krumhansl-Schmuckler algorithm.",
            analyseFn: MusicAnalysisService.analyseKey,
        },
        {
            title: "Tempo Detection",
            description: "detects the tempo in beats-per-minute (bpm) using the Zapata-Gomez algorithm.",
            analyseFn: MusicAnalysisService.analyseTempo,
        },
        {
            title: "Beat Tracking",
            description: "detects the beat positions using the Zapata-Gomez algorithm.",
            analyseFn: MusicAnalysisService.analyseBeats,
        },
        {
            title: "Chord Analysis",
            description: "detects chords used in the song using a Conditional Random Field.",
            analyseFn: MusicAnalysisService.analyseChords,
        },
    ];
    return analysisOptions.map((item) => {
        return (
            <Callout key={item.title} icon={IconNames.LAYOUT_AUTO} className="d-flex offline-icon" style={{ borderRadius: 0 + 'px' }}>
                <div className="offline-item-name">
                    <div>{item.title}</div>
                    <span className={Classes.TEXT_MUTED}>{item.description}</span>
                </div>
                <div className="offline-item-action">
                    <Button
                        disabled={analysisInProgress || props.metadata.isEmpty()}
                        icon={IconNames.PULSE}
                        className="offline-buttons"
                        onClick={item.analyseFn}
                    >
                        {
                            analysisInProgress
                                ? "In Progress.."
                                : "Analyze"
                        }
                    </Button>
                </div>
            </Callout>
        )
    })
}


export const MixerTab: FunctionComponent<MixerProps> = (props: MixerProps) => {
    const [analysisInProgress, setAnalysis] = useState(false);
    useEffect(() => {
        const _cb = () => setAnalysis(true);
        const _cb2 = () => setAnalysis(false);
        DispatcherService.on(DispatchEvents.MusicAnalysisStarted, _cb);
        DispatcherService.on(DispatchEvents.MusicAnalysisEnded, _cb2);
        return () => {
            // Clean up the subscription
            DispatcherService.off(DispatchEvents.MusicAnalysisStarted, _cb);
            DispatcherService.off(DispatchEvents.MusicAnalysisEnded, _cb2);
        };
    }, []);
    return (
        <div key="mixer" className="mixer" style={props.style}>
            <div key="mixer-root" className="mixer-root">
                <div key="left" className="mixer-left">
                    <Card key="key-panel" elevation={Elevation.TWO} className="mixer-panel key-panel">
                        <KeyPanel key="key" metadata={props.metadata} />
                    </Card>
                    <Card key="tempo-panel" elevation={Elevation.TWO} className="mixer-panel tempo-panel">
                        <TempoPanel key="tempo" metadata={props.metadata} />
                    </Card>
                </div>
                <Card elevation={Elevation.TWO} className="mixer-panel analysis-panel">
                    {analysis(props, analysisInProgress)}
                </Card>
            </div>
        </div>
    )
}

export default MixerTab;
