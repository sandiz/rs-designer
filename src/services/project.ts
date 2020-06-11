import * as TMP from 'tmp';
import * as FS from 'fs';
import * as PATH from 'path';
import * as READLINE from 'readline';
import * as OS from 'os';

import nextFrame from 'next-frame';
import Tone from 'tone';
import { Intent } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { IAudioMetadata } from 'music-metadata';
import {
    copyFile, writeFile, copyDir, readFile, readTags, removeDir, UUID, exists, collectGC,
} from '../lib/utils'
import { DispatcherService, DispatchEvents, DispatchData } from './dispatcher';
import { pitches, getTransposedKey } from '../lib/music-utils';
import ForageService, { SettingsForageKeys } from './forage';
import {
    AppSettings, ProjectInfo, ProjectMetadata,
    Instruments, Instrument, InstrumentNotes, InstrumentsInMemory, InstrumentNotesInMem,
} from '../types/project'
import {
    ChordTime, BeatTime, SongKey,
    ChordTriplet, BeatTriplet, NoteTime, NoteFile, CQTResult,
} from '../types/musictheory'
import { EQTag } from '../types/eq';
import { MediaInfo } from '../types/media'
import { ProjectSettings } from '../types/settings';
import MediaPlayerService from './mediaplayer';
import MusicAnalysisService from '../lib/musicanalysis';
import {
    successToaster, progressToaster, errorToaster, dismissToaster,
} from '../components/Extended/Toasters';
import GitService from './git';

const { app, dialog } = window.require('electron').remote;

const readline: typeof READLINE = window.require("readline");
const os: typeof OS = window.require("os");
const path: typeof PATH = window.require('path');
const tmp: typeof TMP = window.require('tmp');
const fs: typeof FS = window.require("fs");

const projectExt = "rsdproject";
const bundleExt = "rsdbundle";
const isWin = os.platform() === "win32";

export enum ProjectUpdateType {
    ProjectInfoCreated = "project-info-created",
    ExternalFilesUpdate = "external-files-update",
    MediaInfoUpdated = "media-info-updated",
    InstrumentNotesUpdated = "instrument-notes-updated"
}
export class Project {
    public projectDirectory: string;
    public projectFileName: string;
    public isTemporary: boolean;
    public isLoaded: boolean;
    public isLoading: boolean;
    public isDirty: boolean;
    public projectInfo: ProjectInfo | null;
    public tmpHandle: TMP.DirResult | null;
    public appSettings: AppSettings | null;
    public inMemoryInstruments: InstrumentsInMemory;
    static MAX_RECENTS = 10;

    private static instance: Project;

    static getInstance() {
        if (!Project.instance) {
            Project.instance = new Project();
        }
        return Project.instance;
    }

    private constructor() {
        tmp.setGracefulCleanup();
        this.projectDirectory = "";
        this.isTemporary = false;
        this.isLoaded = false;
        this.tmpHandle = null;
        this.isDirty = false;
        this.projectFileName = '';
        this.projectInfo = null;
        this.appSettings = null;
        this.isLoading = false;
        this.inMemoryInstruments = new InstrumentsInMemory();

        DispatcherService.on(DispatchEvents.ProjectOpen, (data: DispatchData) => this.openProject(data as string | null));
        DispatcherService.on(DispatchEvents.ImportMedia, (data: DispatchData) => this.importMedia(data as string | null));
        DispatcherService.on(DispatchEvents.ProjectSave, this.saveProject);
        DispatcherService.on(DispatchEvents.ProjectClose, this.closeProject);

        app.on('before-quit', this.unload);
        this.loadAppSettings();
    }

    public destructor() {
        app.off('before-quit', this.unload)
    }

    public clearRecents = async () => {
        if (this.appSettings) {
            this.appSettings.recents = [];
            await ForageService.set(SettingsForageKeys.PROJECT_SETTINGS, this.appSettings);
        }
    }

    public getRecents = async (): Promise<ProjectInfo[]> => {
        await this.loadAppSettings();
        if (this.appSettings) {
            return this.appSettings.recents;
        }
        return [];
    }

