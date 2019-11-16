import React, { Component } from 'react';
import { KeyCombo, IconName } from "@blueprintjs/core";

import * as YTDL from 'youtube-dl';
import * as PATH from 'path';
import * as FS from 'fs';
import * as OS from 'os';
import * as SPAWN from 'cross-spawn';
import { DispatcherService, DispatchEvents, DispatchData } from './services/dispatcher';

export const path: typeof PATH = window.require("path");
export const youtube: typeof YTDL = window.require("youtube-dl");
export const fs: typeof FS = window.require("fs");
export const os: typeof OS = window.require("os");
export const spawn: typeof SPAWN = window.require('cross-spawn');

const { platform } = window.require('os');
const isWin = platform() === "win32";
const isMac = platform() === "darwin";

/*declare global {
    interface Window {
    }
}*/

export interface MediaInfo {
    song: string;
    artist: string;
    album: string;
    image: string; /*base64 encoded */
    year: string;
}

/* Project DataType */
export class ProjectInfo {
    public media: string;
    public original: string;
    public cqt: string;
    public tempo: string;
    public beats: string;
    public key: string;
    public chords: string;
    public metadata: string;
    public version: number;
    public projectPath: string;

    static currentVersion = 1;
    constructor() {
        this.media = "";
        this.original = "";
        this.cqt = "";
        this.tempo = "";
        this.beats = "";
        this.key = "";
        this.chords = "";
        this.metadata = "";
        this.version = ProjectInfo.currentVersion;
        this.projectPath = "";
    }
}
export class ProjectSettingsModel {
    public lastOpenedProject: ProjectInfo | null;
    public recents: ProjectInfo[];

    //eslint-disable-next-line
    constructor(projectData: any) {
        this.lastOpenedProject = null;
        this.recents = [];
        if (projectData && typeof projectData === 'object') {
            this.lastOpenedProject = projectData.lastOpenedProject;
            this.recents = projectData.recents;
        }
    }
}

export interface ProjectMetadata {
    name: string;
    path: string;
    key: string;
    tempo: number;
}

export type ProjectDetails = { metadata: ProjectMetadata | null; loaded: boolean };

/* Music Theory */
export interface ChordTime {
    start: string;
    end: string;
    key: string;
    type: string;
}
export interface BeatTime {
    start: string;
    beatNum: string;
}
export interface ScaleInfo {
    steps: string[];
    chordType: string[];
}
export interface CircleOfFifths {
    majors: string[];
    minors: string[];
}
export interface ChordChart {
    positions: string[];
    fingers: string[];
    fret: number;
}
export interface ChordInfo {
    chord_name: string;
    chord_charts: ChordChart[];
    notes: string;
}

/* extended bp3 classes */
export class ExtClasses {
    public static TEXT_LARGER = "bp3-text-larger";
    public static TEXT_LARGER_2 = "bp3-text-larger-2";
    public static DARK_BACKGROUND_COLOR = "#30404E";
    public static BACKGROUND_COLOR = "#FFFFFF";
}

/* Hotkeys */
export interface Hotkey {
    info: string;
    hotkey: string | string[];
    group?: string;
    idx?: number;
}
export const HotkeyInfo: { [key: string]: Hotkey } = {
    SHOW_ALL_HOTKEYS: { info: "Show this dialog", hotkey: "shift+?" },
    PLAY_PAUSE: { info: "Play/Pause", hotkey: ["space", "enter"] },
    FWD: { info: "Seek Forward", hotkey: "right" },
    REWIND: { info: "Seek Barwards", hotkey: "left" },
    STOP: { info: "Stop", hotkey: "s" },
    VOL_UP: { info: "Volume Up", hotkey: "up" },
    VOL_DOWN: { info: "Volume Down", hotkey: "down" },
    OPEN_PROJECT: {
        info: "Open Project", hotkey: ["command+o", "ctrl+o"], group: "project", idx: 1,
    },
    SAVE_PROJECT: {
        info: "Save Project", hotkey: ["command+s", "ctrl+s"], group: "project", idx: 2,
    },
    OPEN_LAST_PROJECT: {
        info: "Open Last Project", hotkey: ["command+1", "ctrl+1"], group: "project", idx: 3,
    },
    CLOSE_PROJECT: {
        info: "Close Project", hotkey: ["command+w", "ctrl+w"], group: "project", idx: 4,
    },
    IMPORT_MEDIA: {
        info: "Import Media", hotkey: ["command+m", "ctrl+m"], group: "project", idx: 5,
    },
    IMPORT_URL: {
        info: "Import URL", hotkey: ["command+u", "ctrl+u"], group: "project", idx: 6,
    },
    EDIT_METADATA: {
        info: "Edit Metadata", hotkey: ["command+e", "ctrl+e"], group: "project", idx: 7,
    },
}

export const getHotkey = (h: Hotkey) => {
    if (Array.isArray(h.hotkey)) {
        for (let i = 0; i < h.hotkey.length; i += 1) {
            const s = h.hotkey[i];
            if (s.includes("ctrl")) {
                if (isWin) {
                    return <KeyCombo key={s} combo={s} />
                }
            }
            else if (s.includes("command")) {
                if (isMac) {
                    return <KeyCombo key={s} combo={s} />
                }
            }
            else {
                return <KeyCombo key={s} combo={s} />
            }
        }
        return null;
    }
    else {
        return <KeyCombo key={h.hotkey} combo={h.hotkey} />
    }
}

export interface HotKeyState {
    isHKEnabled: boolean;
}

export class HotKeyComponent<P, Q extends HotKeyState> extends Component<P, Q> {
    //eslint-disable-next-line
    constructor(props: P) {
        super(props);
        this.state = this.getInitialState();
    }

    getInitialState() {
        return { isHKEnabled: true } as Q;
    }

    private _handleKbd(kbdEnable: DispatchData) {
        this.setState({ isHKEnabled: kbdEnable as boolean });
    }

    _componentDidMount() {
        DispatcherService.on(DispatchEvents.KbdShortcuts, this._handleKbd.bind(this));
    }

    _componentWillUnmount() {
        DispatcherService.off(DispatchEvents.KbdShortcuts, this._handleKbd.bind(this));
    }

    kbdProxy(cb: () => void) { if (this.state.isHKEnabled) cb(); }
}


export enum MEDIA_STATE { STOPPED, PLAYING, PAUSED }
export enum VOLUME { MAX = 1, MIN = 0, DEFAULT = 0.5 }

export interface DialogContent {
    content: React.ReactElement;
    icon: IconName;
    text: React.ReactElement | string;
    class: string;
    onClose(): void;
    canOutsideClickClose: boolean;
    canEscapeKeyClose: boolean;
}

/* dialog onchange handler typedef */
export type OnChangeHandler = React.FormEventHandler<HTMLElement> & React.ChangeEvent<HTMLInputElement>;

export default {};
