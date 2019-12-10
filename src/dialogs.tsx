import React, { RefObject } from 'react';
import { IconNames } from '@blueprintjs/icons';
import { getApplicationKeyMap, ApplicationKeyMap, KeyMapDisplayOptions } from 'react-hotkeys';
import {
    Text, Classes, KeyCombo, Tabs, Tab, H5, Button, Intent, Card,
} from '@blueprintjs/core';
import classNames from 'classnames';

import {
    HotkeyInfo, ExtClasses, DialogContent, os, Hotkey,
} from './types';
import './dialogs.scss'
import ImportURLDialog from './components/ImportURL/ImportURL';
import MetadataEditorDialog from './components/MetadataEditor/MetadataEditor';

const isWin = os.platform() === "win32";
const isMac = os.platform() === "darwin";


type keyMapType = {
    [key: string]: KeyMapDisplayOptions;
}
type groupKeymapType = {
    [key: string]: keyMapType;
};

/* HotKey Dialog */
const getKeymapGroups = (keyMap: ApplicationKeyMap) => {
    const groups: groupKeymapType = {};

    const sortable: (string | Hotkey)[][] = [];
    Object.keys(keyMap).forEach((key: string) => {
        sortable.push([key, HotkeyInfo[key]]);
    });

    sortable.sort((a: (string | Hotkey)[], b: (string | Hotkey)[]) => {
        const aidx = (a[1] as Hotkey).idx;
        const aval = typeof (aidx) === 'undefined' ? 0 : aidx;
        const bidx = (b[1] as Hotkey).idx;
        const bval = typeof (bidx) === 'undefined' ? 0 : bidx;

        return aval - bval;
    })

    sortable.forEach((a: (string | Hotkey)[]) => {
        const key = a[0] as string;
        const i = a[1] as Hotkey;
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
    });
    return groups;
}

const getKeyMapForGroup = (group: string, km: keyMapType) => {
    const keyNode = (s: string, idx: number, len: number) => (
        <div key={s} style={{ display: 'flex' }}>
            <KeyCombo key={s} combo={s} />
            {
                idx < len - 1
                    ? (
                        <div style={{ marginLeft: 0.30 + 'vw' }}>
                            <KeyCombo key="or" combo="or" />
                        </div>
                    )
                    : null
            }
        </div>
    );
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
                                    sequences.map(({ sequence }, idx) => {
                                        let s = null;
                                        if (typeof sequence === 'string') s = sequence;
                                        else s = sequence.join();
                                        if (s.includes("ctrl")) {
                                            if (isWin) {
                                                return (
                                                    keyNode(s, idx, sequences.length - 1)
                                                );
                                            }
                                        }
                                        else if (s.includes("command")) {
                                            if (isMac) {
                                                return (
                                                    keyNode(s, idx, sequences.length - 1)
                                                );
                                            }
                                        }
                                        else {
                                            return (
                                                keyNode(s, idx, sequences.length)
                                            );
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
        canEscapeKeyClose: true,
        canOutsideClickClose: false,
        onClose: (): void => { },
    }
}

export const getImportUrlDialog = (): DialogContent => {
    const ref: RefObject<ImportURLDialog> = React.createRef();
    const content = (
        <ImportURLDialog ref={ref} />
    );

    const text = (
        <Text className={classNames(ExtClasses.TEXT_LARGER, Classes.HEADING, "font-weight-unset", "dialog-header")}>
            Import URL
        </Text>
    );
    return {
        content,
        text,
        icon: IconNames.CLOUD_DOWNLOAD,
        class: classNames(Classes.HOTKEY_DIALOG, "import-url-dialog"),
        canEscapeKeyClose: true,
        canOutsideClickClose: true,
        onClose: () => {
            if (ref.current) ref.current.cancelDownload();
        },
    }
}

export const getMetadataEditorDialog = (): DialogContent => {
    const ref: RefObject<MetadataEditorDialog> = React.createRef();
    const content = (
        <MetadataEditorDialog ref={ref} />
    );
    const text = (
        <Text className={classNames(ExtClasses.TEXT_LARGER, Classes.HEADING, "font-weight-unset", "dialog-header")}>
            Metadata Editor
        </Text>
    );
    return {
        content,
        text,
        icon: IconNames.EDIT,
        class: classNames(Classes.HOTKEY_DIALOG, "metadata-editor-dialog"),
        canEscapeKeyClose: true,
        canOutsideClickClose: true,
        onClose: () => {
            if (ref.current) ref.current.close();
        },
    }
}

export const deletePopover = (del: () => void, msg: JSX.Element | null = null) => {
    return (
        <Card key="text">
            <H5 className="font-weight-unset">Confirm deletion</H5>
            {
                msg || <p>Are you sure you want to delete this chart? <br /> You won&apos;t be able to recover them.</p>
            }
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 15 }}>
                <Button className={Classes.POPOVER_DISMISS} style={{ marginRight: 10 }}>
                    Cancel
                </Button>
                <Button intent={Intent.DANGER} className={Classes.POPOVER_DISMISS} onClick={del}>
                    Delete
                </Button>
            </div>
        </Card>
    )
}

export default {};
