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
    public static MediaReady = "media-ready";           /* fired when media is loaded and ready to play (source: mediaplayer) */
    public static MediaReset = "media-reset";           /* fired when media is unloaded (source: mediaplayer) */
    public static MediaLoading = "media-loading";       /* fired when media is about to be loaded (source: mediaplayer) */

    public static SettingsUpdate = "settings-update";   /* TODO */

    public static ProjectSave = "project-save";         /* event to trigger a project save (source: any, handler: project) */
    public static ProjectOpen = "project-open";         /* event to trigger a project open (source: any, handler: project) */
    public static ProjectClose = "project-close";       /* event to trigger a project close (source: any, handler: project) */
    public static ProjectUpdated = "project-updated";   /* fired when a project file or settings was updated (source: project) */
    public static ProjectOpened = "project-opened";     /* fired when a project was opened (source: project) */
    public static ProjectClosed = "project-closed";     /* fired when a project was closed (source: project) */
}

export const DispatcherService = new DispatcherBase();
