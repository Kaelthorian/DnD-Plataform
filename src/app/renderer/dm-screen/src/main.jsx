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
const BOARD_MIN_ZOOM = 0.08;
const BOARD_MAX_ZOOM = 1.8;
const BOARD_ZOOM_STEP = 0.15;
const DM_BOARD_STORAGE_KEY = "dnd-dm-screen-board-v1";
const CHARACTER_SHEET_CODE_PREFIX = "DNDCS1";
const CHARACTER_SHEET_CODE_TYPE = "dnd-character-sheet";
const OBSIDIAN_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const OBSIDIAN_IMAGE_MIN_ZOOM = 25;
const OBSIDIAN_IMAGE_MAX_ZOOM = 500;
const OBSIDIAN_IMAGE_ZOOM_STEP = 15;

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
const HOMEBREW_MONSTER_DEFAULTS = {
  name: "Homebrew Monster",
  size: "M",
  type: "monstrosity",
  alignment: "Unaligned",
  ac: "12",
  hp: "10",
  speed: "30",
  cr: "1/4",
  str: "10",
  dex: "10",
  con: "10",
  int: "10",
  wis: "10",
  cha: "10",
  traits: "",
  actions: ""
};
const HOMEBREW_ITEM_DEFAULTS = {
  name: "Homebrew Item",
  type: "Gear",
  rarity: "common",
  source: "Homebrew",
  value: "",
  weight: "",
  damage: "",
  properties: "",
  entries: ""
};
const HOMEBREW_SPELL_DEFAULTS = {
  name: "Homebrew Spell",
  level: "1",
  school: "Evocation",
  source: "Homebrew",
  castingTime: "1 action",
  range: "60 feet",
  components: "V, S",
  duration: "Instantaneous",
  classes: "",
  description: ""
};
const FREE_DICE_TYPES = [
  { sides: 20, label: "d20" },
  { sides: 12, label: "d12" },
  { sides: 100, label: "d100" },
  { sides: 10, label: "d10" },
  { sides: 8, label: "d8" },
  { sides: 6, label: "d6" },
  { sides: 4, label: "d4" }
];

function createFreeDiceSelection() {
  return Object.fromEntries(FREE_DICE_TYPES.map(({ sides }) => [sides, 0]));
}

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

function spellMonsterSectionEntry(spell) {
  const metadata = spellMetadataRows(spell).map(([label, value]) => `${label}: ${value}`);
  const body = spellBodyParagraphs(spell);
  const footer = spellSourceLabel(spell) ? `Source: ${spellSourceLabel(spell)}` : "";
  return {
    name: spell?.name || "Spell",
    entries: [
      [
        formatSpellSubtitle(spell),
        ...metadata,
        ...body,
        footer
      ].filter(Boolean).join("\n\n")
    ]
  };
}

function itemMonsterSectionEntry(item) {
  const damage = formatItemDamage(item);
  const properties = itemPropertyLine(item);
  const valueWeight = [formatItemCurrency(item?.value), formatItemWeight(item?.weight)].filter(Boolean).join(", ");
  const lines = [
    itemTypeLabel(item),
    itemCategorySummary(item),
    damage ? `Damage: ${damage}` : "",
    properties ? `Properties: ${properties}` : "",
    valueWeight ? `Value/Weight: ${valueWeight}` : "",
    renderEntryText(item.entries),
    itemRulesFooter(item) ? `Source: ${itemRulesFooter(item)}` : ""
  ].filter(Boolean);
  return {
    name: item?.name || "Item",
    entries: [lines.join("\n\n") || "Item effect."]
  };
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

function itemPropertyLine(item) {
  const knownProperties = itemPropertyMetas(item).map((propertyMeta) => formatItemPropertyName(propertyMeta, item));
  const customProperties = Array.isArray(item?.homebrewProperties)
    ? item.homebrewProperties.map((property) => String(property || "").trim()).filter(Boolean)
    : [];
  return [...knownProperties, ...customProperties].filter(Boolean).join(", ");
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
  return typeName || item?.type || "Item";
}

function itemCategorySummary(item) {
  const categories = [];
  if (item?.weaponCategory) categories.push(`${titleCase(item.weaponCategory)} Weapon`);
  const typeName = itemTypeMeta(item)?.name || "";
  if (typeName && !categories.includes(typeName)) categories.push(typeName);
  if (!typeName && item?.type) categories.push(String(item.type));
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

function formatToHitBonus(value) {
  const source = String(value ?? "").trim();
  if (!source) return "";
  return signNumber(parseModifier(source, 0));
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

function noteDisplayName(note) {
  const titleOverride = String(note?.titleOverride || "").trim();
  if (titleOverride) return titleOverride;
  if (note?.kind === "monster") return note?.monster?.name || "Monster";
  if (note?.kind === "character") return note?.character?.name || "Character";
  if (note?.kind === "obsidian") return note?.obsidian?.title || note?.obsidian?.fileName || "Obsidian Note";
  if (note?.kind === "text") return note?.textTitle || "Text Note";
  return note?.entry?.name || (note?.kind === "spell" ? "Spell" : note?.kind === "item" ? "Item" : "Note");
}

function resolveRootNoteId(noteId, notes) {
  const byId = new Map((notes || []).map((note) => [note.id, note]));
  let currentId = noteId;
  let guard = 0;
  while (currentId && guard < 20) {
    const current = byId.get(currentId);
    if (!current?.parentNoteId) return current?.id || currentId;
    currentId = current.parentNoteId;
    guard += 1;
  }
  return currentId || noteId;
}

function noteTabIds(note) {
  return [note?.id, ...(Array.isArray(note?.tabNoteIds) ? note.tabNoteIds : [])].filter(Boolean);
}

function groupTabNotes(rootNote, notes) {
  const ids = new Set(noteTabIds(rootNote));
  return (notes || []).filter((note) => ids.has(note.id));
}

function isModifierEvent(value) {
  return Boolean(value && typeof value === "object" && (
    "shiftKey" in value ||
    "nativeEvent" in value ||
    "preventDefault" in value
  ));
}

function promoteTabToRootInCollection(notes, rootId, nextRootId) {
  const root = notes.find((note) => note.id === rootId);
  const nextRoot = notes.find((note) => note.id === nextRootId);
  if (!root || !nextRoot || rootId === nextRootId) return notes;
  const remainingIds = noteTabIds(root).filter((id) => id !== rootId && id !== nextRootId);
  const nextActiveTabId = root.activeTabId && root.activeTabId !== rootId && root.activeTabId !== nextRootId
    ? root.activeTabId
    : nextRootId;

  return notes.map((note) => {
    if (note.id === nextRootId) {
      return {
        ...note,
        parentNoteId: null,
        tabNoteIds: remainingIds,
        activeTabId: nextActiveTabId,
        x: root.x,
        y: root.y,
        width: root.width,
        height: root.height,
        z: root.z,
        minimized: root.minimized
      };
    }
    if (remainingIds.includes(note.id)) return { ...note, parentNoteId: nextRootId };
    return note;
  });
}

function closeSingleNoteInCollection(notes, noteId) {
  const rootId = resolveRootNoteId(noteId, notes);
  const root = notes.find((note) => note.id === rootId);
  if (!root) return notes;
  const groupedIds = noteTabIds(root);
  if (groupedIds.length <= 1) return notes.filter((note) => note.id !== rootId);

  if (noteId === rootId) {
    const promotedId = groupedIds.find((id) => id !== rootId);
    if (!promotedId) return notes.filter((note) => note.id !== rootId);
    const promotedNotes = promoteTabToRootInCollection(notes, rootId, promotedId);
    return promotedNotes.filter((note) => note.id !== rootId);
  }

  const fallbackActiveId = root.activeTabId === noteId
    ? (groupedIds.find((id) => id !== noteId && id !== rootId) || rootId)
    : root.activeTabId;

  return notes
    .filter((note) => note.id !== noteId)
    .map((note) => (
      note.id === rootId
        ? {
          ...note,
          tabNoteIds: (note.tabNoteIds || []).filter((id) => id !== noteId),
          activeTabId: fallbackActiveId
        }
        : note
    ));
}

function clampBoardPoint(point, width = 0, height = 0) {
  return {
    x: clamp(point.x, BOARD_PADDING, BOARD_WIDTH - width - BOARD_PADDING),
    y: clamp(point.y, BOARD_PADDING, BOARD_HEIGHT - height - BOARD_PADDING)
  };
}

function noteFrameRect(note) {
  const width = note?.minimized ? clamp(note.width, 220, 340) : note?.width || NOTE_DEFAULT_WIDTH;
  const height = note?.minimized ? 44 : note?.height || NOTE_DEFAULT_HEIGHT;
  return {
    x: Number(note?.x) || 0,
    y: Number(note?.y) || 0,
    width,
    height,
    right: (Number(note?.x) || 0) + width,
    bottom: (Number(note?.y) || 0) + height
  };
}

function normalizeRectFromPoints(start, end) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    right,
    bottom
  };
}

function rectsIntersect(left, right) {
  return left.x <= right.right
    && left.right >= right.x
    && left.y <= right.bottom
    && left.bottom >= right.y;
}

function cloneForBoardState(value) {
  return cloneJsonCompatibleValue(value);
}

function updateObjectPath(source, pathParts, value) {
  if (!Array.isArray(pathParts) || !pathParts.length) return source;
  const root = Array.isArray(source) ? source.slice() : { ...(source || {}) };
  let cursor = root;
  pathParts.forEach((part, index) => {
    if (index === pathParts.length - 1) {
      cursor[part] = value;
      return;
    }
    const nextPart = pathParts[index + 1];
    const currentValue = cursor[part];
    const nextValue = Array.isArray(currentValue)
      ? currentValue.slice()
      : currentValue && typeof currentValue === "object"
        ? { ...currentValue }
        : typeof nextPart === "number"
          ? []
          : {};
    cursor[part] = nextValue;
    cursor = nextValue;
  });
  return root;
}

function noteStorageSnapshot(note) {
  return {
    id: note.id,
    kind: note.kind,
    monsterRef: libraryRef(note.monster),
    monsterCustom: note.kind === "monster" && note.monsterCustom ? cloneForBoardState(note.monsterCustom) : null,
    entryRef: libraryRef(note.entry),
    entryCustom: (note.kind === "spell" || note.kind === "item") && note.entryCustom ? cloneForBoardState(note.entryCustom) : null,
    character: note.character || null,
    textTitle: note.kind === "text" ? note.textTitle || "" : "",
    textContent: note.kind === "text" ? note.textContent || "" : "",
    obsidian: note.kind === "obsidian" ? {
      relativePath: note.obsidian?.relativePath || "",
      fileName: note.obsidian?.fileName || "",
      title: note.obsidian?.title || "",
      vaultName: note.obsidian?.vaultName || ""
    } : null,
    titleOverride: note.titleOverride || "",
    parentNoteId: note.parentNoteId || null,
    tabNoteIds: Array.isArray(note.tabNoteIds) ? note.tabNoteIds.slice() : [],
    activeTabId: note.activeTabId || null,
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
  const monsterCustom = note.kind === "monster" && note.monsterCustom ? cloneForBoardState(note.monsterCustom) : null;
  const monster = note.kind === "monster" ? (monsterCustom || findLibraryEntryByRef("monster", note.monsterRef)) : null;
  const entryCustom = (note.kind === "spell" || note.kind === "item") && note.entryCustom ? cloneForBoardState(note.entryCustom) : null;
  const entry = note.kind === "spell" || note.kind === "item" ? (entryCustom || findLibraryEntryByRef(note.kind, note.entryRef)) : null;
  const character = note.kind === "character" && note.character ? note.character : null;
  const obsidian = note.kind === "obsidian" && note.obsidian?.relativePath
    ? {
      relativePath: String(note.obsidian.relativePath),
      fileName: String(note.obsidian.fileName || note.obsidian.relativePath.split("/").pop() || ""),
      title: String(note.obsidian.title || note.obsidian.fileName || "Obsidian Note"),
      vaultName: String(note.obsidian.vaultName || "")
    }
    : null;
  if (note.kind === "monster" && !monster) return null;
  if ((note.kind === "spell" || note.kind === "item") && !entry) return null;
  if (note.kind === "character" && !character) return null;
  if (note.kind === "obsidian" && !obsidian) return null;
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
    monsterCustom,
    character,
    entry,
    entryCustom,
    textTitle: typeof note.textTitle === "string" ? note.textTitle : "",
    textContent: typeof note.textContent === "string" ? note.textContent : "",
    obsidian,
    obsidianMarkdown: "",
    obsidianLoading: false,
    obsidianError: "",
    obsidianEditing: false,
    obsidianDraft: "",
    obsidianSaving: false,
    obsidianUpdatedAt: null,
    titleOverride: typeof note.titleOverride === "string" ? note.titleOverride : "",
    parentNoteId: note.parentNoteId ? String(note.parentNoteId) : null,
    tabNoteIds: Array.isArray(note.tabNoteIds) ? note.tabNoteIds.map((entry) => String(entry || "")).filter(Boolean) : [],
    activeTabId: note.activeTabId ? String(note.activeTabId) : null,
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

function homebrewTextSections(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([^:.-]{2,48})[:.-]\s*(.+)$/);
      return {
        name: match ? match[1].trim() : "Feature",
        entries: [match ? match[2].trim() : line]
      };
    });
}

function homebrewHpValue(value) {
  const text = String(value || "").trim();
  if (!text) return { average: 1 };
  const formulaMatch = text.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/i);
  const averageMatch = text.match(/\d+/);
  return {
    average: averageMatch ? Number.parseInt(averageMatch[0], 10) : undefined,
    formula: formulaMatch?.[1]?.replace(/\s+/g, "")
  };
}

function homebrewMonsterFromDraft(draft) {
  const numericAbility = (value) => Math.max(1, Math.min(30, Number.parseInt(value, 10) || 10));
  return {
    name: String(draft.name || HOMEBREW_MONSTER_DEFAULTS.name).trim() || HOMEBREW_MONSTER_DEFAULTS.name,
    source: "Homebrew",
    size: [String(draft.size || "M").trim().toUpperCase() || "M"],
    type: String(draft.type || "monstrosity").trim().toLowerCase() || "monstrosity",
    alignment: String(draft.alignment || "Unaligned").trim() || "Unaligned",
    ac: [Number.parseInt(draft.ac, 10) || 10],
    hp: homebrewHpValue(draft.hp),
    speed: { walk: Number.parseInt(draft.speed, 10) || 30 },
    cr: String(draft.cr || "0").trim() || "0",
    str: numericAbility(draft.str),
    dex: numericAbility(draft.dex),
    con: numericAbility(draft.con),
    int: numericAbility(draft.int),
    wis: numericAbility(draft.wis),
    cha: numericAbility(draft.cha),
    trait: homebrewTextSections(draft.traits),
    action: homebrewTextSections(draft.actions)
  };
}

function optionalNumber(value) {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const amount = Number(text.replace(/,/g, "."));
  return Number.isFinite(amount) ? amount : undefined;
}

function homebrewItemFromDraft(draft) {
  const entries = compactLines(draft.entries);
  const properties = String(draft.properties || "")
    .split(/[,;\n]+/)
    .map((property) => property.trim())
    .filter(Boolean);
  const type = String(draft.type || HOMEBREW_ITEM_DEFAULTS.type).trim() || HOMEBREW_ITEM_DEFAULTS.type;
  return {
    name: String(draft.name || HOMEBREW_ITEM_DEFAULTS.name).trim() || HOMEBREW_ITEM_DEFAULTS.name,
    type,
    rarity: String(draft.rarity || HOMEBREW_ITEM_DEFAULTS.rarity).trim() || HOMEBREW_ITEM_DEFAULTS.rarity,
    source: String(draft.source || HOMEBREW_ITEM_DEFAULTS.source).trim() || HOMEBREW_ITEM_DEFAULTS.source,
    value: optionalNumber(draft.value),
    weight: optionalNumber(draft.weight),
    dmg1: String(draft.damage || "").trim(),
    homebrewProperties: properties,
    entries: entries.length ? entries : ["Describe what this item does."],
    __homebrew: true
  };
}

