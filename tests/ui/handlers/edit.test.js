'use strict';

jest.mock('../../../src/ui/widgets', () => ({ treeWidget: { focus: () => { } }, screen: { render: () => { } } }));
jest.mock('../../../src/ui/state', () => ({ getTreeSelection: jest.fn() }));
jest.mock('../../../src/ui/utils', () => ({ log: jest.fn() }));
jest.mock('../../../src/ui/forms', () => ({ askForm: jest.fn(), askRegisterForm: jest.fn(), askSlaveForm: jest.fn() }));
jest.mock('../../../src/connections', () => ({ editTCP: jest.fn(), editRTU: jest.fn() }));

describe('connection edit strategy', () => {
  let state, connections, handleEdit, saveAndRefresh;

  const tcpConn = (name, startAddress) => ({
    type: 'tcp',
    name,
    options: { host: '10.0.0.5', port: 502, startAddress, timeout: 800 },
    slaves: [{ id: 1, unitId: 1, registers: [{ register: 7 }] }]
  });

  beforeEach(() => {
    jest.resetModules();
    state = require('../../../src/ui/state');
    connections = require('../../../src/connections');
    handleEdit = require('../../../src/ui/handlers/actions/edit').handleEdit;
    saveAndRefresh = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  test('never deletes the edited connection when every candidate already exists', async () => {
    // A duplicate pair as older configs stored it: startAddress as a string.
    const conn = tcpConn('A', '0');
    const twin = tcpConn('B', '0');
    const setup = { connections: [conn, twin] };

    state.getTreeSelection.mockReturnValue({ type: 'connection', data: conn, setup });
    connections.editTCP.mockResolvedValue([
      { type: 'tcp', name: 'A', options: { host: '10.0.0.5', port: 502, startAddress: 0, timeout: 800 } }
    ]);

    await handleEdit({ saveAndRefresh });

    expect(setup.connections).toContain(conn);
    expect(conn.slaves[0].registers).toHaveLength(1);
    expect(saveAndRefresh).not.toHaveBeenCalled();
  });

  test('applies an edit that differs only in the timeout', async () => {
    const conn = tcpConn('A', 0);
    const twin = tcpConn('B', 0);
    const setup = { connections: [conn, twin] };

    state.getTreeSelection.mockReturnValue({ type: 'connection', data: conn, setup });
    connections.editTCP.mockResolvedValue([
      { type: 'tcp', name: 'A', options: { host: '10.0.0.5', port: 502, startAddress: 0, timeout: 1500 } }
    ]);

    await handleEdit({ saveAndRefresh });

    expect(conn.options.timeout).toBe(1500);
    expect(setup.connections).toContain(conn);
    expect(saveAndRefresh).toHaveBeenCalled();
  });

  test('survives a sibling connection that has no options', async () => {
    const conn = tcpConn('A', 0);
    const broken = { type: 'tcp', name: 'broken', slaves: [] };
    const setup = { connections: [conn, broken] };

    state.getTreeSelection.mockReturnValue({ type: 'connection', data: conn, setup });
    connections.editTCP.mockResolvedValue([
      { type: 'tcp', name: 'A2', options: { host: '10.0.0.9', port: 502, startAddress: 0, timeout: 800 } }
    ]);

    await handleEdit({ saveAndRefresh });

    expect(conn.options.host).toBe('10.0.0.9');
    expect(require('../../../src/ui/utils').log).not.toHaveBeenCalledWith(expect.stringContaining('Error editing'));
  });

  test('splits into extra connections while keeping the original', async () => {
    const conn = tcpConn('A', 0);
    const setup = { connections: [conn] };

    state.getTreeSelection.mockReturnValue({ type: 'connection', data: conn, setup });
    connections.editTCP.mockResolvedValue([
      { type: 'tcp', name: 'A0', options: { host: '10.0.0.5', port: 502, startAddress: 0, timeout: 800 } },
      { type: 'tcp', name: 'A1', options: { host: '10.0.0.5', port: 502, startAddress: 1, timeout: 800 } }
    ]);

    await handleEdit({ saveAndRefresh });

    expect(setup.connections).toHaveLength(2);
    expect(setup.connections[0]).toBe(conn);
    expect(setup.connections[1].slaves[0].registers).toHaveLength(1);
  });
});
