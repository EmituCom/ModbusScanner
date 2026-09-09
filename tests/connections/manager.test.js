'use strict';

// Mocked with a factory: the real module builds a blessed screen on load.
jest.mock('../../src/ui/forms', () => ({
  askChoice: jest.fn(),
  askForm: jest.fn(),
  askRegisterForm: jest.fn(),
  askSlaveForm: jest.fn(),
  askYesOrNo: jest.fn()
}));
jest.mock('../../src/utils', () => {
  const actual = jest.requireActual('../../src/utils');
  return { ...actual, getAllIPs: jest.fn(), getSerialPorts: jest.fn() };
});

describe('connection edit forms', () => {
  let forms;
  let utils;
  let manager;

  const fieldsOf = () => forms.askForm.mock.calls[0][1];
  const field = (key) => fieldsOf().find(f => f.key === key);

  beforeEach(() => {
    jest.resetModules();
    forms = require('../../src/ui/forms');
    utils = require('../../src/utils');
    manager = require('../../src/connections/manager');

    utils.getAllIPs.mockReturnValue(['192.168.1.#']);
    utils.getSerialPorts.mockResolvedValue(['/dev/ttyUSB0']);
    forms.askForm.mockResolvedValue(null);
  });

  afterEach(() => jest.clearAllMocks());

  // --- TCP ---

  describe('editTCP', () => {
    test('preselects a custom host that is not among the local IPs', async () => {
      await manager.editTCP({ type: 'tcp', options: { host: '10.0.0.5', port: 502, startAddress: 0, timeout: 800 } });
      expect(field('host').default).toEqual(['10.0.0.5']);
    });

    test('preselects a host that is among the local IPs', async () => {
      await manager.editTCP({ type: 'tcp', options: { host: '192.168.1.#', port: 502, startAddress: 0, timeout: 800 } });
      expect(field('host').default).toEqual(['192.168.1.#']);
    });

    test('passes every option as a non-empty string default', async () => {
      await manager.editTCP({ type: 'tcp', options: { host: '10.0.0.5', port: 502, startAddress: 0, timeout: 800 } });
      expect(field('port').default).toBe('502');
      expect(field('startAddress').default).toBe('0');
      expect(field('timeout').default).toBe('800');
    });

    test('falls back to defaults instead of throwing on a partial config', async () => {
      await expect(manager.editTCP({ type: 'tcp', options: {} })).resolves.toEqual([]);
      expect(field('host').default).toEqual([]);
      expect(field('port').default).toBe('502');
      expect(field('startAddress').default).toBe('0');
      expect(field('timeout').default).toBe('800');
    });

    test('builds one config per host/port/start-address combination', async () => {
      forms.askForm.mockResolvedValue({ host: ['10.0.0.5', '10.0.0.6'], port: '502, 503', startAddress: '0', timeout: '800' });
      const configs = await manager.editTCP({ type: 'tcp', options: { host: '10.0.0.5', port: 502, startAddress: 0, timeout: 800 } });

      expect(configs).toHaveLength(4);
      expect(configs[0].options).toEqual({ host: '10.0.0.5', port: 502, startAddress: 0, timeout: 800 });
    });
  });

  // --- RTU ---

  describe('editRTU', () => {
    const rtuConn = (overrides = {}) => ({
      type: 'rtu',
      options: { port: '/dev/ttyUSB0', baudrate: 9600, parity: 'even', stopbit: 2, databit: 7, startAddress: 0, timeout: 800, ...overrides }
    });

    test('preselects a custom serial port that is not among the detected ports', async () => {
      await manager.editRTU(rtuConn({ port: '/dev/ttyCUSTOM' }));
      expect(field('ports').default).toEqual(['/dev/ttyCUSTOM']);
    });

    test('preselects a custom baud rate that is not among the presets', async () => {
      await manager.editRTU(rtuConn({ baudrate: 250000 }));
      expect(field('bauds').default).toEqual(['250000']);
    });

    test('preselects the stored parity, stop bits and data bits', async () => {
      await manager.editRTU(rtuConn());
      expect(field('parities').default).toEqual(['even']);
      expect(field('stops').default).toEqual(['2']);
      expect(field('data').default).toEqual(['7']);
    });

    test('passes the stored timeout as a string', async () => {
      await manager.editRTU(rtuConn());
      expect(field('timeout').default).toBe('800');
    });

    test('falls back to defaults instead of throwing on a partial config', async () => {
      await expect(manager.editRTU({ type: 'rtu', options: {} })).resolves.toEqual([]);
      expect(field('ports').default).toEqual([]);
      expect(field('bauds').default).toEqual(['9600']);
      expect(field('parities').default).toEqual(['none']);
      expect(field('stops').default).toEqual(['1']);
      expect(field('data').default).toEqual(['8']);
      expect(field('timeout').default).toBe('800');
    });
  });

  // --- batch fields must agree with their own validator ---

  describe('batch fields', () => {
    test('editTCP expands a start-address range into one config each', async () => {
      forms.askForm.mockResolvedValue({ host: ['10.0.0.5'], port: '502', startAddress: '0..2', timeout: '800' });
      const configs = await manager.editTCP({ type: 'tcp', options: { host: '10.0.0.5', port: 502, startAddress: 0, timeout: 800 } });

      expect(configs.map(c => c.options.startAddress)).toEqual([0, 1, 2]);
    });

    test('editTCP expands a port range into one config each', async () => {
      forms.askForm.mockResolvedValue({ host: ['10.0.0.5'], port: '502..504', startAddress: '0', timeout: '800' });
      const configs = await manager.editTCP({ type: 'tcp', options: { host: '10.0.0.5', port: 502, startAddress: 0, timeout: 800 } });

      expect(configs.map(c => c.options.port)).toEqual([502, 503, 504]);
    });

    test('editRTU expands a start-address range into one config each', async () => {
      forms.askForm.mockResolvedValue({
        ports: ['/dev/ttyUSB0'], bauds: ['9600'], parities: ['none'], stops: ['1'], data: ['8'], startAddress: '0-2', timeout: '800'
      });
      const configs = await manager.editRTU({
        type: 'rtu',
        options: { port: '/dev/ttyUSB0', baudrate: 9600, parity: 'none', stopbit: 1, databit: 8, startAddress: 0, timeout: 800 }
      });

      expect(configs.map(c => c.options.startAddress)).toEqual([0, 1, 2]);
    });

    test('never stores NaN for an input its validator accepts', async () => {
      for (const input of ['0..5', '0-5', '5.7', '0003']) {
        forms.askForm.mockResolvedValue({ host: ['10.0.0.5'], port: '502', startAddress: input, timeout: '800' });
        const configs = await manager.editTCP({ type: 'tcp', options: { host: '10.0.0.5', port: 502, startAddress: 0, timeout: 800 } });

        expect(configs.length).toBeGreaterThan(0);
        configs.forEach(c => expect(Number.isNaN(c.options.startAddress)).toBe(false));
      }
    });

    test('names a connection with the start address it actually stores', async () => {
      forms.askForm.mockResolvedValue({ host: ['10.0.0.5'], port: '502', startAddress: '0003', timeout: '800' });
      const configs = await manager.editTCP({ type: 'tcp', options: { host: '10.0.0.5', port: 502, startAddress: 3, timeout: 800 } });

      expect(configs[0].name).toContain(String(configs[0].options.startAddress));
      expect(configs[0].name).toBe('10.0.0.5:502 (start address 3)');
    });

    test('rejects an empty serial port selection instead of discarding the edit', async () => {
      await manager.editRTU({ type: 'rtu', options: { port: '/dev/ttyUSB0', baudrate: 9600, startAddress: 0, timeout: 800 } });

      const validate = field('ports').validate;
      expect(validate).toBeDefined();
      expect(validate([])).not.toBe(true);
      expect(validate(['/dev/ttyUSB0'])).toBe(true);
    });

    test('does not feed a stored NaN back into the form', async () => {
      await manager.editTCP({ type: 'tcp', options: { host: '10.0.0.5', port: 502, startAddress: NaN, timeout: 800 } });
      expect(field('startAddress').default).toBe('0');
    });
  });

  // --- add / edit consistency ---

  describe('add and edit agreement', () => {
    test.each(['3', '0003', '0..2', '5.7', '1e3'])('promptTCP and editTCP agree on start address %j', async (input) => {
      forms.askForm.mockResolvedValue({ host: ['10.0.0.5'], port: '502', startAddresses: input, timeout: '800' });
      const added = await manager.promptTCP();

      jest.clearAllMocks();
      utils.getAllIPs.mockReturnValue(['192.168.1.#']);
      forms.askForm.mockResolvedValue({ host: ['10.0.0.5'], port: '502', startAddress: input, timeout: '800' });
      const edited = await manager.editTCP({ type: 'tcp', options: { host: '10.0.0.5', port: 502, startAddress: 3, timeout: 800 } });

      expect(added.connectionConfigs.map(c => c.options)).toEqual(edited.map(c => c.options));
      expect(added.connectionConfigs.map(c => c.name)).toEqual(edited.map(c => c.name));
    });

    test.each(['3', '0003', '0..2'])('editTCP and editRTU agree on start address %j', async (input) => {
      forms.askForm.mockResolvedValue({ host: ['10.0.0.5'], port: '502', startAddress: input, timeout: '800' });
      const tcp = await manager.editTCP({ type: 'tcp', options: { host: '10.0.0.5', port: 502, startAddress: 3, timeout: 800 } });

      jest.clearAllMocks();
      utils.getSerialPorts.mockResolvedValue(['/dev/ttyUSB0']);
      forms.askForm.mockResolvedValue({
        ports: ['/dev/ttyUSB0'], bauds: ['9600'], parities: ['none'], stops: ['1'], data: ['8'], startAddress: input, timeout: '800'
      });
      const rtu = await manager.editRTU({
        type: 'rtu',
        options: { port: '/dev/ttyUSB0', baudrate: 9600, parity: 'none', stopbit: 1, databit: 8, startAddress: 3, timeout: 800 }
      });

      expect(tcp.map(c => c.options.startAddress)).toEqual(rtu.map(c => c.options.startAddress));
    });

    test('promptTCP and editTCP store the start address with the same type', async () => {
      forms.askForm.mockResolvedValue({ host: ['10.0.0.5'], port: '502', startAddresses: '3', timeout: '800' });
      const added = await manager.promptTCP();

      jest.clearAllMocks();
      utils.getAllIPs.mockReturnValue(['192.168.1.#']);
      forms.askForm.mockResolvedValue({ host: ['10.0.0.5'], port: '502', startAddress: '3', timeout: '800' });
      const edited = await manager.editTCP({ type: 'tcp', options: { host: '10.0.0.5', port: 502, startAddress: 3, timeout: 800 } });

      expect(added.connectionConfigs[0].options).toEqual(edited[0].options);
    });

    test('promptRTU and editRTU store the start address with the same type', async () => {
      forms.askForm.mockResolvedValue({
        ports: ['/dev/ttyUSB0'], bauds: ['9600'], parities: ['none'], stops: ['1'], data: ['8'], startAddresses: '3', timeout: '800'
      });
      const added = await manager.promptRTU();

      jest.clearAllMocks();
      utils.getSerialPorts.mockResolvedValue(['/dev/ttyUSB0']);
      forms.askForm.mockResolvedValue({
        ports: ['/dev/ttyUSB0'], bauds: ['9600'], parities: ['none'], stops: ['1'], data: ['8'], startAddress: '3', timeout: '800'
      });
      const edited = await manager.editRTU({
        type: 'rtu',
        options: { port: '/dev/ttyUSB0', baudrate: 9600, parity: 'none', stopbit: 1, databit: 8, startAddress: 3, timeout: 800 }
      });

      expect(added.connectionConfigs[0].options).toEqual(edited[0].options);
    });
  });
});
