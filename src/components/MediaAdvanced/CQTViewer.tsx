import React, { useState } from 'react';
import {
    Callout, Button, Text,
    FormGroup, HTMLSelect, Elevation, Card,
} from '@blueprintjs/core';
import { colorMaps } from '../../lib/music-utils';

interface CQTState {
    processing: boolean;
}

class CQTViewer extends React.Component<{}, CQTState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            processing: false,
        }
    }

    startProcessing = () => {
        this.setState({ processing: true });
        console.log('startProcessing', this.state.processing)
    }

    render = () => {
        return (
            <Card key="spec-panel" elevation={Elevation.TWO} className="spec-info">
                <div className="">
                    <canvas
                        className="chroma-canvas"
                        width={448}
                        height={390}
                    />
                </div>
            </Card>
        )
    }
}

export const CQTOptions = () => {
    const [colorMap] = useState<string>("default");

    return (
        <Callout style={{ width: 80 + '%' }}>
            <Text>Options</Text>
            <br />
            <Button onClick={() => { }}>Generate</Button>
            <br /> <br />
            <FormGroup label="Colormap" inline className="no-margin-bottom">
                <HTMLSelect
                    onChange={v => {
                        v.target.blur();
                    }}
                    value={colorMap}>
                    <option value="default">default</option>
                    {
                        colorMaps.map((item) => {
                            return <option key={item} value={item}>{item}</option>
                        })
                    }
                </HTMLSelect>
            </FormGroup>
        </Callout>
    )
}

export default CQTViewer;
