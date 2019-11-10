interface DispatchCallback {
    (data: unknown): void;
}
class DispatcherEvent {
    public eventName: string;

    public callbacks: DispatchCallback[];

    constructor(eventName: string) {
        this.eventName = eventName;
        this.callbacks = [];
    }

    registerCallback(callback: DispatchCallback) {
        this.callbacks.push(callback);
    }

    unregisterCallback(callback: DispatchCallback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }

    fire(data: unknown) {
        const callbacks = this.callbacks.slice(0);
        callbacks.forEach((callback) => {
            callback(data);
        });
    }
}


class DispatcherBase {
    public events: { [key: string]: DispatcherEvent }

    constructor() {
        this.events = {};
    }

    dispatch(eventName: string, data: unknown = {}) {
        const event = this.events[eventName];
        if (event) {
            event.fire(data);
        }
    }

    on(eventName: string, callback: DispatchCallback) {
        let event = this.events[eventName];
        if (!event) {
            event = new DispatcherEvent(eventName);
            this.events[eventName] = event;
        }
        event.registerCallback(callback);
    }

    off(eventName: string, callback: DispatchCallback) {
        const event = this.events[eventName];
        if (event && event.callbacks.indexOf(callback) > -1) {
            event.unregisterCallback(callback);
            if (event.callbacks.length === 0) {
                delete this.events[eventName];
            }
        }
    }
}
export const DispatchEvents: { [key: string]: string } = {
    MediaReady: "media-ready",
    MediaReset: "media-reset",
    MediaAnalysisStart: "media-analysis-start",
    MediaAnalysisEnd: "media-analysis-stop",
    MASpectrogramStart: "media-analysis-cqt-start",
    MASpectrogramEnd: "media-analysis-cqt-end",
    SettingsUpdate: "settings-update",
    ProjectUpdate: "project-update",
    PitchChange: "pitch-change",
    TempoChange: "tempo-change",
    TransposeMode: "transpose-mode",
    AboutToDraw: "about-to-draw",
    FinishedDrawing: "finished-drawing",
}

export const DispatcherService = new DispatcherBase();
