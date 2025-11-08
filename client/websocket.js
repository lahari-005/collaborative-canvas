// client/websocket.js
export class SocketManager {
  constructor(url, handlers = {}) {
    this.ws = new WebSocket(url);
    this.handlers = handlers;

    this.ws.addEventListener("open", () => {
      if (this.handlers.onOpen) this.handlers.onOpen();
    });

    this.ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this._dispatch(msg);
      } catch (e) {
        console.error("Invalid message", e);
      }
    });

    this.ws.addEventListener("close", () => {
      if (this.handlers.onClose) this.handlers.onClose();
    });

    this.ws.addEventListener("error", (e) => {
      console.error("WebSocket error", e);
    });
  }

  _dispatch(msg) {
    switch (msg.type) {
      case "init":
        this.handlers.onInit?.(msg);
        break;
      case "fullUpdate":
        this.handlers.onFullUpdate?.(msg.strokes || []);
        break;
      case "draw":
        this.handlers.onDraw?.(msg.stroke);
        break;
      case "cursor":
        this.handlers.onCursor?.(msg.userId, msg.x, msg.y, msg.color, msg.name);
        break;
      case "users":
        this.handlers.onUsers?.(msg.users || []);
        break;
      case "chat":
        this.handlers.onChat?.(msg.from, msg.text);
        break;
      default:
        console.warn("Unknown message type:", msg.type);
    }
  }

  send(obj) {
    const payload = JSON.stringify(obj);
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.ws.addEventListener("open", () => this.ws.send(payload), { once: true });
    }
  }
}
