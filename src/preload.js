window.remote = require('electron').remote;

window.electronFS = window.remote.require('fs');
window.dirname = __dirname;
window.fetch = fetch;
window.http = require("http");
window.os = require("os");
window.project = {
    importMedia: require("./lib/libWaveSurfer").importMedia,
    importMediaStates: require("./lib/libWaveSurfer").importMediaStates
}


const isDev = require('electron-is-dev');

window.isDev = isDev;

window.PROD_YT_PORT = 8000;
window.DEV_YT_PORT = 9000;
window.YT_PORT = isDev ? window.DEV_YT_PORT : window.PROD_YT_PORT;
window.path = null;

if (window.os.platform() === 'win32') {
    //eslint-disable-next-line
    window.path = require("path").win32;
}
else {
    //eslint-disable-next-line
    window.path = require("path");
}