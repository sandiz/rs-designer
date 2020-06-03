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

export type DispatchData = string | object | boolean | number | null;
class DispatcherBase {
    public events: { [key: string]: DispatcherEvent }
    private static instance: DispatcherBase;

    static getInstance() {
        if (!DispatcherBase.instance) {
            DispatcherBase.instance = new DispatcherBase();
        }
        return DispatcherBase.instance;
    }
    private constructor() {
        this.events = {};
    }

    public dispatch(eventName: string, data: DispatchData = null) {
        const event = this.events[eventName];
        if (event) {
            event.fire(data);
        }
    }

    public on(eventName: string, callback: DispatchCallback) {
        // console.trace("subscribed to ", eventName);
        let event = this.events[eventName];
        if (!event) {
            event = new DispatcherEvent(eventName);
            this.events[eventName] = event;
        }
        event.registerCallback(callback);
    }

    public off(eventName: string, callback: DispatchCallback) {
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
export enum DispatchEvents {
    AppThemeChanged = "app-theme-changed", /* fired when theme is changed to dark or light */
    MediaReady = "media-ready",           /* fired when media is loaded and ready to play (source: mediaplayer) */
    MediaReset = "media-reset",           /* fired when media is unloaded (source: mediaplayer) */
    MediaLoading = "media-loading",       /* fired when media is about to be loaded (source: mediaplayer) */
    MediaFinishedPlaying = "media-finished-playing",  /* fired when media finishes playing */
    MediaStartedPlaying = "media-started-playing",    /* fired when media starts playing */
    MediaWasPaused = "media-was-paused",              /* fired when media is paused */

    SettingsUpdate = "settings-update",   /* TODO */

    ProjectSave = "project-save",        /* event to trigger a project save (source: any, handler: project) */
    ProjectOpen = "project-open",         /* event to trigger a project open (source: any, handler: project) */
    ProjectClose = "project-close",       /* event to trigger a project close (source: any, handler: project) */
    ProjectUpdated = "project-updated",   /* fired when a project file or settings was updated (source: project) */
    ProjectOpened = "project-opened",     /* fired when a project was opened (source: project) */
    ProjectClosed = "project-closed",     /* fired when a project was closed (source: project) */

    ImportMedia = "import-media",         /* event to trigger a media import (source: any, handler: project) */
    OpenDialog = "open-dialog",           /* event to trigger a dialog open args: DialogContent */
    CloseDialog = "close-dialog",         /* event to close an already open dialog */

    KbdShortcuts = "kbd-shortcuts",       /* event to turn hotkeys on/off */

    /* Music Analysis */
    MusicAnalysisStart = "music-analysis-start",    /* triggers automatic music analysis flow */
    MusicAnalysisStarted = "music-analysis-started",    /* triggers automatic music analysis flow */
    MusicAnalysisEnded = "music-analysis-ended",    /* triggers automatic music analysis flow */
    EqualizerToggle = "equalizer-toggle",           /* toggle equalizer on/off, defaults to off */
    EqualizerToggled = "equalizer-toggled",         /* fired after all eq nodes are attached/removed */

    /* Music Manipulation */
    PitchChange = "pitch-change",       /* fired when the pitch of the song is changed */
    TempoChange = "tempo-change",       /* fired when the tempo of the song is changed */

    WaveformImageGenerated = "waveform-image-generated",
    ZoomChanged = "zoom-changed",

    /* Media Advanced */
    OpenMediaAdvanced = "open-media-advanced",     /* Opens the Media Advanced panel */
    CloseMediaAdvanced = "close-media-advanced",     /* Closes the Media Advanced panel */
}

export const DispatcherService = DispatcherBase.getInstance();
