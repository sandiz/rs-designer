import Tone from 'tone';
import { Colors } from "@blueprintjs/core";
import nextFrame from 'next-frame';
import { SoundTouch, SimpleFilter, getWebAudioNode } from 'soundtouchjs';
import * as PATH from 'path';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min';
import CursorPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.cursor.min';
import RegionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min';
import ChordsTimelinePlugin from '../lib/wv-plugin/chordstimeline';
import BeatsTimelinePlugin from '../lib/wv-plugin/beatstimeline';
import MinimapPlugin from '../lib/wv-plugin/minimap';
import { DispatcherService, DispatchEvents, DispatchData } from './dispatcher';
import {
    VOLUME, ExtClasses, ZOOM, TEMPO, KEY, WasmTypes, FONT_FAMILY,
} from '../types/base';
import {
    ChordTime, BeatTime, STEM,
} from '../types/musictheory';
import {
    EQFilter, EQTag, EQPreset,
} from '../types/eq'
import ProjectService, { ProjectUpdateType } from './project';
import { readDir, readFile, UUID } from '../lib/utils';
import CLAP from '../assets/claps.wav';
import { AppContextType } from '../context';
import { RegionHandler, Region } from '../types/regions';

const electron = window.require("electron");
const { nativeTheme, app } = electron.remote;
const path: typeof PATH = window.require('path');


