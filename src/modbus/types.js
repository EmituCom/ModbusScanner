const { Int64BE, Uint64BE } = require('int64-buffer');
const { parseBatchInput } = require('../utils');

const SUBTYPE_16 = [
  { type: 's16', name: 'Signed 16-bit  ' },
  { type: 'u16', name: 'Unsigned 16-bit' }
];

const SUBTYPE_32 = [
  { type: 's32', name: 'Signed 32-bit  ' },
  { type: 'u32', name: 'Unsigned 32-bit' },
  { type: 'f', name: 'Float          ' }
];

const SUBTYPE_64 = [
  { type: 's64', name: 'Signed 64-bit  ' },
  { type: 'u64', name: 'Unsigned 64-bit' },
  { type: 'd', name: 'Double         ' }
];

const SIZES = [
  { groupName: 'WORD  (16-bit)', type: '16', size: 1, subtypes: SUBTYPE_16 },
  { groupName: 'DWORD (32-bit)', type: '32', size: 2, subtypes: SUBTYPE_32 },
  { groupName: 'LWORD (64-bit)', type: '64', size: 4, subtypes: SUBTYPE_64 }
];
const getSizes = () => SIZES;

const ENDIANNESS = ["ABCD", "DCBA", "BADC", "CDAB"];
const getEndianness = () => ENDIANNESS;

const FUNCTIONS = [
  { name: 'Read Coils (0x01)', val: 1, type: 'bit' },
  { name: 'Read Holding Registers (0x03)', val: 3, type: 'word' },
  { name: 'Read Input Registers (0x04)', val: 4, type: 'word' }
];
const getFunctions = () => FUNCTIONS;

const reorderBuffer = (b, endianPattern) => {
  const len = b.length;
  const buf = Buffer.from(b);

  switch (endianPattern) {
    case "ABCD":
      return buf;
    case "DCBA":
      for (let i = 0, j = buf.length - 1; i < j; i++, j--) {
        const temp = buf[i];
        buf[i] = buf[j];
        buf[j] = temp;
      }
      return buf;
    case "BADC":
      if (len % 2 !== 0) throw '{red-fg}Cannot apply BADC because buffer is mal formatted, and not divisable by 2.{/red-fg}';
      for (let i = 0; i < len; i += 2) {
        [buf[i], buf[i + 1]] = [buf[i + 1], buf[i]];
      }
      return buf;
    case "CDAB":
      if (len % 4 !== 0) throw '{red-fg}Cannot apply CDAB because buffer is mal formatted, and not divisable by 4.{/red-fg}';
      for (let i = 0; i < len; i += 4) {
        [buf[i], buf[i + 2]] = [buf[i + 2], buf[i]];
        [buf[i + 1], buf[i + 3]] = [buf[i + 3], buf[i + 1]];
      }
      return buf;
    default:
      return buf;
  }
}

const interpretBuffer = (buffer, endianness, type) => {
  try {
    const buf = reorderBuffer(buffer, endianness);
    const signed = type.startsWith('s');

    switch (type) {
      case "u16":
      case "s16":
        return signed ? buf.readInt16BE() : buf.readUInt16BE();
      case "u32":
      case "s32":
        return signed ? buf.readInt32BE() : buf.readUInt32BE();
      case "u64":
      case "s64":
        const final = signed ? new Int64BE(buf) : new Uint64BE(buf);
        return final.toNumber();
      case "f":
        return buf.readFloatBE();
      case "d":
        return buf.readDoubleBE();
      default:
        return buf.toString('hex');
    }
  } catch (e) {
    return `{red-fg}${e}{/red-fg}`
  }
}

const createRegister = (addr, description = "", endianness = null, sizes = null, functionCodes = [3]) => {
  if (isNaN(addr)) return null;

  const validCodes = (functionCodes && functionCodes.length > 0) ? functionCodes : [3];

  const functions = validCodes.map(code => ({
    code: code,
    expanded: false,
    lastRawBit: undefined, lastErrorBit: null,
    lastRaw16: undefined, lastError16: null, expanded16: false,
    lastRaw32: undefined, lastError32: null, expanded32: false,
    lastRaw64: undefined, lastError64: null, expanded64: false,
  }));

  return {
    register: addr,
    description: description,
    endianness: endianness || ENDIANNESS,
    sizes: sizes || SIZES.map(s => s.type),
    functions: functions,
    lastError: null,
    expanded: false,
    isScanning: true
  };
};

const parseBatchRegisters = (input, description = "", endianness = null, sizes = null, functionCodes = [3]) => {
  const parseValue = (val) => {
    const str = String(val).trim().toLowerCase();

    if (str.startsWith('0x'))
      return parseInt(str, 16);
    return parseInt(str, 10);
  };

  const rawRegs = parseBatchInput(input);
  if (!rawRegs || rawRegs.length === 0) return null;

  const results = [];

  for (const raw of rawRegs) {
    const sanitizedValue = parseValue(raw);
    if (isNaN(sanitizedValue)) return null;

    const register = createRegister(sanitizedValue, description, endianness, sizes, functionCodes);
    results.push(register);
  }

  return results;
};

module.exports = {
  createRegister,
  parseBatchRegisters,
  interpretBuffer,
  getSizes,
  getEndianness,
  getFunctions
};
