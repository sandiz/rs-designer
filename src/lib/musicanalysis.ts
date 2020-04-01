import { ChildProcess } from 'child_process';
import { Intent } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import {
    spawn, path, PRODUCT_ADVANCED,
} from '../types/base'
import {
    SongKey, ChordTime, BeatTime, ChordTriplet, BeatTriplet, RunnerResult, CQTResult,
} from '../types/musictheory'
import ProjectService from '../services/project';
import { successToaster, progressToaster } from '../components/Extended/Toasters';
import { DispatcherService, DispatchEvents } from '../services/dispatcher';

interface ProviderArgs {
    argName: string;
    values: string[];
}
interface Provider {
    providers: string[];
    args: { [key: string]: ProviderArgs[] };
}
// eslint-disable-next-line
const key: Provider = require('../app-config/musicanalysis/key/providers.json');
const chords: Provider = require('../app-config/musicanalysis/chords/providers.json');
const beats: Provider = require('../app-config/musicanalysis/beats/providers.json');
const tempo: Provider = require('../app-config/musicanalysis/tempo/providers.json');
const cqt: Provider = require('../app-config/musicanalysis/cqt/providers.json');

const { isPackaged, getAppPath } = window.require('electron').remote.app;
const isDev = window.require('electron-is-dev');

type stringFunc = ((s: string) => void);

const getArgs = (type: Provider): string[] => {
    const providerArgs: string[] = []
    const provider = type.providers[0]; //TODO: use var
    if (type.args && Object.keys(type.args).includes(provider)) {
        const args = key.args[provider]
        for (let i = 0; i < args.length; i += 1) {
            const arg = args[i];
            providerArgs.push(arg.argName);
            if (arg.values.length > 0) {
                providerArgs.push(arg.values[0]);
            }
        }
    }
    return providerArgs;
}

const getMABinary = (): string => {
    let binaryPath = ''
    if (!isDev && isPackaged) {
        binaryPath = path.join(path.dirname(getAppPath()), '..', './Resources', './bin')
    }
    else {
        binaryPath = './src/lib/musicanalysis/dist';
    }
    return path.resolve(path.join(binaryPath, './music-analysis'));
}

class Runner {
    protected runner: ChildProcess | null = null;
    protected type: string;
    protected provider: Provider;

    constructor(t: string, p: Provider) {
        this.type = t;
        this.provider = p;
    }

    protected startRunner = (): void => {
        const pInfo = ProjectService.getProjectInfo();
        if (pInfo) {
            const fixedArgs = ["--file", `"${pInfo.media}"`, "--type", this.type, "--algo", this.provider.providers[0], "--args"]
            const args = fixedArgs.concat(getArgs(this.provider));
            const binary = getMABinary();
            this.runner = spawn.spawn(
                binary,
                args,
                {
                    detached: true,
                    windowsHide: true,
                    shell: true,
                },
            );
            console.log(`[${this.type} - runner] started with args:`, JSON.stringify(args));
        }
        else {
            this.runner = null;
        }
    }

    fetchResult = (): Promise<RunnerResult> => new Promise((resolve, reject) => {
        this.startRunner();
        if (this.runner) {
            let output = ""
            if (this.runner.stdout) {
                this.runner.stdout.on("data", (data: Buffer) => {
                    output += data.toString();
                    //if (isDev) console.log(`[${this.type} - runner] stdout: `, output);
                });
            }
            if (this.runner.stderr) {
                this.runner.stderr.on("data", (/*data: Buffer*/) => {
                    //if (isDev) console.log(`[${this.type} - runner] stderr: `, data);
                });
            }
            this.runner.on("close", (code: number) => {
                if (code === 0) {
                    try {
                        resolve(JSON.parse(output));
                        console.log(`[${this.type} - runner] finished successfully!`);
                    }
                    catch (e) {
                        reject(new Error("error: output failed to parse " + output));
                        console.log(`[${this.type} - runner] output failed to parse!`);
                    }
                }
                else {
                    reject(new Error("error: " + code));
                    console.log(`[${this.type} - runner] failed with code: ${code}`);
                }
            });
            this.runner.on("error", (err: Error) => {
                reject(err);
                console.log(`[${this.type} - runner] failed with error: ${err.message}!`);
            })
        }
        else {
            console.log(`[${this.type} - runner] failed to start`);
        }
        return null;
    });

    fetchOutput = (stdout: stringFunc, stderr: stringFunc, close: stringFunc): void => {
        this.startRunner();
        if (this.runner) {
            if (this.runner.stdout) {
                this.runner.stdout.on("data", (data: Buffer) => {
                    stdout(data.toString());
                });
            }
            if (this.runner.stderr) {
                this.runner.stderr.on("data", (data: Buffer) => {
                    stderr(data.toString());
                })
            }
            this.runner.on("close", (code: number) => {
                if (code === 0) {
                    close(code.toString());
                    console.log("KeyRunner finished successfully!")
                }
                else {
                    close(code.toString());
                    console.log("KeyRunner failed with code: " + code);
                }
            });
            this.runner.on("error", (err: Error) => {
                close(err.message);
                console.log("KeyRunner error: " + err.message);
            })
        }
        else {
            close("failed to start runner")
        }
    }

