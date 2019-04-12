const spawn = require('cross-spawn');

if (process.argv.length <= 2) {
    console.log("Need platform (win/mac)");
    process.exit(-1);
}
const buildPlatform = process.argv[2];

let platform = ""
let icon = ""
let extra_ignore = ""
if (buildPlatform === "win") {
    platform = "win32";
    icon = "src/assets/icons/win/rs.ico"
    extra_ignore = "node_modules/.cache"
}
else if (buildPlatform === "mac") {
    platform = "darwin"
    icon = "src/assets/icons/mac/mac.icns"
    extra_ignore = ".node_modules/.cache"
}
else {
    console.log("Invalid buildPlatform, valid options: mac, win");
    process.exit(-1);
}


const child = spawn("yarn", [
    "run",
    "electron-packager",
    ".",
    "Rocksmith Designer",
    "--out=release-builds",
    "--overwrite",
    "--prune=true",
    "--arch=x64",
    `--platform=${platform}`,
    `--icon=${icon}`,
    "--ignore=screenshots/",
    "--ignore=.vscode/",
    "--ignore=design/",
    "--ignore=src/lib/musicanalysis/build/",
    "--ignore=src/lib/musicanalysis/cqt.npy",
    "--ignore=src/lib/radiaslider/node_modules/",
    extra_ignore.length > 0 ? `--ignore=${extra_ignore}` : ""
]);

child.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

child.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
});
child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    postbuild();
});

function postbuild() {
    if (buildPlatform === "mac") {

    }
}