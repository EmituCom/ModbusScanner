const { exec } = require('child_process');

const PING_TIMEOUT_SECONDS = 3;

let lastConnectionKey = "";

const connectTCP = async (client, options = {}, id, unitId) => {
  const host = (options.host || "127.0.0.1").replace("#", id);
  const port = parseInt(options.port) || 502;
  const currentKey = `tcp:${host}:${port}`;

  if (lastConnectionKey === currentKey && client.isOpen) {
    client.setTimeout(options.timeout || 800);
    await client.setID(unitId);
  }

  if (lastConnectionKey !== currentKey || !client.isOpen) {
    if (client.isOpen) {
      await client.close();
    }

    const up = await isUp(host);
    if (!up)
      throw Error("Host is not up.");

    await client.connectTcpRTUBuffered(host, { port });
    client.setTimeout(options.timeout || 800);

    lastConnectionKey = currentKey;
  }
};


const isUp = (host) => {
  return new Promise((resolve, _) => {
    exec(`ping -c 1 ${host} -W ${PING_TIMEOUT_SECONDS}`, (error, stdout, stderr) => {
      if (error || stderr) {
        resolve(false);
        return;
      }

      const isUp = stdout.includes('1 received') || stdout.includes('bytes from');
      resolve(isUp);
    });
  });
};

module.exports = { connectTCP };
