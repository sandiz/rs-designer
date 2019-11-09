import React from 'react';
import { getApplicationKeyMap } from 'react-hotkeys';
import { Text, Classes, KeyCombo } from '@blueprintjs/core';
import classNames from 'classnames';
import { ExtClasses, HotkeyInfo } from './types';

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
