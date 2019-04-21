/* eslint-disable */
import React from 'react'
import { toast } from 'react-toastify';
import { DispatcherService, DispatchEvents } from '../services/dispatcher'

const electron = window.require("electron");
const ipcRenderer = electron.ipcRenderer;

export const setStateAsync = (obj, state) => {
    return new Promise((resolve) => {
        obj.setState(state, resolve)
    });
}

export const readFile = filePath => new Promise((resolve, reject) => {
    window.electronFS.readFile(filePath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
    });
});

export const writeFile = (filePath, data) => new Promise((resolve, reject) => {
    window.electronFS.writeFile(filePath, data, (err) => {
        if (err) reject(err);
        else resolve();
    });
});

export const copyFile = (src, dest) => new Promise((resolve, reject) => {
    window.electronFS.copyFile(src, dest, (err) => {
        if (err) reject(err);
        else resolve();
    })
});

export const readTags = file => new Promise((resolve, reject) => {
    window.mm.parseFile(file, { native: true })
        .then((metadata) => {
            resolve(metadata);
        })
        .catch((err) => {
            reject(err);
        });
})

export const copyDir = (src, dest, options) => new Promise((resolve, reject) => {
    window.fsextra.copy(src, dest, options, function (err) {
        if (err) {
            reject(err);
        } else {
            resolve();
        }
    });
})

export const toaster = (type = '', icon = 'far fa-check-circle', text, options = {}) => {
    switch (type) {
        case "success":
            return toast.success(({ closeToast }) => (<div>
                <i className={icon} />
                <span style={{ marginLeft: 5 + 'px' }}>
                    {text}
                </span>
            </div>
            ), options);
            break;
        case "error":
            return toast.error(({ closeToast }) => (<div>
                <i className={icon} />
                <span style={{ marginLeft: 5 + 'px' }}>
                    {text}
                </span>
            </div>
            ), options);
            break;
        case "info":
            return toast.info(({ closeToast }) => (<div>
                <i className={icon} />
                <span style={{ marginLeft: 5 + 'px' }}>
                    {text}
                </span>
            </div>
            ), options);
            break;
        default:
            return toast(({ closeToast }) => (<div>
                <i className={icon} />
                <span style={{ marginLeft: 5 + 'px' }}>
                    {text}
                </span>
            </div>
            ), options);
            break;
    }

}

export const disableKeydown = (selector, key, cb = null) => {
    document.querySelector(selector).addEventListener('keydown', (e) => {
        if (e.key === key) {
            e.target.blur();
            e.preventDefault();
            e.stopImmediatePropagation();
            if (cb) cb();
        }
    })
}

export const assign = (obj, keyPath, value) => {
    let lastKeyIndex = keyPath.length - 1;
    for (var i = 0; i < lastKeyIndex; ++i) {
        let key = keyPath[i];
        if (!(key in obj))
            obj[key] = {}
        obj = obj[key];
    }
    obj[keyPath[lastKeyIndex]] = value;
}

export const disableKbdShortcuts = () => {
    ipcRenderer.send('disable-kbd-shortcuts'); /* disable on electron level */
    DispatcherService.dispatch(DispatchEvents.DisableShortcuts); /* disable on chromium level */
}

export const enableKbdShortcuts = () => {
    ipcRenderer.send('enable-kbd-shortcuts');
    DispatcherService.dispatch(DispatchEvents.EnableShortcuts);
}