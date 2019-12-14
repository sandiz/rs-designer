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
