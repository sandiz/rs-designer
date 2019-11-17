
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min';
import CursorPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.cursor.min';
import { Colors } from "@blueprintjs/core";
import ChordsTimelinePlugin from '../lib/wv-plugin/chordstimeline';
import BeatsTimelinePlugin from '../lib/wv-plugin/beatstimeline';
import { DispatcherService, DispatchEvents } from './dispatcher';
import {
    VOLUME, ExtClasses, ZOOM,
} from '../types';
import ProjectService from './project';

const { nativeTheme } = window.require("electron").remote;

const COLORS = {
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
class MediaPlayer {
    public wavesurfer: WaveSurfer | null;
    public audioContext: AudioContext | null;

    private static instance: MediaPlayer;

    static getInstance() {
        if (!MediaPlayer.instance) {
            MediaPlayer.instance = new MediaPlayer();
        }
        return MediaPlayer.instance;
    }

    private constructor() {
        this.wavesurfer = null;
        this.audioContext = null;
        nativeTheme.on("updated", this.updateTheme);
    }

    public destructor() {
        nativeTheme.off("updated", this.updateTheme);
    }

    public loadMedia = (blob: Blob) => new Promise((resolve, reject) => {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return;

        this.audioContext = new AudioContext({
            latencyHint: 'interactive',
            sampleRate: 44100,
        });
        const params = {
            audioContext: this.audioContext,
            backgroundColor: nativeTheme.shouldUseDarkColors ? ExtClasses.DARK_BACKGROUND_COLOR : ExtClasses.BACKGROUND_COLOR,
            container: '#waveform',
            waveColor: nativeTheme.shouldUseDarkColors ? getGradient("dark", ctx) : getGradient("light", ctx),
            progressColor: nativeTheme.shouldUseDarkColors ? getGradient("dark", ctx) : getGradient("light", ctx), //Colors.BLACK,
            cursorColor: nativeTheme.shouldUseDarkColors ? Colors.WHITE : Colors.BLACK,
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
            loopSelection: false,
            autoCenter: false,
            pixelRatio: 2,
            plugins: [
                TimelinePlugin.create({
                    container: '#timeline',
                    primaryColor: "#fff",
                    primaryFontColor: nativeTheme.shouldUseDarkColors ? COLORS.TIMELINE.primaryFontColorDark : COLORS.TIMELINE.primaryFontColor,
                    secondaryFontColor: nativeTheme.shouldUseDarkColors ? COLORS.TIMELINE.primaryFontColorDark : COLORS.TIMELINE.primaryFontColor,
                    fontFamily: 'Inconsolata',
                    fontSize: 12,
                    notchPercentHeight: 40,
                }),
                CursorPlugin.create({
                    showTime: true,
                    followCursorY: false,
                    opacity: 1,
                    width: '1px',
                    color: nativeTheme.shouldUseDarkColors ? Colors.WHITE : Colors.BLACK,
                    customShowTimeStyle: {
                        'background-color': '#000',
                        color: '#fff',
                        padding: '10px',
                        'font-size': '14px',
                        'font-family': 'Inconsolata',
                        visibility: 'visible',
                    },
                    extraOffset: 20, /* waveform-root has padding of 20px */
                }),
            ],
        };
        DispatcherService.dispatch(DispatchEvents.MediaLoading);
        //eslint-disable-next-line
        this.wavesurfer = WaveSurfer.create(params as any);
        this.wavesurfer.loadBlob(blob);

        this.wavesurfer.on("ready", () => {
            DispatcherService.dispatch(DispatchEvents.MediaReady);
            this.setStyle();
            this.loadBeatsTimeline();
            this.loadChordsTimeline();
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
            if (this.wavesurfer) this.wavesurfer.drawer.recenter(this.wavesurfer.getCurrentTime() / this.wavesurfer.getDuration());
            DispatcherService.dispatch(DispatchEvents.MediaStartedPlaying, null);
        });
        this.wavesurfer.on('pause', () => {
            DispatcherService.dispatch(DispatchEvents.MediaWasPaused, null);
        });
    });

    loadChordsTimeline = async () => {
        if (this.wavesurfer) {
            const activePlugins = this.wavesurfer.getActivePlugins();
            if (activePlugins.chordstimeline === true) {
                this.wavesurfer.chordstimeline.render();
            }
            else {
                const chords = await ProjectService.readChords();
                const ct = ChordsTimelinePlugin.create({
                    container: '#chordstimeline',
                    chords,
                    fontSize: 15,
                    primaryColor: nativeTheme.shouldUseDarkColors ? COLORS.CHORDS.primaryFontColorDark : COLORS.CHORDS.primaryFontColor,
                    chordColor: nativeTheme.shouldUseDarkColors ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1,
                    alternateColor: nativeTheme.shouldUseDarkColors ? Colors.DARK_GRAY2 : Colors.LIGHT_GRAY2,
                    overflowColor: nativeTheme.shouldUseDarkColors ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1,
                })
                this.wavesurfer.registerPlugins([ct]);
            }
        }
    }

    loadBeatsTimeline = async () => {
        if (this.wavesurfer) {
            const activePlugins = this.wavesurfer.getActivePlugins();
            if (activePlugins.beatstimeline === true) {
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
                    primaryColor: nativeTheme.shouldUseDarkColors ? COLORS.CHORDS.primaryFontColorDark : COLORS.CHORDS.primaryFontColor,
                    downBeatColor: nativeTheme.shouldUseDarkColors ? Colors.LIGHT_GRAY1 : Colors.DARK_GRAY1,
                    overflowColor: nativeTheme.shouldUseDarkColors ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1,
                })
                this.wavesurfer.registerPlugins([ct]);
            }
        }
    }

    private updateTheme = () => {
        if (this.wavesurfer) {
            const keys = Object.keys(this.wavesurfer.getActivePlugins());
            if (keys.includes("timeline")) {
                this.wavesurfer.timeline.params.primaryFontColor = nativeTheme.shouldUseDarkColors ? COLORS.TIMELINE.primaryFontColorDark : COLORS.TIMELINE.primaryFontColor;
                this.wavesurfer.timeline.params.secondaryFontColor = nativeTheme.shouldUseDarkColors ? COLORS.TIMELINE.primaryFontColorDark : COLORS.TIMELINE.primaryFontColor;
                this.wavesurfer.timeline.render();
            }
            if (keys.includes("cursor")) {
                const cursor = this.wavesurfer.cursor;
                const br = `${cursor.params.width} solid ${nativeTheme.shouldUseDarkColors ? Colors.WHITE : Colors.BLACK}`;
                cursor.style(cursor.cursor, {
                    "border-right": br,
                });
            }
            if (keys.includes("chordstimeline")) {
                this.wavesurfer.chordstimeline.params.primaryColor = nativeTheme.shouldUseDarkColors ? COLORS.CHORDS.primaryFontColorDark : COLORS.CHORDS.primaryFontColor;
                this.wavesurfer.chordstimeline.params.chordColor = nativeTheme.shouldUseDarkColors ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1;
                this.wavesurfer.chordstimeline.params.alternateColor = nativeTheme.shouldUseDarkColors ? Colors.DARK_GRAY2 : Colors.LIGHT_GRAY2;
                this.wavesurfer.chordstimeline.params.overflowColor = nativeTheme.shouldUseDarkColors ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1;
                this.wavesurfer.chordstimeline.render();
            }
            if (keys.includes("beatstimeline")) {
                this.wavesurfer.beatstimeline.params.primaryColor = nativeTheme.shouldUseDarkColors ? COLORS.CHORDS.primaryFontColorDark : COLORS.CHORDS.primaryFontColor;
                this.wavesurfer.beatstimeline.params.downBeatColor = nativeTheme.shouldUseDarkColors ? Colors.LIGHT_GRAY1 : Colors.DARK_GRAY1;
                this.wavesurfer.beatstimeline.params.overflowColor = nativeTheme.shouldUseDarkColors ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY1;
                this.wavesurfer.beatstimeline.render();
            }
            const ctx = document.createElement('canvas').getContext('2d');
            if (!ctx) return;

            this.wavesurfer.setBackgroundColor(nativeTheme.shouldUseDarkColors ? ExtClasses.DARK_BACKGROUND_COLOR : ExtClasses.BACKGROUND_COLOR);
            this.wavesurfer.params.waveColor = nativeTheme.shouldUseDarkColors ? getGradient("dark", ctx) : getGradient("light", ctx);
            this.wavesurfer.setCursorColor(nativeTheme.shouldUseDarkColors ? Colors.WHITE : Colors.BLACK);
            this.wavesurfer.drawBuffer();
        }
    }

    setStyle = () => {
        if (this.wavesurfer) {
            this.wavesurfer.drawer.wrapper.classList.add("waveform-height");
        }
    }

    public unload = (): void => {
        if (this.wavesurfer) {
            this.wavesurfer.stop();
            this.wavesurfer.unAll();
            this.wavesurfer.destroy();
        }
        this.audioContext = null;
        this.wavesurfer = null;
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
        }
    }

    getZoom = () => {
        if (this.wavesurfer) {
            return this.wavesurfer.params.minPxPerSec;
        }
        return ZOOM.DEFAULT;
    }
}

const MediaPlayerService = MediaPlayer.getInstance();
export default MediaPlayerService;