function homebrewSpellFromDraft(draft) {
  const level = Number.parseInt(draft.level, 10);
  const safeLevel = Number.isFinite(level) ? clamp(level, 0, 9) : Number(HOMEBREW_SPELL_DEFAULTS.level);
  const source = String(draft.source || HOMEBREW_SPELL_DEFAULTS.source).trim() || HOMEBREW_SPELL_DEFAULTS.source;
  const school = String(draft.school || HOMEBREW_SPELL_DEFAULTS.school).trim() || HOMEBREW_SPELL_DEFAULTS.school;
  const description = compactParagraph(draft.description) || "Describe what this spell does.";
  return {
    name: String(draft.name || HOMEBREW_SPELL_DEFAULTS.name).trim() || HOMEBREW_SPELL_DEFAULTS.name,
    level: safeLevel,
    castingTime: String(draft.castingTime || HOMEBREW_SPELL_DEFAULTS.castingTime).trim(),
    range: String(draft.range || HOMEBREW_SPELL_DEFAULTS.range).trim(),
    components: String(draft.components || HOMEBREW_SPELL_DEFAULTS.components).trim(),
    duration: String(draft.duration || HOMEBREW_SPELL_DEFAULTS.duration).trim(),
    classes: String(draft.classes || "")
      .split(/[,;\n]+/)
      .map((className) => className.trim())
      .filter(Boolean),
    description: [
      `Source: ${source}. Level: ${safeLevel}. School: ${school}.`,
      description
    ].join("\n\n"),
    __homebrew: true
  };
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
    .replace(/\{@hit ([^}]+)\}/g, (_match, bonus) => `${formatToHitBonus(bonus)} to hit`)
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
  if (typeof value === "string") return value;
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
        attack ? `${formatToHitBonus(attack)} to hit.` : "",
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

function countSelectedDice(selection) {
  return FREE_DICE_TYPES.reduce((total, { sides }) => total + Number(selection?.[sides] || 0), 0);
}

function formatFreeDiceExpression(selection) {
  return FREE_DICE_TYPES
    .map(({ sides }) => {
      const count = Number(selection?.[sides] || 0);
      return count > 0 ? `${count}d${sides}` : "";
    })
    .filter(Boolean)
    .join(" + ");
}

function DiceGlyph({ sides, className = "h-10 w-10" }) {
  const props = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.1,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  switch (sides) {
    case 20:
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <polygon {...props} points="24 5 40 15 36 35 24 43 12 35 8 15" />
          <polyline {...props} points="24 5 17 19 24 27 31 19 24 5" />
          <polyline {...props} points="8 15 17 19 12 35" />
          <polyline {...props} points="40 15 31 19 36 35" />
          <polyline {...props} points="12 35 24 27 36 35" />
          <line {...props} x1="17" y1="19" x2="31" y2="19" />
        </svg>
      );
    case 12:
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <polygon {...props} points="24 5 35 9 41 19 38 32 24 43 10 32 7 19 13 9" />
          <polyline {...props} points="13 9 18 19 30 19 35 9" />
          <polyline {...props} points="7 19 18 19 16 35" />
          <polyline {...props} points="41 19 30 19 32 35" />
          <polyline {...props} points="16 35 24 27 32 35" />
          <line {...props} x1="24" y1="5" x2="24" y2="19" />
        </svg>
      );
    case 100:
      return (
        <svg viewBox="0 0 56 48" className={className} aria-hidden="true">
          <g transform="translate(3 2)">
            <polygon {...props} points="16 4 26 14 22 32 10 40 2 27 5 12" />
            <polyline {...props} points="5 12 16 18 26 14" />
            <polyline {...props} points="10 40 16 18 22 32" />
          </g>
          <g transform="translate(24 2)">
            <polygon {...props} points="16 4 26 14 22 32 10 40 2 27 5 12" />
            <polyline {...props} points="5 12 16 18 26 14" />
            <polyline {...props} points="10 40 16 18 22 32" />
          </g>
        </svg>
      );
    case 10:
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <polygon {...props} points="24 5 37 17 31 34 24 42 17 34 11 17" />
          <polyline {...props} points="11 17 24 23 37 17" />
          <polyline {...props} points="17 34 24 23 31 34" />
          <line {...props} x1="24" y1="5" x2="24" y2="23" />
        </svg>
      );
    case 8:
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <polygon {...props} points="24 4 38 18 24 31 10 18" />
          <polygon {...props} points="24 31 38 18 24 44 10 18" />
          <line {...props} x1="24" y1="4" x2="24" y2="44" />
        </svg>
      );
    case 6:
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <polygon {...props} points="16 10 29 10 29 25 16 25" />
          <polygon {...props} points="29 10 38 16 38 31 29 25" />
          <polygon {...props} points="16 10 25 16 38 16 29 10" />
          <polyline {...props} points="16 25 25 31 38 31" />
          <line {...props} x1="25" y1="16" x2="25" y2="31" />
        </svg>
      );
    case 4:
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <polygon {...props} points="24 5 36 24 24 43 12 24" />
          <line {...props} x1="24" y1="5" x2="24" y2="43" />
          <line {...props} x1="12" y1="24" x2="36" y2="24" />
        </svg>
      );
    default:
      return null;
  }
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
      onClick={(event) => {
        if (event.ctrlKey || event.metaKey) return;
        onRoll?.(event);
      }}
    >
      {children}
    </button>
  );
}

