"use strict";

const fs = require("fs/promises");
const path = require("path");
const v8 = require("v8");
const { parentPort, workerData } = require("worker_threads");

async function sourceSignature() {
  const [itemsStat, baseItemsStat, automationStat] = await Promise.all([
    fs.stat(workerData.itemsPath),
    fs.stat(workerData.baseItemsPath),
    fs.stat(workerData.automationPath)
  ]);
  return [
    `v${workerData.cacheVersion}`,
    `schema:${workerData.automationSchemaVersion}`,
    `${itemsStat.size}:${Math.trunc(itemsStat.mtimeMs)}`,
    `${baseItemsStat.size}:${Math.trunc(baseItemsStat.mtimeMs)}`,
    `${automationStat.size}:${Math.trunc(automationStat.mtimeMs)}`
  ].join("|");
}

async function readCachedCatalog(signature) {
  if (!workerData.cachePath) return null;
  try {
    const cached = v8.deserialize(await fs.readFile(workerData.cachePath));
    if (cached?.signature !== signature || !cached.data?.items || !cached.data?.baseItems || !cached.data?.automation) return null;
    return cached.data;
  } catch (_error) {
    return null;
  }
}

async function writeCachedCatalog(signature, data) {
  if (!workerData.cachePath) return;
  await fs.mkdir(path.dirname(workerData.cachePath), { recursive: true });
  await fs.writeFile(workerData.cachePath, v8.serialize({ signature, data }));
}

async function parseSourceCatalog() {
  const [itemsRaw, baseItemsRaw, automationRaw] = await Promise.all([
    fs.readFile(workerData.itemsPath, "utf8"),
    fs.readFile(workerData.baseItemsPath, "utf8"),
    fs.readFile(workerData.automationPath, "utf8")
  ]);
  return {
    items: JSON.parse(itemsRaw),
    baseItems: JSON.parse(baseItemsRaw),
    automation: JSON.parse(automationRaw)
  };
}

async function run() {
  const startedAt = Date.now();
  const signature = await sourceSignature();
  const cached = await readCachedCatalog(signature);
  if (cached) {
    parentPort.postMessage({
      ok: true,
      data: cached,
      meta: { source: "persistent-cache", signature, durationMs: Date.now() - startedAt }
    });
    return;
  }
  const data = await parseSourceCatalog();
  try {
    await writeCachedCatalog(signature, data);
  } catch (_error) {
    // A read-only or locked cache must not prevent the catalog from loading.
  }
  parentPort.postMessage({
    ok: true,
    data,
    meta: { source: "source-json", signature, durationMs: Date.now() - startedAt }
  });
}

run().catch((error) => {
  parentPort.postMessage({ ok: false, error: error?.stack || error?.message || String(error) });
});
