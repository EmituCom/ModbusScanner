const os = require('os');
const util = require("util");
const exec = util.promisify(require("child_process").exec);

function getAllIPs() {
  const nets = os.networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4') {
        const parts = net.address.split('.');
        parts[3] = "#";
        results.push(parts.join('.'));
      }
    }
  }

  return results;
}

const getSerialPorts = async () => {
  try {
    const { stdout } = await exec("ls -l /dev/tty*");
    return stdout
      .split("\n")
      .filter(line => line.includes("/dev/tty"))
      .map(line => {
        const parts = line.split(/\s+/);
        return {
          path: parts[parts.length - 1],
          group: parts[3]
        };
      })
      .filter(device => device.group === "dialout")
      .map(device => device.path);
  } catch (e) {
    return [];
  }
};

const expandRange = (str) => {
  const result = new Set();
  const parts = str.split(',').map(s => s.trim()).filter(s => s);

  parts.forEach(part => {
    const spliter = part.includes('..') ? '..' : '-'
    if (part.includes(spliter)) {
      const [start, end] = part.split(spliter).map(n => parseInt(n));
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        for (let i = min; i <= max; i++) result.add(i);
      }
    } else {
      const num = parseInt(part);
      if (!isNaN(num)) result.add(num);
    }
  });

  return Array.from(result).sort((a, b) => a - b);
}

const expandList = (str) => {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(s => s);
}

const parseBatchInput = (input) => {
  const inputs = [];
  const parts = expandList(input)

  parts.forEach(part => {
    if (part.includes('..') || part.includes('-')) {
      const range = expandRange(part);
      range.forEach(it => inputs.push(it));
    } else {
      const parsed = parseInt(part);
      if (!isNaN(parsed)) inputs.push(parsed);
    }
  });

  return inputs.length === 0 ? null : inputs;
};

const validateBatchInput = (input) => {
  if (!input || input.trim() === '') return "Cannot be empty";
  const res = parseBatchInput(input);
  return (res && res.length > 0) ? true : "Invalid format (e.g. 1, 5..10).";
}

const validateIP = (ip) => {
  if (Array.isArray(ip)) ip = ip[0];
  if (!ip) return "IP Required";

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip) && ip.split('.').every(o => parseInt(o) <= 255)) return true;

  if (ip.includes('#')) return true;

  return "Invalid IPv4 Address";
}

module.exports = { expandRange, expandList, parseBatchInput, validateBatchInput, validateIP, getAllIPs, getSerialPorts };
