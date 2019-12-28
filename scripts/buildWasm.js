const { spawn, execSync } = require('child_process');
const fs = require('fs');
const chalk = require('chalk');

/**
 * Compile the C libraries with emscripten.
 */
var compiler = process.env.EMPP_BIN || 'em++';

var source_files = [];

source_files.push('src/lib/musicanalysis/cqt/cqt.c');

var js_file = 'src/lib/musicanalysis/cqt/bandish-core.js';
var wasm_file = 'src/lib/musicanalysis/cqt/bandish-core.wasm';
var providers_json = 'src/lib/musicanalysis/providers.json'
var wasm_dir = "build/static/js"

var exported_functions = [
    '_cqt_init',
    '_cqt_calc',
    '_cqt_render_line',
    '_cqt_bin_to_freq',
    '_cqt_malloc',
    '_cqt_free',
];

var runtime_methods = [
    'ALLOC_NORMAL',
    'FS',
    'UTF8ToString',
    'allocate',
    'ccall',
    'getValue',
    'setValue',
];

var flags = [
    // '--closure', '1',       // causes TypeError: lib.FS.mkdir is not a function
    // '--llvm-lto', '3',
    // '--clear-cache',        // sometimes Emscripten cache gets "poisoned"
    '--no-heap-copy',
    '-s', 'EXPORTED_FUNCTIONS=[' + exported_functions.join(',') + ']',
    '-s', 'EXPORTED_RUNTIME_METHODS=[' + runtime_methods.join(',') + ']',
    '-s', 'ASSERTIONS=0',      // assertions increase runtime size about 100K
    '-s', 'MODULARIZE=1',
    '-s', 'EXPORT_NAME=BANDISH_CORE',
    '-Os',
    '-o', wasm_file,

    '-Qunused-arguments',
    '-Wno-deprecated',
    '-Wno-logical-op-parentheses',
    '-Wno-c++11-extensions',
    '-Wno-inconsistent-missing-override',
    '-Wno-c++11-narrowing',
    '-std=c++11',

    '-flto',
    '-fno-asynchronous-unwind-tables',
    '-fno-stack-protector',
    '-ffunction-sections',
    '-fdata-sections',
    '-DRONAN',
    '-s', 'SAFE_HEAP=0',
];
var args = [].concat(flags, source_files);

console.log('Compiling to %s...', js_file);
console.log(`Invocation:\n${compiler} ${chalk.blue(flags.join(' '))} ${chalk.gray(source_files.join(' '))}\n`);
var build_proc = spawn(compiler, args, { stdio: 'inherit' });
build_proc.on('exit', function (code) {
    if (code === 0) {
        console.log('updating..', providers_json);
        //execSync(`mv ${wasm_file} ${wasm_dir}`);

        // Don't use --pre-js because it can get stripped out by closure.
        const wasm = fs.readFileSync(wasm_file);
        const fd = fs.openSync(providers_json, 'w+');
        const obj = {
            "cqt": wasm.toString('base64'),
        }
        fs.writeSync(fd, JSON.stringify(obj));
        fs.close(fd, (err) => {
            if (err) throw err;
        });
    }
});