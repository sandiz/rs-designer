import * as localForage from "localforage";

import { DispatcherService, DispatchEvents } from './dispatcher';

export const SettingsForageKeys: { [key: string]: string } = {
    APP_SETTINGS: "app-settings",
    CONTROL_SETTINGS: "control-settings",
    WAVEFORM_SETTINGS: "waveform-settings",
    ANALYSIS_SETTINGS: "analysis-settings",
    PROJECT_SETTINGS: "project-settings",
}

export const Store: { [key: string]: string } = {
    GENERAL: "rs-designer",
}

class Forage {
    public settingsStore: LocalForage;

    constructor() {
        this.settingsStore = localForage.createInstance({
            name: Store.GENERAL,
        });
    }

    get = async (key: string) => {
        const val = await this.settingsStore.getItem(key);
        return val;
    }

    set = async (key: string, value: object): Promise<void> => {
        await this.settingsStore.setItem(key, value);
        DispatcherService.dispatch(DispatchEvents.SettingsUpdate, {
            key,
            value,
        })
    }

    clearAll = async (): Promise<void> => {
        await this.settingsStore.clear();
        DispatcherService.dispatch(DispatchEvents.SettingsUpdate, {});
    }
}

const ForageService = new Forage();

export default ForageService;
