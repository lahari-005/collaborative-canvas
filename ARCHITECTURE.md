A real-time whiteboard using HTML5 Canvas and Node.js WebSockets, where multiple users draw, erase, and chat together.
Each room keeps its own shared canvas state.

🔄 Flow
User → CanvasManager → SocketManager → WebSocket Server
             ↓
        DrawingState (per room)
             ↓
      Broadcast → All Clients

🧩 Components

Client: canvas.js, websocket.js, main.js, style.css
Server: server.js, rooms.js, drawing-state.js

💬 Messages

init, draw, cursor, fullUpdate, users, chat

↩️ Undo / Redo

Server manages strokes[] and undoStack[], then broadcasts updates.

⚡ Highlights

Fast native WebSocket

Cursor updates every 40ms

Cached strokes for instant redraw

🖥️ Diagram
 ┌────────────┐   WebSocket   ┌────────────┐
 │ Client A   │ <-----------> │  Server    │
 │ (Browser)  │               │ (Node.js)  │
 └────────────┘               └────────────┘
       ▲                            ▲
       │        Broadcast           │
       ▼                            ▼
 ┌────────────┐               ┌────────────┐
 │ Client B   │               │ DrawingState │
 └────────────┘               └────────────┘


✅ Result:
Lightweight, modular, and real-time collaborative canvas.