    saveResult = async (type: string, result: RunnerResult) => {
        switch (type) {
            case "key":
                await ProjectService.updateSongKey(result as SongKey);
                break;
            case "tempo":
                await ProjectService.updateTempo(result as number);
                break;
            case "chords":
                await ProjectService.updateChords(result as ChordTriplet[]);
                break;
            case "beats":
                await ProjectService.updateBeats(result as BeatTriplet[]);
                break;
            case "cqt":
                await ProjectService.updateCQT(result as CQTResult);
                break;
            default:
                break;
        }
    }

    fetchAndSave = async (): Promise<RunnerResult> => {
        const results = await this.fetchResult();
        await this.saveResult(this.type, results);
        return results;
    }

    stop = () => {
        if (this.runner) {
            // console.log(`[${this.type} - runner] trying to stop`);
            this.runner.kill();
            this.runner = null;
        }
    }
}

export const KeyRunner = () => new Runner("key", key);
export const ChordsRunner = () => new Runner("chords", chords);
export const BeatsRunner = () => new Runner("beats", beats);
export const TempoRunner = () => new Runner("tempo", tempo);
export const CQTRunner = () => new Runner("cqt", cqt);

export enum AnalysisType { KEY = "key", CHORDS = "chords", BEATS = "beats", TEMPO = "tempo", AUTO = "auto", CQT = "cqt" }
class MusicAnalysis {
    private static instance: MusicAnalysis;
    private activeRunners: Runner[] = [];
    private promises: Promise<RunnerResult>[] = [];
    private isAutoAnalysisRunning = false;
    static getInstance() {
        if (!MusicAnalysis.instance) {
            MusicAnalysis.instance = new MusicAnalysis();
        }
        return MusicAnalysis.instance;
    }

    private constructor() {
        this.activeRunners = [];
        this.promises = [];
    }

    isKeyValid(keyer: SongKey) {
        if (Array.isArray(keyer) && keyer.length === 3) {
            if (keyer[0] !== "-") return true;
        }
        return false;
    }

    isTempoValid(tempoer: number) {
        if (!Number.isNaN(tempoer) && tempoer > 0) {
            return true;
        }
        return false;
    }

    isChordsValid(chordser: ChordTime[]) {
        if (Array.isArray(chordser) && chordser.length > 0) {
            return true;
        }
        return false;
    }

    isBeatsValid(beatser: BeatTime[]) {
        if (Array.isArray(beatser) && beatser.length > 0) {
            return true;
        }
        return false;
    }

    isAnalysisReqd = async () => {
        const analysis: AnalysisType[] = [];
        const metadata = await ProjectService.getProjectMetadata();
        if (metadata) {
            // check key
            if (this.isKeyValid(metadata.key) === false) analysis.push(AnalysisType.KEY);
            // check tempo
            if (this.isTempoValid(metadata.tempo) === false) analysis.push(AnalysisType.TEMPO);
            // check chords
            if (this.isChordsValid(metadata.chords) === false) analysis.push(AnalysisType.CHORDS);
            // check beats
            if (this.isBeatsValid(metadata.beats) === false) analysis.push(AnalysisType.BEATS);
        }
        return analysis;
    }

    cancel = async () => {
        for (let i = 0; i < this.activeRunners.length; i += 1) {
            this.activeRunners[i].stop();
        }
        this.activeRunners = [];
        this.promises = [];
        this.isAutoAnalysisRunning = false;
    }

    isAnalysisInProgress = () => this.isAutoAnalysisRunning;

    analysePrompt = (toAnalyse: AnalysisType[]): Promise<boolean> => new Promise((resolve) => {
        const action = {
            text: "Start",
            onClick: () => resolve(true),
        }
        const dismiss = () => {
            resolve(false);
        }
        successToaster(`[ ${PRODUCT_ADVANCED} ] analysis pending for ${toAnalyse.join(", ")}.`,
            Intent.NONE, IconNames.LAYOUT_AUTO, action, 50000, dismiss, "extra-wide-toaster");
    });