function CtrlEditableText({
  value,
  className = "",
  inputClassName = "",
  multiline = false,
  title = "Ctrl+click para editar",
  onCommit,
  children
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));

  useEffect(() => {
    if (!editing) setDraft(String(value ?? ""));
  }, [editing, value]);

  function commit() {
    setEditing(false);
    onCommit?.(draft);
  }

  if (editing) {
    const sharedProps = {
      className: inputClassName || "w-full border border-amber-500 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:outline-none",
      value: draft,
      autoFocus: true,
      onPointerDown: (event) => event.stopPropagation(),
      onChange: (event) => setDraft(event.target.value),
      onBlur: commit,
      onKeyDown: (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          commit();
        }
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          commit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setDraft(String(value ?? ""));
          setEditing(false);
        }
      }
    };
    return multiline ? (
      <textarea {...sharedProps} className={`${sharedProps.className} min-h-24 resize-y`} />
    ) : (
      <input {...sharedProps} type="text" />
    );
  }

  return (
    <span
      className={`${className} ${onCommit ? "cursor-text rounded-sm hover:bg-amber-500/10" : ""}`}
      title={onCommit ? title : undefined}
      onPointerDown={(event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.stopPropagation();
      }}
      onClick={(event) => {
        if (!onCommit || (!event.ctrlKey && !event.metaKey)) return;
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
      }}
    >
      {children ?? value}
    </span>
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

function AbilityCell({ monster, ability, onRoll, onEdit = null }) {
  const score = monster[ability] ?? "-";
  const mod = abilityModifier(score);
  const save = parseModifier(monster.save?.[ability], mod);
  const label = ABILITY_LABELS[ability];

  return (
    <div className="grid grid-cols-[34px_1fr_42px_42px] items-center bg-neutral-800 px-1 py-0.5 text-sm">
      <span className="font-bold text-neutral-300">{label}</span>
      <CtrlEditableText value={score} className="text-neutral-300" onCommit={onEdit ? (value) => onEdit([ability], value) : null}>
        {score}
      </CtrlEditableText>
      <RollButton title={`Tirar ${label} mod d20${signNumber(mod)}`} onRoll={() => onRoll(`${label} mod`, rollD20(mod))}>
        {signNumber(mod)}
      </RollButton>
      <CtrlEditableText value={monster.save?.[ability] ?? signNumber(save)} className="text-center" onCommit={onEdit ? (value) => onEdit(["save", ability], value) : null}>
        <RollButton title={`Tirar ${label} save d20${signNumber(save)}`} onRoll={() => onRoll(`${label} save`, rollD20(save))}>
          {signNumber(save)}
        </RollButton>
      </CtrlEditableText>
    </div>
  );
}

function MonsterActionLine({ action, onRoll, onEditName = null, onEditText = null }) {
  const entries = Array.isArray(action.entries) ? action.entries : [action.entries].filter(Boolean);
  const text = entries.map(renderEntryText).filter(Boolean).join(" ");

  return (
    <p className="leading-snug">
      <CtrlEditableText value={action.name || "Action"} className="font-bold italic text-neutral-200" onCommit={onEditName}>
        {action.name || "Action"}
      </CtrlEditableText>
      <span className="font-bold italic text-neutral-200">.</span>{" "}
      <CtrlEditableText value={text} multiline onCommit={onEditText}>
        <InteractiveRulesText text={text} context={action.name || "Action"} onRoll={onRoll} />
      </CtrlEditableText>
    </p>
  );
}

function MonsterTextSection({ title, items, onRoll, interactive = false, onEdit = null, pathKey = "", dropNoteId = "" }) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length && !onEdit) return null;
  const singularTitle = title.replace(/s$/i, "");

  function addSectionItem() {
    if (!onEdit || !pathKey) return;
    const nextItem = {
      name: `New ${singularTitle}`,
      entries: [interactive ? "Melee or Ranged Weapon Attack: +0 to hit. Hit: 1 damage." : "New text."]
    };
    onEdit([pathKey, list.length], nextItem);
  }

  function removeSectionItem(index) {
    if (!onEdit || !pathKey) return;
    onEdit([pathKey], list.filter((_item, itemIndex) => itemIndex !== index));
  }

  return (
    <section
      className="mt-2"
      data-monster-section-drop={onEdit && dropNoteId && pathKey ? "true" : undefined}
      data-drop-note-id={dropNoteId || undefined}
      data-drop-section={pathKey || undefined}
    >
      <div className="flex items-center justify-between gap-2 border-b border-amber-500 pb-0.5">
        <h3 className="font-serif text-lg uppercase leading-none text-amber-500">{title}</h3>
        {onEdit ? (
          <button
            className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-400 hover:border-amber-500 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={addSectionItem}
          >
            Add {singularTitle}
          </button>
        ) : null}
      </div>
      <div className="mt-1 space-y-1 text-sm text-neutral-300">
        {list.length ? list.map((item, index) => (
          <div key={`${title}-${item.name || index}`} className="group grid grid-cols-[1fr_auto] gap-2">
            <div className="min-w-0">
              {interactive ? (
                <MonsterActionLine
                  action={item}
                  onRoll={onRoll}
                  onEditName={onEdit ? (value) => onEdit([pathKey, index, "name"], value) : null}
                  onEditText={onEdit ? (value) => onEdit([pathKey, index, "entries"], [value]) : null}
                />
              ) : (
                <p className="leading-snug">
                  <CtrlEditableText value={item.name || title} className="font-bold italic text-neutral-200" onCommit={onEdit ? (value) => onEdit([pathKey, index, "name"], value) : null}>
                    {item.name || title}
                  </CtrlEditableText>
                  <span className="font-bold italic text-neutral-200">.</span>{" "}
                  <CtrlEditableText value={renderEntryText(item.entries || item)} multiline onCommit={onEdit ? (value) => onEdit([pathKey, index, "entries"], [value]) : null}>
                    {stripMarkdownEmphasis(shortText(item.entries, 360))}
                  </CtrlEditableText>
                </p>
              )}
            </div>
            {onEdit ? (
              <button
                className="h-6 border border-neutral-800 bg-neutral-950 px-2 text-[10px] font-bold uppercase tracking-wide text-red-300 opacity-60 hover:border-red-500 hover:bg-red-950/40 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                type="button"
                title={`Remove ${item.name || singularTitle}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => removeSectionItem(index)}
              >
                Remove
              </button>
            ) : null}
          </div>
        )) : (
          <p className="text-xs italic text-neutral-500">No {title.toLowerCase()} yet.</p>
        )}
      </div>
    </section>
  );
}

function MonsterStatBlockHeader({ monster, title = "", onRename = null, onDragStart = null, onMinimize = null, onDuplicate = null, onClose = null, onMonsterEdit = null }) {
  return (
    <header
      className={`flex items-start justify-between gap-3 border-b-2 border-amber-500 bg-neutral-900 px-3 py-2 ${onDragStart ? "cursor-move" : ""}`}
      onPointerDown={onDragStart}
    >
      <div>
        <EditableNoteTitle
          title={title || monster.name}
          className="font-serif text-left text-xl font-bold uppercase leading-none tracking-wide text-amber-500"
          inputClassName="w-full border border-amber-500 bg-neutral-950 px-2 py-1 font-serif text-xl font-bold uppercase leading-none tracking-wide text-amber-500 focus:outline-none"
          onRename={onRename}
        />
        <p className="mt-2 text-sm italic text-neutral-300">
          <CtrlEditableText value={monster.size || ""} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["size"], value) : null}>{formatSize(monster)}</CtrlEditableText>{" "}
          <CtrlEditableText value={formatType(monster)} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["type"], value) : null}>{formatType(monster)}</CtrlEditableText>
          {", "}
          <CtrlEditableText value={formatAlignment(monster)} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["alignment"], value) : null}>{formatAlignment(monster)}</CtrlEditableText>
        </p>
      </div>
      <div className="flex items-start gap-3">
        <div className="text-right font-serif text-xl uppercase leading-none text-amber-500">
          <CtrlEditableText value={monsterEdition(monster)} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["source"], value) : null}>{monsterEdition(monster)}</CtrlEditableText>
          {monster.page ? (
            <span className="ml-1 align-baseline text-xs text-neutral-300">
              p<CtrlEditableText value={monster.page} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["page"], value) : null}>{monster.page}</CtrlEditableText>
            </span>
          ) : null}
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
              aria-label={`Cerrar ${monster.name}. Shift+click cierra todo el grupo`}
              title="Click cierra este item. Shift+click cierra todo el grupo."
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => onClose(event)}
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
  noteId = "",
  monster,
  onRoll,
  className = "max-h-[min(66vh,600px)] overflow-auto",
  hpState = null,
  onHpChange = null,
  onRollHp = null,
  onMonsterEdit = null
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
          <p>
            <strong className="text-neutral-200">AC</strong>{" "}
            <CtrlEditableText value={formatAc(monster)} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["ac"], value) : null}>
              {formatAc(monster)}
            </CtrlEditableText>
          </p>
          {hpState ? (
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-neutral-200">HP</strong>
              <CtrlEditableText value={monster.hp?.formula || formatHp(monster)} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["hp", "formula"], value) : null}>
                <button
                  className="rounded-sm px-0.5 font-semibold text-sky-300 transition hover:bg-sky-300/15 hover:text-sky-100 focus:outline-none focus:ring-1 focus:ring-sky-300"
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    if (event.ctrlKey || event.metaKey) return;
                    onRollHp?.();
                  }}
                >
                  {monster.hp?.formula || formatHp(monster)}
                </button>
              </CtrlEditableText>
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
            <p>
              <strong className="text-neutral-200">HP</strong>{" "}
              <CtrlEditableText value={formatHp(monster)} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["hp"], value) : null}>
                {formatHp(monster)}
              </CtrlEditableText>
            </p>
          )}
          <p>
            <strong className="text-neutral-200">Speed</strong>{" "}
            <CtrlEditableText value={formatSpeedCompact(monster)} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["speed"], value) : null}>
              {formatSpeedCompact(monster)}
            </CtrlEditableText>
          </p>
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
        {["str", "dex", "con"].map((ability) => <AbilityCell key={ability} monster={monster} ability={ability} onRoll={onRoll} onEdit={onMonsterEdit} />)}
      </div>
      <div className="mt-1 grid gap-1 sm:grid-cols-3">
        {["int", "wis", "cha"].map((ability) => <AbilityCell key={ability} monster={monster} ability={ability} onRoll={onRoll} onEdit={onMonsterEdit} />)}
      </div>

      {resistances ? (
        <p className="mt-2 leading-snug"><strong className="text-neutral-200">Damage</strong>{" "}
          <CtrlEditableText value={resistances} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["resist"], value) : null}>{resistances}</CtrlEditableText>
        </p>
      ) : null}
      {immunities ? <p className="leading-snug"><strong className="text-neutral-200">Immunities</strong> <CtrlEditableText value={immunities} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["conditionImmune"], value) : null}>{immunities}</CtrlEditableText></p> : null}
      {formatKeyValueMap(monster.skill) ? <p className="leading-snug"><strong className="text-neutral-200">Skills</strong> <CtrlEditableText value={formatKeyValueMap(monster.skill)} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["skill"], value) : null}>{formatKeyValueMap(monster.skill)}</CtrlEditableText></p> : null}
      {senses ? <p className="leading-snug"><strong className="text-neutral-200">Senses</strong> <CtrlEditableText value={senses} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["senses"], value) : null}>{senses}</CtrlEditableText></p> : null}
      <p className="leading-snug"><strong className="text-neutral-200">Languages</strong> <CtrlEditableText value={languages} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["languages"], value) : null}>{languages}</CtrlEditableText></p>
      <p className="leading-snug"><strong className="text-neutral-200">CR</strong> <CtrlEditableText value={formatCr(monster)} onCommit={onMonsterEdit ? (value) => onMonsterEdit(["cr"], value) : null}>{formatCr(monster)}</CtrlEditableText> (XP {xp})</p>

      <MonsterTextSection title="Traits" items={monster.trait} onRoll={onRoll} onEdit={onMonsterEdit} pathKey="trait" dropNoteId={noteId} />
      <MonsterTextSection title="Actions" items={monster.action} onRoll={onRoll} interactive onEdit={onMonsterEdit} pathKey="action" dropNoteId={noteId} />
      <MonsterTextSection title="Bonus Actions" items={monster.bonus} onRoll={onRoll} interactive onEdit={onMonsterEdit} pathKey="bonus" dropNoteId={noteId} />
      <MonsterTextSection title="Reactions" items={monster.reaction} onRoll={onRoll} interactive onEdit={onMonsterEdit} pathKey="reaction" dropNoteId={noteId} />

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

function GlobalDiceTray({
  isOpen,
  selection,
  rolls,
  onToggle,
  onClose,
  onAddDie,
  onRemoveDie,
  onResetSelection,
  onClearRolls,
  onRoll
}) {
  const shellRef = useRef(null);
  const latestRoll = rolls?.[0] || null;
  const selectedDiceCount = countSelectedDice(selection);
  const expression = formatFreeDiceExpression(selection);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (shellRef.current?.contains(event.target)) return;
      onClose();
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      ref={shellRef}
      className="fixed bottom-20 left-4 z-50 flex flex-col items-start gap-3"
      data-board-control="true"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {isOpen ? (
        <section className="w-[min(328px,calc(100vw-20px))] overflow-hidden rounded-[18px] border border-neutral-700/80 bg-[radial-gradient(circle_at_top,rgba(64,64,64,0.95),rgba(18,18,20,0.97)_58%)] text-neutral-100 shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur">
          <header className="flex items-start justify-between border-b border-neutral-700/80 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-neutral-200">Roll Dice</p>
              <p className="mt-1 text-xs text-neutral-500">
                {expression || "Hace click en los dados para armar la tirada."}
              </p>
            </div>
            <button
              className="text-3xl leading-none text-neutral-400 transition hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/60"
              type="button"
              aria-label="Cerrar roller"
              onClick={onClose}
            >
              ×
            </button>
          </header>

          <div className="border-b border-neutral-700/80 px-4 py-4">
            <div className="rounded-2xl border border-neutral-800 bg-black/20 px-4 py-3">
              {latestRoll ? (
                <>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-amber-400/90">Last Roll</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-200">{latestRoll.roll.expression}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">Total</p>
                      <p className="text-3xl font-black leading-none text-red-500">{latestRoll.roll.total}</p>
                    </div>
                  </div>
                  <p className="mt-3 break-words text-xs text-neutral-400">{latestRoll.roll.detail}</p>
                </>
              ) : (
                <div className="py-3 text-sm text-neutral-500">No hay tiradas todavia.</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-x-2 gap-y-3 px-4 py-5">
            {FREE_DICE_TYPES.map(({ sides, label }) => {
              const count = Number(selection?.[sides] || 0);
              const isActive = count > 0;
              return (
                <button
                  key={sides}
                  className={`relative flex min-h-[82px] flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center transition ${
                    isActive
                      ? "border-neutral-100 bg-neutral-300 text-neutral-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]"
                      : "border-transparent bg-transparent text-neutral-100 hover:bg-white/5"
                  }`}
                  type="button"
                  title={`${label}. Click suma, click derecho resta.`}
                  onClick={() => onAddDie(sides)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    onRemoveDie(sides);
                  }}
                >
                  {count ? (
                    <span className="absolute left-1 top-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-neutral-950 px-1 text-[11px] font-black leading-none text-white">
                      {count}
                    </span>
                  ) : null}
                  <DiceGlyph sides={sides} className="h-11 w-11" />
                  <span className="mt-1 text-[1.05rem] font-black leading-none">{label}</span>
                </button>
              );
            })}
          </div>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-xl bg-neutral-300 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-neutral-900 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-200/70 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-500"
                type="button"
                onClick={onResetSelection}
                disabled={!selectedDiceCount}
              >
                Reset
              </button>
              <button
                className="rounded-xl bg-red-800 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/70 disabled:cursor-not-allowed disabled:bg-red-950 disabled:text-red-300/45"
                type="button"
                onClick={onRoll}
                disabled={!selectedDiceCount}
              >
                Roll
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                {selectedDiceCount ? `${selectedDiceCount} dados seleccionados` : "Sin seleccion"}
              </div>
              <button
                className="text-sm font-black uppercase tracking-[0.12em] text-amber-400 transition hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:cursor-not-allowed disabled:text-neutral-600"
                type="button"
                onClick={onClearRolls}
                disabled={!rolls.length}
              >
                Clear Dice
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <button
        className="relative inline-flex h-14 w-14 items-center justify-center rounded-full border border-red-400/70 bg-red-700 text-white shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300/70"
        type="button"
        aria-label={isOpen ? "Cerrar menu de dados" : "Abrir menu de dados"}
        onClick={onToggle}
      >
        <DiceGlyph sides={20} className="h-8 w-8" />
        {selectedDiceCount ? (
          <span className="absolute -right-1 -top-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-neutral-950 bg-white px-1 text-[11px] font-black leading-none text-neutral-950">
            {selectedDiceCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function EditableNoteTitle({ title, className = "", inputClassName = "", onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [editing, title]);

  function commitRename() {
    setEditing(false);
    onRename?.(draft);
  }

  if (editing) {
    return (
      <input
        className={inputClassName}
        type="text"
        value={draft}
        autoFocus
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitRename}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitRename();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(title);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      className={className}
      type="button"
      title="Editar titulo"
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
      onClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
    >
      {title}
    </button>
  );
}

function NoteTabBar({ notes, activeTabId, onSelectTab, onCloseTab, onStartTabDrag }) {
  if (!Array.isArray(notes) || notes.length < 2) return null;
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-neutral-800 bg-neutral-950/90 px-2 py-1.5">
      {notes.map((note) => {
        const isActive = note.id === activeTabId;
        return (
          <div
            key={note.id}
            className={`flex max-w-44 shrink-0 items-center truncate border px-2 py-1 text-xs font-semibold transition ${
              isActive
                ? "border-amber-500 bg-amber-500/10 text-amber-200"
                : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
            }`}
          >
            <button
              className="max-w-28 truncate align-middle"
              type="button"
              onPointerDown={(event) => {
                event.stopPropagation();
                onStartTabDrag?.(event, note.id);
              }}
              onClick={() => onSelectTab(note.id)}
              title={noteDisplayName(note)}
            >
              {noteDisplayName(note)}
            </button>
            <button
              className="ml-2 align-middle text-[10px] text-neutral-500 hover:text-red-300"
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => onCloseTab?.(note.id, event)}
              title={`Cerrar ${noteDisplayName(note)}`}
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MonsterNote({
  note,
  shellNote = null,
  actionNoteId = null,
  tabBar = null,
  isDropTarget = false,
  onRename,
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
  onRollHp,
  onMonsterEdit
}) {
  const frameNote = shellNote || note;
  const frameNoteId = frameNote.id;
  const noteActionId = actionNoteId || note.id;

  function addRoll(label, roll) {
    onRoll(noteActionId, label, roll);
  }

  if (frameNote.minimized) {
    return (
      <article
        className={`absolute flex h-11 cursor-move items-center justify-between gap-3 overflow-hidden border bg-neutral-900 px-3 text-neutral-300 shadow-2xl ${isDropTarget ? "border-sky-300 ring-2 ring-sky-300/60" : "border-amber-500"}`}
        data-dm-note="true"
        style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: clamp(frameNote.width, 220, 340) }}
        onPointerDown={onFocus}
      >
        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onPointerDown={(event) => onDragStart(event, frameNoteId)}
          onClick={() => onRestore(frameNoteId)}
          title={`Restaurar ${noteDisplayName(note)}`}
        >
          <span className="block truncate font-serif text-sm font-bold uppercase tracking-wide text-amber-500">{noteDisplayName(note)}</span>
          <span className="block truncate text-[11px] text-neutral-500">CR {formatCr(note.monster)} | {monsterEdition(note.monster)}</span>
        </button>
        <button
          className="h-7 w-7 shrink-0 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
          type="button"
          aria-label={`Cerrar ${noteDisplayName(note)}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => onClose(noteActionId, event)}
        >
          X
        </button>
      </article>
    );
  }

  return (
    <article
      className={`absolute flex overflow-hidden border bg-neutral-900 text-neutral-300 shadow-2xl ${isDropTarget ? "border-sky-300 ring-2 ring-sky-300/60" : "border-neutral-950"}`}
      data-dm-note="true"
      style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: frameNote.width, height: frameNote.height, flexDirection: "column" }}
      onPointerDown={onFocus}
    >
      <MonsterStatBlockHeader
        monster={note.monster}
        title={noteDisplayName(note)}
        onRename={(value) => onRename?.(noteActionId, value)}
        onMonsterEdit={(path, value) => onMonsterEdit?.(noteActionId, path, value)}
        onDragStart={(event) => onDragStart(event, frameNoteId)}
        onMinimize={() => onMinimize(frameNoteId)}
        onDuplicate={() => onDuplicate(noteActionId)}
        onClose={(event) => onClose(noteActionId, event)}
      />
      {tabBar}
      <MonsterStatBlockBody
        noteId={noteActionId}
        monster={note.monster}
        onRoll={addRoll}
        className="min-h-0 flex-1 overflow-auto"
        hpState={{ current: note.hpCurrent, max: note.hpMax }}
        onHpChange={(field, value) => onHpChange(noteActionId, field, value)}
        onRollHp={() => onRollHp(noteActionId)}
        onMonsterEdit={(path, value) => onMonsterEdit?.(noteActionId, path, value)}
      />
      <MonsterRollPanel note={note} onToggle={onToggleDice} onResizeCorner={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="right" className="right-0 top-8 h-[calc(100%-40px)] w-2 cursor-ew-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="bottom" className="bottom-0 left-0 h-2 w-[calc(100%-8px)] cursor-ns-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
    </article>
  );
}

function ResourceNote({
  note,
  shellNote = null,
  actionNoteId = null,
  tabBar = null,
  isDropTarget = false,
  onRename,
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
  const itemPropertiesLine = isSpell ? "" : itemPropertyLine(entry);
  const itemMasteryLine = isSpell ? "" : itemMasteryMetas(entry).map((masteryMeta) => masteryMeta?.name).filter(Boolean).join(", ");
  const itemValueWeightLine = isSpell ? "" : [formatItemCurrency(entry?.value), formatItemWeight(entry?.weight)].filter(Boolean).join(", ");
  const itemFooter = isSpell ? "" : itemRulesFooter(entry);
  const frameNote = shellNote || note;
  const frameNoteId = frameNote.id;
  const noteActionId = actionNoteId || note.id;

  function addRoll(label, roll) {
    onRoll(noteActionId, label, roll);
  }

  if (frameNote.minimized) {
    return (
      <article
        className={`absolute flex h-11 cursor-move items-center justify-between gap-3 overflow-hidden border bg-neutral-900 px-3 text-neutral-300 shadow-2xl ${isDropTarget ? "border-sky-300 ring-2 ring-sky-300/60" : "border-amber-500"}`}
        data-dm-note="true"
        style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: clamp(frameNote.width, 220, 340) }}
        onPointerDown={onFocus}
      >
        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onPointerDown={(event) => onDragStart(event, frameNoteId)}
          onClick={() => onRestore(frameNoteId)}
          title={`Restaurar ${noteDisplayName(note)}`}
        >
          <span className="block truncate font-serif text-sm font-bold uppercase tracking-wide text-amber-500">{noteDisplayName(note)}</span>
          <span className="block truncate text-[11px] text-neutral-500">{isSpell ? spellSubtitle : itemCategoryLine || itemPrimaryLabel}</span>
        </button>
        <button
          className="h-7 w-7 shrink-0 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
          type="button"
          aria-label={`Cerrar ${noteDisplayName(note)}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => onClose(noteActionId, event)}
        >
          X
        </button>
      </article>
    );
  }

  return (
    <article
      className={`absolute flex overflow-hidden border bg-neutral-900 text-neutral-300 shadow-2xl ${isDropTarget ? "border-sky-300 ring-2 ring-sky-300/60" : "border-neutral-950"}`}
      data-dm-note="true"
      style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: frameNote.width, height: frameNote.height, flexDirection: "column" }}
      onPointerDown={onFocus}
    >
      <header
        className="flex cursor-move items-start justify-between gap-3 border-b-2 border-amber-500 bg-neutral-900 px-3 py-2"
        onPointerDown={(event) => onDragStart(event, frameNoteId)}
      >
        <div>
          <EditableNoteTitle
            title={noteDisplayName(note)}
            className="font-serif text-left text-xl font-bold uppercase leading-none tracking-wide text-amber-500"
            inputClassName="w-full border border-amber-500 bg-neutral-950 px-2 py-1 font-serif text-xl font-bold uppercase leading-none tracking-wide text-amber-500 focus:outline-none"
            onRename={(value) => onRename?.(noteActionId, value)}
          />
          <p className="mt-2 text-sm italic text-neutral-300">{isSpell ? spellSubtitle : itemPrimaryLabel}</p>
          {!isSpell && itemCategoryLine ? <p className="mt-1 text-sm text-neutral-500">{itemCategoryLine}</p> : null}
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <div className="font-serif text-xl uppercase leading-none text-amber-500">{isSpell ? spellSourceText : itemSourceText}</div>
            {!isSpell && itemPageText ? <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{itemPageText}</div> : null}
          </div>
          <div className="flex gap-1">
            <button className="h-7 w-7 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onMinimize(frameNoteId)}>-</button>
            <button className="h-7 w-7 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onDuplicate(noteActionId)}>⧉</button>
            <button className="h-7 w-7 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => onClose(noteActionId, event)}>X</button>
          </div>
        </div>
      </header>
      {tabBar}
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
      <MonsterRollPanel note={note} onToggle={onToggleDice} onResizeCorner={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="right" className="right-0 top-8 h-[calc(100%-40px)] w-2 cursor-ew-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="bottom" className="bottom-0 left-0 h-2 w-[calc(100%-8px)] cursor-ns-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
    </article>
  );
}

function TextNote({
  note,
  shellNote = null,
  actionNoteId = null,
  tabBar = null,
  isDropTarget = false,
  onRename,
  onClose,
  onDragStart,
  onFocus,
  onResizeStart,
  onMinimize,
  onRestore,
  onDuplicate,
  onTextChange
}) {
  const frameNote = shellNote || note;
  const frameNoteId = frameNote.id;
  const noteActionId = actionNoteId || note.id;
  const title = noteDisplayName(note);

  if (frameNote.minimized) {
    return (
      <article
        className={`absolute flex h-11 cursor-move items-center justify-between gap-3 overflow-hidden border bg-neutral-900 px-3 text-neutral-300 shadow-2xl ${isDropTarget ? "border-sky-300 ring-2 ring-sky-300/60" : "border-amber-500"}`}
        data-dm-note="true"
        style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: clamp(frameNote.width, 220, 340) }}
        onPointerDown={onFocus}
      >
        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onPointerDown={(event) => onDragStart(event, frameNoteId)}
          onClick={() => onRestore(frameNoteId)}
          title={`Restaurar ${title}`}
        >
          <span className="block truncate font-serif text-sm font-bold uppercase tracking-wide text-amber-500">{title}</span>
          <span className="block truncate text-[11px] text-neutral-500">Text note</span>
        </button>
        <button
          className="h-7 w-7 shrink-0 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
          type="button"
          aria-label={`Cerrar ${title}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => onClose(noteActionId, event)}
        >
          X
        </button>
      </article>
    );
  }

  return (
    <article
      className={`absolute flex overflow-hidden border bg-neutral-900 text-neutral-300 shadow-2xl ${isDropTarget ? "border-sky-300 ring-2 ring-sky-300/60" : "border-neutral-950"}`}
      data-dm-note="true"
      style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: frameNote.width, height: frameNote.height, flexDirection: "column" }}
      onPointerDown={onFocus}
    >
      <header
        className="flex cursor-move items-start justify-between gap-3 border-b-2 border-amber-500 bg-neutral-900 px-3 py-2"
        onPointerDown={(event) => onDragStart(event, frameNoteId)}
      >
        <div className="min-w-0">
          <EditableNoteTitle
            title={title}
            className="block max-w-full truncate font-serif text-left text-xl font-bold uppercase leading-none tracking-wide text-amber-500"
            inputClassName="w-full border border-amber-500 bg-neutral-950 px-2 py-1 font-serif text-xl font-bold uppercase leading-none tracking-wide text-amber-500 focus:outline-none"
            onRename={(value) => onRename?.(noteActionId, value)}
          />
          <p className="mt-2 text-sm italic text-neutral-500">Text note</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button className="h-7 w-7 border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onMinimize(frameNoteId)}>-</button>
          <button className="h-7 w-7 border border-neutral-600 bg-neutral-800 text-xs font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onDuplicate(noteActionId)}>D</button>
          <button className="h-7 w-7 border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => onClose(noteActionId, event)}>X</button>
        </div>
      </header>
      {tabBar}
      <textarea
        className="min-h-0 flex-1 resize-none bg-neutral-950/60 px-4 py-3 text-sm leading-relaxed text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500/30"
        value={note.textContent || ""}
        placeholder="Escribi una nota..."
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => onTextChange(noteActionId, event.target.value)}
      />
      <ResizeHandle edge="right" className="right-0 top-8 h-[calc(100%-40px)] w-2 cursor-ew-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="bottom" className="bottom-0 left-0 h-2 w-[calc(100%-8px)] cursor-ns-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="corner" className="bottom-1 right-1 h-5 w-5 cursor-nwse-resize border border-amber-400 bg-amber-500/50 hover:bg-amber-500/80 focus:bg-amber-500/80" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
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
  shellNote = null,
  actionNoteId = null,
  tabBar = null,
  isDropTarget = false,
  onRename,
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
  const frameNote = shellNote || note;
  const frameNoteId = frameNote.id;
  const noteActionId = actionNoteId || note.id;
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
    onRoll(noteActionId, label, roll);
  }

  if (frameNote.minimized) {
    return (
      <article
        className={`absolute flex h-11 cursor-move items-center justify-between gap-3 overflow-hidden border bg-neutral-900 px-3 text-neutral-300 shadow-2xl ${isDropTarget ? "border-sky-300 ring-2 ring-sky-300/60" : "border-amber-500"}`}
        data-dm-note="true"
        style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: clamp(frameNote.width, 220, 340) }}
        onPointerDown={onFocus}
      >
        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onPointerDown={(event) => onDragStart(event, frameNoteId)}
          onClick={() => onRestore(frameNoteId)}
          title={`Restaurar ${noteDisplayName(note)}`}
        >
          <span className="block truncate font-serif text-sm font-bold uppercase tracking-wide text-amber-500">{noteDisplayName(note)}</span>
          <span className="block truncate text-[11px] text-neutral-500">{subtitle || "Character"}</span>
        </button>
        <button
          className="h-7 w-7 shrink-0 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
          type="button"
          aria-label={`Cerrar ${noteDisplayName(note)}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => onClose(noteActionId, event)}
        >
          X
        </button>
      </article>
    );
  }

  return (
    <article
      className={`absolute flex overflow-hidden border bg-neutral-900 text-neutral-300 shadow-2xl ${isDropTarget ? "border-sky-300 ring-2 ring-sky-300/60" : "border-neutral-950"}`}
      data-dm-note="true"
      style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: frameNote.width, height: frameNote.height, flexDirection: "column" }}
      onPointerDown={onFocus}
    >
      <MonsterStatBlockHeader
        monster={statBlockCharacter}
        title={noteDisplayName(note)}
        onRename={(value) => onRename?.(noteActionId, value)}
        onDragStart={(event) => onDragStart(event, frameNoteId)}
        onMinimize={() => onMinimize(frameNoteId)}
        onDuplicate={() => onDuplicate(noteActionId)}
        onClose={(event) => onClose(noteActionId, event)}
      />
      {tabBar}

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

      <MonsterRollPanel note={note} onToggle={onToggleDice} onResizeCorner={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="right" className="right-0 top-8 h-[calc(100%-40px)] w-2 cursor-ew-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="bottom" className="bottom-0 left-0 h-2 w-[calc(100%-8px)] cursor-ns-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
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

function MultiplayerIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 11.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.4 20c.5-3.2 2.6-5.2 5.6-5.2s5.1 2 5.6 5.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 10.6a3 3 0 1 0-1.1-5.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.9 14.9c2.4.3 4 2.1 4.5 5.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LivePlayersPanel({ status, port, error, players, rolls, collapsed, onToggleCollapsed, onPortChange, onStart, onStop, onKick }) {
  const running = Boolean(status?.running);
  const addresses = Array.isArray(status?.addresses) ? status.addresses : [];
  const primaryAddress = addresses[0] || "DM_IP";
  const effectivePort = status?.port || port || 8787;

  if (collapsed) {
    return (
      <button
        className="fixed right-4 top-4 z-40 flex h-14 w-14 items-center justify-center border border-amber-500 bg-neutral-900/95 text-amber-300 shadow-2xl transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        data-board-control="true"
        type="button"
        aria-label="Expand live players panel"
        title={`Live Players: ${players.length} players | ws://${primaryAddress}:${effectivePort}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onToggleCollapsed}
      >
        <MultiplayerIcon className="h-8 w-8" />
        <span className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full border border-neutral-950 ${running ? "bg-emerald-400" : "bg-neutral-600"}`} />
        {players.length ? (
          <span className="absolute -bottom-1 -left-1 inline-flex h-6 min-w-6 items-center justify-center border border-neutral-950 bg-amber-500 px-1 text-[11px] font-black leading-none text-neutral-950">
            {players.length}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <aside
      className="fixed right-4 top-4 z-40 flex max-h-[calc(100vh-32px)] w-[min(420px,calc(100vw-32px))] flex-col border border-neutral-700 bg-neutral-900/95 text-neutral-200 shadow-2xl"
      data-board-control="true"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="border-b-2 border-amber-500 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold uppercase tracking-wide text-amber-500">Live Players</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Players connect to ws://{primaryAddress}:{effectivePort} from the Connect to DM panel.
            </p>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <span className={`border px-2 py-1 text-[11px] font-bold uppercase ${running ? "border-emerald-500/40 text-emerald-300" : "border-neutral-700 text-neutral-500"}`}>
              {running ? "Hosting" : "Stopped"}
            </span>
            <button
              className="h-7 w-7 border border-neutral-700 bg-neutral-950 text-sm font-bold text-neutral-300 hover:border-amber-500 hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand live players panel" : "Collapse live players panel"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? "+" : "-"}
            </button>
          </div>
        </div>
      </header>
      <>
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
      </>
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

function cleanObsidianTarget(value) {
  return String(value || "")
    .replace(/^!?\[\[/, "")
    .replace(/\]\]$/, "")
    .split("|")[0]
    .split("#")[0]
    .trim();
}

function obsidianDisplayAlias(value) {
  const content = String(value || "").replace(/^!?\[\[/, "").replace(/\]\]$/, "");
  const [target, alias] = content.split("|");
  return (alias || target || "").split("#")[0].trim();
}

function isSafeObsidianImage(value) {
  return OBSIDIAN_IMAGE_EXTENSIONS.has(`.${String(value || "").split(".").pop()}`.toLowerCase());
}

function isObsidianHorizontalRule(line) {
  return /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(String(line || ""));
}

function isObsidianBlockStart(line) {
  return /^```/.test(line)
    || isObsidianHorizontalRule(line)
    || /^(#{1,6})\s+/.test(line)
    || /^\s*>\s?/.test(line)
    || /^\s*[-*+]\s+/.test(line)
    || /^\s*\d+\.\s+/.test(line);
}

function parseObsidianListItem(text) {
  const task = String(text || "").match(/^\[([ xX])\]\s+(.+)$/);
  if (!task) return { text: String(text || ""), task: false, checked: false };
  return {
    text: task[2].trim(),
    task: true,
    checked: task[1].toLowerCase() === "x"
  };
}

function parseObsidianMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", language: fence[1]?.trim() || "", text: code.join("\n") });
      continue;
    }

    if (isObsidianHorizontalRule(line)) {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      index += 1;
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      const quoteLines = [];
      while (index < lines.length) {
        const match = lines[index].match(/^\s*>\s?(.*)$/);
        if (!match) break;
        quoteLines.push(match[1]);
        index += 1;
      }
      const callout = quoteLines[0]?.match(/^\[!([a-z0-9_-]+)\][+-]?\s*(.*)$/i);
      if (callout) {
        blocks.push({
          type: "callout",
          kind: callout[1].toLowerCase(),
          title: callout[2]?.trim() || callout[1],
          lines: quoteLines.slice(1).filter((entry) => entry.trim())
        });
      } else {
        blocks.push({ type: "quote", lines: quoteLines.filter((entry) => entry.trim()) });
      }
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bullet) {
      const items = [];
      while (index < lines.length) {
        const match = lines[index].match(/^\s*[-*+]\s+(.+)$/);
        if (!match) break;
        items.push(parseObsidianListItem(match[1].trim()));
        index += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      const items = [];
      while (index < lines.length) {
        const match = lines[index].match(/^\s*\d+\.\s+(.+)$/);
        if (!match) break;
        items.push(parseObsidianListItem(match[1].trim()));
        index += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    const paragraph = [];
    while (index < lines.length) {
      const nextLine = lines[index];
      if (!nextLine.trim()) break;
      if (isObsidianBlockStart(nextLine)) break;
      paragraph.push(nextLine.trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function ObsidianImage({ target, noteRelativePath }) {
  const [state, setState] = useState({ url: "", error: "" });
  const [zoom, setZoom] = useState(100);
  const cleanTarget = cleanObsidianTarget(target);
  const sourceDirectory = String(noteRelativePath || "").split("/").slice(0, -1).join("/");

  function handleImageWheel(event) {
    event.preventDefault();
    event.stopPropagation();
    const direction = event.deltaY > 0 ? -1 : 1;
    setZoom((value) => clamp(value + direction * OBSIDIAN_IMAGE_ZOOM_STEP, OBSIDIAN_IMAGE_MIN_ZOOM, OBSIDIAN_IMAGE_MAX_ZOOM));
  }

  useEffect(() => {
    let disposed = false;
    async function resolveImage() {
      if (!cleanTarget || !isSafeObsidianImage(cleanTarget)) {
        setState({ url: "", error: "Unsupported image" });
        return;
      }
      const candidates = [...new Set([
        sourceDirectory ? `${sourceDirectory}/${cleanTarget}` : cleanTarget,
        cleanTarget
      ])];
      for (const candidate of candidates) {
        try {
          const url = await window.dndSheet?.obsidian?.getAssetUrl(candidate);
          if (!disposed && url) {
            setState({ url, error: "" });
            return;
          }
        } catch (_error) {
          // Try the next safe vault-relative candidate.
        }
      }
      if (!disposed) setState({ url: "", error: "Image not found" });
    }
    resolveImage();
    return () => {
      disposed = true;
    };
  }, [cleanTarget, sourceDirectory]);

  if (state.url) {
    return (
      <div
        className="my-3 max-w-full overflow-auto border border-neutral-800 bg-neutral-950/60"
        onWheel={handleImageWheel}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={() => setZoom(100)}
        title={`${zoom}%`}
      >
        <img
          className="block h-auto max-w-none object-contain"
          src={state.url}
          alt={obsidianDisplayAlias(target) || cleanTarget}
          style={{ width: `${zoom}%` }}
          draggable={false}
        />
      </div>
    );
  }
  return <span className="text-xs italic text-neutral-500">[{state.error || "Loading image"}: {cleanTarget}]</span>;
}

function ObsidianInline({ text, noteRelativePath, onOpenWiki, onOpenExternal }) {
  const parts = [];
  const pattern = /(!\[\[[^\]]+\]\]|\[\[[^\]]+\]\]|\[[^\]]+\]\([^)]+\)|~~[^~]+~~|==[^=]+==|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(String(text || "")))) {
    if (match.index > lastIndex) parts.push({ type: "text", text: text.slice(lastIndex, match.index) });
    const token = match[0];
    if (token.startsWith("![[")) parts.push({ type: "image", target: token });
    else if (token.startsWith("[[")) parts.push({ type: "wiki", target: token });
    else if (token.startsWith("[") && token.includes("](")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      parts.push({ type: "link", label: linkMatch?.[1] || token, href: linkMatch?.[2] || "" });
    } else if (token.startsWith("~~")) parts.push({ type: "strike", text: token.slice(2, -2) });
    else if (token.startsWith("==")) parts.push({ type: "highlight", text: token.slice(2, -2) });
    else if (token.startsWith("`")) parts.push({ type: "code", text: token.slice(1, -1) });
    else if (token.startsWith("**")) parts.push({ type: "bold", text: token.slice(2, -2) });
    else if (token.startsWith("*")) parts.push({ type: "italic", text: token.slice(1, -1) });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < String(text || "").length) parts.push({ type: "text", text: String(text || "").slice(lastIndex) });

  return parts.map((part, index) => {
    const key = `${part.type}-${index}-${part.text || part.target || part.href || ""}`;
    if (part.type === "image") return <ObsidianImage key={key} target={part.target} noteRelativePath={noteRelativePath} />;
    if (part.type === "wiki") {
      const target = cleanObsidianTarget(part.target);
      return (
        <button
          key={key}
          className="font-semibold text-sky-300 underline decoration-sky-500/40 underline-offset-2 hover:text-sky-200"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onOpenWiki?.(target)}
        >
          {obsidianDisplayAlias(part.target)}
        </button>
      );
    }
    if (part.type === "link") {
      const external = /^https?:\/\//i.test(part.href);
      return (
        <button
          key={key}
          className="font-semibold text-sky-300 underline decoration-sky-500/40 underline-offset-2 hover:text-sky-200"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => external ? onOpenExternal?.(part.href) : onOpenWiki?.(part.href)}
        >
          {part.label}
        </button>
      );
    }
    if (part.type === "code") return <code key={key} className="rounded-sm bg-neutral-950 px-1 py-0.5 text-[0.95em] text-amber-200">{part.text}</code>;
    if (part.type === "strike") return <del key={key} className="text-neutral-500"><ObsidianInline text={part.text} noteRelativePath={noteRelativePath} onOpenWiki={onOpenWiki} onOpenExternal={onOpenExternal} /></del>;
    if (part.type === "highlight") return <mark key={key} className="bg-amber-400/25 px-0.5 text-amber-100"><ObsidianInline text={part.text} noteRelativePath={noteRelativePath} onOpenWiki={onOpenWiki} onOpenExternal={onOpenExternal} /></mark>;
    if (part.type === "bold") return <strong key={key} className="font-bold text-neutral-100"><ObsidianInline text={part.text} noteRelativePath={noteRelativePath} onOpenWiki={onOpenWiki} onOpenExternal={onOpenExternal} /></strong>;
    if (part.type === "italic") return <em key={key} className="italic text-neutral-200"><ObsidianInline text={part.text} noteRelativePath={noteRelativePath} onOpenWiki={onOpenWiki} onOpenExternal={onOpenExternal} /></em>;
    return <React.Fragment key={key}>{part.text}</React.Fragment>;
  });
}