    private loadAppSettings = async () => {
        const ser = await ForageService.get(SettingsForageKeys.PROJECT_SETTINGS);
        if (ser) this.appSettings = new AppSettings(ser);
        else this.appSettings = new AppSettings(null);
    }

    private saveAppSettings = async () => {
        // dont save temp projects to recents/last opened 
        if (this.isTemporary) return;
        if (this.appSettings && this.projectInfo) {
            this.appSettings.lastOpenedProject = this.projectInfo;

            let dupIdx = 0;
            let dupItem: ProjectInfo | null = null;
            this.appSettings.recents.forEach((i, idx) => {
                if (this.projectInfo && i.media === this.projectInfo.media) {
                    dupIdx = idx;
                    dupItem = i;
                }
            });
            if (this.appSettings.recents.length >= Project.MAX_RECENTS) {
                this.appSettings.recents = this.appSettings.recents.slice(0, Project.MAX_RECENTS);
            }
            if (dupItem) {
                this.appSettings.recents.splice(dupIdx, 1);
                this.appSettings.recents.unshift(dupItem);
            }
            else {
                this.appSettings.recents.push(this.projectInfo);
            }
            await ForageService.set(SettingsForageKeys.PROJECT_SETTINGS, this.appSettings);
        }
    }

    public saveLastEQTags(tags: EQTag[]) {
        if (this.appSettings) {
            if (tags.length > 0) {
                this.appSettings.lastUsedEQTags = tags.filter((tag: EQTag) => tag.type !== 'edit');
                this.saveAppSettings();
            }
        }
    }

    public isProjectLoaded() {
        return this.isLoaded;
    }

    private unload() {
        this.isLoading = false;
        this.isLoaded = false;
        this.isTemporary = false;
        this.projectDirectory = "";
        this.isDirty = false;
        if (this.tmpHandle) {
            this.tmpHandle.removeCallback();
            this.tmpHandle = null;
        }
        this.projectInfo = null;
        this.projectFileName = '';
        this.inMemoryInstruments = new InstrumentsInMemory();
        MediaPlayerService.empty();
        MediaPlayerService.unload();
        collectGC();
    }

    private closeProject = () => {
        if (this.isLoading) {
            errorToaster("Close Project failed:  please wait for the project to finish loading");
            return;
        }
        if (this.isProjectLoaded()) {
            this.unload();
            DispatcherService.dispatch(DispatchEvents.ProjectClosed);
            successToaster("Project Closed", Intent.NONE, IconNames.TICK);
            this.projectInfo = null;
        }
    }

    public openLastProject = async () => {
        await this.loadAppSettings();
        const lp = this.getLastOpenedProject();
        if (lp && lp.projectPath) {
            const stat = await fs.promises.stat(lp.projectPath);
            if (stat) {
                await this.openProject(lp.projectPath);
            }
        }
        else {
            errorToaster("No recently opened project found");
        }
    }

    private openProject = async (externalProject: string | null, importingMedia = false) => {
        if (this.isLoading) {
            errorToaster("Open Project failed:  another project is already being loaded");
            return;
        }
        const total = 3;
        const key = progressToaster("Opening Project", 0.5, total);
        try {
            if (this.isProjectLoaded() && !importingMedia) {
                this.closeProject();
            }
            this.isLoading = true;
            const pInfo = await this.loadProject(externalProject);
            if (pInfo && pInfo.media) {
                progressToaster("Reading Media", 1, total, key);

                const data: Buffer = await readFile(pInfo.media);
                progressToaster("Generating Waveform", 2, total, key);

                let blob = new window.Blob([new Uint8Array(data)]);
                const url = URL.createObjectURL(blob);
                await MediaPlayerService.loadMedia(blob);
                blob = new Blob();

                await nextFrame();
                DispatcherService.dispatch(DispatchEvents.ProjectOpened);
                progressToaster("Project Opened", 3, total, key);

                await MusicAnalysisService.analyse();
                this.isLoading = false;
                URL.revokeObjectURL(url);
                return;
            }
        }
        catch (e) {
            console.warn("open-project failed", e);
        }
        dismissToaster(key);
        this.isLoading = false;
    }

