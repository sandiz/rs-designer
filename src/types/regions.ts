import { IconNames } from '@blueprintjs/icons'
import { Intent, Colors } from '@blueprintjs/core';
import chroma from "chroma-js";
import ProjectService from "../services/project";
import { generateRawSVG } from '../svgIcons';

export interface Region {
    name: string;
    type: "SECTION" | "TONE";
    id: string;
    loop: boolean;
    start: number;
    end: number;
    color: string;
}

const REGION_COLORS = ["#66C5CC", "#F6CF71", "#F89C74", "#DCB0F2", "#87C55F", "#9EB9F3", "#FE88B1", "#C9DB74", "#8BE0A4", "#B497E7", "#D3B484", "#B3B3B3"];

interface WVRegion {
    play: (start: number | null) => void;
    playLoop: (start: number | null) => void;
    color: string;
    updateRender: () => void;
    id: string;
    element: HTMLElement;
    start: number;
    end: number;
    loop: boolean;
    remove: () => void;
}

export class RegionHandler {
    private wavesurfer: WaveSurfer;
    private regions: Region[];

    constructor(wv: WaveSurfer) {
        this.wavesurfer = wv;
        this.regions = [];
    }

    loadRegions = (): Region[] => {
        const info = ProjectService.getProjectInfo();
        if (info) {
            return info.regions;
        }
        return [];
    }

    handleEvents = () => {
        this.wavesurfer.on('region-created', this.regionCreated);
        this.wavesurfer.on('region-removed', this.regionRemoved);
        this.wavesurfer.on('region-click', this.regionClicked);
        this.wavesurfer.on('region-dblclick', this.regionDblClicked);
        this.wavesurfer.on('region-update-end', this.regionUpdated);
        this.wavesurfer.on('region-updated', this.regionUpdated);
        this.wavesurfer.on('region-in', this.regionPlay);
        /*
        this.wavesurfer.on('region-play', this.createRegion);
        this.wavesurfer.on('region-in', this.createRegion);
        this.wavesurfer.on('region-out', this.createRegion);
        this.wavesurfer.on('region-mouseenter', this.createRegion);
        this.wavesurfer.on('region-mouseleave', this.createRegion);
        */
    }

    regionPlay = () => {
        console.log("region-play");
    }

    getRegionName = (id: string): string => {
        const savedr = this.loadRegions();
        for (let i = 0; i < savedr.length; i += 1) {
            if (savedr[i].id === id) return savedr[i].name;
        }
        return "-- new region --";
    }

    regionCreated = (robj: WVRegion) => {
        const color = REGION_COLORS[this.regions.length % REGION_COLORS.length];
        robj.color = chroma(color).alpha(0.85).css();
        robj.updateRender();
        const name = this.getRegionName(robj.id);
        this.regions.push({
            name,
            id: robj.id,
            type: "SECTION",
            loop: robj.loop,
            start: robj.start,
            end: robj.end,
            color: robj.color,
        });
        if (robj.loop) this.attachLoopIcon(robj);
        this.attachRegionNames(robj, name);
    }

    regionUpdated = (robj: WVRegion) => {
        const idx = this.regions.findIndex(i => i.id === robj.id);
        if (idx !== -1) {
            const old = this.regions[idx];
            this.regions[idx] = {
                name: old.name,
                color: robj.color,
                start: robj.start,
                end: robj.end,
                id: robj.id,
                loop: old.loop,
                type: old.type,
            }
            this.attachRegionNames(robj, old.name);
        }
    }

    copyRegion = (i: number, reg: Region) => {
        //copy name
        this.regions[i].name = reg.name;

        const id = this.regions[i].id;
        const robj: WVRegion = this.wavesurfer.regions.list[id];
        //copy start
        this.regions[i].start = reg.start;
        robj.start = reg.start;
        //copy end
        this.regions[i].end = reg.end;
        robj.end = reg.end;
        //fire update
        robj.updateRender();
        this.wavesurfer.fireEvent("region-updated", robj);
    }

    regionRemoved = (robj: WVRegion) => {
        const id = robj.id;
        this.regions = this.regions.filter(i => i.id !== id);
    }

    deleteRegion = (id: string) => {
        const robj = this.wavesurfer.regions.list[id];
        robj.remove();
    }

    regionClicked = () => {
        //console.log(this.wavesurfer.regions);
        //robj.play(null);
    }

    regionDblClicked = (robj: WVRegion) => {
        this.loopRegion(robj);
    }

    stopLooping = () => {
        this.wavesurfer.stop();
        this.regions.forEach(i => {
            if (i.loop) {
                i.loop = false;
                this.wavesurfer.regions.list[i.id].loop = false;
                this.removeLoopIcon(this.getWVRegion(i));
            }
        });
    }

    loopRegionByIndex = (i: number) => {
        if (i <= this.regions.length - 1) {
            const id = this.regions[i].id;
            const robj = this.wavesurfer.regions.list[id];
            this.loopRegion(robj);
        }
    }

    loopRegion = (robj: WVRegion) => {
        const id = robj.id;
        const idx = this.regions.findIndex(i => i.id === id);
        if (idx !== -1) {
            this.stopLooping();
            this.regions[idx].loop = true;
            robj.loop = true;
            robj.play(robj.start);
            this.attachLoopIcon(robj);
            this.wavesurfer.fireEvent("region-updated", robj);
            return;
        }
        console.warn("loop region, index not found for region", robj);
    }

    public playLoopingRegion = (): void => {
        const idx = this.regions.findIndex(i => i.loop === true);
        if (idx !== -1) {
            const id = this.regions[idx].id;
            if (id) {
                this.wavesurfer.regions.list[id].play();
            }
        }
        else {
            this.wavesurfer.play();
        }
    }

    attachRegionNames = (robj: WVRegion, name: string) => {
        const elem = robj.element;
        const divs = elem.getElementsByTagName("div");
        let div: HTMLElement | null = null;
        for (let i = 0; i < divs.length; i += 1) {
            if (divs[i].id === "region-name") div = divs[i];
        }
        if (div == null) {
            div = document.createElement("div");
            div.id = "region-name";
            div.className = "waveform-region-name";
            elem.appendChild(div);
        }
        div.style.color = `${Colors.DARK_GRAY5}`;
        div.innerHTML = `
        ${name}
        `
    }

    attachLoopIcon = (robj: WVRegion) => {
        const elem = robj.element;
        const div = document.createElement("div");
        div.id = "loop-svg";
        div.innerHTML = `
           ${
            generateRawSVG({
                ic: IconNames.REFRESH,
                size: 16,
                intent: Intent.NONE,
                className: "",
                //color: MediaPlayerService.isDar"white",
            })
            }
        `;
        div.className = "waveform-region";
        elem.appendChild(div);
    }

    removeLoopIcon = (robj: WVRegion | null) => {
        if (robj) {
            const elem = robj.element;
            const divs = elem.getElementsByTagName("div");
            for (let i = 0; i < divs.length; i += 1) {
                if (divs[i].id === "loop-svg") {
                    elem.removeChild(divs[i]);
                }
            }
        }
    }

    getWVRegion = (r: Region): WVRegion | null => {
        const id = r.id;
        if (id) {
            return this.wavesurfer.regions.list[id];
        }
        return null;
    }

    public loopActive = (): boolean => {
        return this.regions.findIndex(i => i.loop === true) !== -1;
    }

    public destroy() {
        this.regions = [];
    }

    public getRegions = () => [...this.regions.map(v => { return { ...v } })];
}

export default {};
