export interface MediaInfo {
    song: string;
    artist: string;
    album: string;
    image: string; /*base64 encoded */
    year: string;
}

/* Project DataType */
export interface ProjectInfo {
    media: string;
    original: string;
    cqt: string;
    tempo: string;
    beats: string;
    key: string;
    chords: string;
    metadata: string;
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
export const ExtClasses: { [key: string]: string } = {
    TEXT_LARGER: "bp3-text-larger",
    TEXT_LARGER_2: "bp3-text-larger-2",
}

/* Hotkeys */
export interface Hotkey {
    info: string;
    hotkey: string;
}
export const HotkeyInfo: { [key: string]: Hotkey } = {
    SHOW_ALL_HOTKEYS: { info: "Show this dialog", hotkey: "shift+?" },
    PLAY_PAUSE: { info: "Play/Pause", hotkey: "space" },
    FWD: { info: "Seek Forward", hotkey: "right" },
    REWIND: { info: "Seek Barwards", hotkey: "left" },
    VOL_UP: { info: "Volume Up", hotkey: "up" },
    VOL_DOWN: { info: "Volume Down", hotkey: "down" },
}

export default {};
