const blessed = require("blessed");
const { screen } = require("./widgets");
const { setModalOpen } = require("./state");
const { parseBatchRegisters, getEndianness, getSizes, getFunctions } = require("../modbus/types");
const { validateBatchInput, parseBatchInput } = require("../utils");

const FOCUS_STYLE = { fg: 'black', bg: 'blue' }
const UNFOCUS_STYLE = { fg: 'black', bg: 'white' }
const STYLE = { ...UNFOCUS_STYLE, focus: { ...FOCUS_STYLE } }

const destroy = (widget) => {
  widget.destroy();
  setModalOpen(false);
  screen.render();
};

const askYesOrNo = async (question, defaultValue = true) => {
  setModalOpen(true);
  return new Promise((resolve) => {
    const style = { top: 'center', left: 'center', style: { border: { fg: 'yellow' }, bg: 'black' } };
    const dialog = blessed.box({ parent: screen, width: '50%', height: 5, align: 'center', border: 'line', label: ` ${question} `, mouse: true, ...style });

    const getStyle = (selected) => selected ? FOCUS_STYLE : { ...UNFOCUS_STYLE, bg: 'grey' };

    const buttons = blessed.box({ parent: dialog, bottom: 1, left: 'center', width: 40, height: 1 });

    const btnYes = blessed.box({ parent: buttons, left: 0, width: 15, height: 1, align: 'center', content: ' YES ', mouse: true, style: getStyle(defaultValue) });
    const btnNo = blessed.box({ parent: buttons, right: 0, width: 15, height: 1, align: 'center', content: ' NO ', mouse: true, style: getStyle(!defaultValue) });

    let isYes = defaultValue

    const renderButtons = () => {
      btnYes.style = { ...getStyle(isYes) };
      btnNo.style = { ...getStyle(!isYes) };
      screen.render();
    };

    btnYes.on('click', () => {
      isYes = true;
      renderButtons();
      destroy(dialog);
      resolve(true);
    });

    btnNo.on('click', () => {
      isYes = false;
      renderButtons();
      destroy(dialog);
      resolve(false);
    });

    dialog.focus();
    screen.render();

    const toggle = () => {
      isYes = !isYes;
      renderButtons();
    };

    dialog.key(['left', 'right', 'h', 'l', 'tab'], toggle);

    dialog.key(['enter'], () => {
      destroy(dialog);
      resolve(isYes);
    });

    dialog.key(['escape'], () => {
      destroy(dialog);
      resolve(defaultValue);
    });
  });
};

const askChoice = async (question, items) => {
  setModalOpen(true);
  return new Promise((resolve) => {
    const list = blessed.list({
      parent: screen,
      border: "line",
      width: "40%",
      height: "40%",
      top: "center",
      left: "center",
      label: ` ${question} `,
      keys: true,
      vi: true,
      mouse: true,
      items: items.map(i => i.cli || i.toString()),
      style: { selected: { ...FOCUS_STYLE }, item: { fg: 'white' } }
    });

    list.focus();
    screen.render();

    list.on('select', (item, index) => {
      destroy(list);
      resolve(items[index].val !== undefined ? items[index].val : items[index]);
    });

    list.key(['escape'], () => {
      destroy(list);
      resolve(null);
    });
  });
};

