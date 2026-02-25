const widgets = require("./widgets");
const state = require("./state");
const utils = require("./utils");
const render = require("./render");
const handlers = require("./handlers");
const forms = require("./forms");
const workflows = require("./workflows");

module.exports = {
  ...widgets,
  ...utils,
  ...state,
  ...handlers,
  ...forms,
  ...workflows,
  updateTree: render.updateTree,
};
