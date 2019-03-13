const mm = require('music-metadata');
const { Dispatcher, DispatchEvents } = require("./libDispatcher");
const WaveSurfer = require("./media/wavesurfer/dist/wavesurfer");
const readFile = require("./utils").readFile;
const audioDecode = require('audio-decode');


const readTags = file => new Promise((resolve, reject) => {
    mm.parseFile(file, { native: true })
        .then(metadata => {
            resolve(metadata);
        })
        .catch((err) => {
            reject(err);
        });
});
const decode = buffer => new Promise((resolve, reject) => {
    audioDecode(buffer).then(audioBuffer => { resolve(audioBuffer) }, err => { console.log(err); reject(err); });
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
            waveColor: 'violet',
            progressColor: 'purple',
            scrollParent: true,
        };
        // initialise like this
        this.wavesurfer = WaveSurfer.create(params);

        this.wavesurfer.loadBlob(blob);
        this.wavesurfer.on("ready", () => {
            Dispatcher.dispatch(DispatchEvents.MediaReady);
        });
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