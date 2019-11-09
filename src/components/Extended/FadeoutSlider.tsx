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
            this.sliderRef.current.addEventListener('mouseover', this.handleMouse);
            this.sliderRef.current.addEventListener('mouseout', this.handleMouse);
        }
        this.handleMouse(new Event("mouseout"));
    }

    componentWillUnmount = (): void => {
        if (this.sliderRef.current != null) {
            this.sliderRef.current.removeEventListener('mouseover', this.handleMouse);
            this.sliderRef.current.removeEventListener('mouseout', this.handleMouse);
        }
    }

    handleMouse = (event: Event): void => {
        if (this.sliderRef.current != null) {
            const elem = this.sliderRef.current.querySelector("." + Classes.SLIDER_HANDLE);
            if (elem) {
                elem.className = classNames(Classes.SLIDER_HANDLE, { fadeout: event.type === "mouseout" });
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
