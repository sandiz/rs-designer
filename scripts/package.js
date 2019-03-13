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
    "Rocksmith Manager",
    "--out=release-builds",
    "--overwrite",
    "--prune=true",
    "--arch=x64",
    `--platform=${platform}`,
    `--icon=${icon}`,
    "--ignore=config.dev.json",
    "--ignore=rsdb.dev.sqlite",
    "--ignore=screenshots/",
    "--ignore=src/lib/deni-react-treeview/node_modules/",
    "--ignore=src/lib/deni-react-treeview/gh-pages/",
    "--ignore=src/lib/deni-react-treeview/src/",
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
        process.chdir("release-builds/Rocksmith\ Manager-darwin-x64/Rocksmith\ Manager.app/Contents/Resources/app/");
        console.log("Running postbuild mac..");
        //console.log(process.cwd());
        spawn("install_name_tool", [
            "-change",
            "@rpath/libportaudio.dylib",
            "node_modules/naudiodon/build/Release/libportaudio.dylib",
            "node_modules/naudiodon/build/Release/naudiodon.node"
        ]);
    }
}