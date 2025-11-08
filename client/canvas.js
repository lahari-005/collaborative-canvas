// client/canvas.js
export class CanvasManager {
  constructor(drawingCanvas, cursorCanvas, options = {}) {
    this.drawingCanvas = drawingCanvas;
    this.cursorCanvas = cursorCanvas;
    this.ctx = drawingCanvas.getContext("2d", { alpha: true });
    this.cursorCtx = cursorCanvas.getContext("2d", { alpha: true });
    this.pixelRatio = window.devicePixelRatio || 1;

    this.tool = "brush";
    this.color = "#000";
    this.size = 4;
    this.isDrawing = false;
    this.currentPoints = [];
    this._cachedStrokes = []; // persisted strokes
    this.remoteCursors = new Map();
    this.clientId = null;

    this.onStrokeReady = options.onStrokeReady || function () {};
    this.onCursorMove = options.onCursorMove || function () {};

    this._setup();
  }

  _setup() {
    this.resize();
    this.bindListeners();
    window.addEventListener("resize", () => this.resize());
    setInterval(() => this._drawRemoteCursors(), 60);
  }

  setClientInfo(clientId) { this.clientId = clientId; }

  resize() {
    const w = window.innerWidth - 240; // account sidebar width
    const h = window.innerHeight - 60;  // account toolbar height

    // set backing sizes using pixelRatio
    this.drawingCanvas.width = Math.max(100, Math.floor(w * this.pixelRatio));
    this.drawingCanvas.height = Math.max(100, Math.floor(h * this.pixelRatio));
    this.cursorCanvas.width = this.drawingCanvas.width;
    this.cursorCanvas.height = this.drawingCanvas.height;

    this.drawingCanvas.style.width = `${Math.max(100, w)}px`;
    this.drawingCanvas.style.height = `${Math.max(100, h)}px`;
    this.cursorCanvas.style.width = `${Math.max(100, w)}px`;
    this.cursorCanvas.style.height = `${Math.max(100, h)}px`;

    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.cursorCtx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    this.redrawAllCached();
  }

  bindListeners() {
    this.drawingCanvas.addEventListener("mousedown", (e) => this.start(e));
    window.addEventListener("mousemove", (e) => this.move(e));
    window.addEventListener("mouseup", (e) => this.end(e));

    this.drawingCanvas.addEventListener("touchstart", (e) => this.start(e), { passive: false });
    this.drawingCanvas.addEventListener("touchmove", (e) => this.move(e), { passive: false });
    this.drawingCanvas.addEventListener("touchend", (e) => this.end(e));
  }

  setTool(t) { this.tool = t; }
  setColor(c) { this.color = c; }
  setSize(s) { this.size = Number(s); }

  start(ev) {
    ev.preventDefault();
    const p = this._getPos(ev);
    this.isDrawing = true;
    this.currentPoints = [p];
    this._drawPoint(p);
  }

  move(ev) {
    const p = this._getPos(ev);
    if (!this.isDrawing) {
      this.onCursorMove(p.x, p.y);
      return;
    }
    ev.preventDefault();
    this.currentPoints.push(p);
    this._drawSegment(this.currentPoints);
    this.onCursorMove(p.x, p.y);
  }

  end(ev) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentPoints.length > 1) {
      const stroke = {
        points: this.currentPoints.slice(),
        color: this.color,
        size: this.size,
        tool: this.tool,
        strokeId: this._makeId()
      };
      this._cachedStrokes.push(stroke);
      this.onStrokeReady(stroke); // send to server
    }
    this.currentPoints = [];
  }

  _drawPoint(p) {
    const ctx = this.ctx;
    ctx.save();
    if (this.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = this.color;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawSegment(points) {
    if (!points || points.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    if (this.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = this.size;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size;
    }
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.restore();
  }

  drawStroke(stroke) {
    if (!stroke || !stroke.points) return;
    const ctx = this.ctx;
    ctx.save();
    if (stroke.tool === "eraser") ctx.globalCompositeOperation = "destination-out";
    else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color || "#000";
    }
    ctx.lineWidth = stroke.size || 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    const pts = stroke.points;
    if (pts.length === 1) {
      ctx.arc(pts[0].x, pts[0].y, (stroke.size || 4) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  redrawAll(strokes) {
    this._cachedStrokes = strokes ? strokes.slice() : [];
    this.redrawAllCached();
  }

  redrawAllCached() {
    this.ctx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
    if (!this._cachedStrokes) return;
    for (const s of this._cachedStrokes) this.drawStroke(s);
  }

  updateCursor(userId, x, y, color, name) {
    this.remoteCursors.set(userId, { x, y, color, name, lastSeen: Date.now() });
  }

  removeCursor(userId) {
    this.remoteCursors.delete(userId);
    this._drawRemoteCursors();
  }

  _drawRemoteCursors() {
    const now = Date.now();
    const ctx = this.cursorCtx;
    ctx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);

    for (const [id, cur] of this.remoteCursors.entries()) {
      if (id === this.clientId) continue;
      if (now - cur.lastSeen > 1200) {
        this.remoteCursors.delete(id);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = cur.color || "#2b8a3e";
      ctx.arc(cur.x, cur.y, 6, 0, Math.PI * 2);
      ctx.fill();
      if (cur.name) {
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#111";
        ctx.fillText(cur.name, cur.x + 10, cur.y + 4);
      }
      ctx.restore();
    }
  }

  toJSON() { return { strokes: this._cachedStrokes }; }
  loadFromJSON(obj) {
    this._cachedStrokes = obj.strokes || [];
    this.redrawAllCached();
  }

  _getPos(ev) {
    let clientX, clientY;
    if (ev.touches && ev.touches.length) {
      clientX = ev.touches[0].clientX; clientY = ev.touches[0].clientY;
    } else {
      clientX = ev.clientX; clientY = ev.clientY;
    }
    const rect = this.drawingCanvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.drawingCanvas.width / rect.width) / this.pixelRatio,
      y: (clientY - rect.top) * (this.drawingCanvas.height / rect.height) / this.pixelRatio,
    };
  }

  _makeId() { return Math.random().toString(36).slice(2,9); }

  clearAll() {
    this._cachedStrokes = [];
    this.ctx.clearRect(0,0,this.drawingCanvas.width,this.drawingCanvas.height);
  }
}
