let lastConnectionKey = "";

const connectRTU = async (client, options = {}, id) => {
  const ops = {
    parity: options.parity || 'none',
    stopBits: options.stopbit || 1,
    dataBits: options.databit || 8,
    baudRate: parseInt(options.baudrate) || 9600
  };

  const currentKey = `rtu:${options.port}:${ops.baudRate}:${ops.dataBits}:${ops.parity}:${ops.stopBits}`;

  if (lastConnectionKey === currentKey && client.isOpen) {
    client.setTimeout(options.timeout || 800);
    await client.setID(id);
  }

  if (lastConnectionKey !== currentKey || !client.isOpen) {
    if (client.isOpen) {
      await client.close();
    }

    await client.connectRTUBuffered(options.port, ops);
    client.setTimeout(options.timeout || 800);
    await client.setID(id);

    lastConnectionKey = currentKey;
  }
};

module.exports = { connectRTU };