    private loadProject = async (externalProject: string | null): Promise<ProjectInfo | null> => {
        let dirs = [];
        if (externalProject) {
            dirs.push(externalProject);
        }
        else {
            const filters = [
                { name: "RSDesigner Bundle", extensions: [bundleExt] },
                { name: "RSDesigner Project", extensions: [projectExt] },
            ];
            // bundle is only applicable on mac
            if (isWin === true) {
                delete filters[0];
            }

            const out = await dialog.showOpenDialog({
                title: "Open Project..",
                buttonLabel: "Open",
                properties: ['openFile'],
                filters,
            });
            dirs = out.filePaths;
        }
        if (dirs && dirs.length > 0) {
            let dir = dirs[0];

            let jsonPath = "";
            if (dir.endsWith(bundleExt)) {
                jsonPath = dir + `/project.${projectExt}`
            }
            else if (dir.endsWith(`.${projectExt}`)) {
                jsonPath = dir;
                const p = path.parse(dir);
                if (p) {
                    dir = p.dir;
                }
            }
            if (jsonPath.length > 0) {
                const data = await readFile(jsonPath);
                const json: ProjectInfo = new ProjectInfo(JSON.parse(data.toString()));

                /* migrate project file to current version */
                if (json.version !== ProjectInfo.currentVersion) {
                    console.info("bumping project json to version", NoteFile.currentVersion, "from", json.version);
                    switch (json.version + 1) {
                        default:
                        case 1:
                            json.projectPath = jsonPath;
                        // falls through
                        case 2:
                            json.instruments = new Instruments();
                        // falls through
                        case 3:
                            json.settings = new ProjectSettings();
                        // falls through
                        case 4:
                            json.regions = [];
                            break;
                    }
                    json.version = ProjectInfo.currentVersion;
                }

                /* set directory and other globals, projectInfo is ignored */
                await this.updateProjectInfo(
                    dir,
                    this.isTemporary,
                    true,
                    '',
                    true, /* readonly */
                );
                /* set project info */
                this.projectInfo = json;
                if (!this.isTemporary) {
                    app.addRecentDocument(dir);
                    await this.saveAppSettings();
                }
                await GitService.init(this.projectDirectory);
                await this.updateExternalFiles();
                await this.loadInstruments();
                if (!this.getFirstValidInstrument()) {
                    this.createInstrument(Instrument.leadGuitar);
                }
                return this.projectInfo;
            }
        }
        return null;
    }

    public getProjectInfo = () => {
        return this.projectInfo;
    }

    public getProjectFilename = () => {
        return this.projectFileName;
    }

    public getProjectDir = () => {
        return this.projectDirectory;
    }

    private saveProject = async () => {
        if (this.isLoaded) {
            this.saveRegions();
            if (this.isTemporary) {
                const out = await dialog.showOpenDialog({
                    title: "Choose directory to save project to..",
                    buttonLabel: "Save",
                    properties: ['openDirectory'],
                });
                const dirs = out.filePaths;
                if (dirs && dirs.length > 0 && this.projectInfo) {
                    const lastPInfo = this.projectInfo;
                    const basen = path.parse(lastPInfo.original).name;
                    const dir = dirs[0] + `/${basen}.${bundleExt}`;
                    /* copy dir */
                    await copyDir(this.projectDirectory, dir, {
                        overwrite: true,
                    });
                    console.log("removing temp directory: ", this.projectDirectory);
                    /* delete old temp dir */
                    await removeDir(this.projectDirectory);

                    await this.updateProjectInfo(
                        dir,
                        false,
                        true,
                        lastPInfo.original,
                    )
                    await this.updateExternalFiles();
                }
                else {
                    return false;
                }
            }
            else {
                //serialize
                await writeFile(this.projectFileName, JSON.stringify(this.projectInfo));
            }
            await GitService.addFilesFromAndCommit(this.projectDirectory);
            this.saveAppSettings();
            this.saveInstruments();
            DispatcherService.dispatch(DispatchEvents.ProjectUpdated, null);
            successToaster("Project Saved")
            return true;
        }
        return false;
    }

