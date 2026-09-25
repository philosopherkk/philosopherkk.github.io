/**
 * Shared JSDoc typedefs for the deid core (DOM-free).
 * @module core/types
 */

/**
 * @typedef {[number, number, number, number]} Box
 * Pixel or fraction box: [x0, y0, x1, y1].
 */

/**
 * @typedef {Object} Word
 * @property {string} text
 * @property {number} conf  0–100
 * @property {number} x0
 * @property {number} y0
 * @property {number} x1
 * @property {number} y1
 * @property {[number, number, number]} [line]  block/par/line ids
 */

/**
 * @typedef {Object} CropSpec
 * @property {Box} keep  Fraction keep window
 * @property {Box[]} erase  Fraction erase boxes (blanked white)
 * @property {[number, number][]} [cut]  Full-width y-bands to cut out
 * @property {Anchor[]} [anchors]
 */

/**
 * @typedef {Object} Anchor
 * @property {string[]} prefixes  Word prefixes to match
 * @property {[number, number]} xRange
 * @property {[number, number]} yRange
 * @property {number} expectedY0
 */

/**
 * @typedef {Object} FlagHit
 * @property {Box} box  Pixel box on the current image
 * @property {string} reason
 * @property {string} [text]
 * @property {boolean} blanked  User has blanked this flag
 */

/**
 * @typedef {Object} DeidResult
 * @property {string} device
 * @property {ImageData|OffscreenCanvas|HTMLCanvasElement} image
 * @property {number} uprightRot  0|90|180|270
 * @property {number} deskew  Degrees
 * @property {number} shift  Anchor dy fraction
 * @property {string|null} anchor
 * @property {Box[]} removedRegions  Regions cropped/blanked (on upright full page, for debug)
 * @property {FlagHit[]} flags  Unresolved safety-net flags
 * @property {string[]} serialHits
 * @property {boolean} passed  True when no unresolved flags and no serial hits
 */

/**
 * @typedef {Object} OcrProvider
 * @property {(image: ImageBitmap|HTMLCanvasElement|OffscreenCanvas|ImageData, opts?: {lang?: string, psm?: number}) => Promise<Word[]>} recognize
 */

export {};
