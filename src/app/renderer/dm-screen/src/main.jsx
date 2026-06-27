import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import bestiary from "../../../../data/bestiary/bestiary-sublist-data.json";
import spells from "../../../../data/spells/spells.json";
import itemsData from "../../../../../vendor/5etools-src-main/data/items.json";
import baseItemsData from "../../../../../vendor/5etools-src-main/data/items-base.json";

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const SIZE_LABELS = {
  T: "Tiny",
  S: "Small",
  M: "Medium",
  L: "Large",
  H: "Huge",
  G: "Gargantuan"
};
const ALIGNMENT_LABELS = {
  L: "Lawful",
  N: "Neutral",
  C: "Chaotic",
  G: "Good",
  E: "Evil",
  U: "Unaligned",
  A: "Any"
};
const ABILITY_LABELS = {
  str: "Str",
  dex: "Dex",
  con: "Con",
  int: "Int",
  wis: "Wis",
  cha: "Cha"
};
const XP_BY_CR = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000
};
const ITEM_LIBRARY = [...(itemsData.item || []), ...(baseItemsData.baseitem || [])];
const ITEM_PROPERTY_LOOKUP = new Map((baseItemsData.itemProperty || []).map((property) => [`${property.abbreviation}|${property.source}`, property]));
const ITEM_TYPE_LOOKUP = new Map((baseItemsData.itemType || []).map((type) => [`${type.abbreviation}|${type.source}`, type]));
const ITEM_MASTERY_LOOKUP = new Map((baseItemsData.itemMastery || []).map((mastery) => [`${mastery.name}|${mastery.source}`, mastery]));
const DAMAGE_TYPE_LABELS = {
  A: "Acid",
  B: "Bludgeoning",
  C: "Cold",
  F: "Fire",
  FC: "Force",
  L: "Lightning",
  N: "Necrotic",
  P: "Piercing",
  PSN: "Poison",
  I: "Psychic",
  R: "Radiant",
  S: "Slashing",
  T: "Thunder"
};
const SOURCE_SHORT_LABELS = {
  XPHB: "PHB'24",
  PHB: "PHB'14",
  XDMG: "DMG'24",
  DMG: "DMG'14",
  XMM: "MM'24",
  MM: "MM'14"
};
const SPELL_SCHOOL_LABELS = {
  A: "Abjuration",
  C: "Conjuration",
  D: "Divination",
  E: "Enchantment",
  I: "Illusion",
  N: "Necromancy",
  T: "Transmutation",
  V: "Evocation",
  BM: "Blood Magic"
};
const SPELL_SOURCE_LABELS = {
  ...SOURCE_SHORT_LABELS,
  HelianasGuidetoMonsterHunting: "HGtMH"
};
const NOTE_MIN_WIDTH = 340;
const NOTE_MIN_HEIGHT = 280;
const NOTE_DEFAULT_WIDTH = 560;
const NOTE_DEFAULT_HEIGHT = 620;
const BOARD_WIDTH = 20000;
const BOARD_HEIGHT = 20000;
const BOARD_PADDING = 12;
const BOARD_MIN_ZOOM = 0.35;
const BOARD_MAX_ZOOM = 1.8;
const BOARD_ZOOM_STEP = 0.15;
const DM_BOARD_STORAGE_KEY = "dnd-dm-screen-board-v1";
const CHARACTER_SHEET_CODE_PREFIX = "DNDCS1";
const CHARACTER_SHEET_CODE_TYPE = "dnd-character-sheet";

const CHARACTER_SKILLS = [
  ["Acrobatics", "dex", "Check Box 23"],
  ["Animal Handling", "wis", "Check Box 24", "Animal"],
  ["Arcana", "int", "Check Box 25"],
  ["Athletics", "str", "Check Box 26"],
  ["Deception", "cha", "Check Box 27", "Deception "],
  ["History", "int", "Check Box 28", "History "],
  ["Insight", "wis", "Check Box 29"],
  ["Intimidation", "cha", "Check Box 30"],
  ["Investigation", "int", "Check Box 31", "Investigation "],
  ["Medicine", "wis", "Check Box 32"],
  ["Nature", "int", "Check Box 33"],
  ["Perception", "wis", "Check Box 34", "Perception "],
  ["Performance", "cha", "Check Box 35"],
  ["Persuasion", "cha", "Check Box 36"],
  ["Religion", "int", "Check Box 37"],
  ["Sleight of Hand", "dex", "Check Box 38", "SleightofHand"],
  ["Stealth", "dex", "Check Box 39", "Stealth "],
  ["Survival", "wis", "Check Box 40"]
];

const CHARACTER_SAVE_FIELDS = {
  str: ["ST Strength", "Check Box 11"],
  dex: ["ST Dexterity", "Check Box 18"],
  con: ["ST Constitution", "Check Box 19"],
  int: ["ST Intelligence", "Check Box 20"],
  wis: ["ST Wisdom", "Check Box 21"],
  cha: ["ST Charisma", "Check Box 22"]
};

function spellSource(spell) {
  return String(spell?.description || "").match(/\bSource:\s*([^.]+)/i)?.[1]?.trim() || "Unknown";
}

function spellSchool(spell) {
  return String(spell?.description || "").match(/\bSchool:\s*([^.]+)/i)?.[1]?.trim() || "";
}

function spellSchoolLabel(spell) {
  const school = spellSchool(spell);
  return SPELL_SCHOOL_LABELS[school] || titleCase(school);
}

