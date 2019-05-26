import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js';
//  import MinimapPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.minimap.min.js';
//import CursorPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.cursor.min.js';
import ConstantQPlugin from './wv-plugin/cqtgram'
import ChordsTimelinePlugin from './wv-plugin/chordstimeline'
import BeatsTimelinePlugin from './wv-plugin/beatstimeline'
import { readTags, readFile } from './utils'
import { MediaAnalysis } from './medianalysis'
import ProjectService from '../services/project';
import { SettingsService } from '../services/settings';

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

const CQT_HEIGHT = 1024;
class MediaPlayerBase {
    constructor(blob) {
        this.wavesurfer = null;
        const params = {
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
                    fontFamily: 'Roboto Condensed',
                }),
                /*
                MinimapPlugin.create({
                    container: "#minimap",
                    waveColor: '#000',
                    progressColor: 'black',
                    height: 30,
                    showOverview: true,
                    barWidth: 0,
                    barGap: 0,
                    barRadius: false,
                    overviewBorderColor: "azure",
                }),*/
            ],
        };
        // initialise like this
        this.wavesurfer = WaveSurfer.create(params);

        this.wavesurfer.loadBlob(blob);
        DispatcherService.dispatch(DispatchEvents.AboutToDraw, "waveform");
        this.wavesurfer.on("ready", () => {
            DispatcherService.dispatch(DispatchEvents.MediaReady);
            DispatcherService.dispatch(DispatchEvents.FinishedDrawing, "waveform");
            this.analyse();
        });
        this.wavesurfer.on('error', (msg) => {
            console.log(msg);
        });
    }

    analyse = async () => {
        const analysisReqd = ProjectService.isAnalysisReqd();
        let method = "";
        DispatcherService.dispatch(DispatchEvents.MediaAnalysisStart, method);
        if (analysisReqd) {
            //save waveform data
            method = "generate"
            console.log("starting media analysis");
            MediaAnalysis.cancel()
            try {
                await MediaAnalysis.start(this.wavesurfer.drawer.width, CQT_HEIGHT); /* fft samples /2 */
            }
            catch (e) {
                console.log("media analysis killed");
                return;
            }
        } else {
            method = "load-from-disk"
            console.log("starting load from disk")
        }
        DispatcherService.dispatch(DispatchEvents.MediaAnalysisEnd, method);
    }

    CQT = async () => {
        if (await SettingsService.isLayoutAvailable("chromagram")) {
            DispatcherService.dispatch(DispatchEvents.AboutToDraw, "cqt");
            //await this.cqtAnalyse();
            await this.cqtImageRender();
            DispatcherService.dispatch(DispatchEvents.FinishedDrawing, "cqt");
        }
    }

    WAVEFORM = async () => {
        if (await SettingsService.isLayoutAvailable("waveform")) {
            DispatcherService.dispatch(DispatchEvents.AboutToDraw, "waveform");
            //await this.chordAnalyse();
            //await this.beatsAnalyse();
            DispatcherService.dispatch(DispatchEvents.FinishedDrawing, "waveform");
        }
    }

    cqtAnalyse = async () => {
        /* start wv-cqt plugin */
        const activePlugins = this.wavesurfer.getActivePlugins();
        if (activePlugins.constantq === true) {
            this.wavesurfer.constantq.render();
        }
        else {
            const info = ProjectService.getProjectInfo();
            const cqtdata = await readFile(info.cqt);
            const cqtp = ConstantQPlugin.create({
                container: "#spectrogram",
                labels: false,
                deferInit: false,
                pixelRatio: 2,
                height: 512,
                specData: cqtdata,
                cursorWidth: 1,
                cursorColor: 'white',
                waveColor: '#000',
                progressColor: 'black',
            })
            this.wavesurfer.registerPlugins([cqtp]);
        }
    }

    chordAnalyse = async () => {
        const activePlugins = this.wavesurfer.getActivePlugins();
        if (activePlugins.chordstimeline === true) {
            this.wavesurfer.chordstimeline.render();
        }
        else {
            let chords = [];
            try {
                chords = await ProjectService.readChords();
            }
            catch (ex) {
                if (!Array.isArray(chords)) chords = []
            }
            const ct = ChordsTimelinePlugin.create({
                container: '#chordstimeline',
                primaryColor: "#fff",
                chords,
                fontSize: 15,
            })
            this.wavesurfer.registerPlugins([ct]);
        }
    }

    beatsAnalyse = async () => {
        const activePlugins = this.wavesurfer.getActivePlugins();
        if (activePlugins.beatstimeline === true) {
            this.wavesurfer.beatstimeline.render();
        }
        else {
            let beats = []
            try {
                beats = await ProjectService.readBeats();
            }
            catch (ex) {
                if (!Array.isArray(beats)) beats = []
            }
            const ct = BeatsTimelinePlugin.create({
                container: '#beatstimeline',
                primaryColor: "#fff",
                beats,
            })
            this.wavesurfer.registerPlugins([ct]);
        }
    }

    setFilters(filters) {
        if (this.wavesurfer) {
            this.wavesurfer.backend.setFilters(filters);
        }
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

    seekTo(to) {
        if (this.wavesurfer) {
            this.wavesurfer.seekTo(to);
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
            const y = (Math.exp(val) - 1) / (Math.E - 1) /* logarithmic */
            this.wavesurfer.setVolume(y);
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
        if (ProjectService.isLoaded() && !ProjectService.isTemporary) {
            const mm = await ProjectService.readMetadata();
            ProjectService.assignMetadata(media, mm);
        }
        else {
            media.tags = await readTags(file)
        }

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
