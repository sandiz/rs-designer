const electron = require("electron");
var { app, BrowserWindow, Menu, globalShortcut } = electron;
const path = require("path");
const os = require('os')
const url = require("url");
const isDev = require('electron-is-dev');
const windowStateKeeper = require('electron-window-state');

let mainWindow;

async function createWindow() {
    // Load the previous state with fallback to defaults
    let mainWindowState = windowStateKeeper({
        defaultWidth: 1750,
        defaultHeight: 1070
    });

    // Create the window using the state information
    mainWindow = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        show: false,

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
    var template = [{
        label: "About",
        submenu: [
            {
                label: "About Application", click: () => {
                }
            },
            { type: "separator" },
            { label: "Quit", accelerator: "Command+Q", click: function () { app.quit(); } }
        ]
    }, {
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
    }, {
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
    ];

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
        BrowserWindow.addDevToolsExtension(
            path.join(os.homedir(), '/Library/Application Support/Google/Chrome/Default/Extensions/cmhomipkklckpomafalojobppmmidlgl/0.1.4_0')
        )
    }

});

app.on("window-all-closed", () => {
    //if (process.platform !== "darwin") {
    app.quit();
    //}
});

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
