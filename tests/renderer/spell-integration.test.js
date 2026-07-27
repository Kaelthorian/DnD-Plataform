const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "src/app/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "src/app/renderer/renderer.js"), "utf8");
const dmScreen = fs.readFileSync(path.join(root, "src/app/renderer/dm-screen/src/main.jsx"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src/app/renderer/i18n.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/app/renderer/styles.css"), "utf8");

assert.ok(html.includes('<script src="../../engine/spells/spell-data.js"></script>'), "character sheet loads the shared spell data runtime");
assert.ok(renderer.includes("dedupeSpellsByIdentity"), "spell loading preserves source-aware variants");
assert.ok(!/function loadSpellOptions\(\)[\s\S]{0,400}dedupeModernByName/.test(renderer), "spell loading must not dedupe by name");
assert.ok(html.includes("function spellForField(field)"), "sheet fields resolve source-aware spell references");
assert.ok(html.includes("sheetMeta.spellReferences"), "spell references serialize in sheet metadata");
assert.ok(html.includes("sheetMeta.wizardSpellbookReferences"), "wizard spellbook variants serialize without changing legacy names");
assert.ok(/function normalizeName\(name\)\s*\{\s*return String\(name \?\? ""\)\.trim\(\)\.toLowerCase\(\);\s*\}/.test(html), "name normalization tolerates legacy non-text spellbook entries");
assert.ok(
  /sheetMeta\.wizardSpellbookReferences\s*=\s*sheetMeta\.wizardSpellbookReferences\.filter[\s\S]*return sheetMeta\.wizardSpellbookReferences/.test(html),
  "wizard spellbook reference cleanup must preserve the mutable serialized array"
);
assert.ok(/function wizardSpellbookReferences[\s\S]*wizardSpellbookNames\(\)\.forEach[\s\S]*findSpellByName\(name\)/.test(html), "legacy wizard spellbook names migrate to one deterministic source-aware reference");
assert.ok(html.includes("const spellbookReferences = wizardSpellbookReferences();"), "new wizard spells migrate legacy entries before adding their source-aware reference");
assert.ok(html.includes("const uniqueReferenced = referenced.filter"), "the spellbook hides duplicate saved references while preserving distinct spell identities");
assert.ok(html.includes("spell?.id || spell?.spellId || spell?.sourceName || spell?.name"), "prepared-spell rows reuse the same cast-level state key as their canonical spell");
assert.ok(/function wizardSpellListRow[\s\S]*const fieldSpell = spellForField\(field\)[\s\S]*fieldSpell\.id[\s\S]*spell\.id/.test(html), "wizard rows compare the selected source-aware identity instead of disabling every same-name variant");
assert.ok(html.includes("noAttackRoll: !hasAttackRoll"), "utility and saving-throw spells do not receive a d20 attack button");
assert.ok(html.includes("cantripScalingExpression(spell, getCharacterLevel())"), "cantrip scaling uses canonical structured data");
assert.ok(html.includes("if (spell.canonical && !behavior.damageTypes.length && !behavior.healing && !behavior.temporaryHitPoints) return null"), "canonical utility spells do not infer false damage dice");
assert.ok(html.includes("castPreparedSpell(spell, { ritual: true })"), "ritual spells expose slot-free casting");
assert.ok(/function wizardSpellbookManagerRow[\s\S]*castPreparedSpell\(row, \{ ritual: true \}\)/.test(html), "Wizards can ritual-cast an unprepared ritual from the spellbook");
assert.ok(html.includes("state.concentration ="), "direct casts update the concentration manager");
assert.ok(/function castPreparedSpell[\s\S]*confirmDirectConcentrationReplacement\(spell, options\)[\s\S]*interruptActiveRest\("spell"\)/.test(html), "direct casts confirm concentration replacement before spending resources or interrupting rest");
assert.ok(html.includes("function preparedSpellActionDefinition"), "prepared spells reuse combat metadata for contextual availability");
assert.ok(html.includes("function openPreparedSpellTargetResolution"), "targeted out-of-combat spells reuse the existing resolution UI");
assert.ok(html.includes("spell.requiresCombat"), "combat-dependent spells expose a scoped availability message");
assert.ok(html.includes("fromCombat: true"), "combat resolution marks spell commits as in-combat casts");
assert.ok(html.includes("concentrationReplacementConfirmed: Boolean(committed.session.results.concentrationReplacementConfirmed)"), "combat-confirmed concentration replacement is reused during spell commit");
assert.ok(html.includes("function endActiveConcentration"), "the prepared-spell UI exposes an explicit concentration end path");
assert.ok(html.includes('section.classList.add("spell-category", `spell-category-${tone}`)'), "spellbook sections support semantic visual categories");
assert.ok(html.includes('tone: "known-cantrips"'), "known cantrips have a distinct spellbook category");
assert.ok(html.includes('tone: "learn-cantrips"'), "learnable cantrips have a distinct spellbook category");
assert.ok(html.includes('tone: "known-spells"'), "known spells have a distinct spellbook category");
assert.ok(html.includes('tone: "learn-spells"'), "learnable spells have a distinct spellbook category");
assert.ok(html.includes('tone: "spellbook"'), "Wizard spellbook entries have a distinct category");
assert.match(styles, /\.spell-category-known-cantrips[\s\S]*?#c084fc/, "known cantrips use a violet accent");
assert.match(styles, /\.spell-category-learn-cantrips[\s\S]*?#22d3ee/, "learnable cantrips use a cyan accent");
assert.match(styles, /\.spell-category-known-spells[\s\S]*?#4ade80/, "known spells use a green accent");
assert.match(styles, /\.spell-category-learn-spells[\s\S]*?#60a5fa/, "learnable spells use a blue accent");
assert.match(styles, /\.spell-category-spellbook[\s\S]*?var\(--dm-amber\)/, "the Wizard spellbook uses the amber accent");
assert.match(styles, /\.dice-button\s*\{[\s\S]*?min-height:\s*16px[\s\S]*?height:\s*auto[\s\S]*?border:\s*1px solid #525252[\s\S]*?background:\s*#262626[\s\S]*?color:\s*#d4d4d4[\s\S]*?overflow-wrap:\s*anywhere[\s\S]*?white-space:\s*normal/, "Attacks and Spellcasting buttons should use the Equipment control style and wrap long labels");
assert.match(styles, /\.dice-button\.active\s*\{[\s\S]*?border-color:\s*#f59e0b[\s\S]*?background:\s*#f59e0b[\s\S]*?color:\s*#0a0a0a/, "active Attacks and Spellcasting buttons should match equipped Equipment controls");
assert.match(styles, /\.prepared-spell-name\s*\{[\s\S]*?overflow-wrap:\s*anywhere[\s\S]*?white-space:\s*normal/, "spell names on the sheet should wrap instead of being truncated");
assert.match(styles, /\.prepared-spell-row\s*\{[\s\S]*?flex:\s*0 0 auto[\s\S]*?min-height:\s*20px/, "prepared spell rows should grow with wrapped content instead of shrinking into neighboring rows");
assert.match(html, /const DAMAGE_TYPE_ICON_PATHS\s*=\s*\{[\s\S]*?bludgeoning:[\s\S]*?fire:[\s\S]*?slashing:/, "prepared spells should define minimal damage-type icon paths");
assert.match(html, /function damageTypeIcon\(type\)[\s\S]*?createElementNS\("http:\/\/www\.w3\.org\/2000\/svg", "svg"\)/, "prepared spells should render damage types as inline SVG icons");
assert.match(html, /damageType\.appendChild\(damageTypeIcon\(spell\.damageType\)\)/, "prepared spell rows should use the damage-type icon instead of text abbreviations");
assert.match(styles, /\.prepared-spell-damage-type\s*\{[\s\S]*?min-width:\s*24px[\s\S]*?height:\s*24px[\s\S]*?border-radius:\s*50%[\s\S]*?background:\s*#262626/, "damage-type indicators should be fixed-size dark circles");
assert.match(styles, /\.damage-type-icon\s*\{[\s\S]*?width:\s*15px[\s\S]*?height:\s*15px[\s\S]*?stroke:\s*currentColor/, "damage-type icons should use the compact sheet icon treatment");
assert.match(styles, /\.prepared-resource-counters\s*\{[\s\S]*?position:\s*sticky[\s\S]*?top:\s*-4px/, "Attacks and Spellcasting resource counters should stay pinned while scrolling");
assert.match(styles, /\.prepared-resource-orb\s*\{[\s\S]*?min-width:\s*25px[\s\S]*?max-width:\s*25px[\s\S]*?flex:\s*0 0 25px/, "prepared resource orbs should keep a fixed size");
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
assert.ok(i18n.includes('"translation.translateDescriptions"'), "description translation controls have EN/ES localization keys");
assert.ok(html.includes('featureTranslationKey("option-description"'), "generic choice descriptions expose the shared translation control");
assert.ok(html.includes('featureTranslationKey("subclass"'), "subclass descriptions expose the shared translation control");
assert.ok(
  /function buildFeatureChoiceOptionDetailContent[\s\S]{0,1800}buildSpellDrawerContent\(spell, "", \{ includeTranslationToolbar: true \}\)/.test(html),
  "spell details opened from feature choices expose translation"
);
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
