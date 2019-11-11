
import WaveSurfer, { WaveSurferParams } from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min';

class MediaPlayer {
    public wavesurfer: WaveSurfer | null;

    constructor() {
        this.wavesurfer = null;
    }

    loadMedia = (blob: Blob) => new Promise((resolve, reject) => {
        const params: WaveSurferParams = {
            container: '#waveform',
            waveColor: '#04ABED',
            //progressColor: 'hsla(200, 100%, 30%, 0.5)',
            //waveColor: 'grey',
            progressColor: 'black',
            cursorColor: '#fff',
            // This parameter makes the waveform look like SoundCloud's player
            barWidth: 3,
            barGap: 2,
            //height: 180,
            barHeight: 1,
            scrollParent: false,
            responsive: true,
            closeAudioContext: true,
            forceDecode: true,
            plugins: [
                TimelinePlugin.create({
                    container: '#timeline',
                    primaryColor: "#fff",
                    fontFamily: 'Inconsolata',
                }),
            ],
        };
        this.wavesurfer = WaveSurfer.create(params);
        this.wavesurfer.loadBlob(blob);

        this.wavesurfer.on("ready", () => {
            resolve();
        });
        this.wavesurfer.on('error', (msg) => {
            console.error("wavesurfer load-error", msg);
            reject(new Error(msg));
        });
    });

    unload = (): void => {
        if (this.wavesurfer) {
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