    analyse = async (customAnalysis: AnalysisType[] | null = null) => {
        let toAnalyse: AnalysisType[] = [];
        if (customAnalysis) toAnalyse = customAnalysis;
        else toAnalyse = await this.isAnalysisReqd();
        if (toAnalyse.length === 0) {
            successToaster(`[ ${PRODUCT_ADVANCED} ] up-to-date!`, Intent.SUCCESS, IconNames.LAYOUT_AUTO);
        }
        else {
            console.log(` [ ${PRODUCT_ADVANCED} ] analysis pending for ` + toAnalyse.join(", "));
            this.cancel();  /* cancel any pending analysis */
            this.isAutoAnalysisRunning = true;
            DispatcherService.dispatch(DispatchEvents.MusicAnalysisStarted, AnalysisType.AUTO);
            const analysePrompt = await this.analysePrompt(toAnalyse);
            if (analysePrompt) {
                console.log(`[ ${PRODUCT_ADVANCED} ] analysis started`);
                this.activeRunners = [];
                let idx = 0;
                let failed = 0;
                const total = toAnalyse.length + 1;
                const tkey = progressToaster(`[ ${PRODUCT_ADVANCED} ] analysis in progress...`, 0.5, total, undefined, Intent.SUCCESS, IconNames.LAYOUT_AUTO);
                if (toAnalyse.includes(AnalysisType.KEY)) {
                    const f = KeyRunner();
                    this.activeRunners.push(f);
                    const p = f.fetchAndSave()
                    p.then(() => {
                        idx += 1;
                        progressToaster(`[ ${PRODUCT_ADVANCED} ] key detection complete`, idx, total, tkey, Intent.SUCCESS, IconNames.LAYOUT_AUTO)
                    }, () => {
                        idx += 1;
                        failed += 1;
                    })
                    this.promises.push(p)
                }
                if (toAnalyse.includes(AnalysisType.TEMPO)) {
                    const f = TempoRunner();
                    this.activeRunners.push(f)
                    const p = f.fetchAndSave();
                    p.then(() => {
                        idx += 1;
                        progressToaster(`[ ${PRODUCT_ADVANCED} ] tempo detection complete`, idx, total, tkey, Intent.SUCCESS, IconNames.LAYOUT_AUTO)
                    }, () => {
                        idx += 1;
                        failed += 1;
                    })
                    this.promises.push(p)
                }
                if (toAnalyse.includes(AnalysisType.CHORDS)) {
                    const f = ChordsRunner();
                    this.activeRunners.push(f)
                    const p = f.fetchAndSave();
                    p.then(() => {
                        idx += 1;
                        progressToaster(`[ ${PRODUCT_ADVANCED} ] chords detection complete`, idx, total, tkey, Intent.SUCCESS, IconNames.LAYOUT_AUTO)
                    }, () => {
                        idx += 1;
                        failed += 1;
                    })
                    this.promises.push(p);
                }
                if (toAnalyse.includes(AnalysisType.BEATS)) {
                    const f = BeatsRunner();
                    this.activeRunners.push(f);
                    const p = f.fetchAndSave();
                    p.then(() => {
                        idx += 1;
                        progressToaster(`[ ${PRODUCT_ADVANCED} ] beats detection complete`, idx, total, tkey, Intent.SUCCESS, IconNames.LAYOUT_AUTO)
                    }, () => {
                        idx += 1;
                        failed += 1;
                    });
                    this.promises.push(p);
                }
                if (toAnalyse.includes(AnalysisType.CQT)) {
                    const f = CQTRunner();
                    this.activeRunners.push(f);
                    const p = f.fetchAndSave();
                    p.then(() => {
                        idx += 1;
                        progressToaster(`[ ${PRODUCT_ADVANCED} ] chromagram generation complete`, idx, total, tkey, Intent.SUCCESS, IconNames.LAYOUT_AUTO)
                    }, () => {
                        idx += 1;
                        failed += 1;
                    });
                    this.promises.push(p);
                }

                try {
                    await Promise.all(this.promises);
                    if (failed > 0) progressToaster(`[ ${PRODUCT_ADVANCED} ] analysis failed`, total, total, tkey, Intent.DANGER, IconNames.LAYOUT_AUTO)
                    else progressToaster(`[ ${PRODUCT_ADVANCED} ] analysis complete`, total, total, tkey, Intent.SUCCESS, IconNames.LAYOUT_AUTO)
                }
                catch (e) {
                    for (let i = 0; i < this.activeRunners.length; i += 1) {
                        this.activeRunners[i].stop();
                    }
                    console.log(`[ ${PRODUCT_ADVANCED} ] failed error: `, e);
                    if (failed > 0) progressToaster(`[ ${PRODUCT_ADVANCED} ] analysis failed`, total, total, tkey, Intent.DANGER, IconNames.LAYOUT_AUTO);
                }
                console.log(`[ ${PRODUCT_ADVANCED} ] analysis finished, # analysed: `, this.activeRunners.length);
                for (let i = 0; i < this.activeRunners.length; i += 1) {
                    this.activeRunners[i].stop();
                }
                this.activeRunners = [];
                this.promises = [];
            }
            else {
                console.log(`[ ${PRODUCT_ADVANCED} ] analysis cancelled`);
            }
            this.isAutoAnalysisRunning = false;
            DispatcherService.dispatch(DispatchEvents.MusicAnalysisEnded, AnalysisType.AUTO);
        }
    }

    analyseKey = async () => {
        this.analyse([AnalysisType.KEY]);
    }

    analyseChords = async () => {
        this.analyse([AnalysisType.CHORDS]);
    }

    analyseBeats = async () => {
        this.analyse([AnalysisType.BEATS]);
    }

    analyseTempo = async () => {
        this.analyse([AnalysisType.TEMPO]);
    }

    analyseCQT = async () => {
        this.analyse([AnalysisType.CQT]);
    }
}

const MusicAnalysisService = MusicAnalysis.getInstance();
export default MusicAnalysisService;
