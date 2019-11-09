import React from 'react';
import { getApplicationKeyMap } from 'react-hotkeys';
import { Text, Classes, KeyCombo } from '@blueprintjs/core';
import classNames from 'classnames';
import { ExtClasses } from './types';

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
export const getHotkeyDialogContent = (): React.ReactElement => {
    const keyMap = getApplicationKeyMap();
    return (
        <div className={classNames(Classes.DIALOG_BODY)}>
            <div className={Classes.HOTKEY_COLUMN}>
                <Text className={classNames(ExtClasses.TEXT_LARGER, Classes.HEADING, "font-weight-unset")}>
                    Global Hotkeys
                </Text>
                {
                    Object.keys(keyMap).map((actionName) => {
                        const { sequences, name } = keyMap[actionName];
                        return (
                            <div key={name || actionName} className={Classes.HOTKEY}>
                                <div className={Classes.HOTKEY_LABEL}>
                                    {HotkeyInfo[actionName].info}
                                </div>
                                <span className={Classes.KEY_COMBO}>
                                    {
                                        sequences.map(({ sequence }) => {
                                            let s = null;
                                            if (typeof sequence === 'string') s = sequence;
                                            else s = sequence.join();

                                            return <KeyCombo key={s} combo={s} />
                                        })
                                    }
                                </span>
                            </div>
                        );
                    })
                }
            </div>
        </div>
    );
}
export default {};
