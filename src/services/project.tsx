import * as TMP from 'tmp';
import * as FS from 'fs';
import * as PATH from 'path';
import * as READLINE from 'readline';
import * as OS from 'os';

import { Intent } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { IAudioMetadata } from 'music-metadata';
import {
    copyFile, writeFile, copyDir, readFile, readTags,
} from '../lib/utils'
import { DispatcherService, DispatchEvents, DispatchData } from './dispatcher';
import { pitches } from '../lib/music-utils';
import ForageService, { SettingsForageKeys } from './forage';
import {
    ProjectInfo, ProjectSettingsModel, ChordTime, BeatTime, MediaInfo, ProjectMetadata,
} from '../types'
import MediaPlayerService from './mediaplayer';
import { successToaster, progressToaster, dismissToaster } from '../components/Extended/Toasters';

const { app, dialog } = window.require('electron').remote;

const readline: typeof READLINE = window.require("readline");
const os: typeof OS = window.require("os");
const path: typeof PATH = window.require('path');
const tmp: typeof TMP = window.require('tmp');
const fs: typeof FS = window.require("fs");

const projectExt = "rsdproject";
const bundleExt = "rsdbundle";
const isWin = os.platform() === "win32";

export const ProjectUpdateType: { [key: string]: string } = {
    ExternalFilesUpdate: "external-files-update",
    ProjectInfoCreated: "project-info-created",
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

    constructor() {
        tmp.setGracefulCleanup();
        this.projectDirectory = "";
        this.isTemporary = true;
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

    destructor() {
        app.off('before-quit', this.unload)
    }

    clearRecents = async () => {
        if (this.projectSettings) {
            this.projectSettings.recents = [];
            await ForageService.set(SettingsForageKeys.PROJECT_SETTINGS, this.projectSettings);
        }
    }

    getRecents = async (): Promise<ProjectInfo[]> => {
        await this.loadProjectSettings();
        if (this.projectSettings) {
            return this.projectSettings.recents;
        }
        return [];
    }

    loadProjectSettings = async () => {
        const ser = await ForageService.get(SettingsForageKeys.PROJECT_SETTINGS);
        if (ser) this.projectSettings = new ProjectSettingsModel(ser);
        else this.projectSettings = new ProjectSettingsModel(null);
    }

    saveProjectSettings = async () => {
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

    isAnalysisReqd() {
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

    isProjectLoaded() {
        return this.isLoaded;
    }

    unload() {
        this.isLoaded = false;
        this.isTemporary = true;
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

    closeProject = () => {
        if (this.isProjectLoaded()) {
            this.unload();
            DispatcherService.dispatch(DispatchEvents.ProjectClosed);
            successToaster("Project Closed", Intent.PRIMARY, IconNames.TICK);
        }
    }

    openLastProject = async () => {
        await this.loadProjectSettings();
        const lp = this.getLastOpenedProject();
        if (lp && lp.projectPath) {
            const stat = await fs.promises.stat(lp.projectPath);
            if (stat) {
                await this.openProject(lp.projectPath);
            }
        }
    }

    openProject = async (externalProject: string | null, importingMedia = false) => {
        if (this.isLoading) {
            successToaster("Open Project failed:  another project is already being loaded", Intent.DANGER, IconNames.ERROR);
            return;
        }
        this.isLoading = true;
        const total = 3;
        const key = progressToaster("Opening Project", 0.5, total);
        try {
            if (this.isProjectLoaded() && !importingMedia) {
                this.closeProject();
            }
            const pInfo = await this.loadProject(externalProject);
            console.log(pInfo);
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
            console.error("open-project failed", e);
        }
        progressToaster("Project Failed to Open", 1, 1, key, Intent.DANGER);
        this.isLoading = false;
    }

    loadProject = async (externalProject: string | null): Promise<ProjectInfo | null> => {
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
            console.log(jsonPath);
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

                this.unload();
                await this.updateProjectInfo(
                    dir,
                    false,
                    true,
                    '',
                    true, /* readonly */
                );

                this.projectInfo = json;

                if (!this.isTemporary) {
                    app.addRecentDocument(dir);
                    if (this.projectInfo) await this.saveProjectSettings();
                }
                await this.updateExternalFiles();

                return this.projectInfo;
            }
        }
        return null;
    }

    getProjectInfo = () => {
        return this.projectInfo;
    }

    getProjectFilename = () => {
        return this.projectFileName;
    }

    getProjectDir = () => {
        return this.projectDirectory;
    }

    saveProject = async () => {
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
                    /* delete old temp dir */
                    await this.updateProjectInfo(
                        dir,
                        false,
                        true,
                        lastPInfo.original,
                    )
                    if (this.projectInfo) await this.saveProjectSettings();
                    await this.updateExternalFiles();
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

    updateExternalFiles = async () => {
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

    updateProjectInfo = async (dir: string, istemp: boolean, isloaded: boolean, file: string, readOnly = false, dispatch = true) => {
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

    createTemporaryProject = async (file: string): Promise<string> => {
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

    readMetadata = async (): Promise<MediaInfo | null> => {
        if (this.projectInfo == null || this.projectInfo.metadata == null) return null;
        const mm = this.projectInfo.metadata;
        const data = await readFile(mm)
        return JSON.parse(data.toString());
    }

    readTempo = async (): Promise<number> => {
        if (this.projectInfo) {
            const tempoFile = this.projectInfo.tempo;
            const data = await readFile(tempoFile)
            const tempo = parseFloat(data.toString());
            return tempo;
        }
        return 0;
    }

    readSongKey = async (): Promise<string[]> => {
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
        return [];
    }

    //eslint-disable-next-line
    readChords = async () => new Promise((resolve, reject) => {
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
        lineReader.on('error', (err: string) => {
            reject(err)
        });
    });

    //eslint-disable-next-line
    readBeats = async (): Promise<BeatTime[]> => new Promise((resolve, reject) => {
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
        lineReader.on('error', (err: string) => {
            reject(err)
        })
    });

    getLastOpenedProject = (): ProjectInfo | null => {
        if (this.projectSettings == null) return null;
        return this.projectSettings.lastOpenedProject;
    }

    getProjectMetadata = async (): Promise<ProjectMetadata | null> => {
        if (this.projectInfo) {
            const key = await this.readSongKey();
            return {
                name: path.basename(this.projectDirectory),
                path: this.projectDirectory,
                key: `${key[0]} ${key[1]}`,
                tempo: Math.round(await this.readTempo()),
            }
        }
        return null;
    }

    saveMetadata = async (media: IAudioMetadata): Promise<MediaInfo> => {
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

    importMedia = async (externalMedia: string | null) => {
        if (this.isLoading) {
            successToaster("Import Media failed:  another project is being loaded", Intent.DANGER, IconNames.ERROR);
            return;
        }
        this.isLoading = true;
        if (this.isProjectLoaded()) {
            this.closeProject();
        }
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
            console.log(this.projectInfo, tmpProject);

            /* assign metadata */
            await this.saveMetadata(tags);
            /* open Project with tmp project */
            this.isLoading = false;
            await this.openProject(this.projectInfo.projectPath, true);
        }
    }
}

const ProjectService = new Project();
export default ProjectService;
