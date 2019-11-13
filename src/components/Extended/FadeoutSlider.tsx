import React, { Component, RefObject } from 'react';
import {
    Slider, ISliderProps, Classes, ICardProps, Card, IButtonProps, Button,
} from '@blueprintjs/core';
import classNames from 'classnames';
import NativeListener from 'react-native-listener';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import { UUID } from '../../lib/utils';

interface SliderExtendedProps extends ISliderProps {
    timerSource: () => number;
    interval: number;
}
interface SliderExtendedState {
    value: number | undefined;
    min: number | undefined;
    max: number | undefined;
}
export default class SliderExtended extends Component<SliderExtendedProps, SliderExtendedState> {
    //eslint-disable-next-line
    static defaultProps = { timerSource: null, interval: 1000 }
    public sliderRef: RefObject<HTMLDivElement>;
    private timer: number | null;
    private id = "";

    constructor(props: SliderExtendedProps) {
        super(props);
        this.sliderRef = React.createRef();
        this.timer = null;
        this.id = UUID();
        this.state = { value: props.value, min: props.min, max: props.max };
    }

    static getDerivedStateFromProps(nextProps: SliderExtendedProps, prevState: SliderExtendedState) {
        if (nextProps !== prevState) {
            return { min: nextProps.min, max: nextProps.max };
        }
        else return null;
    }

    componentDidMount = (): void => {
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReset);
        if (this.sliderRef.current != null) {
            this.sliderRef.current.addEventListener('mouseover', this.handleMouse);
            this.sliderRef.current.addEventListener('mouseout', this.handleMouse);
        }
        this.handleMouse(new Event("mouseout"));
    }

    componentWillUnmount = (): void => {
        DispatcherService.off(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.off(DispatchEvents.MediaReset, this.mediaReset);
        if (this.sliderRef.current != null) {
            this.sliderRef.current.removeEventListener('mouseover', this.handleMouse);
            this.sliderRef.current.removeEventListener('mouseout', this.handleMouse);
        }
    }

    mediaReady = () => {
        if (this.timer) clearInterval(this.timer);
        if (typeof (this.props.timerSource) === 'function') {
            this.timer = window.setInterval(this.sliderUpdate, this.props.interval);
        }
    }

    sliderUpdate = () => {
        const value = this.props.timerSource();
        this.setState({ value });
    }

    mediaReset = () => {
        if (this.timer) clearInterval(this.timer);
        this.setState({ value: 0 });
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
                    min={this.state.min}
                    max={this.state.max}
                    value={this.state.value}
                    labelRenderer={this.props.labelRenderer}
                    className={classNames(this.props.className)} />
            </div>
        );
    }
}

export const CardExtended = (props: ICardProps) => {
    return (
        <Card
            //eslint-disable-next-line
            {...props}
            className={classNames("card-extended", props.className)}
        />
    )
}

export const blur = (e: React.MouseEvent<HTMLElement, MouseEvent>): void => {
    (e.currentTarget).blur();
}

export const ButtonExtended = (props: IButtonProps) => {
    return (
        <NativeListener stopKeyUp stopKeyDown stopKeyPress>
            {
                <Button
                    //eslint-disable-next-line
                    {...props}
                    onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => {
                        if (props.onClick) {
                            props.onClick(e);
                        }
                        blur(e);
                    }}
                />
            }
        </NativeListener>
    );
}
