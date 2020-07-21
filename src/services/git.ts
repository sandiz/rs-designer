
import {
    plugins, init, add, commit, statusMatrix, log, CommitDescription,
} from 'isomorphic-git'
import * as FS from 'fs';   /* for types */
import * as OS from 'os';   /* for types */
import { Instrument } from '../types/project';
import ProjectService from './project';

const fs: typeof FS = window.require("fs");
const os: typeof OS = window.require("os");

enum GIT_TREE { FILE = 0, HEAD = 1, WORKDIR = 2 }

class GitService {
    static async init(dir: string) {
        plugins.set('fs', fs)
        await init({ dir, noOverwrite: true });
        console.log("[git-service]", "repo init");
    }

    static async addFilesFromAndCommit(dir: string) {
        //console.log(await statusMatrix({ dir }));
        const filenames = (await statusMatrix({ dir }))
            .filter(row => row[GIT_TREE.HEAD] !== row[GIT_TREE.WORKDIR])
            .map(row => row[GIT_TREE.FILE]);
        console.log("[git-service]", "files changed", filenames);

        for (let i = 0; i < filenames.length; i += 1) {
            const file = filenames[i];
            if (file === '.git') continue;
            if (file.includes('pretrained_models')) continue;

            //eslint-disable-next-line
            await GitService.addFile(dir, file);
        }
        if (filenames.length > 0) {
            const info = ProjectService.getProjectInfo();
            if (info) {
                const f: string[] = filenames.map((filename: string) => {
                    const insts = Object.values(Instrument);
                    for (let k = 0; k < insts.length; k += 1) {
                        const inst = insts[k] as keyof typeof Instrument;
                        if (filename.includes(inst)) {
                            const idx = info.instruments[inst].findIndex(i => i.file.includes(filename));
                            return `${Instrument.leadGuitar} #${idx + 1}`;
                        }
                    }
                    return filename;
                })
                await GitService.commit(dir, f);
            }
        }
    }

    static async addFile(dir: string, file: string) {
        await add({ dir, filepath: file });
        //console.log("[git-service]", "added file", file);
    }

    static async commit(dir: string, files: string[]) {
        const username = os.userInfo().username;
        const sha = await commit({
            dir,
            author: {
                name: username,
                email: 'user@localhost',
            },
            message: "Files Changed: \n" + files.join("\n"),
        })
        console.log("[git-service]", "commit complete", sha);
    }

    static async listCommits(dir: string, num = 20): Promise<CommitDescription[]> {
        try {
            const commits = await log({ dir, depth: num, ref: 'master' })
            return commits as CommitDescription[];
        }
        catch (e) {
            return [];
        }
    }

    static setRemote() {
    }

    static push() {
    }
}
export default GitService;
