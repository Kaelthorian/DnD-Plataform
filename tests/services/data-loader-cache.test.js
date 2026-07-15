"use strict";

const assert = require("assert");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const dataLoader = require("../../src/services/data-loader");

async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dnd-item-cache-"));
  const itemsPath = path.join(root, "items.json");
  const baseItemsPath = path.join(root, "items-base.json");
  const cachePath = path.join(root, "cache", "items-catalog.bin");
  try {
    await Promise.all([
      fs.writeFile(itemsPath, JSON.stringify({ item: [{ name: "Potion of Testing", source: "TST" }] })),
      fs.writeFile(baseItemsPath, JSON.stringify({ baseitem: [{ name: "Test Sword", source: "TST" }], itemProperty: [], itemType: [], itemMastery: [] }))
    ]);

    dataLoader.clearItemCatalogMemoryCache();
    const first = await dataLoader.loadItems(root, { itemsPath, baseItemsPath, cachePath });
    assert.strictEqual(first.cacheMeta.source, "source-json", "first load should parse source JSON in the worker");
    assert.strictEqual(first.items.item.length, 1);
    assert.ok((await fs.stat(cachePath)).size > 0, "worker should persist the compiled catalog cache");

    dataLoader.clearItemCatalogMemoryCache();
    const second = await dataLoader.loadItems(root, { itemsPath, baseItemsPath, cachePath });
    assert.strictEqual(second.cacheMeta.source, "persistent-cache", "second load should reuse the compiled cache");
    assert.strictEqual(second.baseItems.baseitem[0].name, "Test Sword");

    await new Promise((resolve) => setTimeout(resolve, 20));
    await fs.writeFile(itemsPath, JSON.stringify({ item: [{ name: "Potion of Testing", source: "TST" }, { name: "Updated Item", source: "TST" }] }));
    dataLoader.clearItemCatalogMemoryCache();
    const refreshed = await dataLoader.loadItems(root, { itemsPath, baseItemsPath, cachePath });
    assert.strictEqual(refreshed.cacheMeta.source, "source-json", "source changes should invalidate the persistent cache");
    assert.strictEqual(refreshed.items.item.length, 2);
  } finally {
    dataLoader.clearItemCatalogMemoryCache();
    await fs.rm(root, { recursive: true, force: true });
  }
  console.log("data loader cache tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
