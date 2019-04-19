//config-overrides.js
const rewireEslint = require('react-app-rewire-eslint');
module.exports = function override(config, env) {
    config.module.rules.push({
        test: /worklet\.js$/,
        loader: require.resolve('worklet-loader'),
        options: {
            name: 'js/[hash].worklet.js'
        }
    })

    config = rewireEslint(config, env);
    return config;
}
