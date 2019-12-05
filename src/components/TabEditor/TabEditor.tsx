import React, { RefObject } from 'react';
import classNames from 'classnames';
import {
    Card, Text, Elevation, Callout,
} from '@blueprintjs/core';
import { CardExtended } from '../Extended/FadeoutSlider';
import './TabEditor.scss'
import MediaPlayerService from '../../services/mediaplayer';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import ProjectService from '../../services/project';
import { ZOOM } from '../../types';

interface TabEditorState {
    duration: number;
    //image: string | undefined;
}
const PX_PER_SEC = 40;
class TabEditor extends React.Component<{}, TabEditorState> {
    private beatsRef: RefObject<HTMLDivElement>;
    private timelineRef: RefObject<HTMLDivElement>;
    private imageRef: RefObject<HTMLImageElement>;
    constructor(props: {}) {
        super(props);
        this.state = { duration: 0 };
        this.beatsRef = React.createRef();
        this.timelineRef = React.createRef();
        this.imageRef = React.createRef();
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
        if (MediaPlayerService.isActive()) {
            this.mediaReady();
        }
    }

    updateImage = async () => {
        if (!MediaPlayerService.wavesurfer) return;
        //sif (this.state.image) return;
        try {
            const image = await MediaPlayerService.exportImage(PX_PER_SEC * this.state.duration);
            //this.setState({ image })
            if (this.imageRef.current) {
                this.imageRef.current.src = image;
            }
        }
        catch (e) {
            console.log("update-image exception", e);
        }
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
    }

    mediaReady = async () => {
        const duration = MediaPlayerService.getDuration();
        this.setState({ duration })
        const metadata = await ProjectService.getProjectMetadata();
        let gridColumns = "";
        let prev = 0;
        let onecounter = 0;
        if (metadata) {
            const beats = metadata.beats;
            beats.forEach((beatData, i) => {
                const start = parseFloat(beatData.start);
                const bn = parseInt(beatData.beatNum, 10);

                let diff = 0;
                if (i === 0) diff = start;
                else diff = start - prev;

                const c = document.createElement('div');
                let j = i + 1;
                c.style.gridArea = `1 / ${j} / 2 / ${j += 1}`;

                if (bn === 1) {
                    c.className = "beats-start";
                    onecounter += 1;
                    const sp = document.createElement('span');
                    c.appendChild(sp);
                    sp.className = classNames("beats-num-span", { "beats-num-span-0": onecounter === 1 });
                    sp.textContent = onecounter.toString();
                }
                else {
                    c.className = "beats-other";
                }
                c.setAttribute('data-bn', bn.toString());
                const per = (diff / duration) * 100;
                if (this.beatsRef.current) {
                    this.beatsRef.current.appendChild(c);
                }
                gridColumns += `${per}% `;

                prev = start;
            });
            let timelinegridColumns = "";
            for (let i = 0; i < Math.round(duration); i += 1) {
                const diff = 1

                const c = document.createElement('div');
                let j = i + 1;
                c.style.gridArea = `1 / ${j} / 2 / ${j += 1}`;

                c.className = classNames(
                    //{ "time-notch-left": i === 0 },
                    { "time-notch": true },
                    { "time-notch-half": i % 5 !== 0 },
                )

                const sp = document.createElement('span');
                c.appendChild(sp);
                sp.className = "time-num-span";
                if (i % 5 === 0) sp.textContent = i.toString();

                const per = (diff / duration) * 100;
                if (this.timelineRef.current) {
                    this.timelineRef.current.appendChild(c);
                }
                timelinegridColumns += `${per}% `;
            }
            if (this.beatsRef.current) this.beatsRef.current.style.gridTemplateColumns = gridColumns;
            if (this.timelineRef.current) this.timelineRef.current.style.gridTemplateColumns = timelinegridColumns;
        }
        this.updateImage();
    }

    render = () => {
        return (
            <div className="tabeditor-root">
                <InfoPanel />
                <CardExtended className={classNames("tabeditor-body")} elevation={3}>
                    <div
                        style={{
                            width: 100 + '%',
                            height: 100 + '%',
                            overflowX: 'auto',
                            position: 'relative',
                        }}>
                        <div style={{
                            width: PX_PER_SEC * this.state.duration + 'px',
                            height: 100 + '%',
                            position: 'absolute',
                        }}>
                            <img
                                ref={this.imageRef}
                                className="tab-img"
                                alt="waveform"
                                height={100 + '%'}
                                width={100 + '%'}
                                src=""
                            />
                        </div>
                        <div
                            style={{
                                width: PX_PER_SEC * this.state.duration + 'px',
                                position: 'absolute',
                                height: 100 + '%',
                                marginTop: 36 + 'px',
                            }}
                        >
                            <div style={{ height: 80 + '%', padding: 0, paddingTop: 15 + 'px' }}>
                                <div style={{
                                    display: 'flex', flexDirection: 'column', height: 100 + '%', backgroundColor: 'rgb(1,1,1,0.2)',
                                }}>
                                    <div style={{ height: 20 + '%', borderBottom: '1px solid gray', borderTop: '1px solid gray' }} />
                                    <div style={{ height: 20 + '%', borderBottom: '1px solid gray' }} />
                                    <div style={{ height: 20 + '%', borderBottom: '1px solid gray' }} />
                                    <div style={{ height: 20 + '%', borderBottom: '1px solid gray' }} />
                                    <div style={{ height: 20 + '%', borderBottom: '1px solid gray' }} />
                                </div>
                            </div>
                        </div>
                        <div
                            ref={this.beatsRef}
                            className="tabs-beats-timeline"
                            style={{
                                width: PX_PER_SEC * this.state.duration + 'px',
                            }}
                        />
                        <div
                            ref={this.timelineRef}
                            className="tabs-timeline"
                            style={{
                                width: PX_PER_SEC * this.state.duration + 'px',
                            }}
                        />
                    </div>
                </CardExtended>
            </div>
        )
    }
}

const InfoPanel: React.FunctionComponent<{}> = (props: {}) => {
    return (
        <div className="tabeditor-panel">
            <div style={{
                width: 100 + '%',
                display: 'flex',
            }}>
                <Card
                    interactive
                    elevation={Elevation.ONE}
                    className={classNames("info-item", "info-item-large", "number")}>
                    <Text ellipsize>
                        <span>untitled.rstab*</span>
                    </Text>
                </Card>
                <Card
                    interactive
                    elevation={Elevation.ONE}
                    className={classNames("info-item", "info-item-large", "number")}>
                    <Text ellipsize>
                        <span>Lead - Guitar</span>
                    </Text>
                </Card>
            </div>
        </div>
    )
}

export default TabEditor;
