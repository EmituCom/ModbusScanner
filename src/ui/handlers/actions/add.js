const { getTreeSelection, getSelectionState, clearSelection } = require("../../state");
const { log } = require("../../utils");
const { treeWidget } = require("../../widgets");
const { askRegisterForm, askSlaveForm } = require("../../forms");
const { promptForConnections } = require("../../../connections");

const addRegistersToSlaves = async (selection, isBulkSlave, selectedItems, saveAndRefresh) => {
  let targetSlaves = [];

  if (isBulkSlave) {
    targetSlaves = Array.from(selectedItems);
  } else {
    let targetSlave = selection.type === 'slave' ? selection.data : selection.slave;
    if (targetSlave) targetSlaves.push(targetSlave);
  }

  if (targetSlaves.length === 0) {
    log("Error: No slave context found.");
    return;
  }

  const title = isBulkSlave ? `Add to ${targetSlaves.length} Slaves` : `Add to Slave ${targetSlaves[0].id}`;
  const result = await askRegisterForm(title);

  if (result && result.registers) {
    let count = 0;
    targetSlaves.forEach(targetSlave => {
      if (!targetSlave.registers) targetSlave.registers = [];

      const registersCopy = JSON.parse(JSON.stringify(result.registers));
      registersCopy.forEach(it => {
        it.expanded = false;
        it.isScanning = true;
        targetSlave.registers.push(it);
      });
      count++;
    });

    log(`Added registers to ${count} slaves.`);
    if (isBulkSlave) clearSelection();
    saveAndRefresh();
  }
};

const addSlaveToConnection = async (selection, saveAndRefresh) => {
  const targetConn = selection.type === 'connection' ? selection.data : selection.connection;

  const form = await askSlaveForm(`Add Slave(s) to ${targetConn.name}`);

  if (form.slaves && form.slaves.length !== 0) {
    if (!targetConn.slaves) targetConn.slaves = [];
    form.slaves.forEach(it => targetConn.slaves.push({ ...it, isScanning: true, expanded: false, registers: [] }));
    log(`Added ${form.slaves.length} slave(s).`);
    saveAndRefresh();
  } else {
    log('Invalid input for slave ids.');
  }
};

const addConnectionToSetup = async (selection, saveAndRefresh) => {
  const targetSetup = selection.type === 'setup' ? selection.data : selection.setup;
  const newConnections = await promptForConnections();

  if (newConnections && newConnections.length > 0) {
    if (!targetSetup.connections) targetSetup.connections = [];
    newConnections.forEach(c => {
      c.expanded = false;
      c.isScanning = true;
      targetSetup.connections.push(c);
    });

    log(`Added ${newConnections.length} connections to setup.`);
    saveAndRefresh();
  }
};

const handleAdd = async ({ saveAndRefresh }) => {
  try {
    const selection = getTreeSelection();
    const { selectedItems, selectionType } = getSelectionState();
    const isBulkSlave = selectionType === 'slave' && selectedItems.size > 0;

    if (isBulkSlave || (selection && (selection.type === 'slave' || ['register', 'empty-reg', 'function', 'endianness', 'subtypes'].includes(selection.type)))) {
      await addRegistersToSlaves(selection, isBulkSlave, selectedItems, saveAndRefresh);
    } else if (selection && (selection.type === 'connection' || selection.type === 'empty-slave')) {
      await addSlaveToConnection(selection, saveAndRefresh);
    } else if (selection && (selection.type === 'setup' || selection.type === 'empty-conn')) {
      await addConnectionToSetup(selection, saveAndRefresh);

    } else {
      log("Please select a valid item to add to.");
    }
  } catch (e) {
    log(`Error adding item: ${e.message}.`);
  } finally {
    saveAndRefresh();
    treeWidget.focus();
  }
};

module.exports = { handleAdd };
