const { interpretBuffer, getSizes, getEndianness, getFunctions } = require("../modbus/types");
const { treeWidget, screen } = require("./widgets");
const { setTreeRowMap } = require("./state");
const { genArrow, getSelectionPrefix, padStart, REG_WIDTH } = require("./utils");

const updateTree = (setups) => {
  const listItems = [];
  const map = [];

  if (!setups || setups.length === 0) {
    listItems.push("{center}No setups. Press 'c' to create one.{/center}");
    map.push(null);
  } else {
    setups.forEach(setup => {
      const arrow = genArrow(setup.lastError, setup.expanded, setup.isScanning, true);
      const sel = getSelectionPrefix(setup);
      listItems.push(`${sel}${arrow} {bold}{cyan-fg}${setup.name}{/cyan-fg}{/bold}`);
      map.push({ type: 'setup', data: setup });

      if (setup.expanded) {
        if (!setup.connections || setup.connections.length === 0) {
          listItems.push(`  {grey-fg}(No Connections){/grey-fg}`);
          map.push({ type: 'empty-conn', setup: setup });
        } else {
          setup.connections.forEach(conn => updateConnection(setup, conn, listItems, map));
        }
      }
    });
  }

  const currentSel = treeWidget.selected;
  setTreeRowMap(map);
  treeWidget.setItems(listItems);

  if (currentSel >= listItems.length) {
    treeWidget.select(Math.max(0, listItems.length - 1));
  } else {
    treeWidget.select(currentSel);
  }

  screen.render();
};

const updateConnection = (setup, conn, listItems, map) => {
  const arrow = genArrow(conn.lastError, conn.expanded, conn.isScanning, true);
  const error = conn.lastError ? `{bold}{red-fg}${conn.lastError}{/red-fg}{/bold}` : ''
  const sel = getSelectionPrefix(conn);

  listItems.push(`  ${sel}${arrow} {bold}{magenta-fg}${conn.name}{/magenta-fg}{/bold} ${conn.isScanning ? '' : error}`);
  map.push({ type: 'connection', data: conn, setup: setup });

  if (conn.expanded) {
    if (!conn.slaves || conn.slaves.length === 0) {
      listItems.push(`      {grey-fg}(No Slaves - Press 'a'){/grey-fg}`);
      map.push({ type: 'empty-slave', connection: conn });
    } else {
      conn.slaves.forEach(slave => updateSlave(conn, slave, listItems, map));
    }
  }
}

const updateSlave = (conn, slave, listItems, map) => {
  const arrow = genArrow(slave.lastError, slave.expanded, slave.isScanning);
  const error = slave.lastError ? `{bold}{red-fg}${slave.lastError}{/red-fg}{/bold}` : ''
  const sel = getSelectionPrefix(slave);

  listItems.push(`    ${sel}${arrow} {bold}Slave ID: ${slave.id} Unit ID: ${slave.unitId} | 0x${slave.id.toString(16).toUpperCase()}{/bold} ${slave.isScanning ? '' : error}`);
  map.push({ type: 'slave', data: slave, connection: conn });

  if (slave.expanded && !slave.isScanning && !slave.lastError) {
    if (!slave.registers || slave.registers.length === 0) {
      listItems.push(`        {grey-fg}(No registers - Press 'a'){/grey-fg}`);
      map.push({ type: 'empty-reg', slave: slave, connection: conn });
    } else {
      slave.registers.forEach((reg) => updateRegister(conn, slave, reg, listItems, map));
    }
  }
}

const updateRegister = (conn, slave, reg, listItems, map) => {
  const regStr = `{green-fg}${padStart(reg.register, REG_WIDTH, '0')}{/green-fg} | {green-fg}0x${reg.register.toString(16).toUpperCase()}{/green-fg}`;
  const descStr = reg.description ? ` {grey-fg}(${reg.description}){/grey-fg}` : "";
  const errorStr = reg.lastError ? `{red-fg}${reg.lastError}{/red-fg}` : "";
  const arrow = genArrow(reg.lastError, reg.expanded, reg.isScanning);
  const sel = getSelectionPrefix(reg);

  listItems.push(`      ${sel}${arrow} Register: ${regStr}${descStr} ${errorStr}`);
  map.push({ type: 'register', data: reg, slave: slave, connection: conn });

  if (!reg.expanded || reg.isScanning || reg.lastError || !reg.functions) return;

  renderFunctions(conn, slave, reg, listItems, map);
};

