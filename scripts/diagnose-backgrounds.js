const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LOCAL_BACKGROUNDS = path.join(ROOT, "src", "data", "backgrounds", "backgrounds.json");
const VENDOR_BACKGROUNDS = path.join(ROOT, "vendor", "5etools-src-main", "data", "backgrounds.json");
const VENDOR_FEATS = path.join(ROOT, "vendor", "5etools-src-main", "data", "feats.json");

const MODERN_SOURCE_REPLACEMENTS = {
  phb: "xphb",
  dmg: "xdmg",
  mm: "xmm"
};

const ABILITY_NAMES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];
const SKILL_NAMES = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function exactNameKey(value) {
  return String(value || "").trim().toLowerCase();
}

function optionName(option) {
  return option?.name || "";
}

function rawOptionDescriptionText(option) {
  return option?.description || "";
}

function sourceKey(source) {
  return normalizeName(source);
}

function optionSource(option) {
  const explicit = sourceKey(option?.source || "");
  if (explicit) return explicit;
  const match = String(rawOptionDescriptionText(option) || "").match(/\bSource:\s*([A-Za-z0-9]+)/i);
  return sourceKey(match?.[1] || "");
}

function isLegacySource(source) {
  return Boolean(MODERN_SOURCE_REPLACEMENTS[sourceKey(source)]);
}

function isModernSource(source) {
  const normalized = sourceKey(source);
  return normalized === "xphb" || normalized === "xdmg" || normalized === "xmm";
}

function sourcePreferenceRank(source) {
  const normalized = sourceKey(source);
  if (isModernSource(normalized)) return 0;
  if (isLegacySource(normalized)) return 3;
  return 1;
}

function preferModernEntry(previous, next, sourceGetter) {
  if (!previous) return next;
  const previousRank = sourcePreferenceRank(sourceGetter(previous));
  const nextRank = sourcePreferenceRank(sourceGetter(next));
  if (nextRank !== previousRank) return nextRank < previousRank ? next : previous;
  return previous;
}

function dedupeBackgroundOptions(itemsList = []) {
  const byDisplayName = new Map();
  itemsList.forEach((item) => {
    const key = exactNameKey(optionName(item));
    if (!key) return;
    byDisplayName.set(key, preferModernEntry(byDisplayName.get(key), item, optionSource));
  });
  return [...byDisplayName.values()];
}

function dedupeModernByName(itemsList = [], nameGetter = optionName, sourceGetter = (item) => item?.source || "") {
  const byName = new Map();
  itemsList.forEach((item) => {
    const key = normalizeName(nameGetter(item));
    if (!key) return;
    byName.set(key, preferModernEntry(byName.get(key), item, sourceGetter));
  });
  return [...byName.values()];
}

function selectedBackgroundOption(options, selectedName) {
  const normalized = normalizeName(selectedName);
  const matches = options.filter((option) => normalizeName(optionName(option)) === normalized);
  if (matches.length > 1) {
    const exactMatches = matches.filter((option) => exactNameKey(optionName(option)) === exactNameKey(selectedName));
    if (exactMatches.length === 1) return exactMatches[0];
    return matches.find((option) => normalizeName(rawOptionDescriptionText(option)).includes("source xphb")) || matches[0] || null;
  }
  return matches[0] || null;
}

function applyBackgroundEntryMod(entries, mod) {
  if (!Array.isArray(entries) || !mod) return entries;
  const mods = Array.isArray(mod) ? mod : [mod];
  mods.forEach((item) => {
    const mode = item?.mode;
    const items = Array.isArray(item?.items) ? item.items : item?.items ? [item.items] : [];
    if (!mode || !items.length) return;
    if (mode === "insertArr") {
      const index = Number.isFinite(item.index) ? Math.max(0, Math.min(entries.length, item.index)) : entries.length;
      entries.splice(index, 0, ...items);
      return;
    }
    if (mode === "appendArr") {
      entries.push(...items);
      return;
    }
    if (mode === "replaceArr") {
      let index = -1;
      if (Number.isFinite(item.replace?.index)) index = item.replace.index;
      else if (typeof item.replace === "string") index = entries.findIndex((entry) => normalizeName(entry?.name || "") === normalizeName(item.replace));
      if (index >= 0 && index < entries.length) entries.splice(index, 1, ...items);
      return;
    }
    if (mode === "removeArr") {
      const names = Array.isArray(item.names) ? item.names : item.names ? [item.names] : [];
      names.forEach((name) => {
        const index = entries.findIndex((entry) => normalizeName(entry?.name || "") === normalizeName(name));
        if (index >= 0) entries.splice(index, 1);
      });
    }
  });
  return entries;
}

