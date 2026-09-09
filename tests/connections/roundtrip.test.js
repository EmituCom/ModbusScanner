'use strict';

// End-to-end across the real forms layer: only blessed itself is stubbed, so
// the option rendering that drops unknown defaults is exercised for real.
global.__created = { checkbox: [], textbox: [], form: [] };
const created = global.__created;

jest.mock('blessed', () => {
  const makeWidget = (kind, opts) => {
    const handlers = {};
    const widget = {
      kind, opts,
      checked: !!opts.checked,
      value: opts.value,
      content: opts.content,
      on: (e, fn) => { handlers[e] = fn; },
      key: () => { },
      focus: () => { },
      setContent: (c) => { widget.content = c; },
      getValue: () => widget.value,
      destroy: () => { },
      uncheck: () => { widget.checked = false; },
      emit: (e, ...a) => handlers[e] && handlers[e](...a)
    };
    if (global.__created[kind]) global.__created[kind].push(widget);
    return widget;
  };
  const factory = (kind) => (opts = {}) => makeWidget(kind, opts);
  return {
    form: factory('form'), text: factory('text'), box: factory('box'), button: factory('button'),
    checkbox: factory('checkbox'), textbox: factory('textbox'), list: factory('list')
  };
});

jest.mock('../../src/ui/widgets', () => ({ screen: { height: 60, render: () => { } }, treeWidget: { focus: () => { } } }));
jest.mock('../../src/ui/state', () => ({ setModalOpen: () => { } }));
jest.mock('../../src/utils', () => {
  const actual = jest.requireActual('../../src/utils');
  return { ...actual, getAllIPs: jest.fn(), getSerialPorts: jest.fn() };
});

describe('edit round-trip through the real form', () => {
  const utils = require('../../src/utils');
  const manager = require('../../src/connections/manager');

  // Opens the edit form, then presses SUBMIT without touching anything.
  const editUntouched = async (edit, conn) => {
    created.form.length = 0;
    created.checkbox.length = 0;
    const pending = edit(conn);

    // editRTU awaits getSerialPorts() before building the form.
    for (let i = 0; i < 20 && created.form.length === 0; i++) await new Promise(setImmediate);
    if (created.form.length === 0) throw new Error('form was never opened');

    created.form[created.form.length - 1].emit('submit');
    return pending;
  };

  const normalize = (options) => {
    const out = {};
    Object.keys(options).sort().forEach(k => { out[k] = String(options[k]); });
    return out;
  };

  beforeEach(() => {
    utils.getAllIPs.mockReturnValue(['192.168.1.#']);
    utils.getSerialPorts.mockResolvedValue(['/dev/ttyUSB0']);
  });

  afterEach(() => jest.clearAllMocks());

  test('preserves a custom host that is not one of the local IPs', async () => {
    const conn = { type: 'tcp', options: { host: '10.0.0.5', port: 5020, startAddress: 3, timeout: 1500 } };
    const configs = await editUntouched(manager.editTCP, conn);

    expect(configs).toHaveLength(1);
    expect(configs[0].options).toEqual(conn.options);
  });

  test('preserves a host template that is one of the local IPs', async () => {
    const conn = { type: 'tcp', options: { host: '192.168.1.#', port: 502, startAddress: 0, timeout: 800 } };
    const configs = await editUntouched(manager.editTCP, conn);

    expect(configs).toHaveLength(1);
    expect(configs[0].options).toEqual(conn.options);
  });

  test('preserves a custom serial port and baud rate', async () => {
    const conn = {
      type: 'rtu',
      options: { port: '/dev/ttyCUSTOM', baudrate: 250000, parity: 'odd', stopbit: 1, databit: 7, startAddress: 5, timeout: 1200 }
    };
    const configs = await editUntouched(manager.editRTU, conn);

    expect(configs).toHaveLength(1);
    expect(configs[0].options).toEqual(conn.options);
  });

  test('preserves every option of the legacy config shape on disk', async () => {
    // From configs/last-config.json, where startAddress is a string.
    const conn = {
      name: '/dev/ttyUSB0@9600 8 none (start address 0) ',
      type: 'rtu',
      options: { port: '/dev/ttyUSB0', baudrate: 9600, parity: 'none', stopbit: 2, databit: 8, startAddress: '0', timeout: 800 }
    };
    const configs = await editUntouched(manager.editRTU, conn);

    expect(configs).toHaveLength(1);
    expect(normalize(configs[0].options)).toEqual(normalize(conn.options));
    expect(configs[0].options.stopbit).toBe(2);
    expect(configs[0].options.startAddress).toBe(0);
  });

  test('does not rename a connection on an untouched edit', async () => {
    const conn = { type: 'tcp', options: { host: '10.0.0.5', port: 502, startAddress: 3, timeout: 800 } };
    const first = await editUntouched(manager.editTCP, conn);
    const second = await editUntouched(manager.editTCP, { type: 'tcp', options: first[0].options });

    expect(second[0].name).toBe(first[0].name);
  });
});
