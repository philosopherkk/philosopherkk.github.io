/**
 * Shared Playwright helper: load /deid/ then inject the test hook from repo-root harness.
 * The production page never assigns window.__deidTest.
 * Harness is outside /deid/ so it is not part of the Pages app path.
 * @param {import('playwright').Page} page
 * @param {string} origin e.g. http://127.0.0.1:8771
 */
export async function gotoDeidWithTestHook(page, origin) {
  await page.goto(`${origin}/deid/`, { waitUntil: "networkidle" });
  const before = await page.evaluate(() => typeof window.__deidTest);
  if (before !== "undefined") {
    throw new Error("production /deid/ must not expose __deidTest before harness inject");
  }
  await page.evaluate(async () => {
    const { installDeidTestHook } = await import("/ci/deid-harness/install-test-hook.js");
    installDeidTestHook();
  });
  const after = await page.evaluate(() => typeof window.__deidTest);
  if (after !== "object") {
    throw new Error("harness failed to install __deidTest");
  }
}