function detailRawByNameSource(backgroundDetails, options, name, source = "") {
  const normalizedName = normalizeName(name);
  const normalizedSource = normalizeName(source);
  if (!normalizedName) return null;
  const exactMatches = backgroundDetails.filter((background) => exactNameKey(background.name) === exactNameKey(name));
  const looseMatches = backgroundDetails.filter((background) => normalizeName(background.name || "") === normalizedName);
  const matches = exactMatches.length ? exactMatches : looseMatches;
  if (!matches.length) return null;
  if (!exactMatches.length) {
    const optionNames = options
      .filter((option) => normalizeName(optionName(option)) === normalizedName)
      .map((option) => exactNameKey(optionName(option)))
      .filter(Boolean);
    if (new Set(optionNames).size > 1) return null;
  }
  if (normalizedSource) return matches.find((background) => normalizeName(background.source || "") === normalizedSource) || matches[0] || null;
  return matches.find((background) => normalizeName(background.source || "") === "xphb") || matches[0] || null;
}

function resolveBackgroundDetail(backgroundDetails, options, background, seen = new Set()) {
  if (!background || typeof background !== "object") return null;
  const key = `${normalizeName(background.name || "")}|${normalizeName(background.source || "")}`;
  if (seen.has(key)) return background;
  seen.add(key);
  if (!background._copy) return background;
  const baseRaw = detailRawByNameSource(backgroundDetails, options, background._copy.name, background._copy.source);
  const base = resolveBackgroundDetail(backgroundDetails, options, baseRaw, seen);
  if (!base) return background;
  const resolved = JSON.parse(JSON.stringify({ ...base, ...background, _copy: undefined }));
  resolved.name = background.name || base.name;
  resolved.source = background.source || base.source;
  resolved.page = background.page || base.page;
  if (base.entries) resolved.entries = JSON.parse(JSON.stringify(base.entries));
  if (background._copy?._mod?.entries) resolved.entries = applyBackgroundEntryMod(resolved.entries || [], background._copy._mod.entries);
  return resolved;
}

function selectedBackgroundDetail(backgroundDetails, options, backgroundName) {
  const option = selectedBackgroundOption(options, backgroundName);
  const optionSourceValue = option?.source || "";
  const hasXphb = backgroundDetails.some((background) => normalizeName(background.name || "") === normalizeName(backgroundName) && normalizeName(background.source || "") === "xphb");
  const raw = detailRawByNameSource(backgroundDetails, options, backgroundName, hasXphb ? "" : optionSourceValue);
  return resolveBackgroundDetail(backgroundDetails, options, raw);
}

