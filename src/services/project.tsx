import * as TMP from 'tmp';
import * as FS from 'fs';
import * as PATH from 'path';
import * as READLINE from 'readline';
import * as OS from 'os';

import { Intent } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { IAudioMetadata } from 'music-metadata';
import {
    copyFile, writeFile, copyDir, readFile, readTags, removeDir,
} from '../lib/utils'
import { DispatcherService, DispatchEvents, DispatchData } from './dispatcher';
import { pitches } from '../lib/music-utils';
import ForageService, { SettingsForageKeys } from './forage';
import {
    ProjectInfo, ProjectSettingsModel, ChordTime, BeatTime, MediaInfo, ProjectMetadata,
} from '../types'
import MediaPlayerService from './mediaplayer';
import {
    successToaster, progressToaster, errorToaster, dismissToaster,
} from '../components/Extended/Toasters';

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
    ExternalFilesUpdate = "external-files-update",
    ProjectInfoCreated = "project-info-created",
    MediaInfoUpdated = "media-info-updated",
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
    public projectSettings: ProjectSettingsModel | null;

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
        this.projectSettings = null;
        this.isLoading = false;

        DispatcherService.on(DispatchEvents.ProjectOpen, (data: DispatchData) => this.openProject(data as string | null));
        DispatcherService.on(DispatchEvents.ImportMedia, (data: DispatchData) => this.importMedia(data as string | null));
        DispatcherService.on(DispatchEvents.ProjectSave, this.saveProject);
        DispatcherService.on(DispatchEvents.ProjectClose, this.closeProject);

        app.on('before-quit', this.unload);
        this.loadProjectSettings();
    }

    public destructor() {
        app.off('before-quit', this.unload)
    }

    public clearRecents = async () => {
        if (this.projectSettings) {
            this.projectSettings.recents = [];
            await ForageService.set(SettingsForageKeys.PROJECT_SETTINGS, this.projectSettings);
        }
    }

    public getRecents = async (): Promise<ProjectInfo[]> => {
        await this.loadProjectSettings();
        if (this.projectSettings) {
            return this.projectSettings.recents;
        }
        return [];
    }

    private loadProjectSettings = async () => {
        const ser = await ForageService.get(SettingsForageKeys.PROJECT_SETTINGS);
        if (ser) this.projectSettings = new ProjectSettingsModel(ser);
        else this.projectSettings = new ProjectSettingsModel(null);
    }

    private saveProjectSettings = async () => {
        // dont save temp projects to recents/last opened 
        if (this.isTemporary) return;
        if (this.projectSettings && this.projectInfo) {
            this.projectSettings.lastOpenedProject = this.projectInfo;

            let dupIdx = 0;
            let dupItem: ProjectInfo | null = null;
            this.projectSettings.recents.forEach((i, idx) => {
                if (this.projectInfo && i.media === this.projectInfo.media) {
                    dupIdx = idx;
                    dupItem = i;
                }
            });
            if (dupItem) {
                this.projectSettings.recents.splice(dupIdx, 1);
                this.projectSettings.recents.unshift(dupItem);
            }
            else {
                this.projectSettings.recents.push(this.projectInfo);
            }
            await ForageService.set(SettingsForageKeys.PROJECT_SETTINGS, this.projectSettings);
        }
    }

    private isAnalysisReqd() {
        if (this.projectInfo) {
            const {
                cqt, tempo, beats, key, chords,
            } = this.projectInfo;
            if (
                cqt === ''
                || tempo === ''
                || beats === ''
                || key === ''
                || chords === ''
            ) {
                return true;
            }
        }
        else {
            return true;
        }
        return false;
    }

    public isProjectLoaded() {
        return this.isLoaded;
    }

    private unload() {
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
        MediaPlayerService.empty();
        MediaPlayerService.unload();
    }

    private closeProject = () => {
        if (this.isLoading) {
            errorToaster("Close Project failed:  please wait for the project to finish loading");
            return;
        }
        if (this.isProjectLoaded()) {
            this.unload();
            DispatcherService.dispatch(DispatchEvents.ProjectClosed);
            successToaster("Project Closed", Intent.PRIMARY, IconNames.TICK);
            this.projectInfo = null;
        }
    }

    public openLastProject = async () => {
        await this.loadProjectSettings();
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
                URL.revokeObjectURL(url);
                blob = new Blob();

                DispatcherService.dispatch(DispatchEvents.ProjectOpened);
                progressToaster("Project Opened", 3, total, key);
                this.isLoading = false;
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
                const json: ProjectInfo = JSON.parse(data.toString());

                /* migrate project file to current version */
                if (json.version !== ProjectInfo.currentVersion) {
                    switch (json.version) {
                        default:
                        case 1:
                            json.projectPath = jsonPath;
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
                    await this.saveProjectSettings();
                }
                await this.updateExternalFiles();

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
                DispatcherService.dispatch(DispatchEvents.ProjectUpdated, null);
            }
            this.saveProjectSettings();
            successToaster("Project Saved")
            return true;
        }
        return false;
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

    public readMetadata = async (): Promise<MediaInfo | null> => {
        if (this.projectInfo == null || this.projectInfo.metadata == null) return null;
        const mm = this.projectInfo.metadata;
        try {
            const data = await readFile(mm)
            return JSON.parse(data.toString());
        }
        catch (e) {
            return null;
        }
    }

    private readTempo = async (): Promise<number> => {
        try {
            if (this.projectInfo) {
                const tempoFile = this.projectInfo.tempo;
                const data = await readFile(tempoFile)
                const tempo = parseFloat(data.toString());
                return tempo;
            }
        } catch (e) {
            console.warn("readTempo error", e);
        }
        return 0;
    }

    private readSongKey = async (): Promise<string[]> => {
        try {
            if (this.projectInfo) {
                const keyFile = this.projectInfo.key;
                const data = await readFile(keyFile)
                const s: string[] = JSON.parse(data.toString())
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
            console.warn("readSongKey error: ", e);
        }
        return [];
    }

    private readChords = async (): Promise<ChordTime[]> => new Promise((resolve, reject) => {
        try {
            if (this.projectInfo == null) return reject();
            const lineReader = readline.createInterface({
                input: fs.createReadStream(this.projectInfo.chords),
            });

            const chords: ChordTime[] = []
            lineReader.on('line', (line: string) => {
                const split = line.split(",")
                const start = split[0]
                const end = split[1]
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

    private readBeats = async (): Promise<BeatTime[]> => new Promise((resolve, reject) => {
        try {
            if (this.projectInfo == null) return reject();
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
        if (this.projectSettings == null) return null;
        return this.projectSettings.lastOpenedProject;
    }

    public getProjectMetadata = async (): Promise<ProjectMetadata | null> => {
        if (this.projectInfo) {
            const key = await this.readSongKey();
            return {
                name: path.basename(this.projectDirectory),
                path: this.projectDirectory,
                key: key.length > 0 ? `${key[0]} ${key[1]}` : "-",
                tempo: Math.round(await this.readTempo()),
            }
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
    }
}

const ProjectService = Project.getInstance();
export default ProjectService;
