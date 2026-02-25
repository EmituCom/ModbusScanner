const fs = require("fs");
const path = require("path");

const CONFIGS_DIR = "configs";
const LAST_CONFIG_PATH = path.join(CONFIGS_DIR, "last-config.json");

if (!fs.existsSync(CONFIGS_DIR))
  fs.mkdirSync(CONFIGS_DIR);

const getFileName = (filename = null) => {
  if (filename) {
    const finalName = filename.endsWith(".json") ? filename : `${filename}.json`;
    return path.join(CONFIGS_DIR, finalName);
  }
  return LAST_CONFIG_PATH;
}

const getConfigurationFiles = () => {
  return fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json'));
}

const lastSaveExists = () => {
  return fs.existsSync(LAST_CONFIG_PATH);
}

const saveConfig = (config, filename = null) => {
  const file = getFileName(filename);
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
};

const loadSave = (filename = null) => {
  const file = getFileName(filename);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = { saveConfig, lastSaveExists, loadSave, getConfigurationFiles };
