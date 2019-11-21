/* eslint-disable */
import React from 'react'

import * as FS from 'fs';   /* for types */
const fs: typeof FS = window.require("fs");

import * as MM from 'music-metadata'
const mm: typeof MM = window.require("music-metadata");

import * as FSE from 'fs-extra';
import MediaPlayerService from '../services/mediaplayer';
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

export const removeDir = (src: string) => new Promise((resolve, reject) => {
    fsextra.remove(src, err => {
        if (err) reject(err);
        resolve();
    })
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
        url = await albumArt(a1, { size: 'large' });
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

export const sec2time = (timeInSeconds: number, withMS = false) => {
    const pad = function (num: number, size: number) { return ('000' + num).slice(size * -1); };
    const time: number = parseFloat(timeInSeconds.toString());
    const minutes = Math.floor(time / 60) % 60;
    const seconds = Math.floor(time - minutes * 60);
    const milliseconds = parseInt(time.toString().slice(-3));

    if (withMS) return pad(minutes, 2) + ':' + pad(seconds, 2) + '.' + pad(milliseconds, 3);
    else return pad(minutes, 2) + ':' + pad(seconds, 2);
}

export const UUID = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const fpsize = () => {
    // shim layer with setTimeout fallback
    var fpsElement = document.getElementById("fps");
    var memElement = document.getElementById("memory");
    var latencyElement = document.getElementById("latency");

    var then = Date.now() / 1000;  // get time in seconds
    var render = function () {
        var now = Date.now() / 1000;  // get time in seconds

        // compute time since last frame
        var elapsedTime = now - then;
        then = now;

        // compute fps
        var fps = 1 / elapsedTime;
        const perf = (window.performance as any);
        if (fpsElement && memElement) {
            const used = Math.round((perf.memory.usedJSHeapSize / (1024 * 1024)))
            const total = Math.round((perf.memory.totalJSHeapSize / (1024 * 1024)))
            fpsElement.childNodes[0].nodeValue = fps.toFixed(2) + " fps";
            memElement.childNodes[0].nodeValue = `${used} / ${total} mb`
        }
        if (latencyElement) {
            if (MediaPlayerService.audioContext) {
                const { baseLatency } = MediaPlayerService.audioContext;
                let bl = baseLatency ? Math.round((baseLatency * 1000)) : "-";
                latencyElement.childNodes[0].nodeValue = `${bl} ms`
            }
            else {
                latencyElement.childNodes[0].nodeValue = `-  ms`
            }
        }

        requestAnimationFrame(render);
    };
    render();
}

export const base64ImageData = (data: string) => {
    if (data === '') return data;
    return 'data:image/jpeg;base64,' + data;
}

export const clamp = (min: number, max: number, val: number) => Math.min(Math.max(min, val), max);

export function stopEventPropagation(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    if (e.currentTarget)
        (e.currentTarget as HTMLElement).blur()
}