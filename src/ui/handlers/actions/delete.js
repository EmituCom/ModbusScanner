const { getTreeSelection, getSelectionState, clearSelection, getTreeRowMap } = require("../../state");
const { log } = require("../../utils");
const { treeWidget } = require("../../widgets");
const { askYesOrNo } = require("../../forms");

const handleDelete = async ({ globalConfig, saveAndRefresh }) => {
  try {
    const selection = getTreeSelection();
    const { selectedItems, selectionType } = getSelectionState();

    if (selectedItems.size > 0) {
      const confirm = await askYesOrNo(`Delete ${selectedItems.size} items?`, false);
      if (!confirm) return;

      const treeMap = getTreeRowMap();
      let deletedCount = 0;

      selectedItems.forEach(item => {
        const row = treeMap.find(r => r && r.data === item);

        if (row) {
          if (selectionType === 'register') {
            const slave = row.slave;
            const idx = slave.registers.indexOf(item);
            if (idx > -1) {
              slave.registers.splice(idx, 1);
              deletedCount++;
            }
          } else if (selectionType === 'slave') {
            const conn = row.connection;
            const idx = conn.slaves.indexOf(item);
            if (idx > -1) {
              conn.slaves.splice(idx, 1);
              deletedCount++;
            }
          } else if (selectionType === 'connection') {
            const setup = row.setup;
            const idx = setup.connections.indexOf(item);
            if (idx > -1) {
              setup.connections.splice(idx, 1);
              deletedCount++;
            }
          }
        }
      });

      log(`Deleted ${deletedCount} items.`);
      clearSelection();
      saveAndRefresh();
      return;
    }

    if (!selection) {
      log("Nothing selected to delete.");
      return;
    }

    let itemDeleted = false;

    if (selection.type === 'setup') {
      const confirm = await askYesOrNo(`Delete Setup "${selection.data.name}"?`, false);
      if (confirm) {
        const idx = globalConfig.setups.indexOf(selection.data);
        if (idx > -1) {
          globalConfig.setups.splice(idx, 1);
          itemDeleted = true;
        }
      }
    } else if (selection.type === 'connection') {
      const confirm = await askYesOrNo(`Delete Connection "${selection.data.name}"?`, false);
      if (confirm) {
        const setup = selection.setup;
        const idx = setup.connections.indexOf(selection.data);
        if (idx > -1) {
          setup.connections.splice(idx, 1);
          itemDeleted = true;
        }
      }
    } else if (selection.type === 'slave') {
      const confirm = await askYesOrNo(`Delete Slave ${selection.data.id}?`, false);
      if (confirm) {
        const conn = selection.connection;
        const idx = conn.slaves.indexOf(selection.data);
        if (idx > -1) {
          conn.slaves.splice(idx, 1);
          itemDeleted = true;
        }
      }
    } else if (selection.type === 'register') {
      const confirm = await askYesOrNo(`Delete register ${selection.data.register}?`, false);
      if (confirm) {
        const slave = selection.slave;
        const idx = slave.registers.indexOf(selection.data);
        if (idx > -1) {
          slave.registers.splice(idx, 1);
          itemDeleted = true;
        }
      }
    }

    if (itemDeleted) {
      log(`Deleted ${selection.type}.`);
      saveAndRefresh();
    }

  } catch (e) {
    log("Error deleting: " + e.message);
  } finally {
    treeWidget.focus();
  }
};

module.exports = { handleDelete };
