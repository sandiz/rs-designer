import * as localForage from "localforage";

import { DispatcherService, DispatchEvents } from './dispatcher';

export enum SettingsForageKeys {
    APP_SETTINGS = "app-settings",
    CONTROL_SETTINGS = "control-settings",
    WAVEFORM_SETTINGS = "waveform-settings",
    ANALYSIS_SETTINGS = "analysis-settings",
    PROJECT_SETTINGS = "project-settings",
}

export enum Store {
    GENERAL = "rs-designer",
}

class Forage {
    public settingsStore: LocalForage;
    private static instance: Forage;

    static getInstance() {
        if (!Forage.instance) {
            Forage.instance = new Forage();
        }
        return Forage.instance;
    }

    private constructor() {
        this.settingsStore = localForage.createInstance({
            name: Store.GENERAL,
        });
    }

    public get = async (key: string) => {
        const val = await this.settingsStore.getItem(key);
        return val;
    }

    public set = async (key: string, value: object): Promise<void> => {
        await this.settingsStore.setItem(key, value);
        DispatcherService.dispatch(DispatchEvents.SettingsUpdate, {
            key,
            value,
        })
    }

    public clearAll = async (): Promise<void> => {
        await this.settingsStore.clear();
        DispatcherService.dispatch(DispatchEvents.SettingsUpdate, {});
    }
}

const ForageService = Forage.getInstance();

export default ForageService;
