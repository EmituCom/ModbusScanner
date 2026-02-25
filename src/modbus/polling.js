const { readRegistersOnce } = require("./scanner");

const setAsScanning = (globalConfig) => {
  if (!globalConfig.setups) return;

  globalConfig.setups.forEach(setup => {
    if (setup.connections === undefined) return;
    setup.connections.forEach(c => {
      if (c.expanded === undefined) c.expanded = false;
      c.isScanning = true;

      if (c.slaves) c.slaves.forEach(s => {
        s.isScanning = true;
        if (s.registers) s.registers.forEach(r => r.isScanning = true);
      });
    });
  });
};

const scanSlave = async (client, conn, slave, uiContext) => {
  await readRegistersOnce(client, conn, slave);

  const error = slave.lastError;
  slave.isScanning = false;

  if (uiContext.refreshInfo) uiContext.refreshInfo();
  if (uiContext.onUpdate) uiContext.onUpdate(uiContext.globalConfig.setups);

  return error;
};

const scanConnection = async (client, conn, uiContext) => {
  if (!conn.slaves || conn.slaves.length === 0) return false;

  let errorCount = 0;
  let commonError = null;

  for (const slave of conn.slaves) {
    const error = await scanSlave(client, conn, slave, uiContext);
    if (error) {
      errorCount++;
      if (commonError === null) commonError = error;
    }
  }

  conn.isScanning = false;
  conn.lastError = errorCount === conn.slaves.length ? commonError : null;
  return !!conn.lastError;
};

const scanSetup = async (client, setup, uiContext) => {
  if (!setup.connections || setup.connections.length === 0) return;

  let errorCount = 0;

  for (const conn of setup.connections) {
    const hasError = await scanConnection(client, conn, uiContext);
    if (hasError) errorCount++;
  }

  setup.lastError = errorCount === setup.connections.length ? "Multiple errors found" : null;
  setup.isScanning = false;
};

const runScanLoop = async (client, globalConfig, refreshInfo, onUpdate, isActive) => {
  const uiContext = { refreshInfo, globalConfig, onUpdate };

  if (isActive && !isActive()) return;

  if (globalConfig.setups.length === 0) {
    refreshInfo();
    return;
  }

  for (const setup of globalConfig.setups) {
    await scanSetup(client, setup, uiContext);
  }

  refreshInfo();
  if (uiContext.onUpdate) uiContext.onUpdate(globalConfig.setups);
};

module.exports = { setAsScanning, runScanLoop };
