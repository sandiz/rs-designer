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

export const PRODUCT_NAME = "Bandish";
export const PRODUCT_NAME_LOWER = PRODUCT_NAME.toLowerCase();
export const PRODUCT_ADVANCED = "bandishIQ";
export const PRODUCT_ADVANCED_LOWER = PRODUCT_ADVANCED.toLowerCase();

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
const PX_PER_SEC = 40;
export const CHART_ZOOM = {
    MIN: PX_PER_SEC,
    MAX: PX_PER_SEC * 10,
    DEFAULT: PX_PER_SEC,
}

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

/* colors */

const DEFAULT_COLORS: string[] = [
    "linear-gradient(0deg, rgba(193,55,211,0.5) 12%, rgba(237,101,255,0.75) 100%)", //"#C137D3",
    "linear-gradient(0deg, rgba(91,228,42,0.5) 12%, rgba(134,255,91,0.75) 100%)", //"#5BE42A",
    "linear-gradient(0deg, rgba(228,149,52,0.5) 12%, rgba(255,184,96,0.75) 100%)", //"#E49534",
    "linear-gradient(0deg, rgba(48,147,195,0.5) 12%, rgba(98,204,255,0.75) 100%)", //"#3093C3",
    "linear-gradient(0deg, rgba(208,181,36,0.5) 12%, rgba(255,232,106,0.75) 100%)", //"#D0B524",
    "linear-gradient(0deg, rgba(213,22,41,0.5) 12%, rgba(255,117,131,0.75) 100%)", //"#DB4251",
]
const BOLD_COLORS: string[] = [
    "linear-gradient(0deg, rgba(127,60,141,1) 12%, rgba(238,157,255,1) 100%)", //"#7F3C8D",
    "linear-gradient(0deg, rgba(17,165,121,1) 12%, rgba(127,247,212,1) 100%)", //"#11A579",
    "linear-gradient(0deg, rgba(57,105,172,1) 12%, rgba(129,178,246,1) 100%)", //"#3969AC",
    "linear-gradient(0deg, rgba(242,183,1,1) 12%, rgba(254,227,144,1) 100%)", //"#F2B701",
    "linear-gradient(0deg, rgba(231,63,116,1) 12%, rgba(255,164,193,1) 100%)", //"#E73F74",
    "linear-gradient(0deg, rgba(165,170,153,1) 12%, rgba(224,230,212,1) 100%)", //"#80BA5A",
]
const SAFE_COLORS: string[] = [
    "linear-gradient(0deg, rgba(136,204,238,1) 12%, rgba(187,228,249,1) 100%)", //"#88CCEE",
    "linear-gradient(0deg, rgba(204,102,119,1) 12%, rgba(250,177,189,1) 100%)", //"#CC6677",
    "linear-gradient(0deg, rgba(221,204,119,1) 12%, rgba(247,232,155,1) 100%)", //"#DDCC77",
    "linear-gradient(0deg, rgba(17,119,51,1) 12%, rgba(54,203,104,1) 100%)", //"#117733",
    "linear-gradient(0deg, rgba(153,153,51,1) 12%, rgba(223,223,90,1) 100%)", //"#332288",
    "linear-gradient(0deg, rgba(170,68,153,1) 12%, rgba(233,105,212,1) 100%)", //"#AA4499",
]
const MONO_COLORS: string[] = [
    " linear-gradient(0deg, rgba(128,128,128,1) 12%, rgba(161,161,161,1) 78%)",
    " linear-gradient(0deg, rgba(128,128,128,1) 12%, rgba(161,161,161,1) 78%)",
    " linear-gradient(0deg, rgba(128,128,128,1) 12%, rgba(161,161,161,1) 78%)",
    " linear-gradient(0deg, rgba(128,128,128,1) 12%, rgba(161,161,161,1) 78%)",
    " linear-gradient(0deg, rgba(128,128,128,1) 12%, rgba(161,161,161,1) 78%)",
    " linear-gradient(0deg, rgba(128,128,128,1) 12%, rgba(161,161,161,1) 78%)",
]

export const STRING_COLORS = {
    default: DEFAULT_COLORS,
    bold: BOLD_COLORS,
    safe: SAFE_COLORS,
    monochrome: MONO_COLORS,
}
export default {};
