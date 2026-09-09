const { getTreeSelection } = require("../../state");
const { log } = require("../../utils");
const { treeWidget } = require("../../widgets");
const { askRegisterForm, askForm, askSlaveForm } = require("../../forms");
const { getFunctions } = require("../../../modbus/types");
const { editRTU, editTCP } = require("../../../connections");

const editStrategies = {
  register: async (selection, saveAndRefresh) => {
    const reg = selection.type === 'register' ? selection.data : selection.register;
    const allFunctions = getFunctions();

    const currentFuncNames = reg.functions.map(f => {
      const match = allFunctions.find(fn => fn.val === f.code);
      return match ? match.name : null;
    }).filter(x => x);

    const previousData = {
      regs: reg.register.toString(),
      funcs: currentFuncNames,
      desc: reg.description,
      sizes: reg.sizes,
      endian: reg.endianness
    };

    const result = await askRegisterForm(`Edit Register ${reg.register}`, false, previousData);

    if (result && result.registers && result.registers.length > 0) {
      const newRegData = result.registers[0];

      reg.register = newRegData.register;
      reg.description = newRegData.description;
      reg.endianness = newRegData.endianness;
      reg.sizes = newRegData.sizes;
      reg.functions = newRegData.functions;

      reg.lastError = null;
      reg.isScanning = true;

      log(`Updated register ${reg.register}`);
      saveAndRefresh();
    }
  },

  slave: async (selection, saveAndRefresh) => {
    const slave = selection.data;
    const connection = selection.connection;

    const previousData = { slaves: slave.id, unitIds: slave.unitId };
    const result = await askSlaveForm(`Edit slave ${slave.id}`, false, previousData);

    if (result === null || !result.slaves || result.slaves.length === 0) {
      log("Invalid slave input.");
      return;
    }

    const currentId = slave.id;
    const currentUnitId = slave.unitId;

    const targetSlaves = result.slaves.filter(it => {
      const isSelf = it.id === currentId && it.unitId === currentUnitId;
      const exists = connection.slaves.some(existing => existing.id === it.id && existing.unitId === it.unitId);
      return isSelf || !exists;
    });

    if (targetSlaves.length > 0) {
      const preserveIndex = targetSlaves.findIndex(s => s.id === currentId && s.unitId === currentUnitId);
      const preserveOriginal = preserveIndex !== -1;

      let slavesToCreate = [...targetSlaves];

      if (!preserveOriginal) {
        const newMain = slavesToCreate.shift();
        slave.id = newMain.id;
        slave.unitId = newMain.unitId;
        log(`Updated slave ID to ${slave.id} (Unit ID: ${slave.unitId})`);
      } else {
        slavesToCreate.splice(preserveIndex, 1);
      }

      slavesToCreate.forEach(it => {
        const newSlave = {
          id: it.id,
          unitId: it.unitId,
          expanded: false,
          registers: JSON.parse(JSON.stringify(slave.registers || [])),
          isScanning: true,
          lastError: null
        };

        if (newSlave.registers) {
          newSlave.registers.forEach(r => {
            r.isScanning = true;
            r.lastError = null;
            r.expanded = false;
          });
        }

        connection.slaves.push(newSlave);
        log(`Created copy of slave at ID ${it.id}`); // Fix: use 'it.id' not 'id'
      });

      connection.slaves.sort((a, b) => a.id - b.id);
      saveAndRefresh();
    } else {
      log("All Slave IDs already exist.");
    }
  },

  connection: async (selection, saveAndRefresh) => {
    const conn = selection.data;
    const setup = selection.setup;

    let candidateConfigs = [];
    if (conn.type === 'tcp') {
      candidateConfigs = await editTCP(conn);
    } else if (conn.type === 'rtu') {
      candidateConfigs = await editRTU(conn);
    }

    if (candidateConfigs && candidateConfigs.length > 0) {
      const sameValue = (a, b) => String(a) === String(b);

      const optionsMatch = (a, b) => {
        if (!a || !b) return false;

        if (conn.type === 'tcp')
          return sameValue(a.host, b.host) && sameValue(a.port, b.port) && sameValue(a.startAddress, b.startAddress);

        return sameValue(a.port, b.port) && sameValue(a.baudrate, b.baudrate) && sameValue(a.parity, b.parity)
          && sameValue(a.stopbit, b.stopbit) && sameValue(a.databit, b.databit) && sameValue(a.startAddress, b.startAddress);
      };

      let reusedCurrent = false;

      for (const config of candidateConfigs) {
        const alreadyExists = setup.connections.some(c => c !== conn && c.type === config.type
          && optionsMatch(c.options, config.options)
          && sameValue(c.options && c.options.timeout, config.options.timeout));
        if (alreadyExists) continue;

        if (!reusedCurrent) {
          conn.name = config.name;
          conn.options = config.options;
          reusedCurrent = true;
        } else {
          const newConn = {
            ...config,
            slaves: JSON.parse(JSON.stringify(conn.slaves)),
            expanded: false,
            isScanning: true,
            lastError: null
          };

          setup.connections.push(newConn);
        }
      }

      if (!reusedCurrent) {
        log("That connection already exists; left unchanged.");
        return;
      }

      log(`Updated connection(s).`);
      saveAndRefresh();
    }
  },

  setup: async (selection, saveAndRefresh) => {
    const setup = selection.data;
    const form = await askForm("Edit Setup Name", [
      { label: "Name", key: "name", default: setup.name }
    ]);
    const newName = form ? form.name : null;

    if (newName) {
      setup.name = newName;
      saveAndRefresh();
    }
  }
};

const handleEdit = async ({ globalConfig, saveAndRefresh }) => {
  try {
    const selection = getTreeSelection();
    if (!selection) {
      log("Nothing selected to edit.");
      return;
    }

    let type = selection.type;
    if (['function', 'endianness'].includes(type)) type = 'register';

    const strategy = editStrategies[type];

    if (strategy) {
      await strategy(selection, saveAndRefresh);
    } else {
      log(`No edit handler for type: ${type}`);
    }

  } catch (e) {
    log("Error editing: " + e.message);
  } finally {
    treeWidget.focus();
  }
};

module.exports = { handleEdit };
