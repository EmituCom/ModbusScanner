const { treeWidget } = require('./widgets')

let _modalOpen = false;
let selectedItems = new Set();
let selectionType = null;
let treeRowMap = [];

const setModalOpen = (val) => _modalOpen = val;
const isModalOpen = () => _modalOpen;

const getSelectionState = () => ({ selectedItems, selectionType });

const getTreeRowMap = () => treeRowMap;
const setTreeRowMap = (map) => treeRowMap = map;

const toggleSelection = (item, type) => {
  if (selectedItems.size === 0)
    selectionType = type;

  if (selectionType !== type) return false;

  if (selectedItems.has(item))
    selectedItems.delete(item);
  else
    selectedItems.add(item);

  if (selectedItems.size === 0)
    selectionType = null;

  return true;
};

const clearSelection = () => {
  selectedItems.clear();
  selectionType = null;
};

const findItemIndex = (dataObj, selections) => {
  return treeRowMap.findIndex(row => row && row.data === dataObj && selections.includes(row.type));
};

const getTreeSelection = () => {
  const index = treeWidget.selected;
  return treeRowMap[index] || null;
};

module.exports = {
  setModalOpen,
  isModalOpen,
  getSelectionState,
  toggleSelection,
  clearSelection,
  findItemIndex,
  getTreeSelection,
  getTreeRowMap,
  setTreeRowMap
};
