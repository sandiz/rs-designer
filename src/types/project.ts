import {
    NoteTime, SongKey, ChordTime, BeatTime, allTunings,
} from "./musictheory";
import { EQTag } from "./eq";
import { ProjectSettings } from "./settings";
import { fs } from "./base";

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

    constructor(params: Instruments = {} as Instruments) {
        this[Instrument.leadGuitar] = params[Instrument.leadGuitar];
        this[Instrument.rhythmGuitar] = params[Instrument.rhythmGuitar];
        this[Instrument.bassGuitar] = params[Instrument.bassGuitar];
        this[Instrument.ukulele] = params[Instrument.ukulele];
    }
}
export class InstrumentsInMemory {
    public [Instrument.leadGuitar]: InstrumentNotesInMem[] = [];
    public [Instrument.rhythmGuitar]: InstrumentNotesInMem[] = [];
    public [Instrument.bassGuitar]: InstrumentNotesInMem[] = [];
    public [Instrument.ukulele]: InstrumentNotesInMem[] = [];
}
export class ProjectInfo {
    public media = "";
    public original = "";
    public cqt = "";
    public tempo = "";
    public beats = "";
    public key = "";
    public chords = "";
    public metadata = "";
    public version = ProjectInfo.currentVersion;
    public projectPath = "";
    public instruments: Instruments = new Instruments();
    public settings: ProjectSettings = new ProjectSettings();
    static currentVersion = 3;

    constructor(params: ProjectInfo = {} as ProjectInfo) {
        const {
            media = "",
            original = "",
            cqt = "",
            tempo = "",
            beats = "",
            key = "",
            chords = "",
            metadata = "",
            version = ProjectInfo.currentVersion,
            projectPath = "",
            instruments = {} as Instruments,
            settings = {} as ProjectSettings,
        } = params;

        this.media = media;
        this.original = original;
        this.cqt = cqt;
        this.tempo = tempo;
        this.beats = beats;
        this.key = key;
        this.chords = chords;
        this.metadata = metadata;
        this.version = version;
        this.projectPath = projectPath;
        this.instruments = new Instruments(instruments);
        this.settings = new ProjectSettings(settings);
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
