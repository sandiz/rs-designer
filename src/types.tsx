export interface MediaInfo {
    song: string;
    artist: string;
    album: string;
    cover: string;
}

export interface ProjectInfo {
    file: string;
}

/* extended bp3 classes */
export const ExtClasses: { [key: string]: string } = {
    TEXT_LARGER: "bp3-text-larger",
    TEXT_LARGER_2: "bp3-text-larger-2",
}

/* Hotkeys */
export interface Hotkey {
    info: string;
    hotkey: string;
}
export const HotkeyInfo: { [key: string]: Hotkey } = {
    SHOW_ALL_HOTKEYS: { info: "Show this dialog", hotkey: "shift+?" },
    PLAY_PAUSE: { info: "Play/Pause", hotkey: "space" },
    FWD: { info: "Seek Forward", hotkey: "right" },
    REWIND: { info: "Seek Barwards", hotkey: "left" },
    VOL_UP: { info: "Volume Up", hotkey: "up" },
    VOL_DOWN: { info: "Volume Down", hotkey: "down" },
}

export default {};
