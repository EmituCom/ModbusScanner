const { askChoice, askForm, askRegisterForm, askSlaveForm } = require("../ui/forms");
const { getSerialPorts } = require('../utils');
const { parseBatchInput, validateBatchInput, validateIP, getAllIPs } = require("../utils");

// A checkbox group matches its defaults as strings, and an empty list means
// "nothing preselected" - so a stored value must always reach the form as a
// non-empty string, even when it is a number or is missing from the options.
const isBlank = (value) =>
  value === undefined || value === null || value === "" || (typeof value === "number" && isNaN(value));

const asDefaultList = (value, fallback) => {
  const v = isBlank(value) ? fallback : value;
  if (isBlank(v)) return [];
  return (Array.isArray(v) ? v : [v]).filter(x => !isBlank(x)).map(String);
};

const asDefaultText = (value, fallback) => {
  const v = isBlank(value) ? fallback : value;
  return isBlank(v) ? "" : String(v);
};

// A checkbox group has no validator of its own, so an empty selection would
// silently produce zero connections and discard the edit.
const validateSelection = (label) => (value) =>
  (Array.isArray(value) ? value.length > 0 : !!value) ? true : `Select at least one ${label}`;

const promptForConnections = async () => {
  const type = await askChoice("Connection Type", [
    { cli: "TCP / IP", val: "tcp" },
    { cli: "Serial (RTU)", val: "rtu" }
  ]);

  if (!type) return null;

  let tmpRegisters = [];
  let lastRegisterFormData = null;
  let tmpSlaves = [];
  let lastSlavesFormData = null;

  const registerButton = async () => {
    const result = await askRegisterForm(`Add registers`, true, lastRegisterFormData);
    if (result) {
      tmpRegisters = result.registers;
      lastRegisterFormData = result.formData;
      return `Configured (${tmpRegisters.length})`;
    }
    return null;
  };

  const slaveButton = async () => {
    const result = await askSlaveForm(`Add slaves`, true, lastSlavesFormData);
    if (result) {
      tmpSlaves = result.slaves;
      lastSlavesFormData = result.formData;
      return `Configured (${tmpSlaves.length})`;
    }
    return null;
  };

  const extraForm = [
    { label: "Config slaves", key: "slaveTrigger", default: "Click to Configure Slaves (0)", button: slaveButton },
    { label: "Config registers", key: "regTrigger", default: "Click to Configure Registers (0)", button: registerButton }
  ];

  let promptResult = type === "rtu" ? await promptRTU(extraForm) : await promptTCP(extraForm);
  if (!promptResult) return null;

  const { connectionConfigs } = promptResult;
  if (connectionConfigs.length === 0) return null;

  const finalConnections = connectionConfigs.map(conn => {
    const slaves = tmpSlaves.map(it => ({
      id: it.id,
      unitId: it.unitId,
      expanded: false,
      registers: JSON.parse(JSON.stringify(tmpRegisters))
    }));

    return { ...conn, slaves: slaves };
  });

  return finalConnections;
};

const promptRTU = async (extraFields = []) => {
  const ports = await getSerialPorts();

  const contentForm = await askForm("RTU configuration", [
    { label: "Ports", key: "ports", default: [], options: ports, custom: true, validate: validateSelection("port") },
    { label: "Baud Rates", key: "bauds", options: ["9600", "19200", "38400", "57600", "115200"], default: ["9600"], custom: true },
    { label: "Parity", key: "parities", options: ["none", "even", "odd"], default: ["none"] },
    { label: "Stop Bits", key: "stops", options: ["1", "2"], default: ["1"] },
    { label: "Data Bits", key: "data", options: ["8", "7"], default: ["8"] },
    { label: "Start Address", key: "startAddresses", default: "0", hint: "A comma separated list (e.g. 0, 1).", validate: validateBatchInput },
    { label: "Timeout", key: "timeout", default: "800", hint: "A timeout in milliseconds. (e.g. 800)." },
    ...extraFields
  ]);

  if (!contentForm) return null;

  const connectionConfigs = [];
  const portList = contentForm.ports;
  const baudList = contentForm.bauds.map(Number);
  const parityList = contentForm.parities;
  const stopList = contentForm.stops.map(Number);
  const dataList = contentForm.data.map(Number);
  const startAddresses = parseBatchInput(contentForm.startAddresses) || [];
  const timeout = parseInt(contentForm.timeout, 10);

  for (const p of portList) {
    for (const b of baudList) {
      for (const par of parityList) {
        for (const s of stopList) {
          for (const d of dataList) {
            for (const start of startAddresses) {
              connectionConfigs.push({
                name: `${p}@${b} ${d} ${par} (start address ${start}) `,
                type: 'rtu',
                options: { port: p, baudrate: b, parity: par, stopbit: s, databit: d, startAddress: start, timeout }
              });
            }
          }
        }
      }
    }
  }

  return { connectionConfigs, formData: contentForm };
};