function abbreviateSourceLabel(source) {
  const value = String(source || "").trim();
  if (!value) return "Unknown";
  if (SPELL_SOURCE_LABELS[value]) return SPELL_SOURCE_LABELS[value];
  if (/^[A-Z0-9'/-]{2,12}$/.test(value)) return value;
  const tokens = value.match(/[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+/g) || value.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const acronym = tokens
    .map((token) => (/^\d+$/.test(token) ? token : token[0]))
    .join("");
  return acronym || value;
}

function spellSourceLabel(spell) {
  return abbreviateSourceLabel(spellSource(spell));
}

function formatSpellRank(spell) {
  const level = Number(spell?.level);
  if (!Number.isFinite(level)) return "Spell";
  if (level === 0) return "Cantrip";
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return `${level}${suffix}-Level`;
}

function formatSpellSubtitle(spell) {
  const school = spellSchoolLabel(spell);
  const rank = formatSpellRank(spell);
  return [school, rank].filter(Boolean).join(" ");
}

function formatSpellDataValue(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) return value.map(formatSpellDataValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const rendered = renderEntryText(value);
    if (rendered) return rendered;
    return Object.values(value).map(formatSpellDataValue).filter(Boolean).join(", ");
  }
  return "";
}

function extractSpellTaggedField(spell, label) {
  return String(spell?.description || "").match(new RegExp(`\\b${label}:\\s*([^.]+)`, "i"))?.[1]?.trim() || "";
}

function spellMetadataRows(spell) {
  return [
    ["Casting Time", formatSpellDataValue(spell?.castingTime ?? spell?.time) || extractSpellTaggedField(spell, "Casting Time")],
    ["Range", formatSpellDataValue(spell?.range) || extractSpellTaggedField(spell, "Range")],
    ["Components", formatSpellDataValue(spell?.components) || extractSpellTaggedField(spell, "Components")],
    ["Duration", formatSpellDataValue(spell?.duration) || extractSpellTaggedField(spell, "Duration")]
  ].filter(([, value]) => value);
}

function spellDescriptionBody(spell) {
  return cleanRulesText(spell?.description || "")
    .replace(/^Source:\s*[^.]+\.?\s*Level:\s*[^.]+\.?\s*School:\s*[^.]+\.?\s*/i, "")
    .replace(/^\d+\s*Appendix\s+[A-Z]\s*\|\s*Spells/i, "")
    .trim();
}

function spellBodyParagraphs(spell) {
  const body = spellDescriptionBody(spell)
    .replace(/\s+(Cantrip Upgrade\.|At Higher Levels\.)/g, "\n\n$1")
    .replace(/([.?!])\s+(?=[A-Z][a-z])/g, "$1\n\n");
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function formatSpellLevel(spell) {
  const level = Number(spell?.level);
  if (!Number.isFinite(level)) return "Unknown";
  return level === 0 ? "Cantrip" : `Level ${level}`;
}

function itemSource(item) {
  return item?.source || "Unknown";
}

function itemRarity(item) {
  return item?.rarity || "none";
}

function splitTaggedValue(value) {
  const [code = "", source = ""] = String(value || "").split("|");
  return {
    code: code.trim(),
    source: source.trim().toUpperCase()
  };
}

function itemLookupByTaggedValue(lookup, value) {
  const { code, source } = splitTaggedValue(value);
  if (!code) return null;
  return lookup.get(`${code}|${source}`) || [...lookup.entries()].find(([key]) => key.startsWith(`${code}|`))?.[1] || null;
}

function itemTypeMeta(item) {
  return itemLookupByTaggedValue(ITEM_TYPE_LOOKUP, item?.type);
}

function itemPropertyMetas(item) {
  return (Array.isArray(item?.property) ? item.property : [])
    .map((property) => itemLookupByTaggedValue(ITEM_PROPERTY_LOOKUP, property))
    .filter(Boolean);
}

function itemMasteryMetas(item) {
  return (Array.isArray(item?.mastery) ? item.mastery : [])
    .map((mastery) => itemLookupByTaggedValue(ITEM_MASTERY_LOOKUP, mastery))
    .filter(Boolean);
}

function itemSourceLabel(item) {
  const source = itemSource(item);
  return SOURCE_SHORT_LABELS[source] || source;
}

function itemTypeLabel(item) {
  const typeName = itemTypeMeta(item)?.name || "";
  if (item?.weapon || /weapon/i.test(typeName)) return "Weapon";
  if (/armor/i.test(typeName)) return "Armor";
  if (/shield/i.test(typeName)) return "Shield";
  if (/tool/i.test(typeName)) return "Tool";
  return typeName || "Item";
}

function itemCategorySummary(item) {
  const categories = [];
  if (item?.weaponCategory) categories.push(`${titleCase(item.weaponCategory)} Weapon`);
  const typeName = itemTypeMeta(item)?.name || "";
  if (typeName && !categories.includes(typeName)) categories.push(typeName);
  return categories.join(", ");
}

function formatItemCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  if (amount % 100 === 0) return `${amount / 100} GP`;
  if (amount % 10 === 0) return `${amount / 10} SP`;
  return `${amount} CP`;
}

function formatItemWeight(weight) {
  const amount = Number(weight);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return `${amount} lb.`;
}

function formatItemDamage(item) {
  if (!item?.dmg1) return "";
  const damageType = DAMAGE_TYPE_LABELS[item?.dmgType] || item?.dmgType || "";
  return [item.dmg1, damageType].filter(Boolean).join(" ");
}

function formatItemPropertyName(propertyMeta, item) {
  const namedEntry = Array.isArray(propertyMeta?.entries)
    ? propertyMeta.entries.find((entry) => entry && typeof entry === "object" && entry.name)
    : null;
  const baseName = namedEntry?.name || propertyMeta?.name || propertyMeta?.abbreviation || "";
  switch (propertyMeta?.abbreviation) {
    case "T":
      return item?.range ? `${baseName} (${item.range} ft.)` : baseName;
    case "A":
    case "AF":
      return item?.range ? `${baseName} (${item.range} ft.)` : baseName;
    case "RLD":
      return item?.reload ? `${baseName} (${item.reload})` : baseName;
    case "V":
      return item?.dmg2 ? `${baseName} (${item.dmg2})` : baseName;
    default:
      return baseName;
  }
}

function extractEntriesBodyText(entries) {
  const list = Array.isArray(entries) ? entries : [entries].filter(Boolean);
  if (!list.length) return "";
  const namedEntry = list.find((entry) => entry && typeof entry === "object" && entry.entries);
  return renderEntryText(namedEntry?.entries || list);
}

function itemRuleSections(item) {
  const propertySections = itemPropertyMetas(item).map((propertyMeta) => ({
    title: formatItemPropertyName(propertyMeta, item),
    text: extractEntriesBodyText(propertyMeta?.entries)
  }));
  const masterySections = itemMasteryMetas(item).map((masteryMeta) => ({
    title: `Mastery: ${masteryMeta?.name || "Unknown"}`,
    text: extractEntriesBodyText(masteryMeta?.entries)
  }));
  return [...propertySections, ...masterySections].filter((section) => section.title && section.text);
}

function itemRulesFooter(item) {
  const parts = [];
  const source = itemSourceLabel(item);
  const page = item?.page ? `page ${item.page}` : "";
  if (source || page) parts.push([source, page].filter(Boolean).join(", "));
  if (item?.srd52) parts.push("Available in the SRD 5.2.1");
  if (item?.basicRules2024) parts.push("Available in the Basic Rules (5.5e/2024)");
  return parts.join(". ");
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function signNumber(value) {
  return value >= 0 ? `+${value}` : String(value);
}

function formatNumericInputValue(value) {
  return value == null ? "" : String(value);
}

function parseNumericExpression(value) {
  const source = String(value ?? "").trim().replace(/,/g, ".");
  if (!source) return "";
  if (!/^[\d+\-*/().\s]+$/.test(source)) return null;

  let index = 0;

  function skipWhitespace() {
    while (/\s/.test(source[index] || "")) index += 1;
  }

  function parseNumber() {
    skipWhitespace();
    const match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (!match) return null;
    index += match[0].length;
    return Number(match[0]);
  }

  function parseFactor() {
    skipWhitespace();
    const operator = source[index];
    if (operator === "+" || operator === "-") {
      index += 1;
      const factor = parseFactor();
      return factor == null ? null : operator === "-" ? -factor : factor;
    }
    if (operator === "(") {
      index += 1;
      const expression = parseExpression();
      skipWhitespace();
      if (source[index] !== ")") return null;
      index += 1;
      return expression;
    }
    return parseNumber();
  }

  function parseTerm() {
    let left = parseFactor();
    if (left == null) return null;
    while (true) {
      skipWhitespace();
      const operator = source[index];
      if (operator !== "*" && operator !== "/") break;
      index += 1;
      const right = parseFactor();
      if (right == null || (operator === "/" && right === 0)) return null;
      left = operator === "*" ? left * right : left / right;
    }
    return left;
  }

  function parseExpression() {
    let left = parseTerm();
    if (left == null) return null;
    while (true) {
      skipWhitespace();
      const operator = source[index];
      if (operator !== "+" && operator !== "-") break;
      index += 1;
      const right = parseTerm();
      if (right == null) return null;
      left = operator === "+" ? left + right : left - right;
    }
    return left;
  }

  const result = parseExpression();
  skipWhitespace();
  if (result == null || index !== source.length || !Number.isFinite(result)) return null;
  return Number(result.toFixed(6));
}

function clampNumericInputValue(value, min, max) {
  let nextValue = value;
  if (Number.isFinite(min)) nextValue = Math.max(min, nextValue);
  if (Number.isFinite(max)) nextValue = Math.min(max, nextValue);
  return nextValue;
}

function titleCase(value) {
  return String(value || "").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function abilityModifier(score) {
  return Math.floor((Number(score || 10) - 10) / 2);
}

function parseModifier(value, fallback = 0) {
  const match = String(value ?? "").match(/[+-]?\d+/);
  return match ? Number.parseInt(match[0], 10) : fallback;
}

function formatCr(monster) {
  const cr = monster?.cr;
  if (cr == null || cr === "") return "None";
  if (typeof cr === "object") return cr.cr || "None";
  return String(cr);
}

function formatXp(monster) {
  return XP_BY_CR[formatCr(monster)] || 0;
}

function monsterEdition(monster) {
  return monster?.source || "Unknown";
}

function crSortValue(monsterOrCr) {
  const cr = typeof monsterOrCr === "object" && monsterOrCr?.name ? formatCr(monsterOrCr) : String(monsterOrCr ?? "None");
  if (cr === "None") return -1;
  if (cr.includes("/")) {
    const [left, right] = cr.split("/").map((part) => Number.parseFloat(part));
    return Number.isFinite(left) && Number.isFinite(right) && right !== 0 ? left / right : -1;
  }
  const parsed = Number.parseFloat(cr);
  return Number.isFinite(parsed) ? parsed : -1;
}

function compareText(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, { numeric: true, sensitivity: "base" });
}

function compareMonsters(left, right, sortField) {
  if (sortField === "cr") return crSortValue(left) - crSortValue(right) || compareText(left.name, right.name);
  if (sortField === "edition") return compareText(monsterEdition(left), monsterEdition(right)) || compareText(left.name, right.name);
  return compareText(left.name, right.name) || compareText(monsterEdition(left), monsterEdition(right));
}

function compareLibraryEntries(left, right, kind, sortField) {
  if (kind === "spell") {
    if (sortField === "level") return Number(left.level || 0) - Number(right.level || 0) || compareText(left.name, right.name);
    if (sortField === "source") return compareText(spellSource(left), spellSource(right)) || compareText(left.name, right.name);
    return compareText(left.name, right.name);
  }
  if (sortField === "rarity") return compareText(itemRarity(left), itemRarity(right)) || compareText(left.name, right.name);
  if (sortField === "source") return compareText(itemSource(left), itemSource(right)) || compareText(left.name, right.name);
  return compareText(left.name, right.name);
}

function compareMonsterIndexEntries(left, right, sortField) {
  if (sortField === "cr") return left.crSort - right.crSort || compareText(left.name, right.name);
  if (sortField === "edition") return compareText(left.edition, right.edition) || compareText(left.name, right.name);
  return compareText(left.name, right.name) || compareText(left.edition, right.edition);
}

function compareLibraryIndexEntries(left, right, kind, sortField) {
  if (kind === "spell") {
    if (sortField === "level") return left.level - right.level || compareText(left.name, right.name);
    if (sortField === "source") return compareText(left.source, right.source) || compareText(left.name, right.name);
    return compareText(left.name, right.name);
  }
  if (sortField === "rarity") return compareText(left.rarity, right.rarity) || compareText(left.name, right.name);
  if (sortField === "source") return compareText(left.source, right.source) || compareText(left.name, right.name);
  return compareText(left.name, right.name);
}

function libraryEntrySearchText(entry, kind) {
  if (kind === "spell") return [entry.name, formatSpellLevel(entry), spellSource(entry), spellSchool(entry), entry.classes?.join(" ")].map(normalizeSearch).join(" ");
  return [entry.name, itemRarity(entry), itemSource(entry), entry.type, renderEntryText(entry.entries)].map(normalizeSearch).join(" ");
}

function buildMonsterSearchIndex(monsters) {
  return monsters.map((monster) => ({
    monster,
    name: String(monster?.name || ""),
    normalizedName: normalizeSearch(monster?.name),
    searchText: monsterSearchText(monster),
    edition: monsterEdition(monster),
    cr: formatCr(monster),
    crSort: crSortValue(monster)
  }));
}

function buildLibrarySearchIndex(entries, kind) {
  return entries.map((entry) => ({
    entry,
    name: String(entry?.name || ""),
    normalizedName: normalizeSearch(entry?.name),
    searchText: libraryEntrySearchText(entry, kind),
    source: kind === "spell" ? spellSource(entry) : itemSource(entry),
    level: kind === "spell" ? Number(entry?.level || 0) : 0,
    rarity: kind === "item" ? itemRarity(entry) : ""
  }));
}

function searchMatchScoreNormalized(normalizedName, query, fullText = "") {
  if (!query) return 0;
  if (normalizedName === query) return 500;
  if (normalizedName.startsWith(query)) return 400;
  if (normalizedName.split(/\s+/).some((word) => word.startsWith(query))) return 350;
  if (normalizedName.includes(query)) return 300;
  return fullText.includes(query) ? 100 : 0;
}

function filterMonsterIndex(index, { query, editionFilter, crFilter, sortField, sortDirection }) {
  const direction = sortDirection === "desc" ? -1 : 1;
  return index
    .filter(({ searchText, edition, cr }) => (
      (!query || searchText.includes(query))
      && (editionFilter === "all" || edition === editionFilter)
      && (crFilter === "all" || cr === crFilter)
    ))
    .sort((left, right) => {
      if (query) {
        const leftScore = searchMatchScoreNormalized(left.normalizedName, query, left.searchText);
        const rightScore = searchMatchScoreNormalized(right.normalizedName, query, right.searchText);
        if (rightScore !== leftScore) return rightScore - leftScore;
      }
      return direction * compareMonsterIndexEntries(left, right, sortField);
    });
}

function filterLibraryIndex(index, kind, { query, sortField, sortDirection }) {
  const direction = sortDirection === "desc" ? -1 : 1;
  return index
    .filter(({ searchText }) => !query || searchText.includes(query))
    .sort((left, right) => {
      if (query) {
        const leftScore = searchMatchScoreNormalized(left.normalizedName, query, left.searchText);
        const rightScore = searchMatchScoreNormalized(right.normalizedName, query, right.searchText);
        if (rightScore !== leftScore) return rightScore - leftScore;
      }
      return direction * compareLibraryIndexEntries(left, right, kind, sortField);
    });
}

function normalizeResourceName(value) {
  return cleanRulesText(value)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(?:same as above|matching your chosen proficiency)\b/gi, " ")
    .replace(/^\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+/i, "")
    .replace(/^\s*(?:one set of|set of|pair of|a|an|the|one)\s+/i, "")
    .replace(/\bcontaining\b[\s\S]*$/i, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function resourceNameVariants(value) {
  const primary = normalizeResourceName(value);
  const variants = [primary];
  if (primary.endsWith("s")) variants.push(primary.slice(0, -1));
  return variants.filter(Boolean);
}

function findResourceEntry(kind, name) {
  const entries = kind === "spell" ? spells : ITEM_LIBRARY;
  const variants = resourceNameVariants(name);
  if (!variants.length) return null;
  return entries.find((entry) => variants.includes(normalizeResourceName(entry.name)))
    || entries.find((entry) => variants.some((variant) => normalizeResourceName(entry.name).startsWith(`${variant} `)))
    || entries.find((entry) => variants.some((variant) => normalizeResourceName(entry.name).includes(variant)));
}

function findLibraryEntryByRef(kind, ref) {
  if (!ref?.name) return null;
  const entries = kind === "monster" ? bestiary : kind === "spell" ? spells : ITEM_LIBRARY;
  return entries.find((entry) => entry.name === ref.name && (!ref.source || entry.source === ref.source))
    || entries.find((entry) => normalizeResourceName(entry.name) === normalizeResourceName(ref.name) && (!ref.source || entry.source === ref.source))
    || entries.find((entry) => normalizeResourceName(entry.name) === normalizeResourceName(ref.name))
    || null;
}

function libraryRef(entry) {
  if (!entry?.name) return null;
  return {
    name: entry.name,
    source: entry.source || ""
  };
}

function clampBoardPoint(point, width = 0, height = 0) {
  return {
    x: clamp(point.x, BOARD_PADDING, BOARD_WIDTH - width - BOARD_PADDING),
    y: clamp(point.y, BOARD_PADDING, BOARD_HEIGHT - height - BOARD_PADDING)
  };
}

function noteStorageSnapshot(note) {
  return {
    id: note.id,
    kind: note.kind,
    monsterRef: libraryRef(note.monster),
    entryRef: libraryRef(note.entry),
    character: note.character || null,
    x: note.x,
    y: note.y,
    width: note.width,
    height: note.height,
    z: note.z,
    rolls: Array.isArray(note.rolls) ? note.rolls.slice(0, 20) : [],
    dicePanelOpen: Boolean(note.dicePanelOpen),
    minimized: Boolean(note.minimized),
    hpCurrent: note.hpCurrent,
    hpMax: note.hpMax
  };
}

function restoreStoredNote(note) {
  if (!note?.kind || !note.id) return null;
  const monster = note.kind === "monster" ? findLibraryEntryByRef("monster", note.monsterRef) : null;
  const entry = note.kind === "spell" || note.kind === "item" ? findLibraryEntryByRef(note.kind, note.entryRef) : null;
  const character = note.kind === "character" && note.character ? note.character : null;
  if (note.kind === "monster" && !monster) return null;
  if ((note.kind === "spell" || note.kind === "item") && !entry) return null;
  if (note.kind === "character" && !character) return null;
  const width = clamp(Number(note.width) || NOTE_DEFAULT_WIDTH, NOTE_MIN_WIDTH, BOARD_WIDTH - BOARD_PADDING * 2);
  const height = clamp(Number(note.height) || NOTE_DEFAULT_HEIGHT, NOTE_MIN_HEIGHT, BOARD_HEIGHT - BOARD_PADDING * 2);
  const point = clampBoardPoint({
    x: Number(note.x) || BOARD_PADDING,
    y: Number(note.y) || BOARD_PADDING
  }, width, height);
  const hpAverage = monster?.hp?.average ?? "";
  const characterHp = character?.hpMax || character?.hpCurrent || "";
  return {
    id: String(note.id),
    kind: note.kind,
    monster,
    character,
    entry,
    x: point.x,
    y: point.y,
    width,
    height,
    z: Number(note.z) || 20,
    rolls: Array.isArray(note.rolls) ? note.rolls.slice(0, 20) : [],
    dicePanelOpen: Boolean(note.dicePanelOpen),
    minimized: Boolean(note.minimized),
    hpCurrent: note.hpCurrent ?? character?.hpCurrent ?? hpAverage,
    hpMax: note.hpMax ?? characterHp ?? hpAverage
  };
}

function defaultBoardState() {
  return {
    notes: [],
    view: { x: 0, y: 0, scale: 1 }
  };
}

function loadDmBoardState() {
  if (typeof localStorage === "undefined") return defaultBoardState();
  try {
    const parsed = JSON.parse(localStorage.getItem(DM_BOARD_STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return defaultBoardState();
    const notes = Array.isArray(parsed.notes)
      ? parsed.notes.map(restoreStoredNote).filter(Boolean)
      : [];
    const view = parsed.view && typeof parsed.view === "object"
      ? {
        x: Number(parsed.view.x) || 0,
        y: Number(parsed.view.y) || 0,
        scale: clamp(Number(parsed.view.scale) || 1, BOARD_MIN_ZOOM, BOARD_MAX_ZOOM)
      }
      : { x: 0, y: 0, scale: 1 };
    return { notes, view };
  } catch (error) {
    console.error("Could not load DM board state", error);
    return defaultBoardState();
  }
}

function saveDmBoardState(notes, view) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DM_BOARD_STORAGE_KEY, JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      view,
      notes: notes.map(noteStorageSnapshot)
    }));
  } catch (error) {
    console.error("Could not save DM board state", error);
  }
}

function equipmentResourceCandidates(text) {
  const seen = new Set();
  return compactLines(text)
    .flatMap((line) => line.replace(/^[-*]\s*/, "").split(/\s*,\s*|\s*;\s*/))
    .flatMap((part) => part.split(/\s+or\s+/i))
    .map((part) => part.replace(/^[-*]\s*/, "").trim())
    .map((part) => {
      const afterLabel = part.includes(":") ? part.split(":").slice(1).join(":").trim() : part;
      const display = cleanRulesText(afterLabel)
        .replace(/\([^)]*\)/g, "")
        .replace(/\bcontaining\b[\s\S]*$/i, "")
        .replace(/^\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+/i, "")
        .replace(/^\s*(?:one set of|set of|pair of|a|an|the|one)\s+/i, "")
        .trim();
      return display;
    })
    .filter((display) => display && !/^\d+\s*(?:cp|sp|ep|gp|pp)\b/i.test(display) && normalizeResourceName(display))
    .filter((display) => {
      const key = normalizeResourceName(display);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((display) => ({ display, query: display }));
}

function searchMatchScore(name, query, fullText = "") {
  return searchMatchScoreNormalized(normalizeSearch(name), query, fullText);
}

function formatSize(monster) {
  const sizes = Array.isArray(monster?.size) ? monster.size : [monster?.size].filter(Boolean);
  return sizes.map((size) => SIZE_LABELS[size] || size).join(", ") || "Unknown size";
}

function formatType(monster) {
  const type = monster?.type;
  if (!type) return "Unknown type";
  if (typeof type === "string") return titleCase(type);
  const tags = Array.isArray(type.tags) ? type.tags.map(titleCase).join(", ") : "";
  return [titleCase(type.type), tags ? `(${tags})` : ""].filter(Boolean).join(" ");
}

function formatAlignment(monster) {
  const alignment = monster?.alignment;
  if (!alignment) return "Unaligned";
  if (typeof alignment === "string") return alignment;
  if (!Array.isArray(alignment)) return "Unaligned";
  return alignment.map((entry) => ALIGNMENT_LABELS[entry] || entry).join(" ") || "Unaligned";
}

function renderEntryText(value) {
  if (value == null) return "";
  if (typeof value === "string") return cleanRulesText(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(renderEntryText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    if (value.name && value.entries) return `${value.name}. ${renderEntryText(value.entries)}`;
    if (value.entries) return renderEntryText(value.entries);
    if (value.items) return renderEntryText(value.items);
    if (value.entry) return renderEntryText(value.entry);
  }
  return "";
}

function cleanRulesText(text) {
  return String(text)
    .replace(/\{@atk ([^}]+)\}/g, (_match, attack) => {
      const attackText = String(attack);
      if (attackText.includes("mw")) return "Melee Weapon Attack:";
      if (attackText.includes("rw")) return "Ranged Weapon Attack:";
      if (attackText.includes("ms")) return "Melee Spell Attack:";
      if (attackText.includes("rs")) return "Ranged Spell Attack:";
      return `${attackText.includes("r") ? "Ranged" : "Melee"} Attack:`;
    })
    .replace(/\{@hit ([^}]+)\}/g, "$1 to hit")
    .replace(/\{@h\}/g, "Hit: ")
    .replace(/\{@damage ([^}]+)\}/g, "$1")
    .replace(/\{@dice ([^}]+)\}/g, "$1")
    .replace(/\{@spell ([^}|]+)(?:\|[^}]*)?\}/g, "$1")
    .replace(/\{@condition ([^}|]+)(?:\|[^}]*)?\}/g, "$1")
    .replace(/\{@creature ([^}|]+)(?:\|[^}]*)?\}/g, "$1")
    .replace(/\{@item ([^}|]+)(?:\|[^}]*)?\}/g, "$1")
    .replace(/\{@chance ([^}|]+)(?:\|[^}]*)?\}/g, "$1%")
    .replace(/\{@dc ([^}]+)\}/g, "DC $1")
    .replace(/\{@recharge(?: [^}]*)?\}/g, "Recharge")
    .replace(/\{@[^}]+ ([^}|]+)(?:\|[^}]*)?\}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdownEmphasis(text) {
  return String(text || "").replace(/\*+/g, "");
}

function formatAc(monster) {
  const ac = Array.isArray(monster?.ac) ? monster.ac : [monster?.ac].filter(Boolean);
  return ac.map((entry) => {
    if (typeof entry === "number" || typeof entry === "string") return String(entry);
    if (!entry || typeof entry !== "object") return "";
    const from = Array.isArray(entry.from) ? ` (${entry.from.map(renderEntryText).join(", ")})` : "";
    return `${entry.ac}${from}`;
  }).filter(Boolean).join(", ") || "Unknown";
}

function formatHp(monster) {
  const hp = monster?.hp;
  if (!hp) return "Unknown";
  if (typeof hp === "string") return hp;
  return [hp.average, hp.formula ? `(${hp.formula})` : ""].filter(Boolean).join(" ");
}

function formatSpeed(monster) {
  const speed = monster?.speed;
  if (!speed) return "Unknown";
  if (typeof speed === "string") return speed;
  return Object.entries(speed)
    .map(([key, value]) => `${key} ${typeof value === "object" ? renderEntryText(value) : value} ft.`)
    .join(", ");
}

function formatSpeedCompact(monster) {
  return formatSpeed(monster).replace(/\bwalk\s+/i, "");
}

function formatKeyValueMap(value) {
  if (!value || typeof value !== "object") return "";
  return Object.entries(value)
    .map(([key, entry]) => `${key} ${Array.isArray(entry) ? entry.join(", ") : entry}`)
    .join(", ");
}

function formatList(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(renderEntryText).filter(Boolean).join(", ");
  return renderEntryText(value);
}

