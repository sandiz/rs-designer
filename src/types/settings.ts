import { ZOOM, CHART_ZOOM } from './base';

export enum COLOR_SCHEME { DEFAULT = "default" }
export class TabEditorSettings {
    zoomLevel?= CHART_ZOOM.DEFAULT;
    colorScheme?: COLOR_SCHEME = COLOR_SCHEME.DEFAULT;
    instrumentVolume?= 1;

    constructor(params: TabEditorSettings = {} as TabEditorSettings) {
        const {
            zoomLevel = CHART_ZOOM.DEFAULT,
            colorScheme = COLOR_SCHEME.DEFAULT,
            instrumentVolume = 1,
        } = params;

        this.zoomLevel = zoomLevel;
        this.colorScheme = colorScheme;
        this.instrumentVolume = instrumentVolume;
    }

    public ZL(num: number) {
        this.zoomLevel = num;
    }

    public getZL() { return this.zoomLevel ? this.zoomLevel : CHART_ZOOM.DEFAULT }
    public getCS() { return this.colorScheme ? this.colorScheme : COLOR_SCHEME.DEFAULT }
}

export class WaveformSettings {
    zoomLevel = ZOOM.DEFAULT;

    constructor(params: WaveformSettings = {} as WaveformSettings) {
        const {
            zoomLevel = CHART_ZOOM.DEFAULT,
        } = params;

        this.zoomLevel = zoomLevel;
    }
}

export class ProjectSettings {
    public tabEditor: TabEditorSettings = new TabEditorSettings();
    public waveform: WaveformSettings = new WaveformSettings();

    constructor(params: ProjectSettings = {} as ProjectSettings) {
        const {
            tabEditor = {} as TabEditorSettings,
            waveform = {} as WaveformSettings,
        } = params;

        this.tabEditor = new TabEditorSettings(tabEditor);
        this.waveform = new WaveformSettings(waveform);
    }
}

export default {};
