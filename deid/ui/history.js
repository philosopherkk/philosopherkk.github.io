/**
 * Simple undo/redo stack for ImageData snapshots (in memory only).
 */
export class HistoryStack {
  constructor(limit = 30) {
    this.limit = limit;
    /** @type {ImageData[]} */
    this.undo = [];
    /** @type {ImageData[]} */
    this.redo = [];
  }

  /** @param {ImageData} img */
  push(img) {
    this.undo.push(clone(img));
    if (this.undo.length > this.limit) this.undo.shift();
    this.redo.length = 0;
  }

  /** @param {ImageData} current */
  undoOnce(current) {
    if (!this.undo.length) return null;
    this.redo.push(clone(current));
    return this.undo.pop();
  }

  /** @param {ImageData} current */
  redoOnce(current) {
    if (!this.redo.length) return null;
    this.undo.push(clone(current));
    return this.redo.pop();
  }

  clear() {
    this.undo.length = 0;
    this.redo.length = 0;
  }
}

function clone(img) {
  return new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
}
