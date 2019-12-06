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
import { sec2time } from '../../lib/utils';

interface TabEditorState {
    duration: number;
    //image: string | undefined;
}
const PX_PER_SEC = 40;
class TabEditor extends React.Component<{}, TabEditorState> {
    private beatsRef: RefObject<HTMLDivElement>;
    private timelineRef: RefObject<HTMLDivElement>;
    private imageRef: RefObject<HTMLImageElement>;
    private neckContainerRef: RefObject<HTMLDivElement>;
    private progressRef: RefObject<HTMLDivElement>;
    private tabImgRef: RefObject<HTMLDivElement>;
    private tabNoteRef: RefObject<HTMLDivElement>;
    private overflowRef: RefObject<HTMLDivElement>;
    private progressRAF = 0;

    constructor(props: {}) {
        super(props);
        this.state = { duration: 0 };
        this.beatsRef = React.createRef();
        this.timelineRef = React.createRef();
        this.imageRef = React.createRef();
        this.neckContainerRef = React.createRef();
        this.progressRef = React.createRef();
        this.tabImgRef = React.createRef();
        this.tabNoteRef = React.createRef();
        this.overflowRef = React.createRef();
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
        if (MediaPlayerService.isActive()) {
            this.mediaReady();
        }
    }

    updateImage = async () => {
        if (!MediaPlayerService.wavesurfer) return;
        try {
            const image = await MediaPlayerService.exportImage(PX_PER_SEC * this.state.duration);
            if (this.imageRef.current) {
                this.imageRef.current.src = image;
                this.imageRef.current.style.visibility = ""
            }
        }
        catch (e) {
            console.log("update-image exception", e);
        }
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
        cancelAnimationFrame(this.progressRAF);
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
                let seconds = i;
                let output = ""
                if (seconds / 60 > 1) {
                    const minutes = parseInt((seconds / 60).toString(), 10);
                    seconds = parseInt((seconds % 60).toString(), 10);
                    const tseconds = seconds < 10 ? '0' + seconds : seconds;
                    output = `${minutes}:${tseconds}`;
                }
                else {
                    output = "" + Math.round(seconds * 1000) / 1000;
                }

                if (i % 5 === 0) sp.textContent = output;

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
        this.updateProgress();
    }

    updateProgress = () => {
        this.progressRAF = requestAnimationFrame(this.updateProgress);
        const time = MediaPlayerService.getCurrentTime();
        const per = (time / MediaPlayerService.getDuration()) * 100;
        const perat10 = (10 / MediaPlayerService.getDuration()) * 100;
        if (this.neckContainerRef.current && this.progressRef.current) {
            const width = this.neckContainerRef.current.clientWidth;
            this.progressRef.current.style.transform = `translateX(${(per / 100) * width}px)`;

            if (this.overflowRef.current) {
                const sl = this.overflowRef.current.scrollLeft + this.overflowRef.current.clientWidth;
                const pos = (per / 100) * width
                if (pos > sl) {
                    this.overflowRef.current.scrollLeft += this.overflowRef.current.clientWidth;
                }
            }
        }
    }

    render = () => {
        return (
            <div className="tabeditor-root">
                <InfoPanel />
                <CardExtended className={classNames("tabeditor-body")} elevation={3}>
                    <div
                        ref={this.overflowRef}
                        className="tab-overflow-root"
                    >
                        <div
                            ref={this.tabImgRef}
                            className="tab-wv-img"
                            style={{
                                width: PX_PER_SEC * this.state.duration + 'px',
                                willChange: 'transform',
                                imageRendering: 'pixelated',
                            }}>
                            <img
                                ref={this.imageRef}
                                className="tab-img"
                                alt="waveform"
                                style={{ visibility: "hidden" }}
                            />
                        </div>
                        <div
                            ref={this.tabNoteRef}
                            style={{
                                width: PX_PER_SEC * this.state.duration + 'px',
                                willChange: 'transform',
                            }}
                            className="tab-note-edit"
                        >
                            <div className="neck-container" ref={this.neckContainerRef}>
                                <div className="tab-progress" ref={this.progressRef} />
                                <div className="neck">
                                    <div className="strings strings-first" />
                                    <div className="strings" />
                                    <div className="strings" />
                                    <div className="strings" />
                                    <div className="strings" />
                                </div>
                            </div>
                        </div>
                        <div
                            className="tabs-beats-timeline"
                            ref={this.beatsRef}
                            style={{
                                willChange: 'transform',
                                width: PX_PER_SEC * this.state.duration + 'px',
                            }}
                        />
                        <div
                            className="tabs-timeline"
                            ref={this.timelineRef}
                            style={{
                                willChange: 'transform',
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