    public updateSongKey = async (data: SongKey) => {
        if (this.projectInfo) {
            await writeFile(this.projectInfo.key, JSON.stringify(data));
            DispatcherService.dispatch(DispatchEvents.ProjectUpdated, ProjectUpdateType.ExternalFilesUpdate);
        }
    }

    public updateTempo = async (data: number) => {
        if (this.projectInfo) {
            await writeFile(this.projectInfo.tempo, JSON.stringify(data));
            DispatcherService.dispatch(DispatchEvents.ProjectUpdated, ProjectUpdateType.ExternalFilesUpdate);
        }
    }

    public updateChords = async (data: ChordTriplet[]) => {
        if (this.projectInfo) {
            const lines = data.join("\n");
            await writeFile(this.projectInfo.chords, lines);
            DispatcherService.dispatch(DispatchEvents.ProjectUpdated, ProjectUpdateType.ExternalFilesUpdate);
        }
    }

    public updateBeats = async (data: BeatTriplet[]) => {
        if (this.projectInfo) {
            const lines = data.map((item) => `${item[0]} ${item[1]}`).join("\n");
            await writeFile(this.projectInfo.beats, lines);
            DispatcherService.dispatch(DispatchEvents.ProjectUpdated, ProjectUpdateType.ExternalFilesUpdate);
        }
    }

    public updateCQT = async (data: CQTResult) => {
        console.log("updateCQT", data);
    }

    private updateExternalFiles = async () => {
        if (this.projectInfo) {
            this.projectInfo.cqt = path.join(this.projectDirectory, 'cqt.raw.png');
            this.projectInfo.tempo = path.join(this.projectDirectory, 'tempo');
            this.projectInfo.beats = path.join(this.projectDirectory, 'beats');
            this.projectInfo.key = path.join(this.projectDirectory, 'key');
            this.projectInfo.chords = path.join(this.projectDirectory, 'chords');
            this.projectInfo.metadata = path.join(this.projectDirectory, 'metadata.json');
            await writeFile(this.projectFileName, JSON.stringify(this.projectInfo));
            DispatcherService.dispatch(DispatchEvents.ProjectUpdated, ProjectUpdateType.ExternalFilesUpdate);
        }
    }

    private updateProjectInfo = async (dir: string, istemp: boolean, isloaded: boolean, file: string, readOnly = false, dispatch = true) => {
        const ext = path.extname(file);
        this.projectDirectory = dir;
        this.projectFileName = `${this.projectDirectory}/project.${projectExt}`;
        this.isTemporary = istemp;
        this.isLoaded = isloaded;
        this.projectInfo = new ProjectInfo();
        this.projectInfo.media = `${this.projectDirectory}/media${ext}`;
        this.projectInfo.original = file;
        this.projectInfo.projectPath = this.projectFileName;
        if (!readOnly) {
            await writeFile(this.projectFileName, JSON.stringify(this.projectInfo));
        }
        if (dispatch) {
            DispatcherService.dispatch(DispatchEvents.ProjectUpdated, ProjectUpdateType.ProjectInfoCreated);
        }
    }

    private createTemporaryProject = async (file: string): Promise<string> => {
        this.unload();
        /* create temp dir */
        this.tmpHandle = tmp.dirSync({
            unsafeCleanup: true,
            postfix: ".rsdbundle",
        });
        if (this.tmpHandle) {
            this.updateProjectInfo(
                this.tmpHandle.name,
                true,
                true,
                file,
                false,
                false,
            );
            if (this.projectInfo) {
                const src = file
                const dest = this.projectInfo.media;
                /* copy mp3 here */
                await copyFile(src, dest);

                return this.tmpHandle.name;
            }
        }
        return "";
    }

    public readMetadata = async (): Promise<MediaInfo | undefined> => {
        if (this.projectInfo == null || this.projectInfo.metadata == null) return undefined;
        const mm = this.projectInfo.metadata;
        try {
            const data = await readFile(mm)
            return JSON.parse(data.toString());
        }
        catch (e) {
            return undefined;
        }
    }

