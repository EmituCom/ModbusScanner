const ModbusRTU = require("modbus-serial");

const { saveConfig } = require("./storage");
const { runWelcomeScreen } = require("./ui/workflows");
const { setAsScanning, runScanLoop } = require("./modbus/polling");
const {
  screen, log, updateTree, updateInfo, treeWidget, isModalOpen, commandButtons,
  handleEnter, handleRight, handleLeft, handleAdd, handleEdit, handleDelete,
  handleConnectionManager, handleOpenWelcomeScreen, handleSave, handleQuit, handleToggleSelection
} = require('./ui');

const runCLI = async () => {
  log("Modbus Scanner");

  const globalConfig = await runWelcomeScreen(true);
  saveConfig(globalConfig);

  const client = new ModbusRTU();

  const refreshInfo = () => {
    const setupCount = globalConfig.setups.length;
    const time = new Date().toLocaleTimeString();
    let connCount = 0;
    let totalSlaves = 0;

    globalConfig.setups.forEach(s => {
      if (s.connections) {
        connCount += s.connections.length;
        totalSlaves += s.connections.reduce((acc, c) => acc + (c.slaves ? c.slaves.length : 0), 0);
      }
    });

    let info = `\n{center}{bold}SYSTEM STATUS{/bold}{/center}\n\n`;
    info += ` {bold}Setups:{/bold}        ${setupCount}\n`;
    info += ` {bold}Connections:{/bold}   ${connCount}\n`;
    info += ` {bold}Total Slaves:{/bold}  ${totalSlaves}\n`;
    info += ` {bold}Last Updated:{/bold}  ${time}`;

    updateInfo(info);
  };

  const saveAndRefresh = async () => {
    saveConfig(globalConfig);
    refreshInfo();
    updateTree(globalConfig.setups);
  }

  const guard = (fn) => {
    return async () => {
      if (isModalOpen()) return;
      await fn();
    }
  }

  const runScan = async () => {
    log('Started scan...');
    await runScanLoop(client, globalConfig, refreshInfo, updateTree);
    log('Scan finished...');
  }

  treeWidget.key(['enter'], guard(() => handleEnter({ globalConfig })));
  treeWidget.key(['right', 'l'], guard(() => handleRight({ globalConfig })));
  treeWidget.key(['left', 'h'], guard(() => handleLeft({ globalConfig })));

  let lastClickTime = 0;
  let lastClickIndex = -1;

  treeWidget.on('element click', guard(() => {
    const now = Date.now();
    const index = treeWidget.selected;

    if (index === lastClickIndex && (now - lastClickTime) < 500) {
      handleEnter({ globalConfig });
      lastClickTime = 0;
    } else {
      lastClickTime = now;
      lastClickIndex = index;
    }
  }));

  const actions = {
    refresh: async () => {
      setAsScanning(globalConfig);
      await runScan();
    },
    add: async () => {
      await handleAdd({ saveAndRefresh })
      await runScan();
    },
    edit: async () => {
      await handleEdit({ globalConfig, saveAndRefresh })
      await runScan();
    },
    delete: async () => await handleDelete({ globalConfig, saveAndRefresh }),
    create: async () => await handleConnectionManager({ globalConfig, saveConfig, refreshInfo }),
    back: async () => await handleOpenWelcomeScreen({ globalConfig, saveAndRefresh, refreshInfo }),
    save: async () => await handleSave({ globalConfig, saveConfig }),
    toggleSelection: () => handleToggleSelection({ globalConfig }),
    quit: () => handleQuit({ client })
  };

  screen.key(['r'], guard(actions.refresh));
  screen.key(['a'], guard(actions.add));
  screen.key(['e'], guard(actions.edit));
  screen.key(['d'], guard(actions.delete));
  screen.key(['c'], guard(actions.create));
  screen.key(['b'], guard(actions.back));
  screen.key(['s'], guard(actions.save));
  screen.key(['x', 'space'], guard(actions.toggleSelection));
  screen.key(['q'], guard(actions.quit));
  screen.key(['C-c'], actions.quit);

  if (commandButtons) {
    commandButtons.refresh.on('press', guard(actions.refresh));
    commandButtons.add.on('press', guard(actions.add));
    commandButtons.edit.on('press', guard(actions.edit));
    commandButtons.delete.on('press', guard(actions.delete));
    commandButtons.create.on('press', guard(actions.create));
    commandButtons.back.on('press', guard(actions.back));
    commandButtons.save.on('press', guard(actions.save));
    commandButtons.quit.on('press', guard(actions.quit));
  }

  setAsScanning(globalConfig);
  refreshInfo();
  log("Modbus Scanner started.");
  updateTree(globalConfig.setups);

  await runScan();

  treeWidget.focus();
};


runCLI();
