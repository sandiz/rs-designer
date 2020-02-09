export interface Regions {
    name: string;
    type: "SECTION" | "TONE";
    startTime: number;
    endTime: number;
}

export const DEFAULT_REGIONS: Regions[] = [
    {
        name: "Intro", type: "SECTION", startTime: 0, endTime: 0,
    },
    {
        name: "Verse", type: "SECTION", startTime: 0, endTime: 0,
    },
    {
        name: "Chorus", type: "SECTION", startTime: 0, endTime: 0,
    },
    {
        name: "Outro", type: "SECTION", startTime: 0, endTime: 0,
    },
]

export default {};
