// client/main.js
import { CanvasManager } from "./canvas.js";
import { SocketManager } from "./websocket.js";

const drawingCanvas = document.getElementById("drawingCanvas");
const cursorCanvas = document.getElementById("cursorCanvas");

const usersList = document.getElementById("usersList");
const loginOverlay = document.getElementById("loginOverlay");
const loginBtn = document.getElementById("loginBtn");
const loginName = document.getElementById("loginName");
const loginEmail = document.getElementById("loginEmail");

const toolSelect = document.getElementById("toolSelect");
const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");
const savePNG = document.getElementById("savePNG");
const saveSession = document.getElementById("saveSession");
const loadSession = document.getElementById("loadSession");
const loadSessionBtn = document.getElementById("loadSessionBtn");
const roomLabel = document.getElementById("roomLabel");

const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get("room") || "default";
roomLabel.textContent = room;

let socket, canvasManager, currentUser = { name: "", email: "" };

// === LOGIN HANDLER ===
loginBtn.addEventListener("click", () => {
  const name = (loginName.value || "").trim();
  const email = (loginEmail.value || "").trim();
  if (!name) return alert("Please enter a name");
  currentUser = { name, email };
  loginOverlay.classList.remove("active");
  startApp();
});

// === MAIN INITIALIZATION ===
function startApp() {
  canvasManager = new CanvasManager(drawingCanvas, cursorCanvas, {
    onStrokeReady: sendStrokeToServer,
    onCursorMove: (x, y) => sendCursorToServer(x, y)
  });

  const wsUrl = `wss://${window.location.host}/?room=${encodeURIComponent(room)}`;
  socket = new SocketManager(wsUrl, {
    onInit: (initMsg) => {
      canvasManager.setClientInfo(initMsg.clientId);
      colorPicker.value = initMsg.color || "#000000";
    },
    onFullUpdate: (strokes) => canvasManager.redrawAll(strokes),
    onDraw: (stroke) => {
      canvasManager._cachedStrokes.push(stroke);
      canvasManager.drawStroke(stroke);
    },
    onCursor: (userId, x, y, color, name) => {
      canvasManager.updateCursor(userId, x, y, color, name);
    },
    onUsers: (users) => renderUsers(users),
    onChat: (from, text) => appendChat(from, text)
  });

  // === Toolbar Handlers ===
  toolSelect.addEventListener("change", () => canvasManager.setTool(toolSelect.value));
  colorPicker.addEventListener("input", () => canvasManager.setColor(colorPicker.value));
  brushSize.addEventListener("input", () => canvasManager.setSize(brushSize.value));

  undoBtn.addEventListener("click", () => socket.send({ type: "undo" }));
  redoBtn.addEventListener("click", () => socket.send({ type: "redo" }));
  clearBtn.addEventListener("click", () => socket.send({ type: "clear" }));

  // === Save & Load ===
  savePNG.addEventListener("click", () => {
    const url = drawingCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `canvas-${Date.now()}.png`;
    a.click();
  });

  saveSession.addEventListener("click", () => {
    const data = JSON.stringify(canvasManager.toJSON());
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `canvas-session-${Date.now()}.json`;
    a.click();
  });

  loadSessionBtn.addEventListener("click", () => loadSession.click());
  loadSession.addEventListener("change", (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        canvasManager.loadFromJSON(obj);
        socket.send({ type: "loadSession", data: obj });
      } catch (e) {
        alert("Invalid file");
      }
    };
    reader.readAsText(f);
  });

  // === Send name to server after join ===
  setTimeout(() => socket.send({ type: "setName", name: currentUser.name }), 300);

  // === Chat Events ===
  document.getElementById("chatSend").addEventListener("click", sendChat);
  document.getElementById("chatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChat();
  });
}

// === DRAWING HANDLERS ===
function sendStrokeToServer(stroke) {
  socket.send({ type: "draw", stroke });
}

// === CURSOR UPDATE (Rate-Limited) ===
let lastCursorSent = 0;
function sendCursorToServer(x, y) {
  const now = Date.now();
  if (now - lastCursorSent < 40) return;
  lastCursorSent = now;
  socket.send({ type: "cursor", x, y });
}

// === RENDER USER LIST ===
function renderUsers(users) {
  usersList.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.className = "userItem";
    li.dataset.id = u.id;
    li.dataset.color = u.color;
    li.innerHTML = `<span class="userColor" style="background:${u.color}"></span><span>${u.name}</span>`;
    usersList.appendChild(li);
  });
}

// === CHAT SYSTEM (Fixed for Duplication) ===
function sendChat() {
  const txt = document.getElementById("chatInput").value.trim();
  if (!txt) return;

  // ✅ Only send to server, no local append
  socket.send({ type: "chat", text: txt });
  document.getElementById("chatInput").value = "";
}

function appendChat(from, text) {
  const box = document.getElementById("chatBox");
  const p = document.createElement("div");

  // Differentiate "You" vs others
  if (from === "You") {
    p.className = "chat-msg self";
  } else {
    p.className = "chat-msg other";
  }

  p.textContent = `${from}: ${text}`;
  box.appendChild(p);

  // Keep only last 50 messages for performance
  if (box.children.length > 50) {
    box.removeChild(box.firstChild);
  }

  box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
}

// === LOGOUT HANDLER ===
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to leave this room?")) {
    socket.send({ type: "logout" });
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    window.location.href = "index.html";
  }
});
