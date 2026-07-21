const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const packageJson = JSON.parse(read("package.json"));
const main = read("src/app/renderer/dm-screen/src/main.jsx");
const reactAppIcons = read("src/app/renderer/dm-screen/src/components/icons/AppIcon.jsx");
const reactDndIcons = read("src/app/renderer/dm-screen/src/components/icons/dndIcons.jsx");
const gameIconData = read("src/app/renderer/dm-screen/src/components/icons/game-icon-data.js");
const dmStyles = read("src/app/renderer/dm-screen/styles.css");
const classicHtml = read("src/app/renderer/index.html");
const buildCache = read("scripts/ensure-dm-screen-build.js");

assert.ok(packageJson.dependencies["lucide-react"], "lucide-react is not declared");
assert.ok(packageJson.dependencies["@iconify/react"], "@iconify/react is not declared");
assert.ok(packageJson.dependencies["@iconify-json/game-icons"], "the offline Game Icons source is not declared");
assert.strictEqual(packageJson.scripts["icons:generate"], "node ./scripts/generate-dm-icon-data.js");

assert.match(reactAppIcons, /from "lucide-react"/, "AppIcon does not use Lucide");
assert.doesNotMatch(reactAppIcons, /import\(/, "AppIcon must not dynamically import icons");
assert.match(reactDndIcons, /from "@iconify\/react\/offline"/, "fantasy icons are not rendered offline");
for (const semanticName of ["DiceIcon", "QuestIcon", "NpcIcon", "LocationIcon", "LootIcon", "SpellbookIcon", "CombatIcon", "PotionIcon", "TreasureIcon"]) {
  assert.match(reactDndIcons, new RegExp(`export const ${semanticName}\\b`), `${semanticName} is not exported`);
}
assert.doesNotMatch(main, /@iconify\/react|game-icons:/, "DM Screen bypasses the semantic icon layer");
assert.doesNotMatch(gameIconData, /https?:\/\//, "curated fantasy icon data contains a runtime URL");

assert.match(dmStyles, /\.dm-icon-button[\s\S]*min-width:\s*36px[\s\S]*min-height:\s*36px/, "React icon buttons are smaller than 36px");
assert.match(dmStyles, /\.dm-icon-button:focus-visible/, "React icon buttons have no focus-visible state");
assert.match(dmStyles, /\.dm-icon-button:disabled/, "React icon buttons have no disabled state");
assert.match(reactAppIcons, /aria-label=\{label\}/, "AppIconButton does not require an accessible label");
assert.match(reactAppIcons, /title=\{label\}/, "AppIconButton does not expose a tooltip");

assert.ok(classicHtml.includes('data-app-icon="combat"'), "classic combat navigation does not use the shared icon layer");
assert.ok(classicHtml.includes('data-app-icon="spellbook"'), "classic notes navigation does not use the shared icon layer");
assert.ok(!classicHtml.includes("🔓") && !classicHtml.includes("🔒"), "classic UI still uses lock emojis as icons");
for (const sourceName of ["AppIcon.jsx", "dndIcons.jsx", "game-icon-data.js"]) {
  assert.ok(buildCache.includes(sourceName), `${sourceName} does not invalidate the DM Screen build cache`);
}

console.log("icon system tests passed");
