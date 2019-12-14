import React from 'react';
import { IconName } from "@blueprintjs/core";

import * as YTDL from 'youtube-dl';
import * as PATH from 'path';
import * as FS from 'fs';
import * as OS from 'os';
import * as SPAWN from 'cross-spawn';

export const path: typeof PATH = window.require("path");
export const youtube: typeof YTDL = window.require("youtube-dl");
export const fs: typeof FS = window.require("fs");
export const os: typeof OS = window.require("os");
export const spawn: typeof SPAWN = window.require('cross-spawn');

/*declare global {
    interface Window {
    }
}*/

/* extended bp3 classes */
export class ExtClasses {
    public static TEXT_LARGER = "bp3-text-larger";
    public static TEXT_LARGER_2 = "bp3-text-larger-2";
    public static DARK_BACKGROUND_COLOR = "#30404E";
    public static BACKGROUND_COLOR = "#FFFFFF";
}

export enum MEDIA_STATE { STOPPED, PLAYING, PAUSED }
export enum VOLUME { MAX = 1, MIN = 0, DEFAULT = 0.5 }
export enum ZOOM { MAX = 40, MIN = 5, DEFAULT = 5 }
export enum TEMPO { MIN = 50, MAX = 120, DEFAULT = 100 }
export enum KEY { MIN = -12, MAX = 12, DEFAULT = 0 }

export interface DialogContent {
    content: React.ReactElement;
    icon: IconName;
    text: React.ReactElement | string;
    class: string;
    onClose(): void;
    canOutsideClickClose: boolean;
    canEscapeKeyClose: boolean;
}
/* dialog onchange handler typedef */
export type OnChangeHandler = React.FormEventHandler<HTMLElement> & React.ChangeEvent<HTMLInputElement>;


export const WasmTypes: { [key: string]: WebAssembly.Exports | null } = {
    cqt: null,
}

export default {};
