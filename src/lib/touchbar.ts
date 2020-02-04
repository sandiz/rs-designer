import ProjectService from "../services/project";
import { TABID } from "../components/MediaAdvanced/MediaAdvanced";
import { toTitleCase } from "./utils";
import { DispatcherService, DispatchEvents } from "../services/dispatcher";

const { ipcRenderer } = window.require("electron");

let pInfo: {
    artist: string;
    song: string;
    key: string;
    tempo: number;
} | null = null;

export const OpenMediaAdvanced = (event: Event, idx: number) => {
    DispatcherService.dispatch(DispatchEvents.OpenMediaAdvanced, idx);
}

export const UpdateTouchBar = async () => {
    if (pInfo == null) {
        const mm = await ProjectService.getProjectMetadata();
        if (mm) {
            //eslint-disable-next-line
            pInfo = {
                artist: mm.mediaInfo.artist.trim(),
                song: mm.mediaInfo.song.trim(),
                key: `${mm.key[0]} ${mm.key[1]}`,
                tempo: mm.tempo,
            }
        }
    }
    if (pInfo) {
        ipcRenderer.send("project-touch-bar", {
            buttonInfo: null,
            projectInfo: pInfo,
            tabs: Object.values(TABID).map(i => { return { label: toTitleCase(i) } }),
        });
    }

    ipcRenderer.off('open-media-advanced', OpenMediaAdvanced)
    ipcRenderer.on('open-media-advanced', OpenMediaAdvanced)
}

export const ResetTouchBar = () => {
    ipcRenderer.send("reset-touch-bar");
    ipcRenderer.off('open-media-advanced', OpenMediaAdvanced);
    pInfo = null;
}
