
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min';
import { Colors } from "@blueprintjs/core";

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

    loadMedia = (blob: Blob) => new Promise((resolve, reject) => {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return;

        const params = {
            container: '#waveform',
            waveColor: nativeTheme.shouldUseDarkColors ? getGradient("dark", ctx) : getGradient("light", ctx), //'#04ABED',
            //progressColor: 'hsla(200, 100%, 30%, 0.5)',
            //waveColor: 'grey',
            progressColor: Colors.BLACK,
            cursorColor: nativeTheme.shouldUseDarkColors ? Colors.WHITE : Colors.BLACK,
            // This parameter makes the waveform look like SoundCloud's player
            barWidth: 3,
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
                }),
            ],
        };
        //eslint-disable-next-line
        this.wavesurfer = WaveSurfer.create(params as any);
        this.wavesurfer.loadBlob(blob);

        this.wavesurfer.on("ready", () => {
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

                const ctx = document.createElement('canvas').getContext('2d');
                if (!ctx) return;

                this.wavesurfer.params.waveColor = nativeTheme.shouldUseDarkColors ? getGradient("dark", ctx) : getGradient("light", ctx);
                this.wavesurfer.drawBuffer();
                this.wavesurfer.setCursorColor(nativeTheme.shouldUseDarkColors ? Colors.WHITE : Colors.BLACK);
            }
        }
    }

    unload = (): void => {
        if (this.wavesurfer) {
            this.wavesurfer.unAll();
            this.wavesurfer.destroy();
        }
        this.wavesurfer = null;
    }

    empty = (): void => {
        if (this.wavesurfer) {
            this.wavesurfer.empty();
        }
    }
}

const MediaPlayerService = new MediaPlayer();
export default MediaPlayerService;
