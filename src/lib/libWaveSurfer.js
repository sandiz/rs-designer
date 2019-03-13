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
        exports.MediaPlayer.instance = new MediaPlayer(blob);
        /* change state */
        Dispatcher.on(DispatchEvents.MediaReady, () => {
            stateChangeCb(ImportMediaStates.wavesurfing);
            completeCb(media);
        });
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
        if (this.wavesurfer)
            this.wavesurfer.empty();
    }
    destroy() {
        if (this.wavesurfer)
            this.wavesurfer.destroy();
    }
    playPause() {

    }
    stop() {

    }
    rewind() {

    }
    ffwd() {

    }
}

exports.MediaPlayer = {
    instance: null,
}
exports.ImportMedia = {
    instance: new ImportMedia(),
    states: ImportMediaStates
}