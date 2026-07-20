(function createItemAutomationRegistryModule(globalScope, factory) {
  const schema = typeof require === "function" ? require("./item-automation-schema.js") : globalScope.dndItemAutomationSchema;
  const compiler = typeof require === "function" ? require("./item-capability-compiler.js") : globalScope.dndItemCapabilityCompiler;
  const itemCatalog = typeof require === "function" ? require("./item-catalog.js") : globalScope.dndItemCatalog;
  const api = factory(schema, compiler, itemCatalog);
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndItemAutomationRegistry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function itemAutomationRegistryFactory(schema, compiler, itemCatalog) {
  "use strict";

  function normalize(value) {
    return String(value == null ? "" : value).normalize("NFKC").trim().toLowerCase();
  }

  function catalogRecords(catalog) {
    const topLevel = Array.isArray(catalog) ? catalog : Array.isArray(catalog?.item) ? catalog.item : [];
    if (typeof itemCatalog?.collectCatalogRecords === "function") {
      return itemCatalog.collectCatalogRecords(topLevel).map((record) => record.item).filter(Boolean);
    }
    return topLevel.filter(Boolean);
  }

  function matchCatalogItems(match, items) {
    return items.filter((item) => (
      (!match.catalogId || String(item.catalogId) === String(match.catalogId))
      && (!match.name || normalize(item.name) === normalize(match.name))
      && (!match.source || normalize(item.source) === normalize(match.source))
      && (!match.variantToken || normalize(item.catalogVariantToken || item.variantToken || "root") === normalize(match.variantToken))
    ));
  }

  function createItemAutomationRegistry({ overlay, catalog }) {
    const validation = schema.validateOverlay(overlay);
    if (!validation.ok) throw new Error(`Invalid item automation overlay:\n${validation.errors.join("\n")}`);
    const records = catalogRecords(catalog);
    const entries = new Map();
    overlay.items.forEach((definition, index) => {
      const matches = matchCatalogItems(definition.match, records);
      if (matches.length !== 1) {
        throw new Error(`item-automation items[${index}] match resolved to ${matches.length} catalog items; expected exactly 1.`);
      }
      const item = matches[0];
      const catalogId = String(item.catalogId || itemCatalog.itemCatalogId(item));
      if (entries.has(catalogId)) throw new Error(`Duplicate automation definition for ${catalogId}.`);
      entries.set(catalogId, compiler.compileItemAutomation(definition, { ...item, catalogId }));
    });
    return Object.freeze({
      schemaVersion: overlay.schemaVersion,
      size: entries.size,
      get(catalogId) { return entries.get(String(catalogId || "")) || null; },
      has(catalogId) { return entries.has(String(catalogId || "")); },
      forItem(item) {
        const catalogId = String(item?.catalogId || itemCatalog.itemCatalogId(item || {}));
        return entries.get(catalogId) || null;
      },
      augmentProfile(profile, item) {
        return compiler.augmentItemAutomationProfile(profile, this.forItem(item));
      },
      entries() { return [...entries.values()].map((entry) => ({ ...entry })); }
    });
  }

  return Object.freeze({ createItemAutomationRegistry, matchCatalogItems });
});
