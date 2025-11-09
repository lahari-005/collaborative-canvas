Collaborative Drawing Canvas

A real-time multi-user whiteboard built with HTML, CSS, JavaScript, and Node.js (WebSockets).
Users can draw, erase, chat, and collaborate on the same canvas instantly.

🚀 Features

🖌️ Brush & Eraser with color and size control

⚡ Real-time sync across all users

👥 Live cursors & online user list

💬 Built-in room chat

↩️ Global undo/redo

💾 Save canvas (PNG / JSON)

🏠 Multiple rooms support

📱 Works on touch devices

🧩 Tech Stack

Frontend: HTML5, CSS, Vanilla JavaScript

Backend: Node.js + WebSocket (ws)

Framework: Express.js

Canvas API: Native HTML5 Canvas

⚙️ Setup
npm install
npm start


Then open http://localhost:3000

To test, open in two tabs → join the same room → start drawing!

📂 Structure
client/

  ├── index.html

  ├── style.css
  
  ├── main.js
  
  ├── canvas.js
  
  └── websocket.js
server/
  
  ├── server.js
  
  ├── rooms.js
  
  └── drawing-state.js

⚠️ Notes

Undo/Redo affects all users

No DB persistence (in-memory)

Shapes (line, rect) not yet active





DEPLOYMENT LINK--
https://collaborative-canvas-eikh.onrender.com
