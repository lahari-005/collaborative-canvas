// server/drawing-state.js
export class DrawingState {
  constructor(name, palette = []) {
    this.name = name;
    this.strokes = [];
    this.undoStack = [];
    this.clients = [];
    this.palette = palette || ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"];
    this._colorIndex = 0;
  }

  assignColor() {
    const c = this.palette[this._colorIndex % this.palette.length];
    this._colorIndex++;
    return c;
  }

  addClient(client) {
    this.clients.push(client);
  }

  removeClient(client) {
    this.clients = this.clients.filter(c => c !== client);
  }

  // ✅ Updated broadcast function (always skip sender)
  broadcast(sender, msg) {
    const raw = JSON.stringify(msg);
    this.clients.forEach(c => {
      if (c.ws && c.ws.readyState === c.ws.OPEN) {
        // Always skip sending back to the sender
        if (sender && c.id === sender.id) return;
        c.ws.send(raw);
      }
    });
  }

  addStroke(stroke) {
    this.strokes.push(stroke);
    this.undoStack = []; // clear redo stack
  }

  undo() {
    if (!this.strokes.length) return;
    const s = this.strokes.pop();
    this.undoStack.push(s);
  }

  redo() {
    if (!this.undoStack.length) return;
    const s = this.undoStack.pop();
    this.strokes.push(s);
  }

  clear() {
    this.strokes = [];
    this.undoStack = [];
  }

  replaceStrokes(strokes) {
    this.strokes = strokes.slice();
    this.undoStack = [];
  }

  userList() {
    return this.clients.map(c => ({ id: c.id, name: c.name, color: c.color }));
  }
}
