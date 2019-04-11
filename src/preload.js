window.electronFS = require('fs');
window.mm = require('music-metadata');
window.os = require('os');
window.fsextra = require('fs-extra');

const isDev = require('electron-is-dev');
window.isDev = isDev;
window.path = null;
if (window.os.platform() === 'win32') {
    //eslint-disable-next-line
    window.path = require('path').win32;
}
else {
    //eslint-disable-next-line
    window.path = require('path');
}