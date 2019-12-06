import React, { Component, RefObject } from 'react';
import {
    Slider, ISliderProps, Classes, ICardProps, Card, IButtonProps, Button,
} from '@blueprintjs/core';
import { clamp } from '@blueprintjs/core/lib/esm/common/utils';
import classNames from 'classnames';
import NativeListener from 'react-native-listener';
import { DispatcherService, DispatchEvents } from '../../services/dispatcher';
import { UUID, stopEventPropagation } from '../../lib/utils';

interface SliderExtendedProps extends ISliderProps {
    timerSource: () => number;
    dragStart: (v: number) => void;
    dragEnd: (v: number) => void;
    drag?: (v: number) => void;
    stepSize: number;
}
interface SliderExtendedState {
    min: number | undefined;
    max: number | undefined;
    disabled: boolean | undefined;
}
export default class SliderExtended extends Component<SliderExtendedProps, SliderExtendedState> {
    //eslint-disable-next-line
    static defaultProps = { timerSource: null, dragStart: null, dragEnd: null }
    public sliderRef: RefObject<HTMLDivElement>;
    private timer: number | null;
    private id = UUID();
    private dragging = false;
    private trackRef: React.RefObject<HTMLDivElement> = React.createRef();
    private prRef1: React.RefObject<HTMLDivElement> = React.createRef();
    private prRef2: React.RefObject<HTMLDivElement> = React.createRef();
    private prRef3: React.RefObject<HTMLDivElement> = React.createRef();
    private handleRef: React.RefObject<HTMLSpanElement> = React.createRef();
    private value = 0;

    constructor(props: SliderExtendedProps) {
        super(props);
        this.sliderRef = React.createRef();
        this.timer = null;
        this.state = {
            min: props.min, max: props.max, disabled: props.disabled,
        };
    }

    static getDerivedStateFromProps(nextProps: SliderExtendedProps, prevState: SliderExtendedState) {
        if (nextProps.min !== prevState.min
            || nextProps.max !== prevState.max
            || nextProps.disabled !== prevState.disabled) {
            return { min: nextProps.min, max: nextProps.max, disabled: nextProps.disabled };
        }
        else return null;
    }

