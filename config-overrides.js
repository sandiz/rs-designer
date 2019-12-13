const { override, useBabelRc, useEslintRc, addWebpackModuleRule } = require('customize-cra');
const path = require('path');

const wasmExtensionRegExp = /\.wasm$/;
function myOverrides(config) {
    return config;
}
module.exports = override(
    config => ({
        ...config,
        output: {
            ...config.output,
            globalObject: 'this'
        },
    }),
    //myOverrides,
    useBabelRc(),
    useEslintRc(path.resolve(__dirname, '.eslintrc')),
    addWebpackModuleRule(
        {
            test: /worklet\.js$/,
            use: [
                {
                    loader: require.resolve('worklet-loader'),
                    options: {
                        name: 'static/js/[hash].worklet.js'
                    }
                }
            ],
        },
        {
            test: /\.wav$/,
            use: [
                {
                    loader: require.resolve('file-loader'),
                    options: {
                        name: '[path][name].[ext]'
                    }
                }
            ],
        },
    )
);
