interface DispatchCallback {
    (data: DispatchData): void;
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

    fire(data: DispatchData) {
        const callbacks = this.callbacks.slice(0);
        callbacks.forEach((callback) => {
            callback(data);
        });
    }
}

export type DispatchData = string | object | null;
class DispatcherBase {
    public events: { [key: string]: DispatcherEvent }

    constructor() {
        this.events = {};
    }

    dispatch(eventName: string, data: DispatchData = null) {
        const event = this.events[eventName];
        if (event) {
            event.fire(data);
        }
    }

    on(eventName: string, callback: DispatchCallback) {
        // console.trace("subscribed to ", eventName);
        let event = this.events[eventName];
        if (!event) {
            event = new DispatcherEvent(eventName);
            this.events[eventName] = event;
        }
        event.registerCallback(callback);
    }

    off(eventName: string, callback: DispatchCallback) {
        // console.log("unsubscribed to ", eventName);
        const event = this.events[eventName];
        if (event && event.callbacks.indexOf(callback) > -1) {
            event.unregisterCallback(callback);
            if (event.callbacks.length === 0) {
                delete this.events[eventName];
            }
        }
    }
}
export class DispatchEvents {
    public static MediaReady = "media-ready";
    public static MediaReset = "media-reset";
    public static MediaLoading = "media-loading";

    public static MediaAnalysisStart = "media-analysis-start";
    public static MediaAnalysisEnd = "media-analysis-stop";
    public static MASpectrogramStart = "media-analysis-cqt-start";
    public static MASpectrogramEnd = "media-analysis-cqt-end";
    public static SettingsUpdate = "settings-update";

    public static ProjectUpdate = "project-update";
    public static ProjectSave = "project-save";
    public static ProjectOpen = "project-open";
    public static ProjectOpened = "project-opened";
    public static ProjectClose = "project-close";
    public static ProjectClosed = "project-closed";

    public static PitchChange = "pitch-change";
    public static TempoChange = "tempo-change";
    public static TransposeMode = "transpose-mode";
    public static AboutToDraw = "about-to-draw";
    public static FinishedDrawing = "finished-drawing";
}

export const DispatcherService = new DispatcherBase();
