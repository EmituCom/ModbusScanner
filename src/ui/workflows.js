const { promptForConnections } = require("../connections");
const { lastSaveExists, loadSave, getConfigurationFiles } = require('../storage');
const { askForm, askChoice } = require("./forms");
const { log } = require("./utils");

const createNewConnectionPrompt = async () => {
  const form = await askForm("Setup Name", [
    { label: 'Name', key: 'name', default: 'New Setup', hint: 'The name for the setup' }
  ]);
  const setupName = form ? form.name : null;
  if (!setupName) return null;

  const finalConnections = await promptForConnections();
  if (!finalConnections) return null;

  log(`Generated ${finalConnections.length} connections.`);

  return { name: setupName, connections: finalConnections, expanded: true };
}

const runWelcomeScreen = async (isStartup = false) => {
  const hasLastSave = lastSaveExists();

  while (true) {
    const menuOptions = [];
    if (hasLastSave) menuOptions.push({ cli: "Continue", val: "continue" });
    menuOptions.push({ cli: "Load", val: "load" });
    menuOptions.push({ cli: "New", val: "new" });
    menuOptions.push({ cli: "Quit", val: "quit" });

    const action = await askChoice("Modbus Scanner", menuOptions);

    if (action === "quit") {
      log("Exiting...");
      process.exit(0);
    }

    if (action === null) {
      if (isStartup) {
        log("Exiting ...");
        process.exit(0);
      }
      return null;
    }

    if (action === "continue") {
      try {
        log("Loading last configuration.");
        return loadSave();
      } catch (e) {
        log("Failed to load config. " + e.message);
      }
    } else if (action === "load") {
      try {
        const files = getConfigurationFiles();
        if (files.length === 0) {
          log("No saved configurations found.");
        } else {
          const filename = await askChoice("Select Configuration", files.map(f => ({ cli: f, val: f })));

          if (filename) {
            log(`Loading configuration: ${filename}`);
            return loadSave(filename)
          }
        }
      } catch (e) {
        log("Error loading file: " + e.message);
      }
    } else if (action === "new") {
      const newSetup = await createNewConnectionPrompt();

      if (newSetup)
        return { setups: [newSetup], activeIndex: 0 };
    }
  }
}

module.exports = { runWelcomeScreen, createNewConnectionPrompt }
