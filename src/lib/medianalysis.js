
import ProjectService from '../services/project';

const tspawn = require('threads').spawn;

const spawn = window.require('cross-spawn');


const remote = window.require('electron').remote
const { isPackaged, getAppPath } = remote.app;

const getMABinary = () => {
    let binaryPath = ''
    if (!window.isDev && isPackaged) {
        binaryPath = window.path.join(window.path.dirname(getAppPath()), '..', './Resources', './bin')
    }
    else {
        binaryPath = './src/lib/musicanalysis/dist/';
    }
    return window.path.resolve(window.path.join(binaryPath, './analysis-cy'));
}

class Spawner {
    constructor() {
        this.analysisBinary = getMABinary(); //window.dirname + '/lib/musicanalysis/dist/analysis-cy'
        this.handle = null;
    }

    start = (width, height) => new Promise((resolve, reject) => {
        const info = ProjectService.getProjectInfo();
        const dir = ProjectService.getProjectDir();
        if (info && dir) {
            this.handle = spawn(`${this.analysisBinary}`, [info.media, dir, width, height], {
                detached: true,
                windowsHide: true,
                shell: true,
            });

            this.handle.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            this.handle.stderr.on('data', (data) => {
                console.log(`stderr: ${data}`);
            });

            this.handle.on('close', (code) => {
                console.log(`ma exited with code ${code}`);
                ProjectService.updateExternalFiles();
                resolve();
            });

            this.handle.on('error', (err) => {
                console.log('failed to start subprocess. ' + err);
                reject();
            });
        }
    });

    cancel = () => {
        this.handle.kill();
    }
}

export const NumpyLoaderThread = tspawn((input, done) => {
    const asciiDecode = (buf) => {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }
    const readUint16LE = (buf) => {
        const view = new DataView(buf);
        let val = view.getUint8(0);
        //eslint-disable-next-line
        val |= view.getUint8(1) << 8;
        return val;
    }
    const buf = input.buffer;
    // Check the magic number
    const magic = asciiDecode(buf.slice(0, 6));
    if (magic.slice(1, 6) !== 'NUMPY') {
        throw new Error('unknown file type');
    }

    //const version = new Uint8Array(buf.slice(6, 8));
    const headerLength = readUint16LE(buf.slice(8, 10));
    const headerStr = asciiDecode(buf.slice(10, 10 + headerLength));
    const offsetBytes = 10 + headerLength;
    //rest = buf.slice(10+headerLength);  XXX -- This makes a copy!!! https://www.khronos.org/registry/typedarray/specs/latest/#5

    // Hacky conversion of dict literal string to JS Object
    let info;
    //eslint-disable-next-line
    eval("info = " + headerStr.toLowerCase().replace('(', '[').replace('),', ']'));

    // Intepret the bytes according to the specified dtype
    let data;
    if (info.descr === "|u1") {
        data = new Uint8Array(buf, offsetBytes);
    } else if (info.descr === "|i1") {
        data = new Int8Array(buf, offsetBytes);
    } else if (info.descr === "<u2") {
        data = new Uint16Array(buf, offsetBytes);
    } else if (info.descr === "<i2") {
        data = new Int16Array(buf, offsetBytes);
    } else if (info.descr === "<u4") {
        data = new Uint32Array(buf, offsetBytes);
    } else if (info.descr === "<i4") {
        data = new Int32Array(buf, offsetBytes);
    } else if (info.descr === "<f4") {
        data = new Float32Array(buf, offsetBytes);
    } else if (info.descr === "<f8") {
        data = new Float64Array(buf, offsetBytes);
        const ndArray = [];
        //var newdata = [];
        for (let i = 0; i < data.length; i += info.shape[0]) {
            ndArray.push(data.slice(i, i + info.shape[0]));
        }
        data = ndArray;
    } else {
        console.log(info);
        throw new Error('unknown numeric dtype')
    }

    const nparray = {
        shape: info.shape,
        fortran_order: info.fortran_order,
        data,
    };
    done({ data: nparray });
});

export const MediaAnalysis = new Spawner();
