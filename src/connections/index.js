const manager = require('./manager');
const rtu = require('./rtu');
const tcp = require('./tcp');

module.exports = { ...manager, ...rtu, ...tcp };