function strip5eTags(value) {
  return String(value || "")
    .replace(/{@(?:dice|damage|dc|chance)\s+([^}|]+)(?:\|[^}]*)?}/g, "$1")
    .replace(/{@variantrule\s+([^}|]+)(?:\|[^}|]+)?(?:\|([^}]+))?}/g, (_match, label, displayText) => displayText || label)
    .replace(/{@(?:feat|spell|item|filter|book|condition|skill|creature|class|background|action|itemProperty|quickref|status|sense|hazard)\s+([^}|]+)(?:\|[^}]*)?}/g, "$1")
    .replace(/{@b\s+([^}]+)}/g, "$1")
    .replace(/{@i\s+([^}]+)}/g, "$1")
    .replace(/{@[^}]+\s+([^}]+)}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function flattenEntryText(entry) {
  if (typeof entry === "string") return strip5eTags(entry);
  if (Array.isArray(entry)) return entry.map(flattenEntryText).filter(Boolean).join(" ");
  if (!entry || typeof entry !== "object") return "";
  return [
    entry.name ? `${entry.name}.` : "",
    entry.entry ? flattenEntryText(entry.entry) : "",
    entry.entries ? flattenEntryText(entry.entries) : "",
    entry.items ? flattenEntryText(entry.items) : ""
  ].filter(Boolean).join(" ");
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function extractColonSection(description, labels, stopLabels) {
  const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const stopPattern = stopLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const match = String(description || "").match(new RegExp(`(?:${labelPattern})[:.]\\s*([\\s\\S]*?)(?=\\s+(?:${stopPattern})[:.]|$)`, "i"));
  return cleanText(match?.[1] || "");
}

function fixedProficiencies(groups = [], mapper = (key) => key) {
  return (Array.isArray(groups) ? groups : []).flatMap((group) => Object.entries(group || {})
    .filter(([key, value]) => !["choose", "any", "anyStandard"].includes(key) && value === true)
    .map(([key]) => mapper(key)));
}

function choiceCount(groups = []) {
  return (Array.isArray(groups) ? groups : []).reduce((total, group) => {
    if (group?.choose) return total + (group.choose.count || 1);
    if (Number.isFinite(group?.any)) return total + group.any;
    if (Number.isFinite(group?.anyStandard)) return total + group.anyStandard;
    return total;
  }, 0);
}

function itemText(item) {
  if (typeof item === "string") return strip5eTags(item).split("|")[0];
  if (!item || typeof item !== "object") return "";
  if (item.displayName) return item.displayName;
  if (item.special) return item.special;
  if (item.item) return strip5eTags(item.item).split("|")[0];
  if (Number.isFinite(item.value)) return `${Math.round(item.value / 100)} gp`;
  if (Number.isFinite(item.containsValue)) return `pouch containing ${Math.round(item.containsValue / 100)} gp`;
  return "";
}

function backgroundEquipmentText(startingEquipment = []) {
  return (Array.isArray(startingEquipment) ? startingEquipment : [])
    .flatMap((group) => Object.entries(group || {}).flatMap(([key, values]) => key.startsWith("_") || key.length === 1 ? values : []))
    .map(itemText)
    .filter(Boolean)
    .join(", ");
}

function featRefFromString(value) {
  const raw = strip5eTags(String(value || ""))
    .replace(/\|[^|)]+$/g, "")
    .trim();
  if (!raw) return null;
  const sourceMatch = String(value || "").match(/\|([^}|)]+)(?:\}|$)/);
  const parenMatch = raw.match(/\(([^)]+)\)\s*$/);
  const semicolonParts = raw.split(";").map((part) => part.trim()).filter(Boolean);
  const name = (semicolonParts[0] || raw)
    .replace(/\([^)]*\)\s*$/g, "")
    .replace(/\bfeat\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const variant = semicolonParts[1] || parenMatch?.[1] || "";
  if (!name || !/[A-Za-z0-9]/.test(name)) return null;
  return { name, source: sourceMatch?.[1] || "", variant };
}

function backgroundFeatRefsFromDetail(detail) {
  return (Array.isArray(detail?.feats) ? detail.feats : [])
    .flatMap((group) => Object.entries(group || {})
      .filter(([, enabled]) => enabled)
      .map(([ref]) => featRefFromString(ref)))
    .filter(Boolean);
}

function featRefsFromText(description) {
  const refs = [];
  const stopLabels = ["Skill Proficiencies", "Skill Proficiency", "Tool Proficiencies", "Tool Proficiency", "Languages and Tool Proficiencies", "Languages", "Equipment", "Feature"];
  const stopPattern = stopLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const sectionMatch = String(description || "").match(new RegExp(`\\bFeat:\\s*([\\s\\S]*?)(?=\\s+(?:${stopPattern})[:.]|$)`, "i"));
  const section = cleanText(sectionMatch?.[1] || "");
  if (section && !/\byour choice\b/i.test(section)) refs.push(featRefFromString(section));
  String(description || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length <= 220)
    .forEach((sentence) => {
      if (/\byour choice\b/i.test(sentence)) return;
      const match = sentence.match(/\b(?:you gain|gain)\s+(?:the\s+)?(.+?)\s+\bfeat\b/i);
      if (match) refs.push(featRefFromString(match[1]));
  });
  return refs.filter(Boolean);
}