const editRTU = async (conn) => {
  const ports = await getSerialPorts();
  const candidateConfigs = [];
  const options = conn.options || {};

  const formResult = await askForm("Edit RTU configuration", [
    { label: "Ports", key: "ports", default: asDefaultList(options.port), options: ports, custom: true, validate: validateSelection("port") },
    { label: "Baud Rates", key: "bauds", options: ["9600", "19200", "38400", "57600", "115200"], default: asDefaultList(options.baudrate, "9600"), custom: true },
    { label: "Parity", key: "parities", options: ["none", "even", "odd"], default: asDefaultList(options.parity, "none") },
    { label: "Stop Bits", key: "stops", options: ["1", "2"], default: asDefaultList(options.stopbit, "1") },
    { label: "Data Bits", key: "data", options: ["8", "7"], default: asDefaultList(options.databit, "8") },
    { label: "Start Address", key: "startAddress", default: asDefaultText(options.startAddress, "0"), hint: "Comma separated (e.g. 0, 1).", validate: validateBatchInput },
    { label: "Timeout", key: "timeout", default: asDefaultText(options.timeout, "800"), hint: "A timeout in milliseconds. (e.g. 800)." }
  ]);

  if (formResult) {
    const portList = formResult.ports;
    const baudList = formResult.bauds.map(Number);
    const parityList = formResult.parities;
    const stopList = formResult.stops.map(Number);
    const dataList = formResult.data.map(Number);
    const startAddresses = parseBatchInput(formResult.startAddress) || [];
    const timeout = parseInt(formResult.timeout, 10);

    for (const p of portList) {
      for (const b of baudList) {
        for (const par of parityList) {
          for (const s of stopList) {
            for (const d of dataList) {
              for (const start of startAddresses) {
                candidateConfigs.push({
                  name: `${p}@${b} ${d} ${par} (start address ${start}) `,
                  type: 'rtu',
                  options: { port: p, baudrate: b, parity: par, stopbit: s, databit: d, startAddress: start, timeout }
                });
              }
            }
          }
        }
      }
    }
  }

  return candidateConfigs;
}

const promptTCP = async (extraFields = []) => {
  const ips = getAllIPs()

  const contentForm = await askForm("TCP Configuration", [
    { label: "Host IP", key: "host", default: [], options: ips, custom: true, validate: validateIP },
    { label: "Port", key: "port", default: "502", hint: "A comma separated list (e.g. 502, 5020).", validate: validateBatchInput },
    { label: "Start Address", key: "startAddresses", default: "0", hint: "A comma separated list (e.g. 0, 1).", validate: validateBatchInput },
    { label: "Timeout", key: "timeout", default: "800", hint: "A timeout in milliseconds. (e.g. 800)." },
    ...extraFields
  ]);

  if (!contentForm) return null;

  const connectionConfigs = [];
  const portList = parseBatchInput(contentForm.port) || [];
  const startAddresses = parseBatchInput(contentForm.startAddresses) || [];
  const timeout = parseInt(contentForm.timeout, 10);

  portList.forEach(port => {
    contentForm.host.forEach(h => {
      startAddresses.forEach(s => {
        connectionConfigs.push({
          name: `${h}:${port} (start address ${s})`,
          type: 'tcp',
          options: { host: h, port, startAddress: s, timeout }
        });
      });
    });
  });

  return { connectionConfigs, formData: contentForm };
};

const editTCP = async (conn) => {
  const ips = getAllIPs();
  const options = conn.options || {};
  const candidateConfigs = [];

  const formResult = await askForm("Edit TCP Connection", [
    { label: "Host IP", key: "host", default: asDefaultList(options.host), options: ips, custom: true, validate: validateIP },
    { label: "Port", key: "port", default: asDefaultText(options.port, "502"), hint: "Comma separated (e.g. 502, 503).", validate: validateBatchInput },
    { label: "Start Address", key: "startAddress", default: asDefaultText(options.startAddress, "0"), hint: "Comma separated (e.g 0, 1).", validate: validateBatchInput },
    { label: "Timeout", key: "timeout", default: asDefaultText(options.timeout, "800"), hint: "A timeout in milliseconds. (e.g. 800)." }
  ]);

  if (formResult) {
    const hosts = formResult.host;
    const ports = parseBatchInput(formResult.port) || [];
    const startAddresses = parseBatchInput(formResult.startAddress) || [];
    const timeout = parseInt(formResult.timeout, 10);

    ports.forEach(p => {
      hosts.forEach(h => {
        startAddresses.forEach(s => {
          candidateConfigs.push({
            name: `${h}:${p} (start address ${s})`,
            type: 'tcp',
            options: { host: h, port: p, startAddress: s, timeout }
          });
        });
      });
    });
  }

  return candidateConfigs;
}

module.exports = { promptForConnections, promptRTU, editRTU, promptTCP, editTCP };
