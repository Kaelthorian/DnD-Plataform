(function createSpellDataModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndSpellDataEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function spellDataFactory() {
  "use strict";

  const SCHOOL_LABELS = Object.freeze({
    A: "Abjuration",
    BM: "Blood Magic",
    C: "Conjuration",
    D: "Divination",
    E: "Enchantment",
    I: "Illusion",
    N: "Necromancy",
    T: "Transmutation",
    V: "Evocation"
  });

  const ABILITY_CODES = Object.freeze({
    strength: "STR",
    dexterity: "DEX",
    constitution: "CON",
    intelligence: "INT",
    wisdom: "WIS",
    charisma: "CHA"
  });

  const DERIVED_CANONICAL_FIELDS = new Set([
    "id",
    "description",
    "classSources",
    "raceSources",
    "subclasses",
    "concentration",
    "ritual",
    "materialComponent",
    "icon",
    "iconFallback",
    "canonical"
  ]);

  function normalizeSpellName(value) {
    // Match the renderer/save lookup contract exactly. Punctuation is meaningful:
    // e.g. "Gate Warden" and "Gate-Warden" can be different records.
    return String(value || "").trim().toLowerCase();
  }

  function slugSpellPart(value) {
    const normalized = String(value || "").trim().toLowerCase().normalize("NFC");
    const parts = [];
    let needsSeparator = false;
    for (const character of normalized) {
      if (/[a-z0-9]/.test(character)) {
        if (needsSeparator && parts.length && parts[parts.length - 1] !== "-") parts.push("-");
        parts.push(character);
        needsSeparator = false;
      } else if (/\s/.test(character)) {
        needsSeparator = true;
      } else {
        if (parts.length && parts[parts.length - 1] !== "-") parts.push("-");
        parts.push(`u${character.codePointAt(0).toString(16)}`);
        needsSeparator = true;
      }
    }
    return parts.join("").replace(/^-+|-+$/g, "") || "unknown";
  }

  function createSpellId(name, source) {
    return `${slugSpellPart(name)}--${slugSpellPart(source || "legacy")}`;
  }

  function uniqueNames(values = []) {
    const seen = new Set();
    return values
      .map((value) => String(value || "").trim())
      .filter((value) => {
        const key = normalizeSpellName(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function tagDisplayValue(tagName, payload) {
    const tag = String(tagName || "").toLowerCase();
    const parts = String(payload || "").split("|");
    const primary = parts[0] || "";
    if (tag === "variantrule") return parts[2] || primary;
    if ([
      "action",
      "condition",
      "creature",
      "hazard",
      "item",
      "race",
      "sense",
      "skill",
      "spell",
      "status"
    ].includes(tag)) return parts[2] || primary;
    if (tag === "book") return parts[3] || primary;
    if (tag === "quickref") return parts[4] || primary;
    if (tag === "chance") return `${primary}%`;
    if (tag === "dc") return `DC ${primary}`;
    if (tag === "hit") return `${primary} to hit`;
    if (tag === "atk") {
      if (primary.includes("ms")) return "Melee Spell Attack:";
      if (primary.includes("rs")) return "Ranged Spell Attack:";
      if (primary.includes("mw")) return "Melee Weapon Attack:";
      if (primary.includes("rw")) return "Ranged Weapon Attack:";
      return "Attack:";
    }
    if (tag === "h") return "Hit:";
    if (tag === "recharge") return primary ? `Recharge ${primary}` : "Recharge";
    // Scaled tags in this corpus occur in higher-level prose; the third segment
    // is the per-slot increment rather than the spell's base dice.
    if (tag === "scaledamage" || tag === "scaledice") return parts[2] || primary;
    return primary;
  }

  function strip5eTags(value) {
    let text = String(value || "");
    let previous = "";
    while (text !== previous && /\{@[^}]+}/.test(text)) {
      previous = text;
      text = text
        .replace(/\{@(h)}/gi, (_match, tag) => tagDisplayValue(tag, ""))
        .replace(/\{@([a-zA-Z0-9]+)(?:\s+([^}]*))?}/g, (_match, tag, payload) => tagDisplayValue(tag, payload));
    }
    return text
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/[ \t]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .trim();
  }

  function entryToText(entry) {
    if (entry == null) return "";
    if (typeof entry === "string" || typeof entry === "number") return strip5eTags(entry);
    if (Array.isArray(entry)) return entry.map(entryToText).filter(Boolean).join(" ");
    if (typeof entry !== "object") return "";

    if (entry.type === "list") {
      return (entry.items || []).map((item) => {
        const text = entryToText(item);
        return text ? `- ${text}` : "";
      }).filter(Boolean).join("\n");
    }
    if (entry.type === "table") {
      const caption = strip5eTags(entry.caption || "");
      const headings = (entry.colLabels || []).map(entryToText).filter(Boolean).join(" | ");
      const rows = (entry.rows || []).map((row) => {
        const cells = Array.isArray(row) ? row : row?.row || [];
        return (Array.isArray(cells) ? cells : [cells]).map(entryToText).filter(Boolean).join(" | ");
      }).filter(Boolean);
      return [caption, headings, ...rows].filter(Boolean).join("\n");
    }
    if (entry.type === "cell") {
      if (entry.entry != null) return entryToText(entry.entry);
      if (entry.exact != null) return entryToText(entry.exact);
      if (entry.roll && typeof entry.roll === "object") {
        if (entry.roll.exact != null) return String(entry.roll.exact);
        if (entry.roll.min != null && entry.roll.max != null) return `${entry.roll.min}-${entry.roll.max}`;
      }
      return entryToText(entry.roll ?? "");
    }
    if (entry.type === "quote") {
      const quotation = entryToText(entry.entries || entry.entry || "");
      const attribution = strip5eTags(entry.by || "");
      return [quotation, attribution ? `— ${attribution}` : ""].filter(Boolean).join(" ");
    }

    const name = strip5eTags(entry.name || "");
    const body = entry.entries != null
      ? entryToText(entry.entries)
      : entry.items != null
      ? entryToText(entry.items)
      : entry.entry != null
      ? entryToText(entry.entry)
      : "";
    if (name && body) return `${name}. ${body}`;
    return body || name;
  }

  function entriesToText(entries = []) {
    return (Array.isArray(entries) ? entries : [entries])
      .map(entryToText)
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  function spellDescriptionBody(spell = {}) {
    if (Array.isArray(spell.entries)) {
      const base = entriesToText(spell.entries);
      const higher = entriesToText(spell.entriesHigherLevel || []);
      return [base, higher].filter(Boolean).join("\n\n").trim();
    }
    return String(spell.description || "")
      .replace(/^\s*Source:\s*[^.]+\.\s*/i, "")
      .replace(/^\s*Level:\s*(?:Cantrip|\d+)\.\s*/i, "")
      .replace(/^\s*School:\s*[^.]+\.\s*/i, "")
      .trim();
  }

  function spellDescription(spell = {}) {
    const source = spell.source || sourceFromLegacyDescription(spell.description) || "Unknown";
    const level = Number(spell.level) === 0 ? "Cantrip" : String(Number(spell.level) || 0);
    const school = spell.school || schoolFromLegacyDescription(spell.description) || "";
    const prefix = [`Source: ${source}.`, `Level: ${level}.`, school ? `School: ${school}.` : ""]
      .filter(Boolean)
      .join(" ");
    const body = spellDescriptionBody(spell);
    return [prefix, body].filter(Boolean).join("\n\n").trim();
  }

  function sourceFromLegacyDescription(description) {
    return String(description || "").match(/\bSource:\s*([^.]+)/i)?.[1]?.trim() || "";
  }

  function schoolFromLegacyDescription(description) {
    return String(description || "").match(/\bSchool:\s*([A-Z][A-Za-z ]*)\b/i)?.[1]?.trim() || "";
  }

  function spellSource(spell = {}) {
    return String(spell.source || sourceFromLegacyDescription(spell.description) || "").trim();
  }

  function spellSchoolCode(spell = {}) {
    return String(spell.school || schoolFromLegacyDescription(spell.description) || "").trim();
  }

  function spellSchoolLabel(spell = {}) {
    const code = spellSchoolCode(spell);
    return SCHOOL_LABELS[code.toUpperCase()] || code;
  }

  function classSourceEntries(classes = {}) {
    if (Array.isArray(classes)) return classes.map((name) => ({ name }));
    if (!classes || typeof classes !== "object") return [];
    return [
      ...(Array.isArray(classes.fromClassList) ? classes.fromClassList : []),
      ...(Array.isArray(classes.fromClassListVariant) ? classes.fromClassListVariant : [])
    ];
  }

  function spellClassNames(spell = {}) {
    return uniqueNames(classSourceEntries(spell.classSources || spell.classes).map((entry) => entry?.name || entry));
  }

  function spellSubclassNames(spell = {}) {
    if (Array.isArray(spell.subclasses)) return uniqueNames(spell.subclasses);
    const classes = spell.classSources || spell.classes;
    if (!classes || Array.isArray(classes) || typeof classes !== "object") return [];
    return uniqueNames((classes.fromSubclass || []).map((entry) => {
      const className = entry?.class?.name || "";
      const subclassName = entry?.subclass?.name || entry?.subclass?.shortName || "";
      return [className, subclassName ? `(${subclassName})` : ""].filter(Boolean).join(" ");
    }));
  }

  function spellRaceNames(spell = {}) {
    const races = spell.raceSources || spell.races;
    if (!Array.isArray(races)) return [];
    return uniqueNames(races.map((entry) => typeof entry === "string" ? entry : entry?.name));
  }

  function spellHasClass(spell, className) {
    const target = normalizeSpellName(className);
    return Boolean(target) && spellClassNames(spell).some((name) => normalizeSpellName(name) === target);
  }

  function spellHasRace(spell, raceName) {
    const target = normalizeSpellName(raceName);
    return Boolean(target) && spellRaceNames(spell).some((name) => normalizeSpellName(name) === target);
  }

  function spellIsConcentration(spell = {}) {
    if (typeof spell.concentration === "boolean") return spell.concentration;
    return (Array.isArray(spell.duration) ? spell.duration : []).some((duration) => Boolean(duration?.concentration));
  }

  function spellIsRitual(spell = {}) {
    if (typeof spell.ritual === "boolean") return spell.ritual;
    return Boolean(spell.meta?.ritual);
  }

  function spellMaterialComponent(spell = {}) {
    if (spell.materialComponent && typeof spell.materialComponent === "object") return { ...spell.materialComponent };
    const material = spell.components?.m;
    if (!material) return null;
    if (typeof material === "string") return { text: material, cost: 0, consume: false };
    const consume = material.consume === "optional" ? "optional" : material.consume === true;
    return {
      text: String(material.text || "").trim(),
      cost: Math.max(0, Number(material.cost) || 0),
      consume
    };
  }

  function pluralUnit(unit, amount) {
    const normalized = String(unit || "").toLowerCase();
    const labels = {
      action: "Action",
      bonus: "Bonus Action",
      reaction: "Reaction",
      round: "round",
      minute: "minute",
      hour: "hour",
      day: "day",
      turn: "turn"
    };
    const label = labels[normalized] || normalized || "Action";
    if (amount === 1 || ["Action", "Bonus Action", "Reaction"].includes(label)) return label;
    return `${label}s`;
  }

  function formatCastingTime(spell = {}) {
    const times = Array.isArray(spell.time) ? spell.time : [];
    if (!times.length) return String(spell.castingTime || "").trim();
    return times.map((time) => {
      const amount = Math.max(1, Number(time?.number) || 1);
      const label = pluralUnit(time?.unit, amount);
      const prefix = ["Action", "Bonus Action", "Reaction"].includes(label) && amount === 1 ? label : `${amount} ${label}`;
      return time?.condition ? `${prefix}, ${strip5eTags(time.condition)}` : prefix;
    }).join(" or ");
  }

  function formatDistance(distance = {}) {
    const type = String(distance?.type || "").toLowerCase();
    if (type === "self") return "Self";
    if (type === "touch") return "Touch";
    if (type === "sight") return "Sight";
    if (type === "unlimited") return "Unlimited";
    if (type === "special") return "Special";
    const amount = Number(distance?.amount);
    if (!Number.isFinite(amount)) return type || "";
    if (type === "feet") return `${amount} feet`;
    if (type === "miles") return `${amount} ${amount === 1 ? "mile" : "miles"}`;
    return `${amount} ${type}`.trim();
  }

  function formatRange(spell = {}) {
    const range = spell.range;
    if (!range || typeof range !== "object") return String(range || "").trim();
    const type = String(range.type || "point").toLowerCase();
    const distance = formatDistance(range.distance || {});
    if (type === "point") return distance;
    if (type === "special") return "Special";
    const amount = Number(range.distance?.amount);
    const shape = type[0]?.toUpperCase() + type.slice(1);
    if (Number.isFinite(amount) && range.distance?.type === "feet") return `Self (${amount}-foot ${shape})`;
    return [distance, shape].filter(Boolean).join(" ");
  }

  function formatComponents(spell = {}) {
    const components = spell.components;
    if (!components || typeof components !== "object") return String(components || "").trim();
    const values = [];
    if (components.v) values.push("V");
    if (components.s) values.push("S");
    if (components.m) {
      const material = spellMaterialComponent(spell);
      values.push(material?.text ? `M (${material.text})` : "M");
    }
    if (components.r) values.push("R");
    return values.join(", ");
  }

  function formatDurationEntry(entry = {}) {
    const type = String(entry.type || "").toLowerCase();
    if (type === "instant") return "Instantaneous";
    if (type === "special") return "Special";
    if (type === "permanent") {
      const ends = Array.isArray(entry.ends) && entry.ends.length ? ` (until ${entry.ends.join(" or ")})` : "";
      return `Until dispelled${ends}`;
    }
    if (type === "timed") {
      const amount = Math.max(1, Number(entry.duration?.amount) || 1);
      const unit = pluralUnit(entry.duration?.type, amount);
      const timed = `${entry.duration?.upTo ? "up to " : ""}${amount} ${unit}`;
      return entry.concentration ? `Concentration, ${timed}` : timed;
    }
    return type;
  }

  function formatDuration(spell = {}) {
    const durations = Array.isArray(spell.duration) ? spell.duration : [];
    if (!durations.length) return String(spell.duration || "").trim();
    return durations.map(formatDurationEntry).filter(Boolean).join(" or ");
  }

  function spellSavingThrowAbilities(spell = {}) {
    return uniqueNames(Array.isArray(spell.savingThrow) ? spell.savingThrow : [])
      .map((ability) => ABILITY_CODES[normalizeSpellName(ability)] || String(ability).slice(0, 3).toUpperCase());
  }

  function spellBehaviorProfile(spell = {}) {
    const miscTags = Array.isArray(spell.miscTags) ? spell.miscTags : [];
    const damageTypes = uniqueNames(Array.isArray(spell.damageInflict) ? spell.damageInflict : []);
    const conditions = uniqueNames(Array.isArray(spell.conditionInflict) ? spell.conditionInflict : []);
    const attacks = uniqueNames(Array.isArray(spell.spellAttack) ? spell.spellAttack : []);
    const areaTags = uniqueNames(Array.isArray(spell.areaTags) ? spell.areaTags : []);
    return {
      attacks,
      savingThrows: spellSavingThrowAbilities(spell),
      damageTypes,
      conditions,
      areaTags,
      concentration: spellIsConcentration(spell),
      ritual: spellIsRitual(spell),
      material: spellMaterialComponent(spell),
      healing: miscTags.includes("HL"),
      temporaryHitPoints: miscTags.includes("THP"),
      scaling: Boolean(spell.scalingLevelDice || (Array.isArray(spell.entriesHigherLevel) && spell.entriesHigherLevel.length)),
      range: spell.range || null,
      duration: spell.duration || null
    };
  }

  function directSelfTemporaryHitPointsExpression(spell = {}) {
    const profile = spellBehaviorProfile(spell);
    if (!profile.temporaryHitPoints) return "";
    const description = spellDescriptionBody(spell);
    // Choice-based and conditional grants need a target/effect resolver. They
    // must never be written into the caster's Temp HP field automatically.
    if (/\bchoose one of the following\b/i.test(description)) return "";
    const rollPattern = String.raw`\d*d\d+(?:\s*[+-]\s*(?:\d*d\d+|\d+))*|\d+`;
    const candidates = description
      .split(/\n+|[.!?]\s+/)
      .map((segment) => segment.trim().replace(/^[-*]\s*/, ""))
      .map((segment) => {
        const match = segment.match(new RegExp(`^you gain\\s+(${rollPattern})\\s+temporary hit points\\b([\\s\\S]*)$`, "i"));
        if (!match || /\b(?:for each|per|up to|maximum|max)\b/i.test(match[2] || "")) return "";
        return String(match[1] || "").replace(/\s+/g, "");
      })
      .filter(Boolean);
    return candidates.length === 1 ? candidates[0] : "";
  }

  function scalingEntries(spell = {}) {
    if (!spell.scalingLevelDice) return [];
    return Array.isArray(spell.scalingLevelDice) ? spell.scalingLevelDice : [spell.scalingLevelDice];
  }

  function cantripScalingExpression(spell, characterLevel = 1) {
    if (Number(spell?.level) !== 0) return "";
    const profiles = scalingEntries(spell);
    const damageTypes = (spell?.damageInflict || []).map(normalizeSpellName);
    const preferred = profiles.find((profile) => {
      const label = normalizeSpellName(profile?.label || "");
      return label.includes("damage") || damageTypes.some((type) => label.includes(type));
    }) || profiles[0];
    const scaling = preferred?.scaling;
    if (!scaling || typeof scaling !== "object") return "";
    const level = Math.max(1, Number(characterLevel) || 1);
    const threshold = Object.keys(scaling)
      .map(Number)
      .filter((value) => Number.isFinite(value) && value <= level)
      .sort((left, right) => right - left)[0];
    return threshold == null ? "" : String(scaling[threshold] || "").trim();
  }

  function spellHasEmbeddedWeaponAttack(spell = {}) {
    if (!Array.isArray(spell.miscTags) || !spell.miscTags.includes("AAD")) return false;
    const description = spellDescription(spell);
    return /\bbrandish\b[^.]{0,160}\bweapon\b[^.]{0,160}\bmake (?:a|one) (?:melee |ranged )?attack\b/i.test(description)
      || /\bmake (?:a|one) (?:melee |ranged )?attack with the weapon used in the spell(?:'|\u2019)s casting\b/i.test(description);
  }

  function spellHasDeferredAttackDamage(spell = {}) {
    if (!Array.isArray(spell.miscTags) || !spell.miscTags.includes("AAD")) return false;
    if (spellHasEmbeddedWeaponAttack(spell)) return false;
    const castingCondition = String(spell.time?.[0]?.condition || "");
    if (/\bimmediately after hitting\b/i.test(castingCondition)) return false;
    return (Array.isArray(spell.duration) ? spell.duration : [])
      .some((duration) => String(duration?.type || "").toLowerCase() !== "instant");
  }

  function normalizeCanonicalSpell(spell = {}) {
    const source = String(spell.source || "Unknown").trim() || "Unknown";
    const normalized = { ...spell };
    normalized.id = createSpellId(spell.name, source);
    normalized.classes = spellClassNames({ classSources: spell.classes });
    normalized.classSources = spell.classes && typeof spell.classes === "object" ? spell.classes : { fromClassList: normalized.classes.map((name) => ({ name })) };
    normalized.subclasses = spellSubclassNames({ classSources: normalized.classSources });
    if (Object.prototype.hasOwnProperty.call(spell, "races")) {
      normalized.races = spellRaceNames({ raceSources: spell.races });
      normalized.raceSources = spell.races;
    }
    normalized.description = spellDescription(spell);
    normalized.concentration = spellIsConcentration(spell);
    normalized.ritual = spellIsRitual(spell);
    normalized.materialComponent = spellMaterialComponent(spell);
    normalized.icon = String(spell.foundryImg || "").trim();
    normalized.iconFallback = `school:${String(spell.school || "unknown").toLowerCase()}`;
    normalized.canonical = true;
    return normalized;
  }

  function normalizeLegacySpell(spell = {}) {
    const explicitSource = String(spell.source || "").trim().replace(/\.\s*Level$/i, "");
    const source = String(explicitSource || sourceFromLegacyDescription(spell.description) || "Legacy").trim();
    const school = String(spell.school || schoolFromLegacyDescription(spell.description) || "").trim();
    return {
      ...spell,
      id: createSpellId(spell.name, source),
      source,
      school,
      classes: spellClassNames(spell),
      races: spellRaceNames(spell),
      description: spellDescription({ ...spell, source, school }),
      concentration: spellIsConcentration(spell) || /\bConcentration\b/i.test(String(spell.description || "")),
      ritual: spellIsRitual(spell) || /\bRitual\b/i.test(String(spell.description || "")),
      materialComponent: spellMaterialComponent(spell),
      icon: String(spell.icon || spell.foundryImg || "").trim(),
      iconFallback: String(spell.iconFallback || `school:${school.toLowerCase() || "unknown"}`),
      canonical: false
    };
  }

  function canonicalSpellObject(spell = {}) {
    if (!spell.canonical) return null;
    const canonical = {};
    Object.keys(spell).forEach((key) => {
      if (DERIVED_CANONICAL_FIELDS.has(key)) return;
      if (key === "classes") {
        canonical.classes = spell.classSources;
        return;
      }
      if (key === "races") {
        canonical.races = spell.raceSources;
        return;
      }
      canonical[key] = spell[key];
    });
    return canonical;
  }

  return {
    ABILITY_CODES,
    SCHOOL_LABELS,
    canonicalSpellObject,
    cantripScalingExpression,
    createSpellId,
    entriesToText,
    entryToText,
    formatCastingTime,
    formatComponents,
    formatDuration,
    formatRange,
    normalizeCanonicalSpell,
    normalizeLegacySpell,
    normalizeSpellName,
    schoolFromLegacyDescription,
    sourceFromLegacyDescription,
    directSelfTemporaryHitPointsExpression,
    spellBehaviorProfile,
    spellClassNames,
    spellDescription,
    spellDescriptionBody,
    spellHasClass,
    spellHasDeferredAttackDamage,
    spellHasEmbeddedWeaponAttack,
    spellHasRace,
    spellIsConcentration,
    spellIsRitual,
    spellMaterialComponent,
    spellRaceNames,
    spellSavingThrowAbilities,
    spellSchoolCode,
    spellSchoolLabel,
    spellSource,
    spellSubclassNames,
    strip5eTags
  };
});