const renderFunctions = (conn, slave, reg, listItems, map) => {
  const allFunctions = getFunctions();
  const sizes = getSizes();
  const availableSizes = reg.sizes || sizes.map(s => s.type);

  for (const func of reg.functions) {
    const fcInfo = allFunctions.find(f => f.val === func.code) || { name: `Unknown Function (${func.code})` };
    const isBit = (func.code === 1 || func.code === 2);

    let funcHasError = false;
    if (isBit) {
      if (func.lastErrorBit)
        funcHasError = true;
    } else {
      funcHasError = sizes.some(size => availableSizes.includes(size.type) && func[`lastError${size.type}`]);
    }

    const funcArrow = genArrow(funcHasError, func.expanded, false);
    listItems.push(`        ${funcArrow} {cyan-fg}${fcInfo.name}{/cyan-fg}`);
    map.push({ type: 'function', data: func, register: reg, slave: slave, connection: conn });

    if (!func.expanded || funcHasError) continue;

    if (isBit) {
      renderBitFunction(func, listItems, map);
    } else {
      renderByteFunction(conn, slave, reg, func, availableSizes, listItems, map);
    }
  }
};

const renderBitFunction = (func, listItems, map) => {
  const val = func.lastRawBit === undefined ? '{red-fg}Unknown error found.{/red-fg}' : func.lastRawBit.readInt8();
  const err = func.lastErrorBit;
  const errorText = err ? ` {red-fg}(${err}){/red-fg}` : "";

  listItems.push(`          {bold}Value:{/bold} ${val}${errorText}`);
  map.push(null);
};

const renderByteFunction = (conn, slave, reg, func, availableSizes, listItems, map) => {
  const sizes = getSizes();
  const availableEndianness = reg.endianness || getEndianness();

  for (const element of sizes) {
    if (!availableSizes.includes(element.type)) continue;

    const rawValue = func[`lastRaw${element.type}`];
    const errorValue = func[`lastError${element.type}`];
    const expandedSize = func[`expanded${element.type}`];

    const rawStr = rawValue !== undefined ? `{yellow-fg}0x${rawValue.toString('hex')}{/yellow-fg}` : '';
    const errorStr = errorValue !== null ? `{red-fg}${errorValue}{/red-fg}` : '';
    const arrow = genArrow(errorValue, expandedSize, false);

    const endiannessData = { ...element };

    listItems.push(`          ${arrow} {blue-fg}${element.groupName}{/blue-fg} ${rawStr} ${errorStr}`);
    map.push({ type: 'endianness', funcObj: func, endiannessData: endiannessData, baseKey: element.type, register: reg, slave: slave, connection: conn });

    if (!errorValue && expandedSize && rawValue !== undefined)
      renderSubtypes(conn, slave, reg, func, element, rawValue, availableEndianness, endiannessData, listItems, map);
  }
};

const renderSubtypes = (conn, slave, reg, func, element, rawValue, availableEndianness, endiannessData, listItems, map) => {
  for (const subtype of element.subtypes) {
    for (const endian of availableEndianness) {
      const value = interpretBuffer(rawValue, endian, subtype.type);
      listItems.push(`              {magenta-fg}${subtype.name} (${endian}){/magenta-fg}: {green-fg}${value}{/green-fg}`);

      map.push({ type: 'subtypes', funcObj: func, data: { ...subtype, endian }, endiannessData: endiannessData, baseKey: element.type, register: reg, slave: slave, connection: conn });
    }
  }
};

module.exports = { updateTree };
