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

/* class representing the metadata of the media (ID3 tags)*/
export interface MediaInfo {
    song: string;
    artist: string;
    album: string;
    image: string; /*base64 encoded */
    year: string;
}

/* class representing the Project that's loaded or saved to disk.
   Update version number to add new field to the project and optionally modify Project::loadProject
   to migrate the serialized version to new version
  */
export interface InstrumentNotes {
    file: string;
    tags: string[];
}
export interface InstrumentNotesInMem {
    notes: NoteTime[];
    tags: string[];
}
export enum Instrument { leadGuitar = "leadGuitar", rhythmGuitar = "rhythmGuitar", bassGuitar = "bassGuitar", ukulele = "ukulele" }
export class Instruments {
    public [Instrument.leadGuitar]: InstrumentNotes[] = [];
    public [Instrument.rhythmGuitar]: InstrumentNotes[] = [];
    public [Instrument.bassGuitar]: InstrumentNotes[] = [];
    public [Instrument.ukulele]: InstrumentNotes[] = [];
}
export class InstrumentsInMem {
    public [Instrument.leadGuitar]: InstrumentNotesInMem[] = [];
    public [Instrument.rhythmGuitar]: InstrumentNotesInMem[] = [];
    public [Instrument.bassGuitar]: InstrumentNotesInMem[] = [];
    public [Instrument.ukulele]: InstrumentNotesInMem[] = [];
}
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
    public instruments: Instruments;

    static currentVersion = 2;
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
        this.instruments = new Instruments();
    }
}
/* Classes maintaining an history of projects */
export class ProjectSettingsModel {
    public lastOpenedProject: ProjectInfo | null;
    public recents: ProjectInfo[];
    public lastUsedEQTags: EQTag[];

    //eslint-disable-next-line
    constructor(projectData: any) {
        this.lastOpenedProject = null;
        this.recents = [];
        this.lastUsedEQTags = [];
        if (projectData && typeof projectData === 'object') {
            this.lastOpenedProject = projectData.lastOpenedProject;
            for (let i = 0; i < projectData.recents.length; i += 1) {
                const pR = projectData.recents[i] as ProjectInfo;
                if (fs.existsSync(pR.media)) {
                    this.recents.push(pR);
                }
            }
            if (projectData.lastUsedEQTags) {
                this.lastUsedEQTags = projectData.lastUsedEQTags;
            }
        }
    }
}

/* Class storing the analysis data for the Project */
export class ProjectMetadata {
    name = "";
    path = "";
    key: SongKey = ["-", "-", -1];
    tempo = 0;
    chords: ChordTime[] = [];
    beats: BeatTime[] = [];

    constructor(name?: string, path1?: string, key?: SongKey, tempo?: number, chords?: ChordTime[], beats?: BeatTime[]) {
        this.name = name || "";
        this.path = path1 || "";
        this.key = key || ["-", "-", -1];
        this.tempo = tempo || 0;
        this.chords = chords || [];
        this.beats = beats || [];
    }

    public isEmpty = () => {
        return this.name === "" && this.path === "";
    }
}

export type ProjectDetails = { metadata: ProjectMetadata | null; loaded?: boolean };

/* Music Theory */
/* type representing the format of Chords serialization */
export type ChordTriplet = [number, number, string]
/* type representing the format of Beats serialization */
export type BeatTriplet = [number, number]
/* tyoe representing the result of music-analysis run, result will be on these */
export type RunnerResult = ChordTriplet[] | BeatTriplet[] | SongKey | number;

/* class representing a chord in memory */
/* generated from ChordTriplet */
export interface ChordTime {
    start: number;
    end: number;
    key: string;
    type: string;
}

/* class represting a Song Key, this is also the serialized representation */
export type SongKey = [string, string, number]

/* class representing a beat in memory */
/* generated from BeatTriplet */
export interface BeatTime {
    start: string;
    beatNum: string;
}

export interface NoteTime {
    string: number;
    fret: number;
    type: "note" | "chord";
    startTime: number;
    endTime: number;
}
/* Represents a minor or major scale */
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

export const baseTuning = ["E", "B", "G", "D", "A", "E"];
export const allTunings = {
    EStandard: [0, 0, 0, 0, 0, 0],
    EbStandard: [-1, -1, -1, -1, -1, -1],
    DropD: [-2, 0, 0, 0, 0, 0],
    FStandard: [1, 1, 1, 1, 1, 1],
    EbDropDb: [-3, -1, -1, -1, -1, -1],
    DStandard: [-2, -2, -2, -2, -2, -2],
    DDropC: [-4, -2, -2, -2, -2, -2],
    DbStandard: [-3, -3, -3, -3, -3, -3],
    DbDropB: [-5, -3, -3, -3, -3, -3],
    CStandard: [-4, -4, -4, -4, -4, -4],
    CDropBb: [-6, -4, -4, -4, -4, -4],
    BStandard: [-5, -5, -5, -5, -5, -5],
    BDropA: [-7, -5, -5, -5, -5, -5],
    OpenA: [0, 0, 2, 2, 2, 0],
    OpenD: [-2, 0, 0, -1, -2, -2],
    OpenG: [-2, -2, 0, 0, 0, -2],
    OpenE: [0, 2, 2, 1, 0, 0],
    DADGAD: [-2, 0, 0, 0, -2, -2],
}
export const InstrumentOptions = {
    [Instrument.leadGuitar]: {
        title: "Lead Guitar",
        strings: 6,
        defaultTuning: allTunings.EStandard,
    },
    [Instrument.rhythmGuitar]: {
        title: "Rhythm Guitar",
        strings: 6,
        defaultTuning: allTunings.EStandard,
    },
    [Instrument.bassGuitar]: {
        title: "Bass Guitar",
        strings: 4,
        defaultTuning: allTunings.EStandard,
    },
    [Instrument.ukulele]: {
        title: "Ukulele",
        strings: 4,
        defaultTuning: allTunings.EStandard,
    },
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
    MEDIA_ADVANCED: {
        info: "Open [ meend-intelligence ] panel", hotkey: ["a"],
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
export enum ZOOM { MAX = 40, MIN = 5, DEFAULT = 5 }
export enum TEMPO { MIN = 50, MAX = 120, DEFAULT = 100 }
export enum KEY { MIN = -12, MAX = 12, DEFAULT = 0 }

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


/* EQ Tag */
export type ExtendedBiquadFilterType = BiquadFilterType | "edit";

export interface EQTag {
    id: string;
    freq: number;
    gain: number;
    q: number;
    type: ExtendedBiquadFilterType;
    color: string;
}

export interface EQFilter {
    tag: EQTag;
    filter: BiquadFilterNode;
}

export interface EQPreset {
    tags: EQTag[];
    name: string;
    default?: boolean;
}

export enum BiQuadFilterNames {
    "lowpass" = "LP",
    "highpass" = "HP",
    "highshelf" = "HS",
    "lowshelf" = "LS",
    "bandpass" = "BP",
    "peaking" = "PK",
    "notch" = "NT",
    "allpass" = "AP",
    "edit" = "edit",
}

export const WasmTypes: { [key: string]: WebAssembly.Exports | null } = {
    cqt: null,
}

export default {};