    private readTempo = async (): Promise<number> => {
        try {
            if (this.projectInfo) {
                if (!fs.existsSync(this.projectInfo.tempo)) return 0;
                const tempoFile = this.projectInfo.tempo;
                const data = await readFile(tempoFile)
                const tempo = parseFloat(data.toString());
                Tone.Transport.bpm.value = tempo;
                //console.info("[project-loader] Tone.js tempo set to ", tempo, "bpm");
                return tempo;
            }
        } catch (e) {
            console.warn("readTempo error", e, JSON.stringify(this.projectInfo));
        }
        return 0;
    }

    private readSongKey = async (): Promise<SongKey> => {
        try {
            if (this.projectInfo) {
                const keyFile = this.projectInfo.key;
                if (!fs.existsSync(keyFile)) return ['-', '-', 0];
                const data = await readFile(keyFile)
                const s: SongKey = JSON.parse(data.toString())
                let note = s[0];
                if (note.endsWith('b')) {
                    //convert to sharp
                    note = note.replace('b', '');
                    let idx = pitches.indexOf(note);
                    if (idx !== -1) {
                        if (idx === 0) idx = pitches.length - 1;
                        const enharmonic = pitches[idx - 1];
                        s[0] = enharmonic;
                    }
                }
                return s;
            }
        }
        catch (e) {
            console.trace("readSongKey error: ", e, JSON.stringify(this.projectInfo));
        }
        return ['-', '-', 0];
    }

    public readChords = async (): Promise<ChordTime[]> => new Promise((resolve, reject) => {
        try {
            if (this.projectInfo == null) return reject();
            if (!fs.existsSync(this.projectInfo.chords)) return resolve([]);
            const lineReader = readline.createInterface({
                input: fs.createReadStream(this.projectInfo.chords),
            });

            const chords: ChordTime[] = []
            lineReader.on('line', (line: string) => {
                const split = line.split(",")
                const start = parseFloat(split[0])
                const end = parseFloat(split[1])
                const chord = split[2]
                const splitch = chord.split(":")
                const key = splitch[0]
                const type = splitch[1]
                chords.push({
                    start, end, key, type,
                })
            });
            lineReader.on('close', () => {
                resolve(chords);
            })
            lineReader.on('error', () => {
                resolve([])
            });
        }
        catch (e) {
            resolve([]);
        }
        return null;
    });

    public readBeats = async (): Promise<BeatTime[]> => new Promise((resolve, reject) => {
        try {
            if (this.projectInfo == null) return reject();
            if (!fs.existsSync(this.projectInfo.beats)) return resolve([]);
            const lineReader = readline.createInterface({
                input: fs.createReadStream(this.projectInfo.beats),
            });

            const beats: BeatTime[] = []
            lineReader.on('line', (line: string) => {
                const split = line.replace(/\s+/g, ' ').trim().split(" ")
                const start = split[0]
                const beatNum = split[1]
                beats.push({ start, beatNum })
            });
            lineReader.on('close', () => {
                resolve(beats);
            })
            lineReader.on('error', () => {
                resolve([])
            });
        }
        catch (e) {
            resolve([]);
        }
        return null;
    });

    public getLastOpenedProject = (): ProjectInfo | null => {
        if (this.appSettings == null) return null;
        return this.appSettings.lastOpenedProject;
    }

    public getProjectMetadata = async (): Promise<ProjectMetadata | null> => {
        if (this.projectInfo) {
            const key = await this.readSongKey();
            const chords = await this.readChords();
            const beats = await this.readBeats();
            return new ProjectMetadata(
                path.basename(this.projectDirectory),
                this.projectDirectory,
                key,
                Math.round(await this.readTempo()),
                chords,
                beats,
                await this.readMetadata(),
            );
        }
        return null;
    }

