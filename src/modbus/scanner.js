const { connectRTU, connectTCP } = require("../connections");
const { getSizes } = require("./types");

const readRaw = async (client, register, size, functionCode) => {
  if (functionCode === 1) {
    return (await client.readCoils(register, 1)).buffer;
  } else if (functionCode === 2) {
    // TODO: This brakes everything, it bypasses the try catch and sends the application down if an 
    // error is returned from the connection, like illegal address.
    throw new Error('Function not supported.')
    // return (await client.readDiscreteInputs(register, 1).buffer);
  } else if (functionCode === 3) {
    return (await client.readHoldingRegisters(register, size)).buffer;
  } else if (functionCode === 4) {
    return (await client.readInputRegisters(register, size)).buffer;
  }
  throw new Error("No data returned");
};

const readRegistersOnce = async (client, activeConnection, slave) => {
  const { options, type } = activeConnection;
  const isRtu = type === 'rtu';

  try {
    if (isRtu) {
      await connectRTU(client, options, slave.id);
    } else {
      await connectTCP(client, options, slave.id, slave.unitId);
    }

    activeConnection.lastError = null;
    slave.lastError = null;

    let slaveErrorCount = 0;
    let commonSlaveError = null;

    try {
      const allSizes = getSizes();
      const registers = slave.registers || [];

      for (const r of registers) {
        if (!r.isScanning) continue;
        r.lastError = null;
        r.startAddress = options.startAddress || 0;
        const finalAddress = r.register - r.startAddress;

        const activeSizes = r.sizes || allSizes.map(s => s.type);

        let registerTotalErrors = 0;
        let registerAttempts = 0;
        let commonRegisterError = null;

        for (const func of (r.functions || [])) {
          const isBit = (func.code === 1 || func.code === 2);

          if (isBit) {
            registerAttempts++;
            try {
              const raw = await readRaw(client, finalAddress, 1, func.code);
              func.lastRawBit = raw;
              func.lastErrorBit = null;
            } catch (e) {
              func.lastRawBit = undefined;
              func.lastErrorBit = `${e.message}`;
              registerTotalErrors++;
              if (commonRegisterError === null) commonRegisterError = func.lastErrorBit;
            }
          } else {
            for (const element of allSizes) {
              if (!activeSizes.includes(element.type)) continue;

              const valueKey = `lastRaw${element.type}`;
              const errorKey = `lastError${element.type}`;

              registerAttempts++;

              try {
                const raw = await readRaw(client, finalAddress, element.size, func.code);
                func[valueKey] = raw;
                func[errorKey] = null;
              } catch (e) {
                func[valueKey] = undefined;
                func[errorKey] = e.message;

                registerTotalErrors++;
                if (commonRegisterError === null) commonRegisterError = e.message;
                else if (commonRegisterError !== e.message) commonRegisterError = 'Mixed Errors';
              }
            }
          }
        }

        if (commonRegisterError === "Timed out")
          throw ({ message: commonRegisterError })

        if (registerAttempts > 0 && registerTotalErrors === registerAttempts) {
          r.lastError = commonRegisterError;
          slaveErrorCount++;

          if (commonSlaveError === null) commonSlaveError = commonRegisterError;
          else if (commonSlaveError !== commonRegisterError) commonSlaveError = 'Mixed Register Errors';
        }

        r.isScanning = false;
      }

      if (registers.length > 0 && slaveErrorCount === registers.length)
        slave.lastError = commonSlaveError;

    } catch (e) {
      slave.lastError = e.message;
    }

  } catch (e) {
    const msg = e.message;
    slave.lastError = msg;
  }
};

module.exports = { readRaw, readRegistersOnce };
