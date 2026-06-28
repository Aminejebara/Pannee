// plugins/withPodfile.js
const { withPodfile } = require('@expo/config-plugins');

module.exports = (config) => {
  return withPodfile(config, (config) => {
    // Ajoute la ligne magique en tout début du Podfile
    if (!config.modResults.contents.includes('use_modular_headers!')) {
      config.modResults.contents = 'use_modular_headers!\n' + config.modResults.contents;
    }
    return config;
  });
};