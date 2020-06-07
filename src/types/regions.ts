import chroma from "chroma-js";

export interface Region {
    name: string;
    type: "SECTION" | "TONE";
    robjID: string | null;
    loop: boolean;
}

const REGION_COLORS = ["#66C5CC", "#F6CF71", "#F89C74", "#DCB0F2", "#87C55F", "#9EB9F3", "#FE88B1", "#C9DB74", "#8BE0A4", "#B497E7", "#D3B484", "#B3B3B3"];

interface WVRegion {
    play: (start: number | null) => void;
    playLoop: (start: number | null) => void;
    color: string;
    updateRender: () => void;
    id: string;
    element: HTMLElement;
}

export class RegionHandler {
    private wavesurfer: WaveSurfer;
    private regions: Region[];

    constructor(wv: WaveSurfer) {
        this.wavesurfer = wv;
        this.regions = [];
    }

    handleEvents = () => {
        this.wavesurfer.on('region-created', this.createRegion);
        this.wavesurfer.on('region-removed', this.removeRegion);
        this.wavesurfer.on('region-click', this.clickRegion);
        this.wavesurfer.on('region-dblclick', this.dblClickRegion);
        //this.wavesurfer.on('region-update-end', this.createRegion);
        /*
        this.wavesurfer.on('region-updated', this.createRegion);
        this.wavesurfer.on('region-update-end', this.createRegion);
        this.wavesurfer.on('region-play', this.createRegion);
        this.wavesurfer.on('region-in', this.createRegion);
        this.wavesurfer.on('region-out', this.createRegion);
        this.wavesurfer.on('region-mouseenter', this.createRegion);
        this.wavesurfer.on('region-mouseleave', this.createRegion);
        */
    }

    createRegion = (robj: WVRegion) => {
        const color = REGION_COLORS[this.regions.length % REGION_COLORS.length];
        robj.color = chroma(color).alpha(0.85).css();
        robj.updateRender();
        this.regions.push({
            name: "",
            robjID: robj.id,
            type: "SECTION",
            loop: false,
        });
    }

    removeRegion = (robj: WVRegion) => {
        const id = robj.id;
        this.regions = this.regions.filter(i => i.robjID !== id);
    }

    clickRegion = () => {
        //console.log(this.wavesurfer.regions);
        //robj.play(null);
    }

    dblClickRegion = (robj: WVRegion) => {
        this.loopRegion(robj);
    }

    stopLooping = () => {
        this.regions.forEach(i => {
            if (i.loop) {
                i.loop = false;
                this.removeLoopIcon(this.getWVRegion(i));
            }
        });
    }

    loopRegion = (robj: WVRegion) => {
        const id = robj.id;
        const idx = this.regions.findIndex(i => i.robjID === id);
        if (idx !== -1) {
            this.regions[idx].loop = true;
            robj.playLoop(null);
            this.attachLoopIcon(robj);
            return;
        }
        console.warn("loop region, index not found for region", robj);
    }

    public playLoopingRegion = (): void => {
        const idx = this.regions.findIndex(i => i.loop === true);
        if (idx !== -1) {
            const id = this.regions[idx].robjID;
            if (id) {
                this.wavesurfer.regions.list[id].play();
            }
        }
        else {
            this.wavesurfer.play();
        }
    }

    attachLoopIcon = (robj: WVRegion) => {
        const elem = robj.element.getElementsByTagName("region");
        if (elem.length > 0) {
            const region = elem[0];
            console.log(region);
        }
    }

    removeLoopIcon = (robj: WVRegion | null) => {
        if (robj) {
            const elem = robj.element.getElementsByTagName("region");
            if (elem.length > 0) {
                const region = elem[0];
                console.log(region);
            }
        }
    }

    getWVRegion = (r: Region): WVRegion | null => {
        const id = r.robjID;
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
}

export default {};
