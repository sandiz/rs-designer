import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js';
import MinimapPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.minimap.min.js';
import ConstantQPlugin from './wv-plugin/cqtgram'
import { readTags, readFile } from './utils'
import { MediaAnalysis, NumpyLoaderThread } from './medianalysis'
import ProjectService from '../services/project';

const { DispatcherService, DispatchEvents } = require("../services/dispatcher");

export const MediaPlayer = {
    instance: null,
}
export const ImportMediaStates = {
    importing: "importing",
    readingTags: "reading-tags",
    decodingAudio: "decoding-audio",
    wavesurfing: "wavesurfing",
}

class MediaPlayerBase {
    constructor(blob) {
        this.wavesurfer = null;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.scriptProcessor = this.audioContext.createScriptProcessor(2048 /*bufferSize*/, 2 /*num inputs*/, 1 /*num outputs*/);
        const params = {
            audioContext: this.audioContext,
            container: '#waveform',
            waveColor: '#04ABED',
            //progressColor: 'hsla(200, 100%, 30%, 0.5)',
            //waveColor: 'grey',
            progressColor: 'black',
            cursorColor: '#fff',
            // This parameter makes the waveform look like SoundCloud's player
            barWidth: 3,
            barGap: 2,
            barRadius: true,
            height: 180,
            barHeight: 1,
            scrollParent: true,
            responsive: true,
            closeAudioContext: true,
            forceDecode: true,
            plugins: [
                TimelinePlugin.create({
                    container: '#timeline',
                    primaryColor: "#fff",
                    //formatTimeCallback: formatTimeCallback,
                    //timeInterval: timeInterval,
                    //primaryLabelInterval: primaryLabelInterval,
                    //secondaryLabelInterval: secondaryLabelInterval,
                }),
                MinimapPlugin.create({
                    container: "#minimap",
                    waveColor: 'grey',
                    progressColor: 'black',
                    height: 30,
                    showOverview: true,
                    barWidth: 0,
                    barGap: 0,
                    barRadius: false,
                    overviewBorderColor: "#303030",
                }),
                /*
                SpectrogramPlugin.create({
                    container: "#spectrogram",
                    labels: true,
                    deferInit: false,
                    pixelRatio: 1,
                    fftSamples: 1024,
                }),
                ConstantQPlugin.create({
                    container: "#spectrogram",
                    labels: true,
                    deferInit: true,
                    pixelRatio: 1,
                    fftSamples: 1024,
                })
                */
            ],
        };
        // initialise like this
        this.wavesurfer = WaveSurfer.create(params);

        this.wavesurfer.loadBlob(blob);
        this.wavesurfer.on("ready", () => {
            DispatcherService.dispatch(DispatchEvents.MediaReady);
            this.analyse();
        });
        this.wavesurfer.on('error', (msg) => {
            console.log(msg);
        });
        this.analysedEvents = 0;
        this.numAnalysisEvents = 1;
    }

    endAnalysis = () => {
        if (this.analysedEvents < this.numAnalysisEvents) {
            this.analysedEvents += 1;
        }
        if (this.analysedEvents >= this.numAnalysisEvents) {
            DispatcherService.dispatch(DispatchEvents.MediaAnalysisEnd);
        }
    }

    analyse = async () => {
        DispatcherService.dispatch(DispatchEvents.MediaAnalysisStart);
        console.log("starting media analysis");

        const analysisReqd = ProjectService.isAnalysisReqd();
        if (analysisReqd) {
            await MediaAnalysis.start();
        }
        // each module should pick the items up
    }

    cqtAnalyse = async () => {
        DispatcherService.dispatch(DispatchEvents.MediaAnalysisStart);
        console.log("starting media analysis");

        const cqtdata = await readFile('/Users/sandi/Projects/rs-designer/src/lib/musicanalysis/cqt.npy');
        const buffer = new ArrayBuffer(cqtdata.length);
        const cqtview = new Uint8Array(buffer);
        for (let i = 0; i < cqtdata.length; i += 1) {
            cqtview[i] = cqtdata[i];
        }

        NumpyLoaderThread.send({ buffer })
            .on('message', (response) => {
                DispatcherService.on(DispatchEvents.MASpectrogramEnd, this.endAnalysis);
                /* start wv-cqt plugin */
                const cqtp = ConstantQPlugin.create({
                    container: "#spectrogram",
                    labels: true,
                    deferInit: false,
                    pixelRatio: 1,
                    fftSamples: 1024,
                    specData: response.data,
                })
                this.wavesurfer.registerPlugins([cqtp]);
                NumpyLoaderThread.kill();
            })
            .on('error', (error) => {
                console.error('Worker errored:', error);
            })
            .on('exit', () => {
                console.log("analysis thread ended");
            });
    }

