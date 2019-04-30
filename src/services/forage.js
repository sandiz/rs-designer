import * as localForage from "localforage";

import { DispatcherService, DispatchEvents } from './dispatcher';

export const SettingsForageKeys = {
    APP_SETTINGS: "app-settings",
    CONTROL_SETTINGS: "control-settings",
    WAVEFORM_SETTINGS: "waveform-settings",
    ANALYSIS_SETTINGS: "analysis-settings",
    PROJECT_SETTINGS: "project-settings",
}

export const Store = {
    GENERAL: "rs-designer",
}

class LocalForage {
    constructor() {
        this.settingsStore = localForage.createInstance({
            name: Store.GENERAL,
        });
    }

    get = async (key) => {
        const val = await this.settingsStore.getItem(key);
        return val;
    }

    set = async (key, value) => {
        await this.settingsStore.setItem(key, value);
        DispatcherService.dispatch(DispatchEvents.SettingsUpdate, {
            key,
            value,
        })
    }

    serializeState = async (key, state, fieldsToExclude = []) => {
        const val = { ...state };
        const keys = Object.keys(val);
        for (let i = 0; i < keys.length; i += 1) {
            const lkey = keys[i];
            if (fieldsToExclude.includes(lkey)) {
                delete val[lkey];
            }
        }
        //console.log(val);
        this.set(key, val);
    }
}

const ForageService = new LocalForage();

export default ForageService;
