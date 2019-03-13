const mm = require('music-metadata');

const importMediaStates = {
    importing: 1,
    readingTags: 2,
    decodingAudio: 3,
}

const readTags = file => new Promise((resolve, reject) => {
    mm.parseFile(file, { native: true })
        .then(metadata => {
            resolve(metadata);
        })
        .catch((err) => {
            reject(err);
        });
});

const importMedia = async (files,
    stateChangeCb, completeCb) => {
    const file = files[0];
    console.log("importMedia: " + file);
    //const data = await readFile(file);
    stateChangeCb(importMediaStates.importing);

    const media = {}
    media.tags = await readTags(file)

    stateChangeCb(importMediaStates.readingTags);

    stateChangeCb(importMediaStates.decodingAudio);
    completeCb(media);
}

exports.importMedia = importMedia;
exports.importMediaStates = importMediaStates
