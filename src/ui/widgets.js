const blessed = require("blessed");

const screen = blessed.screen({ smartCSR: true, title: "Modbus Scanner", mouse: true });

const treeWidget = blessed.list({
  parent: screen,
  top: 0,
  left: 0,
  width: "100%",
  height: "70%",
  interactive: true,
  keys: true,
  vi: true,
  mouse: true,
  label: " Connections Tree ",
  border: { type: "line", fg: "white" },
  scrollbar: { ch: ' ', style: { bg: 'cyan' }, track: { bg: 'grey' } },
  invertSelected: false,
  style: {
    selected: { inverse: true },
    item: { fg: "white" }
  },
  tags: true
});

const logWidget = blessed.log({
  parent: screen,
  top: "70%",
  left: 0,
  bottom: 3,
  width: "70%",
  fg: "green",
  label: " Log ",
  border: { type: "line", fg: "green" },
  tags: true,
  scrollable: true,
  mouse: true,
  scrollbar: { ch: ' ', style: { bg: 'green' } }
});

const infoBox = blessed.box({
  parent: screen,
  top: "70%",
  left: "70%",
  bottom: 3,
  right: 0,
  label: " Status ",
  tags: true,
  border: { type: "line", fg: "cyan" },
  content: ""
});

const menuContainer = blessed.box({
  parent: screen,
  bottom: 0,
  left: 0,
  width: "100%",
  height: 3,
  valign: "middle",
  style: { bg: "white", fg: "black" },
});

const buttonRow = blessed.box({
  parent: menuContainer,
  top: 'center',
  height: 1,
  width: 'shrink',
  left: 'center',
  style: { bg: 'white', fg: 'black' }
});

const commands = [
  { key: 'C', label: 'reate setup', id: 'create' },
  { key: 'A', label: 'dd', id: 'add' },
  { key: 'E', label: 'dit', id: 'edit' },
  { key: 'D', label: 'elete', id: 'delete' },
  { key: 'R', label: 'efresh', id: 'refresh' },
  { key: 'B', label: 'ack to start', id: 'back' },
  { key: 'S', label: 'ave', id: 'save' },
  { key: 'X', label: '{inverse}/Spc{/inverse} Select', id: 'toggleSelection' },
  { key: 'Q', label: 'uit', id: 'quit' },
];

const commandButtons = {};
const GAP = 2;
let currentLeft = 1;

const stripTags = (str) => str.replace(/\{[^}]+\}/g, '');

commands.forEach(cmd => {
  const content = `{inverse}${cmd.key}{/inverse}${cmd.label}`;
  const width = stripTags(cmd.label).length + 2;

  const btn = blessed.button({
    parent: buttonRow,
    left: currentLeft,
    top: 'center',
    height: 1,
    width: width,
    content: content,
    tags: true,
    mouse: true,
    style: { bg: 'white', fg: 'black', hover: { inverse: true } }
  });

  commandButtons[cmd.id] = btn;
  currentLeft += width + GAP;
});

module.exports = {
  screen,
  treeWidget,
  logWidget,
  infoBox,
  commandButtons
};