function formatDamageResistances(monster) {
  return [
    ["Resistances", monster.resist],
    ["Vulnerabilities", monster.vulnerable]
  ]
    .map(([label, value]) => {
      const text = formatList(value);
      return text ? `${label} ${text}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

function formatConditionImmunities(monster) {
  return formatList(monster.conditionImmune);
}

function shortText(value, maxLength = 220) {
  const text = renderEntryText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function normalizeFieldKey(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function base64UrlToBytes(text) {
  const normalized = String(text || "").trim().replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function decompressCharacterSheetCodeText(bytes) {
  if (typeof DecompressionStream !== "function") throw new Error("Esta pantalla no puede descomprimir el codigo.");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

async function decodeCharacterSheetCode(code) {
  const match = String(code || "").trim().match(new RegExp(`^${CHARACTER_SHEET_CODE_PREFIX}\\.([gj])\\.([A-Za-z0-9_-]+)$`));
  if (!match) throw new Error("Codigo de personaje invalido.");
  const [, mode, encoded] = match;
  let bytes;
  try {
    bytes = base64UrlToBytes(encoded);
  } catch (_error) {
    throw new Error("Codigo de personaje invalido.");
  }
  let json;
  try {
    json = mode === "g"
      ? await decompressCharacterSheetCodeText(bytes)
      : new TextDecoder().decode(bytes);
  } catch (_error) {
    throw new Error("El codigo del personaje esta corrupto o incompleto.");
  }
  return parseCharacterSheetPayload(json);
}

function characterField(data, aliases, fallback = "") {
  const aliasList = Array.isArray(aliases) ? aliases : [aliases];
  for (const alias of aliasList) {
    if (Object.prototype.hasOwnProperty.call(data, alias)) return data[alias];
  }
  const targets = new Set(aliasList.map(normalizeFieldKey));
  const match = Object.entries(data || {}).find(([key]) => targets.has(normalizeFieldKey(key)));
  return match ? match[1] : fallback;
}

function characterText(data, aliases, fallback = "") {
  const value = characterField(data, aliases, fallback);
  if (value == null) return fallback;
  if (typeof value === "boolean") return value ? "Yes" : "";
  return String(value).trim();
}

function characterBool(data, aliases) {
  const value = characterField(data, aliases, false);
  return value === true || value === "true" || value === "Yes" || value === "On" || value === "1";
}

function parseCharacterNumber(value, fallback = 0) {
  const match = String(value ?? "").match(/[+-]?\d+/);
  return match ? Number.parseInt(match[0], 10) : fallback;
}

function characterAbilityScore(data, ability) {
  return parseCharacterNumber(characterText(data, ability.toUpperCase()), 10);
}

function characterAbilityMod(data, ability) {
  const key = `${ability.toUpperCase()}mod`;
  const explicit = characterText(data, [key, key.replace("CHA", "CHa")]);
  if (explicit) return parseCharacterNumber(explicit, abilityModifier(characterAbilityScore(data, ability)));
  return abilityModifier(characterAbilityScore(data, ability));
}

function compactLines(text) {
  return String(text || "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function compactParagraph(text) {
  return compactLines(text).join("\n");
}

function characterWeaponActions(data) {
  const rows = [
    ["Wpn Name", "Wpn1 AtkBonus", "Wpn1 Damage"],
    ["Wpn Name 2", "Wpn2 AtkBonus", "Wpn2 Damage"],
    ["Wpn Name 3", "Wpn3 AtkBonus", "Wpn3 Damage"]
  ];
  return rows
    .map(([nameKey, attackKey, damageKey]) => {
      const name = characterText(data, nameKey);
      if (!name) return null;
      const attack = characterText(data, attackKey);
      const damage = characterText(data, damageKey);
      const parts = [
        attack ? `${attack} to hit.` : "",
        damage ? `Hit: ${damage}.` : ""
      ].filter(Boolean);
      return { name, entries: [parts.join(" ")] };
    })
    .filter(Boolean);
}

function characterFreeformActions(data) {
  return compactLines(characterText(data, "AttacksSpellcasting"))
    .filter((line) => !/^[-–—]+$/.test(line))
    .slice(0, 20)
    .map((line, index) => {
      const [name, ...rest] = line.includes(":") ? line.split(":") : [`Entry ${index + 1}`, line];
      return {
        name: name.trim() || `Entry ${index + 1}`,
        entries: [rest.join(":").trim() || line]
      };
    });
}

function characterSpellSlots(data) {
  return Array.from({ length: 9 }, (_entry, index) => {
    const level = index + 1;
    const fieldNumber = 18 + level;
    const total = characterText(data, `SlotsTotal ${fieldNumber}`);
    const remaining = characterText(data, `SlotsRemaining ${fieldNumber}`);
    if (!total && !remaining) return null;
    return { level, total, remaining };
  }).filter(Boolean);
}

function characterSpells(data) {
  return Object.entries(data || {})
    .filter(([key, value]) => /^Spells\s+\d+$/i.test(key) && String(value || "").trim())
    .sort(([left], [right]) => parseCharacterNumber(left) - parseCharacterNumber(right))
    .map(([key, value]) => ({ key, name: String(value).trim() }));
}

function characterSkills(data) {
  return CHARACTER_SKILLS.map(([label, ability, checkbox, ...aliases]) => {
    const value = characterText(data, [label, ...aliases]);
    return {
      label,
      ability,
      value: value || signNumber(characterAbilityMod(data, ability)),
      proficient: characterBool(data, checkbox)
    };
  });
}

function characterFeatureSections(data) {
  return [
    ["Features & Traits", characterText(data, ["Features and Traits", "Features & Traits", "Feat+Traits"])],
    ["Proficiencies & Languages", characterText(data, "ProficienciesLang")],
    ["Equipment", characterText(data, "Equipment")],
    ["Treasure", characterText(data, "Treasure")],
    ["Personality", [
      characterText(data, "PersonalityTraits ") ? `Traits: ${characterText(data, "PersonalityTraits ")}` : "",
      characterText(data, "Ideals") ? `Ideals: ${characterText(data, "Ideals")}` : "",
      characterText(data, "Bonds") ? `Bonds: ${characterText(data, "Bonds")}` : "",
      characterText(data, "Flaws") ? `Flaws: ${characterText(data, "Flaws")}` : ""
    ].filter(Boolean).join("\n")],
    ["Backstory", characterText(data, "Backstory")],
    ["Allies", characterText(data, "Allies")]
  ].filter(([, text]) => String(text || "").trim());
}

function characterFromSheetData(data) {
  const name = characterText(data, ["CharacterName", "Character Name", "CharacterName 2"]) || "Imported Character";
  const classLevel = characterText(data, "ClassLevel");
  const level = characterText(data, "CharacterLevel");
  const race = characterText(data, ["Race ", "Race"]);
  const background = characterText(data, "Background");
  const hpMax = parseCharacterNumber(characterText(data, "HPMax"), 0);
  const hpCurrentText = characterText(data, ["HPCurrent", "CurrentHP", "Current Hit Points"]);
  const hpCurrent = hpCurrentText ? parseCharacterNumber(hpCurrentText, hpMax) : hpMax;
  const spellSlots = characterSpellSlots(data);
  const spellsKnown = characterSpells(data);
  const skills = characterSkills(data);
  const saves = Object.fromEntries(ABILITY_KEYS.map((ability) => {
    const [field] = CHARACTER_SAVE_FIELDS[ability];
    const value = characterText(data, field) || signNumber(characterAbilityMod(data, ability));
    return [ability, value];
  }));

  return {
    name,
    source: "PC",
    classLevel,
    level,
    race,
    background,
    alignment: characterText(data, "Alignment") || "Unaligned",
    player: characterText(data, "PlayerName"),
    size: "M",
    type: classLevel || "Character",
    ac: characterText(data, "AC") || "Unknown",
    hp: { average: hpMax || hpCurrent || "", formula: "" },
    hpCurrent,
    hpMax: hpMax || hpCurrent || "",
    speed: characterText(data, "Speed") || "30",
    passive: characterText(data, "Passive"),
    profBonus: characterText(data, "ProfBonus"),
    inspiration: characterText(data, "Inspiration"),
    hitDice: [characterText(data, "HD"), characterText(data, "HDTotal")].filter(Boolean).join(" / "),
    tempHp: characterText(data, "HPTemp"),
    abilities: Object.fromEntries(ABILITY_KEYS.map((ability) => [ability, characterAbilityScore(data, ability)])),
    saves,
    skills,
    proficientSkills: skills.filter((skill) => skill.proficient),
    actions: [...characterWeaponActions(data), ...characterFreeformActions(data)],
    spellcasting: {
      className: characterText(data, "Spellcasting Class 2"),
      ability: characterText(data, "SpellcastingAbility 2"),
      saveDc: characterText(data, "SpellSaveDC  2"),
      attackBonus: characterText(data, "SpellAtkBonus 2"),
      slots: spellSlots,
      spells: spellsKnown
    },
    money: ["CP", "SP", "EP", "GP", "PP"]
      .map((key) => [key, characterText(data, key)])
      .filter(([, value]) => value),
    sections: characterFeatureSections(data),
    rawData: data
  };
}

function characterStatBlockEntity(character) {
  const speedText = /\bft\.?\b|feet/i.test(character.speed) ? character.speed : `${character.speed || "30"} ft.`;
  return {
    name: character.name,
    source: "PC",
    size: "M",
    type: character.classLevel || (character.level ? `Level ${character.level} Character` : "Character"),
    alignment: character.alignment || "Unaligned",
    ac: character.ac || "Unknown",
    hp: { average: character.hpMax || character.hpCurrent || "", formula: "" },
    speed: speedText,
    passive: character.passive,
    str: character.abilities?.str,
    dex: character.abilities?.dex,
    con: character.abilities?.con,
    int: character.abilities?.int,
    wis: character.abilities?.wis,
    cha: character.abilities?.cha,
    save: character.saves || {},
    skill: Object.fromEntries((character.proficientSkills || []).map((skill) => [skill.label, skill.value])),
    senses: [],
    languages: character.sections
      ?.find(([title]) => normalizeSearch(title).includes("proficiencies"))
      ?.[1]
      ?.match(/Languages:\s*([^\n]+)/i)?.[1] || ""
  };
}

function monsterSearchText(monster) {
  return [monster.name, monster.source, formatCr(monster), formatType(monster), renderEntryText(monster.trait), renderEntryText(monster.action)]
    .map(normalizeSearch)
    .join(" ");
}

const MONSTER_SEARCH_INDEX = buildMonsterSearchIndex(bestiary);
const SPELL_SEARCH_INDEX = buildLibrarySearchIndex(spells, "spell");
const ITEM_SEARCH_INDEX = buildLibrarySearchIndex(ITEM_LIBRARY, "item");

function cloneJsonCompatibleValue(value, depth = 0) {
  if (depth > 12) return undefined;
  if (value == null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) return value.map((entry) => cloneJsonCompatibleValue(entry, depth + 1)).filter((entry) => entry !== undefined);
  if (!isPlainObject(value)) return undefined;

  const clone = {};
  Object.entries(value).forEach(([key, entry]) => {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey || normalizedKey === "__proto__" || normalizedKey === "constructor" || normalizedKey === "prototype") return;
    const normalizedValue = cloneJsonCompatibleValue(entry, depth + 1);
    if (normalizedValue !== undefined) clone[normalizedKey] = normalizedValue;
  });
  return clone;
}

function sanitizeImportedSheetData(data) {
  if (!isPlainObject(data)) return {};
  const sanitized = {};

  Object.entries(data).forEach(([key, value]) => {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey || normalizedKey === "__proto__" || normalizedKey === "constructor" || normalizedKey === "prototype") return;
    if (normalizedKey === "__sheetMeta") {
      sanitized.__sheetMeta = cloneJsonCompatibleValue(value) || { choices: {} };
      return;
    }
    if (typeof value === "string" || typeof value === "boolean") {
      sanitized[normalizedKey] = value;
      return;
    }
    if (typeof value === "number" && Number.isFinite(value)) sanitized[normalizedKey] = String(value);
  });

  if (!sanitized.__sheetMeta) sanitized.__sheetMeta = { choices: {} };
  return sanitized;
}

function parseCharacterSheetPayload(json) {
  let payload;
  try {
    payload = JSON.parse(json);
  } catch (_error) {
    throw new Error("El codigo del personaje no contiene datos JSON validos.");
  }
  if (payload?.type !== CHARACTER_SHEET_CODE_TYPE || payload?.version !== 1 || !isPlainObject(payload.data)) {
    throw new Error("El codigo no contiene una planilla compatible.");
  }
  return sanitizeImportedSheetData(payload.data);
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollD20(modifier = 0) {
  const die = rollDie(20);
  return {
    kind: "d20",
    expression: `d20${modifier ? signNumber(modifier) : ""}`,
    total: die + modifier,
    detail: `${die}${modifier ? ` ${signNumber(modifier)}` : ""}`,
    dice: [die],
    modifier
  };
}

function normalizeDiceExpression(expression) {
  return String(expression || "").replace(/\s+/g, "").replace(/^d/i, "1d");
}

function rollDiceExpression(expression) {
  const normalized = normalizeDiceExpression(expression);
  const tokens = normalized.match(/[+-]?(?:\d*d\d+|\d+)/gi) || [];
  const terms = tokens.map((token) => {
    const sign = token.startsWith("-") ? -1 : 1;
    const raw = token.replace(/^[+-]/, "");
    const diceMatch = raw.match(/^(\d*)d(\d+)$/i);
    if (!diceMatch) {
      const value = sign * Number.parseInt(raw, 10);
      return { type: "flat", value, text: signNumber(value) };
    }
    const count = Number.parseInt(diceMatch[1] || "1", 10);
    const sides = Number.parseInt(diceMatch[2], 10);
    const rolls = Array.from({ length: count }, () => rollDie(sides));
    const subtotal = rolls.reduce((sum, roll) => sum + roll, 0) * sign;
    return { type: "dice", count, sides, rolls, subtotal, sign, text: `${sign < 0 ? "-" : ""}${count}d${sides}` };
  });
  const total = terms.reduce((sum, term) => sum + (term.type === "dice" ? term.subtotal : term.value), 0);
  const detail = terms.map((term) => {
    if (term.type === "flat") return term.text;
    const rolled = term.rolls.join(" + ");
    return `${term.text}[${rolled}]`;
  }).join(" ");
  return {
    kind: "dice",
    expression: normalized,
    total,
    detail,
    dice: terms.filter((term) => term.type === "dice").flatMap((term) => term.rolls),
    terms
  };
}

function MonsterSummary({ monster }) {
  return (
    <div className="space-y-4 text-sm text-neutral-300">
      <div>
        <p className="font-serif text-xl font-bold uppercase tracking-wide text-amber-500">{monster.name}</p>
        <p className="mt-1 text-sm italic text-neutral-400">
          {formatSize(monster)} {formatType(monster)}, {formatAlignment(monster)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="AC" value={formatAc(monster)} />
        <Stat label="HP" value={formatHp(monster)} />
        <Stat label="CR" value={formatCr(monster)} />
        <Stat label="Edition" value={monsterEdition(monster)} />
      </div>

      <p><strong className="text-neutral-100">Speed:</strong> {formatSpeed(monster)}</p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ABILITY_KEYS.map((key) => (
          <div key={key} className="border border-neutral-700 bg-neutral-800 p-2 text-center">
            <div className="text-[11px] font-bold uppercase text-neutral-500">{key}</div>
            <div className="font-semibold text-neutral-100">{monster[key] ?? "-"}</div>
            <div className="text-xs text-sky-300">{signNumber(abilityModifier(monster[key]))}</div>
          </div>
        ))}
      </div>

      {formatKeyValueMap(monster.save) ? <p><strong className="text-neutral-100">Saves:</strong> {formatKeyValueMap(monster.save)}</p> : null}
      {formatKeyValueMap(monster.skill) ? <p><strong className="text-neutral-100">Skills:</strong> {formatKeyValueMap(monster.skill)}</p> : null}
      {formatList(monster.senses) || monster.passive ? (
        <p><strong className="text-neutral-100">Senses:</strong> {[formatList(monster.senses), monster.passive ? `Passive Perception ${monster.passive}` : ""].filter(Boolean).join(", ")}</p>
      ) : null}
      {formatList(monster.languages) ? <p><strong className="text-neutral-100">Languages:</strong> {formatList(monster.languages)}</p> : null}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-neutral-700 bg-neutral-950/70 p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-amber-500">{label}</div>
      <div className="mt-1 font-semibold text-neutral-100">{value}</div>
    </div>
  );
}

function NumericExpressionInput({ value, onChange, min, max, integer = false, onKeyDown, ...props }) {
  const inputRef = useRef(null);
  const [draft, setDraft] = useState(formatNumericInputValue(value));

  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setDraft(formatNumericInputValue(value));
  }, [value]);

  function commitDraft() {
    const parsed = parseNumericExpression(draft);
    if (parsed === null) {
      setDraft(formatNumericInputValue(value));
      return;
    }
    const nextValue = parsed === ""
      ? ""
      : clampNumericInputValue(integer ? Math.round(parsed) : parsed, Number(min), Number(max));
    setDraft(formatNumericInputValue(nextValue));
    onChange(nextValue);
  }

  return (
    <input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== "Enter") return;
        event.preventDefault();
        commitDraft();
      }}
    />
  );
}

function RollButton({ children, title, onRoll }) {
  return (
    <button
      className="rounded-sm px-0.5 font-semibold text-sky-300 transition hover:bg-sky-300/15 hover:text-sky-100 focus:outline-none focus:ring-1 focus:ring-sky-300"
      type="button"
      title={title}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onRoll}
    >
      {children}
    </button>
  );
}

function InteractiveRulesText({ text, context, onRoll }) {
  const source = stripMarkdownEmphasis(text);
  const parts = [];
  const pattern = /(\d+d\d+(?:\s*[+-]\s*\d+)*)|([+-]\d+)/gi;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(source))) {
    if (match.index > cursor) parts.push(source.slice(cursor, match.index));
    const token = match[0];
    if (match[1]) {
      const expression = normalizeDiceExpression(token);
      parts.push(
        <RollButton
          key={`${match.index}-${token}`}
          title={`Tirar ${expression}`}
          onRoll={() => onRoll(`${context}: ${expression}`, rollDiceExpression(expression))}
        >
          {token}
        </RollButton>
      );
    } else {
      const modifier = parseModifier(token);
      parts.push(
        <RollButton
          key={`${match.index}-${token}`}
          title={`Tirar d20${signNumber(modifier)}`}
          onRoll={() => onRoll(`${context}: d20${signNumber(modifier)}`, rollD20(modifier))}
        >
          {token}
        </RollButton>
      );
    }
    cursor = match.index + token.length;
  }

  if (cursor < source.length) parts.push(source.slice(cursor));
  return <>{parts}</>;
}

function MonsterRollPanel({ note, onToggle, onResizeCorner = null }) {
  const latest = note.rolls?.[0];

  return (
    <section className="relative border-t border-neutral-700 bg-neutral-950">
      <button
        className="flex w-full items-center justify-between bg-black px-3 py-1.5 pr-9 text-left text-sm text-neutral-100 hover:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-sky-300"
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onToggle(note.id)}
      >
        <span>Dice Roller</span>
        <span className="text-lg leading-none">{note.dicePanelOpen ? "x" : "^"}</span>
      </button>
      {onResizeCorner ? (
        <button
          className="absolute right-1 top-1 z-20 h-5 w-5 cursor-nwse-resize border border-amber-400 bg-amber-500/50 transition hover:bg-amber-500/80 focus:bg-amber-500/80 focus:outline-none focus:ring-1 focus:ring-sky-300"
          type="button"
          aria-label="Resize note"
          onPointerDown={(event) => onResizeCorner(event, "corner")}
        />
      ) : null}
      {note.dicePanelOpen ? (
        <div className="space-y-2 px-3 py-3 text-xs text-neutral-300">
          <div className="min-h-20 rounded-sm bg-neutral-900 p-2">
            {latest ? (
              <div>
                <div className="text-[11px] text-neutral-500">{note.monster?.name || note.entry?.name || note.character?.name}</div>
                <div className="mt-1 rounded bg-neutral-800 px-2 py-1 text-sm">
                  <span className="italic text-neutral-200">{latest.label}</span>
                  <span className="ml-2 text-sky-300">{latest.roll.total}</span>
                  <span className="ml-1 text-neutral-400">({latest.roll.detail})</span>
                </div>
              </div>
            ) : (
              <div className="flex h-16 items-end text-neutral-500">Click a blue value to roll.</div>
            )}
          </div>
          <div className="max-h-28 overflow-auto rounded-sm border border-neutral-700">
            {(note.rolls || []).length ? note.rolls.map((entry) => (
              <div key={entry.id} className="grid grid-cols-[1fr_auto] gap-2 border-b border-neutral-800 px-2 py-1 last:border-b-0">
                <span className="truncate">{entry.label}</span>
                <span className="font-semibold text-sky-300">{entry.roll.total}</span>
              </div>
            )) : (
              <div className="px-2 py-2 text-neutral-500">9d12-6 or "/help"</div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AbilityCell({ monster, ability, onRoll }) {
  const score = monster[ability] ?? "-";
  const mod = abilityModifier(score);
  const save = parseModifier(monster.save?.[ability], mod);
  const label = ABILITY_LABELS[ability];

  return (
    <div className="grid grid-cols-[34px_1fr_42px_42px] items-center bg-neutral-800 px-1 py-0.5 text-sm">
      <span className="font-bold text-neutral-300">{label}</span>
      <span className="text-neutral-300">{score}</span>
      <RollButton title={`Tirar ${label} mod d20${signNumber(mod)}`} onRoll={() => onRoll(`${label} mod`, rollD20(mod))}>
        {signNumber(mod)}
      </RollButton>
      <RollButton title={`Tirar ${label} save d20${signNumber(save)}`} onRoll={() => onRoll(`${label} save`, rollD20(save))}>
        {signNumber(save)}
      </RollButton>
    </div>
  );
}

function MonsterActionLine({ action, onRoll }) {
  const entries = Array.isArray(action.entries) ? action.entries : [action.entries].filter(Boolean);
  const text = entries.map(renderEntryText).filter(Boolean).join(" ");

  return (
    <p className="leading-snug">
      <span className="font-bold italic text-neutral-200">{action.name || "Action"}.</span>{" "}
      <InteractiveRulesText text={text} context={action.name || "Action"} onRoll={onRoll} />
    </p>
  );
}

function MonsterTextSection({ title, items, onRoll, interactive = false }) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;

  return (
    <section className="mt-2">
      <h3 className="border-b border-amber-500 pb-0.5 font-serif text-lg uppercase leading-none text-amber-500">{title}</h3>
      <div className="mt-1 space-y-1 text-sm text-neutral-300">
        {list.map((item, index) => (
          interactive ? (
            <MonsterActionLine key={`${title}-${item.name || index}`} action={item} onRoll={onRoll} />
          ) : (
            <p key={`${title}-${item.name || index}`} className="leading-snug">
              <span className="font-bold italic text-neutral-200">{item.name || title}.</span>{" "}
              {stripMarkdownEmphasis(shortText(item.entries, 360))}
            </p>
          )
        ))}
      </div>
    </section>
  );
}

function MonsterStatBlockHeader({ monster, onDragStart = null, onMinimize = null, onDuplicate = null, onClose = null }) {
  return (
    <header
      className={`flex items-start justify-between gap-3 border-b-2 border-amber-500 bg-neutral-900 px-3 py-2 ${onDragStart ? "cursor-move" : ""}`}
      onPointerDown={onDragStart}
    >
      <div>
        <h2 className="font-serif text-xl font-bold uppercase leading-none tracking-wide text-amber-500">{monster.name}</h2>
        <p className="mt-2 text-sm italic text-neutral-300">{formatSize(monster)} {formatType(monster)}, {formatAlignment(monster)}</p>
      </div>
      <div className="flex items-start gap-3">
        <div className="text-right font-serif text-xl uppercase leading-none text-amber-500">
          {monsterEdition(monster)}
          {monster.page ? <span className="ml-1 align-baseline text-xs text-neutral-300">p{monster.page}</span> : null}
        </div>
        <div className="flex gap-1">
          {onMinimize ? (
            <button
              className="h-7 w-7 shrink-0 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
              type="button"
              aria-label={`Minimizar ${monster.name}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onMinimize}
            >
              -
            </button>
          ) : null}
          {onDuplicate ? (
            <button
              className="h-7 w-7 shrink-0 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
              type="button"
              aria-label={`Duplicar ${monster.name}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onDuplicate}
            >
              ⧉
            </button>
          ) : null}
          {onClose ? (
            <button
              className="h-7 w-7 shrink-0 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
              type="button"
              aria-label={`Cerrar ${monster.name}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onClose}
            >
              X
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function MonsterStatBlockBody({
  monster,
  onRoll,
  className = "max-h-[min(66vh,600px)] overflow-auto",
  hpState = null,
  onHpChange = null,
  onRollHp = null
}) {
  const initiative = abilityModifier(monster.dex);
  const resistances = formatDamageResistances(monster);
  const conditionImmunities = formatConditionImmunities(monster);
  const immunities = [formatList(monster.immune), conditionImmunities].filter(Boolean).join("; ");
  const senses = [formatList(monster.senses), monster.passive ? `Passive Perception ${monster.passive}` : ""].filter(Boolean).join(", ");
  const languages = formatList(monster.languages) || "--";
  const xp = formatXp(monster);

  return (
    <div className={`${className} px-3 py-2 text-sm`}>
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <div className="space-y-0.5">
          <p><strong className="text-neutral-200">AC</strong> {formatAc(monster)}</p>
          {hpState ? (
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-neutral-200">HP</strong>
              <button
                className="rounded-sm px-0.5 font-semibold text-sky-300 transition hover:bg-sky-300/15 hover:text-sky-100 focus:outline-none focus:ring-1 focus:ring-sky-300"
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onRollHp}
              >
                {monster.hp?.formula || formatHp(monster)}
              </button>
              <label className="flex items-center gap-1 text-xs text-neutral-500">
                Current
                <NumericExpressionInput
                  className="h-7 w-16 border border-neutral-700 bg-neutral-950 px-2 text-sm text-neutral-100 focus:border-amber-500 focus:outline-none"
                  value={hpState.current}
                  onPointerDown={(event) => event.stopPropagation()}
                  onChange={(value) => onHpChange("current", value)}
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-neutral-500">
                Total
                <NumericExpressionInput
                  className="h-7 w-16 border border-neutral-700 bg-neutral-950 px-2 text-sm text-neutral-100 focus:border-amber-500 focus:outline-none"
                  value={hpState.max}
                  onPointerDown={(event) => event.stopPropagation()}
                  onChange={(value) => onHpChange("max", value)}
                />
              </label>
            </div>
          ) : (
            <p><strong className="text-neutral-200">HP</strong> {formatHp(monster)}</p>
          )}
          <p><strong className="text-neutral-200">Speed</strong> {formatSpeedCompact(monster)}</p>
        </div>
        <div className="text-right">
          <strong className="text-neutral-200">Initiative</strong>{" "}
          <RollButton title={`Tirar iniciativa d20${signNumber(initiative)}`} onRoll={() => onRoll("Initiative", rollD20(initiative))}>
            {signNumber(initiative)}
          </RollButton>
          <span className="text-neutral-500"> ({10 + initiative})</span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_42px_42px] gap-x-1 px-1 text-[10px] uppercase tracking-wide text-neutral-500">
        <span />
        <span className="text-center">Mod</span>
        <span className="text-center">Save</span>
      </div>
      <div className="grid gap-1 sm:grid-cols-3">
        {["str", "dex", "con"].map((ability) => <AbilityCell key={ability} monster={monster} ability={ability} onRoll={onRoll} />)}
      </div>
      <div className="mt-1 grid gap-1 sm:grid-cols-3">
        {["int", "wis", "cha"].map((ability) => <AbilityCell key={ability} monster={monster} ability={ability} onRoll={onRoll} />)}
      </div>

      {resistances ? <p className="mt-2 leading-snug"><strong className="text-neutral-200">Damage</strong> {resistances}</p> : null}
      {immunities ? <p className="leading-snug"><strong className="text-neutral-200">Immunities</strong> {immunities}</p> : null}
      {formatKeyValueMap(monster.skill) ? <p className="leading-snug"><strong className="text-neutral-200">Skills</strong> {formatKeyValueMap(monster.skill)}</p> : null}
      {senses ? <p className="leading-snug"><strong className="text-neutral-200">Senses</strong> {senses}</p> : null}
      <p className="leading-snug"><strong className="text-neutral-200">Languages</strong> {languages}</p>
      <p className="leading-snug"><strong className="text-neutral-200">CR</strong> {formatCr(monster)} (XP {xp})</p>

      <MonsterTextSection title="Traits" items={monster.trait} onRoll={onRoll} />
      <MonsterTextSection title="Actions" items={monster.action} onRoll={onRoll} interactive />
      <MonsterTextSection title="Bonus Actions" items={monster.bonus} onRoll={onRoll} interactive />
      <MonsterTextSection title="Reactions" items={monster.reaction} onRoll={onRoll} interactive />

      <p className="mt-3 text-xs font-bold text-neutral-400">Source: <span className="italic">{monsterEdition(monster)}</span>{monster.page ? `, page ${monster.page}` : ""}</p>
    </div>
  );
}

