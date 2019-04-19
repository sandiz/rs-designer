import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js';
import MinimapPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.minimap.min.js';
import ConstantQPlugin from './wv-plugin/cqtgram'
import ChordsTimelinePlugin from './wv-plugin/chordstimeline'
import BeatsTimelinePlugin from './wv-plugin/beatstimeline'
import { readTags, readFile } from './utils'
import { MediaAnalysis } from './medianalysis'
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
            //forceDecode: true,
            plugins: [
                TimelinePlugin.create({
                    container: '#timeline',
                    primaryColor: "#fff",
                    fontFamily: 'Roboto Condensed',
                }),
                MinimapPlugin.create({
                    container: "#minimap",
                    waveColor: '#000',
                    progressColor: 'black',
                    height: 30,
                    showOverview: true,
                    barWidth: 0,
                    barGap: 0,
                    barRadius: false,
                    overviewBorderColor: "#303030",
                }),
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
    }

    endAnalysis = (method) => {
        DispatcherService.dispatch(DispatchEvents.MediaAnalysisEnd, method);
    }

    analyse = async () => {
        const analysisReqd = ProjectService.isAnalysisReqd();
        let method = "";
        if (analysisReqd) {
            //save waveform data
            method = "generate"
            DispatcherService.dispatch(DispatchEvents.MediaAnalysisStart, method);
            console.log("starting media analysis");
            MediaAnalysis.cancel()
            try {
                await MediaAnalysis.start(this.wavesurfer.drawer.width, 512); /* fft samples /2 */
            }
            catch (e) {
                console.log("media analysis killed");
                return;
            }
        } else {
            method = "load-from-disk"
            console.log("starting load from disk")
            DispatcherService.dispatch(DispatchEvents.MediaAnalysisStart, "load-from-disk");
        }
        // each module should pick the items up
        //start loading analysis
        this.cqtAnalyse(method);
        this.chordAnalyse();
        this.beatsAnalyse();
    }

    cqtAnalyse = async (method) => {
        const info = ProjectService.getProjectInfo();
        const cqtdata = await readFile(info.cqt);
        DispatcherService.on(DispatchEvents.MASpectrogramEnd, this.endAnalysis, method);
        /* start wv-cqt plugin */
        const cqtp = ConstantQPlugin.create({
            container: "#spectrogram",
            labels: true,
            deferInit: false,
            pixelRatio: 1,
            fftSamples: 1024,
            specData: cqtdata,
        })
        this.wavesurfer.registerPlugins([cqtp]);
    }

    chordAnalyse = async () => {
        const chords = await ProjectService.readChords();
        const ct = ChordsTimelinePlugin.create({
            container: '#chordstimeline',
            primaryColor: "#fff",
            chords,
        })
        this.wavesurfer.registerPlugins([ct]);
    }

    beatsAnalyse = async () => {
        const beats = await ProjectService.readBeats();
        const ct = BeatsTimelinePlugin.create({
            container: '#beatstimeline',
            primaryColor: "#fff",
            beats,
        })
        this.wavesurfer.registerPlugins([ct]);
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
