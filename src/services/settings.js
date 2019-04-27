import ForageService, { SettingsForageKeys } from "./forage";

export const SettingsModel = {
    layouts: [
        {
            text: 'Controls',
            id: 'control',
            icon: "fas fa-sliders-h",
            checked: true,
        },
        {
            text: 'Waveform',
            id: 'waveform',
            icon: "fas fa-wave-square",
            checked: true,
        },
        {
            text: 'Chromagram',
            id: 'chromagram',
            icon: "far fa-chart-bar",
            checked: true,
        },
        {
            text: 'Tabs',
            id: 'tabs',
            icon: "fas fa-guitar",
            checked: true,
        },
        {
            text: 'CDLC Creator',
            id: 'cdlc',
            icon: "fas fa-download",
            checked: true,
        },
        {
            text: 'Credits',
            id: 'credits',
            icon: "fas fa-drum",
            checked: false,
        },
    ],
    advanced: {
        key_profile: 'bgate',
        cqt_colormap: 'bone',
        show_fps: false,
        power_preference: 'default',
    },
}

class SettingsBase {
    getAll = async () => {
        const ser = await ForageService.get(SettingsForageKeys.APP_SETTINGS);
        return ser;
    }

    setAll = async (value) => {
        await ForageService.set(SettingsForageKeys.APP_SETTINGS, value);
    }

    isLayoutAvailable = async (layoutid) => {
        const all = await this.getAll();
        for (let i = 0; i < all.layouts.length; i += 1) {
            const layout = all.layouts[i];
            if (layout.id === layoutid) {
                return layout.checked;
            }
        }
        return false;
    }

    getSettingValue = async (category, field) => {
        const all = await this.getAll();
        const fields = all[category];
        if (field in fields) {
            return fields[field];
        }
        return null;
    }
}

export const SettingsService = new SettingsBase();
