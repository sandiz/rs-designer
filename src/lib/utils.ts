import React from 'react'
import * as FS from 'fs';   /* for types */
import * as MM from 'music-metadata'
import * as FSE from 'fs-extra';
import * as _ from 'lodash';

import MediaPlayerService from '../services/mediaplayer';

const { ipcRenderer } = window.require("electron");
const fs: typeof FS = window.require("fs");
const mm: typeof MM = window.require("music-metadata");
const fsextra: typeof FSE = window.require("fs-extra");
const albumArt = require('./album-art');


export const setStateAsync = (obj: React.Component, state: object) => {
    return new Promise((resolve) => {
        obj.setState(state, resolve)
    });
}

export const exists = (filepath: string): Promise<boolean> => new Promise((resolve) => {
    fs.exists(filepath, (e1) => resolve(e1));
})

export const readFile = (filePath: string): Promise<Buffer> => new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
    });
});

export const writeFile = (filePath: string, data: Buffer | string) => new Promise((resolve, reject) => {
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
    mm.parseFile(file)
        .then((metadata) => {
            resolve(metadata);
        })
        .catch((err) => {
            reject(err);
        });
})

export const copyDir = (src: string, dest: string, options: FSE.CopyOptions) => new Promise((resolve, reject) => {
    fsextra.copy(src, dest, options, (err) => {
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

export const readDir = (dir: string): Promise<string[]> => new Promise((resolve, reject) => {
    fs.readdir(dir, null, (err, files) => {
        if (err) reject(err);
        resolve(files);
    });
})

// eslint-disable-next-line 
export const assign = (obj: { [key: string]: any }, keyPath: string[], value: any) => {
    const lastKeyIndex = keyPath.length - 1;
    for (let i = 0; i < lastKeyIndex; i += 1) {
        const key = keyPath[i];
        if (!(key in obj)) obj[key] = {}
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
    return toTransform.replace(/\b([a-z])/g, (prev, initial) => {
        return initial.toUpperCase();
    });
}

export const getPositionFromTop = (element: HTMLElement) => {
    let xPosition = 0;
    let yPosition = 0;

    while (element) {
        xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
        yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
        element = element.offsetParent as HTMLElement;
    }

    return { x: xPosition, y: yPosition };
}

export const sec2time = (timeInSeconds: number, withMS = false) => {
    const pad = (num: number, size: number) => { return ('000' + num).slice(size * -1); };
    const time: number = parseFloat(timeInSeconds.toString());
    const minutes = Math.floor(time / 60) % 60;
    const seconds = Math.floor(time - minutes * 60);
    const milliseconds = parseInt(time.toString().slice(-3), 10);

    if (withMS) return pad(minutes, 2) + ':' + pad(seconds, 2) + '.' + pad(milliseconds, 3);
    else return pad(minutes, 2) + ':' + pad(seconds, 2);
}

export const sec2timeObj = (timeInSeconds: number) => {
    const pad = (num: number, size: number) => { return ('000' + num).slice(size * -1); };
    const time: number = parseFloat(timeInSeconds.toString());
    const minutes = Math.floor(time / 60) % 60;
    const seconds = Math.floor(time - minutes * 60);
    const milliseconds = parseInt((time % 1).toFixed(3).slice(-3), 10);

    return {
        mins: pad(minutes, 2),
        seconds: pad(seconds, 2),
        ms: pad(milliseconds, 3),
    }
}

export const UUID = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const fpsize = () => {
    // shim layer with setTimeout fallback
    const fpsElement = document.getElementById("fps");
    const memElement = document.getElementById("memory");
    const latencyElement = document.getElementById("latency");

    const filterStrength = 20;
    let frameTime = 0;
    let lastLoop = Date.now();
    let thisLoop: number;

    const render = () => {
        thisLoop = Date.now();
        const thisFrameTime = thisLoop - lastLoop;
        frameTime += (thisFrameTime - frameTime) / filterStrength;
        lastLoop = thisLoop;

        // compute fps
        const fps = (1000 / frameTime).toFixed(0);
        // eslint-disable-next-line
        const perf = (window.performance as any);
        if (fpsElement && memElement) {
            const used = Math.round((perf.memory.usedJSHeapSize / (1024 * 1024)))
            //const total = Math.round((perf.memory.totalJSHeapSize / (1024 * 1024)))
            fpsElement.childNodes[0].nodeValue = fps;
            memElement.childNodes[0].nodeValue = `${used}m`
        }
        if (latencyElement) {
            if (MediaPlayerService.audioContext) {
                const { baseLatency } = MediaPlayerService.audioContext;
                const bl = baseLatency ? Math.round((baseLatency * 1000)) : "-";
                latencyElement.childNodes[0].nodeValue = `${bl}ms`
            }
            else {
                latencyElement.childNodes[0].nodeValue = `-`
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
    if (e.currentTarget) (e.currentTarget as HTMLElement).blur()
}

export function hashCode(str: string): string {
    let hash = 0;
    let i;
    let chr;
    if (str.length === 0) return hash.toString();
    for (i = 0; i < str.length; i += 1) {
        chr = str.charCodeAt(i);
        //eslint-disable-next-line no-bitwise
        hash = ((hash << 5) - hash) + chr;
        //eslint-disable-next-line no-bitwise
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
}

export function jsonStringifyCompare(a: object, b: object) {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function clone(obj: object, method: "json" | "lodash" = "json") {
    if (method === "json") {
        return JSON.parse(JSON.stringify(obj)); // possible data loss on some objects
    }
    else if (method === "lodash") {
        return _.cloneDeep(obj);
    }
    return obj;
}

export function collectGC() {
    global.gc();
    ipcRenderer.send("collect-gc");
}

export async function wait(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}
