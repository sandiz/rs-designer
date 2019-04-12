import {
    copyFile, writeFile, copyDir, readFile,
} from '../lib/utils'
import { DispatcherService, DispatchEvents } from './dispatcher';

const electron = window.require('electron').remote;
const tmp = window.require('tmp');

const defaultProjectInfo = {
    media: "",
    original: "",
}

export class Project {
    constructor() {
        tmp.setGracefulCleanup();
        this.projectDirectory = "";
        this.isTemporary = true;
        this.loaded = false;
        this.tmpHandle = null;
        this.isDirty = false;

        this.projectInfo = defaultProjectInfo;
        electron.app.on('before-quit', (e) => {
            this.unload();
        })
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
        this.projectInfo = defaultProjectInfo;
        this.projectFileName = ``;
    }

    loadProject = async () => {
        const filters = [
            { name: "RSDesigner Project Bundle", extensions: ['rsdirectory'] },
            { name: "RSDesigner Project", extensions: ['rsproject'] },
        ];
        if (window.isWin === true) {
            delete filters[0];
        }
        const dirs = electron.dialog.showOpenDialog({
            title: "Open Project..",
            buttonLabel: "Open",
            properties: ['openFile'],
            filters,
        });
        const dir = dirs[0];
        let jsonPath = "";
        if (dir.endsWith('.rsdirectory')) {
            jsonPath = dir + "/project.rsproject"
        }
        else if (dir.endsWith('.rsproject')) {
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
            this.projectInfo.media = json.media;
            this.projectInfo.original = json.original;
            return this.projectInfo;
        }
        return null;
    }

    getProjectFilename = () => {
        return this.projectFileName;
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
                    const basen = window.path.parse(this.projectInfo.original).name;
                    const dir = dirs[0] + `/${basen}.rsdirectory`;
                    /* copy dir */
                    await copyDir(this.projectDirectory, dir, {
                        overwrite: true,
                    });
                    /* delete old temp dir */
                    this.unload();
                    await this.updateProjectInfo(
                        dir,
                        false,
                        true,
                        lastPInfo.original,
                    )
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

    updateProjectInfo = async (dir, istemp, isloaded, file, readOnly = false) => {
        const ext = window.path.extname(file);
        this.projectDirectory = dir;
        this.projectFileName = `${this.projectDirectory}/project.rsproject`;
        this.isTemporary = istemp;
        this.loaded = isloaded;
        if (!readOnly) {
            this.projectInfo.media = `${this.projectDirectory}/media${ext}`;
            this.projectInfo.original = file;
            await writeFile(this.projectFileName, JSON.stringify(this.projectInfo));
        }
        DispatcherService.dispatch(DispatchEvents.ProjectUpdate, null);
    }

    createTemporaryProject = async (file) => {
        /* create temp dir */
        this.tmpHandle = tmp.dirSync({
            unsafeCleanup: true,
        });
        this.updateProjectInfo(
            this.tmpHandle.name,
            true,
            true,
            file,
        );

        const src = file
        const dest = this.projectInfo.media;
        /* copy mp3 here */
        await copyFile(src, dest);

        return dest;
    }
}

const ProjectService = new Project();
export default ProjectService;
