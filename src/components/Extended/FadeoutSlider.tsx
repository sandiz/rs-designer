import React, { Component, RefObject } from 'react';
import { Slider, ISliderProps, Classes } from '@blueprintjs/core';
import classNames from 'classnames';

export default class FadeOutSlider extends Component<ISliderProps, {}> {
    private sliderRef: RefObject<HTMLDivElement>;

    constructor(props: {}) {
        super(props);
        this.sliderRef = React.createRef();
    }

    componentDidMount = (): void => {
        if (this.sliderRef.current != null) {
            this.sliderRef.current.addEventListener('mouseover', () => { this.handleMouse('mouseover'); });
            this.sliderRef.current.addEventListener('mouseout', () => { this.handleMouse('mouseout') });
        }
        this.handleMouse("mouseout");
    }

    handleMouse = (type: string): void => {
        if (this.sliderRef.current != null) {
            const elem = this.sliderRef.current.querySelector("." + Classes.SLIDER_HANDLE);
            if (elem) {
                elem.className = classNames(Classes.SLIDER_HANDLE, { fadeout: type === "mouseout" });
            }
        }
    }

    render = () => {
        return (
            <div ref={this.sliderRef}>
                <Slider
                    min={this.props.min}
                    max={this.props.max}
                    value={this.props.value}
                    labelRenderer={this.props.labelRenderer}
                    className={classNames(this.props.className)} />
            </div>
        );
    }
}