export const COLORS = {
    TIMELINE: { primaryFontColorDark: Colors.WHITE, primaryFontColor: Colors.BLACK },
    CHORDS: { primaryFontColorDark: Colors.WHITE, primaryFontColor: Colors.BLACK },
};
const getGradient = (type: string, ctx: CanvasRenderingContext2D) => {
    if (type === "dark") {
        const linGradDark = ctx.createLinearGradient(0, 155, 0, 200);
        linGradDark.addColorStop(0.5, 'rgba(255, 255, 255, 1.000)');
        linGradDark.addColorStop(0.5, 'rgba(183, 183, 183, 1.000)');
        return linGradDark;
    }
    else {
        const linGrad = ctx.createLinearGradient(0, 155, 0, 200);
        linGrad.addColorStop(0.5, 'rgba(0, 0, 0, 1.000)');
        linGrad.addColorStop(0.5, 'rgba(72, 72, 72, 1.000)');
        return linGrad;
    }
}
const asciiToBinary = (str: string) => {
    if (typeof atob === 'function') {
        return atob(str)
    } else {
        return Buffer.from(str, 'base64').toString('binary');
    }
}
const decode = (encoded: string): ArrayBuffer => {
    const binaryString = asciiToBinary(encoded);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
class MediaPlayer {
    public wavesurfer: WaveSurfer | null;
    public audioContext: AudioContext | null;
    public isEQOn: boolean;
    public currentEQs: EQFilter[];
    private static instance: MediaPlayer;
    private shifter: unknown;
    private stNode: AudioNode | null;
    private pitchSemitonesDiff = 0;
    private wasm = WasmTypes;
    private clapBuffer: AudioBuffer | null = null;
    private context: AppContextType | null = null;
    public regionHandler: RegionHandler | null = null;

    static getInstance() {
        if (!MediaPlayer.instance) {
            MediaPlayer.instance = new MediaPlayer();
        }
        return MediaPlayer.instance;
    }

    private constructor() {
        this.wavesurfer = null;
        this.audioContext = null;
        this.isEQOn = false;
        this.currentEQs = [];
        this.shifter = new SoundTouch();
        this.stNode = null;
        this.pitchSemitonesDiff = 0;
        nativeTheme.on("updated", this.updateTheme);
        DispatcherService.on(DispatchEvents.AppThemeChanged, this.updateTheme);
        this.initWebAssembly();
    }

    public destructor() {
        nativeTheme.off("updated", this.updateTheme);
        DispatcherService.off(DispatchEvents.AppThemeChanged, this.updateTheme);
    }

    private initWebAssembly = async () => {
        //eslint-disable-next-line
        const providers = require("../lib/musicanalysis/providers.json");
        /* init cqt */
        const cqt = decode(providers.cqt);
        const waObj = await WebAssembly.instantiate(cqt, {
            env: {
                cos: Math.cos,
                sin: Math.sin,
                exp: Math.exp,
                logf: Math.log,
            },
        });
        console.log("cqt wasm isValid: ", WebAssembly.validate(cqt), waObj.instance.exports);
        this.wasm = {
            cqt: waObj.instance.exports,
        }
    }

    private initAudioBuffer = async () => {
        if (this.audioContext) {
            //TODO: not sure if this will work in release
            this.clapBuffer = await this.audioContext.decodeAudioData((await (await fetch(CLAP)).arrayBuffer()));
        }
    }

    public getClapBuffer = () => {
        return this.clapBuffer;
    }

    public getCQTProvider = (func: string): Function | null => {
        if (this.wasm) {
            if (this.wasm.cqt) {
                if (func in this.wasm.cqt) {
                    return this.wasm.cqt[func] as Function;
                }
            }
        }
        return null;
    }

    public setAppCallbacks = (context: AppContextType) => {
        this.context = context;
    }

    public clearAppCallbacks = () => {
        this.context = null;
    }

    private _isDarkTheme = () => this.context && this.context.isDarkTheme();

    public loadMedia = (blob: Blob) => new Promise((resolve, reject) => {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return;

        this.audioContext = new AudioContext({
            latencyHint: 'interactive',
            sampleRate: 44100,
        });
        this.initAudioBuffer();
        const params = {
            audioContext: this.audioContext,
            backgroundColor: this._isDarkTheme() ? ExtClasses.DARK_BACKGROUND_COLOR : ExtClasses.BACKGROUND_COLOR,
            container: '#waveform',
            waveColor: this._isDarkTheme() ? getGradient("dark", ctx) : getGradient("light", ctx),
            progressColor: this._isDarkTheme() ? getGradient("dark", ctx) : getGradient("light", ctx), //Colors.BLACK,
            cursorColor: this._isDarkTheme() ? Colors.WHITE : Colors.BLACK,
            // This parameter makes the waveform look like SoundCloud's player
            barWidth: 3,
            barRadius: 3,
            barGap: 2,
            height: 180,
            barHeight: 0.85,
            scrollParent: false,
            responsive: true,
            closeAudioContext: true,
            forceDecode: true,
            loopSelection: true,
            autoCenter: false,
            pixelRatio: 2,
            scrollPage: true,
            plugins: [
                TimelinePlugin.create({
                    container: '#timeline',
                    primaryColor: "#fff",
                    primaryFontColor: this._isDarkTheme() ? COLORS.TIMELINE.primaryFontColorDark : COLORS.TIMELINE.primaryFontColor,
                    secondaryFontColor: this._isDarkTheme() ? COLORS.TIMELINE.primaryFontColorDark : COLORS.TIMELINE.primaryFontColor,
                    fontFamily: FONT_FAMILY.MONOSPACE,
                    fontSize: 12,
                    notchPercentHeight: 40,
                }),
                CursorPlugin.create({
                    showTime: true,
                    followCursorY: false,
                    opacity: 1,
                    width: '1px',
                    color: this._isDarkTheme() ? Colors.WHITE : Colors.BLACK,
                    customShowTimeStyle: {
                        'background-color': '#000',
                        color: '#fff',
                        padding: '10px',
                        'font-size': '14px',
                        'font-family': FONT_FAMILY.MONOSPACE,
                        visibility: 'visible',
                    },
                    //extraOffset: 20, /* waveform-root has padding of 20px */
                }),
                RegionsPlugin.create({
                    dragSelection: true,
                    regions: [],
                    maxRegions: 20,
                }),
                MinimapPlugin.create({
                    container: '#wave-minimap',
                    waveColor: this._isDarkTheme() ? "#B7B7B7" : "#9D9C9E",
                    progressColor: this._isDarkTheme() ? getGradient("dark", ctx) : getGradient("light", ctx),
                    height: 40,
                    showRegions: true,
                    showOverview: true,
                    overviewBorderColor: this._isDarkTheme() ? Colors.GRAY3 : Colors.DARK_GRAY3,
                    overviewBorderSize: 1,
                }),
            ],
        };
        DispatcherService.dispatch(DispatchEvents.MediaLoading);
        DispatcherService.on(DispatchEvents.ProjectUpdated, this.projectUpdated);
        DispatcherService.on(DispatchEvents.EqualizerToggle, this.toggleEqualizer);
        DispatcherService.on(DispatchEvents.PitchChange, this.pitchChanged);
        //eslint-disable-next-line
        this.wavesurfer = WaveSurfer.create(params as any);
        this.wavesurfer.loadBlob(blob);

        /* Region Handlers */
        this.regionHandler = new RegionHandler(this.wavesurfer);
        this.regionHandler.handleEvents();

        this.wavesurfer.on("ready", () => {
            if (this.wavesurfer) this.wavesurfer.zoom(ZOOM.DEFAULT);
            DispatcherService.dispatch(DispatchEvents.MediaReady);
            const aNode = this.getPostAnalyzer() as AnalyserNode;
            if (aNode) {
                aNode.minDecibels = -90;
                aNode.maxDecibels = -30;
                aNode.smoothingTimeConstant = 0.0;
            }
            const context = this.getAudioContext();
            if (context) Tone.setContext(context);
            this.initShifter();
            this.setWaveformStyle();
            this.loadBeatsTimeline();
            this.loadChordsTimeline();
            this.loadRegions();
            resolve();
        });
        this.wavesurfer.on('error', (msg) => {
            console.error("wavesurfer load-error", msg);
            reject(new Error(msg));
        });
        this.wavesurfer.on('finish', () => {
            DispatcherService.dispatch(DispatchEvents.MediaFinishedPlaying, null);
        });
        this.wavesurfer.on('play', () => {
            if (this.wavesurfer) {
                this.wavesurfer.drawer.recenter(this.wavesurfer.getCurrentTime() / this.wavesurfer.getDuration());
            }
            DispatcherService.dispatch(DispatchEvents.MediaStartedPlaying, null);
        });
        this.wavesurfer.on('pause', () => {
            DispatcherService.dispatch(DispatchEvents.MediaWasPaused, null);
        });
    });

    projectUpdated = async (data: DispatchData) => {
        if (typeof data === 'string'
            && (data === ProjectUpdateType.ExternalFilesUpdate
                || data === ProjectUpdateType.MediaInfoUpdated)) {
            const metadata = await ProjectService.getProjectMetadata();
            if (metadata) {
                this.loadChordsTimeline(metadata.chords);
                this.loadBeatsTimeline(metadata.beats);
            }
        }
    }

    pitchChanged = () => {
        if (this.wavesurfer) {
            const activePlugins = this.wavesurfer.getActivePlugins();

            if ((activePlugins).chordstimeline === true) {
                this.wavesurfer.chordstimeline.render(this.pitchSemitonesDiff);
            }
        }
    }

    loadRegions = () => {
        if (this.regionHandler) {
            const r = this.regionHandler.loadRegions();

            r.forEach(p => {
                if (this.wavesurfer) {
                    this.wavesurfer.regions.add(p);
                }
            });
        }
    }

    loadChordsTimeline = async (chordData: ChordTime[] | null = null) => {
        if (this.wavesurfer) {
            const activePlugins = this.wavesurfer.getActivePlugins();
            //@ts-nocheck
            if ((activePlugins).chordstimeline === true) {
                if (chordData) this.wavesurfer.chordstimeline.params.chords = chordData;
                this.wavesurfer.chordstimeline.render(this.pitchSemitonesDiff);
            }
            else {
                const chords = await ProjectService.readChords();
                const ct = ChordsTimelinePlugin.create({
                    container: '#chordstimeline',
                    chords,
                    fontSize: 15,
                    primaryColor: this._isDarkTheme() ? COLORS.CHORDS.primaryFontColorDark : COLORS.CHORDS.primaryFontColor,
                    chordColor: this._isDarkTheme() ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1,
                    alternateColor: this._isDarkTheme() ? Colors.DARK_GRAY2 : Colors.LIGHT_GRAY2,
                    overflowColor: this._isDarkTheme() ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1,
                })
                this.wavesurfer.registerPlugins([ct]);
            }
        }
    }

    loadBeatsTimeline = async (beatsData: BeatTime[] | null = null) => {
        if (this.wavesurfer) {
            const activePlugins = this.wavesurfer.getActivePlugins();
            if ((activePlugins).beatstimeline === true) {
                if (beatsData) this.wavesurfer.beatstimeline.params.beats = beatsData;
                this.wavesurfer.beatstimeline.render();
            }
            else {
                const beats = await ProjectService.readBeats();
                const ct = BeatsTimelinePlugin.create({
                    container: '#beatstimeline',
                    beats,
                    fontSize: 15,
                    height: 25,
                    notchPercentHeight: 50,
                    primaryColor: this._isDarkTheme() ? COLORS.CHORDS.primaryFontColorDark : COLORS.CHORDS.primaryFontColor,
                    downBeatColor: this._isDarkTheme() ? Colors.LIGHT_GRAY1 : Colors.DARK_GRAY1,
                    overflowColor: this._isDarkTheme() ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1,
                })
                this.wavesurfer.registerPlugins([ct]);
            }
        }
    }

    private updateTheme = () => {
        if (this.wavesurfer) {
            const ctx = document.createElement('canvas').getContext('2d');
            if (!ctx) return;
            const keys = Object.keys(this.wavesurfer.getActivePlugins());
            if (keys.includes("timeline")) {
                this.wavesurfer.timeline.params.primaryFontColor = this._isDarkTheme() ? COLORS.TIMELINE.primaryFontColorDark : COLORS.TIMELINE.primaryFontColor;
                this.wavesurfer.timeline.params.secondaryFontColor = this._isDarkTheme() ? COLORS.TIMELINE.primaryFontColorDark : COLORS.TIMELINE.primaryFontColor;
                this.wavesurfer.timeline.render();
            }
            if (keys.includes("cursor")) {
                const cursor = this.wavesurfer.cursor;
                const br = `${cursor.params.width} solid ${this._isDarkTheme() ? Colors.WHITE : Colors.BLACK}`;
                cursor.style(cursor.cursor, {
                    "border-right": br,
                });
            }
            if (keys.includes("minimap")) {
                this.wavesurfer.minimap.params.waveColor = this._isDarkTheme() ? "#B7B7B7" : "#9D9C9E";
                this.wavesurfer.minimap.params.progressColor = this._isDarkTheme() ? getGradient("dark", ctx) : getGradient("light", ctx);
                this.wavesurfer.minimap.overviewRegion.style.border = "1px solid " + (this._isDarkTheme() ? Colors.GRAY3 : Colors.DARK_GRAY3);
                this.wavesurfer.minimap.render();
            }
            if (keys.includes("chordstimeline")) {
                this.wavesurfer.chordstimeline.params.primaryColor = this._isDarkTheme() ? COLORS.CHORDS.primaryFontColorDark : COLORS.CHORDS.primaryFontColor;
                this.wavesurfer.chordstimeline.params.chordColor = this._isDarkTheme() ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1;
                this.wavesurfer.chordstimeline.params.alternateColor = this._isDarkTheme() ? Colors.DARK_GRAY2 : Colors.LIGHT_GRAY2;
                this.wavesurfer.chordstimeline.params.overflowColor = this._isDarkTheme() ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1;
                this.wavesurfer.chordstimeline.render();
            }
            if (keys.includes("beatstimeline")) {
                this.wavesurfer.beatstimeline.params.primaryColor = this._isDarkTheme() ? COLORS.CHORDS.primaryFontColorDark : COLORS.CHORDS.primaryFontColor;
                this.wavesurfer.beatstimeline.params.downBeatColor = this._isDarkTheme() ? Colors.LIGHT_GRAY1 : Colors.DARK_GRAY1;
                this.wavesurfer.beatstimeline.params.overflowColor = this._isDarkTheme() ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1;
                this.wavesurfer.beatstimeline.render();
            }

            this.wavesurfer.setBackgroundColor(this._isDarkTheme() ? ExtClasses.DARK_BACKGROUND_COLOR : ExtClasses.BACKGROUND_COLOR);
            this.wavesurfer.params.waveColor = this._isDarkTheme() ? getGradient("dark", ctx) : getGradient("light", ctx);
            this.wavesurfer.setCursorColor(this._isDarkTheme() ? Colors.WHITE : Colors.BLACK);
            this.wavesurfer.drawBuffer();
        }
    }

    private setWaveformStyle = () => {
        if (this.wavesurfer) {
            this.wavesurfer.drawer.wrapper.classList.add("waveform-height");
        }
    }

    public unload = (): void => {
        if (this.wavesurfer) {
            if (this.regionHandler) {
                this.regionHandler.destroy();
                this.regionHandler = null;
            }
            this.wavesurfer.stop();
            this.wavesurfer.unAll();
            this.wavesurfer.destroy();
        }
        this.currentEQs = [];
        this.isEQOn = false;
        this.audioContext = null;
        this.wavesurfer = null;
        DispatcherService.off(DispatchEvents.ProjectUpdated, this.projectUpdated);
        DispatcherService.off(DispatchEvents.PitchChange, this.pitchChanged);
        DispatcherService.off(DispatchEvents.EqualizerToggle, this.toggleEqualizer);
        DispatcherService.dispatch(DispatchEvents.MediaReset);
    }

    public empty = (): void => {
        if (this.wavesurfer) {
            this.wavesurfer.empty();
        }
    }

    public stop = (): void => {
        if (this.wavesurfer) {
            this.wavesurfer.stop();
        }
    }

    public playPause = async () => {
        if (this.wavesurfer) {
            if (!this.isPlaying() && this.regionHandler) {
                if (this.regionHandler.loopActive()) {
                    this.regionHandler.playLoopingRegion();
                    return;
                }
            }
            await this.wavesurfer.playPause();
        }
    }

    public pause = async () => {
        if (this.wavesurfer) {
            await this.wavesurfer.pause();
        }
    }

    public play = async () => {
        if (this.wavesurfer) {
            if (this.regionHandler) {
                if (this.regionHandler.loopActive()) {
                    this.regionHandler.playLoopingRegion();
                    return;
                }
            }
            await this.wavesurfer.play();
        }
    }

    public seekTo = (num: number): void => {
        if (this.wavesurfer) {
            this.wavesurfer.seekTo(num);
        }
    }

    public rewind = (num = 5): void => {
        if (this.wavesurfer) {
            this.wavesurfer.skipBackward(num);
        }
    }

    public ffwd = (num = 5): void => {
        if (this.wavesurfer) {
            this.wavesurfer.skipForward(num);
        }
    }

    public isPlaying = (): boolean => {
        if (this.wavesurfer) {
            return this.wavesurfer.isPlaying();
        }
        return false;
    }

    public getDuration = (): number => {
        if (this.wavesurfer) {
            return this.wavesurfer.getDuration();
        }
        return 0;
    }

    public getCurrentTime = (): number => {
        if (this.wavesurfer) {
            return this.wavesurfer.getCurrentTime();
        }
        return 0;
    }

    public getVolume = () => {
        if (this.wavesurfer) {
            return this.wavesurfer.getVolume();
        }
        return VOLUME.DEFAULT;
    }

    public setVolume = (num: number) => {
        if (this.wavesurfer) {
            return this.wavesurfer.setVolume(num);
        }
        return 0;
    }

    public increaseVolume = () => {
        if (this.wavesurfer) {
            const current = this.getVolume();
            if (current < VOLUME.MAX) this.setVolume(current + 0.1);
        }
    }

    public decreaseVolume = () => {
        if (this.wavesurfer) {
            const current = this.getVolume();
            if (current > VOLUME.MIN) this.setVolume(current - 0.1);
        }
    }

    public skipForward = () => {
        if (this.wavesurfer) {
            this.wavesurfer.skipForward();
        }
    }

    public skipBackward = () => {
        if (this.wavesurfer) {
            this.wavesurfer.skipBackward();
        }
    }

    public zoom = (v: number) => {
        if (this.wavesurfer) {
            this.wavesurfer.zoom(v);
            DispatcherService.dispatch(DispatchEvents.ZoomChanged, v);
        }
    }

    public getZoom = () => {
        if (this.wavesurfer) {
            return this.wavesurfer.params.minPxPerSec;
        }
        return ZOOM.DEFAULT;
    }

    public getAudioContext = (): AudioContext | null => {
        return this.audioContext;
    }

    public getPostAnalyzer = (): AudioNode | null => {
        if (this.wavesurfer) {
            return this.wavesurfer.backend.postAnalyser;
        }
        return null;
    }

    public getAnalyzer = (): AnalyserNode | null => {
        if (this.wavesurfer) {
            return this.wavesurfer.backend.analyser;
        }
        return null;
    }

    public getGainNode = (): GainNode | null => {
        if (this.wavesurfer) {
            return this.wavesurfer.backend.gainNode;
        }
        return null;
    }

    public addEQFilters = (tags: EQTag[]) => {
        if (this.wavesurfer && this.audioContext) {
            const filters: EQFilter[] = [];
            for (let i = 0; i < tags.length; i += 1) {
                const tag = tags[i];
                const filter = this.audioContext.createBiquadFilter();
                if (tag.type !== 'edit') filter.type = tag.type;
                filter.Q.value = tag.q;
                filter.frequency.value = tag.freq;
                filter.gain.value = tag.gain;

                const eqFilter: EQFilter = { tag, filter };
                filters.push(eqFilter);
            }
            if (filters.length > 0) {
                this.currentEQs = filters;
                if (this.isEQOn) this.toggleEqualizer(true);
            }
        }
    }

    public addEQFilter = (tag: EQTag) => {
        if (this.wavesurfer && this.audioContext) {
            const filter = this.audioContext.createBiquadFilter();
            if (tag.type !== 'edit') filter.type = tag.type;
            filter.Q.value = tag.q;
            filter.frequency.value = tag.freq;
            filter.gain.value = tag.gain;

            const eqFilter: EQFilter = { tag, filter };
            this.currentEQs.push(eqFilter);
            if (this.isEQOn) this.toggleEqualizer(true);
        }
    }

    public removeFilter = (tag: EQTag) => {
        if (this.wavesurfer) {
            for (let i = 0; i < this.currentEQs.length; i += 1) {
                if (this.currentEQs[i].tag.id === tag.id) {
                    this.currentEQs.splice(i, 1);
                    break;
                }
            }
            if (this.isEQOn) this.toggleEqualizer(this.currentEQs.length !== 0);
        }
    }

    public getEQPresets = async (): Promise<EQPreset[]> => {
        const presets: EQPreset[] = [];
        try {
            const appPath = path.join(app.getAppPath(), 'src/app-config/eq-presets');
            const files: string[] = await readDir(appPath);
            for (let i = 0; i < files.length; i += 1) {
                const file = files[i];
                try {
                    //eslint-disable-next-line
                    const data: EQPreset = JSON.parse(await (await readFile(path.join(appPath, file))).toString());
                    if (data && data.name && data.tags && data.tags.length > 0) {
                        for (let j = 0; j < data.tags.length; j += 1) {
                            data.tags[j].id = UUID();
                        }
                        presets.push(data);
                    }
                }
                catch (e) {
                    continue;
                }
            }
        }
        catch (e) {
            console.log("eq-preset readdir exception", e);
        }
        return presets;
    }

    public getFilters = (): EQFilter[] => {
        return this.currentEQs;
    }

    public getFilterFrom = (tag: EQTag): BiquadFilterNode | null => {
        for (let i = 0; i < this.currentEQs.length; i += 1) {
            if (this.currentEQs[i].tag.id === tag.id) {
                return this.currentEQs[i].filter;
            }
        }
        return null;
    }

    public isActive = () => {
        return (this.wavesurfer != null);
    }

    private toggleEqualizer = (data: DispatchData) => {
        const val = data as boolean;
        if (this.wavesurfer != null) {
            const backend = this.wavesurfer.backend;
            if (val) {
                const filters = this.currentEQs
                    .map(item => item.filter);
                backend.setFilters(filters);
            }
            else {
                backend.disconnectFilters();
            }
            DispatcherService.dispatch(DispatchEvents.EqualizerToggled, val);
            this.isEQOn = val;
        }
    }

    public getPlaybackRate = (): number => {
        if (this.wavesurfer) {
            return this.wavesurfer.getPlaybackRate();
        }
        return 1;
    }

    public getPitchSemitones = (): number => {
        return this.pitchSemitonesDiff;
    }

    public changeTempo = (v: number) => {
        if (this.wavesurfer) {
            const nt = v / 100;
            if (v >= TEMPO.MIN && v <= TEMPO.MAX) {
                this.wavesurfer.setPlaybackRate(nt);
                DispatcherService.dispatch(DispatchEvents.TempoChange, nt);
            }
        }
    }

    public changePitchSemitones = (v: number) => {
        if (this.wavesurfer) {
            if (v >= KEY.MIN && v <= KEY.MAX) {
                //eslint-disable-next-line
                (this.shifter as any).pitchSemitones = v;
                this.pitchSemitonesDiff = v;
                this.wavesurfer.skipForward(0.001);
                DispatcherService.dispatch(DispatchEvents.PitchChange, v);
            }
        }
    }

    private initShifter = () => {
        if (this.wavesurfer) {
            const bk = this.wavesurfer.backend;
            const buffer = bk.buffer;
            const channels = buffer.numberOfChannels;
            const l = buffer.getChannelData(0);
            const r = channels > 1 ? buffer.getChannelData(1) : l;
            const length = buffer.length;
            let seekingDiff = 0;
            let seekingPos: number | null = null;


            const source = {
                //eslint-disable-next-line
                extract: (target: any[], numFrames: number, position: number) => {
                    if (seekingPos != null) {
                        seekingDiff = seekingPos - position;
                        seekingPos = null;
                    }

                    position += seekingDiff;

                    for (let i = 0; i < numFrames; i += 1) {
                        target[i * 2] = l[i + position];
                        target[i * 2 + 1] = r[i + position];
                    }

                    return Math.min(numFrames, length - position);
                },
            };
            this.wavesurfer.on('play', () => {
                if (!this.wavesurfer) return;
                // if (this.state.transposeMode) return;
                const backend = bk;
                // const length = backend.buffer.length;
                //eslint-disable-next-line
                seekingPos = ~~(backend.getPlayedPercents() * length);
                const tempo = this.wavesurfer.getPlaybackRate();
                //eslint-disable-next-line
                (this.shifter as any).tempo = tempo;
                //eslint-disable-next-line
                (this.shifter as any).pitchSemitones = this.pitchSemitonesDiff;
                if (tempo === 1 && this.pitchSemitonesDiff === 0) {
                    if (this.stNode) {
                        this.stNode.disconnect();
                        backend.source.connect(backend.analyser);
                    }
                }
                else {
                    if (!this.stNode) {
                        const filter = new SimpleFilter(source, this.shifter);
                        this.stNode = getWebAudioNode(
                            backend.ac,
                            filter,
                        );
                    }

                    backend.source.disconnect(backend.analyser);
                    if (this.stNode) backend.source.connect(this.stNode);

                    if (this.stNode) this.stNode.connect(backend.analyser);
                }
            });
            this.wavesurfer.on('pause', () => {
                if (this.stNode) {
                    this.stNode.disconnect();
                    const backend = bk;
                    backend.source.connect(backend.analyser);
                }
            });
            this.wavesurfer.on('seek', () => {
                // if (this.state.transposeMode) return;
                const backend = bk;
                //eslint-disable-next-line
                seekingPos = ~~(backend.getPlayedPercents() * length);
            });
        }
    }

    public getSampleRate = () => {
        if (this.audioContext) {
            return this.audioContext.sampleRate;
        }
        return 0;
    }

    public exportImage = async (width: number): Promise<string> => {
        if (this.wavesurfer) {
            const ctx = document.createElement('canvas').getContext('2d');
            if (!ctx) return "";
            const linGradDark = ctx.createLinearGradient(0, 155, 0, 200);
            if (this._isDarkTheme()) linGradDark.addColorStop(0.0, 'rgba(255, 255, 255, 0.8)');
            else linGradDark.addColorStop(0.0, 'rgba(0, 0, 0, 0.8)');
            const d = document.createElement("div");
            d.style.width = width + 'px';
            d.style.height = 100 + 'px';
            d.style.position = "absolute"
            document.body.appendChild(d);
            const drawer = new this.wavesurfer.Drawer(d, {
                pixelRatio: 1,
                heght: 180,
                maxCanvasWidth: width,
                waveColor: linGradDark,
                progressColor: linGradDark,
                barWidth: 3,
                barRadius: 3,
                barGap: 2,
                height: 200,
                barHeight: 1,
                scrollParent: false,
            });
            drawer.createWrapper();
            drawer.createElements();
            drawer.setWidth(width);
            const len = drawer.getWidth();
            const peaks = this.wavesurfer.backend.getPeaks(len, 0, len);
            drawer.drawPeaks(peaks, len, 0, len);
            await nextFrame();
            const image = drawer.getImage("image/png", 1, "dataURL")
            document.body.removeChild(d);
            drawer.destroy();
            return image;
        }
        return "";
    }

    public getRegions = (): Region[] => {
        let r: Region[] = [];
        if (this.regionHandler) {
            r = this.regionHandler.getRegions();
        }
        return r;
    }

    public stopLooping = () => {
        if (this.regionHandler) this.regionHandler.stopLooping();
    }

    public loopRegionBy = (id: string) => {
        if (this.regionHandler) this.regionHandler.loopRegionBy(id);
    }

    public getStemVolume = (s: STEM) => {
        console.log(s, 0.5)
        return 0.5;
    }

    public setStemVolume = (s: STEM, v: number) => {
        console.log(s, v, 0.5)
        return 0.5;
    }
}

const MediaPlayerService = MediaPlayer.getInstance();
export default MediaPlayerService;