const askForm = async (title, fields, inside = false) => {
  if (!inside)
    setModalOpen(true);
  return new Promise((resolve) => {
    let calculatedHeight = 4;
    fields.forEach(f => {
      if (f.options) {
        calculatedHeight += f.options.length + (f.custom ? 1 : 0) + 1;
      } else {
        calculatedHeight += 2;
      }
      if (f.hint) calculatedHeight += 1;
    });

    const formHeight = Math.min(calculatedHeight + 3, screen.height - 2);

    const form = blessed.form({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: formHeight,
      border: 'line',
      label: ` ${title} `,
      keys: true,
      vi: true,
      tags: true,
      mouse: true,
      style: { border: { fg: 'cyan' } }
    });

    const errorLabel = blessed.text({
      parent: form,
      bottom: 2,
      left: 2,
      right: 2,
      height: 1,
      content: "",
      tags: true,
      style: { fg: 'red' }
    });

    const askCustomValue = (callback) => {
      const promptBox = blessed.box({
        parent: screen,
        top: 'center',
        left: 'center',
        width: '50%',
        height: 5,
        border: 'line',
        label: ' Enter Custom Value ',
        mouse: true,
        style: { border: { fg: 'yellow' } },
        z: 999
      });

      const input = blessed.textbox({
        parent: promptBox,
        top: 1,
        left: 2,
        right: 2,
        height: 1,
        inputOnFocus: true,
        mouse: true,
        value: "",
        style: { ...UNFOCUS_STYLE, focus: FOCUS_STYLE }
      });

      input.focus();
      screen.render();

      input.key('enter', () => {
        const val = input.getValue();
        promptBox.destroy();
        screen.render();
        callback(val);
      });

      input.key('escape', () => {
        promptBox.destroy();
        screen.render();
        callback(null);
      });
    };

    const focusableItems = [];
    const widgetRefs = {};

    let currentTop = 1;

    const INPUT_LEFT = 20;

    fields.forEach((field, i) => {
      blessed.text({
        parent: form,
        top: currentTop,
        left: 2,
        content: `${field.label}:`,
        style: { bold: true }
      });

      if (field.button) {
        const btn = blessed.button({
          parent: form,
          top: currentTop,
          left: INPUT_LEFT,
          height: 1,
          width: 'shrink',
          minWidth: 10,
          content: ` ${field.default} `,
          mouse: true,
          style: { fg: 'white', focus: { fg: FOCUS_STYLE.bg, bold: true }, hover: { bg: 'blue' } }
        });

        btn.on('press', async () => {
          const newValue = await field.button();
          if (newValue) {
            btn.setContent(` ${newValue} `);
            btn.value = newValue;
            btn.focus();
            screen.render();
          }
        });

        widgetRefs[field.key] = btn;
        focusableItems.push(btn);
        currentTop += 1;
      } else if (field.options) {
        widgetRefs[field.key] = [];

        field.options.forEach(opt => {
          const isChecked = field.default && field.default.includes(opt);

          const checkbox = blessed.checkbox({
            parent: form,
            top: currentTop,
            left: INPUT_LEFT,
            height: 1,
            content: ` ${opt}`,
            checked: isChecked,
            name: field.key,
            mouse: true,
            style: { fg: 'white', focus: { fg: FOCUS_STYLE.bg, bold: true } }
          });

          checkbox.optionValue = opt;

          widgetRefs[field.key].push(checkbox);
          focusableItems.push(checkbox);

          currentTop++;
        });

        if (field.custom) {
          const otherCheckbox = blessed.checkbox({
            parent: form,
            top: currentTop,
            left: INPUT_LEFT,
            height: 1,
            content: ` Other...`,
            checked: false,
            name: field.key,
            mouse: true,
            style: { fg: 'white', focus: { fg: FOCUS_STYLE.bg, bold: true } }
          });

          otherCheckbox.on('check', () => {
            askCustomValue((customVal) => {
              if (customVal && customVal.trim() !== "") {
                otherCheckbox.text = ` ${customVal}`;
                otherCheckbox.setContent(` ${customVal}`);
                otherCheckbox.optionValue = customVal;
                otherCheckbox.focus();
              } else {
                otherCheckbox.uncheck();
              }
              screen.render();
            });
          });

          otherCheckbox.on('uncheck', () => {
            otherCheckbox.text = ` Other ...`;
            otherCheckbox.setContent(` Other...`);
            otherCheckbox.value = "Other";
            screen.render();
          });

          widgetRefs[field.key].push(otherCheckbox);
          focusableItems.push(otherCheckbox);

          currentTop++;
        }
      } else {
        const input = blessed.textbox({
          parent: form,
          top: currentTop,
          left: INPUT_LEFT,
          right: 2,
          height: 1,
          inputOnFocus: true,
          value: field.default || "",
          name: field.key,
          mouse: true,
          style: { ...UNFOCUS_STYLE, focus: { ...FOCUS_STYLE } }
        });

        widgetRefs[field.key] = input;
        focusableItems.push(input);

        currentTop += 1;
      }

      if (field.hint) {
        blessed.text({
          parent: form,
          top: currentTop,
          left: INPUT_LEFT,
          content: field.hint
        });
        currentTop += 1;
      }

      currentTop += 1;
    });

    const submitBtn = blessed.button({
      parent: form,
      bottom: 1,
      left: 'center',
      width: 10,
      height: 1,
      content: ' SUBMIT ',
      mouse: true,
      style: { bg: 'white', fg: 'black', focus: { bg: 'green', fg: 'black' }, hover: { bg: 'green', fg: 'black' } }
    });

    const doSubmit = () => {
      const payload = {};
      let firstError = null;

      errorLabel.setContent("");

      for (const field of fields) {
        let value;
        if (field.options) {
          const checkboxes = widgetRefs[field.key];
          value = checkboxes.filter(cb => cb.checked).map(cb => cb.optionValue);
        } else if (field.button) {
          value = widgetRefs[field.key].value;
        } else {
          value = widgetRefs[field.key].value;
        }

        if (field.validate) {
          const result = field.validate(value);
          if (result !== true) {
            firstError = result || `Invalid ${field.label}`;
            const widget = Array.isArray(widgetRefs[field.key]) ? widgetRefs[field.key][0] : widgetRefs[field.key];
            widget.focus();
            break;
          }
        }
        payload[field.key] = value;
      }

      if (firstError) {
        errorLabel.setContent(`{red-fg}Error: ${firstError}{/red-fg}`);
        screen.render();
        return;
      }

      form.destroy();
      if (!inside)
        setModalOpen(false);

      screen.render();
      resolve(payload);
    };

    submitBtn.on('press', doSubmit);
    form.on('submit', doSubmit);

    form.key(['escape'], () => {
      form.destroy();
      if (!inside)
        setModalOpen(false);

      screen.render();
      resolve(null);
    });

    if (focusableItems.length > 0) {
      focusableItems[0].focus();
    }

    screen.render();
  });
};

