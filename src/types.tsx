
/*
declare global {
    interface Window {
    }
}
*/

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
}

/* Hotkeys */
export interface Hotkey {
    info: string;
    hotkey: string | string[];
    group?: string;
}
export const HotkeyInfo: { [key: string]: Hotkey } = {
    SHOW_ALL_HOTKEYS: { info: "Show this dialog", hotkey: "shift+?" },
    PLAY_PAUSE: { info: "Play/Pause", hotkey: "space" },
    FWD: { info: "Seek Forward", hotkey: "right" },
    REWIND: { info: "Seek Barwards", hotkey: "left" },
    VOL_UP: { info: "Volume Up", hotkey: "up" },
    VOL_DOWN: { info: "Volume Down", hotkey: "down" },
    OPEN_PROJECT: { info: "Open Project", hotkey: ["command+o", "ctrl+o"], group: "project" },
    SAVE_PROJECT: { info: "Save Project", hotkey: ["command+s", "ctrl+s"], group: "project" },
    OPEN_LAST_PROJECT: { info: "Open Last Project", hotkey: ["command+1", "ctrl+1"], group: "project" },
    CLOSE_PROJECT: { info: "Close Project", hotkey: ["command+w", "ctrl+w"], group: "project" },
}

export default {};