function ResizeHandle({ edge, className, onResizeStart }) {
  return (
    <button
      className={`absolute z-10 bg-amber-500/0 transition hover:bg-amber-500/35 focus:bg-amber-500/35 focus:outline-none ${className}`}
      type="button"
      aria-label={`Resize ${edge}`}
      onPointerDown={(event) => onResizeStart(event, edge)}
    />
  );
}

function MonsterNote({
  note,
  onClose,
  onDragStart,
  onFocus,
  onRoll,
  onToggleDice,
  onResizeStart,
  onMinimize,
  onRestore,
  onDuplicate,
  onHpChange,
  onRollHp
}) {
  function addRoll(label, roll) {
    onRoll(note.id, label, roll);
  }

  if (note.minimized) {
    return (
      <article
        className="absolute flex h-11 cursor-move items-center justify-between gap-3 overflow-hidden border border-amber-500 bg-neutral-900 px-3 text-neutral-300 shadow-2xl"
        data-dm-note="true"
        style={{ left: note.x, top: note.y, zIndex: note.z, width: clamp(note.width, 220, 340) }}
        onPointerDown={onFocus}
      >
        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onPointerDown={(event) => onDragStart(event, note.id)}
          onClick={() => onRestore(note.id)}
          title={`Restaurar ${note.monster.name}`}
        >
          <span className="block truncate font-serif text-sm font-bold uppercase tracking-wide text-amber-500">{note.monster.name}</span>
          <span className="block truncate text-[11px] text-neutral-500">CR {formatCr(note.monster)} | {monsterEdition(note.monster)}</span>
        </button>
        <button
          className="h-7 w-7 shrink-0 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
          type="button"
          aria-label={`Cerrar ${note.monster.name}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onClose(note.id)}
        >
          X
        </button>
      </article>
    );
  }

  return (
    <article
      className="absolute flex overflow-hidden border border-neutral-950 bg-neutral-900 text-neutral-300 shadow-2xl"
      data-dm-note="true"
      style={{ left: note.x, top: note.y, zIndex: note.z, width: note.width, height: note.height, flexDirection: "column" }}
      onPointerDown={onFocus}
    >
      <MonsterStatBlockHeader
        monster={note.monster}
        onDragStart={(event) => onDragStart(event, note.id)}
        onMinimize={() => onMinimize(note.id)}
        onDuplicate={() => onDuplicate(note.id)}
        onClose={() => onClose(note.id)}
      />
      <MonsterStatBlockBody
        monster={note.monster}
        onRoll={addRoll}
        className="min-h-0 flex-1 overflow-auto"
        hpState={{ current: note.hpCurrent, max: note.hpMax }}
        onHpChange={(field, value) => onHpChange(note.id, field, value)}
        onRollHp={() => onRollHp(note.id)}
      />
      <MonsterRollPanel note={note} onToggle={onToggleDice} onResizeCorner={(event, edge) => onResizeStart(event, note.id, edge)} />
      <ResizeHandle edge="right" className="right-0 top-8 h-[calc(100%-40px)] w-2 cursor-ew-resize" onResizeStart={(event, edge) => onResizeStart(event, note.id, edge)} />
      <ResizeHandle edge="bottom" className="bottom-0 left-0 h-2 w-[calc(100%-8px)] cursor-ns-resize" onResizeStart={(event, edge) => onResizeStart(event, note.id, edge)} />
    </article>
  );
}

function ResourceNote({
  note,
  onClose,
  onDragStart,
  onFocus,
  onRoll,
  onToggleDice,
  onResizeStart,
  onMinimize,
  onRestore,
  onDuplicate
}) {
  const entry = note.entry;
  const isSpell = note.kind === "spell";
  const source = isSpell ? spellSource(entry) : itemSource(entry);
  const spellSourceText = isSpell ? spellSourceLabel(entry) : "";
  const spellSubtitle = isSpell ? formatSpellSubtitle(entry) : "";
  const spellMeta = isSpell ? spellMetadataRows(entry) : [];
  const spellParagraphs = isSpell ? spellBodyParagraphs(entry) : [];
  const spellClasses = isSpell && Array.isArray(entry.classes) ? entry.classes.filter(Boolean).join(", ") : "";
  const spellSubclasses = isSpell && Array.isArray(entry.subclasses) ? entry.subclasses.filter(Boolean).join(", ") : "";
  const spellRaces = isSpell && Array.isArray(entry.races) ? entry.races.filter(Boolean).join(", ") : "";
  const itemSourceText = isSpell ? "" : itemSourceLabel(entry);
  const itemPageText = !isSpell && entry?.page ? `P${entry.page}` : "";
  const subtitle = isSpell
    ? `${formatSpellLevel(entry)}${spellSchool(entry) ? ` | ${spellSchool(entry)}` : ""}`
    : `${titleCase(itemRarity(entry))}${entry.type ? ` | ${entry.type}` : ""}`;
  const details = isSpell
    ? []
    : [
      ["Source", source],
      ["Rarity", titleCase(itemRarity(entry))],
      ["Value", entry.value ? `${entry.value} cp` : ""],
      ["Weight", entry.weight ? `${entry.weight} lb.` : ""]
    ];
  const text = isSpell ? entry.description : renderEntryText(entry.entries);
  const itemRules = isSpell ? [] : itemRuleSections(entry);
  const itemPrimaryLabel = isSpell ? "" : itemTypeLabel(entry);
  const itemCategoryLine = isSpell ? "" : itemCategorySummary(entry);
  const itemDamage = isSpell ? "" : formatItemDamage(entry);
  const itemPropertiesLine = isSpell ? "" : itemPropertyMetas(entry).map((propertyMeta) => formatItemPropertyName(propertyMeta, entry)).join(", ");
  const itemMasteryLine = isSpell ? "" : itemMasteryMetas(entry).map((masteryMeta) => masteryMeta?.name).filter(Boolean).join(", ");
  const itemValueWeightLine = isSpell ? "" : [formatItemCurrency(entry?.value), formatItemWeight(entry?.weight)].filter(Boolean).join(", ");
  const itemFooter = isSpell ? "" : itemRulesFooter(entry);

  function addRoll(label, roll) {
    onRoll(note.id, label, roll);
  }

  if (note.minimized) {
    return (
      <article
        className="absolute flex h-11 cursor-move items-center justify-between gap-3 overflow-hidden border border-amber-500 bg-neutral-900 px-3 text-neutral-300 shadow-2xl"
        data-dm-note="true"
        style={{ left: note.x, top: note.y, zIndex: note.z, width: clamp(note.width, 220, 340) }}
        onPointerDown={onFocus}
      >
        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onPointerDown={(event) => onDragStart(event, note.id)}
          onClick={() => onRestore(note.id)}
          title={`Restaurar ${entry.name}`}
        >
          <span className="block truncate font-serif text-sm font-bold uppercase tracking-wide text-amber-500">{entry.name}</span>
          <span className="block truncate text-[11px] text-neutral-500">{isSpell ? spellSubtitle : itemCategoryLine || itemPrimaryLabel}</span>
        </button>
        <button
          className="h-7 w-7 shrink-0 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
          type="button"
          aria-label={`Cerrar ${entry.name}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onClose(note.id)}
        >
          X
        </button>
      </article>
    );
  }

  return (
    <article
      className="absolute flex overflow-hidden border border-neutral-950 bg-neutral-900 text-neutral-300 shadow-2xl"
      data-dm-note="true"
      style={{ left: note.x, top: note.y, zIndex: note.z, width: note.width, height: note.height, flexDirection: "column" }}
      onPointerDown={onFocus}
    >
      <header
        className="flex cursor-move items-start justify-between gap-3 border-b-2 border-amber-500 bg-neutral-900 px-3 py-2"
        onPointerDown={(event) => onDragStart(event, note.id)}
      >
        <div>
          <h2 className="font-serif text-xl font-bold uppercase leading-none tracking-wide text-amber-500">{entry.name}</h2>
          <p className="mt-2 text-sm italic text-neutral-300">{isSpell ? spellSubtitle : itemPrimaryLabel}</p>
          {!isSpell && itemCategoryLine ? <p className="mt-1 text-sm text-neutral-500">{itemCategoryLine}</p> : null}
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <div className="font-serif text-xl uppercase leading-none text-amber-500">{isSpell ? spellSourceText : itemSourceText}</div>
            {!isSpell && itemPageText ? <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{itemPageText}</div> : null}
          </div>
          <div className="flex gap-1">
            <button className="h-7 w-7 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onMinimize(note.id)}>-</button>
            <button className="h-7 w-7 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onDuplicate(note.id)}>⧉</button>
            <button className="h-7 w-7 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onClose(note.id)}>X</button>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2 text-sm">
        {isSpell ? (
          <>
            {spellMeta.length ? (
              <div className="space-y-1.5 text-[15px] leading-relaxed">
                {spellMeta.map(([label, value]) => (
                  <p key={`${entry.name}-${label}`}>
                    <span className="font-bold text-neutral-100">{label}:</span>{" "}
                    <span className="text-neutral-300">{value}</span>
                  </p>
                ))}
              </div>
            ) : null}

            <div className={`${spellMeta.length ? "mt-4" : ""} border-t-2 border-amber-500/80 pt-3`}>
              <div className="space-y-3 leading-relaxed text-neutral-300">
                {spellParagraphs.map((paragraph, index) => (
                  <p key={`${entry.name}-paragraph-${index}`}>
                    <InteractiveRulesText text={paragraph} context={entry.name} onRoll={addRoll} />
                  </p>
                ))}
              </div>

              {spellClasses ? (
                <p className="mt-4 leading-relaxed text-neutral-300">
                  <span className="font-bold text-neutral-100">Classes:</span>{" "}
                  <InteractiveRulesText text={spellClasses} context={`${entry.name} classes`} onRoll={addRoll} />
                </p>
              ) : null}
              {spellSubclasses ? (
                <p className="mt-2 leading-relaxed text-neutral-300">
                  <span className="font-bold text-neutral-100">Subclasses:</span>{" "}
                  <InteractiveRulesText text={spellSubclasses} context={`${entry.name} subclasses`} onRoll={addRoll} />
                </p>
              ) : null}
              {spellRaces ? (
                <p className="mt-2 leading-relaxed text-neutral-300">
                  <span className="font-bold text-neutral-100">Races:</span>{" "}
                  <InteractiveRulesText text={spellRaces} context={`${entry.name} races`} onRoll={addRoll} />
                </p>
              ) : null}
              {source ? (
                <p className="mt-4 text-xs leading-relaxed text-neutral-500">
                  <span className="font-bold italic text-neutral-200">Source.</span>{" "}
                  {spellSourceText}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 text-[15px] text-neutral-300">{itemValueWeightLine || "\u00A0"}</div>
              <div className="min-w-0 flex-1 text-right">
                {itemDamage ? <div className="text-[22px] font-medium leading-none text-sky-300">{itemDamage}</div> : null}
                {itemPropertiesLine ? <div className="mt-2 text-[15px] text-neutral-300">{itemPropertiesLine}</div> : null}
                {itemMasteryLine ? <div className="mt-1 text-[15px] text-amber-500">Mastery: <span className="text-neutral-100">{itemMasteryLine}</span></div> : null}
              </div>
            </div>

            <div className="mt-4 border-t-2 border-amber-500/80 pt-3">
              {String(text || "").trim() ? (
                <div className="mb-3 leading-relaxed text-neutral-300">
                  <InteractiveRulesText text={text} context={entry.name} onRoll={addRoll} />
                </div>
              ) : null}
              <div className="space-y-3">
                {itemRules.map((section) => (
                  <p key={`${entry.name}-${section.title}`} className="leading-relaxed text-neutral-300">
                    <span className="font-bold italic text-neutral-100">{section.title}.</span>{" "}
                    <InteractiveRulesText text={section.text} context={`${entry.name} ${section.title}`} onRoll={addRoll} />
                  </p>
                ))}
              </div>
              {itemFooter ? (
                <p className="mt-4 text-xs leading-relaxed text-neutral-500">
                  <span className="font-bold italic text-neutral-200">Source.</span>{" "}
                  {itemFooter}
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
      <MonsterRollPanel note={note} onToggle={onToggleDice} onResizeCorner={(event, edge) => onResizeStart(event, note.id, edge)} />
      <ResizeHandle edge="right" className="right-0 top-8 h-[calc(100%-40px)] w-2 cursor-ew-resize" onResizeStart={(event, edge) => onResizeStart(event, note.id, edge)} />
      <ResizeHandle edge="bottom" className="bottom-0 left-0 h-2 w-[calc(100%-8px)] cursor-ns-resize" onResizeStart={(event, edge) => onResizeStart(event, note.id, edge)} />
    </article>
  );
}

function CharacterAbilityCell({ character, ability, onRoll }) {
  const score = character.abilities[ability] ?? 10;
  const mod = abilityModifier(score);
  const save = parseModifier(character.saves[ability], mod);
  const label = ABILITY_LABELS[ability];

  return (
    <div className="grid grid-cols-[34px_1fr_42px_42px] items-center bg-neutral-800 px-1 py-0.5 text-sm">
      <span className="font-bold text-neutral-300">{label}</span>
      <span className="text-neutral-300">{score}</span>
      <RollButton title={`Tirar ${label} mod d20${signNumber(mod)}`} onRoll={() => onRoll(`${label} mod`, rollD20(mod))}>
        {signNumber(mod)}
      </RollButton>
      <RollButton title={`Tirar ${label} save d20${signNumber(save)}`} onRoll={() => onRoll(`${label} save`, rollD20(save))}>
        {signNumber(save)}
      </RollButton>
    </div>
  );
}

function CharacterDetailSection({ title, children, defaultOpen = false }) {
  return (
    <details className="mt-3 border border-neutral-800 bg-neutral-950/45" defaultOpen={defaultOpen}>
      <summary className="cursor-pointer select-none border-b border-neutral-800 px-3 py-2 font-serif text-base uppercase leading-none text-amber-500 hover:bg-neutral-900">
        {title}
      </summary>
      <div className="space-y-3 px-3 py-3 text-sm text-neutral-300">
        {children}
      </div>
    </details>
  );
}

function CharacterResourceButton({ kind, label, onOpenResource }) {
  if (!onOpenResource) {
    return <InteractiveRulesText text={label} context={kind} onRoll={() => {}} />;
  }
  return (
    <button
      className="min-h-10 border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-left leading-relaxed text-neutral-200 transition hover:border-amber-500 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
      type="button"
      title={`Agregar nota de ${kind === "spell" ? "spell" : "item"}: ${label}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => onOpenResource(kind, label, event)}
    >
      {label}
    </button>
  );
}

function CharacterTextBlock({ text, context, onRoll, onOpenResource = null }) {
  if (!String(text || "").trim()) return <p className="text-neutral-500">Sin datos.</p>;
  const lines = compactLines(text);
  const normalizedContext = normalizeSearch(context);
  const isFeatures = normalizedContext.includes("features");
  const isProficiencies = normalizedContext.includes("proficiencies");
  const isEquipment = normalizedContext.includes("equipment");

  if (isFeatures) {
    return (
      <div className="grid gap-2">
        {lines.map((line, index) => {
          const cleaned = line.replace(/^[-*]\s*/, "");
          const match = cleaned.match(/^([^:]{2,42}):\s*(.+)$/);
          const label = match?.[1]?.trim() || "";
          const body = match?.[2]?.trim() || cleaned;
          return (
            <div key={`${cleaned}-${index}`} className="border border-neutral-800 bg-neutral-900/80 px-3 py-2">
              {label ? <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-500">{label}</div> : null}
              <div className="leading-relaxed text-neutral-200">
                <InteractiveRulesText text={body} context={context} onRoll={onRoll} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (isProficiencies) {
    return (
      <div className="space-y-3">
        {lines.map((line, index) => {
          const cleaned = line.replace(/^[-*]\s*/, "").trim();
          if (!cleaned) return null;
          if (/^[A-Z][A-Z\s&/]+$/.test(cleaned)) {
            return <h4 key={`${cleaned}-${index}`} className="border-b border-neutral-800 pb-1 text-xs font-bold uppercase tracking-wide text-amber-500">{cleaned}</h4>;
          }
          const match = cleaned.match(/^([^:]{2,36}):\s*(.+)$/);
          return (
            <div key={`${cleaned}-${index}`} className="grid gap-1 border border-neutral-800 bg-neutral-900/80 px-3 py-2 sm:grid-cols-[120px_1fr]">
              {match ? <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">{match[1]}</div> : null}
              <div className="leading-relaxed text-neutral-200">
                <InteractiveRulesText text={match ? match[2] : cleaned} context={context} onRoll={onRoll} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (isEquipment) {
    const candidates = equipmentResourceCandidates(text);
    if (candidates.length) {
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {candidates.map((item, index) => (
            <CharacterResourceButton
              key={`${item.query}-${index}`}
              kind="item"
              label={item.display}
              onOpenResource={onOpenResource}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {lines.map((line, index) => (
          <div key={`${line}-${index}`} className="min-h-10 border border-neutral-800 bg-neutral-900/80 px-3 py-2 leading-relaxed text-neutral-200">
            <InteractiveRulesText text={line.replace(/^[-*]\s*/, "")} context={context} onRoll={onRoll} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 whitespace-pre-line leading-relaxed">
      <InteractiveRulesText text={text} context={context} onRoll={onRoll} />
    </div>
  );
}

function CharacterMonsterVitals({ character, monster, note, onRoll, onHpChange }) {
  const initiative = abilityModifier(monster.dex);
  const senses = formatList(monster.senses);
  const skills = formatKeyValueMap(monster.skill);
  const languages = formatList(monster.languages) || "--";

  return (
    <div className="px-3 py-2 text-sm">
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <div className="space-y-0.5">
          <p><strong className="text-neutral-200">AC</strong> {formatAc(monster)}</p>
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-neutral-200">HP</strong>
            <span className="font-semibold text-neutral-200">
              {note.hpCurrent || 0}/{note.hpMax || character.hpMax || 0}{character.tempHp ? ` +${character.tempHp} temp` : ""}
            </span>
            <label className="flex items-center gap-1 text-xs text-neutral-500">
              Current
              <NumericExpressionInput
                className="h-7 w-16 border border-neutral-700 bg-neutral-950 px-2 text-sm text-neutral-100 focus:border-amber-500 focus:outline-none"
                value={note.hpCurrent}
                onPointerDown={(event) => event.stopPropagation()}
                onChange={(value) => onHpChange(note.id, "current", value)}
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-neutral-500">
              Total
              <NumericExpressionInput
                className="h-7 w-16 border border-neutral-700 bg-neutral-950 px-2 text-sm text-neutral-100 focus:border-amber-500 focus:outline-none"
                value={note.hpMax}
                onPointerDown={(event) => event.stopPropagation()}
                onChange={(value) => onHpChange(note.id, "max", value)}
              />
            </label>
          </div>
          <p><strong className="text-neutral-200">Speed</strong> {formatSpeedCompact(monster)}</p>
          <p><strong className="text-neutral-200">Passive</strong> {character.passive || "--"}</p>
        </div>
        <div className="text-right">
          <strong className="text-neutral-200">Initiative</strong>{" "}
          <RollButton title={`Tirar iniciativa d20${signNumber(initiative)}`} onRoll={() => onRoll("Initiative", rollD20(initiative))}>
            {signNumber(initiative)}
          </RollButton>
          <span className="text-neutral-500"> ({10 + initiative})</span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_42px_42px] gap-x-1 px-1 text-[10px] uppercase tracking-wide text-neutral-500">
        <span />
        <span className="text-center">Mod</span>
        <span className="text-center">Save</span>
      </div>
      <div className="grid gap-1 sm:grid-cols-3">
        {["str", "dex", "con"].map((ability) => <AbilityCell key={ability} monster={monster} ability={ability} onRoll={onRoll} />)}
      </div>
      <div className="mt-1 grid gap-1 sm:grid-cols-3">
        {["int", "wis", "cha"].map((ability) => <AbilityCell key={ability} monster={monster} ability={ability} onRoll={onRoll} />)}
      </div>

      {skills ? <p className="mt-2 leading-snug"><strong className="text-neutral-200">Skills</strong> {skills}</p> : null}
      {senses ? <p className="leading-snug"><strong className="text-neutral-200">Senses</strong> {senses}</p> : null}
      <p className="leading-snug"><strong className="text-neutral-200">Languages</strong> {languages}</p>
      <p className="leading-snug">
        <strong className="text-neutral-200">Character</strong>{" "}
        {[character.race, character.background, character.profBonus ? `Prof ${character.profBonus}` : "", character.hitDice ? `HD ${character.hitDice}` : ""].filter(Boolean).join(" | ") || "Imported"}
      </p>
      {character.money.length ? (
        <p className="leading-snug"><strong className="text-neutral-200">Money</strong> {character.money.map(([key, value]) => `${value} ${key}`).join(", ")}</p>
      ) : null}
    </div>
  );
}

function CharacterNote({
  note,
  onClose,
  onDragStart,
  onFocus,
  onRoll,
  onToggleDice,
  onResizeStart,
  onMinimize,
  onRestore,
  onDuplicate,
  onHpChange,
  onOpenResource
}) {
  const character = note.character;
  const statBlockCharacter = characterStatBlockEntity(character);
  const subtitle = [
    character.race,
    character.classLevel || (character.level ? `Level ${character.level}` : ""),
    character.background
  ].filter(Boolean).join(" | ");
  const spellcastingMeta = [
    character.spellcasting.className,
    character.spellcasting.ability ? `Ability ${character.spellcasting.ability}` : "",
    character.spellcasting.saveDc ? `DC ${character.spellcasting.saveDc}` : "",
    character.spellcasting.attackBonus ? `Atk ${character.spellcasting.attackBonus}` : ""
  ].filter(Boolean).join(" | ");

  function addRoll(label, roll) {
    onRoll(note.id, label, roll);
  }

  if (note.minimized) {
    return (
      <article
        className="absolute flex h-11 cursor-move items-center justify-between gap-3 overflow-hidden border border-amber-500 bg-neutral-900 px-3 text-neutral-300 shadow-2xl"
        data-dm-note="true"
        style={{ left: note.x, top: note.y, zIndex: note.z, width: clamp(note.width, 220, 340) }}
        onPointerDown={onFocus}
      >
        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onPointerDown={(event) => onDragStart(event, note.id)}
          onClick={() => onRestore(note.id)}
          title={`Restaurar ${character.name}`}
        >
          <span className="block truncate font-serif text-sm font-bold uppercase tracking-wide text-amber-500">{character.name}</span>
          <span className="block truncate text-[11px] text-neutral-500">{subtitle || "Character"}</span>
        </button>
        <button
          className="h-7 w-7 shrink-0 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
          type="button"
          aria-label={`Cerrar ${character.name}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onClose(note.id)}
        >
          X
        </button>
      </article>
    );
  }

  return (
    <article
      className="absolute flex overflow-hidden border border-neutral-950 bg-neutral-900 text-neutral-300 shadow-2xl"
      data-dm-note="true"
      style={{ left: note.x, top: note.y, zIndex: note.z, width: note.width, height: note.height, flexDirection: "column" }}
      onPointerDown={onFocus}
    >
      <MonsterStatBlockHeader
        monster={statBlockCharacter}
        onDragStart={(event) => onDragStart(event, note.id)}
        onMinimize={() => onMinimize(note.id)}
        onDuplicate={() => onDuplicate(note.id)}
        onClose={() => onClose(note.id)}
      />

      <div className="min-h-0 flex-1 overflow-auto text-sm">
        {character.player ? (
          <p className="border-b border-neutral-800 px-3 py-2 text-xs text-neutral-500">Player {character.player}</p>
        ) : null}
        <CharacterMonsterVitals
          character={character}
          monster={statBlockCharacter}
          note={note}
          onRoll={addRoll}
          onHpChange={onHpChange}
        />

        {character.actions.length ? (
          <CharacterDetailSection title="Actions" defaultOpen>
            {character.actions.map((action, index) => (
              <p key={`${action.name}-${index}`} className="leading-snug">
                <span className="font-bold italic text-neutral-200">{action.name}.</span>{" "}
                <InteractiveRulesText text={renderEntryText(action.entries)} context={action.name} onRoll={addRoll} />
              </p>
            ))}
          </CharacterDetailSection>
        ) : null}

        {(spellcastingMeta || character.spellcasting.slots.length || character.spellcasting.spells.length) ? (
          <CharacterDetailSection title="Spellcasting">
            {spellcastingMeta ? <p className="text-neutral-400">{spellcastingMeta}</p> : null}
            {character.spellcasting.slots.length ? (
              <div className="grid grid-cols-3 gap-1 text-xs sm:grid-cols-5">
                {character.spellcasting.slots.map((slot) => (
                  <div key={slot.level} className="border border-neutral-800 bg-neutral-900 px-2 py-1">
                    <span className="font-bold text-amber-500">L{slot.level}</span>{" "}
                    <span>{slot.remaining || 0}/{slot.total || 0}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {character.spellcasting.spells.length ? (
              <div className="grid gap-1 sm:grid-cols-2">
                {character.spellcasting.spells.map((spell) => (
                  <button
                    key={spell.key}
                    className="truncate border border-neutral-800 bg-neutral-900 px-2 py-1 text-left text-xs text-neutral-200 transition hover:border-amber-500 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    type="button"
                    title={`Agregar nota de spell: ${spell.name}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => onOpenResource?.("spell", spell.name, note, event)}
                  >
                    {spell.name}
                  </button>
                ))}
              </div>
            ) : null}
          </CharacterDetailSection>
        ) : null}

        <CharacterDetailSection title="All Skills">
          <div className="grid gap-1 sm:grid-cols-2">
            {character.skills.map((skill) => (
              <div key={skill.label} className="flex items-center justify-between border border-neutral-800 bg-neutral-900 px-2 py-1">
                <span>{skill.proficient ? "*" : ""}{skill.label}</span>
                <RollButton title={`Tirar ${skill.label} d20${skill.value}`} onRoll={() => addRoll(skill.label, rollD20(parseModifier(skill.value)))}>
                  {skill.value}
                </RollButton>
              </div>
            ))}
          </div>
        </CharacterDetailSection>

        {character.sections.map(([title, text], index) => (
          <CharacterDetailSection
            key={`${title}-${index}`}
            title={title}
            defaultOpen={["features", "proficiencies", "equipment"].some((keyword) => normalizeSearch(title).includes(keyword))}
          >
            <CharacterTextBlock
              text={compactParagraph(text)}
              context={title}
              onRoll={addRoll}
              onOpenResource={(kind, label, event) => onOpenResource?.(kind, label, note, event)}
            />
          </CharacterDetailSection>
        ))}
      </div>

      <MonsterRollPanel note={note} onToggle={onToggleDice} onResizeCorner={(event, edge) => onResizeStart(event, note.id, edge)} />
      <ResizeHandle edge="right" className="right-0 top-8 h-[calc(100%-40px)] w-2 cursor-ew-resize" onResizeStart={(event, edge) => onResizeStart(event, note.id, edge)} />
      <ResizeHandle edge="bottom" className="bottom-0 left-0 h-2 w-[calc(100%-8px)] cursor-ns-resize" onResizeStart={(event, edge) => onResizeStart(event, note.id, edge)} />
    </article>
  );
}

function sanitizeDisplayText(value, fallback = "") {
  const text = String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || fallback;
}
function formatLiveTimestamp(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function LivePlayerCard({ player, onKick }) {
  const character = useMemo(() => {
    try {
      return characterFromSheetData(player.data || {});
    } catch (_error) {
      return null;
    }
  }, [player.data]);
  const name = sanitizeDisplayText(character?.name, "Unknown character");
  const playerName = sanitizeDisplayText(player.playerName, "Player");
  const classLevel = sanitizeDisplayText(character?.classLevel || (character?.level ? `Level ${character.level}` : ""), "No class");
  const race = sanitizeDisplayText(character?.race, "No race");
  const hpLabel = `${character?.hpCurrent || 0}/${character?.hpMax || 0}${character?.tempHp ? ` +${character.tempHp} temp` : ""}`;
  const slots = character?.spellcasting?.slots || [];

  return (
    <article className={`border bg-neutral-950/80 p-3 shadow-lg ${player.connected ? "border-neutral-700" : "border-neutral-800 opacity-75"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${player.connected ? "bg-emerald-400" : "bg-neutral-600"}`} />
            <h3 className="truncate font-serif text-lg font-bold uppercase leading-tight text-amber-500">{name}</h3>
          </div>
          <p className="mt-1 truncate text-xs text-neutral-400">{playerName} | {classLevel} | {race}</p>
        </div>
        <button
          className="shrink-0 border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs font-bold text-neutral-300 hover:border-red-500 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/40"
          type="button"
          onClick={() => onKick(player.playerId)}
        >
          {player.connected ? "Kick" : "Remove"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        <Stat label="AC" value={character?.ac || "--"} />
        <Stat label="HP" value={hpLabel} />
        <Stat label="Temp" value={character?.tempHp || "0"} />
        <Stat label="Passive" value={character?.passive || "--"} />
      </div>

      <div className="mt-3 grid grid-cols-6 gap-1 text-center text-xs">
        {ABILITY_KEYS.map((ability) => (
          <div key={ability} className="border border-neutral-800 bg-neutral-900 px-1 py-1">
            <div className="font-bold uppercase text-neutral-500">{ABILITY_LABELS[ability]}</div>
            <div className="text-neutral-100">{character?.abilities?.[ability] ?? "--"}</div>
          </div>
        ))}
      </div>

      {slots.length ? (
        <div className="mt-3 grid grid-cols-3 gap-1 text-xs">
          {slots.map((slot) => (
            <div key={slot.level} className="border border-neutral-800 bg-neutral-900 px-2 py-1">
              <span className="font-bold text-amber-500">L{slot.level}</span> {slot.remaining || 0}/{slot.total || 0}
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-[11px] uppercase tracking-wide text-neutral-500">
        {player.connected ? "Connected" : "Disconnected"} | Last update {formatLiveTimestamp(player.lastUpdate)}
      </p>
    </article>
  );
}

function LivePlayersPanel({ status, port, error, players, rolls, onPortChange, onStart, onStop, onKick }) {
  const running = Boolean(status?.running);
  const addresses = Array.isArray(status?.addresses) ? status.addresses : [];
  const primaryAddress = addresses[0] || "DM_IP";
  const effectivePort = status?.port || port || 8787;

  return (
    <aside className="fixed right-4 top-4 z-40 flex max-h-[calc(100vh-32px)] w-[min(420px,calc(100vw-32px))] flex-col border border-neutral-700 bg-neutral-900/95 text-neutral-200 shadow-2xl">
      <header className="border-b-2 border-amber-500 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold uppercase tracking-wide text-amber-500">Live Players</h2>
            <p className="mt-1 text-xs text-neutral-500">Players connect to ws://{primaryAddress}:{effectivePort} from the Connect to DM panel.</p>
          </div>
          <span className={`shrink-0 border px-2 py-1 text-[11px] font-bold uppercase ${running ? "border-emerald-500/40 text-emerald-300" : "border-neutral-700 text-neutral-500"}`}>
            {running ? "Hosting" : "Stopped"}
          </span>
        </div>
      </header>

      <div className="grid gap-3 border-b border-neutral-800 p-3">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <label className="text-xs font-bold uppercase text-neutral-500">
            Port
            <NumericExpressionInput
              className="mt-1 h-9 w-full border border-neutral-700 bg-neutral-950 px-2 text-sm font-normal normal-case text-neutral-100 focus:border-amber-500 focus:outline-none"
              min="1"
              max="65535"
              integer
              value={port}
              disabled={running}
              onChange={(value) => onPortChange(formatNumericInputValue(value))}
            />
          </label>
          <button
            className="mt-5 h-9 border border-neutral-700 bg-neutral-950 px-3 text-sm font-bold text-emerald-300 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={running}
            onClick={onStart}
          >
            Start Host
          </button>
          <button
            className="mt-5 h-9 border border-neutral-700 bg-neutral-950 px-3 text-sm font-bold text-red-300 hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={!running}
            onClick={onStop}
          >
            Stop Host
          </button>
        </div>

        {addresses.length ? (
          <div className="grid gap-1 text-xs text-neutral-400">
            {addresses.map((address) => (
              <code key={address} className="border border-neutral-800 bg-neutral-950 px-2 py-1 text-amber-200">ws://{address}:{effectivePort}</code>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-500">{running ? "No LAN IP detected. Check Windows network settings." : "Start the host to show LAN IP addresses."}</p>
        )}
        {error ? <p className="border border-red-500/30 bg-red-950/40 px-2 py-1 text-xs text-red-200">{error}</p> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <section className="mb-3 border border-neutral-800 bg-neutral-950/70">
          <header className="border-b border-neutral-800 px-3 py-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-amber-500">Recent Rolls</h3>
          </header>
          <div className="grid max-h-48 gap-2 overflow-auto p-2">
            {rolls.length ? rolls.slice(0, 8).map((roll) => (
              <article key={roll.id} className="border border-neutral-800 bg-neutral-900 px-2 py-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-neutral-100">{sanitizeDisplayText(roll.playerName, "Player")}</p>
                    <p className="truncate text-neutral-400">{sanitizeDisplayText(roll.title, "Tirada")}</p>
                  </div>
                  <span className="shrink-0 text-base font-bold text-sky-300">{sanitizeDisplayText(roll.result, "--")}</span>
                </div>
                {roll.detail ? <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[11px] leading-snug text-neutral-500">{sanitizeDisplayText(roll.detail)}</p> : null}
                <p className="mt-1 text-[10px] uppercase tracking-wide text-neutral-600">{formatLiveTimestamp(roll.receivedAt || roll.timestamp)}</p>
              </article>
            )) : (
              <p className="px-2 py-3 text-center text-xs text-neutral-500">No rolls received yet.</p>
            )}
          </div>
        </section>

        {players.length ? (
          <div className="grid gap-3">
            {players.map((player) => (
              <LivePlayerCard key={player.playerId} player={player} onKick={onKick} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-neutral-700 bg-neutral-950/60 p-4 text-center text-sm text-neutral-500">
            No connected players yet.
          </div>
        )}
      </div>
    </aside>
  );
}

function MonsterPicker({
  isOpen,
  monsters,
  selectedMonster,
  searchQuery,
  editionFilter,
  crFilter,
  sortField,
  sortDirection,
  editionOptions,
  crOptions,
  previewRolls,
  previewDicePanelOpen,
  onSearch,
  onEditionFilter,
  onCrFilter,
  onSortField,
  onSortDirection,
  onSelect,
  onAdd,
  onPreviewRoll,
  onTogglePreviewDice,
  onClose
}) {
  if (!isOpen) return null;
  const previewNote = selectedMonster ? {
    id: "monster-picker-preview",
    monster: selectedMonster,
    rolls: previewRolls,
    dicePanelOpen: previewDicePanelOpen
  } : null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4" data-monster-picker="true">
      <section className="grid h-[min(760px,calc(100vh-32px))] w-[min(1120px,calc(100vw-32px))] grid-cols-1 overflow-hidden border border-neutral-700 bg-neutral-900 text-neutral-300 shadow-2xl md:grid-cols-[420px_1fr]">
        <div className="flex min-h-0 flex-col border-r border-neutral-700">
          <header className="border-b-2 border-amber-500 bg-neutral-950 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-amber-500">Add Monster</h1>
                <p className="text-sm text-neutral-500">{bestiary.length} monsters</p>
              </div>
              <button
                className="h-8 w-8 border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
              >
                X
              </button>
            </div>
            <input
              className="mt-4 h-10 w-full border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              value={searchQuery}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search by name, CR, edition, type"
              autoFocus
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs font-bold uppercase text-neutral-500">
                Edition
                <select
                  className="mt-1 h-9 w-full border border-neutral-700 bg-neutral-900 px-2 text-sm font-normal normal-case text-neutral-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  value={editionFilter}
                  onChange={(event) => onEditionFilter(event.target.value)}
                >
                  <option value="all">All editions</option>
                  {editionOptions.map((edition) => <option key={edition} value={edition}>{edition}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold uppercase text-neutral-500">
                CR
                <select
                  className="mt-1 h-9 w-full border border-neutral-700 bg-neutral-900 px-2 text-sm font-normal normal-case text-neutral-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  value={crFilter}
                  onChange={(event) => onCrFilter(event.target.value)}
                >
                  <option value="all">All CR</option>
                  {crOptions.map((cr) => <option key={cr} value={cr}>{cr}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
              <label className="text-xs font-bold uppercase text-neutral-500">
                Order by
                <select
                  className="mt-1 h-9 w-full border border-neutral-700 bg-neutral-900 px-2 text-sm font-normal normal-case text-neutral-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  value={sortField}
                  onChange={(event) => onSortField(event.target.value)}
                >
                  <option value="name">Name</option>
                  <option value="cr">CR</option>
                  <option value="edition">Edition</option>
                </select>
              </label>
              <button
                className="mt-5 h-9 border border-neutral-700 bg-neutral-900 px-3 text-sm font-bold text-amber-500 hover:border-amber-500 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                type="button"
                onClick={() => onSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              >
                {sortDirection === "asc" ? "Asc" : "Desc"}
              </button>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_72px_90px] border-b border-neutral-700 bg-neutral-800 px-3 py-2 text-xs font-bold uppercase text-neutral-500">
            {[
              ["name", "Name"],
              ["cr", "CR"],
              ["edition", "Edition"]
            ].map(([field, label]) => (
              <button
                key={field}
                className={`text-left uppercase hover:text-amber-500 focus:outline-none focus:text-amber-500 ${sortField === field ? "text-amber-500" : ""}`}
                type="button"
                onClick={() => {
                  if (sortField === field) onSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  else onSortField(field);
                }}
              >
                {label}{sortField === field ? ` ${sortDirection === "asc" ? "ASC" : "DESC"}` : ""}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-neutral-900">
            {monsters.length ? monsters.map((monster) => {
              const active = selectedMonster === monster;
              return (
                <button
                  key={`${monster.name}-${monster.source}-${monster.page || ""}`}
                  className={`grid w-full grid-cols-[1fr_72px_90px] gap-2 border-b border-neutral-800 px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-300 ${active ? "bg-amber-500 text-neutral-950 hover:bg-amber-400" : "text-neutral-300 hover:bg-neutral-800"}`}
                  type="button"
                  onClick={() => onSelect(monster)}
                >
                  <span className="truncate font-semibold">{monster.name}</span>
                  <span>{formatCr(monster)}</span>
                  <span className="truncate">{monsterEdition(monster)}</span>
                </button>
              );
            }) : (
              <p className="px-4 py-6 text-sm text-neutral-500">No matches.</p>
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-auto bg-neutral-900 p-5">
          {selectedMonster ? (
            <div className="space-y-5">
              <article className="overflow-hidden border border-neutral-950 bg-neutral-900 text-neutral-300 shadow-2xl">
                <MonsterStatBlockHeader monster={selectedMonster} />
                <MonsterStatBlockBody
                  monster={selectedMonster}
                  onRoll={onPreviewRoll}
                  className="max-h-[min(56vh,560px)] overflow-auto"
                />
                <MonsterRollPanel note={previewNote} onToggle={onTogglePreviewDice} />
              </article>

              <div className="sticky bottom-0 border-t border-neutral-700 bg-neutral-900 pt-4">
                <button
                  className="inline-flex h-10 items-center bg-amber-500 px-4 text-sm font-bold text-neutral-950 shadow-sm transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-neutral-900"
                  type="button"
                  onClick={() => onAdd(selectedMonster)}
                >
                  Sumar monstruo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              Selecciona un monster.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ResourcePicker({ isOpen, kind, entries, selectedEntry, searchQuery, sortField, sortDirection, onSearch, onSortField, onSortDirection, onSelect, onAdd, onClose }) {
  if (!isOpen) return null;
  const isSpell = kind === "spell";
  const title = isSpell ? "Add Spell" : "Add Item";
  const secondaryLabel = isSpell ? "Level" : "Rarity";
  const secondarySort = isSpell ? "level" : "rarity";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4" data-monster-picker="true">
      <section className="grid h-[min(760px,calc(100vh-32px))] w-[min(1120px,calc(100vw-32px))] grid-cols-1 overflow-hidden border border-neutral-700 bg-neutral-900 text-neutral-300 shadow-2xl md:grid-cols-[420px_1fr]">
        <div className="flex min-h-0 flex-col border-r border-neutral-700">
          <header className="border-b-2 border-amber-500 bg-neutral-950 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-amber-500">{title}</h1>
                <p className="text-sm text-neutral-500">{entries.length} {isSpell ? "spells" : "items"}</p>
              </div>
              <button className="h-8 w-8 border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onClick={onClose}>X</button>
            </div>
            <input
              className="mt-4 h-10 w-full border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              value={searchQuery}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={`Search ${isSpell ? "spells" : "items"}`}
              autoFocus
            />
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
              <label className="text-xs font-bold uppercase text-neutral-500">
                Order by
                <select
                  className="mt-1 h-9 w-full border border-neutral-700 bg-neutral-900 px-2 text-sm font-normal normal-case text-neutral-100 focus:border-amber-500 focus:outline-none"
                  value={sortField}
                  onChange={(event) => onSortField(event.target.value)}
                >
                  <option value="name">Name</option>
                  <option value={secondarySort}>{secondaryLabel}</option>
                  <option value="source">Source</option>
                </select>
              </label>
              <button className="mt-5 h-9 border border-neutral-700 bg-neutral-900 px-3 text-sm font-bold text-amber-500 hover:border-amber-500" type="button" onClick={() => onSortDirection(sortDirection === "asc" ? "desc" : "asc")}>
                {sortDirection === "asc" ? "Asc" : "Desc"}
              </button>
            </div>
          </header>
          <div className="grid grid-cols-[1fr_90px_90px] border-b border-neutral-700 bg-neutral-800 px-3 py-2 text-xs font-bold uppercase text-neutral-500">
            <span>Name</span>
            <span>{secondaryLabel}</span>
            <span>Source</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-neutral-900">
            {entries.length ? entries.map((entry) => {
              const active = selectedEntry === entry;
              return (
                <button
                  key={`${kind}-${entry.name}-${isSpell ? spellSource(entry) : itemSource(entry)}-${entry.page || ""}`}
                  className={`grid w-full grid-cols-[1fr_90px_90px] gap-2 border-b border-neutral-800 px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-300 ${active ? "bg-amber-500 text-neutral-950 hover:bg-amber-400" : "text-neutral-300 hover:bg-neutral-800"}`}
                  type="button"
                  onClick={() => onSelect(entry)}
                >
                  <span className="truncate font-semibold">{entry.name}</span>
                  <span className="truncate">{isSpell ? formatSpellLevel(entry) : titleCase(itemRarity(entry))}</span>
                  <span className="truncate">{isSpell ? spellSource(entry) : itemSource(entry)}</span>
                </button>
              );
            }) : <p className="px-4 py-6 text-sm text-neutral-500">No matches.</p>}
          </div>
        </div>
        <div className="min-h-0 overflow-auto bg-neutral-900 p-5">
          {selectedEntry ? (
            <div className="space-y-5">
              <article className="overflow-hidden border border-neutral-950 bg-neutral-900 text-neutral-300 shadow-2xl">
                <header className="border-b-2 border-amber-500 bg-neutral-900 px-3 py-2">
                  <h2 className="font-serif text-xl font-bold uppercase leading-none tracking-wide text-amber-500">{selectedEntry.name}</h2>
                  <p className="mt-2 text-sm italic text-neutral-300">{isSpell ? formatSpellLevel(selectedEntry) : titleCase(itemRarity(selectedEntry))}</p>
                </header>
                <div className="max-h-[min(58vh,560px)] overflow-auto px-3 py-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <Stat label="Source" value={isSpell ? spellSource(selectedEntry) : itemSource(selectedEntry)} />
                    <Stat label={secondaryLabel} value={isSpell ? formatSpellLevel(selectedEntry) : titleCase(itemRarity(selectedEntry))} />
                  </div>
                  <p className="mt-3 leading-relaxed">{isSpell ? selectedEntry.description : renderEntryText(selectedEntry.entries)}</p>
                </div>
              </article>
              <div className="sticky bottom-0 border-t border-neutral-700 bg-neutral-900 pt-4">
                <button className="inline-flex h-10 items-center bg-amber-500 px-4 text-sm font-bold text-neutral-950 hover:bg-amber-400" type="button" onClick={() => onAdd(selectedEntry)}>
                  {isSpell ? "Sumar spell" : "Sumar item"}
                </button>
              </div>
            </div>
          ) : <div className="flex h-full items-center justify-center text-sm text-neutral-500">Selecciona una entrada.</div>}
        </div>
      </section>
    </div>
  );
}

function CharacterCodeModal({ isOpen, value, error, onChange, onClose, onSubmit }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/75 p-4"
      data-character-code-modal="true"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <section className="w-[min(640px,calc(100vw-32px))] border border-neutral-700 bg-neutral-900 text-neutral-200 shadow-2xl">
        <header className="border-b-2 border-amber-500 bg-neutral-950 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-amber-500">Add Character Code</h1>
              <p className="mt-1 text-sm text-neutral-400">Pega el codigo y presiona Enter para crear la nota.</p>
            </div>
            <button
              className="h-8 w-8 border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700"
              type="button"
              onClick={onClose}
            >
              X
            </button>
          </div>
        </header>
        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <textarea
            ref={inputRef}
            className="min-h-40 w-full resize-y border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              event.preventDefault();
              onSubmit();
            }}
            placeholder="Pega aqui el codigo del character sheet"
            spellCheck={false}
          />
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <button
              className="inline-flex h-10 items-center border border-neutral-700 bg-neutral-900 px-4 text-sm font-bold text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="inline-flex h-10 items-center bg-amber-500 px-4 text-sm font-bold text-neutral-950 hover:bg-amber-400"
              type="submit"
            >
              Add Character
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DetailList({ title, items }) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;

  return (
    <section className="space-y-2 border border-neutral-700 bg-neutral-950/50 p-4">
      <h2 className="border-b border-amber-500 pb-1 font-serif text-lg font-bold uppercase leading-none text-amber-500">{title}</h2>
      {list.map((item, index) => (
        <p key={`${title}-${item.name || index}`} className="text-sm leading-relaxed text-neutral-300">
          <strong className="italic text-neutral-100">{item.name || title}.</strong> {renderEntryText(item.entries || item)}
        </p>
      ))}
    </section>
  );
}

function DmScreenApp() {
  const [persistedBoardState] = useState(loadDmBoardState);
  const [isReturning, setIsReturning] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editionFilter, setEditionFilter] = useState("all");
  const [crFilter, setCrFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedMonster, setSelectedMonster] = useState(bestiary[0] || null);
  const [previewRolls, setPreviewRolls] = useState([]);
  const [previewDicePanelOpen, setPreviewDicePanelOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [noteSpawnPoint, setNoteSpawnPoint] = useState(null);
  const [resourcePickerKind, setResourcePickerKind] = useState(null);
  const [resourceSearchQuery, setResourceSearchQuery] = useState("");
  const [resourceSortField, setResourceSortField] = useState("name");
  const [resourceSortDirection, setResourceSortDirection] = useState("asc");
  const [selectedSpell, setSelectedSpell] = useState(spells[0] || null);
  const [selectedItem, setSelectedItem] = useState(ITEM_LIBRARY[0] || null);
  const [monsterNotes, setMonsterNotes] = useState(persistedBoardState.notes);
  const [isCharacterCodeModalOpen, setIsCharacterCodeModalOpen] = useState(false);
  const [characterCodeValue, setCharacterCodeValue] = useState("");
  const [characterCodeError, setCharacterCodeError] = useState("");
  const [characterCodeSpawnPoint, setCharacterCodeSpawnPoint] = useState(null);
  const [liveServerStatus, setLiveServerStatus] = useState({ running: false, port: 8787, addresses: [], playerCount: 0 });
  const [livePlayers, setLivePlayers] = useState([]);
  const [liveRolls, setLiveRolls] = useState([]);
  const [liveHostPort, setLiveHostPort] = useState("8787");
  const [liveHostError, setLiveHostError] = useState("");
  const [boardView, setBoardView] = useState(persistedBoardState.view);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredResourceSearchQuery = useDeferredValue(resourceSearchQuery);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const panRef = useRef(null);
  const boardViewRef = useRef(boardView);
  const suppressRestoreClickRef = useRef(null);
  const zRef = useRef(Math.max(20, ...persistedBoardState.notes.map((note) => Number(note.z) || 0)));

  const editionOptions = useMemo(() => (
    [...new Set(bestiary.map(monsterEdition))].sort(compareText)
  ), []);

  const crOptions = useMemo(() => (
    [...new Set(bestiary.map(formatCr))].sort((left, right) => crSortValue(left) - crSortValue(right) || compareText(left, right))
  ), []);

  const filteredMonsters = useMemo(() => {
    const query = normalizeSearch(deferredSearchQuery);
    return filterMonsterIndex(MONSTER_SEARCH_INDEX, {
      query,
      editionFilter,
      crFilter,
      sortField,
      sortDirection
    }).map(({ monster }) => monster);
  }, [crFilter, deferredSearchQuery, editionFilter, sortDirection, sortField]);

  const filteredResources = useMemo(() => {
    const kind = resourcePickerKind || "spell";
    const index = kind === "spell" ? SPELL_SEARCH_INDEX : ITEM_SEARCH_INDEX;
    const query = normalizeSearch(deferredResourceSearchQuery);
    return filterLibraryIndex(index, kind, {
      query,
      sortField: resourceSortField,
      sortDirection: resourceSortDirection
    }).map(({ entry }) => entry);
  }, [deferredResourceSearchQuery, resourcePickerKind, resourceSortDirection, resourceSortField]);

  useEffect(() => {
    if (!isPickerOpen) return;
    if (selectedMonster && filteredMonsters.includes(selectedMonster)) return;
    selectPickerMonster(filteredMonsters[0] || null);
  }, [filteredMonsters, isPickerOpen, selectedMonster]);

  useEffect(() => {
    if (!resourcePickerKind) return;
    const selected = resourcePickerKind === "spell" ? selectedSpell : selectedItem;
    if (selected && filteredResources.includes(selected)) return;
    if (resourcePickerKind === "spell") setSelectedSpell(filteredResources[0] || null);
    else setSelectedItem(filteredResources[0] || null);
  }, [filteredResources, resourcePickerKind, selectedItem, selectedSpell]);

  useEffect(() => {
    boardViewRef.current = boardView;
  }, [boardView]);

  useEffect(() => {
    saveDmBoardState(monsterNotes, boardView);
  }, [boardView, monsterNotes]);

  useEffect(() => {
    let disposed = false;
    const liveSheet = window.dndSheet?.liveSheet;
    if (!liveSheet) return undefined;

    liveSheet.getStatus()
      .then((status) => {
        if (disposed) return;
        setLiveServerStatus(status);
        if (status?.port) setLiveHostPort(String(status.port));
      })
      .catch(console.error);
    liveSheet.getPlayers()
      .then((players) => {
        if (!disposed) setLivePlayers(Array.isArray(players) ? players : []);
      })
      .catch(console.error);

    const unsubscribeStatus = liveSheet.onServerStatus((status) => {
      setLiveServerStatus(status || { running: false, port: 8787, addresses: [], playerCount: 0 });
      if (status?.port) setLiveHostPort(String(status.port));
      if (status?.running) setLiveHostError("");
    });
    const unsubscribeUpdated = liveSheet.onPlayerUpdated((player) => {
      if (!player?.playerId) return;
      setLivePlayers((players) => {
        const nextPlayers = players.filter((entry) => entry.playerId !== player.playerId);
        return [...nextPlayers, player].sort((left, right) => String(left.playerName || "").localeCompare(String(right.playerName || ""), undefined, { sensitivity: "base" }));
      });
    });
    const unsubscribeDisconnected = liveSheet.onPlayerDisconnected((player) => {
      if (!player?.playerId) return;
      setLivePlayers((players) => {
        if (player.removed) return players.filter((entry) => entry.playerId !== player.playerId);
        return players.map((entry) => entry.playerId === player.playerId ? { ...entry, ...player, connected: false } : entry);
      });
    });
    const unsubscribeRoll = liveSheet.onPlayerRoll?.((roll) => {
      if (!roll) return;
      setLiveRolls((rolls) => [{
        id: `${roll.receivedAt || Date.now()}-${roll.playerId || "player"}-${Math.random().toString(16).slice(2)}`,
        ...roll
      }, ...rolls].slice(0, 40));
    });

    return () => {
      disposed = true;
      unsubscribeStatus?.();
      unsubscribeUpdated?.();
      unsubscribeDisconnected?.();
      unsubscribeRoll?.();
    };
  }, []);

  async function returnToCharacterSheet() {
    setIsReturning(true);
    try {
      if (window.dndSheet?.openCharacterSheet) {
        await window.dndSheet.openCharacterSheet();
        return;
      }
      window.location.href = "./index.html";
    } catch (error) {
      console.error(error);
      try {
        window.location.href = "./index.html";
      } catch (_fallbackError) {
        setIsReturning(false);
      }
    }
  }

  async function startLiveHost() {
    const liveSheet = window.dndSheet?.liveSheet;
    if (!liveSheet) {
      setLiveHostError("Live sheet API unavailable in this renderer.");
      return;
    }
    setLiveHostError("");
    const result = await liveSheet.startServer(liveHostPort);
    if (!result?.ok) {
      setLiveHostError(result?.error || "No se pudo iniciar el host local.");
      if (result?.status) setLiveServerStatus(result.status);
      return;
    }
    setLiveServerStatus(result.status);
    if (result.status?.port) setLiveHostPort(String(result.status.port));
  }

  async function stopLiveHost() {
    const liveSheet = window.dndSheet?.liveSheet;
    if (!liveSheet) return;
    const result = await liveSheet.stopServer();
    if (result?.status) setLiveServerStatus(result.status);
  }

  async function kickLivePlayer(playerId) {
    const liveSheet = window.dndSheet?.liveSheet;
    if (!liveSheet) return;
    await liveSheet.kickPlayer(playerId);
  }

  function screenToBoardPoint(clientX, clientY, view = boardViewRef.current) {
    return {
      x: (clientX - view.x) / view.scale,
      y: (clientY - view.y) / view.scale
    };
  }

  function setBoardZoom(nextScale, origin = null) {
    const view = boardViewRef.current;
    const scale = clamp(nextScale, BOARD_MIN_ZOOM, BOARD_MAX_ZOOM);
    const zoomOrigin = origin || {
      x: (window.innerWidth || 1200) / 2,
      y: (window.innerHeight || 800) / 2
    };
    const boardPoint = screenToBoardPoint(zoomOrigin.x, zoomOrigin.y, view);
    setBoardView({
      x: zoomOrigin.x - boardPoint.x * scale,
      y: zoomOrigin.y - boardPoint.y * scale,
      scale
    });
  }

  function zoomBoardBy(delta, origin = null) {
    const view = boardViewRef.current;
    setBoardZoom(view.scale + delta, origin);
  }

  function resetBoardView() {
    setBoardView({ x: 0, y: 0, scale: 1 });
  }

  function openMonsterPicker(spawnPoint = null) {
    setNoteSpawnPoint(spawnPoint);
    setIsPickerOpen(true);
    setContextMenu(null);
    if (!selectedMonster && bestiary[0]) setSelectedMonster(bestiary[0]);
  }

  function openResourcePicker(kind, spawnPoint = null, { search = "", selectedEntry = null } = {}) {
    setNoteSpawnPoint(spawnPoint);
    setResourcePickerKind(kind);
    setResourceSearchQuery(search);
    setResourceSortField("name");
    setResourceSortDirection("asc");
    setContextMenu(null);
    if (kind === "spell") setSelectedSpell(selectedEntry || selectedSpell || spells[0] || null);
    if (kind === "item") setSelectedItem(selectedEntry || selectedItem || ITEM_LIBRARY[0] || null);
  }

  function selectPickerMonster(monster) {
    setSelectedMonster(monster);
    setPreviewRolls([]);
    setPreviewDicePanelOpen(false);
  }

  function addMonsterNote(monster) {
    addBoardNote({ kind: "monster", monster });
    setIsPickerOpen(false);
    setNoteSpawnPoint(null);
  }

  function addResourceNote(kind, entry, positionOverride = null) {
    addBoardNote({ kind, entry }, positionOverride);
    setResourcePickerKind(null);
    setNoteSpawnPoint(null);
  }

  function addCharacterResourceNote(kind, label, sourceNote, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const spawnPoint = clampBoardPoint({
      x: (sourceNote?.x || 96) + 36,
      y: (sourceNote?.y || 96) + 36
    }, NOTE_MIN_WIDTH, NOTE_MIN_HEIGHT);
    const entry = findResourceEntry(kind, label);
    if (entry) {
      addResourceNote(kind, entry, spawnPoint);
      return;
    }
    const query = String(label || "").trim();
    const normalizedQuery = normalizeSearch(query);
    const selectedEntry = filterLibraryIndex(kind === "spell" ? SPELL_SEARCH_INDEX : ITEM_SEARCH_INDEX, kind, {
      query: normalizedQuery,
      sortField: "name",
      sortDirection: "asc"
    })[0]?.entry || null;
    openResourcePicker(kind, spawnPoint, { search: query, selectedEntry });
  }

  function openCharacterCodeModal() {
    if (!contextMenu) return;
    setCharacterCodeSpawnPoint({ x: contextMenu.boardX, y: contextMenu.boardY });
    setCharacterCodeValue("");
    setCharacterCodeError("");
    setIsCharacterCodeModalOpen(true);
    setContextMenu(null);
  }

  function closeCharacterCodeModal() {
    setIsCharacterCodeModalOpen(false);
    setCharacterCodeValue("");
    setCharacterCodeError("");
    setCharacterCodeSpawnPoint(null);
  }

  async function addCharacterNoteFromCode() {
    const code = characterCodeValue.trim();
    if (!code) {
      setCharacterCodeError("Pega un codigo antes de continuar.");
      return;
    }
    const spawnPoint = characterCodeSpawnPoint;
    setContextMenu(null);
    try {
      const sheetData = await decodeCharacterSheetCode(code);
      addBoardNote({
        kind: "character",
        character: characterFromSheetData(sheetData),
        width: 520,
        height: 680
      }, spawnPoint);
      closeCharacterCodeModal();
    } catch (error) {
      console.error(error);
      setCharacterCodeError(error?.message || "No se pudo leer el codigo del personaje.");
    }
  }

  function addBoardNote(payload, positionOverride = null) {
    zRef.current += 1;
    const offset = monsterNotes.length % 6;
    const width = clamp(payload.width || NOTE_DEFAULT_WIDTH, NOTE_MIN_WIDTH, BOARD_WIDTH - BOARD_PADDING * 2);
    const height = clamp(payload.height || NOTE_DEFAULT_HEIGHT, NOTE_MIN_HEIGHT, BOARD_HEIGHT - BOARD_PADDING * 2);
    const spawnX = positionOverride?.x ?? noteSpawnPoint?.x ?? (96 + offset * 34);
    const spawnY = positionOverride?.y ?? noteSpawnPoint?.y ?? (96 + offset * 28);
    const spawnPoint = clampBoardPoint({ x: spawnX, y: spawnY }, width, height);
    const monster = payload.monster || null;
    const character = payload.character || null;
    const hpAverage = monster?.hp?.average ?? "";
    const characterHp = character?.hpMax || character?.hpCurrent || "";
    setMonsterNotes((notes) => [
      ...notes,
      {
        id: `${payload.kind}-${(monster || payload.entry || character)?.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: payload.kind,
        monster,
        character,
        entry: payload.entry || null,
        x: spawnPoint.x,
        y: spawnPoint.y,
        width,
        height,
        z: zRef.current,
        rolls: [],
        dicePanelOpen: false,
        minimized: false,
        hpCurrent: payload.hpCurrent ?? character?.hpCurrent ?? hpAverage,
        hpMax: payload.hpMax ?? characterHp ?? hpAverage
      }
    ]);
  }

  function duplicateNote(noteId) {
    const source = monsterNotes.find((note) => note.id === noteId);
    if (!source) return;
    addBoardNote({
      kind: source.kind,
      monster: source.monster,
      character: source.character,
      entry: source.entry,
      width: source.width,
      height: source.height,
      hpCurrent: source.hpCurrent,
      hpMax: source.hpMax
    }, { x: source.x + 28, y: source.y + 28 });
  }

  function closeNote(noteId) {
    setMonsterNotes((notes) => notes.filter((note) => note.id !== noteId));
  }

  function focusNote(noteId) {
    zRef.current += 1;
    setMonsterNotes((notes) => notes.map((note) => note.id === noteId ? { ...note, z: zRef.current } : note));
  }

  function minimizeNote(noteId) {
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? { ...note, minimized: true, dicePanelOpen: false } : note
    )));
  }

  function restoreNote(noteId) {
    if (suppressRestoreClickRef.current === noteId) return;
    focusNote(noteId);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? { ...note, minimized: false } : note
    )));
  }

  function updateNoteHp(noteId, field, value) {
    const numericValue = value === "" ? "" : Number(value);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? { ...note, [field === "max" ? "hpMax" : "hpCurrent"]: numericValue } : note
    )));
  }

  function rollNoteHp(noteId) {
    const note = monsterNotes.find((entry) => entry.id === noteId);
    const expression = note?.monster?.hp?.formula;
    if (!note || !expression) return;
    const roll = rollDiceExpression(expression);
    setMonsterNotes((notes) => notes.map((entry) => (
      entry.id === noteId ? {
        ...entry,
        hpCurrent: roll.total,
        hpMax: roll.total,
        dicePanelOpen: true,
        rolls: [{
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          label: "HP",
          roll
        }, ...(entry.rolls || [])].slice(0, 20)
      } : entry
    )));
  }

  function recordMonsterRoll(noteId, label, roll) {
    setMonsterNotes((notes) => notes.map((note) => {
      if (note.id !== noteId) return note;
      return {
        ...note,
        dicePanelOpen: true,
        rolls: [{
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          label,
          roll
        }, ...(note.rolls || [])].slice(0, 20)
      };
    }));
  }

  function toggleMonsterDicePanel(noteId) {
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? { ...note, dicePanelOpen: !note.dicePanelOpen } : note
    )));
  }

  function recordPreviewRoll(label, roll) {
    setPreviewDicePanelOpen(true);
    setPreviewRolls((rolls) => [{
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label,
      roll
    }, ...rolls].slice(0, 20));
  }

  function togglePreviewDicePanel() {
    setPreviewDicePanelOpen((open) => !open);
  }

  function openBoardContextMenu(event) {
    if (event.target?.closest?.("[data-dm-note='true'], [data-monster-picker='true'], [data-context-menu='true'], [data-character-code-modal='true'], [data-board-control='true']")) return;
    event.preventDefault();
    const viewportWidth = window.innerWidth || 1200;
    const viewportHeight = window.innerHeight || 800;
    const boardPoint = clampBoardPoint(screenToBoardPoint(event.clientX, event.clientY), NOTE_MIN_WIDTH, NOTE_MIN_HEIGHT);
    setContextMenu({
      x: clamp(event.clientX, 8, viewportWidth - 180),
      y: clamp(event.clientY, 8, viewportHeight - 176),
      boardX: boardPoint.x,
      boardY: boardPoint.y
    });
  }

  function closeBoardContextMenu(event) {
    if (!contextMenu) return;
    if (event.target?.closest?.("[data-context-menu='true']")) return;
    setContextMenu(null);
  }

  function openContextMonsterPicker() {
    if (!contextMenu) return;
    openMonsterPicker({ x: contextMenu.boardX, y: contextMenu.boardY });
  }

  function openContextResourcePicker(kind) {
    if (!contextMenu) return;
    openResourcePicker(kind, { x: contextMenu.boardX, y: contextMenu.boardY });
  }

  function shouldIgnoreBoardPointer(event) {
    return Boolean(event.target?.closest?.("[data-dm-note='true'], [data-monster-picker='true'], [data-context-menu='true'], [data-character-code-modal='true'], [data-board-control='true']"));
  }

  function startBoardPan(event) {
    if (event.button != null && event.button !== 0) return;
    if (dragRef.current || resizeRef.current || shouldIgnoreBoardPointer(event)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const view = boardViewRef.current;
    panRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: view.x,
      startY: view.y
    };
  }

  function handleBoardPointerDown(event) {
    closeBoardContextMenu(event);
    startBoardPan(event);
  }

  function handleBoardWheel(event) {
    if (shouldIgnoreBoardPointer(event)) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    zoomBoardBy(direction * BOARD_ZOOM_STEP, { x: event.clientX, y: event.clientY });
  }

  function startDrag(event, noteId) {
    if (event.button != null && event.button !== 0) return;
    if (resizeRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const note = monsterNotes.find((entry) => entry.id === noteId);
    if (!note) return;
    focusNote(noteId);
    dragRef.current = {
      noteId,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
      startNoteX: note.x,
      startNoteY: note.y,
      width: note.minimized ? clamp(note.width, 220, 340) : note.width,
      height: note.minimized ? 44 : note.height,
      scale: boardViewRef.current.scale
    };
  }

  function startResize(event, noteId, edge) {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    focusNote(noteId);
    const note = monsterNotes.find((entry) => entry.id === noteId);
    if (!note) return;
    resizeRef.current = {
      noteId,
      edge,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: note.width,
      startHeight: note.height,
      x: note.x,
      y: note.y,
      scale: boardViewRef.current.scale
    };
  }

  function updateDrag(event) {
    const resize = resizeRef.current;
    if (resize && resize.pointerId === event.pointerId) {
      const maxWidth = Math.max(NOTE_MIN_WIDTH, BOARD_WIDTH - resize.x - BOARD_PADDING);
      const maxHeight = Math.max(NOTE_MIN_HEIGHT, BOARD_HEIGHT - resize.y - BOARD_PADDING);
      const deltaX = (event.clientX - resize.startX) / resize.scale;
      const deltaY = (event.clientY - resize.startY) / resize.scale;
      const width = resize.edge === "right" || resize.edge === "corner"
        ? clamp(resize.startWidth + deltaX, NOTE_MIN_WIDTH, maxWidth)
        : resize.startWidth;
      const height = resize.edge === "bottom" || resize.edge === "corner"
        ? clamp(resize.startHeight + deltaY, NOTE_MIN_HEIGHT, maxHeight)
        : resize.startHeight;
      setMonsterNotes((notes) => notes.map((note) => (
        note.id === resize.noteId ? { ...note, width, height } : note
      )));
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      const pan = panRef.current;
      if (!pan || pan.pointerId !== event.pointerId) return;
      setBoardView((view) => ({
        ...view,
        x: pan.startX + event.clientX - pan.startClientX,
        y: pan.startY + event.clientY - pan.startClientY
      }));
      return;
    }
    if (Math.abs(event.clientX - drag.startClientX) > 4 || Math.abs(event.clientY - drag.startClientY) > 4) drag.moved = true;
    const deltaX = (event.clientX - drag.startClientX) / drag.scale;
    const deltaY = (event.clientY - drag.startClientY) / drag.scale;
    const nextPoint = clampBoardPoint({
      x: drag.startNoteX + deltaX,
      y: drag.startNoteY + deltaY
    }, drag.width, drag.height);
    const nextX = nextPoint.x;
    const nextY = nextPoint.y;
    setMonsterNotes((notes) => notes.map((note) => note.id === drag.noteId ? { ...note, x: nextX, y: nextY } : note));
  }

  function stopDrag(event) {
    if (dragRef.current?.pointerId === event.pointerId) {
      if (dragRef.current.moved) {
        const suppressedNoteId = dragRef.current.noteId;
        suppressRestoreClickRef.current = suppressedNoteId;
        setTimeout(() => {
          if (suppressRestoreClickRef.current === suppressedNoteId) suppressRestoreClickRef.current = null;
        }, 200);
      }
      dragRef.current = null;
    }
    if (resizeRef.current?.pointerId === event.pointerId) resizeRef.current = null;
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-200"
      onContextMenu={openBoardContextMenu}
      onPointerDown={handleBoardPointerDown}
      onPointerMove={updateDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onWheel={handleBoardWheel}
    >
      <div
        className="fixed left-4 top-4 z-40 flex gap-2"
        data-board-control="true"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          className="inline-flex h-10 items-center border border-neutral-700 bg-neutral-900 px-4 text-sm font-semibold text-neutral-100 shadow-sm transition hover:border-amber-500 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:cursor-wait disabled:opacity-70"
          type="button"
          onClick={returnToCharacterSheet}
          disabled={isReturning}
        >
          {isReturning ? "Volviendo..." : "Volver al character sheet"}
        </button>
      </div>
      <LivePlayersPanel
        status={liveServerStatus}
        port={liveHostPort}
        error={liveHostError}
        players={livePlayers}
        rolls={liveRolls}
        onPortChange={setLiveHostPort}
        onStart={startLiveHost}
        onStop={stopLiveHost}
        onKick={kickLivePlayer}
      />
      <div
        className="fixed bottom-4 left-4 z-40 flex items-center gap-1 border border-neutral-700 bg-neutral-900/95 p-1 text-sm text-neutral-100 shadow-2xl"
        data-board-control="true"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          className="h-8 w-8 border border-neutral-700 bg-neutral-950 font-bold hover:border-amber-500 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomBoardBy(-BOARD_ZOOM_STEP)}
        >
          -
        </button>
        <button
          className="h-8 min-w-16 border border-neutral-700 bg-neutral-950 px-2 text-xs font-bold hover:border-amber-500 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          type="button"
          aria-label="Reset board view"
          onClick={resetBoardView}
        >
          {Math.round(boardView.scale * 100)}%
        </button>
        <button
          className="h-8 w-8 border border-neutral-700 bg-neutral-950 font-bold hover:border-amber-500 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomBoardBy(BOARD_ZOOM_STEP)}
        >
          +
        </button>
      </div>

      <div
        className="absolute left-0 top-0"
        style={{
          width: BOARD_WIDTH,
          height: BOARD_HEIGHT,
          transform: `translate3d(${boardView.x}px, ${boardView.y}px, 0) scale(${boardView.scale})`,
          transformOrigin: "0 0"
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.10)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute inset-0 bg-neutral-950/60" />

        {monsterNotes.map((note) => (
          note.kind === "monster" ? (
            <MonsterNote
              key={note.id}
              note={note}
              onClose={closeNote}
              onFocus={() => focusNote(note.id)}
              onDragStart={startDrag}
              onRoll={recordMonsterRoll}
              onToggleDice={toggleMonsterDicePanel}
              onResizeStart={startResize}
              onMinimize={minimizeNote}
              onRestore={restoreNote}
              onDuplicate={duplicateNote}
              onHpChange={updateNoteHp}
              onRollHp={rollNoteHp}
            />
          ) : note.kind === "character" ? (
            <CharacterNote
              key={note.id}
              note={note}
              onClose={closeNote}
              onFocus={() => focusNote(note.id)}
              onDragStart={startDrag}
              onRoll={recordMonsterRoll}
              onToggleDice={toggleMonsterDicePanel}
              onResizeStart={startResize}
              onMinimize={minimizeNote}
              onRestore={restoreNote}
              onDuplicate={duplicateNote}
              onHpChange={updateNoteHp}
              onOpenResource={addCharacterResourceNote}
            />
          ) : (
            <ResourceNote
              key={note.id}
              note={note}
              onClose={closeNote}
              onFocus={() => focusNote(note.id)}
              onDragStart={startDrag}
              onRoll={recordMonsterRoll}
              onToggleDice={toggleMonsterDicePanel}
              onResizeStart={startResize}
              onMinimize={minimizeNote}
              onRestore={restoreNote}
              onDuplicate={duplicateNote}
            />
          )
        ))}
      </div>

      {!monsterNotes.length ? (
        <section
          className="absolute left-1/2 top-1/2 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 border border-neutral-700 bg-neutral-900/95 p-5 shadow-2xl"
          data-board-control="true"
        >
          <div className="border-b-2 border-amber-500 pb-2">
            <h1 className="font-serif text-2xl font-bold uppercase tracking-wide text-amber-500">DM Screen</h1>
            <p className="mt-1 text-sm italic text-neutral-400">Encounter board</p>
          </div>
          <div className="grid grid-cols-3 gap-2 py-4 text-center text-sm">
            <div className="border border-neutral-700 bg-neutral-950/70 p-3">
              <div className="text-[11px] font-bold uppercase text-amber-500">Bestiary</div>
              <div className="mt-1 font-semibold text-neutral-100">{bestiary.length}</div>
            </div>
            <div className="border border-neutral-700 bg-neutral-950/70 p-3">
              <div className="text-[11px] font-bold uppercase text-amber-500">Notes</div>
              <div className="mt-1 font-semibold text-neutral-100">0</div>
            </div>
            <div className="border border-neutral-700 bg-neutral-950/70 p-3">
              <div className="text-[11px] font-bold uppercase text-amber-500">Roller</div>
              <div className="mt-1 font-semibold text-sky-300">Ready</div>
            </div>
          </div>
        </section>
      ) : null}

      {contextMenu ? (
        <div
          className="fixed z-[10001] min-w-44 border border-neutral-700 bg-neutral-900 p-1 text-sm text-neutral-200 shadow-2xl"
          data-context-menu="true"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-amber-500 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
            type="button"
            onClick={openContextMonsterPicker}
          >
            <span>Add Monster</span>
            <span className="text-neutral-500">+</span>
          </button>
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-amber-500 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
            type="button"
            onClick={openCharacterCodeModal}
          >
            <span>Add Character Code</span>
            <span className="text-neutral-500">+</span>
          </button>
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-amber-500 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
            type="button"
            onClick={() => openContextResourcePicker("spell")}
          >
            <span>Add Spell</span>
            <span className="text-neutral-500">+</span>
          </button>
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-amber-500 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
            type="button"
            onClick={() => openContextResourcePicker("item")}
          >
            <span>Add Item</span>
            <span className="text-neutral-500">+</span>
          </button>
        </div>
      ) : null}

      <CharacterCodeModal
        isOpen={isCharacterCodeModalOpen}
        value={characterCodeValue}
        error={characterCodeError}
        onChange={(nextValue) => {
          setCharacterCodeValue(nextValue);
          if (characterCodeError) setCharacterCodeError("");
        }}
        onClose={closeCharacterCodeModal}
        onSubmit={addCharacterNoteFromCode}
      />

      <MonsterPicker
        isOpen={isPickerOpen}
        monsters={filteredMonsters}
        selectedMonster={selectedMonster}
        searchQuery={searchQuery}
        editionFilter={editionFilter}
        crFilter={crFilter}
        sortField={sortField}
        sortDirection={sortDirection}
        editionOptions={editionOptions}
        crOptions={crOptions}
        previewRolls={previewRolls}
        previewDicePanelOpen={previewDicePanelOpen}
        onSearch={setSearchQuery}
        onEditionFilter={setEditionFilter}
        onCrFilter={setCrFilter}
        onSortField={setSortField}
        onSortDirection={setSortDirection}
        onSelect={selectPickerMonster}
        onAdd={addMonsterNote}
        onPreviewRoll={recordPreviewRoll}
        onTogglePreviewDice={togglePreviewDicePanel}
        onClose={() => setIsPickerOpen(false)}
      />
      <ResourcePicker
        isOpen={Boolean(resourcePickerKind)}
        kind={resourcePickerKind || "spell"}
        entries={filteredResources}
        selectedEntry={resourcePickerKind === "item" ? selectedItem : selectedSpell}
        searchQuery={resourceSearchQuery}
        sortField={resourceSortField}
        sortDirection={resourceSortDirection}
        onSearch={setResourceSearchQuery}
        onSortField={setResourceSortField}
        onSortDirection={setResourceSortDirection}
        onSelect={(entry) => {
          if (resourcePickerKind === "item") setSelectedItem(entry);
          else setSelectedSpell(entry);
        }}
        onAdd={(entry) => addResourceNote(resourcePickerKind || "spell", entry)}
        onClose={() => setResourcePickerKind(null)}
      />
    </main>
  );
}

createRoot(document.getElementById("root")).render(<DmScreenApp />);