const askRegisterForm = async (question, inside = false, previousData = null) => {
  const allEndian = getEndianness();
  const allSizes = getSizes().map(s => s.type);
  const allFunctions = getFunctions().map(f => f.name);
  const defaultFunc = ["Read Holding Registers (0x03)"];

  const defRegs = previousData ? previousData.regs : "";
  const defFuncs = previousData ? previousData.funcs : defaultFunc;
  const defDesc = previousData ? previousData.desc : "";
  const defSizes = previousData ? previousData.sizes : allSizes;
  const defEndian = previousData ? previousData.endian : allEndian;

  const validateRegisters = (val) => {
    if (!val || val.trim().length === 0) return "Registers cannot be empty";
    const regs = parseBatchRegisters(val, defDesc, defEndian, defSizes, [3]);
    return regs !== null ? true : "Invalid Register Syntax (e.g. 0, 10..20, 0x5030).";
  };

  const form = await askForm(`${question}`, [
    { label: "Registers", key: "regs", default: defRegs, hint: "A comma separated list with ranges (e.g. 0, 10..20, 0x5030).", validate: validateRegisters },
    { label: "Functions", key: "funcs", options: allFunctions, default: defFuncs },
    { label: "Description", key: "desc", default: defDesc, hint: "A description for this register (e.g. power, electricity)." },
    { label: "Sizes", key: "sizes", options: allSizes, default: defSizes },
    { label: "Endianness", key: "endian", options: allEndian, default: defEndian }
  ], inside);

  if (form && form.regs) {
    let finalSizes = (!form.sizes || form.sizes.length === 0) ? allSizes : form.sizes;
    const finalEndian = (!form.endian || form.endian.length === 0) ? allEndian : form.endian;
    const finalFuncNames = (!form.funcs || form.funcs.length === 0) ? defaultFunc : form.funcs;

    const finalFuncCodes = finalFuncNames.map(name => {
      const f = getFunctions().find(fn => fn.name === name);
      return f ? f.val : 3;
    });

    const onlyBits = finalFuncCodes.every(fc => fc === 1 || fc === 2);
    if (onlyBits)
      finalSizes = ['16'];

    return {
      registers: parseBatchRegisters(form.regs, form.desc, finalEndian, finalSizes, finalFuncCodes),
      formData: form
    };
  }
  return null;
}

const askSlaveForm = async (question, inside = false, previousData = null) => {
  const defSlaves = previousData ? previousData.slaves.toString() : "1"
  const defUnitIds = previousData ? previousData.unitIds.toString() : "1"

  const form = await askForm(question, [
    { label: "Slave IDs", key: "slaves", default: defSlaves, hint: "A comma separated list with ranges (e.g. 1, 5-10, 11..15).", validate: validateBatchInput },
    { label: "Unit IDs", key: "unitIds", default: defUnitIds, hint: "A Unit ID list with ranges, only affects TCP (e.g. 1, 5).", validate: validateBatchInput }
  ], inside);

  if (form && form.slaves && form.unitIds) {
    const slaves = parseBatchInput(form.slaves);
    const unitIds = parseBatchInput(form.unitIds);

    const finalSlaves = [];
    for (const slave of slaves)
      for (const unitId of unitIds)
        finalSlaves.push({ id: slave, unitId });

    return {
      slaves: finalSlaves,
      formData: form
    };
  }

  return null;
}

module.exports = { askYesOrNo, askChoice, askForm, askRegisterForm, askSlaveForm };