    componentDidMount = (): void => {
        DispatcherService.on(DispatchEvents.MediaReady, this.mediaReady);
        DispatcherService.on(DispatchEvents.MediaReset, this.mediaReset);
        if (this.sliderRef.current != null) {
            this.sliderRef.current.addEventListener('mouseover', this.handleMouse);
            this.sliderRef.current.addEventListener('mouseout', this.handleMouse);

            const all = this.sliderRef.current.querySelectorAll("*");
            for (let i = 0; i < all.length; i += 1) {
                const item = all[i];
                (item as HTMLElement).addEventListener('keydown', (e) => { stopEventPropagation(e); (item as HTMLElement).blur(); });
                (item as HTMLElement).addEventListener('keypress', (e) => { stopEventPropagation(e); (item as HTMLElement).blur(); });
                (item as HTMLElement).addEventListener('keyup', (e) => { stopEventPropagation(e); (item as HTMLElement).blur(); });
            }
            this.addDefaultListeners();
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
        this.removeDefaultListeners();
    }

    addDefaultListeners = () => {
        if (this.handleRef.current && this.sliderRef.current) {
            this.handleRef.current.addEventListener("mousedown", this.onMouseDown);
            this.sliderRef.current.addEventListener("mousedown", this.onMouseDown);
        }
    }

    removeDefaultListeners = () => {
        if (this.handleRef.current && this.sliderRef.current) {
            this.handleRef.current.removeEventListener("mousedown", this.onMouseDown);
            this.sliderRef.current.removeEventListener("mousedown", this.onMouseDown);
        }
    }

    onMouseDown = (event: MouseEvent) => {
        this.dragging = true;
        const v = this.eventToValue(event);
        this.updateTrackAndHandle(v);
        if (this.props.dragStart) this.props.dragStart(v);
        document.addEventListener("mousemove", this.onMouseMove);
        document.addEventListener("mouseup", this.onMouseUp);
    }

    onMouseUp = (event: MouseEvent) => {
        this.dragging = false;
        const v = this.eventToValue(event);
        this.updateTrackAndHandle(v);
        if (this.props.dragEnd) this.props.dragEnd(v);
        document.removeEventListener("mousemove", this.onMouseMove);
        document.removeEventListener("mouseup", this.onMouseUp);
    }

    onMouseMove = (event: MouseEvent) => {
        const v = this.eventToValue(event);
        this.updateTrackAndHandle(v);
        if (this.props.drag) this.props.drag(v);
    }

    eventToValue = (event: MouseEvent) => {
        const handleElement = this.handleRef.current as HTMLElement;
        const handleRect = handleElement.getBoundingClientRect();
        const handleOffset = handleRect.left;

        const center = (handleRect.width / 2) + handleOffset;

        const clientPixelNormalized = event.clientX;
        const handleCenterPixel = center;
        const pixelDelta = clientPixelNormalized - handleCenterPixel;

        if (Number.isNaN(pixelDelta)) {
            return this.value;
        }
        const trackSize = (this.trackRef.current as HTMLElement).clientWidth;
        const tickSizeRatio = 1 / ((this.state.max as number) - (this.state.min as number));
        const tickSize = trackSize * tickSizeRatio;
        let value = this.value + Math.round(pixelDelta / (tickSize * this.props.stepSize)) * this.props.stepSize;
        value = clamp(value, this.state.min as number, this.state.max as number);
        return value;
    }

    mediaReady = () => {
        this.dragging = false;
        if (this.timer) cancelAnimationFrame(this.timer);
        this.sliderUpdate();
    }

    mediaReset = () => {
        this.dragging = false;
        if (this.timer) cancelAnimationFrame(this.timer);
    }

    sliderUpdate = () => {
        if (typeof (this.props.timerSource) === 'function') {
            if (!this.dragging) {
                const value = this.props.timerSource();
                this.updateTrackAndHandle(value);
            }
        }
        else {
            const value = this.props.value;
            this.updateTrackAndHandle(value as number);
        }
        this.timer = requestAnimationFrame(this.sliderUpdate);
    }

    updateTrackAndHandle = (v: number) => {
        this.value = v;
        const per = ((v - (this.state.min as number)) / ((this.state.max as number) - (this.state.min as number))) * 100;
        const hper = 100 - per;
        if (this.handleRef.current) {
            const h = this.handleRef.current as HTMLElement;
            const handleRect = h.getBoundingClientRect();
            const mPoint = handleRect.width / 2;
            const parent = h.parentElement;
            if (parent) {
                const val = `${(parent.offsetWidth * per) / 100 - mPoint}px`;
                h.style.transform = `translateX(${val})`
            }
        }
        if (this.prRef1.current && this.prRef2.current && this.prRef3.current) {
            const h = this.handleRef.current as HTMLElement;
            const parent = h.parentElement;
            if (parent) {
                const r = (parent.offsetWidth * hper) / 100;
                const p = (parent.offsetWidth * per) / 100;
                if (parseInt(this.prRef1.current.style.right, 10) !== 0) {
                    this.prRef1.current.style.right = 0 + 'px';
                    this.prRef1.current.style.left = 0 + 'px';
                    this.prRef2.current.style.left = 0 + 'px';
                    this.prRef2.current.style.right = 0 + 'px';
                    this.prRef3.current.style.left = 0 + 'px';
                    this.prRef3.current.style.right = 0 + 'px';
                }
                this.prRef1.current.style.transform = `translateX(${-r}px)`;
                this.prRef2.current.style.transform = `translateX(${-r - p}px)`;
                this.prRef3.current.style.transform = `translateX(${p}px)`;
            }
        }
    }

    handleMouse = (event: Event): void => {
        if (this.sliderRef.current != null) {
            const elem: HTMLElement | null = this.sliderRef.current.querySelector("." + Classes.SLIDER_HANDLE);
            if (elem) {
                if (this.dragging) {
                    elem.className = classNames(Classes.SLIDER_HANDLE);
                }
                else {
                    elem.className = classNames(Classes.SLIDER_HANDLE, { fadeout: event.type === "mouseout" });
                }
            }
        }
    }

    render = () => {
        const c = (
            <div
                style={{ width: 100 + '%' }}
            >
                <div
                    ref={this.sliderRef}
                    className={classNames(Classes.SLIDER, "bp3-slider-unlabeled", this.props.className)}
                >
                    <div className={Classes.SLIDER_TRACK} ref={this.trackRef}>
                        <div
                            ref={this.prRef1}
                            className={classNames(Classes.SLIDER_PROGRESS, Classes.INTENT_PRIMARY)}
                            style={{
                                left: 0 + '%',
                                right: 100 + '%',
                                top: 0 + 'px',
                                willChange: 'transform',
                            }} />
                        <div
                            ref={this.prRef2}
                            className={classNames(Classes.SLIDER_PROGRESS)}
                            style={{
                                left: 0 + '%',
                                right: 100 + '%',
                                top: 0 + 'px',
                                willChange: 'transform',
                            }} />
                        <div
                            ref={this.prRef3}
                            className={classNames(Classes.SLIDER_PROGRESS)}
                            style={{
                                left: 0 + '%',
                                right: 0 + '%',
                                top: 0 + 'px',
                                willChange: 'transform',
                            }} />
                    </div>
                    <div className={classNames(Classes.SLIDER_AXIS)} />
                    <span
                        ref={this.handleRef}
                        className={classNames(Classes.SLIDER_HANDLE, "fadeout")}
                        style={{
                            willChange: 'transform',
                        }} />
                </div>
            </div>
        );
        return c;
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
        </NativeListener>
    );
}
