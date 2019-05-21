import {
    copyFile, writeFile, copyDir, readFile, assign,
} from '../lib/utils'
import { DispatcherService, DispatchEvents, KeyboardEvents } from './dispatcher';
import { pitches } from '../lib/music-utils';

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
    metadata: null,
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
            DispatcherService.dispatch(KeyboardEvents.Stop);
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
                DispatcherService.dispatch(KeyboardEvents.Stop);
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

    assignMetadata = (media, mm) => {
        assign(media, ["tags", "common", "title"], mm.song);
        assign(media, ["tags", "common", "artist"], mm.artist);
        assign(media, ["tags", "common", "album"], mm.album);
        assign(media, ["tags", "common", "year"], mm.year);
        if (mm.image !== "") {
            assign(media, ["tags", "common", "picture"], [{ data: Buffer.from(mm.image, 'base64') }]);
        }
    }

    saveMetadata = async (media) => {
        let buf = null;
        if (Array.isArray(media.tags.common.picture) && media.tags.common.picture.length > 0) {
            buf = media.tags.common.picture[0].data;
        }
        const metadata = {
            song: media.tags.common.title ? media.tags.common.title : "",
            artist: media.tags.common.artist ? media.tags.common.artist : "",
            album: media.tags.common.album ? media.tags.common.album : "",
            year: media.tags.common.year ? media.tags.common.year : "",
            image: buf ? buf.toString('base64') : '',
        };
        this.projectInfo.metadata = window.path.join(this.projectDirectory, 'metadata.json');
        await writeFile(this.projectInfo.metadata, JSON.stringify(metadata));
        return metadata;
    }

    updateExternalFiles = async () => {
        this.projectInfo.cqt = window.path.join(this.projectDirectory, 'cqt.raw.png');
        this.projectInfo.tempo = window.path.join(this.projectDirectory, 'tempo');
        this.projectInfo.beats = window.path.join(this.projectDirectory, 'beats');
        this.projectInfo.key = window.path.join(this.projectDirectory, 'key');
        this.projectInfo.chords = window.path.join(this.projectDirectory, 'chords');
        this.projectInfo.metadata = window.path.join(this.projectDirectory, 'metadata.json');
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
            postfix: ".rsdbundle",
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

    readMetadata = async () => {
        if (this.projectInfo.metadata == null) return null;
        const mm = this.projectInfo.metadata;
        const data = await readFile(mm)
        return JSON.parse(data);
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

    readBeats = async () => new Promise((resolve, reject) => {
        const lineReader = readline.createInterface({
            input: window.electronFS.createReadStream(this.projectInfo.beats),
        });
        const beats = []
        lineReader.on('line', (line) => {
            const split = line.replace(/\s+/g, ' ').trim().split(" ")
            const start = split[0]
            const bn = split[1]
            beats.push([start, bn])
        });
        lineReader.on('close', () => {
            resolve(beats);
        })
        lineReader.on('error', (err) => {
            reject(err)
        })
    });
}

const ProjectService = new Project();
export default ProjectService;
