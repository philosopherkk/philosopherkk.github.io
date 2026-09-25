/**
 * Minimal ImageData polyfill for Node unit tests.
 */
class ImageDataPolyfill {
  /**
   * @param {Uint8ClampedArray|number} dataOrWidth
   * @param {number} widthOrHeight
   * @param {number} [height]
   */
  constructor(dataOrWidth, widthOrHeight, height) {
    if (typeof dataOrWidth === "number") {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height ?? dataOrWidth.length / (4 * widthOrHeight);
    }
  }
}

if (typeof globalThis.ImageData === "undefined") {
  globalThis.ImageData = ImageDataPolyfill;
}
