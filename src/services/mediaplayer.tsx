
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min';
import CursorPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.cursor.min';
import { Colors } from "@blueprintjs/core";
import { DispatcherService, DispatchEvents } from './dispatcher';
import { VOLUME, ExtClasses } from '../types';

const { nativeTheme } = window.require("electron").remote;

const COLORS = {
    TIMELINE: { primaryFontColorDark: Colors.WHITE, primaryFontColor: Colors.BLACK },
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

    constructor() {
        this.wavesurfer = null;
        nativeTheme.on("updated", this.updateTheme);
    }

    destructor() {
        nativeTheme.off("updated", this.updateTheme);
    }

    loadMedia = (blob: Blob) => new Promise((resolve, reject) => {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return;

        const params = {
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
            resolve();
        });
        this.wavesurfer.on('error', (msg) => {
            console.error("wavesurfer load-error", msg);
            reject(new Error(msg));
        });
    });

    updateTheme = () => {
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
                console.log(br);
                cursor.style(cursor.cursor, {
                    "border-right": br,
                });
                console.log(cursor.cursor.style);
            }
            const ctx = document.createElement('canvas').getContext('2d');
            if (!ctx) return;

            this.wavesurfer.setBackgroundColor(nativeTheme.shouldUseDarkColors ? ExtClasses.DARK_BACKGROUND_COLOR : ExtClasses.BACKGROUND_COLOR);
            this.wavesurfer.params.waveColor = nativeTheme.shouldUseDarkColors ? getGradient("dark", ctx) : getGradient("light", ctx);
            this.wavesurfer.setCursorColor(nativeTheme.shouldUseDarkColors ? Colors.WHITE : Colors.BLACK);
            this.wavesurfer.drawBuffer();
        }
    }

    unload = (): void => {
        if (this.wavesurfer) {
            this.wavesurfer.stop();
            this.wavesurfer.unAll();
            this.wavesurfer.destroy();
        }
        this.wavesurfer = null;
        DispatcherService.dispatch(DispatchEvents.MediaReset);
    }

    empty = (): void => {
        if (this.wavesurfer) {
            this.wavesurfer.empty();
        }
    }

    stop = (): void => {
        if (this.wavesurfer) {
            this.wavesurfer.stop();
        }
    }

    playPause = async () => {
        if (this.wavesurfer) {
            await this.wavesurfer.playPause();
        }
    }

    pause = async () => {
        if (this.wavesurfer) {
            await this.wavesurfer.pause();
        }
    }

    play = async () => {
        if (this.wavesurfer) {
            await this.wavesurfer.play();
        }
    }

    seekTo = (num: number): void => {
        if (this.wavesurfer) {
            this.wavesurfer.seekTo(num);
        }
    }

    rewind = (num = 5): void => {
        if (this.wavesurfer) {
            this.wavesurfer.skipBackward(num);
        }
    }

    ffwd = (num = 5): void => {
        if (this.wavesurfer) {
            this.wavesurfer.skipForward(num);
        }
    }

    isPlaying = (): boolean => {
        if (this.wavesurfer) {
            return this.wavesurfer.isPlaying();
        }
        return false;
    }

    getDuration = (): number => {
        if (this.wavesurfer) {
            return this.wavesurfer.getDuration();
        }
        return 0;
    }

    getCurrentTime = (): number => {
        if (this.wavesurfer) {
            return this.wavesurfer.getCurrentTime();
        }
        return 0;
    }

    getVolume = () => {
        if (this.wavesurfer) {
            return this.wavesurfer.getVolume();
        }
        return VOLUME.DEFAULT;
    }

    setVolume = (num: number) => {
        if (this.wavesurfer) {
            return this.wavesurfer.setVolume(num);
        }
        return 0;
    }
}

const MediaPlayerService = new MediaPlayer();
export default MediaPlayerService;