    setFilters(filters) {
        if (this.wavesurfer) {
            this.wavesurfer.backend.setFilters(filters);
        }
    }

    getScriptProcessor() {
        if (this.wavesurfer) {
            return this.scriptProcessor;
        }
        return null;
    }

    getPostAnalyser() {
        if (this.wavesurfer) {
            return this.wavesurfer.backend.postAnalyser;
        }
        return null;
    }

    getBackend() {
        if (this.wavesurfer) {
            return this.wavesurfer.backend;
        }
        return null;
    }

    destroy() {
        if (this.wavesurfer) {
            this.wavesurfer.destroy();
        }
        return null;
    }

    empty() {
        if (this.wavesurfer) {
            this.wavesurfer.empty();
        }
    }

    seekAndCenter(progress) {
        if (this.wavesurfer) {
            this.wavesurfer.seekAndCenter(progress);
        }
    }

    getVolume() {
        if (this.wavesurfer) {
            return this.wavesurfer.getVolume();
        }
        return 0;
    }

    getPlaybackRate() {
        if (this.wavesurfer) {
            return this.wavesurfer.getPlaybackRate();
        }
        return 1;
    }

    setPlaybackRate(val) {
        if (this.wavesurfer) {
            this.wavesurfer.setPlaybackRate(val);
        }
    }

    setVolume(val) {
        if (this.wavesurfer) {
            this.wavesurfer.setVolume(val);
        }
    }

    isPlaying() {
        if (this.wavesurfer) {
            return this.wavesurfer.isPlaying();
        }
        return false;
    }

    getCurrent() {
        if (this.wavesurfer) {
            return this.wavesurfer.getCurrentTime();
        }
        return 0;
    }

    getDuration() {
        if (this.wavesurfer) {
            return this.wavesurfer.getDuration();
        }
        return 0;
    }

    onseek(cb) {
        if (this.wavesurfer) {
            this.wavesurfer.on("seek", f => cb(f));
        }
    }

    finish(cb) {
        if (this.wavesurfer) {
            this.wavesurfer.on("finish", cb);
        }
    }

    onplay(cb) {
        if (this.wavesurfer) {
            this.wavesurfer.on("play", cb);
        }
    }

    onpause(cb) {
        if (this.wavesurfer) {
            this.wavesurfer.on("pause", cb);
        }
    }

    timer(cb) {
        if (this.wavesurfer) {
            this.wavesurfer.on("audioprocess", time => cb(time));
        }
    }

    playPause() {
        if (this.wavesurfer) {
            this.wavesurfer.playPause();
        }
    }

    stop() {
        if (this.wavesurfer) {
            this.wavesurfer.stop();
        }
    }

    rewind() {
        if (this.wavesurfer) {
            this.wavesurfer.skipBackward(5);
        }
    }

    ffwd() {
        if (this.wavesurfer) {
            this.wavesurfer.skipForward(5);
        }
    }

    zoom(num) {
        if (this.wavesurfer) {
            this.wavesurfer.zoom(Number(num));
        }
    }
}
export class ImportMedia {
    static async start(files, stateChangeCb, completeCb) {
        DispatcherService.dispatch(DispatchEvents.MediaReset);
        const file = files[0];

        console.log("importMedia: " + file);

        stateChangeCb(ImportMediaStates.importing);

        const media = {}
        media.tags = await readTags(file)

        stateChangeCb(ImportMediaStates.readingTags);

        /* decode audio */
        const data = await readFile(file);
        //const decodedData = await decode(data);
        /* change state */
        stateChangeCb(ImportMediaStates.decodingAudio);

        /* wave surf */
        const blob = new window.Blob([new Uint8Array(data)]);
        if (MediaPlayer.instance) {
            MediaPlayer.instance.empty();
            MediaPlayer.instance.destroy();
            MediaPlayer.instance = null;
        }
        /* change state */
        const cb = () => {
            stateChangeCb(ImportMediaStates.wavesurfing);
            completeCb(media);
            DispatcherService.off(DispatchEvents.MediaReady, cb);
        };
        DispatcherService.on(DispatchEvents.MediaReady, cb);

        MediaPlayer.instance = new MediaPlayerBase(blob);
    }
}
