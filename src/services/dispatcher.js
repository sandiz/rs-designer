class DispatcherEvent {
    constructor(eventName) {
        this.eventName = eventName;
        this.callbacks = [];
    }

    registerCallback(callback) {
        this.callbacks.push(callback);
    }

    unregisterCallback(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }

    fire(data) {
        const callbacks = this.callbacks.slice(0);
        callbacks.forEach((callback) => {
            callback(data);
        });
    }
}


class DispatcherBase {
    constructor() {
        this.events = {};
    }

    dispatch(eventName, data) {
        const event = this.events[eventName];
        if (event) {
            event.fire(data);
        }
    }

    on(eventName, callback) {
        let event = this.events[eventName];
        if (!event) {
            event = new DispatcherEvent(eventName);
            this.events[eventName] = event;
        }
        event.registerCallback(callback);
    }

    off(eventName, callback) {
        const event = this.events[eventName];
        if (event && event.callbacks.indexOf(callback) > -1) {
            event.unregisterCallback(callback);
            if (event.callbacks.length === 0) {
                delete this.events[eventName];
            }
        }
    }
}
export const DispatchEvents = {
    MediaReady: "media-ready",
    MediaReset: "media-reset",
    MediaAnalysisStart: "media-analysis-start",
    MediaAnalysisEnd: "media-analysis-stop",
    MASpectrogramStart: "media-analysis-cqt-start",
    MASpectrogramEnd: "media-analysis-cqt-end",
    SettingsUpdate: "settings-update",
}

export const KeyboardEvents = {
    PlayPause: "shortcut-play-pause",
    Stop: "shortcut-stop",
    Rewind: "shortcut-rewind",
    FastForward: "shortcut-fast-forward",
    ImportMedia: "shortcut-import-media",
    SaveProject: "shortcut-save-project",
    OpenProject: "shortcut-open-project",
    ToggleControls: "shortcut-toggle-controls-bar",
    ToggleWaveform: "shortcut-toggle-waveform-bar",
    ToggleAnalysis: "shortcut-toggle-analysis-bar",
}


export const DispatcherService = new DispatcherBase();
