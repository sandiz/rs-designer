const mm = require('music-metadata');
const { Dispatcher, DispatchEvents } = require("./libDispatcher");
const WaveSurfer = require("./media/wavesurfer/dist/wavesurfer");
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
        const params = {
            container: '#waveform',
            waveColor: '#D2EDD4',
            progressColor: 'hsla(200, 100%, 30%, 0.5)',
            cursorColor: '#fff',
            // This parameter makes the waveform look like SoundCloud's player
            barWidth: 3,
            barGap: 2,
            barRadius: true,
            scrollParent: true,
        };
        // initialise like this
        this.wavesurfer = WaveSurfer.create(params);

        this.wavesurfer.loadBlob(blob);
        this.wavesurfer.on("ready", () => {
            Dispatcher.dispatch(DispatchEvents.MediaReady);
        });
    }

    empty() {
        console.log("empty");
        if (this.wavesurfer)
            this.wavesurfer.empty();
    }

    destroy() {
        console.log("destroy");
        if (this.wavesurfer)
            this.wavesurfer.destroy();
    }

    isPlaying() {
        if (this.wavesurfer)
            return this.wavesurfer.isPlaying();
        return false;
    }
    getDuration() {
        if (this.wavesurfer)
            return this.wavesurfer.getDuration();
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
        console.log("playpause");
        if (this.wavesurfer) {
            this.wavesurfer.playPause();
        }
    }
    stop() {
        console.log("stop");
        if (this.wavesurfer) {
            this.wavesurfer.stop();
        }
    }
    rewind() {
        console.log("rewind");
        if (this.wavesurfer) {
            this.wavesurfer.skipBackward(5);
        }
    }
    ffwd() {
        console.log("ffwd");
        if (this.wavesurfer) {
            this.wavesurfer.skipForward(5);
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