function ObsidianMarkdown({ markdown, noteRelativePath, onOpenWiki, onOpenExternal }) {
  const blocks = useMemo(() => parseObsidianMarkdown(markdown), [markdown]);
  if (!blocks.length) return <p className="text-sm text-neutral-500">This note is empty.</p>;

  return (
    <div className="space-y-3 leading-relaxed text-neutral-300">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "heading") {
          const Heading = block.level === 1 ? "h2" : block.level === 2 ? "h3" : block.level === 3 ? "h4" : block.level === 4 ? "h5" : "h6";
          const headingClasses = {
            1: "font-serif text-2xl font-bold uppercase text-amber-500",
            2: "font-serif text-xl font-bold text-amber-400",
            3: "font-serif text-lg font-bold text-neutral-100",
            4: "text-base font-bold uppercase tracking-wide text-neutral-100",
            5: "text-sm font-bold uppercase tracking-wide text-neutral-200",
            6: "text-xs font-bold uppercase tracking-wide text-neutral-300"
          };
          const className = headingClasses[block.level] || headingClasses[6];
          return <Heading key={key} className={className}><ObsidianInline text={block.text} noteRelativePath={noteRelativePath} onOpenWiki={onOpenWiki} onOpenExternal={onOpenExternal} /></Heading>;
        }
        if (block.type === "hr") {
          return <hr key={key} className="my-4 border-0 border-t border-amber-500/60" />;
        }
        if (block.type === "code") {
          return (
            <pre key={key} className="overflow-auto border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-200">
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={key} className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className={item.task ? "list-none" : ""}>
                  {item.task ? (
                    <label className="-ml-5 flex items-start gap-2">
                      <input className="mt-1 h-3.5 w-3.5 accent-amber-500" type="checkbox" checked={item.checked} readOnly />
                      <span className={item.checked ? "text-neutral-500 line-through" : ""}>
                        <ObsidianInline text={item.text} noteRelativePath={noteRelativePath} onOpenWiki={onOpenWiki} onOpenExternal={onOpenExternal} />
                      </span>
                    </label>
                  ) : (
                    <ObsidianInline text={item.text ?? item} noteRelativePath={noteRelativePath} onOpenWiki={onOpenWiki} onOpenExternal={onOpenExternal} />
                  )}
                </li>
              ))}
            </List>
          );
        }
        if (block.type === "quote" || block.type === "callout") {
          const isCallout = block.type === "callout";
          return (
            <blockquote key={key} className={`border-l-4 px-3 py-2 ${isCallout ? "border-sky-400 bg-sky-950/25" : "border-neutral-600 bg-neutral-950/50"}`}>
              {isCallout ? (
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-sky-300">{block.kind}: {block.title}</div>
              ) : null}
              <div className="space-y-2 text-neutral-300">
                {(block.lines || []).map((line, lineIndex) => (
                  <p key={`${key}-line-${lineIndex}`}>
                    <ObsidianInline text={line} noteRelativePath={noteRelativePath} onOpenWiki={onOpenWiki} onOpenExternal={onOpenExternal} />
                  </p>
                ))}
              </div>
            </blockquote>
          );
        }
        return (
          <p key={key}>
            <ObsidianInline text={block.text} noteRelativePath={noteRelativePath} onOpenWiki={onOpenWiki} onOpenExternal={onOpenExternal} />
          </p>
        );
      })}
    </div>
  );
}

