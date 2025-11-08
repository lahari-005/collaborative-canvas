// server/server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import { getRoom } from "./rooms.js";

// === Setup paths and servers ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// === Serve client files ===
app.use(express.static(path.join(__dirname, "../client")));

// === Handle WebSocket upgrade ===
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// === WebSocket Connection Logic ===
wss.on("connection", (ws, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const roomName = url.searchParams.get("room") || "default";
  const room = getRoom(roomName);

  // Create client
  const client = {
    ws,
    id: generateId(),
    color: room.assignColor(),
    name: `Guest-${Math.floor(Math.random() * 1000)}`
  };

  room.addClient(client);

  // === Handle Messages from Client ===
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      console.error("Invalid JSON", e);
      return;
    }

    switch (msg.type) {
      case "draw":
        room.addStroke({ ...msg.stroke, userId: client.id });
        room.broadcast(null, {
          type: "draw",
          stroke: { ...msg.stroke, userId: client.id }
        });
        break;

      case "cursor":
        room.broadcast(client, {
          type: "cursor",
          userId: client.id,
          x: msg.x,
          y: msg.y,
          color: client.color,
          name: client.name
        });
        break;

      case "undo":
        room.undo(client.id);
        room.broadcast(null, { type: "fullUpdate", strokes: room.strokes });
        break;

      case "redo":
        room.redo();
        room.broadcast(null, { type: "fullUpdate", strokes: room.strokes });
        break;

      case "clear":
        room.clear();
        room.broadcast(null, { type: "fullUpdate", strokes: room.strokes });
        break;

      case "setName":
        client.name = msg.name || client.name;
        room.broadcast(null, { type: "users", users: room.userList() });
        break;

      // ✅ FIXED CHAT HANDLING (avoid duplicate messages)
      case "chat":
        // Send only to others
        room.broadcast(client, {
          type: "chat",
          from: client.name,
          text: msg.text
        });
        // Send confirmation only to sender as "You"
        ws.send(
          JSON.stringify({
            type: "chat",
            from: "You",
            text: msg.text
          })
        );
        break;

      case "loadSession":
        if (msg.data && Array.isArray(msg.data.strokes)) {
          room.replaceStrokes(msg.data.strokes);
          room.broadcast(null, {
            type: "fullUpdate",
            strokes: room.strokes
          });
        }
        break;

      default:
        console.warn("Unknown message type:", msg.type);
    }
  });

  // === Handle Disconnection ===
  ws.on("close", () => {
    room.removeClient(client);
    room.broadcast(null, { type: "users", users: room.userList() });
  });

  // === Initial Sync for New Client ===
  ws.send(
    JSON.stringify({
      type: "init",
      clientId: client.id,
      color: client.color,
      name: client.name,
      room: roomName
    })
  );
  ws.send(JSON.stringify({ type: "fullUpdate", strokes: room.strokes }));
  ws.send(JSON.stringify({ type: "users", users: room.userList() }));

  // Notify everyone about updated user list
  room.broadcast(null, { type: "users", users: room.userList() });
});

// === Start Server ===
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);

// === Utility ===
function generateId() {
  return Math.random().toString(36).slice(2, 9);
}
