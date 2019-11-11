/* eslint-disable */
import React from 'react'

import * as FS from 'fs';   /* for types */
const fs: typeof FS = window.require("fs");

import * as MM from 'music-metadata'
const mm: typeof MM = window.require("music-metadata");

import * as FSE from 'fs-extra';
const fsextra: typeof FSE = window.require("fs-extra");

const albumArt = require('./album-art');

export const setStateAsync = (obj: React.Component, state: object) => {
    return new Promise((resolve) => {
        obj.setState(state, resolve)
    });
}

export const readFile = (filePath: string): Promise<Buffer> => new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
    });
});

export const writeFile = (filePath: string, data: any) => new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, (err) => {
        if (err) reject(err);
        else resolve();
    });
});

export const copyFile = (src: string, dest: string) => new Promise((resolve, reject) => {
    fs.copyFile(src, dest, (err) => {
        if (err) reject(err);
        else resolve();
    })
});

export const readTags = (file: string): Promise<MM.IAudioMetadata> => new Promise((resolve, reject) => {
    mm.parseFile(file, { native: true })
        .then((metadata) => {
            resolve(metadata);
        })
        .catch((err) => {
            reject(err);
        });
})

export const copyDir = (src: string, dest: string, options: FSE.CopyOptions) => new Promise((resolve, reject) => {
    fsextra.copy(src, dest, options, function (err) {
        if (err) {
            reject(err);
        } else {
            resolve();
        }
    });
})

export const assign = (obj: { [key: string]: any }, keyPath: string[], value: any) => {
    let lastKeyIndex = keyPath.length - 1;
    for (var i = 0; i < lastKeyIndex; ++i) {
        let key = keyPath[i];
        if (!(key in obj))
            obj[key] = {}
        obj = obj[key];
    }
    obj[keyPath[lastKeyIndex]] = value;
}

export const fetchCover = async (artist: string, albumortrack: string, usealbum = true): Promise<string> => {
    const a1 = artist.split("feat.")[0].trim();
    let url = "";
    const options = {
        size: 'large',
        album: '',
        track: '',
    }
    if (usealbum) options.album = albumortrack
    else options.track = albumortrack
    url = await albumArt(a1, options);

    if (url.toString().toLowerCase().includes("error:")) {
        //eslint-disable-next-line
        url = await albumArt(a1, { size: 'large' });
    }
    if (!url.toString().includes("http")) {
        url = "";
    }
    return url;
}

export const lerp = (start: number, end: number, amt: number): number => {
    return (1 - amt) * start + amt * end
}

export const toTitleCase = (toTransform: string) => {
    return toTransform.replace(/\b([a-z])/g, function (_, initial) {
        return initial.toUpperCase();
    });
}

export const getPositionFromTop = (element: HTMLElement) => {
    var xPosition = 0;
    var yPosition = 0;

    while (element) {
        xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
        yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
        element = element.offsetParent as HTMLElement;
    }

    return { x: xPosition, y: yPosition };
}