window.remote = require('electron').remote;

window.electronFS = window.remote.require('fs');
window.dirname = __dirname;
window.fetch = fetch;
window.http = require("http");
window.os = require("os");
window.Project = {
    ImportMedia: require("./lib/libWaveSurfer").ImportMedia,
    MediaPlayer: require("./lib/libWaveSurfer").MediaPlayer,
}


const isDev = require('electron-is-dev');

window.isDev = isDev;

window.path = null;
if (window.os.platform() === 'win32') {
    //eslint-disable-next-line
    window.path = require("path").win32;
}
else {
    //eslint-disable-next-line
    window.path = require("path");
}