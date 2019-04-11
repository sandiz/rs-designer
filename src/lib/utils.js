/* eslint-disable */
import React from 'react'
import { toast } from 'react-toastify';

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

export const toaster = (type = '', icon, text) => {
    switch (type) {
        case "success":
            toast.success(({ closeToast }) => (<div>
                <i className={icon} />
                <span style={{ marginLeft: 5 + 'px' }}>
                    {text}
                </span>
            </div>
            ));
            break;
        case "error":
            toast.success(({ closeToast }) => (<div>
                <i className={icon} />
                <span style={{ marginLeft: 5 + 'px' }}>
                    {text}
                </span>
            </div>
            ));
            break;
        default:
            toast(({ closeToast }) => (<div>
                <i className={icon} />
                <span style={{ marginLeft: 5 + 'px' }}>
                    {text}
                </span>
            </div>
            ));
            break;
    }

}