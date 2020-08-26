const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

let users = []
const wss = new WebSocket.Server({ port: 443 });

const sendScanData = () => {
  wss.clients.forEach(client => {
    client.send(JSON.stringify({
      type: 'scan',
      data: { login: client.uid, peers: activeUsers() }
    }))
  });
}

const targetSocket = (uid) => {
  const user = users.find(u => u.id === uid);
  if (!user) return;

  return user.ws;
}

const activeUsers = () => (users.map(u => ({ id: u.id })))

wss.on("connection", (ws) => {
  ws.uid = uuidv4();
  console.log(`Received connection from ${ws.uid}`);

  users.push({ id: ws.uid, ws });
  sendScanData();

  ws.on("close", () => {
    console.log(`Disconnecting user ${ws.uid}`);
    users = users.filter(u => u.ws !== ws);
    sendScanData();
  });

  ws.on("message", (message) => {
    const { type, target, data } = JSON.parse(message);
    console.log(`Received ${type} message`);

    switch (type) {
      case 'scan':
        const peers = activeUsers();
        console.log("Requested scan, sending out active clients:", peers);
        ws.send(JSON.stringify({ type: 'scan', data: { login: ws.uid, peers } }));
        break;
      case 'sdp':
        console.log(`Received sdp info from ${ws.uid}, sharing with target ${target}`);

        try {
          const socket = targetSocket(target);
          if (!target) throw Error('No target found!');
          if (!data) throw Error('Empty payload!');

          socket.send(JSON.stringify({ type: 'sdp', data, sender: ws.uid }));
        } catch (ex) {
          console.error(ex.message);
        }
        break;
      case 'candidate':
        console.log(`Received candidate info from ${ws.uid}, sharing with target ${target}`);

        try {
          const socket = targetSocket(target);
          if (!target) throw Error('No target found!');
          if (!data) throw Error('Empty payload!');

          socket.send(JSON.stringify({ type: 'candidate', data, sender: ws.uid }));
        } catch (ex) {
          console.error(ex.message);
        }
        break;
      default:
        break;
    }
  });
});
