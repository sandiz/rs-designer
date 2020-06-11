import React, { Component } from 'react';
import { KeyCombo } from '@blueprintjs/core';
import { DispatchEvents, DispatcherService, DispatchData } from '../services/dispatcher';
import { PRODUCT_ADVANCED } from './base';

const { platform } = window.require('os');
const isMac = platform() === "darwin";

/* Hotkeys */
export interface Hotkey {
    info: string;
    hotkey: string | string[];
    group?: string;
    idx?: number;
}
/* TODO: data drive this */
/* eslint-disable */
export const HotkeyInfo: { [key: string]: Hotkey } = {
    /* Global */
    SHOW_ALL_HOTKEYS: { info: "Show this dialog", hotkey: "shift+?" },
    PLAY_PAUSE: { info: "Play/Pause", hotkey: ["space", "enter"] },
    FWD: { info: "Seek Forward", hotkey: "right" },
    REWIND: { info: "Seek Barwards", hotkey: "left" },
    STOP: { info: "Stop", hotkey: "s" },
    VOL_UP: { info: "Volume Up", hotkey: "up" },
    VOL_DOWN: { info: "Volume Down", hotkey: "down" },
    OPEN_PROJECT: { info: "Open Project", hotkey: ["command+o", "ctrl+o"], group: "project", idx: 1, },
    SAVE_PROJECT: { info: "Save Project", hotkey: ["command+s", "ctrl+s"], group: "project", idx: 2, },
    OPEN_LAST_PROJECT: { info: "Open Last Project", hotkey: ["command+1", "ctrl+1"], group: "project", idx: 3, },
    CLOSE_PROJECT: { info: "Close Project", hotkey: ["command+w", "ctrl+w"], group: "project", idx: 4, },
    IMPORT_MEDIA: { info: "Import Media", hotkey: ["command+m", "ctrl+m"], group: "project", idx: 5, },
    IMPORT_URL: { info: "Import URL", hotkey: ["command+u", "ctrl+u"], group: "project", idx: 6, },
    MEDIA_ADVANCED: { info: `Open [ ${PRODUCT_ADVANCED} ] panel`, hotkey: ["f1", "ctrl+space"], },

    /* Local */
    SELECT_ALL_NOTES: { info: "Select all notes", hotkey: ["command+a", "ctrl+a"], group: "Note Editor", idx: 1, },
    DELETE_NOTES: { info: "Delete selected note(s)", hotkey: ["del", "backspace"], group: "Note Editor", idx: 2, },
    CUT_NOTES: { info: "Remove note(s) and save it in a buffer", hotkey: ["command+x", "ctrl+x"], group: "Note Editor", idx: 3, },
    COPY_NOTES: { info: "Copy note(s) and save it in a buffer", hotkey: ["command+c", "ctrl+c"], group: "Note Editor", idx: 4, },
    PASTE_NOTES: { info: "Paste note(s) that were saved in the buffer", hotkey: ["command+v", "ctrl+v"], group: "Note Editor", idx: 5, },
    MOVE_NOTES_LEFT: { info: "Move note(s) backwards by one beat", hotkey: ["shift+left"], group: "Note Editor", idx: 6, },
    MOVE_NOTES_RIGHT: { info: "Move note(s) forwards by one beat", hotkey: ["shift+right"], group: "Note Editor", idx: 7, },
    MOVE_NOTES_UP: { info: "Move note(s) to the next higher string", hotkey: ["shift+up"], group: "Note Editor", idx: 8, },
    MOVE_NOTES_DOWN: { info: "Move note(s) to the next lower string", hotkey: ["shift+down"], group: "Note Editor", idx: 9, },
    TOGGLE_METRONOME: { info: "Toggle Metronome", hotkey: ["m"], group: "Note Editor", idx: 10, },
    TOGGLE_CLAPS: { info: "Toggle Claps", hotkey: ["c"], group: "Note Editor", idx: 11, },
    TOGGLE_NOTE_PLAY: { info: "Toggle Note Play", hotkey: ["n"], group: "Note Editor", idx: 12, },
    MOVE_CURSOR_LEFT: { info: "Move cursor left", hotkey: ["command+left", "ctrl+left"], group: "Note Editor - 2", idx: 17, },
    MOVE_CURSOR_RIGHT: { info: "Move cursor right", hotkey: ["command+right", "ctrl+right"], group: "Note Editor - 2", idx: 18, },
    MOVE_CURSOR_UP: { info: "Move cursor up", hotkey: ["command+up", "ctrl+up"], group: "Note Editor - 2", idx: 19, },
    MOVE_CURSOR_DOWN: { info: "Move cursor down", hotkey: ["command+down", "ctrl+down"], group: "Note Editor - 2", idx: 20, },
    INSERT_NOTE_AT_CURSOR: { info: "Place note at cursor", hotkey: ["command+shift+i", "ctrl+shift+i"], group: "Note Editor - 2", idx: 21, },
    EDIT_NOTE_AT_CURSOR: { info: "Edit Note Details", hotkey: ["command+shift+e", "ctrl+shift+e"], group: "Note Editor - 2", idx: 21, },
}

export const getHotkey = (h: Hotkey) => {
    if (Array.isArray(h.hotkey)) {
        for (let i = 0; i < h.hotkey.length; i += 1) {
            const s = h.hotkey[i];
            if (s.includes("ctrl")) {
                return <KeyCombo key={s} combo={s} />
            }
            else if (s.includes("command")) {
                if (isMac) {
                    return <KeyCombo key={s} combo={s} />
                }
            }
            else {
                return <KeyCombo key={s} combo={s} />
            }
        }
        return null;
    }
    else {
        return <KeyCombo key={h.hotkey} combo={h.hotkey} />
    }
}

export interface HotKeyState {
    isHKEnabled: boolean;
}

export class HotKeyComponent<P, Q extends HotKeyState> extends Component<P, Q> {
    //eslint-disable-next-line
    constructor(props: P) {
        super(props);
        this.state = this.getInitialState();
    }

    getInitialState() {
        return { isHKEnabled: true } as Q;
    }

    private _handleKbd(kbdEnable: DispatchData) {
        this.setState({ isHKEnabled: kbdEnable as boolean });
    }

    _componentDidMount() {
        DispatcherService.on(DispatchEvents.KbdShortcuts, this._handleKbd.bind(this));
    }

    _componentWillUnmount() {
        DispatcherService.off(DispatchEvents.KbdShortcuts, this._handleKbd.bind(this));
    }

    kbdProxy(cb: () => void) { if (this.state.isHKEnabled) cb(); }
}