function abilityScoreChoices(description) {
  const section = extractColonSection(description, ["Ability Scores"], ["Feat", "Skill Proficiencies", "Skill Proficiency", "Tool Proficiencies", "Tool Proficiency", "Languages", "Equipment", "Feature"]);
  if (!section) return [];
  const allowed = ABILITY_NAMES.filter((ability) => new RegExp(`\\b${ability}\\b`, "i").test(section));
  return allowed.length ? allowed : ABILITY_NAMES;
}

function textSkills(text) {
  return SKILL_NAMES.filter((skill) => new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
}

function normalizeBackground(background, detail) {
  const description = rawOptionDescriptionText(background);
  const skillSection = extractColonSection(description, ["Skill Proficiencies", "Skill Proficiency"], ["Tool Proficiencies", "Tool Proficiency", "Languages and Tool Proficiencies", "Languages", "Equipment", "Feature"]);
  const toolSection = extractColonSection(description, ["Tool Proficiencies", "Tool Proficiency"], ["Languages and Tool Proficiencies", "Languages", "Equipment", "Feature"]);
  const languageSection = extractColonSection(description, ["Languages and Tool Proficiencies", "Languages"], ["Equipment", "Feature"]);
  const equipmentSection = extractColonSection(description, ["Equipment"], ["Feature", "Suggested Characteristics"]);
  const detailEquipment = backgroundEquipmentText(detail?.startingEquipment);
  return {
    name: optionName(background),
    source: optionSource(background) || detail?.source || "",
    hasStructuredDetail: Boolean(detail),
    detailName: detail?.name || "",
    abilityScoreChoices: abilityScoreChoices(description),
    fixedSkills: detail ? fixedProficiencies(detail.skillProficiencies, (key) => SKILL_NAMES.find((skill) => normalizeName(skill) === normalizeName(key)) || key) : textSkills(skillSection.replace(/\bchoose\b[\s\S]*$/i, "")),
    skillChoiceCount: detail ? choiceCount(detail.skillProficiencies) : /\bchoose\b|\bof your choice\b/i.test(skillSection) ? 1 : 0,
    fixedTools: detail ? fixedProficiencies(detail.toolProficiencies) : toolSection && !/\bchoose\b|\bor\b|\bof your choice\b/i.test(toolSection) ? [toolSection] : [],
    toolChoiceCount: detail ? choiceCount(detail.toolProficiencies) : /\bchoose\b|\bor\b|\bof your choice\b/i.test(toolSection) ? 1 : 0,
    fixedLanguages: detail ? fixedProficiencies(detail.languageProficiencies) : [],
    languageChoiceCount: detail ? choiceCount(detail.languageProficiencies) : /\bof your choice\b/i.test(languageSection) ? 1 : 0,
    featRefs: [...backgroundFeatRefsFromDetail(detail), ...featRefsFromText(description)]
      .filter((ref, index, refs) => refs.findIndex((item) => normalizeName(item.name) === normalizeName(ref.name) && normalizeName(item.source) === normalizeName(ref.source)) === index),
    equipmentText: detailEquipment || equipmentSection
  };
}

function runDiagnostics() {
  const localBackgrounds = readJson(LOCAL_BACKGROUNDS);
  const vendorBackgrounds = readJson(VENDOR_BACKGROUNDS).background || [];
  const vendorFeats = readJson(VENDOR_FEATS).feat || [];
  const options = dedupeBackgroundOptions(localBackgrounds);
  const backgroundDetails = dedupeModernByName(vendorBackgrounds, (background) => background?.name || "", (background) => background?.source || "");
  const featNames = new Set(vendorFeats.map((feat) => normalizeName(feat.name)));
  const errors = [];
  const warnings = [];

  if (options.length !== localBackgrounds.length) {
    errors.push(`Selector exposes ${options.length} backgrounds, but local data has ${localBackgrounds.length}.`);
  }

  const normalizedOptionNames = new Map();
  options.forEach((option) => {
    const key = normalizeName(optionName(option));
    if (!normalizedOptionNames.has(key)) normalizedOptionNames.set(key, []);
    normalizedOptionNames.get(key).push(exactNameKey(optionName(option)));
  });

  const backgrounds = options
    .sort((a, b) => optionName(a).localeCompare(optionName(b)))
    .map((background) => {
      const selected = selectedBackgroundOption(options, optionName(background));
      if (!selected || exactNameKey(optionName(selected)) !== exactNameKey(optionName(background))) {
        errors.push(`${optionName(background)} does not resolve to its exact selector option.`);
      }
      const detail = selectedBackgroundDetail(backgroundDetails, options, optionName(background));
      const looseNames = normalizedOptionNames.get(normalizeName(optionName(background))) || [];
      if (detail && looseNames.length > 1 && exactNameKey(detail.name) !== exactNameKey(optionName(background))) {
        errors.push(`${optionName(background)} maps to structured detail for ${detail.name}.`);
      }
      if (!detail) warnings.push(`${optionName(background)} uses local text fallback; no structured vendor detail.`);
      const normalized = normalizeBackground(background, detail);
      normalized.featRefs.forEach((ref) => {
        if (!featNames.has(normalizeName(ref.name))) warnings.push(`${normalized.name} references feat "${ref.name}" that is not in vendor feats.`);
      });
      return normalized;
    });

  return {
    localCount: localBackgrounds.length,
    selectorCount: options.length,
    structuredDetailCount: backgroundDetails.length,
    fallbackCount: backgrounds.filter((background) => !background.hasStructuredDetail).length,
    errors,
    warnings,
    backgrounds
  };
}

if (require.main === module) {
  const diagnostics = runDiagnostics();
  const asJson = process.argv.includes("--json");
  const list = process.argv.includes("--list");
  if (asJson) {
    console.log(JSON.stringify(diagnostics, null, 2));
  } else {
    console.log(`Local backgrounds: ${diagnostics.localCount}`);
    console.log(`Selector backgrounds: ${diagnostics.selectorCount}`);
    console.log(`Structured vendor details: ${diagnostics.structuredDetailCount}`);
    console.log(`Text-fallback backgrounds: ${diagnostics.fallbackCount}`);
    console.log(`Errors: ${diagnostics.errors.length}`);
    diagnostics.errors.forEach((error) => console.log(`ERROR: ${error}`));
    console.log(`Warnings: ${diagnostics.warnings.length}`);
    diagnostics.warnings.slice(0, 25).forEach((warning) => console.log(`WARN: ${warning}`));
    if (diagnostics.warnings.length > 25) console.log(`WARN: ... ${diagnostics.warnings.length - 25} more`);
    if (list) {
      diagnostics.backgrounds.forEach((background) => {
        const fields = [
          background.hasStructuredDetail ? `detail=${background.detailName}` : "detail=fallback",
          background.abilityScoreChoices.length ? `ability=${background.abilityScoreChoices.join("/")}` : "",
          background.fixedSkills.length ? `skills=${background.fixedSkills.join("/")}` : "",
          background.skillChoiceCount ? `skillChoices=${background.skillChoiceCount}` : "",
          background.fixedTools.length ? `tools=${background.fixedTools.join("/")}` : "",
          background.toolChoiceCount ? `toolChoices=${background.toolChoiceCount}` : "",
          background.fixedLanguages.length ? `languages=${background.fixedLanguages.join("/")}` : "",
          background.languageChoiceCount ? `languageChoices=${background.languageChoiceCount}` : "",
          background.featRefs.length ? `feats=${background.featRefs.map((ref) => ref.name).join("/")}` : "",
          background.equipmentText ? "equipment=yes" : "equipment=no"
        ].filter(Boolean).join("; ");
        console.log(`- ${background.name} (${fields})`);
      });
    }
  }
  if (diagnostics.errors.length) process.exitCode = 1;
}

module.exports = {
  runDiagnostics
};
