/* EQ Tag */
export type ExtendedBiquadFilterType = BiquadFilterType | "edit";

export interface EQTag {
    id: string;
    freq: number;
    gain: number;
    q: number;
    type: ExtendedBiquadFilterType;
    color: string;
}

export interface EQFilter {
    tag: EQTag;
    filter: BiquadFilterNode;
}

export interface EQPreset {
    tags: EQTag[];
    name: string;
    default?: boolean;
}

export enum BiQuadFilterNames {
    "lowpass" = "LP",
    "highpass" = "HP",
    "highshelf" = "HS",
    "lowshelf" = "LS",
    "bandpass" = "BP",
    "peaking" = "PK",
    "notch" = "NT",
    "allpass" = "AP",
    "edit" = "edit",
}
