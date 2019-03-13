/* eslint-disable */

const setStateAsync = (obj, state) => {
    return new Promise((resolve) => {
        obj.setState(state, resolve)
    });
}

const readFile = filePath => new Promise((resolve, reject) => {
    window.electronFS.readFile(filePath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
    });
});

const writeFile = (filePath, data) => new Promise((resolve, reject) => {
    window.electronFS.writeFile(filePath, data, (err) => {
        if (err) reject(err);
        else resolve();
    });
});

exports.setStateAsync = setStateAsync;
exports.readFile = readFile;
exports.writeFile = writeFile;
