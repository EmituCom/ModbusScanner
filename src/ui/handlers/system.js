const { createNewConnectionPrompt, runWelcomeScreen } = require("../workflows");
const { log } = require("../utils");
const { askForm } = require('../forms');
const { treeWidget } = require("../widgets");
const { updateTree } = require("../render");

const handleConnectionManager = async ({ globalConfig, saveConfig, refreshInfo }) => {
  try {
    const newSetup = await createNewConnectionPrompt();

    if (newSetup) {
      globalConfig.setups.push(newSetup);
      log(`Added new setup: ${newSetup.name}`);
      saveConfig(globalConfig);
      refreshInfo();
      updateTree(globalConfig.setups);
    } else {
      log("Setup creation cancelled.");
    }
  } catch (e) {
    log("Error adding connection: " + e.message);
  } finally {
    treeWidget.focus();
  }
};

const handleOpenWelcomeScreen = async ({ globalConfig, saveAndRefresh, refreshInfo }) => {
  try {
    const newConfig = await runWelcomeScreen();
    if (newConfig) {
      globalConfig.connections = newConfig.connections || [];
      globalConfig.connections.forEach(c => { if (c.expanded === undefined) c.expanded = false });

      log(`Configuration reset/loaded.`);
      refreshInfo();
      saveAndRefresh();
    }
  } catch (e) {
    log("Error opening: " + e.message);
  } finally {
    treeWidget.focus();
  }
}

const handleSave = async ({ globalConfig, saveConfig }) => {
  log('Saving current configuration ...');
  try {
    const form = await askForm('Save configuration name', [
      { label: 'Filename', key: 'name', default: 'config.json', hint: 'Filename to save to, does not need the extension (e.g. emu-configuration).' }
    ]);
    const filename = form ? form.name : null

    if (filename) {
      saveConfig(globalConfig, filename);
      log(`Configuration saved as: ${finalName}`);
    } else {
      log("Save cancelled.");
    }
  } catch (e) {
    log(`Error saving configuration: ${e.message}`);
  }
}

const handleQuit = ({ client }) => {
  client.close(() => { });
  log("Exiting...");
  setTimeout(() => process.exit(0), 100);
}

module.exports = { handleSave, handleQuit, handleConnectionManager, handleOpenWelcomeScreen };