function ObsidianNote({
  note,
  shellNote = null,
  actionNoteId = null,
  tabBar = null,
  isDropTarget = false,
  onRename,
  onClose,
  onDragStart,
  onFocus,
  onResizeStart,
  onMinimize,
  onRestore,
  onDuplicate,
  onRefresh,
  onOpenInObsidian,
  onStartEdit,
  onChangeEdit,
  onCancelEdit,
  onSaveEdit,
  onOpenWiki,
  onOpenExternal
}) {
  const frameNote = shellNote || note;
  const frameNoteId = frameNote.id;
  const noteActionId = actionNoteId || note.id;
  const title = noteDisplayName(note);
  const relativePath = note.obsidian?.relativePath || "";
  const status = note.obsidianLoading
    ? "Loading..."
    : note.obsidianSaving
      ? "Saving..."
    : note.obsidianUpdatedAt
      ? `Updated ${new Date(note.obsidianUpdatedAt).toLocaleTimeString()}`
      : note.obsidian?.vaultName || "Obsidian";
  const editDraft = typeof note.obsidianDraft === "string" ? note.obsidianDraft : note.obsidianMarkdown || "";

  if (frameNote.minimized) {
    return (
      <article
        className={`absolute flex h-11 cursor-move items-center justify-between gap-3 overflow-hidden border bg-neutral-900 px-3 text-neutral-300 shadow-2xl ${isDropTarget ? "border-sky-300 ring-2 ring-sky-300/60" : "border-amber-500"}`}
        data-dm-note="true"
        style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: clamp(frameNote.width, 220, 340) }}
        onPointerDown={onFocus}
      >
        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onPointerDown={(event) => onDragStart(event, frameNoteId)}
          onClick={() => onRestore(frameNoteId)}
          title={`Restaurar ${title}`}
        >
          <span className="block truncate font-serif text-sm font-bold uppercase tracking-wide text-amber-500">{title}</span>
          <span className="block truncate text-[11px] text-neutral-500">{relativePath}</span>
        </button>
        <button
          className="h-7 w-7 shrink-0 rounded-sm border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
          type="button"
          aria-label={`Cerrar ${title}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => onClose(noteActionId, event)}
        >
          X
        </button>
      </article>
    );
  }

  return (
    <article
      className={`absolute flex overflow-hidden border bg-neutral-900 text-neutral-300 shadow-2xl ${isDropTarget ? "border-sky-300 ring-2 ring-sky-300/60" : "border-neutral-950"}`}
      data-dm-note="true"
      style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: frameNote.width, height: frameNote.height, flexDirection: "column" }}
      onPointerDown={onFocus}
    >
      <header
        className="flex cursor-move items-start justify-between gap-3 border-b-2 border-amber-500 bg-neutral-900 px-3 py-2"
        onPointerDown={(event) => onDragStart(event, frameNoteId)}
      >
        <div className="min-w-0">
          <EditableNoteTitle
            title={title}
            className="block max-w-full truncate font-serif text-left text-xl font-bold uppercase leading-none tracking-wide text-amber-500"
            inputClassName="w-full border border-amber-500 bg-neutral-950 px-2 py-1 font-serif text-xl font-bold uppercase leading-none tracking-wide text-amber-500 focus:outline-none"
            onRename={(value) => onRename?.(noteActionId, value)}
          />
          <p className="mt-2 truncate text-sm italic text-neutral-300">{relativePath}</p>
          <p className="mt-1 text-xs text-neutral-500">{status}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {note.obsidianEditing ? (
            <>
              <button className="h-7 border border-emerald-600 bg-emerald-900/60 px-2 text-xs font-bold text-emerald-100 hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60" type="button" disabled={note.obsidianSaving} onPointerDown={(event) => event.stopPropagation()} onClick={() => onSaveEdit(noteActionId)}>Save</button>
              <button className="h-7 border border-neutral-600 bg-neutral-800 px-2 text-xs font-bold text-neutral-100 hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-60" type="button" disabled={note.obsidianSaving} onPointerDown={(event) => event.stopPropagation()} onClick={() => onCancelEdit(noteActionId)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="h-7 border border-neutral-600 bg-neutral-800 px-2 text-xs font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onStartEdit(noteActionId)}>Edit</button>
              <button className="h-7 border border-neutral-600 bg-neutral-800 px-2 text-xs font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onRefresh(noteActionId)}>Refresh</button>
              <button className="h-7 border border-neutral-600 bg-neutral-800 px-2 text-xs font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onOpenInObsidian(noteActionId)}>Open</button>
            </>
          )}
          <button className="h-7 w-7 border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onMinimize(frameNoteId)}>-</button>
          <button className="h-7 w-7 border border-neutral-600 bg-neutral-800 text-xs font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onDuplicate(noteActionId)}>D</button>
          <button className="h-7 w-7 border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => onClose(noteActionId, event)}>X</button>
        </div>
      </header>
      {tabBar}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3 text-sm">
        {note.obsidianEditing ? (
          <>
            {note.obsidianError ? (
              <div className="mb-3 border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-rose-200">
                {note.obsidianError}
              </div>
            ) : null}
            <textarea
              className="h-full min-h-[360px] w-full resize-none border border-neutral-700 bg-neutral-950 px-3 py-3 font-mono text-sm leading-relaxed text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              value={editDraft}
              spellCheck={false}
              onPointerDown={(event) => event.stopPropagation()}
              onChange={(event) => onChangeEdit(noteActionId, event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
                  event.preventDefault();
                  onSaveEdit(noteActionId);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  onCancelEdit(noteActionId);
                }
              }}
            />
          </>
        ) : note.obsidianError ? (
          <div className="border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-rose-200">
            {note.obsidianError}
          </div>
        ) : (
          <ObsidianMarkdown
            markdown={note.obsidianMarkdown}
            noteRelativePath={relativePath}
            onOpenWiki={(target) => onOpenWiki?.(target, note)}
            onOpenExternal={onOpenExternal}
          />
        )}
      </div>
      <ResizeHandle edge="right" className="right-0 top-8 h-[calc(100%-40px)] w-2 cursor-ew-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="bottom" className="bottom-0 left-0 h-2 w-[calc(100%-8px)] cursor-ns-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="corner" className="bottom-1 right-1 h-5 w-5 cursor-nwse-resize border border-amber-400 bg-amber-500/50 hover:bg-amber-500/80 focus:bg-amber-500/80" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
    </article>
  );
}

function ObsidianPicker({
  isOpen,
  vault,
  notes,
  selectedNote,
  searchQuery,
  loading,
  error,
  onSearch,
  onSelect,
  onSelectVault,
  onClearVault,
  onRefresh,
  onAdd,
  onClose
}) {
  if (!isOpen) return null;
  const hasVault = vault?.configured && vault?.exists;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4" data-obsidian-picker="true">
      <section className="grid h-[min(760px,calc(100vh-32px))] w-[min(1120px,calc(100vw-32px))] grid-cols-1 overflow-hidden border border-neutral-700 bg-neutral-900 text-neutral-300 shadow-2xl md:grid-cols-[420px_1fr]">
        <div className="flex min-h-0 flex-col border-r border-neutral-700">
          <header className="border-b-2 border-amber-500 bg-neutral-950 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-amber-500">Add Obsidian Note</h1>
                <p className="truncate text-sm text-neutral-500">{hasVault ? vault.name : "No vault selected"}</p>
              </div>
              <button className="h-8 w-8 border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onClick={onClose}>X</button>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="h-9 border border-neutral-700 bg-neutral-900 px-3 text-sm font-bold text-amber-500 hover:border-amber-500 hover:bg-neutral-800" type="button" onClick={onSelectVault}>
                Select Vault
              </button>
              {vault?.configured ? (
                <button className="h-9 border border-neutral-700 bg-neutral-900 px-3 text-sm font-bold text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800" type="button" onClick={onClearVault}>
                  Clear
                </button>
              ) : null}
              {hasVault ? (
                <button className="h-9 border border-neutral-700 bg-neutral-900 px-3 text-sm font-bold text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800" type="button" onClick={onRefresh}>
                  Refresh
                </button>
              ) : null}
            </div>
            {hasVault ? (
              <input
                className="mt-4 h-10 w-full border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                value={searchQuery}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Search title, file name, path, excerpt"
                autoFocus
              />
            ) : null}
            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
          </header>

          <div className="min-h-0 flex-1 overflow-auto bg-neutral-900">
            {!hasVault ? (
              <div className="p-4 text-sm text-neutral-400">
                Select a local Obsidian vault folder to scan markdown notes.
              </div>
            ) : loading ? (
              <p className="px-4 py-6 text-sm text-neutral-500">Loading notes...</p>
            ) : notes.length ? notes.map((note) => {
              const active = selectedNote?.relativePath === note.relativePath;
              return (
                <button
                  key={note.relativePath}
                  className={`w-full border-b border-neutral-800 px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-300 ${active ? "bg-amber-500 text-neutral-950 hover:bg-amber-400" : "text-neutral-300 hover:bg-neutral-800"}`}
                  type="button"
                  onClick={() => onSelect(note)}
                >
                  <span className="block truncate font-semibold">{note.title || note.fileName}</span>
                  <span className={`block truncate text-xs ${active ? "text-neutral-800" : "text-neutral-500"}`}>{note.relativePath}</span>
                </button>
              );
            }) : (
              <p className="px-4 py-6 text-sm text-neutral-500">No matching notes.</p>
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-auto bg-neutral-900 p-5">
          {hasVault && selectedNote ? (
            <div className="space-y-5">
              <article className="overflow-hidden border border-neutral-950 bg-neutral-900 text-neutral-300 shadow-2xl">
                <header className="border-b-2 border-amber-500 bg-neutral-900 px-3 py-2">
                  <h2 className="font-serif text-xl font-bold uppercase leading-none tracking-wide text-amber-500">{selectedNote.title}</h2>
                  <p className="mt-2 text-sm italic text-neutral-300">{selectedNote.relativePath}</p>
                </header>
                <div className="max-h-[min(58vh,560px)] overflow-auto px-3 py-2 text-sm">
                  <p className="leading-relaxed text-neutral-300">{selectedNote.excerpt || "No excerpt available."}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <Stat label="Size" value={`${selectedNote.size || 0} bytes`} />
                    <Stat label="Modified" value={selectedNote.mtimeMs ? new Date(selectedNote.mtimeMs).toLocaleString() : ""} />
                  </dl>
                </div>
              </article>
              <div className="sticky bottom-0 border-t border-neutral-700 bg-neutral-900 pt-4">
                <button className="inline-flex h-10 items-center bg-amber-500 px-4 text-sm font-bold text-neutral-950 hover:bg-amber-400" type="button" onClick={() => onAdd(selectedNote)}>
                  Add note
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              {hasVault ? "Select a note." : "Select a vault to start."}
            </div>
          )}
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

function HomebrewMonsterModal({
  isOpen,
  activeTab,
  monsterDraft,
  itemDraft,
  spellDraft,
  onTabChange,
  onMonsterChange,
  onItemChange,
  onSpellChange,
  onClose,
  onSubmit
}) {
  const nameRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    nameRef.current?.focus();
    nameRef.current?.select();
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const updateMonsterField = (field) => (event) => onMonsterChange({ ...monsterDraft, [field]: event.target.value });
  const updateItemField = (field) => (event) => onItemChange({ ...itemDraft, [field]: event.target.value });
  const updateSpellField = (field) => (event) => onSpellChange({ ...spellDraft, [field]: event.target.value });
  const inputClass = "h-10 w-full border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20";
  const labelClass = "text-xs font-bold uppercase tracking-wide text-neutral-500";
  const textareaClass = "mt-1 min-h-28 w-full resize-y border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20";
  const tabs = [
    ["monster", "Monsters"],
    ["item", "Items"],
    ["spell", "Spells"]
  ];
  const submitLabel = activeTab === "item" ? "Create Item" : activeTab === "spell" ? "Create Spell" : "Create Monster";

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/75 p-4"
      data-homebrew-monster-modal="true"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <section className="max-h-[calc(100vh-32px)] w-[min(760px,calc(100vw-32px))] overflow-hidden border border-neutral-700 bg-neutral-900 text-neutral-200 shadow-2xl">
        <header className="border-b-2 border-amber-500 bg-neutral-950 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-amber-500">Homebrew</h1>
              <p className="mt-1 text-sm text-neutral-400">Crea notas custom para el tablero.</p>
            </div>
            <button className="h-8 w-8 border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onClick={onClose}>X</button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {tabs.map(([tab, label]) => (
              <button
                key={tab}
                className={`h-9 border px-3 text-xs font-bold uppercase tracking-wide ${activeTab === tab ? "border-amber-500 bg-amber-500 text-neutral-950" : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-800"}`}
                type="button"
                onClick={() => onTabChange(tab)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>
        <form
          className="max-h-[calc(100vh-124px)] space-y-4 overflow-auto p-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {activeTab === "monster" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-[2fr_0.8fr_1fr_1fr]">
                <label className={labelClass}>
                  Name
                  <input ref={nameRef} className={`${inputClass} mt-1`} value={monsterDraft.name} onChange={updateMonsterField("name")} />
                </label>
                <label className={labelClass}>
                  Size
                  <select className={`${inputClass} mt-1`} value={monsterDraft.size} onChange={updateMonsterField("size")}>
                    {Object.entries(SIZE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className={labelClass}>
                  Type
                  <input className={`${inputClass} mt-1`} value={monsterDraft.type} onChange={updateMonsterField("type")} />
                </label>
                <label className={labelClass}>
                  Alignment
                  <input className={`${inputClass} mt-1`} value={monsterDraft.alignment} onChange={updateMonsterField("alignment")} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <label className={labelClass}>AC<input className={`${inputClass} mt-1`} value={monsterDraft.ac} onChange={updateMonsterField("ac")} /></label>
                <label className={labelClass}>HP<input className={`${inputClass} mt-1`} value={monsterDraft.hp} onChange={updateMonsterField("hp")} placeholder="27 or 5d8+5" /></label>
                <label className={labelClass}>Speed<input className={`${inputClass} mt-1`} value={monsterDraft.speed} onChange={updateMonsterField("speed")} /></label>
                <label className={labelClass}>CR<input className={`${inputClass} mt-1`} value={monsterDraft.cr} onChange={updateMonsterField("cr")} /></label>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {ABILITY_KEYS.map((ability) => (
                  <label key={ability} className={labelClass}>
                    {ABILITY_LABELS[ability]}
                    <input className={`${inputClass} mt-1`} value={monsterDraft[ability]} onChange={updateMonsterField(ability)} />
                  </label>
                ))}
              </div>

              <label className={labelClass}>
                Traits
                <textarea
                  className={textareaClass}
                  value={monsterDraft.traits}
                  onChange={updateMonsterField("traits")}
                  placeholder="Keen Smell: Advantage on Wisdom (Perception) checks that rely on smell."
                />
              </label>
              <label className={labelClass}>
                Actions
                <textarea
                  className={`${textareaClass} min-h-32`}
                  value={monsterDraft.actions}
                  onChange={updateMonsterField("actions")}
                  placeholder="Bite: Melee Weapon Attack: +4 to hit. Hit: 1d8+2 piercing damage."
                />
              </label>
            </>
          ) : null}

          {activeTab === "item" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
                <label className={labelClass}>Name<input ref={nameRef} className={`${inputClass} mt-1`} value={itemDraft.name} onChange={updateItemField("name")} /></label>
                <label className={labelClass}>Type<input className={`${inputClass} mt-1`} value={itemDraft.type} onChange={updateItemField("type")} placeholder="Weapon, Armor, Gear" /></label>
                <label className={labelClass}>Rarity<input className={`${inputClass} mt-1`} value={itemDraft.rarity} onChange={updateItemField("rarity")} /></label>
                <label className={labelClass}>Source<input className={`${inputClass} mt-1`} value={itemDraft.source} onChange={updateItemField("source")} /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <label className={labelClass}>Value (cp)<input className={`${inputClass} mt-1`} value={itemDraft.value} onChange={updateItemField("value")} /></label>
                <label className={labelClass}>Weight (lb)<input className={`${inputClass} mt-1`} value={itemDraft.weight} onChange={updateItemField("weight")} /></label>
                <label className={labelClass}>Damage<input className={`${inputClass} mt-1`} value={itemDraft.damage} onChange={updateItemField("damage")} placeholder="1d8 slashing" /></label>
                <label className={labelClass}>Properties<input className={`${inputClass} mt-1`} value={itemDraft.properties} onChange={updateItemField("properties")} placeholder="Finesse, Light" /></label>
              </div>
              <label className={labelClass}>
                Description
                <textarea
                  className={`${textareaClass} min-h-40`}
                  value={itemDraft.entries}
                  onChange={updateItemField("entries")}
                  placeholder="Describe what this item does."
                />
              </label>
            </>
          ) : null}

          {activeTab === "spell" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-[2fr_0.7fr_1fr_1fr]">
                <label className={labelClass}>Name<input ref={nameRef} className={`${inputClass} mt-1`} value={spellDraft.name} onChange={updateSpellField("name")} /></label>
                <label className={labelClass}>Level<input className={`${inputClass} mt-1`} value={spellDraft.level} onChange={updateSpellField("level")} placeholder="0-9" /></label>
                <label className={labelClass}>School<input className={`${inputClass} mt-1`} value={spellDraft.school} onChange={updateSpellField("school")} /></label>
                <label className={labelClass}>Source<input className={`${inputClass} mt-1`} value={spellDraft.source} onChange={updateSpellField("source")} /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <label className={labelClass}>Casting Time<input className={`${inputClass} mt-1`} value={spellDraft.castingTime} onChange={updateSpellField("castingTime")} /></label>
                <label className={labelClass}>Range<input className={`${inputClass} mt-1`} value={spellDraft.range} onChange={updateSpellField("range")} /></label>
                <label className={labelClass}>Components<input className={`${inputClass} mt-1`} value={spellDraft.components} onChange={updateSpellField("components")} /></label>
                <label className={labelClass}>Duration<input className={`${inputClass} mt-1`} value={spellDraft.duration} onChange={updateSpellField("duration")} /></label>
              </div>
              <label className={labelClass}>Classes<input className={`${inputClass} mt-1`} value={spellDraft.classes} onChange={updateSpellField("classes")} placeholder="Wizard, Cleric" /></label>
              <label className={labelClass}>
                Description
                <textarea
                  className={`${textareaClass} min-h-40`}
                  value={spellDraft.description}
                  onChange={updateSpellField("description")}
                  placeholder="Describe what the spell does."
                />
              </label>
            </>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-neutral-800 pt-4">
            <button className="inline-flex h-10 items-center border border-neutral-700 bg-neutral-900 px-4 text-sm font-bold text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800" type="button" onClick={onClose}>Cancel</button>
            <button className="inline-flex h-10 items-center bg-amber-500 px-4 text-sm font-bold text-neutral-950 hover:bg-amber-400" type="submit">{submitLabel}</button>
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
  const [freeDiceOpen, setFreeDiceOpen] = useState(false);
  const [freeDiceSelection, setFreeDiceSelection] = useState(createFreeDiceSelection);
  const [freeDiceRolls, setFreeDiceRolls] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [noteSpawnPoint, setNoteSpawnPoint] = useState(null);
  const [resourcePickerKind, setResourcePickerKind] = useState(null);
  const [resourceSearchQuery, setResourceSearchQuery] = useState("");
  const [resourceSortField, setResourceSortField] = useState("name");
  const [resourceSortDirection, setResourceSortDirection] = useState("asc");
  const [selectedSpell, setSelectedSpell] = useState(spells[0] || null);
  const [selectedItem, setSelectedItem] = useState(ITEM_LIBRARY[0] || null);
  const [isObsidianPickerOpen, setIsObsidianPickerOpen] = useState(false);
  const [obsidianVault, setObsidianVault] = useState(null);
  const [obsidianNotes, setObsidianNotes] = useState([]);
  const [obsidianSearchQuery, setObsidianSearchQuery] = useState("");
  const [selectedObsidianNote, setSelectedObsidianNote] = useState(null);
  const [obsidianPickerLoading, setObsidianPickerLoading] = useState(false);
  const [obsidianPickerError, setObsidianPickerError] = useState("");
  const [obsidianSpawnPoint, setObsidianSpawnPoint] = useState(null);
  const [monsterNotes, setMonsterNotes] = useState(persistedBoardState.notes);
  const [isCharacterCodeModalOpen, setIsCharacterCodeModalOpen] = useState(false);
  const [characterCodeValue, setCharacterCodeValue] = useState("");
  const [characterCodeError, setCharacterCodeError] = useState("");
  const [characterCodeSpawnPoint, setCharacterCodeSpawnPoint] = useState(null);
  const [isHomebrewMonsterModalOpen, setIsHomebrewMonsterModalOpen] = useState(false);
  const [homebrewModalTab, setHomebrewModalTab] = useState("monster");
  const [homebrewMonsterDraft, setHomebrewMonsterDraft] = useState(HOMEBREW_MONSTER_DEFAULTS);
  const [homebrewItemDraft, setHomebrewItemDraft] = useState(HOMEBREW_ITEM_DEFAULTS);
  const [homebrewSpellDraft, setHomebrewSpellDraft] = useState(HOMEBREW_SPELL_DEFAULTS);
  const [homebrewMonsterSpawnPoint, setHomebrewMonsterSpawnPoint] = useState(null);
  const [liveServerStatus, setLiveServerStatus] = useState({ running: false, port: 8787, addresses: [], playerCount: 0 });
  const [livePlayers, setLivePlayers] = useState([]);
  const [liveRolls, setLiveRolls] = useState([]);
  const [liveHostPort, setLiveHostPort] = useState("8787");
  const [liveHostError, setLiveHostError] = useState("");
  const [livePlayersCollapsed, setLivePlayersCollapsed] = useState(false);
  const [dropTargetNoteId, setDropTargetNoteId] = useState(null);
  const [selectedRootNoteIds, setSelectedRootNoteIds] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [boardView, setBoardView] = useState(persistedBoardState.view);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredResourceSearchQuery = useDeferredValue(resourceSearchQuery);
  const deferredObsidianSearchQuery = useDeferredValue(obsidianSearchQuery);
  const dragRef = useRef(null);
  const tabDragRef = useRef(null);
  const resizeRef = useRef(null);
  const panRef = useRef(null);
  const selectionRef = useRef(null);
  const boardViewRef = useRef(boardView);
  const monsterNotesRef = useRef(monsterNotes);
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

  const filteredObsidianNotes = useMemo(() => {
    const query = normalizeSearch(deferredObsidianSearchQuery);
    const notes = Array.isArray(obsidianNotes) ? obsidianNotes : [];
    if (!query) return notes;
    return notes.filter((note) => normalizeSearch([
      note.title,
      note.fileName,
      note.relativePath,
      note.excerpt
    ].join(" ")).includes(query));
  }, [deferredObsidianSearchQuery, obsidianNotes]);

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
    monsterNotesRef.current = monsterNotes;
  }, [monsterNotes]);

  const visibleNotes = useMemo(
    () => monsterNotes.filter((note) => !note.parentNoteId),
    [monsterNotes]
  );
  const selectedRootNoteIdSet = useMemo(() => new Set(selectedRootNoteIds), [selectedRootNoteIds]);

  useEffect(() => {
    saveDmBoardState(monsterNotes, boardView);
  }, [boardView, monsterNotes]);

  useEffect(() => {
    const rootIds = new Set(visibleNotes.map((note) => note.id));
    setSelectedRootNoteIds((ids) => ids.filter((id) => rootIds.has(id)));
  }, [visibleNotes]);

  useEffect(() => {
    if (selectedObsidianNote && filteredObsidianNotes.some((note) => note.relativePath === selectedObsidianNote.relativePath)) return;
    setSelectedObsidianNote(filteredObsidianNotes[0] || null);
  }, [filteredObsidianNotes, selectedObsidianNote]);

  useEffect(() => {
    const api = window.dndSheet?.obsidian;
    if (!api) return undefined;
    api.getVault()
      .then((vault) => setObsidianVault(vault))
      .catch(() => setObsidianVault({ configured: false, path: "", name: "", exists: false }));

    const restoredPaths = [...new Set(monsterNotesRef.current
      .filter((note) => note.kind === "obsidian" && note.obsidian?.relativePath && !note.obsidianMarkdown && !note.obsidianError)
      .map((note) => note.obsidian.relativePath))];
    restoredPaths.forEach((relativePath) => loadObsidianNoteContent(relativePath));

    const unsubscribe = api.onVaultChanged?.((payload) => {
      api.getVault().then((vault) => setObsidianVault(vault)).catch(() => {});
      if (isObsidianPickerOpen) refreshObsidianNotes();
      const changedPath = payload?.relativePath || "";
      const openPaths = [...new Set(monsterNotesRef.current
        .filter((note) => note.kind === "obsidian" && note.obsidian?.relativePath)
        .map((note) => note.obsidian.relativePath))];
      openPaths
        .filter((relativePath) => !changedPath || relativePath === changedPath)
        .forEach((relativePath) => loadObsidianNoteContent(relativePath, { live: true }));
    });
    return () => unsubscribe?.();
  }, []);

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

  async function refreshObsidianNotes(query = obsidianSearchQuery) {
    const api = window.dndSheet?.obsidian;
    if (!api) {
      setObsidianPickerError("Obsidian API unavailable in this renderer.");
      return;
    }
    setObsidianPickerLoading(true);
    setObsidianPickerError("");
    try {
      const vault = await api.getVault();
      setObsidianVault(vault);
      if (!vault?.configured || !vault?.exists) {
        setObsidianNotes([]);
        setSelectedObsidianNote(null);
        return;
      }
      const notes = await api.listNotes(query || "");
      const noteList = Array.isArray(notes) ? notes : [];
      setObsidianNotes(noteList);
      setSelectedObsidianNote((current) => {
        if (current && noteList.some((note) => note.relativePath === current.relativePath)) return current;
        return noteList[0] || null;
      });
    } catch (error) {
      setObsidianPickerError(error?.message || "Could not load Obsidian notes.");
      setObsidianNotes([]);
      setSelectedObsidianNote(null);
    } finally {
      setObsidianPickerLoading(false);
    }
  }

  function openObsidianPicker(spawnPoint = null, { search = "" } = {}) {
    setObsidianSpawnPoint(spawnPoint);
    setObsidianSearchQuery(search);
    setIsObsidianPickerOpen(true);
    setContextMenu(null);
    refreshObsidianNotes(search);
  }

  async function selectObsidianVault() {
    const api = window.dndSheet?.obsidian;
    if (!api) {
      setObsidianPickerError("Obsidian API unavailable in this renderer.");
      return;
    }
    setObsidianPickerLoading(true);
    setObsidianPickerError("");
    try {
      const vault = await api.selectVault();
      setObsidianVault(vault);
      await refreshObsidianNotes("");
    } catch (error) {
      setObsidianPickerError(error?.message || "Could not select Obsidian vault.");
    } finally {
      setObsidianPickerLoading(false);
    }
  }

  async function clearObsidianVault() {
    const api = window.dndSheet?.obsidian;
    if (!api) return;
    setObsidianPickerError("");
    try {
      const vault = await api.clearVault();
      setObsidianVault(vault);
      setObsidianNotes([]);
      setSelectedObsidianNote(null);
    } catch (error) {
      setObsidianPickerError(error?.message || "Could not clear Obsidian vault.");
    }
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

  function addTextNote(positionOverride = null) {
    addBoardNote({
      kind: "text",
      textTitle: "Text Note",
      textContent: "",
      width: 420,
      height: 320
    }, positionOverride);
    setContextMenu(null);
  }

  function addResourceNote(kind, entry, positionOverride = null) {
    addBoardNote({ kind, entry, entryCustom: entry?.__homebrew ? cloneForBoardState(entry) : null }, positionOverride);
    setResourcePickerKind(null);
    setNoteSpawnPoint(null);
  }

  function addObsidianNote(noteMeta, positionOverride = null) {
    if (!noteMeta?.relativePath) return;
    const vaultName = obsidianVault?.name || noteMeta.vaultName || "";
    addBoardNote({
      kind: "obsidian",
      obsidian: {
        relativePath: noteMeta.relativePath,
        fileName: noteMeta.fileName || noteMeta.relativePath.split("/").pop() || "",
        title: noteMeta.title || noteMeta.fileName || "Obsidian Note",
        vaultName
      },
      width: 580,
      height: 640,
      obsidianLoading: true
    }, positionOverride || obsidianSpawnPoint);
    setIsObsidianPickerOpen(false);
    setObsidianSpawnPoint(null);
    setTimeout(() => loadObsidianNoteContent(noteMeta.relativePath), 0);
  }

  async function loadObsidianNoteContent(relativePath, { live = false } = {}) {
    const api = window.dndSheet?.obsidian;
    if (!api || !relativePath) return;
    setMonsterNotes((notes) => notes.map((note) => (
      note.kind === "obsidian" && note.obsidian?.relativePath === relativePath
        ? note.obsidianEditing && live
          ? note
          : { ...note, obsidianLoading: true, obsidianError: live ? note.obsidianError : "" }
        : note
    )));
    try {
      const data = await api.readNote(relativePath);
      setMonsterNotes((notes) => notes.map((note) => (
        note.kind === "obsidian" && note.obsidian?.relativePath === relativePath
          ? note.obsidianEditing && live
            ? note
            : {
              ...note,
              obsidian: {
                ...note.obsidian,
                relativePath: data.relativePath || relativePath,
                fileName: data.fileName || note.obsidian?.fileName || "",
                title: data.title || note.obsidian?.title || "Obsidian Note"
              },
              obsidianMarkdown: data.markdown || "",
              obsidianLoading: false,
              obsidianError: "",
              obsidianUpdatedAt: Date.now()
            }
          : note
      )));
    } catch (error) {
      setMonsterNotes((notes) => notes.map((note) => (
        note.kind === "obsidian" && note.obsidian?.relativePath === relativePath
          ? {
            ...note,
            obsidianLoading: false,
            obsidianError: error?.message || "Could not read Obsidian note.",
            obsidianUpdatedAt: Date.now()
          }
          : note
      )));
    }
  }

  function refreshObsidianNote(noteId) {
    const note = monsterNotes.find((entry) => entry.id === noteId);
    if (note?.obsidian?.relativePath) loadObsidianNoteContent(note.obsidian.relativePath);
  }

  function startEditingObsidianNote(noteId) {
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId
        ? {
          ...note,
          obsidianEditing: true,
          obsidianDraft: typeof note.obsidianMarkdown === "string" ? note.obsidianMarkdown : "",
          obsidianError: ""
        }
        : note
    )));
  }

  function updateObsidianNoteDraft(noteId, markdown) {
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? { ...note, obsidianDraft: markdown } : note
    )));
  }

  function cancelEditingObsidianNote(noteId) {
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId
        ? {
          ...note,
          obsidianEditing: false,
          obsidianDraft: "",
          obsidianSaving: false,
          obsidianError: ""
        }
        : note
    )));
  }

  async function saveObsidianNoteEdit(noteId) {
    const note = monsterNotesRef.current.find((entry) => entry.id === noteId);
    const relativePath = note?.obsidian?.relativePath;
    if (!relativePath) return;
    const markdown = typeof note.obsidianDraft === "string" ? note.obsidianDraft : note.obsidianMarkdown || "";
    const api = window.dndSheet?.obsidian;
    if (!api?.writeNote) {
      setMonsterNotes((notes) => notes.map((entry) => (
        entry.id === noteId ? { ...entry, obsidianError: "Obsidian write API unavailable." } : entry
      )));
      return;
    }

    setMonsterNotes((notes) => notes.map((entry) => (
      entry.id === noteId ? { ...entry, obsidianSaving: true, obsidianError: "" } : entry
    )));

    try {
      const data = await api.writeNote(relativePath, markdown);
      setMonsterNotes((notes) => notes.map((entry) => {
        if (entry.kind !== "obsidian" || entry.obsidian?.relativePath !== relativePath) return entry;
        const nextNote = {
          ...entry,
          obsidian: {
            ...entry.obsidian,
            relativePath: data.relativePath || relativePath,
            fileName: data.fileName || entry.obsidian?.fileName || "",
            title: data.title || entry.obsidian?.title || "Obsidian Note"
          },
          obsidianMarkdown: data.markdown || "",
          obsidianLoading: false,
          obsidianError: "",
          obsidianUpdatedAt: Date.now()
        };
        if (entry.id === noteId) {
          return {
            ...nextNote,
            obsidianEditing: false,
            obsidianDraft: "",
            obsidianSaving: false
          };
        }
        if (entry.obsidianEditing) return entry;
        return {
          ...nextNote,
          obsidianSaving: false
        };
      }));
      refreshObsidianNotes(obsidianSearchQuery);
    } catch (error) {
      setMonsterNotes((notes) => notes.map((entry) => (
        entry.id === noteId
          ? {
            ...entry,
            obsidianSaving: false,
            obsidianError: error?.message || "Could not save Obsidian note."
          }
          : entry
      )));
    }
  }

  async function openNoteInObsidian(noteId) {
    const note = monsterNotes.find((entry) => entry.id === noteId);
    if (!note?.obsidian?.relativePath) return;
    try {
      await window.dndSheet?.obsidian?.openNote(note.obsidian.relativePath);
    } catch (error) {
      setMonsterNotes((notes) => notes.map((entry) => (
        entry.id === noteId ? { ...entry, obsidianError: error?.message || "Obsidian app could not be opened." } : entry
      )));
    }
  }

  async function openObsidianWikiLink(target, sourceNote = null) {
    const query = cleanObsidianTarget(target);
    if (!query) return;
    const normalizedQuery = normalizeSearch(query).replace(/\.md$/, "");
    try {
      const api = window.dndSheet?.obsidian;
      const notes = await api?.listNotes(query);
      const match = (Array.isArray(notes) ? notes : []).find((note) => {
        const title = normalizeSearch(note.title);
        const fileName = normalizeSearch(String(note.fileName || "").replace(/\.md$/, ""));
        const relativePath = normalizeSearch(String(note.relativePath || "").replace(/\.md$/, ""));
        return title === normalizedQuery || fileName === normalizedQuery || relativePath.endsWith(normalizedQuery);
      }) || notes?.[0];
      if (match) {
        const spawnPoint = sourceNote
          ? clampBoardPoint({ x: sourceNote.x + 36, y: sourceNote.y + 36 }, NOTE_MIN_WIDTH, NOTE_MIN_HEIGHT)
          : null;
        addObsidianNote(match, spawnPoint);
        return;
      }
    } catch (_error) {
      // Fall through to the picker with the target prefilled.
    }
    const spawnPoint = sourceNote
      ? clampBoardPoint({ x: sourceNote.x + 36, y: sourceNote.y + 36 }, NOTE_MIN_WIDTH, NOTE_MIN_HEIGHT)
      : null;
    openObsidianPicker(spawnPoint, { search: query });
  }

  function openExternalLink(url) {
    if (!/^https?:\/\//i.test(String(url || ""))) return;
    window.open(url, "_blank", "noopener,noreferrer");
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

  function openHomebrewMonsterModal() {
    if (!contextMenu) return;
    setHomebrewMonsterSpawnPoint({ x: contextMenu.boardX, y: contextMenu.boardY });
    setHomebrewModalTab("monster");
    setHomebrewMonsterDraft(HOMEBREW_MONSTER_DEFAULTS);
    setHomebrewItemDraft(HOMEBREW_ITEM_DEFAULTS);
    setHomebrewSpellDraft(HOMEBREW_SPELL_DEFAULTS);
    setIsHomebrewMonsterModalOpen(true);
    setContextMenu(null);
  }

  function closeHomebrewMonsterModal() {
    setIsHomebrewMonsterModalOpen(false);
    setHomebrewMonsterSpawnPoint(null);
  }

  function addHomebrewNote() {
    if (homebrewModalTab === "item") {
      const entry = homebrewItemFromDraft(homebrewItemDraft);
      addBoardNote({ kind: "item", entry, entryCustom: entry, width: 520, height: 560 }, homebrewMonsterSpawnPoint);
      closeHomebrewMonsterModal();
      return;
    }
    if (homebrewModalTab === "spell") {
      const entry = homebrewSpellFromDraft(homebrewSpellDraft);
      addBoardNote({ kind: "spell", entry, entryCustom: entry, width: 520, height: 560 }, homebrewMonsterSpawnPoint);
      closeHomebrewMonsterModal();
      return;
    }
    const monster = homebrewMonsterFromDraft(homebrewMonsterDraft);
    addBoardNote({ kind: "monster", monster, monsterCustom: monster }, homebrewMonsterSpawnPoint);
    closeHomebrewMonsterModal();
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
    const obsidian = payload.obsidian || null;
    const hpAverage = monster?.hp?.average ?? "";
    const characterHp = character?.hpMax || character?.hpCurrent || "";
    setMonsterNotes((notes) => [
      ...notes,
      {
        id: `${payload.kind}-${(monster || payload.entry || character)?.name || obsidian?.relativePath || "note"}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: payload.kind,
        monster,
        monsterCustom: payload.monsterCustom || null,
        character,
        entry: payload.entry || null,
        entryCustom: payload.entryCustom || null,
        textTitle: payload.textTitle || "",
        textContent: payload.textContent || "",
        obsidian,
        obsidianMarkdown: payload.obsidianMarkdown || "",
        obsidianLoading: Boolean(payload.obsidianLoading),
        obsidianError: payload.obsidianError || "",
        obsidianEditing: false,
        obsidianDraft: "",
        obsidianSaving: false,
        obsidianUpdatedAt: payload.obsidianUpdatedAt || null,
        titleOverride: typeof payload.titleOverride === "string" ? payload.titleOverride : "",
        parentNoteId: null,
        tabNoteIds: [],
        activeTabId: null,
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
      monsterCustom: source.monsterCustom,
      character: source.character,
      entry: source.entry,
      entryCustom: source.entryCustom,
      textTitle: source.textTitle,
      textContent: source.textContent,
      titleOverride: source.titleOverride || "",
      width: source.width,
      height: source.height,
      obsidian: source.obsidian,
      obsidianMarkdown: source.obsidianMarkdown,
      obsidianLoading: source.obsidianLoading,
      obsidianError: source.obsidianError,
      obsidianEditing: false,
      obsidianDraft: "",
      obsidianSaving: false,
      obsidianUpdatedAt: source.obsidianUpdatedAt,
      hpCurrent: source.hpCurrent,
      hpMax: source.hpMax
    }, { x: source.x + 28, y: source.y + 28 });
  }

  function updateTextNote(noteId, textContent) {
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? { ...note, textContent } : note
    )));
  }

  function editMonsterNote(noteId, pathParts, value) {
    if (!Array.isArray(pathParts) || !pathParts.length) return;
    setMonsterNotes((notes) => notes.map((note) => {
      if (note.id !== noteId || note.kind !== "monster") return note;
      const baseMonster = cloneForBoardState(note.monsterCustom || note.monster) || {};
      const monsterCustom = updateObjectPath(baseMonster, pathParts, value);
      return {
        ...note,
        monster: monsterCustom,
        monsterCustom
      };
    }));
  }

  function findMonsterSectionDropTarget(clientX, clientY, sourceNoteId = "") {
    const sections = Array.from(document.querySelectorAll("[data-monster-section-drop='true']"));
    return sections.find((section) => {
      const targetNoteId = section.dataset.dropNoteId || "";
      if (!targetNoteId || targetNoteId === sourceNoteId) return false;
      const rect = section.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }) || null;
  }

  function addResourceNoteToMonsterSection(resourceNoteId, targetNoteId, sectionKey) {
    if (!resourceNoteId || !targetNoteId || !sectionKey) return false;
    const resourceNote = monsterNotesRef.current.find((note) => note.id === resourceNoteId);
    if (!["spell", "item"].includes(resourceNote?.kind) || !resourceNote.entry) return false;
    const sectionEntry = resourceNote.kind === "spell"
      ? spellMonsterSectionEntry(resourceNote.entry)
      : itemMonsterSectionEntry(resourceNote.entry);
    setMonsterNotes((notes) => notes.map((note) => {
      if (note.id !== targetNoteId || note.kind !== "monster") return note;
      const baseMonster = cloneForBoardState(note.monsterCustom || note.monster) || {};
      const currentEntries = Array.isArray(baseMonster[sectionKey]) ? baseMonster[sectionKey] : [];
      const monsterCustom = updateObjectPath(baseMonster, [sectionKey], [...currentEntries, sectionEntry]);
      return {
        ...note,
        monster: monsterCustom,
        monsterCustom
      };
    }));
    return true;
  }

  function renameNote(noteId, nextTitle) {
    const normalizedTitle = String(nextTitle || "").trim();
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? { ...note, titleOverride: normalizedTitle } : note
    )));
  }

  function promoteTabToRoot(notes, rootId, nextRootId) {
    return promoteTabToRootInCollection(notes, rootId, nextRootId);
  }

  function closeSingleTab(noteId) {
    setMonsterNotes((notes) => closeSingleNoteInCollection(notes, noteId));
  }

  function detachTabFromRoot(noteId, rootId, boardPoint = null) {
    const nextZ = zRef.current + 1;
    zRef.current = nextZ;
    setMonsterNotes((notes) => {
      const root = notes.find((note) => note.id === rootId);
      if (!root) return notes;
      const detached = notes.find((note) => note.id === noteId);
      if (!detached) return notes;
      const width = detached.minimized ? clamp(detached.width, 220, 340) : detached.width;
      const height = detached.minimized ? 44 : detached.height;
      const point = clampBoardPoint(
        boardPoint || { x: root.x + 32, y: root.y + 32 },
        width || NOTE_DEFAULT_WIDTH,
        height || NOTE_DEFAULT_HEIGHT
      );

      if (noteId === rootId) {
        const promotedId = noteTabIds(root).find((id) => id !== rootId);
        if (!promotedId) return notes;
        return promoteTabToRoot(notes, rootId, promotedId).map((note) => (
          note.id === rootId
            ? {
              ...note,
              parentNoteId: null,
              tabNoteIds: [],
              activeTabId: null,
              x: point.x,
              y: point.y,
              z: nextZ,
              minimized: false
            }
            : note
        ));
      }

      const fallbackActiveId = root.activeTabId === noteId
        ? (noteTabIds(root).find((id) => id !== noteId && id !== rootId) || rootId)
        : root.activeTabId;

      return notes.map((note) => {
        if (note.id === rootId) {
          return {
            ...note,
            tabNoteIds: (note.tabNoteIds || []).filter((id) => id !== noteId),
            activeTabId: fallbackActiveId
          };
        }
        if (note.id === noteId) {
          return {
            ...note,
            parentNoteId: null,
            x: point.x,
            y: point.y,
            z: nextZ,
            minimized: false
          };
        }
        return note;
      });
    });
  }

  function selectNoteTab(rootNoteId, tabNoteId) {
    focusNote(rootNoteId);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === rootNoteId ? { ...note, activeTabId: tabNoteId } : note
    )));
  }

  function groupNoteIntoRoot(dragNoteId, targetNoteId) {
    const nextZ = zRef.current + 1;
    zRef.current = nextZ;
    setMonsterNotes((notes) => {
      const dragRootId = resolveRootNoteId(dragNoteId, notes);
      const targetRootId = resolveRootNoteId(targetNoteId, notes);
      if (!dragRootId || !targetRootId || dragRootId === targetRootId) return notes;
      const dragRoot = notes.find((note) => note.id === dragRootId);
      const targetRoot = notes.find((note) => note.id === targetRootId);
      if (!dragRoot || dragRoot.parentNoteId || !targetRoot || targetRoot.parentNoteId) return notes;

      const targetTabIds = new Set(noteTabIds(targetRoot));
      const movedIds = noteTabIds(dragRoot).filter((id) => !targetTabIds.has(id));
      if (!movedIds.length) return notes;
      const nextActiveTabId = movedIds.includes(dragRoot.activeTabId) ? dragRoot.activeTabId : dragRootId;

      return notes.map((note) => {
        if (note.id === targetRootId) {
          return {
            ...note,
            tabNoteIds: [...(note.tabNoteIds || []), ...movedIds],
            activeTabId: nextActiveTabId,
            minimized: false,
            z: nextZ
          };
        }
        if (movedIds.includes(note.id)) {
          return {
            ...note,
            parentNoteId: targetRootId,
            tabNoteIds: [],
            activeTabId: null,
            minimized: false
          };
        }
        return note;
      });
    });
  }

  function closeNote(noteId) {
    setMonsterNotes((notes) => {
      const rootId = resolveRootNoteId(noteId, notes);
      if (!rootId) return notes;
      const root = notes.find((note) => note.id === rootId);
      if (!root) return notes;
      const idsToRemove = new Set(noteTabIds(root));
      return notes.filter((note) => !idsToRemove.has(note.id));
    });
  }

  function handleNoteClose(noteId, event) {
    const resolvedNoteId = isModifierEvent(noteId) ? null : noteId;
    const resolvedEvent = isModifierEvent(noteId) ? noteId : event;
    const shiftPressed = Boolean(resolvedEvent?.shiftKey || resolvedEvent?.nativeEvent?.shiftKey);
    if (!resolvedNoteId) return;
    resolvedEvent?.preventDefault?.();
    resolvedEvent?.stopPropagation?.();
    if (shiftPressed) {
      closeNote(resolvedNoteId);
      return;
    }
    closeSingleTab(resolvedNoteId);
  }

  function focusNote(noteId) {
    const rootId = resolveRootNoteId(noteId, monsterNotes);
    if (!rootId) return;
    zRef.current += 1;
    setMonsterNotes((notes) => notes.map((note) => note.id === rootId ? { ...note, z: zRef.current } : note));
  }

  function minimizeNote(noteId) {
    setMonsterNotes((notes) => {
      const rootId = resolveRootNoteId(noteId, notes);
      return notes.map((note) => (
        note.id === rootId ? { ...note, minimized: true, dicePanelOpen: false } : note
      ));
    });
  }

  function restoreNote(noteId) {
    if (suppressRestoreClickRef.current === noteId) return;
    focusNote(noteId);
    setMonsterNotes((notes) => {
      const rootId = resolveRootNoteId(noteId, notes);
      return notes.map((note) => (
        note.id === rootId ? { ...note, minimized: false } : note
      ));
    });
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

  function addFreeDie(sides) {
    setFreeDiceSelection((selection) => ({
      ...selection,
      [sides]: Number(selection?.[sides] || 0) + 1
    }));
  }

  function removeFreeDie(sides) {
    setFreeDiceSelection((selection) => ({
      ...selection,
      [sides]: Math.max(0, Number(selection?.[sides] || 0) - 1)
    }));
  }

  function resetFreeDiceSelection() {
    setFreeDiceSelection(createFreeDiceSelection());
  }

  function clearFreeDiceRolls() {
    setFreeDiceRolls([]);
  }

  function rollFreeDiceSelection() {
    const expression = formatFreeDiceExpression(freeDiceSelection);
    if (!expression) return;
    const roll = rollDiceExpression(expression);
    setFreeDiceOpen(true);
    setFreeDiceRolls((rolls) => [{
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      roll
    }, ...rolls].slice(0, 12));
  }

  function openBoardContextMenu(event) {
    if (event.target?.closest?.("[data-dm-note='true'], [data-monster-picker='true'], [data-obsidian-picker='true'], [data-context-menu='true'], [data-character-code-modal='true'], [data-homebrew-monster-modal='true'], [data-board-control='true']")) return;
    event.preventDefault();
    const viewportWidth = window.innerWidth || 1200;
    const viewportHeight = window.innerHeight || 800;
    const boardPoint = clampBoardPoint(screenToBoardPoint(event.clientX, event.clientY), NOTE_MIN_WIDTH, NOTE_MIN_HEIGHT);
    setContextMenu({
      x: clamp(event.clientX, 8, viewportWidth - 180),
      y: clamp(event.clientY, 8, viewportHeight - 260),
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

  function openContextObsidianPicker() {
    if (!contextMenu) return;
    openObsidianPicker({ x: contextMenu.boardX, y: contextMenu.boardY });
  }

  function openContextTextNote() {
    if (!contextMenu) return;
    addTextNote({ x: contextMenu.boardX, y: contextMenu.boardY });
  }

  function shouldIgnoreBoardPointer(event) {
    return Boolean(event.target?.closest?.("[data-dm-note='true'], [data-monster-picker='true'], [data-obsidian-picker='true'], [data-context-menu='true'], [data-character-code-modal='true'], [data-homebrew-monster-modal='true'], [data-board-control='true']"));
  }

  function startBoardPan(event) {
    if (event.button != null && event.button !== 0 && event.button !== 1) return;
    if (dragRef.current || resizeRef.current || selectionRef.current || shouldIgnoreBoardPointer(event)) return;
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

  function startBoardSelection(event) {
    if (event.button != null && event.button !== 0) return;
    if (dragRef.current || resizeRef.current || panRef.current || shouldIgnoreBoardPointer(event)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const startPoint = screenToBoardPoint(event.clientX, event.clientY);
    const append = Boolean(event.shiftKey || event.ctrlKey || event.metaKey);
    selectionRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPoint,
      append,
      baseIds: append ? selectedRootNoteIds.slice() : [],
      moved: false
    };
    setSelectionBox({ x: startPoint.x, y: startPoint.y, width: 0, height: 0 });
  }

  function handleBoardPointerDown(event) {
    closeBoardContextMenu(event);
    if (event.altKey || event.button === 1) startBoardPan(event);
    else startBoardSelection(event);
  }

  function handleBoardWheel(event) {
    if (shouldIgnoreBoardPointer(event)) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    zoomBoardBy(direction * BOARD_ZOOM_STEP, { x: event.clientX, y: event.clientY });
  }

  function findDragDropTarget(noteId, point, notes) {
    const rootId = resolveRootNoteId(noteId, notes);
    return notes
      .filter((note) => !note.parentNoteId && note.id !== rootId)
      .sort((left, right) => (right.z || 0) - (left.z || 0))
      .find((note) => {
        const width = note.minimized ? clamp(note.width, 220, 340) : note.width;
        const height = note.minimized ? 44 : note.height;
        return point.x >= note.x && point.x <= note.x + width && point.y >= note.y && point.y <= note.y + height;
      })?.id || null;
  }

  function startTabDrag(event, noteId) {
    if (event.button != null && event.button !== 0) return;
    const rootId = resolveRootNoteId(noteId, monsterNotes);
    if (!rootId) return;
    const note = monsterNotes.find((entry) => entry.id === noteId);
    const root = monsterNotes.find((entry) => entry.id === rootId);
    if (!note || !root) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    tabDragRef.current = {
      pointerId: event.pointerId,
      noteId,
      rootId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      width: note.minimized ? clamp(note.width, 220, 340) : note.width,
      height: note.minimized ? 44 : note.height
    };
  }

  function startDrag(event, noteId) {
    if (event.button != null && event.button !== 0) return;
    if (resizeRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rootId = resolveRootNoteId(noteId, monsterNotes);
    const note = monsterNotes.find((entry) => entry.id === rootId);
    if (!note) return;
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      setSelectedRootNoteIds((ids) => (
        ids.includes(rootId) ? ids.filter((id) => id !== rootId) : [...ids, rootId]
      ));
      focusNote(rootId);
      return;
    }
    const rootNotes = monsterNotes.filter((entry) => !entry.parentNoteId);
    const selectedDragIds = selectedRootNoteIds.includes(rootId)
      ? selectedRootNoteIds.filter((id) => rootNotes.some((entry) => entry.id === id))
      : [rootId];
    const dragNotes = rootNotes.filter((entry) => selectedDragIds.includes(entry.id));
    if (!selectedRootNoteIds.includes(rootId)) setSelectedRootNoteIds([rootId]);
    zRef.current += dragNotes.length;
    const firstZ = zRef.current - dragNotes.length + 1;
    const zById = new Map(dragNotes.map((entry, index) => [entry.id, firstZ + index]));
    setMonsterNotes((notes) => notes.map((entry) => (
      zById.has(entry.id) ? { ...entry, z: zById.get(entry.id) } : entry
    )));
    const startPositions = Object.fromEntries(dragNotes.map((entry) => {
      const rect = noteFrameRect(entry);
      return [entry.id, {
        x: entry.x,
        y: entry.y,
        width: rect.width,
        height: rect.height
      }];
    }));
    const primaryRect = startPositions[rootId] || noteFrameRect(note);
    dragRef.current = {
      noteId: rootId,
      noteIds: dragNotes.map((entry) => entry.id),
      startPositions,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      moved: false,
      dropTargetNoteId: null,
      startNoteX: note.x,
      startNoteY: note.y,
      width: primaryRect.width,
      height: primaryRect.height,
      scale: boardViewRef.current.scale
    };
  }

  function startResize(event, noteId, edge) {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rootId = resolveRootNoteId(noteId, monsterNotes);
    focusNote(rootId);
    const note = monsterNotes.find((entry) => entry.id === rootId);
    if (!note) return;
    resizeRef.current = {
      noteId: rootId,
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
    const selection = selectionRef.current;
    if (selection?.pointerId === event.pointerId) {
      const currentPoint = screenToBoardPoint(event.clientX, event.clientY);
      const rect = normalizeRectFromPoints(selection.startPoint, currentPoint);
      if (Math.abs(event.clientX - selection.startClientX) > 4 || Math.abs(event.clientY - selection.startClientY) > 4) selection.moved = true;
      setSelectionBox(rect);
      const hitIds = visibleNotes
        .filter((note) => rectsIntersect(rect, noteFrameRect(note)))
        .map((note) => note.id);
      const nextIds = selection.append ? [...selection.baseIds] : [];
      hitIds.forEach((id) => {
        if (!nextIds.includes(id)) nextIds.push(id);
      });
      setSelectedRootNoteIds(nextIds);
      return;
    }

    const tabDrag = tabDragRef.current;
    if (tabDrag?.pointerId === event.pointerId) {
      if (Math.abs(event.clientX - tabDrag.startClientX) > 6 || Math.abs(event.clientY - tabDrag.startClientY) > 6) {
        const boardPoint = clampBoardPoint(screenToBoardPoint(event.clientX, event.clientY), tabDrag.width, tabDrag.height);
        detachTabFromRoot(tabDrag.noteId, tabDrag.rootId, boardPoint);
        dragRef.current = {
          noteId: tabDrag.noteId,
          noteIds: [tabDrag.noteId],
          startPositions: {
            [tabDrag.noteId]: {
              x: boardPoint.x,
              y: boardPoint.y,
              width: tabDrag.width,
              height: tabDrag.height
            }
          },
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          lastClientX: event.clientX,
          lastClientY: event.clientY,
          moved: true,
          dropTargetNoteId: null,
          startNoteX: boardPoint.x,
          startNoteY: boardPoint.y,
          width: tabDrag.width,
          height: tabDrag.height,
          scale: boardViewRef.current.scale
        };
        tabDragRef.current = null;
      }
      return;
    }

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
    drag.lastClientX = event.clientX;
    drag.lastClientY = event.clientY;
    const deltaX = (event.clientX - drag.startClientX) / drag.scale;
    const deltaY = (event.clientY - drag.startClientY) / drag.scale;
    const nextPoint = clampBoardPoint({
      x: drag.startNoteX + deltaX,
      y: drag.startNoteY + deltaY
    }, drag.width, drag.height);
    const nextX = nextPoint.x;
    const nextY = nextPoint.y;
    const isGroupDrag = Array.isArray(drag.noteIds) && drag.noteIds.length > 1;
    const dropTargetId = isGroupDrag ? null : findDragDropTarget(drag.noteId, { x: nextX + drag.width / 2, y: nextY + drag.height / 2 }, monsterNotes);
    drag.dropTargetNoteId = dropTargetId;
    setDropTargetNoteId((current) => current === dropTargetId ? current : dropTargetId);
    const startPositions = drag.startPositions || {};
    const draggedIds = Array.isArray(drag.noteIds) && drag.noteIds.length ? drag.noteIds : [drag.noteId];
    setMonsterNotes((notes) => notes.map((note) => {
      if (!draggedIds.includes(note.id)) return note;
      const start = startPositions[note.id];
      if (!start) return note;
      const point = clampBoardPoint({
        x: start.x + deltaX,
        y: start.y + deltaY
      }, start.width, start.height);
      return { ...note, x: point.x, y: point.y };
    }));
  }

  function stopDrag(event) {
    if (selectionRef.current?.pointerId === event.pointerId) {
      const completedSelection = selectionRef.current;
      selectionRef.current = null;
      setSelectionBox(null);
      if (!completedSelection.moved && !completedSelection.append) setSelectedRootNoteIds([]);
    }
    if (tabDragRef.current?.pointerId === event.pointerId) tabDragRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) {
      const completedDrag = dragRef.current;
      if (dragRef.current.moved) {
        const suppressedNoteId = dragRef.current.noteId;
        suppressRestoreClickRef.current = suppressedNoteId;
        setTimeout(() => {
          if (suppressRestoreClickRef.current === suppressedNoteId) suppressRestoreClickRef.current = null;
        }, 200);
      }
      dragRef.current = null;
      setDropTargetNoteId(null);
      const resourceDropTarget = completedDrag.moved && (!completedDrag.noteIds || completedDrag.noteIds.length <= 1)
        ? findMonsterSectionDropTarget(completedDrag.lastClientX ?? event.clientX, completedDrag.lastClientY ?? event.clientY, completedDrag.noteId)
        : null;
      if (resourceDropTarget && addResourceNoteToMonsterSection(completedDrag.noteId, resourceDropTarget.dataset.dropNoteId, resourceDropTarget.dataset.dropSection)) {
        return;
      }
      if (completedDrag.moved && completedDrag.dropTargetNoteId && (!completedDrag.noteIds || completedDrag.noteIds.length <= 1)) {
        groupNoteIntoRoot(completedDrag.noteId, completedDrag.dropTargetNoteId);
      }
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
        collapsed={livePlayersCollapsed}
        onToggleCollapsed={() => setLivePlayersCollapsed((value) => !value)}
        onPortChange={setLiveHostPort}
        onStart={startLiveHost}
        onStop={stopLiveHost}
        onKick={kickLivePlayer}
      />
      <GlobalDiceTray
        isOpen={freeDiceOpen}
        selection={freeDiceSelection}
        rolls={freeDiceRolls}
        onToggle={() => setFreeDiceOpen((open) => !open)}
        onClose={() => setFreeDiceOpen(false)}
        onAddDie={addFreeDie}
        onRemoveDie={removeFreeDie}
        onResetSelection={resetFreeDiceSelection}
        onClearRolls={clearFreeDiceRolls}
        onRoll={rollFreeDiceSelection}
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

        {visibleNotes.map((rootNote) => {
          const tabs = groupTabNotes(rootNote, monsterNotes);
          const activeNote = tabs.find((note) => note.id === rootNote.activeTabId) || rootNote;
          const tabBar = tabs.length > 1 ? (
            <NoteTabBar
              notes={tabs}
              activeTabId={activeNote.id}
              onSelectTab={(tabId) => selectNoteTab(rootNote.id, tabId)}
              onCloseTab={handleNoteClose}
              onStartTabDrag={startTabDrag}
            />
          ) : null;
          const sharedProps = {
            key: rootNote.id,
            note: activeNote,
            shellNote: rootNote,
            actionNoteId: activeNote.id,
            tabBar,
            isDropTarget: dropTargetNoteId === rootNote.id,
            onRename: renameNote,
            onClose: handleNoteClose,
            onFocus: () => focusNote(rootNote.id),
            onDragStart: startDrag,
            onRoll: recordMonsterRoll,
            onToggleDice: toggleMonsterDicePanel,
            onResizeStart: startResize,
            onMinimize: minimizeNote,
            onRestore: restoreNote,
            onDuplicate: duplicateNote
          };
          return activeNote.kind === "monster" ? (
            <MonsterNote
              {...sharedProps}
              onHpChange={updateNoteHp}
              onRollHp={rollNoteHp}
              onMonsterEdit={editMonsterNote}
            />
          ) : activeNote.kind === "character" ? (
            <CharacterNote
              {...sharedProps}
              onHpChange={updateNoteHp}
              onOpenResource={addCharacterResourceNote}
            />
          ) : activeNote.kind === "text" ? (
            <TextNote
              {...sharedProps}
              onTextChange={updateTextNote}
            />
          ) : activeNote.kind === "obsidian" ? (
            <ObsidianNote
              {...sharedProps}
              onRefresh={refreshObsidianNote}
              onOpenInObsidian={openNoteInObsidian}
              onStartEdit={startEditingObsidianNote}
              onChangeEdit={updateObsidianNoteDraft}
              onCancelEdit={cancelEditingObsidianNote}
              onSaveEdit={saveObsidianNoteEdit}
              onOpenWiki={openObsidianWikiLink}
              onOpenExternal={openExternalLink}
            />
          ) : (
            <ResourceNote
              {...sharedProps}
            />
          );
        })}

        {visibleNotes.filter((note) => selectedRootNoteIdSet.has(note.id)).map((note) => {
          const rect = noteFrameRect(note);
          return (
            <div
              key={`selected-${note.id}`}
              className="pointer-events-none absolute border-2 border-sky-300 ring-2 ring-sky-300/30"
              style={{
                left: rect.x - 3,
                top: rect.y - 3,
                width: rect.width + 6,
                height: rect.height + 6,
                zIndex: (note.z || 0) + 2
              }}
            />
          );
        })}

        {selectionBox ? (
          <div
            className="pointer-events-none absolute border border-sky-300 bg-sky-300/15"
            style={{
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.width,
              height: selectionBox.height,
              zIndex: 100000
            }}
          />
        ) : null}
      </div>

      {!visibleNotes.length ? (
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
            onClick={openHomebrewMonsterModal}
          >
            <span>Add Homebrew</span>
            <span className="text-neutral-500">+</span>
          </button>
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-amber-500 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
            type="button"
            onClick={openContextTextNote}
          >
            <span>Add Text Note</span>
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
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-amber-500 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
            type="button"
            onClick={openContextObsidianPicker}
          >
            <span>Add Obsidian Note</span>
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
      <HomebrewMonsterModal
        isOpen={isHomebrewMonsterModalOpen}
        activeTab={homebrewModalTab}
        monsterDraft={homebrewMonsterDraft}
        itemDraft={homebrewItemDraft}
        spellDraft={homebrewSpellDraft}
        onTabChange={setHomebrewModalTab}
        onMonsterChange={setHomebrewMonsterDraft}
        onItemChange={setHomebrewItemDraft}
        onSpellChange={setHomebrewSpellDraft}
        onClose={closeHomebrewMonsterModal}
        onSubmit={addHomebrewNote}
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
      <ObsidianPicker
        isOpen={isObsidianPickerOpen}
        vault={obsidianVault}
        notes={filteredObsidianNotes}
        selectedNote={selectedObsidianNote}
        searchQuery={obsidianSearchQuery}
        loading={obsidianPickerLoading}
        error={obsidianPickerError}
        onSearch={setObsidianSearchQuery}
        onSelect={setSelectedObsidianNote}
        onSelectVault={selectObsidianVault}
        onClearVault={clearObsidianVault}
        onRefresh={() => refreshObsidianNotes(obsidianSearchQuery)}
        onAdd={addObsidianNote}
        onClose={() => setIsObsidianPickerOpen(false)}
      />
    </main>
  );
}

createRoot(document.getElementById("root")).render(<DmScreenApp />);
