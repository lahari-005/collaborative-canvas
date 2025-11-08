// server/rooms.js
import { DrawingState } from "./drawing-state.js";

const rooms = new Map();
const DEFAULT_PALETTE = [
  "#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#911eb4",
  "#46f0f0","#f032e6","#bcf60c","#fabebe","#008080","#e6beff"
];

export function getRoom(name) {
  if (!rooms.has(name)) rooms.set(name, new DrawingState(name, DEFAULT_PALETTE));
  return rooms.get(name);
}
