const electron = require("electron");
var { app, BrowserWindow, Menu, ipcMain } = electron;
const path = require("path");
const os = require('os')
const url = require("url");
const fs = require("fs");
const isDev = require('electron-is-dev');
const windowStateKeeper = require('electron-window-state');
const electronLocalshortcut = require('electron-localshortcut');
const openAboutWindow = require('about-window').default;

const shortcuts = require('./app-config/shortcuts.json');
let mainWindow;
let kbdShortcutsEnabled = true;
let incomingPath = "";
let ready = false;
async function createWindow() {
    // Load the previous state with fallback to defaults
    let mainWindowState = windowStateKeeper({
        defaultWidth: 1750,
        defaultHeight: 1070
    });
    let frameOpts = {}
    if (process.platform !== 'win32') {
        frameOpts = {
            frame: false,
            titleBarStyle: 'hidden',
        };
    }

    // Create the window using the state information
    mainWindow = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        show: false,
        ...frameOpts,
        icon: path.join(__dirname, "./icons/png/icon-1024x1024.png"),
        webPreferences: {
            preload: path.join(__dirname, "./preload.js"),
            webSecurity: false,
        },
    });
    // Let us register listeners on the window, so we can update the state
    // automatically (the listeners will be removed when the window is closed)
    // and restore the maximized or full screen state
    mainWindowState.manage(mainWindow);
    mainWindow.setAutoHideMenuBar(true)
    mainWindow.setMinimumSize(1700, 1070);
    //mainWindow.maximize();
    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    mainWindow.loadURL(
        process.env.ELECTRON_START_URL ||
        url.format({
            pathname: path.join(__dirname, "/../build/index.html"),
            protocol: "file:",
            slashes: true
        })
    );
    mainWindow.webContents.session.webRequest.onHeadersReceived({}, (d, c) => {
        if (d.responseHeaders['x-frame-options'] || d.responseHeaders['X-Frame-Options']) {
            delete d.responseHeaders['x-frame-options'];
            delete d.responseHeaders['X-Frame-Options'];
        }
        c({ cancel: false, responseHeaders: d.responseHeaders });
    });


    // Create the Application's main menu
    var template = [
        {
            label: "About",
            submenu: [
                {
                    label: "About Application", click: () => {
                        openAboutWindow({
                            icon_path: path.join(__dirname, "./assets/icons/icon-1024x1024.png"),
                            package_json_dir: path.join(__dirname, "../"),
                            copyright: 'Copyright (c) 2018 sandiz',
                            homepage: 'https://github.com/sandiz/rs-designer',
                        });
                    }
                },
                { type: "separator" },
                {
                    label: 'Open Recent',
                    role: 'recentdocuments',
                    submenu: [
                        {
                            label: 'Clear Recent',
                            role: 'clearrecentdocuments'
                        }
                    ]
                },
                {
                    label: 'Open Last Opened Project',
                    accelerator: "CmdOrCtrl+1",
                    click: function () {
                        mainWindow.webContents.send('open-last-project');
                    }
                },
                { type: "separator" },
                { label: "Quit", accelerator: "Command+Q", click: function () { app.quit(); } }
            ]
        },
        {
            label: "Edit",
            submenu: [
                { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
                { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
                { type: "separator" },
                { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
                { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
                { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
                { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" },
                { label: "Toggle Developer Tools", role: "toggleDevTools" }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click(item, focusedWindow) {
                        if (focusedWindow) focusedWindow.reload()
                    }
                },
                {
                    type: 'separator'
                },
                {
                    role: 'resetzoom'
                },
                {
                    role: 'zoomin'
                },
                {
                    role: 'zoomout'
                },
                {
                    type: 'separator'
                },
                {
                    role: 'togglefullscreen'
                },
                {
                    label: 'Toggle Full Screen (local)',
                    click(item, focusedWindow) {
                        if (focusedWindow) focusedWindow.setSimpleFullScreen(!focusedWindow.isSimpleFullScreen());
                    }
                }
            ]
        },
        {
            label: 'Controls',
            submenu: [
            ]
        }
    ];
    template = readKeyboardShortcuts(template, 3);
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

}

app.on("ready", () => {
    createWindow();
    if (isDev) {
        //add web-audio visual debugger
        const _webaudioExt = path.join(os.homedir(), '/Library/Application Support/Google/Chrome/Default/Extensions/cmhomipkklckpomafalojobppmmidlgl/0.1.4_0');
        //if (fs.existsSync(_webaudioExt))
        //    BrowserWindow.addDevToolsExtension(_webaudioExt);

        const _reactExt = path.join(os.homedir(), '/Library/Application Support/Google/Chrome/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi/3.6.0_0');
        //add react devtools
        //if (fs.existsSync(_reactExt))
        //    BrowserWindow.addDevToolsExtension(_reactExt);
    }
    sendOpenFileRequest();
    ready = true;
});

app.on("window-all-closed", () => {
    //if (process.platform !== "darwin") {
    app.quit();
    //}
});
app.on('will-finish-launching', () => {
    app.on('open-file', (e, path) => {
        e.preventDefault();
        incomingPath = path;
        if (ready) {
            sendOpenFileRequest();
        }
    });
});

sendOpenFileRequest = () => {
    if (incomingPath.length > 0) {
        setTimeout(() => {
            mainWindow.webContents.send('open-file', incomingPath);
            incomingPath = "";
        }, 500);
    }
}

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});

const readKeyboardShortcuts = (template, index) => {
    try {
        const json = shortcuts;
        const globalS = json["global"];
        const localS = json["local"];
        const t = template[index];
        for (let i = 0; i < globalS.length; i += 1) {
            const item = globalS[i];
            t.submenu.push(item);
            if (item["type"]) {

            }
            else {
                item.click = (e, f) => handleKeyboard(item["event"]);
            }
        }

        for (let i = 0; i < localS.length; i += 1) {
            const item = localS[i];

            electronLocalshortcut.register(
                mainWindow, item.accelerator, () => {
                    handleKeyboard(item.event);
                }
            );

        }
    }
    catch (ex) {
        console.log(ex);
    }
    return template;
}

const handleKeyboard = (type) => {
    if (kbdShortcutsEnabled)
        mainWindow.webContents.send('keyboard-shortcut', type);
}

ipcMain.on('disable-kbd-shortcuts', () => kbdShortcutsEnabled = false);
ipcMain.on('enable-kbd-shortcuts', () => kbdShortcutsEnabled = true);