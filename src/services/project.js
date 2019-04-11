import { copyFile, writeFile, copyDir } from '../lib/utils'
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

    loadPorject = () => {

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
                }
            }
            else {
                //serialize
            }
        }
    }

    updateProjectInfo = async (dir, istemp, isloaded, file) => {
        const ext = window.path.extname(file);
        this.projectDirectory = dir;
        this.projectFileName = `${this.projectDirectory}/project.rsd`;
        this.isTemporary = istemp;
        this.loaded = isloaded;
        this.projectInfo.media = `${this.projectDirectory}/media.rsd${ext}`;
        this.projectInfo.original = file;
        await writeFile(this.projectFileName, JSON.stringify(this.projectInfo));
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
