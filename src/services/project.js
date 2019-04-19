import {
    copyFile, writeFile, copyDir, readFile,
} from '../lib/utils'
import { DispatcherService, DispatchEvents } from './dispatcher';

const electron = window.require('electron').remote;
const readline = window.require("readline");
const tmp = window.require('tmp');

const defaultProjectInfo = {
    media: '',
    original: '',
    cqt: '',
    tempo: '',
    beats: '',
    key: '',
    chords: '',
}

const projectExt = "rsdproject";
const bundleExt = "rsdbundle";

export class Project {
    constructor() {
        tmp.setGracefulCleanup();
        this.projectDirectory = "";
        this.isTemporary = true;
        this.loaded = false;
        this.tmpHandle = null;
        this.isDirty = false;
        this.projectFileName = ``;

        this.projectInfo = {}
        this.projectInfo = Object.assign(this.projectInfo, defaultProjectInfo);
        electron.app.on('before-quit', (e) => {
            this.unload();
        })
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

    isLoaded() {
        return this.loaded;
    }

    unload() {
        this.loaded = false;
        this.isTemporary = true;
        this.projectDirectory = "";
        this.isDirty = false;
        if (this.tmpHandle) {
            this.tmpHandle.removeCallback();
            this.tmpHandle = null;
        }
        this.projectInfo = Object.assign(this.projectInfo, defaultProjectInfo);
        this.projectFileName = ``;
    }

    loadProject = async (externalProject = null) => {
        let dirs = [];

        if (externalProject) {
            dirs.push(externalProject);
        }
        else {
            const filters = [
                { name: "RSDesigner Bundle", extensions: [bundleExt] },
                { name: "RSDesigner Project", extensions: [projectExt] },
            ];
            if (window.isWin === true) {
                delete filters[0];
            }
            dirs = electron.dialog.showOpenDialog({
                title: "Open Project..",
                buttonLabel: "Open",
                properties: ['openFile'],
                filters,
            });
        }
        if (dirs) {
            const dir = dirs[0];
            let jsonPath = "";
            if (dir.endsWith(bundleExt)) {
                jsonPath = dir + `/project.${projectExt}`
            }
            else if (dir.endsWith(`.${projectExt}`)) {
                jsonPath = dir;
            }
            if (jsonPath.length > 0) {
                const data = await readFile(jsonPath);
                const json = JSON.parse(data);
                this.unload();
                await this.updateProjectInfo(
                    dir,
                    false,
                    true,
                    '',
                    true, /* readonly */
                );
                electron.app.addRecentDocument(dir);
                this.projectInfo = json;
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
        if (this.loaded) {
            if (this.isTemporary) {
                const dirs = electron.dialog.showOpenDialog({
                    title: "Choose directory to save project to..",
                    buttonLabel: "Save",
                    properties: ['openDirectory'],
                });
                if (dirs) {
                    const lastPInfo = this.projectInfo;
                    const basen = window.path.parse(lastPInfo.original).name;
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
                    await this.updateExternalFiles();
                    return true;
                }
            }
            else {
                //serialize
                await writeFile(this.projectFileName, JSON.stringify(this.projectInfo));
                DispatcherService.dispatch(DispatchEvents.ProjectUpdate, null);
                return true;
            }
        }
        return false;
    }

    updateExternalFiles = async () => {
        this.projectInfo.cqt = window.path.join(this.projectDirectory, 'cqt.raw');
        this.projectInfo.tempo = window.path.join(this.projectDirectory, 'tempo');
        this.projectInfo.beats = window.path.join(this.projectDirectory, 'beats');
        this.projectInfo.key = window.path.join(this.projectDirectory, 'key');
        this.projectInfo.chords = window.path.join(this.projectDirectory, 'chords');
        await writeFile(this.projectFileName, JSON.stringify(this.projectInfo));
        DispatcherService.dispatch(DispatchEvents.ProjectUpdate, "external-files-update");
    }

    updateProjectInfo = async (dir, istemp, isloaded, file, readOnly = false, dispatch = true) => {
        const ext = window.path.extname(file);
        this.projectDirectory = dir;
        this.projectFileName = `${this.projectDirectory}/project.${projectExt}`;
        this.isTemporary = istemp;
        this.loaded = isloaded;
        this.projectInfo = Object.assign(this.projectInfo, defaultProjectInfo);
        this.projectInfo.media = `${this.projectDirectory}/media${ext}`;
        this.projectInfo.original = file;
        if (!readOnly) {
            await writeFile(this.projectFileName, JSON.stringify(this.projectInfo));
        }
        if (dispatch) {
            DispatcherService.dispatch(DispatchEvents.ProjectUpdate, null);
        }
    }

    createTemporaryProject = async (file) => {
        this.unload();
        /* create temp dir */
        this.tmpHandle = tmp.dirSync({
            unsafeCleanup: true,
        });
        this.updateProjectInfo(
            this.tmpHandle.name,
            true,
            true,
            file,
            false,
            false,
        );

        const src = file
        const dest = this.projectInfo.media;
        /* copy mp3 here */
        await copyFile(src, dest);

        return dest;
    }

    readTempo = async () => {
        const tempoFile = this.projectInfo.tempo;
        const data = await readFile(tempoFile)
        const tempo = parseFloat(data);
        return tempo;
    }

    readSongKey = async () => {
        const keyFile = this.projectInfo.key;
        const data = await readFile(keyFile)
        const s = JSON.parse(data)
        return s;
    }

    readChords = async () => new Promise((resolve, reject) => {
        const lineReader = readline.createInterface({
            input: window.electronFS.createReadStream(this.projectInfo.chords),
        });
        const chords = []
        lineReader.on('line', (line) => {
            const split = line.split(",")
            const start = split[0]
            const end = split[1]
            const chord = split[2]
            const splitch = chord.split(":")
            const key = splitch[0]
            const type = splitch[1]
            chords.push([start, end, key, type])
        });
        lineReader.on('close', () => {
            resolve(chords);
        })
        lineReader.on('error', (err) => {
            reject(err)
        })
    });
}

const ProjectService = new Project();
export default ProjectService;
