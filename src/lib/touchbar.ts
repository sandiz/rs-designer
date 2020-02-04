import ProjectService from "../services/project";
import { TABID } from "../components/MediaAdvanced/MediaAdvanced";
import { toTitleCase } from "./utils";
import { DispatcherService, DispatchEvents } from "../services/dispatcher";
import { KEY, TEMPO } from "../types/base";
import MediaPlayerService from "../services/mediaplayer";
import { SongKey } from "../types/musictheory";
import { getTransposedKey } from "./music-utils";

const { ipcRenderer } = window.require("electron");

let pInfo: {
    artist: string;
    song: string;
    key: SongKey;
    tempo: number;
} | null = null;

const openMediaAdvanced = (event: Event, idx: number) => {
    DispatcherService.dispatch(DispatchEvents.OpenMediaAdvanced, idx);
}

const changeTempo = (event: Event, newTempoDiff: number) => {
    const newTempo = (MediaPlayerService.getPlaybackRate() * 100) + newTempoDiff;
    console.log(newTempo);
    MediaPlayerService.changeTempo(newTempo);
}

const changeKey = (event: Event, newKeyDiff: number) => {
    MediaPlayerService.changePitchSemitones(MediaPlayerService.getPitchSemitones() + newKeyDiff);
}

export const UpdateTouchBar = async () => {
    if (pInfo == null) {
        const mm = await ProjectService.getProjectMetadata();
        if (mm) {
            //eslint-disable-next-line
            pInfo = {
                artist: mm.mediaInfo.artist.trim(),
                song: mm.mediaInfo.song.trim(),
                key: mm.key,
                tempo: mm.tempo,
            }
        }
    }
    if (pInfo) {
        const st = MediaPlayerService.getPitchSemitones();
        const tKey = getTransposedKey(pInfo.key[0], st);
        ipcRenderer.send("project-touch-bar", {
            projectInfo: pInfo,
            tabs: Object.values(TABID).map(i => { return { label: toTitleCase(i) } }),
            key: {
                diff: st, min: KEY.MIN, max: KEY.MAX, displayName: `${tKey} ${pInfo.key[1]}`,
            },
            tempo: { diff: MediaPlayerService.getPlaybackRate(), min: TEMPO.MIN, max: TEMPO.MAX },
        });
    }
}

export const ResetTouchBar = () => {
    ipcRenderer.send("reset-touch-bar");
    ipcRenderer.off('open-media-advanced', openMediaAdvanced);
    ipcRenderer.off('change-tempo', changeTempo);
    ipcRenderer.off('change-key', changeKey);
    pInfo = null;
}
export const InitTouchBar = () => {
    ipcRenderer.on('open-media-advanced', openMediaAdvanced);
    ipcRenderer.on('change-tempo', changeTempo);
    ipcRenderer.on('change-key', changeKey);
    DispatcherService.on(DispatchEvents.PitchChange, UpdateTouchBar);
    DispatcherService.on(DispatchEvents.TempoChange, UpdateTouchBar);
}

export const CloseTouchBar = () => {
    ResetTouchBar();
    DispatcherService.off(DispatchEvents.PitchChange, UpdateTouchBar);
    DispatcherService.off(DispatchEvents.TempoChange, UpdateTouchBar);
}
