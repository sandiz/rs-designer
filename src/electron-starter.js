const electron = require("electron");
var { app, BrowserWindow, Menu, ipcMain } = electron;
const path = require("path");
const url = require("url");
const isDev = require('electron-is-dev');
const windowStateKeeper = require('electron-window-state');
const openAboutWindow = require('about-window').default;
const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

let mainWindow;
let sideWindow;
let incomingPath = "";
let ready = false;

async function createWindow() {
    // Load the previous state with fallback to defaults
    let mainWindowState = windowStateKeeper({
        defaultWidth: 1700,
        defaultHeight: 1080
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
        mainWindow.show()
    });
    mainWindow.webContents.on('new-window', function (e, url, frameName, disposition, options) {
        // hook on new opened window

        // at now new window in mainWindow renderer process.
        // Also, this will automatically get an option `nodeIntegration=false`(not override to true, like in iframe's) - like in regular browsers
        options.webPreferences.affinity = 'main-window';
    });
}

async function createMediaWindow() {
    let frameOpts = {}
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
        sideWindow.show()
    })
}

const sendOpenFileRequest = () => {
    if (incomingPath.length > 0) {
        setTimeout(() => {
            mainWindow.webContents.send('open-file', incomingPath);
            incomingPath = "";
        }, 500);
    }
}

const onReady = () => {
    createWindow();
    if (isDev) {
        installExtension(REACT_DEVELOPER_TOOLS)
            .then((name) => console.log(`Added Extension:  ${name}`))
            .catch((err) => console.log('An error occurred: ', err));
        installExtension("cmhomipkklckpomafalojobppmmidlgl") // web audio api
            .then((name) => console.log(`Added Extension:  ${name}`))
            .catch((err) => console.log('An error occurred: ', err));
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    sendOpenFileRequest();
    ready = true;
}

const onWindowAllClosed = () => {
    app.quit();
}

const onWillFinishLaunching = () => {
    app.on('open-file', onOpenfile);
}

const onOpenfile = (e, path) => {
    e.preventDefault();
    incomingPath = path;
    if (ready) {
        sendOpenFileRequest();
    }
}

const onActivate = () => {
    if (mainWindow === null) {
        createWindow();
    }
}

const onBeforeQuit = () => {
    app.off("activate", onActivate);
    app.off("before-quit", onBeforeQuit);
    app.off('open-file', onOpenfile);
    app.off('will-finish-launching', onWillFinishLaunching);
    app.off("window-all-closed", onWindowAllClosed);
    app.off("ready", onReady);
    ipcMain.off('open-mi-window', sideWindow);
}


app.on("activate", onActivate);
app.on("before-quit", onBeforeQuit);
app.on('will-finish-launching', onWillFinishLaunching);
app.on("window-all-closed", onWindowAllClosed);
app.on("ready", onReady);
ipcMain.on('open-mi-window', createMediaWindow);

