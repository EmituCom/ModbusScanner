// jest.mock factories are hoisted above the module scope, so the recorder lives
// on `global` where the factory can reach it.
global.__created = { checkbox: [], textbox: [], form: [] };
const created = global.__created;

jest.mock('blessed', () => {
  const makeWidget = (kind, opts) => {
    const handlers = {};
    const widget = {
      kind,
      opts,
      checked: !!opts.checked,
      value: opts.value,
      content: opts.content,
      on: (event, fn) => { handlers[event] = fn; },
      key: () => { },
      focus: () => { },
      setContent: (c) => { widget.content = c; },
      getValue: () => widget.value,
      destroy: () => { },
      uncheck: () => { widget.checked = false; if (handlers.uncheck) handlers.uncheck(); },
      check: () => { widget.checked = true; if (handlers.check) handlers.check(); },
      emit: (event, ...args) => handlers[event] && handlers[event](...args)
    };

    if (global.__created[kind]) global.__created[kind].push(widget);
    return widget;
  };

  const factory = (kind) => (opts = {}) => makeWidget(kind, opts);

  return {
    form: factory('form'),
    text: factory('text'),
    box: factory('box'),
    button: factory('button'),
    checkbox: factory('checkbox'),
    textbox: factory('textbox'),
    list: factory('list')
  };
});

jest.mock('../../src/ui/widgets', () => ({
  screen: { height: 40, render: () => { } },
  treeWidget: { focus: () => { } }
}));

jest.mock('../../src/ui/state', () => ({ setModalOpen: () => { } }));

describe('askForm option fields', () => {
  const checkboxesFor = (key) => created.checkbox.filter(cb => cb.opts.name === key);
  const labelsOf = (key) => checkboxesFor(key).map(cb => cb.opts.content.trim());
  const checkedOf = (key) => checkboxesFor(key).filter(cb => cb.checked).map(cb => cb.optionValue);

  // askForm never resolves until submitted, so the pending promise is kept and
  // the form widget is driven directly.
  const openForm = (fields) => {
    const promise = require('../../src/ui/forms').askForm('Test', fields);
    const form = created.form[created.form.length - 1];
    return { promise, submit: () => { form.emit('submit'); return promise; } };
  };

  beforeEach(() => {
    created.checkbox.length = 0;
    created.textbox.length = 0;
    created.form.length = 0;
  });

  test('checks a default that is present in the options', () => {
    openForm([{ label: 'Host', key: 'host', options: ['1.1.1.1', '2.2.2.2'], default: ['2.2.2.2'] }]);
    expect(checkedOf('host')).toEqual(['2.2.2.2']);
  });

  test('renders and checks a default that is missing from the options', () => {
    openForm([{ label: 'Host', key: 'host', options: ['1.1.1.1'], default: ['10.0.0.5'], custom: true }]);

    expect(labelsOf('host')).toEqual(['1.1.1.1', '10.0.0.5', 'Other...']);
    expect(checkedOf('host')).toEqual(['10.0.0.5']);
  });

  test('submits a default that is missing from the options', async () => {
    const { submit } = openForm([{ label: 'Host', key: 'host', options: ['1.1.1.1'], default: ['10.0.0.5'], custom: true }]);
    await expect(submit()).resolves.toEqual({ host: ['10.0.0.5'] });
  });

  test('matches numeric defaults against string options', () => {
    openForm([{ label: 'Baud', key: 'baud', options: ['9600', '19200'], default: [19200] }]);
    expect(checkedOf('baud')).toEqual(['19200']);
  });

  test('keeps several defaults, in and out of the options', () => {
    openForm([{ label: 'Host', key: 'host', options: ['1.1.1.1', '2.2.2.2'], default: ['2.2.2.2', '10.0.0.5'], custom: true }]);
    expect(checkedOf('host')).toEqual(['2.2.2.2', '10.0.0.5']);
  });

  test('does not duplicate a repeated default', () => {
    openForm([{ label: 'Host', key: 'host', options: ['1.1.1.1'], default: ['10.0.0.5', '10.0.0.5'] }]);
    expect(labelsOf('host')).toEqual(['1.1.1.1', '10.0.0.5']);
  });

  test('accepts a bare (non-array) default', () => {
    openForm([{ label: 'Host', key: 'host', options: ['1.1.1.1'], default: '10.0.0.5' }]);
    expect(checkedOf('host')).toEqual(['10.0.0.5']);
  });

  test('checks nothing when there is no default', () => {
    openForm([{ label: 'Host', key: 'host', options: ['1.1.1.1'], default: [], custom: true }]);
    expect(checkedOf('host')).toEqual([]);
  });

  test('omits an "Other..." box left without a value', async () => {
    const { submit } = openForm([{ label: 'Host', key: 'host', options: ['1.1.1.1'], default: ['1.1.1.1'], custom: true }]);

    const other = checkboxesFor('host').find(cb => cb.opts.content.includes('Other'));
    other.checked = true;

    await expect(submit()).resolves.toEqual({ host: ['1.1.1.1'] });
  });

  test('sizes the form for the rows it actually renders', () => {
    const rowsFor = (field) => {
      openForm([field]);
      const boxes = checkboxesFor(field.key).length;
      const height = created.form[created.form.length - 1].opts.height;
      return { boxes, height };
    };

    const plain = rowsFor({ label: 'Host', key: 'host', options: ['1.1.1.1', '2.2.2.2'], default: ['1.1.1.1'] });
    const perRow = plain.height - plain.boxes;

    // A repeated default renders one extra checkbox, not two.
    const repeated = rowsFor({ label: 'H2', key: 'h2', options: ['1.1.1.1'], default: ['10.0.0.5', '10.0.0.5'] });
    expect(repeated.boxes).toBe(2);
    expect(repeated.height - repeated.boxes).toBe(perRow);

    // A falsy-but-real default (0) still renders a checkbox.
    const zero = rowsFor({ label: 'H3', key: 'h3', options: ['1'], default: [0] });
    expect(zero.boxes).toBe(2);
    expect(zero.height - zero.boxes).toBe(perRow);
  });

  test('coerces a numeric text default to a string', () => {
    openForm([{ label: 'Timeout', key: 'timeout', default: 800 }]);
    expect(created.textbox[0].opts.value).toBe('800');
  });
});
