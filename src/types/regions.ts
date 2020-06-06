import chroma from "chroma-js";

export interface Region {
    name: string;
    type: "SECTION" | "TONE";
    robjID: string | null;
}

export const DEFAULT_REGIONS: Region[] = [
    {
        name: "Intro", type: "SECTION", robjID: null,
    },
    {
        name: "Verse", type: "SECTION", robjID: null,
    },
    {
        name: "Chorus", type: "SECTION", robjID: null,
    },
    {
        name: "Outro", type: "SECTION", robjID: null,
    },
]
const REGION_COLORS = ["#2965CC", "#29A634", "#D99E0B", "#D13913", "#8F398F", "#00B3A4", "#DB2C6F", "#9BBF30", "#96622D", "#7157D9"];

interface WVRegion {
    play: (start: number) => void;
    playLoop: (start: number) => void;
    color: string;
    updateRender: () => void;
    id: string;
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
        //this.wavesurfer.on('region-update-end', this.createRegion);
        /*
        this.wavesurfer.on('region-updated', this.createRegion);
        this.wavesurfer.on('region-update-end', this.createRegion);
        this.wavesurfer.on('region-removed', this.createRegion);
        this.wavesurfer.on('region-play', this.createRegion);
        this.wavesurfer.on('region-in', this.createRegion);
        this.wavesurfer.on('region-out', this.createRegion);
        this.wavesurfer.on('region-mouseenter', this.createRegion);
        this.wavesurfer.on('region-mouseleave', this.createRegion);
        this.wavesurfer.on('region-click', this.createRegion);
        this.wavesurfer.on('region-dblclick', this.createRegion);
        */
    }

    createRegion = (robj: WVRegion) => {
        //console.log(robj);
        const color = REGION_COLORS[this.regions.length % REGION_COLORS.length];
        robj.color = chroma(color).alpha(0.85).css();
        robj.updateRender();
        this.regions.push({
            name: "",
            robjID: robj.id,
            type: "SECTION",
        });
    }

    destroy() {

    }
}

export default {};