    private saveMetadata = async (media: IAudioMetadata): Promise<MediaInfo> => {
        let buf = null;
        if (Array.isArray(media.common.picture) && media.common.picture.length > 0) {
            buf = media.common.picture[0].data;
        }
        const metadata: MediaInfo = {
            song: media.common.title ? media.common.title : "",
            artist: media.common.artist ? media.common.artist : "",
            album: media.common.album ? media.common.album : "",
            year: media.common.year ? media.common.year.toString() : "",
            image: buf ? buf.toString('base64') : '',
        };
        if (this.projectInfo) {
            this.projectInfo.metadata = path.join(this.projectDirectory, 'metadata.json');
            await writeFile(this.projectInfo.metadata, JSON.stringify(metadata));
        }
        return metadata;
    }

    public updateMetadata = async (metadata: MediaInfo): Promise<void> => {
        if (this.projectInfo) {
            await writeFile(this.projectInfo.metadata, JSON.stringify(metadata));
            DispatcherService.dispatch(DispatchEvents.ProjectUpdated, ProjectUpdateType.MediaInfoUpdated);
        }
    }

    private importMedia = async (externalMedia: string | null) => {
        if (this.isLoading) {
            errorToaster("Import Media failed:  another project is being loaded");
            return;
        }
        if (this.isProjectLoaded()) {
            this.closeProject();
        }
        this.isLoading = true;
        const key = progressToaster("Importing Media", 1, 2);

        /* prompt for file or use externalMedia */
        let tmpProject: string | null = null;
        if (externalMedia) {
            tmpProject = await this.createTemporaryProject(externalMedia);
        }
        else {
            const files = await dialog.showOpenDialog({
                properties: ["openFile"],
                filters: [
                    { name: 'MP3', extensions: ['mp3'] },
                    { name: 'OGG', extensions: ['ogg'] },
                    { name: 'WAV', extensions: ['wav'] },
                ],
            });
            if (files.filePaths.length > 0) {
                const file = files.filePaths[0];
                tmpProject = await this.createTemporaryProject(file);
            }
        }
        dismissToaster(key);
        if (tmpProject && this.projectInfo) {
            const tags = await readTags(this.projectInfo.original);

            /* assign metadata */
            await this.saveMetadata(tags);
            /* open Project with tmp project */
            this.isLoading = false;
            await this.openProject(this.projectInfo.projectPath, true);
        }
        else {
            this.isLoading = false;
        }
    }

    /* loads the notes from file to memory */
    public loadInstruments = async () => {
        if (this.projectInfo) {
            this.inMemoryInstruments = new InstrumentsInMemory();
            //eslint-disable-next-line
            for (const key in Instrument) {
                const source = this.projectInfo.instruments[key as keyof typeof Instrument]
                const dest = this.inMemoryInstruments[key as keyof typeof Instrument];
                for (let i = 0; i < source.length; i += 1) {
                    const item = source[i] as InstrumentNotes;
                    try {
                        // eslint-disable-next-line
                        const data: NoteFile = new NoteFile(JSON.parse((await readFile(item.file)).toString()));
                        const itemDest = { notes: data.notes, tags: item.tags };
                        /* migrate notes file to current version */
                        if (data.version !== NoteFile.currentVersion) {
                            console.info("bumping instruments json to version", NoteFile.currentVersion, "from", data.version);
                            switch (data.version + 1) {
                                // falls through
                                case 2:
                                    data.notes.forEach(p => {
                                        p.id = UUID();
                                    })
                                // falls through
                                default:
                                    itemDest.notes = [];
                                    if (Array.isArray(data.notes)) {
                                        for (let j = 0; j < data.notes.length; j += 1) {
                                            const note = data.notes[j];
                                            itemDest.notes.push(new NoteTime(note))
                                        }
                                    }
                                    break;
                            }
                        }
                        dest[i] = itemDest;
                    }
                    catch (e) {
                        console.warn("error reading note data from ", item.file, e);
                    }
                }
            }
        }
    }

    /* creates an instrument in memory */
    public createInstrument = (instrument: Instrument) => {
        if (this.inMemoryInstruments) {
            this.inMemoryInstruments[instrument].push({ notes: [], tags: [] });
        }
    }

    /* get first valid instrument from memory */
    public getFirstValidInstrument = (): [keyof typeof Instrument, InstrumentNotesInMem] | null => {
        // eslint-disable-next-line
        for (const key in Instrument) {
            const inst = key as keyof typeof Instrument;
            if (this.inMemoryInstruments) {
                const source = this.inMemoryInstruments[inst];
                if (source.length > 0) return [inst, source[0]];
            }
        }
        return null;
    }

