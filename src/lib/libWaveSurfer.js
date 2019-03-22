const mm = require('music-metadata');
const { Dispatcher, DispatchEvents } = require("./libDispatcher");
const WaveSurfer = require("./media/wavesurfer/dist/wavesurfer");
const TimelinePlugin = require('./media/wavesurfer/dist/plugin/wavesurfer.timeline');
const MinimapPlugin = require('./media/wavesurfer/dist/plugin/wavesurfer.minimap');
const SpectrogramPlugin = require('./media/wavesurfer/dist/plugin/wavesurfer.spectrogram');
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
            //progressColor: 'hsla(200, 100%, 30%, 0.5)',
            //waveColor: 'grey',
            progressColor: 'black',
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
                }),
                SpectrogramPlugin.create({
                    container: "#spectrogram",
                    labels: true,
                    deferInit: false,
                    pixelRatio: 1,
                    fftSamples: 1024,
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
    }

    empty() {
        if (this.wavesurfer) {
            this.wavesurfer.empty();
        }
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

    getPlaybackRate() {
        if (this.wavesurfer)
            return this.wavesurfer.getPlaybackRate();
        return 1;
    }

    setPlaybackRate(val) {
        if (this.wavesurfer) {
            this.wavesurfer.setPlaybackRate(val);
        }
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


function formatTimeCallback(seconds, pxPerSec) {
    seconds = Number(seconds);
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    // fill up seconds with zeroes
    let secondsStr = Math.round(seconds).toString();
    if (pxPerSec >= 25 * 10) {
        secondsStr = seconds.toFixed(2);
    } else if (pxPerSec >= 25 * 1) {
        secondsStr = seconds;
    }

    if (minutes > 0) {
        if (seconds < 10) {
            secondsStr = '0' + secondsStr;
        }
        return `${minutes}:${secondsStr}`;
    }
    return secondsStr;
}
function timeInterval(pxPerSec) {
    let retval = 1;
    if (pxPerSec >= 25 * 100) {
        retval = 0.01;
    } else if (pxPerSec >= 25 * 40) {
        retval = 0.025;
    } else if (pxPerSec >= 25 * 10) {
        retval = 0.1;
    } else if (pxPerSec >= 25 * 4) {
        retval = 0.25;
    } else if (pxPerSec >= 25) {
        retval = 1;
    } else if (pxPerSec * 5 >= 25) {
        retval = 5;
    } else if (pxPerSec * 15 >= 25) {
        retval = 15;
    } else {
        retval = Math.ceil(0.5 / pxPerSec) * 60;
    }
    return retval;
}
function primaryLabelInterval(pxPerSec) {
    let retval = 1;
    if (pxPerSec >= 25 * 100) {
        retval = 10;
    } else if (pxPerSec >= 25 * 40) {
        retval = 4;
    } else if (pxPerSec >= 25 * 10) {
        retval = 10;
    } else if (pxPerSec >= 25 * 4) {
        retval = 4;
    } else if (pxPerSec >= 25) {
        retval = 1;
    } else if (pxPerSec * 5 >= 25) {
        retval = 5;
    } else if (pxPerSec * 15 >= 25) {
        retval = 15;
    } else {
        retval = Math.ceil(0.5 / pxPerSec) * 60;
    }
    return retval;
}
function secondaryLabelInterval(pxPerSec) {
    // draw one every 10s as an example
    return Math.floor(10 / timeInterval(pxPerSec));
}

exports.MediaPlayer = {
    instance: null,
}
exports.ImportMedia = {
    instance: new ImportMedia(),
    states: ImportMediaStates
}