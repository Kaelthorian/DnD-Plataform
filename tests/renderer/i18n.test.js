const assert = require("assert");

const i18n = require("../../src/app/renderer/i18n");

const memoryStorage = new Map();
global.localStorage = {
  getItem: (key) => memoryStorage.get(key) || null,
  setItem: (key, value) => memoryStorage.set(key, String(value)),
  removeItem: (key) => memoryStorage.delete(key)
};

i18n.setLanguage("en");
assert.strictEqual(i18n.getLanguage(), "en");
assert.strictEqual(i18n.t("settings.language"), "Language");

i18n.setLanguage("es");
assert.strictEqual(i18n.getLanguage(), "es");
assert.strictEqual(i18n.t("settings.language"), "Idioma");

assert.strictEqual(i18n.t("missing.translation.key"), "missing.translation.key");
assert.strictEqual(i18n.t("alerts.summary", {
  total: 2,
  critical: 1,
  important: 1,
  optional: 0
}), "2 alerta(s): 1 cr\u00edticas, 1 importantes, 0 opcionales");

assert.strictEqual(i18n.translateDynamicText("Personaje"), "Personaje");

i18n.setLanguage("en");
assert.strictEqual(i18n.translateDynamicText("Personaje"), "Character");
assert.strictEqual(i18n.translateDynamicText("unknown.dynamic.key", "Value {count}", { count: 3 }), "Value 3");
