/**
 * Playwright-only test hook. Lives outside /deid/ so it is not part of the app deploy path.
 * Inject via dynamic import from e2e tests after the app has loaded.
 */
import { getAppController } from "../../deid/app.js";
import { HistoryStack } from "../../deid/ui/history.js";
import { cloneImageData } from "../../deid/core/index.js";

/**
 * Install window.__deidTest for e2e. No-op if already installed.
 */
export function installDeidTestHook() {
  if (typeof window === "undefined") return null;
  if (window.__deidTest) return window.__deidTest;

  const api = getAppController();

  window.__deidTest = {
    setTool: api.setTool,
    /** @param {ImageData} imageData */
    seedWorkingPage(imageData, flags = []) {
      const history = new HistoryStack();
      const flagCopy = flags.map((f) => ({ ...f, box: [...f.box] }));
      history.push(imageData, flagCopy, []);
      api.setPages([
        {
          original: cloneImageData(imageData),
          upright: cloneImageData(imageData),
          working: cloneImageData(imageData),
          device: "generic",
          flags: flagCopy.map((f) => ({ ...f, box: [...f.box] })),
          serialHits: [],
          approved: false,
          removedRegions: [],
          history,
        },
      ]);
      api.setPageIdx(0);
      api.hideDropShowWorkspace();
      api.syncPageSelect();
      api.refreshUI();
    },
    samplePixel(x, y) {
      const pg = api.current();
      if (!pg) return null;
      const i = (Math.floor(y) * pg.working.width + Math.floor(x)) * 4;
      return [pg.working.data[i], pg.working.data[i + 1], pg.working.data[i + 2]];
    },
    workingSize() {
      const pg = api.current();
      return pg ? { w: pg.working.width, h: pg.working.height } : null;
    },
    getFlags: () => (api.current()?.flags || []).map((f) => ({ ...f, box: [...f.box] })),
    getApproved: () => api.getApproved(),
    approveBtnDisabled: () => api.approveBtnDisabled(),
    clickUndo: () => api.clickUndo(),
    clickRotate: () => api.clickRotate(),
    getTool: () => api.getTool(),
  };

  return window.__deidTest;
}
