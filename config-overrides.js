const { override, useBabelRc, useEslintRc, addWebpackModuleRule } = require('customize-cra');
const path = require('path');

const wasmExtensionRegExp = /\.wasm$/;
function myOverrides(config) {
    // do stuff to config

    config.resolve.extensions.push('.wasm');
    // make the file loader ignore wasm files
    let fileLoader = null;
    config.module.rules.forEach(rule => {
        (rule.oneOf || []).map(oneOf => {
            if (oneOf.loader && oneOf.loader.indexOf('file-loader') >= 0) {
                fileLoader = oneOf;
            }
        });
    });
    fileLoader.exclude.push(wasmExtensionRegExp);

    // Add a dedicated loader for them
    config.module.rules.push({
        test: wasmExtensionRegExp,
        include: path.resolve(__dirname, 'src'),
        use: [{ loader: require.resolve('wasm-loader'), options: {} }],
    });
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
    myOverrides,
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
    )
);
