const navigation = require('./navigation');
const system = require('./system');
const add = require('./actions/add');
const edit = require('./actions/edit');
const del = require('./actions/delete');

module.exports = {
  ...navigation,
  ...system,
  ...add,
  ...edit,
  ...del
};
