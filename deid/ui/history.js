/**
 * Undo/redo stack for page snapshots (image + flags + serialHits). In memory only.
 */
export class HistoryStack {
  constructor(limit = 30) {
    this.limit = limit;
    /** @type {import('./historyTypes.js').PageSnapshot[]} */
    this.undo = [];
    /** @type {import('./historyTypes.js').PageSnapshot[]} */
    this.redo = [];
  }

  /**
   * @param {ImageData} img
   * @param {import('../core/types.js').FlagHit[]} [flags]
   * @param {string[]} [serialHits]
   */
  push(img, flags = [], serialHits = []) {
    this.undo.push(snapshot(img, flags, serialHits));
    if (this.undo.length > this.limit) this.undo.shift();
    this.redo.length = 0;
  }

  /**
   * @param {ImageData} current
   * @param {import('../core/types.js').FlagHit[]} flags
   * @param {string[]} serialHits
   * @returns {import('./historyTypes.js').PageSnapshot|null}
   */
  undoOnce(current, flags = [], serialHits = []) {
    if (!this.undo.length) return null;
    this.redo.push(snapshot(current, flags, serialHits));
    return this.undo.pop();
  }

  /**
   * @param {ImageData} current
   * @param {import('../core/types.js').FlagHit[]} flags
   * @param {string[]} serialHits
   * @returns {import('./historyTypes.js').PageSnapshot|null}
   */
  redoOnce(current, flags = [], serialHits = []) {
    if (!this.redo.length) return null;
    this.undo.push(snapshot(current, flags, serialHits));
    return this.redo.pop();
  }

  clear() {
    this.undo.length = 0;
    this.redo.length = 0;
  }
}

/**
 * @param {ImageData} img
 * @param {import('../core/types.js').FlagHit[]} flags
 * @param {string[]} serialHits
 */
function snapshot(img, flags, serialHits) {
  return {
    image: new ImageData(new Uint8ClampedArray(img.data), img.width, img.height),
    flags: (flags || []).map((f) => ({
      ...f,
      box: [...f.box],
    })),
    serialHits: (serialHits || []).slice(),
  };
}
