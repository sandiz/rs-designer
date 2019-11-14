const { override, useEslintRc, addWebpackModuleRule } = require('customize-cra');
const path = require('path');

module.exports = override(
    config => ({
        ...config,
        output: {
            ...config.output,
            globalObject: 'this'
        },
    }),
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