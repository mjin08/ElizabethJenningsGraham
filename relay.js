const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });

console.log('WebSocket relay server started on ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    // Broadcast the message to all other connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(data.toString());
      }
    });
  });

  ws.on('close', () => console.log('Client disconnected'));
});
