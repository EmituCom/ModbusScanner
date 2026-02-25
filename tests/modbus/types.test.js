'use strict';

const { interpretBuffer, createRegister, parseBatchRegisters, getSizes, getEndianness } = require('../../src/modbus/types');

// --- interpretBuffer: data types ---

describe('interpretBuffer — data types (ABCD)', () => {
  test('reads an unsigned 16-bit integer', () => {
    const buf = Buffer.from([0x00, 0x0A]);
    expect(interpretBuffer(buf, 'ABCD', 'u16')).toBe(10);
  });

  test('reads a signed 16-bit negative integer', () => {
    const buf = Buffer.from([0xFF, 0xF6]);
    expect(interpretBuffer(buf, 'ABCD', 's16')).toBe(-10);
  });

  test('reads an unsigned 32-bit integer', () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x0A]);
    expect(interpretBuffer(buf, 'ABCD', 'u32')).toBe(10);
  });

  test('reads a signed 32-bit negative integer', () => {
    const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xF6]);
    expect(interpretBuffer(buf, 'ABCD', 's32')).toBe(-10);
  });

  test('reads an unsigned 64-bit integer', () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0A]);
    expect(interpretBuffer(buf, 'ABCD', 'u64')).toBe(10);
  });

  test('reads a signed 64-bit negative integer', () => {
    const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xF6]);
    expect(interpretBuffer(buf, 'ABCD', 's64')).toBe(-10);
  });

  test('reads a 32-bit float', () => {
    const buf = Buffer.from([0x3F, 0x80, 0x00, 0x00]); // 1.0 as IEEE 754
    expect(interpretBuffer(buf, 'ABCD', 'f')).toBeCloseTo(1.0);
  });

  test('reads a 64-bit double', () => {
    const buf = Buffer.from([0x3F, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); // 1.0
    expect(interpretBuffer(buf, 'ABCD', 'd')).toBeCloseTo(1.0);
  });

  test('returns hex string for unknown type', () => {
    const buf = Buffer.from([0xAB, 0xCD]);
    expect(interpretBuffer(buf, 'ABCD', 'unknown')).toBe('abcd');
  });
});

// --- interpretBuffer: endianness ---

describe('interpretBuffer — endianness', () => {
  test('ABCD is identity (big-endian)', () => {
    const buf = Buffer.from([0x00, 0x0A]);
    expect(interpretBuffer(buf, 'ABCD', 'u16')).toBe(10);
  });

  test('DCBA reverses byte order', () => {
    // DCBA of [0x0A, 0x00] → reversed → [0x00, 0x0A] → 10
    const buf = Buffer.from([0x0A, 0x00]);
    expect(interpretBuffer(buf, 'DCBA', 'u16')).toBe(10);
  });

  test('BADC swaps byte pairs', () => {
    // BADC of [0x00, 0x00, 0x0A, 0x00] → swap pairs → [0x00, 0x00, 0x00, 0x0A] → 10
    const buf = Buffer.from([0x00, 0x00, 0x0A, 0x00]);
    expect(interpretBuffer(buf, 'BADC', 'u32')).toBe(10);
  });

  test('CDAB swaps word pairs', () => {
    // CDAB of [0x00, 0x0A, 0x00, 0x00] → swaps → [0x00, 0x00, 0x00, 0x0A] → 10
    const buf = Buffer.from([0x00, 0x0A, 0x00, 0x00]);
    expect(interpretBuffer(buf, 'CDAB', 'u32')).toBe(10);
  });

  test('BADC returns an error string for odd-length buffer', () => {
    const buf = Buffer.from([0x01, 0x02, 0x03]);
    const result = interpretBuffer(buf, 'BADC', 'u16');
    expect(result).toMatch(/red-fg/); // blessed error tag
  });

  test('CDAB returns an error string for buffer not divisible by 4', () => {
    const buf = Buffer.from([0x01, 0x02]);
    const result = interpretBuffer(buf, 'CDAB', 'u32');
    expect(result).toMatch(/red-fg/);
  });
});

// --- createRegister ---

describe('createRegister', () => {
  test('creates a register with the correct address', () => {
    const reg = createRegister(5);
    expect(reg.register).toBe(5);
  });

  test('sets default description to empty string', () => {
    const reg = createRegister(5);
    expect(reg.description).toBe('');
  });

  test('uses the provided description', () => {
    const reg = createRegister(5, 'Temperature');
    expect(reg.description).toBe('Temperature');
  });

  test('defaults endianness to all four patterns', () => {
    const reg = createRegister(5);
    expect(reg.endianness).toEqual(getEndianness());
  });

  test('defaults sizes to all available sizes', () => {
    const reg = createRegister(5);
    expect(reg.sizes).toEqual(getSizes().map(s => s.type));
  });

  test('defaults function code to FC03 (holding registers)', () => {
    const reg = createRegister(5);
    expect(reg.functions).toHaveLength(1);
    expect(reg.functions[0].code).toBe(3);
  });

  test('accepts multiple function codes', () => {
    const reg = createRegister(5, '', null, null, [1, 3, 4]);
    expect(reg.functions.map(f => f.code)).toEqual([1, 3, 4]);
  });

  test('falls back to FC03 when an empty function code array is provided', () => {
    const reg = createRegister(5, '', null, null, []);
    expect(reg.functions[0].code).toBe(3);
  });

  test('sets isScanning to true', () => {
    const reg = createRegister(5);
    expect(reg.isScanning).toBe(true);
  });

  test('sets expanded to false', () => {
    const reg = createRegister(5);
    expect(reg.expanded).toBe(false);
  });

  test('returns null for NaN address', () => {
    expect(createRegister(NaN)).toBeNull();
    expect(createRegister('abc')).toBeNull();
  });
});

// --- parseBatchRegisters ---

describe('parseBatchRegisters', () => {
  test('parses comma-separated addresses into register objects', () => {
    const result = parseBatchRegisters('1,2,3');
    expect(result).toHaveLength(3);
    expect(result.map(r => r.register)).toEqual([1, 2, 3]);
  });

  test('parses a range into register objects', () => {
    const result = parseBatchRegisters('1-3');
    expect(result).toHaveLength(3);
    expect(result.map(r => r.register)).toEqual([1, 2, 3]);
  });

  test('parses a hexadecimal address', () => {
    const result = parseBatchRegisters('0x0A');
    expect(result).toHaveLength(1);
    expect(result[0].register).toBe(10);
  });

  test('returns null for empty input', () => {
    expect(parseBatchRegisters('')).toBeNull();
  });

  test('returns null for null input', () => {
    expect(parseBatchRegisters(null)).toBeNull();
  });

  test('returns null for non-numeric input', () => {
    expect(parseBatchRegisters('abc')).toBeNull();
  });

  test('passes description through to each register', () => {
    const result = parseBatchRegisters('1,2', 'Voltage');
    expect(result[0].description).toBe('Voltage');
    expect(result[1].description).toBe('Voltage');
  });

  test('each register is an independent object (deep copy)', () => {
    const result = parseBatchRegisters('1,2');
    result[0].description = 'changed';
    expect(result[1].description).toBe('');
  });
});
