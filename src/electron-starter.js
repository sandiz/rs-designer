const electron = require("electron");
const { app, BrowserWindow, Menu, ipcMain, TouchBar, nativeImage } = electron;
const { TouchBarLabel, TouchBarButton, TouchBarSpacer, TouchBarPopover, TouchBarSlider, TouchBarScrubber } = TouchBar;
const path = require("path");
const url = require("url");
const isDev = require('electron-is-dev');
const isMac = process.platform === "darwin";
const windowStateKeeper = require('electron-window-state');
const openAboutWindow = require('about-window').default;
const v8 = require('v8');

let mainWindow;
let sideWindow;
let incomingPath = "";
let ready = false;
let projectTouchbar = null;
let defaultTouchbar = null;
let tbKey = null;
let tbTempo = null;

function createDefaultTouchBar() {
    const result = new TouchBarLabel({
        label: `Welcome to ${app.name}!`,
    });
    const touchBar = new TouchBar({
        items: [
            new TouchBarButton({
                icon: nativeImage.createFromNamedImage("NSTouchBarFolderTemplate", [-1, 0, 1]),
                label: "Last Project",
                iconPosition: "left",
                click: () => mainWindow.webContents.send("open-last-project")
            }),
            new TouchBarSpacer({ size: 'small' }),
            new TouchBarButton({
                icon: nativeImage.createFromNamedImage("NSTouchBarFolderTemplate", [-1, 0, 1]),
                label: "Open Project",
                iconPosition: "left",
                click: () => mainWindow.webContents.send("open-project")
            }),
            new TouchBarSpacer({ size: 'small' }),
            new TouchBarButton({
                label: "Import File",
                icon: nativeImage.createFromNamedImage("NSTouchBarDownloadTemplate", [-1, 0, 1]),
                iconPosition: "left",
                click: () => mainWindow.webContents.send("import-media", "file")
            }),
            new TouchBarButton({
                label: "Import URL",
                icon: nativeImage.createFromNamedImage("NSTouchBarDownloadTemplate", [-1, 0, 1]),
                iconPosition: "left",
                click: () => mainWindow.webContents.send("import-media", "url")
            })
        ],
    });
    return touchBar;
}

function createProjectTouchBar(args) {
    const { projectInfo, tabs, key, tempo } = args;
    tbTempo = new TouchBarPopover({
        icon: nativeImage.createFromPath(path.join(__dirname, "assets/tempo.png")),
        showCloseButton: true,
        items: new TouchBar({
            items: [
                new TouchBarButton({
                    icon: nativeImage.createFromNamedImage("NSTouchBarGoBackTemplate", [-1, 0, 1]),
                    click: () => { mainWindow.webContents.send("change-tempo", -1); }
                }),
                new TouchBarLabel({
                    label: projectInfo.tempo + " bpm",
                }),
                new TouchBarButton({
                    icon: nativeImage.createFromNamedImage("NSTouchBarGoForwardTemplate", [-1, 0, 1]),
                    click: () => { mainWindow.webContents.send("change-tempo", 1); }
                }),
            ],
        })
    });
    tbKey = new TouchBarPopover({
        icon: nativeImage.createFromPath(path.join(__dirname, "assets/key.png")),
        showCloseButton: true,
        items: new TouchBar({
            items: [
                new TouchBarButton({
                    icon: nativeImage.createFromNamedImage("NSTouchBarGoBackTemplate", [-1, 0, 1]),
                    click: () => { mainWindow.webContents.send("change-key", -1); }
                }),
                new TouchBarLabel({
                    label: key.displayName,
                }),
                new TouchBarButton({
                    icon: nativeImage.createFromNamedImage("NSTouchBarGoForwardTemplate", [-1, 0, 1]),
                    click: () => { mainWindow.webContents.send("change-key", 1); }
                }),
            ],
        })
    });
    const iq = new TouchBarPopover({
        icon: nativeImage.createFromPath(path.join(__dirname, "assets/iq.png")),
        showCloseButton: true,
        items: new TouchBar({
            items: [
                new TouchBarScrubber({
                    items: tabs,
                    selectedStyle: 'background',
                    overlayStyle: 'outline',
                    continuous: false,
                    select: (idx) => mainWindow.webContents.send("open-media-advanced", idx),
                })
            ],
        })
    });
    const label = new TouchBarLabel({
        label: `${projectInfo.song} by ${projectInfo.artist}`,
    });
    projectTouchbar = new TouchBar({
        items: [
            iq,
            tbTempo,
            tbKey,
            new TouchBarSpacer({ size: 'small' }),
            label,
        ],
    });
    return projectTouchbar;
}

function updateTouchBar(args) {
    const { projectInfo, key, tempo } = args;
    const tkSlider = (tbKey.child.ordereredItems[1]);
    tkSlider.label = key.displayName + ` (${key.diff})`;

    const ttSlider = (tbTempo.child.ordereredItems[1]);
    ttSlider.label = Math.round(tempo.diff * projectInfo.tempo) + " bpm";
}

