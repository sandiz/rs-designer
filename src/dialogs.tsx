import React from 'react';
import { IconNames } from '@blueprintjs/icons';
import { getApplicationKeyMap, ApplicationKeyMap, KeyMapDisplayOptions } from 'react-hotkeys';
import {
    Text, Classes, KeyCombo, Tabs, Tab, //Tab, Tabs,
} from '@blueprintjs/core';
import classNames from 'classnames';
import { HotkeyInfo, ExtClasses, DialogContent } from './types';

const { platform } = window.require('os');
const isWin = platform() === "win32";
const isMac = platform() === "darwin";

type keyMapType = {
    [key: string]: KeyMapDisplayOptions;
}
type groupKeymapType = {
    [key: string]: keyMapType;
};

/* HotKey Dialog */
const getKeymapGroups = (keyMap: ApplicationKeyMap) => {
    const groups: groupKeymapType = {};
    Object.keys(keyMap).forEach((key) => {
        if (key in HotkeyInfo) {
            const i = HotkeyInfo[key];
            const obj: { [key: string]: KeyMapDisplayOptions } = {}
            obj[key] = keyMap[key];
            if (i.group) {
                if (!(i.group in groups)) {
                    groups[i.group] = {};
                }
                groups[i.group][key] = keyMap[key];
            }
            else {
                if (!("general" in groups)) {
                    groups.general = {}
                }
                groups.general[key] = keyMap[key];
            }
        }
    });
    return groups;
}

const getKeyMapForGroup = (group: string, km: keyMapType) => {
    return (
        <div key={group}>
            {
                Object.keys(km).map((actionName) => {
                    const { sequences, name } = km[actionName];
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
                                        if (s.includes("ctrl")) {
                                            if (isWin) {
                                                return <KeyCombo key={s} combo={s} />
                                            }
                                        }
                                        else if (s.includes("command")) {
                                            if (isMac) {
                                                return <KeyCombo key={s} combo={s} />
                                            }
                                        }
                                        else {
                                            return <KeyCombo key={s} combo={s} />
                                        }
                                        return null;
                                    })
                                }
                            </span>
                        </div>
                    );
                })
            }
        </div>
    );
}

export const getHotkeyDialog = (): DialogContent => {
    const keyMap: ApplicationKeyMap = getApplicationKeyMap();
    const groups = getKeymapGroups(keyMap);

    const content = (
        <React.Fragment>
            <div className={classNames(Classes.DIALOG_BODY)}>
                <div className={classNames(Classes.HOTKEY_COLUMN, "dialog-body")}>

                    <Tabs key="tabs" id="tabs">
                        {
                            Object.keys(groups).map((group: string) => {
                                const km = groups[group];
                                console.log(group, Object.keys(km).length);
                                return (
                                    <Tab
                                        key={group}
                                        id={group}
                                        title={group.toLocaleUpperCase()}
                                        panel={getKeyMapForGroup(group, km)}
                                    />
                                );
                            })
                        }
                    </Tabs>
                </div>
            </div>
        </React.Fragment>
    );
    const text = (
        <Text className={classNames(ExtClasses.TEXT_LARGER, Classes.HEADING, "font-weight-unset", "dialog-header")}>
            Global Hotkeys
        </Text>
    );
    return {
        content,
        text,
        icon: IconNames.KEY_COMMAND,
        class: Classes.HOTKEY_DIALOG,
    }
}

interface ImportURLDialogState {
    url: string;
    downloading: boolean;
    downloaded: boolean;
}
/* Import URL Dialog */
export class ImportURLDialog extends React.Component<{}, ImportURLDialogState> {
    constructor(props: {}) {
        super(props);
        this.state = { url: "", downloaded: false, downloading: false };
    }

    componentDidMount = () => {
        console.log(this.state.url, this.state.downloaded, this.state.downloading);
    }

    render = () => {
        return (
            <div />
        );
    }
}

export const getImportUrlDialog = (): React.ReactElement => {
    return <ImportURLDialog />;
}

export default {};
