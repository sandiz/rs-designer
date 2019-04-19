//config-overrides.js
const rewireEslint = require('react-app-rewire-eslint');

const path = require('path');

const getChildrenRules = (loader) => loader.use || loader.oneOf || (Array.isArray(loader.loader) && loader.loader) || [];

const findIndexAndRules = (rulesSource, ruleMatcher) => {
    let result;
    const rules = Array.isArray(rulesSource) ? rulesSource : getChildrenRules(rulesSource);

    rules.some((rule, index) => (
        result = ruleMatcher(rule) ? { index, rules } : findIndexAndRules(getChildrenRules(rule), ruleMatcher))
    );

    return result;
};

const addBeforeRule = (rulesSource, ruleMatcher, value) => {
    const { index, rules } = findIndexAndRules(rulesSource, ruleMatcher);

    rules.splice(index, 0, value);
};

const fileLoaderRuleMatcher = (rule) => rule.loader && rule.loader.indexOf(`${path.sep}file-loader${path.sep}`) !== -1;
module.exports = function override(config, env) {
    config = rewireEslint(config, env);
    const rule = {
        test: /worklet\.js$/,
        use: [
            {
                loader: require.resolve('worklet-loader'),
                options: {
                    name: 'static/js/[hash].worklet.js'
                }
            }
        ]
    }
    //addBeforeRule(config.module.rules, fileLoaderRuleMatcher, rule);
    config.module.rules.push(rule);
    return config;
}
