import React from 'react';
import classNames from 'classnames';
import { Card, Text, Elevation } from '@blueprintjs/core';
import { CardExtended } from '../Extended/FadeoutSlider';
import './TabEditor.scss'

class TabEditor extends React.Component<{}, {}> {
    constructor(props: {}) {
        super(props);
        console.log("test");
    }

    render = () => {
        return (
            <div className="tabeditor-root">
                <InfoPanel />
                <CardExtended className={classNames("tabeditor-body")} elevation={3}>
                    test
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
