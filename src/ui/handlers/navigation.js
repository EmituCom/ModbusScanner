const { updateTree } = require("../render");
const { treeWidget } = require("../widgets");
const { toggleSelection, findItemIndex, getTreeSelection, getTreeRowMap } = require("../state");
const { log } = require("../utils");

const SELECTIONS = ['setup', 'connection', 'slave', 'register', 'function', 'endianness', 'subtypes'];

const handleEnter = ({ globalConfig }) => {
  const selection = getTreeSelection();
  if (!selection) return;

  let changed = false;
  if (selection.type === 'endianness') {
    const key = `expanded${selection.baseKey}`
    selection.funcObj[key] = !selection.funcObj[key];
    changed = true;
  } else if (SELECTIONS.includes(selection.type)) {
    selection.data.expanded = !selection.data.expanded;
    changed = true;
  }

  if (changed) updateTree(globalConfig.setups);
};

const handleRight = ({ globalConfig }) => {
  const selection = getTreeSelection();
  if (!selection) return;

  if (selection.type === 'endianness') {
    const key = `expanded${selection.baseKey}`
    if (selection.funcObj[key] === true) return;
    selection.funcObj[key] = true;
  } else if (SELECTIONS.includes(selection.type)) {
    if (selection.data.expanded === true) return;
    selection.data.expanded = true;
  }

  updateTree(globalConfig.setups);
}

const handleLeft = ({ globalConfig }) => {
  const selection = getTreeSelection();
  if (!selection) return;

  let index = findItemIndex(selection.data, SELECTIONS);

  if (selection.type === 'subtypes') {
    selection.funcObj[`expanded${selection.baseKey}`] = false;
    index = getTreeRowMap().findIndex(row => row && row.type === 'endianness' && row.endiannessData === selection.endiannessData && row.funcObj === selection.funcObj);
  } else if (selection.type === 'endianness') {
    const key = `expanded${selection.baseKey}`;
    if (selection.funcObj[key] === false) {
      selection.funcObj.expanded = false;
      index = findItemIndex(selection.funcObj, SELECTIONS);
    }
    selection.funcObj[key] = false;
  } else if (selection.type === 'function') {
    if (selection.data.expanded === false) {
      selection.register.expanded = false;
      index = findItemIndex(selection.register, SELECTIONS);
    }
    selection.data.expanded = false;
  } else if (selection.type === 'register') {
    if (selection.data.expanded === false) {
      selection.slave.expanded = false
      index = findItemIndex(selection.slave, SELECTIONS);
    }
    selection.data.expanded = false
  } else if (selection.type === 'slave') {
    if (selection.data.expanded === false) {
      selection.connection.expanded = false
      index = findItemIndex(selection.connection, SELECTIONS);
    }
    selection.data.expanded = false
  } else if (selection.type === 'connection') {
    if (selection.data.expanded === false) {
      selection.setup.expanded = false;
      index = findItemIndex(selection.setup, SELECTIONS);
    }
    selection.data.expanded = false;
  } else if (selection.type === 'setup') {
    selection.data.expanded = false;
  }

  if (index !== -1 && index !== undefined)
    treeWidget.select(index);

  updateTree(globalConfig.setups);
}

const handleToggleSelection = ({ globalConfig }) => {
  const selection = getTreeSelection();
  if (!selection) return;

  if (['register', 'slave', 'connection'].includes(selection.type)) {
    const success = toggleSelection(selection.data, selection.type);
    if (!success) {
      log("Cannot select mixed types.");
    }
    updateTree(globalConfig.setups);
  }
};

module.exports = { handleEnter, handleRight, handleLeft, handleToggleSelection };
