/* eslint-disable */

export const setStateAsync = (obj, state) => {
    return new Promise((resolve) => {
        obj.setState(state, resolve)
    });
}

export const readFile = filePath => new Promise((resolve, reject) => {
    window.electronFS.readFile(filePath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
    });
});

export const writeFile = (filePath, data) => new Promise((resolve, reject) => {
    window.electronFS.writeFile(filePath, data, (err) => {
        if (err) reject(err);
        else resolve();
    });
});

export const copyFile = (src, dest) => new Promise((resolve, reject) => {
    window.electronFS.copyFile(src, dest, (err) => {
        if (err) reject(err);
        else resolve();
    })
});

export const readTags = file => new Promise((resolve, reject) => {
    window.mm.parseFile(file, { native: true })
        .then((metadata) => {
            resolve(metadata);
        })
        .catch((err) => {
            reject(err);
        });
})

export const copyDir = (src, dest, options) => new Promise((resolve, reject) => {
    window.fsextra.copy(src, dest, options, function (err) {
        if (err) {
            reject(err);
        } else {
            resolve();
        }
    });
})
