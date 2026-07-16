const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src/app/renderer/renderer.js"), "utf8");
const dmScreen = fs.readFileSync(path.join(root, "src/app/renderer/dm-screen/src/main.jsx"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src/app/renderer/i18n.js"), "utf8");

assert.ok(html.includes('<script src="../../engine/spells/spell-data.js"></script>'), "character sheet loads the shared spell data runtime");
assert.ok(renderer.includes("dedupeSpellsByIdentity"), "spell loading preserves source-aware variants");
assert.ok(!/function loadSpellOptions\(\)[\s\S]{0,400}dedupeModernByName/.test(renderer), "spell loading must not dedupe by name");
assert.ok(html.includes("function spellForField(field)"), "sheet fields resolve source-aware spell references");
assert.ok(html.includes("sheetMeta.spellReferences"), "spell references serialize in sheet metadata");
assert.ok(html.includes("sheetMeta.wizardSpellbookReferences"), "wizard spellbook variants serialize without changing legacy names");
assert.ok(
  /sheetMeta\.wizardSpellbookReferences\s*=\s*sheetMeta\.wizardSpellbookReferences\.filter[\s\S]*return sheetMeta\.wizardSpellbookReferences/.test(html),
  "wizard spellbook reference cleanup must preserve the mutable serialized array"
);
assert.ok(/function wizardSpellbookReferences[\s\S]*wizardSpellbookNames\(\)\.forEach[\s\S]*findSpellByName\(name\)/.test(html), "legacy wizard spellbook names migrate to one deterministic source-aware reference");
assert.ok(/function wizardSpellListRow[\s\S]*const fieldSpell = spellForField\(field\)[\s\S]*fieldSpell\.id[\s\S]*spell\.id/.test(html), "wizard rows compare the selected source-aware identity instead of disabling every same-name variant");
assert.ok(html.includes("noAttackRoll: !hasAttackRoll"), "utility and saving-throw spells do not receive a d20 attack button");
assert.ok(html.includes("cantripScalingExpression(spell, getCharacterLevel())"), "cantrip scaling uses canonical structured data");
assert.ok(html.includes("if (spell.canonical && !behavior.damageTypes.length && !behavior.healing && !behavior.temporaryHitPoints) return null"), "canonical utility spells do not infer false damage dice");
assert.ok(html.includes("castPreparedSpell(spell, { ritual: true })"), "ritual spells expose slot-free casting");
assert.ok(/function wizardSpellbookManagerRow[\s\S]*castPreparedSpell\(row, \{ ritual: true \}\)/.test(html), "Wizards can ritual-cast an unprepared ritual from the spellbook");
assert.ok(html.includes("state.concentration ="), "direct casts update the concentration manager");
assert.ok(/function castPreparedSpell[\s\S]*confirmDirectConcentrationReplacement\(spell, options\)[\s\S]*interruptActiveRest\("spell"\)/.test(html), "direct casts confirm concentration replacement before spending resources or interrupting rest");
assert.ok(html.includes("concentrationReplacementConfirmed: Boolean(committed.session.results.concentrationReplacementConfirmed)"), "combat-confirmed concentration replacement is reused during spell commit");
assert.ok(html.includes("function endActiveConcentration"), "the prepared-spell UI exposes an explicit concentration end path");
assert.ok(/result\.mode === "instant"[\s\S]*endActiveConcentration[\s\S]*applyLongRestRecovery/.test(html), "a completed instant long rest ends concentration before refreshing recovered state");
assert.ok(/if \(result\.recovery\)[\s\S]*endActiveConcentration[\s\S]*applyLongRestRecovery/.test(html), "a completed timed long rest ends concentration while an interrupted rest does not");
assert.ok(html.includes("getTemporaryHitPointsField()"), "temporary-HP spell rolls reuse the sheet field");
assert.ok(html.includes("applyTemporaryHitPointsToSheet"), "only unambiguous self temporary-HP rolls write to the sheet");
assert.ok(!html.includes("if (row?.temporaryHitPoints)"), "mixed spell damage must not be written to the temporary-HP field");
assert.ok(html.includes("function embeddedWeaponRowsForSpell"), "embedded weapon cantrips reuse equipped weapon attack rows");
assert.ok(/embeddedWeaponRowsForSpell[\s\S]*equippedWeaponAttackSelections\(\)[\s\S]*spellcastingModifier/.test(html), "True Strike and blade cantrips combine the spell with the equipped weapon pipeline");
assert.ok(html.includes("rows.some((row) => row.embeddedWeaponAttack) ? rows : rows.slice(0, 1)"), "combat expands weapon choices without turning multi-roll spells into separate casts");
assert.ok(html.includes("function registerDeferredSpellAttackEffect"), "deferred spell riders are registered after a successful cast");
assert.ok(/function combatOptionalDamageChoices[\s\S]*ensureActiveSpellAttackEffects\(\)/.test(html), "active deferred spell riders feed the shared optional-damage pipeline");
assert.ok(html.includes("consumeActiveSpellAttackEffects(appliedOptionalDamageChoices)"), "one-use spell riders are consumed after their damage is confirmed");
assert.ok(/optionalDamageKeys: \[\.\.\.keys\][\s\S]*damageRoll: null/.test(html), "changing a rider invalidates the previous damage roll before confirmation");
assert.ok(i18n.includes('"spell.castRitual"'), "ritual controls have EN/ES localization keys");
assert.ok(i18n.includes('"spell.replaceConcentrationConfirm"'), "direct concentration replacement guidance has EN/ES localization keys");
assert.ok(dmScreen.includes('import "../../../../engine/spells/spell-data.js"'), "DM Screen uses the shared spell data runtime");
assert.ok(dmScreen.includes("formatCanonicalSpellCastingTime(spell)"), "DM Screen renders canonical casting metadata");
assert.ok(dmScreen.includes("canonicalSpellClassNames(entry)"), "DM Screen search and notes use canonical class availability");
assert.ok(dmScreen.includes("data?.__sheetMeta?.spellReferences"), "DM character spells retain serialized source-aware references");
assert.ok(dmScreen.includes('onOpenResource?.("spell", spell, note, event)'), "DM character spell buttons pass the full source-aware reference");
assert.ok(/function findResourceEntry\(kind, resource\)[\s\S]*reference\?\.id[\s\S]*entry\?\.id[\s\S]*reference\?\.source/.test(dmScreen), "DM spell note lookup prefers exact id and source before legacy name fallbacks");
assert.ok(/useEffect\(\(\) => setSpellIconFailed\(false\), \[entry\?\.icon\]\)/.test(dmScreen), "switching grouped spell tabs resets a previous remote-icon failure");

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((source) => source.trim());
inlineScripts.forEach((source, index) => {
  assert.doesNotThrow(() => new Function(source), `inline renderer script ${index + 1} should parse`);
});

console.log("Spell renderer integration tests passed.");