    public getInstruments = () => {
        return this.inMemoryInstruments;
    }

    public getInstrumentNotes = (instrument: Instrument, index: number): InstrumentNotesInMem | null => {
        if (this.inMemoryInstruments) {
            if (index < this.inMemoryInstruments[instrument].length) return this.inMemoryInstruments[instrument][index];
        }
        return null;
    }

    public removeInstrumentNotes = (instrument: Instrument, index: number): void => {
        if (this.inMemoryInstruments) {
            if (index < this.inMemoryInstruments[instrument].length) {
                this.inMemoryInstruments[instrument].splice(index, 1);
            }
        }
    }


    /* save instruments to file */
    public saveInstruments = async () => {
        if (this.projectInfo && this.inMemoryInstruments) {
            //eslint-disable-next-line
            for (const key in Instrument) {
                const dest = this.projectInfo.instruments[key as keyof typeof Instrument]
                const source = this.inMemoryInstruments[key as keyof typeof Instrument];
                dest.length = source.length;
                for (let i = 0; i < source.length; i += 1) {
                    const notes = source[i].notes;
                    notes.sort((a, b) => a.startTime - b.startTime)
                    const data = new NoteFile({ notes } as NoteFile)
                    if (!dest[i]) {
                        const destFile = path.join(this.projectDirectory, `${key}_${UUID()}.json`);
                        dest[i] = { file: destFile, tags: source[i].tags };
                        try {
                            // eslint-disable-next-line
                            await writeFile(destFile, JSON.stringify(data));
                        }
                        catch (e) {
                            console.warn("error saving note data to ", destFile, e);
                        }
                    } else {
                        // eslint-disable-next-line
                        const destFile = await exists(dest[i].file) ? dest[i].file : path.join(this.projectDirectory, `${key}_${UUID()}.json`);
                        try {
                            // eslint-disable-next-line
                            await writeFile(destFile, JSON.stringify(data));
                            dest[i].file = destFile;
                            dest[i].tags = source[i].tags;
                        }
                        catch (e) {
                            console.warn("error saving note data to ", destFile, e);
                        }
                    }
                }
            }
            //serialize
            await writeFile(this.projectFileName, JSON.stringify(this.projectInfo));
            DispatcherService.dispatch(DispatchEvents.ProjectUpdated, ProjectUpdateType.InstrumentNotesUpdated);
        }
    }

    /* save notes in memory */
    public saveInstrument = async (instrument: Instrument, instNotes: InstrumentNotesInMem, index: number) => {
        const inst = this.getInstrumentNotes(instrument, index);
        if (inst) {
            inst.notes = instNotes.notes.sort((a: NoteTime, b: NoteTime) => a.startTime - b.startTime);
        }
    }

    /* save tags in memory */
    public saveTags = async (instrument: Instrument, instNotes: InstrumentNotesInMem, index: number) => {
        const inst = this.getInstrumentNotes(instrument, index);
        if (inst) {
            inst.tags = instNotes.tags;
        }
    }

    public saveRegions = () => {
        const regions = MediaPlayerService.getRegions();
        if (this.projectInfo) {
            this.projectInfo.regions = regions;
        }
    }

    public getLatestKey = async (): Promise<SongKey> => {
        const metadata = await this.getProjectMetadata();
        if (metadata) {
            const [key, type, conf] = metadata.key;
            const keyChange = MediaPlayerService.getPitchSemitones();
            return [getTransposedKey(key, keyChange), type, conf];
        }
        return ["", "", -1];
    }

    public getLatestTempo = async (): Promise<number> => {
        const metadata = await this.getProjectMetadata();
        if (metadata) {
            const tempo = metadata.tempo;
            const tempoChange = MediaPlayerService.getPlaybackRate();
            return Math.round(tempo * tempoChange);
        }
        return 0;
    }
}

const ProjectService = Project.getInstance();
export default ProjectService;
