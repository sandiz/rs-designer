module.exports = {
    extends: ['eslint:recommended'], // extending recommended config and config derived from eslint-config-prettier
    plugins: [], // activating esling-plugin-prettier (--fix stuff)
    parser: 'babel-eslint',
    globals: {
        WaveSurfer: true,
        Float32Array: true,
        Uint32Array: true,
        Promise: true,
        Uint8Array: true,
        ArrayBuffer: true,
        __VERSION__: true
    },
    env: {
        browser: true,
        commonjs: true
    },
    rules: {
        eqeqeq: 'off',
        'no-console': 'off',
        'no-unused-vars': 'off'
    }
};
