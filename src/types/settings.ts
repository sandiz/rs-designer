import { ZOOM_DEFAULT } from '../components/TabEditor/TabEditor';
import { ZOOM } from './base';

export enum COLOR_SCHEME { DEFAULT = "default" }
export class TabEditorSettings {
    zoomLevel = ZOOM_DEFAULT;
    colorScheme: COLOR_SCHEME = COLOR_SCHEME.DEFAULT;
    instrumentVolume = 1;
}

export class WaveformSettings {
    zoomLevel = ZOOM.DEFAULT;
}

export class ProjectSettings {
    public tabEditor: TabEditorSettings;
    public waveform: WaveformSettings;

    constructor(t: TabEditorSettings | null, w: TabEditorSettings | null) {
        this.tabEditor = t || new TabEditorSettings();
        this.waveform = w || new WaveformSettings();
    }
}

export default {};
