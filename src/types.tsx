import React, { Component } from 'react';
import { KeyCombo, IconName } from "@blueprintjs/core";

import * as YTDL from 'youtube-dl';
import * as PATH from 'path';
import * as FS from 'fs';
import * as OS from 'os';
import * as SPAWN from 'cross-spawn';
import { DispatcherService, DispatchEvents, DispatchData } from './services/dispatcher';
import { ProjectSettings } from './settings';

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
export class InstrumentsInMemory {
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
    public settings: ProjectSettings;
    static currentVersion = 3;

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
        this.settings = new ProjectSettings(null, null);
    }
}
/* Classes maintaining an history of projects */

export class AppSettings {
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

export enum NoteType { NOTE, CHORD }
export class NoteFile {
    public notes: NoteTime[];
    public version: number;
    static currentVersion = 1;

    constructor(n: NoteTime[] = []) {
        this.notes = n;
        this.version = NoteFile.currentVersion;
    }
}
export class NoteTime {
    public string: number;
    public fret: number;
    public type: NoteType;
    public startTime: number;
    public endTime: number;

    constructor(s = -1, f = -1, t: NoteType = NoteType.NOTE, st = -1, et = -1) {
        this.string = s;
        this.fret = f;
        this.type = t;
        this.startTime = st;
        this.endTime = et;
    }
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

/* eslint-disable @typescript-eslint/camelcase */
export const baseTuning = ["E", "A", "D", "G", "B", "E"];
export const allTunings = {
    E_Standard: [0, 0, 0, 0, 0, 0],
    Eb_Standard: [-1, -1, -1, -1, -1, -1],
    Drop_D: [-2, 0, 0, 0, 0, 0],
    F_Standard: [1, 1, 1, 1, 1, 1],
    Eb_Drop_Db: [-3, -1, -1, -1, -1, -1],
    D_Standard: [-2, -2, -2, -2, -2, -2],
    D_Drop_C: [-4, -2, -2, -2, -2, -2],
    Db_Standard: [-3, -3, -3, -3, -3, -3],
    Db_Drop_B: [-5, -3, -3, -3, -3, -3],
    C_Standard: [-4, -4, -4, -4, -4, -4],
    C_Drop_Bb: [-6, -4, -4, -4, -4, -4],
    B_Standard: [-5, -5, -5, -5, -5, -5],
    B_Drop_A: [-7, -5, -5, -5, -5, -5],
    Open_A: [0, 0, 2, 2, 2, 0],
    Open_D: [-2, 0, 0, -1, -2, -2],
    Open_G: [-2, -2, 0, 0, 0, -2],
    Open_E: [0, 2, 2, 1, 0, 0],
    DADGAD: [-2, 0, 0, 0, -2, -2],
}

export const InstrumentOptions = {
    [Instrument.leadGuitar]: {
        title: "Lead Guitar",
        strings: 6,
        tuning: allTunings.E_Standard,
    },
    [Instrument.rhythmGuitar]: {
        title: "Rhythm Guitar",
        strings: 6,
        tuning: allTunings.E_Standard,
    },
    [Instrument.bassGuitar]: {
        title: "Bass Guitar",
        strings: 4,
        tuning: allTunings.E_Standard,
    },
    [Instrument.ukulele]: {
        title: "Ukulele",
        strings: 4,
        tuning: allTunings.E_Standard,
    },
}

export interface ChartTag {
    key: string;
    value: string;
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
        info: "Open [ meend-intelligence ] panel", hotkey: ["command+p", "ctrl+space"],
    },
    SELECT_ALL_NOTES: {
        info: "Select all notes", hotkey: ["command+a", "ctrl+a"], group: "Note Editor", idx: 1,
    },
    DELETE_NOTES: {
        info: "Delete selected note(s)", hotkey: ["del", "backspace"], group: "Note Editor", idx: 2,
    },
    CUT_NOTES: {
        info: "Remove note(s) and save it in a buffer", hotkey: ["command+x", "ctrl+x"], group: "Note Editor", idx: 3,
    },
    COPY_NOTES: {
        info: "Copy note(s) and save it in a buffer", hotkey: ["command+c", "ctrl+c"], group: "Note Editor", idx: 4,
    },
    PASTE_NOTES: {
        info: "Paste note(s) that were saved in the buffer", hotkey: ["command+v", "ctrl+v"], group: "Note Editor", idx: 5,
    },
    MOVE_NOTES_LEFT: {
        info: "Move note(s) backwards by one beat", hotkey: ["shift+left"], group: "Note Editor", idx: 6,
    },
    MOVE_NOTES_RIGHT: {
        info: "Move note(s) forwards by one beat", hotkey: ["shift+right"], group: "Note Editor", idx: 7,
    },
    MOVE_NOTES_UP: {
        info: "Move note(s) to the next higher string", hotkey: ["shift+up"], group: "Note Editor", idx: 8,
    },
    MOVE_NOTES_DOWN: {
        info: "Move note(s) to the next lower string", hotkey: ["shift+down"], group: "Note Editor", idx: 9,
    },
    TOGGLE_METRONOME: {
        info: "Toggle Metronome", hotkey: ["m"], group: "Note Editor", idx: 10,
    },
    TOGGLE_CLAPS: {
        info: "Toggle Claps", hotkey: ["c"], group: "Note Editor", idx: 11,
    },
    TOGGLE_NOTE_PLAY: {
        info: "Toggle Note Play", hotkey: ["n"], group: "Note Editor", idx: 12,
    },
    SELECT_NEXT_NOTE: {
        info: "Select next note", hotkey: ["tab", "l"], group: "Note Editor", idx: 13,
    },
    SELECT_PREV_NOTE: {
        info: "Select previous note", hotkey: ["shift+tab", "j"], group: "Note Editor", idx: 14,
    },
    SELECT_NOTE_ABOVE: {
        info: "Select note above", hotkey: ["i"], group: "Note Editor", idx: 15,
    },
    SELECT_NOTE_BELOW: {
        info: "Select note below", hotkey: ["k"], group: "Note Editor", idx: 16,
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
