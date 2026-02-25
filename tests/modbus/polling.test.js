'use strict';

jest.mock('../../src/modbus/scanner', () => ({
  readRegistersOnce: jest.fn()
}));

const { readRegistersOnce } = require('../../src/modbus/scanner');
const { setAsScanning, runScanLoop } = require('../../src/modbus/polling');

const makeConfig = () => ({
  setups: [{
    connections: [{
      type: 'tcp',
      options: {},
      isScanning: true,
      slaves: [{ registers: [], lastError: null, isScanning: true }]
    }]
  }]
});

// --- setAsScanning ---

describe('setAsScanning', () => {
  test('marks connections, slaves and registers as scanning', () => {
    const config = {
      setups: [{
        connections: [{
          slaves: [{ registers: [{ isScanning: false }] }]
        }]
      }]
    };
    setAsScanning(config);
    const conn = config.setups[0].connections[0];
    expect(conn.isScanning).toBe(true);
    expect(conn.slaves[0].isScanning).toBe(true);
    expect(conn.slaves[0].registers[0].isScanning).toBe(true);
  });

  test('defaults expanded to false when not set', () => {
    const config = { setups: [{ connections: [{ slaves: [] }] }] };
    setAsScanning(config);
    expect(config.setups[0].connections[0].expanded).toBe(false);
  });

  test('does not overwrite an existing expanded value', () => {
    const config = { setups: [{ connections: [{ expanded: true, slaves: [] }] }] };
    setAsScanning(config);
    expect(config.setups[0].connections[0].expanded).toBe(true);
  });

  test('handles a setup with no connections key', () => {
    expect(() => setAsScanning({ setups: [{}] })).not.toThrow();
  });

  test('handles a connection with no slaves', () => {
    expect(() => setAsScanning({ setups: [{ connections: [{}] }] })).not.toThrow();
  });

  test('handles empty setups array', () => {
    expect(() => setAsScanning({ setups: [] })).not.toThrow();
  });

  test('handles missing setups key', () => {
    expect(() => setAsScanning({})).not.toThrow();
  });
});

// --- runScanLoop ---

describe('runScanLoop', () => {
  let refreshInfo;
  let onUpdate;
  let client;

  beforeEach(() => {
    refreshInfo = jest.fn();
    onUpdate = jest.fn();
    client = {};
    readRegistersOnce.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('calls refreshInfo immediately when setups is empty', async () => {
    await runScanLoop(client, { setups: [] }, refreshInfo, onUpdate);
    expect(refreshInfo).toHaveBeenCalledTimes(1);
  });

  test('does not call readRegistersOnce when setups is empty', async () => {
    await runScanLoop(client, { setups: [] }, refreshInfo, onUpdate);
    expect(readRegistersOnce).not.toHaveBeenCalled();
  });

  test('calls readRegistersOnce for each slave', async () => {
    const slave1 = { registers: [], lastError: null };
    const slave2 = { registers: [], lastError: null };
    const config = {
      setups: [{
        connections: [{ type: 'tcp', options: {}, slaves: [slave1, slave2] }]
      }]
    };
    await runScanLoop(client, config, refreshInfo, onUpdate);
    expect(readRegistersOnce).toHaveBeenCalledTimes(2);
    expect(readRegistersOnce).toHaveBeenCalledWith(client, expect.any(Object), slave1);
    expect(readRegistersOnce).toHaveBeenCalledWith(client, expect.any(Object), slave2);
  });

  test('marks slave as not scanning after scan', async () => {
    const slave = { registers: [], lastError: null, isScanning: true };
    const config = { setups: [{ connections: [{ type: 'tcp', options: {}, slaves: [slave] }] }] };
    await runScanLoop(client, config, refreshInfo, onUpdate);
    expect(slave.isScanning).toBe(false);
  });

  test('marks connection as not scanning after all slaves finish', async () => {
    const conn = { type: 'tcp', options: {}, slaves: [{ registers: [], lastError: null }] };
    await runScanLoop(client, { setups: [{ connections: [conn] }] }, refreshInfo, onUpdate);
    expect(conn.isScanning).toBe(false);
  });

  test('marks setup as not scanning after all connections finish', async () => {
    const setup = { connections: [{ type: 'tcp', options: {}, slaves: [{ registers: [], lastError: null }] }] };
    await runScanLoop(client, { setups: [setup] }, refreshInfo, onUpdate);
    expect(setup.isScanning).toBe(false);
  });

  test('calls onUpdate after each slave scan', async () => {
    await runScanLoop(client, makeConfig(), refreshInfo, onUpdate);
    expect(onUpdate).toHaveBeenCalled();
  });

  test('calls refreshInfo after all scans complete', async () => {
    await runScanLoop(client, makeConfig(), refreshInfo, onUpdate);
    expect(refreshInfo).toHaveBeenCalled();
  });

  test('sets connection lastError when all slaves fail', async () => {
    readRegistersOnce.mockImplementation(async (c, conn, slave) => {
      slave.lastError = 'Timed out';
    });
    const conn = { type: 'tcp', options: {}, slaves: [{ registers: [], lastError: null }] };
    await runScanLoop(client, { setups: [{ connections: [conn] }] }, refreshInfo, onUpdate);
    expect(conn.lastError).toBe('Timed out');
  });

  test('clears connection lastError when at least one slave succeeds', async () => {
    readRegistersOnce
      .mockImplementationOnce(async (c, conn, slave) => { slave.lastError = 'Timed out'; })
      .mockImplementationOnce(async (c, conn, slave) => { slave.lastError = null; });
    const conn = {
      type: 'tcp', options: {},
      slaves: [
        { registers: [], lastError: null },
        { registers: [], lastError: null }
      ]
    };
    await runScanLoop(client, { setups: [{ connections: [conn] }] }, refreshInfo, onUpdate);
    expect(conn.lastError).toBeNull();
  });

  test('returns early without scanning if isActive returns false', async () => {
    const isActive = jest.fn().mockReturnValue(false);
    await runScanLoop(client, makeConfig(), refreshInfo, onUpdate, isActive);
    expect(readRegistersOnce).not.toHaveBeenCalled();
    expect(refreshInfo).not.toHaveBeenCalled();
  });

  test('proceeds normally if isActive returns true', async () => {
    const isActive = jest.fn().mockReturnValue(true);
    await runScanLoop(client, makeConfig(), refreshInfo, onUpdate, isActive);
    expect(readRegistersOnce).toHaveBeenCalled();
  });

  test('proceeds normally when isActive is not provided', async () => {
    await runScanLoop(client, makeConfig(), refreshInfo, onUpdate);
    expect(readRegistersOnce).toHaveBeenCalled();
  });
});