async function createWindow() {
    // Load the previous state with fallback to defaults
    let mainWindowState = windowStateKeeper({
        defaultWidth: 1700,
        defaultHeight: 1080
    });
    let frameOpts = {};
    if (process.platform !== 'win32') {
        frameOpts = {
            frame: false,
            titleBarStyle: 'hidden',
        };
    }

    // Create the window using the state information
    mainWindow = new BrowserWindow({
        id: 1,
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
            nodeIntegration: true,
            contextIsolation: false,
            nodeIntegrationInWorker: true,
            nativeWindowOpen: true,// window.open return Window object(like in regular browsers), not BrowserWindowProxy
            affinity: 'main-window'
        },
        autoHideMenuBar: true,
    });
    // Let us register listeners on the window, so we can update the state
    // automatically (the listeners will be removed when the window is closed)
    // and restore the maximized or full screen state
    mainWindowState.manage(mainWindow);
    mainWindow.setMinimumSize(1700, 1080);
    //mainWindow.maximize();
    const purl = `${process.env.ELECTRON_START_URL}?App`;
    mainWindow.loadURL(
        purl ||
        url.format({
            pathname: path.join(__dirname, "/../build/index.html?App"),
            protocol: "file:",
            slashes: true
        })
    );
    mainWindow.setTouchBar(createDefaultTouchBar());
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
                            copyright: 'Copyright (c) 2020 sandiz',
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
                        if (focusedWindow) focusedWindow.reload();
                    }
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
    ];
    //template = readKeyboardShortcuts(template, 3);
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    mainWindow.webContents.on('new-window', function (e, url, frameName, disposition, options) {
        // hook on new opened window

        // at now new window in mainWindow renderer process.
        // Also, this will automatically get an option `nodeIntegration=false`(not override to true, like in iframe's) - like in regular browsers
        options.webPreferences.affinity = 'main-window';
    });
}

async function createMediaWindow() {
    let frameOpts = {};
    if (process.platform !== 'win32') {
        frameOpts = {
            frame: false,
            titleBarStyle: 'customButtonsOnHover',
        };
    }

    sideWindow = new BrowserWindow({
        id: 1,
        x: 0,
        y: 0,
        width: 1700,
        height: 500,
        show: false,
        ...frameOpts,
        icon: path.join(__dirname, "./icons/png/icon-1024x1024.png"),
        webPreferences: {
            preload: path.join(__dirname, "./preload.js"),
            webSecurity: false,
            nodeIntegration: true,
            contextIsolation: false,
            nodeIntegrationInWorker: true,
            nativeWindowOpen: true,// window.open return Window object(like in regular browsers), not BrowserWindowProxy
            affinity: 'main-window'
        },
        autoHideMenuBar: true,
        resizable: false,
    });
    sideWindow.setMinimumSize(1700, 500);
    const purl = `${process.env.ELECTRON_START_URL}?MediaAdvanced`;
    sideWindow.loadURL(
        purl ||
        url.format({
            pathname: path.join(__dirname, "/../build/index.html?MediaAdvanced"),
            protocol: "file:",
            slashes: true
        })
    );
    sideWindow.on("closed", () => {
        sideWindow = null;
    });
    sideWindow.once('ready-to-show', () => {
        sideWindow.show();
    });
}

const sendOpenFileRequest = () => {
    if (incomingPath.length > 0) {
        setTimeout(() => {
            mainWindow.webContents.send('open-file', incomingPath);
            incomingPath = "";
        }, 500);
    }
};

const onReady = () => {
    createWindow();
    if (isDev) {
        //installExtension(REACT_DEVELOPER_TOOLS)
        //    .then((name) => console.log(`Added Extension:  ${name}`))
        //    .catch((err) => console.log('An error occurred: ', err));
        //installExtension("cmhomipkklckpomafalojobppmmidlgl") // web audio api
        //    .then((name) => console.log(`Added Extension:  ${name}`))
        //    .catch((err) => console.log('An error occurred: ', err));
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    ipcMain.on('project-touch-bar', (event, arg) => {
        if (projectTouchbar == null)
            mainWindow.setTouchBar(createProjectTouchBar(arg));
        else
            updateTouchBar(arg);
    });
    ipcMain.on('reset-touch-bar', (event, arg) => {
        if (defaultTouchbar == null)
            mainWindow.setTouchBar(createDefaultTouchBar());
        else
            mainWindow.setTouchBar(defaultTouchbar);
        projectTouchbar = null;
    });
    sendOpenFileRequest();
    ready = true;
};

const onWindowAllClosed = () => {
    app.quit();
};

const onWillFinishLaunching = () => {
    app.on('open-file', onOpenfile);
};

const onOpenfile = (e, path) => {
    e.preventDefault();
    incomingPath = path;
    if (ready) {
        sendOpenFileRequest();
    }
};

const onActivate = () => {
    if (mainWindow === null) {
        createWindow();
    }
};

const onBeforeQuit = () => {
    app.off("activate", onActivate);
    app.off("before-quit", onBeforeQuit);
    app.off('open-file', onOpenfile);
    app.off('will-finish-launching', onWillFinishLaunching);
    app.off("window-all-closed", onWindowAllClosed);
    app.off("ready", onReady);
    ipcMain.off('open-mi-window', sideWindow);
};

v8.setFlagsFromString('--expose_gc');
global.gc = require("vm").runInNewContext('gc');
app.commandLine.appendSwitch('js-flags', '--expose_gc --max-old-space-size=1024');
if (isMac) app.commandLine.appendSwitch('enable-features', "Metal");
app.allowRendererProcessReuse = true;

app.on("activate", onActivate);
app.on("before-quit", onBeforeQuit);
app.on('will-finish-launching', onWillFinishLaunching);
app.on("window-all-closed", onWindowAllClosed);
app.on("ready", onReady);
ipcMain.on('open-mi-window', createMediaWindow);
ipcMain.on('collect-gc', global.gc);

