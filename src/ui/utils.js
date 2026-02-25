const { logWidget, infoBox, screen } = require("./widgets");
const { getSelectionState } = require("./state");

const REG_WIDTH = 5;

const log = (msg) => {
  if (typeof msg === 'object') msg = JSON.stringify(msg);
  const time = new Date().toLocaleTimeString();
  logWidget.log(`[${time}] ${msg}`);
  screen.render();
};

const updateInfo = (text) => {
  infoBox.setContent(text);
  screen.render();
};

const padStart = (str, length, padChar = ' ') => {
  str = String(str);
  padChar = String(padChar);
  if (str.length >= length) return str;
  const padCount = length - str.length;
  return padChar.repeat(Math.ceil(padCount / padChar.length)).substring(0, padCount) + str;
}

const genArrow = (error, expanded, isScanning, showArrow = false) => {
  const arrow = expanded ? "▼" : "▶";
  if (isScanning) return (showArrow ? arrow : " ") + " {yellow-fg}⧗{/yellow-fg}"
  if (error) return (showArrow ? arrow : " ") + " {red-fg}✖{/red-fg}";
  return `${arrow} {green-fg}✔{/green-fg}`
}

const getSelectionPrefix = (data) => {
  const { selectedItems } = getSelectionState();
  return selectedItems.has(data) ? "{yellow-fg}[*]{/yellow-fg} " : "";
}

module.exports = {
  log,
  updateInfo,
  padStart,
  genArrow,
  getSelectionPrefix,
  REG_WIDTH
};
