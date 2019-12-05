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

interface TabEditorState {
    duration: number;
}
const PX_PER_SEC = 20;
class TabEditor extends React.Component<{}, TabEditorState> {
    private beatsRef: RefObject<HTMLDivElement>;
    constructor(props: {}) {
        super(props);
        this.state = { duration: 0 };
        this.beatsRef = React.createRef();
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
        if (MediaPlayerService.isActive()) {
            this.mediaReady();
        }
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
    }

    mediaReady = async () => {
        const duration = MediaPlayerService.getDuration();
        this.setState({ duration })
        const metadata = await ProjectService.getProjectMetadata();
        let gridColums = "";
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
                    sp.className = "beats-num-span";
                    sp.textContent = onecounter.toString().padStart(beats.length % 10, "0");
                }
                else {
                    c.className = "beats-other";
                }
                c.setAttribute('data-bn', bn.toString());
                const per = (diff / duration) * 100;
                if (this.beatsRef.current) {
                    this.beatsRef.current.appendChild(c);
                }
                gridColums += `${per}% `;

                prev = start;
            });
            if (this.beatsRef.current) {
                this.beatsRef.current.style.gridTemplateColumns = gridColums;
            }
        }
    }

    render = () => {
        return (
            <div className="tabeditor-root">
                <InfoPanel />
                <CardExtended className={classNames("tabeditor-body")} elevation={3}>
                    <div
                        style={{
                            width: 100 + '%',
                            overflowX: 'auto',
                            maxWidth: 100 + '%',
                        }}>
                        <div
                            ref={this.beatsRef}
                            className="beats-timeline"
                            style={{ width: PX_PER_SEC * this.state.duration + 'px' }}
                        />
                        <div
                            style={{ width: PX_PER_SEC * this.state.duration + 'px' }}
                        >
                            <Callout>
                                test
                                test
                                test
                            </Callout>
                        </div>
                        <div
                            style={{ width: PX_PER_SEC * this.state.duration + 'px' }}
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
