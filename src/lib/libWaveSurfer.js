const mm = require('music-metadata');
const { Dispatcher, DispatchEvents } = require("./libDispatcher");
const WaveSurfer = require("./media/wavesurfer/dist/wavesurfer");
const TimelinePlugin = require('./media/wavesurfer/dist/plugin/wavesurfer.timeline');
const MinimapPlugin = require('./media/wavesurfer/dist/plugin/wavesurfer.minimap');
const readFile = require("./utils").readFile;



const readTags = file => new Promise((resolve, reject) => {
    mm.parseFile(file, { native: true })
        .then(metadata => {
            resolve(metadata);
        })
        .catch((err) => {
            reject(err);
        });
});

const ImportMediaStates = {
    importing: "importing",
    readingTags: "reading-tags",
    decodingAudio: "decoding-audio",
    wavesurfing: "wavesurfing",
}
class ImportMedia {
    async start(files, stateChangeCb, completeCb) {
        Dispatcher.dispatch(DispatchEvents.MediaReset);
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
        var blob = new window.Blob([new Uint8Array(data)]);
        if (exports.MediaPlayer.instance) {
            exports.MediaPlayer.instance.empty();
            exports.MediaPlayer.instance.destroy();
            exports.MediaPlayer.instance = null;
        }
        /* change state */
        const cb = () => {
            stateChangeCb(ImportMediaStates.wavesurfing);
            completeCb(media);
            Dispatcher.off(DispatchEvents.MediaReady, cb);
        };
        Dispatcher.on(DispatchEvents.MediaReady, cb);

        exports.MediaPlayer.instance = new MediaPlayer(blob);
    }
}

class MediaPlayer {
    constructor(blob) {
        this.wavesurfer = null;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.scriptProcessor = this.audioContext.createScriptProcessor(2048 /*bufferSize*/, 2 /*num inputs*/, 1 /*num outputs*/);
        const params = {
            audioContext: this.audioContext,
            container: '#waveform',
            waveColor: '#ffffff',
            progressColor: 'hsla(200, 100%, 30%, 0.5)',
            cursorColor: '#fff',
            // This parameter makes the waveform look like SoundCloud's player
            barWidth: 3,
            barGap: 2,
            barRadius: true,
            height: 180,
            barHeight: 1.5,
            scrollParent: true,
            responsive: true,
            closeAudioContext: true,
            forceDecode: true,
            plugins: [
                TimelinePlugin.create({
                    container: '#timeline',
                    primaryColor: "#fff",
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
                })
            ]
        };
        // initialise like this
        this.wavesurfer = WaveSurfer.create(params);

        this.wavesurfer.loadBlob(blob);
        this.wavesurfer.on("ready", () => {
            Dispatcher.dispatch(DispatchEvents.MediaReady);
        });
        this.wavesurfer.on('error', function (msg) {
            console.log(msg);
        });
    }

    setFilters(filters) {
        if (this.wavesurfer)
            this.wavesurfer.backend.setFilters(filters);
    }

    getScriptProcessor() {
        if (this.wavesurfer)
            return this.scriptProcessor;
    }

    getPostAnalyser() {
        if (this.wavesurfer)
            return this.wavesurfer.backend.postAnalyser;
    }

    getBackend() {
        if (this.wavesurfer)
            return this.wavesurfer.backend;
    }

    destroy() {
        if (this.wavesurfer) {
            this.wavesurfer.destroy();
        }

        Mousetrap.unbind("space", () => this.playPause);
    }

    empty() {
        if (this.wavesurfer)
            this.wavesurfer.empty();
    }

    seekAndCenter(progress) {
        if (this.wavesurfer)
            this.wavesurfer.seekAndCenter(progress);
    }

    getVolume() {
        if (this.wavesurfer)
            return this.wavesurfer.getVolume();
        return 0;
    }

    setVolume(val) {
        if (this.wavesurfer)
            return this.wavesurfer.setVolume(val);
    }

    isPlaying() {
        if (this.wavesurfer)
            return this.wavesurfer.isPlaying();
        return false;
    }
    getCurrent() {
        if (this.wavesurfer)
            return this.wavesurfer.getCurrentTime();
    }
    getDuration() {
        if (this.wavesurfer)
            return this.wavesurfer.getDuration();
    }
    onseek(cb) {
        if (this.wavesurfer) {
            this.wavesurfer.on("seek", (f) => cb(f));
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
            this.wavesurfer.on("audioprocess", (time) => cb(time));
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

exports.MediaPlayer = {
    instance: null,
}
exports.ImportMedia = {
    instance: new ImportMedia(),
    states: ImportMediaStates
}