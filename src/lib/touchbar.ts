import ProjectService from "../services/project";

const { ipcRenderer } = window.require("electron");

export const UpdateTouchBar = async () => {
    const mm = await ProjectService.getProjectMetadata();

    if (mm) {
        const info = {
            artist: mm.mediaInfo.artist.trim(),
            song: mm.mediaInfo.song.trim(),
            key: `${mm.key[0]} ${mm.key[1]}`,
            tempo: mm.tempo,
        }

        ipcRenderer.send("project-touch-bar", {
            buttonInfo: null,
            projectInfo: info,
        });
    }
}

export const ResetTouchBar = () => {
    ipcRenderer.send("reset-touch-bar");
}
