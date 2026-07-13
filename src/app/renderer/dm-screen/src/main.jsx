import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

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
let bestiary = [];
let spells = [];
let ITEM_LIBRARY = [];
let ITEM_PROPERTY_LOOKUP = new Map();
let ITEM_TYPE_LOOKUP = new Map();
let ITEM_MASTERY_LOOKUP = new Map();
let dmScreenLibrariesPromise = null;
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
const MONSTER_NOTE_DEFAULT_WIDTH = 680;
const NOTE_DEFAULT_HEIGHT = 620;
const BOARD_WIDTH = 20000;
const BOARD_HEIGHT = 20000;
const BOARD_PADDING = 12;
const BOARD_MIN_ZOOM = 0.08;
const BOARD_MAX_ZOOM = 1.8;
const BOARD_ZOOM_STEP = 0.15;
const DM_BOARD_STORAGE_KEY = "dnd-dm-screen-board-v1";
const DM_LIVE_PLAYERS_PANEL_STORAGE_KEY = "dnd-dm-screen-live-players-panel-v1";
const DM_SOUND_BAR_PANEL_STORAGE_KEY = "dnd-dm-screen-sound-bar-panel-v1";
const DM_MAP_IMAGE_DB_NAME = "dnd-dm-screen-map-images-v1";
const DM_MAP_IMAGE_STORE_NAME = "map-images";
const DM_SOUND_DB_NAME = "dnd-dm-screen-sounds-v1";
const DM_SOUND_STORE_NAME = "sounds";
const DM_BOARD_SAVE_DEBOUNCE_MS = 700;
const MONSTER_TOKEN_BASE_PATH = "../../../Tokens";
const MAP_TOKEN_SIZE = 56;
const MAP_TOKEN_ANONYMOUS_NAME = "Criatura desconocida";
const MAP_MARKER_SIZE = 28;
const MAP_MARKER_SHAPE_MIN_SIZE = 24;
const MAP_MARKER_SHAPE_DEFAULT_SIZE = 120;
const FOG_REVEAL_POINT_LIMIT = 1200;
const MAP_FOG_BRUSH_MIN_SIZE = 8;
const MAP_FOG_BRUSH_MAX_SIZE = 360;
const MAP_FOG_BRUSH_KEY_STEP = 10;
const VVT_PING_TTL_MS = 5000;
const MAP_LOCAL_MIN_ZOOM = 1;
const MAP_LOCAL_MAX_ZOOM = 4;
const DEFAULT_MAP_GRID = {
  enabled: false,
  snap: false,
  cellWidth: 70,
  cellHeight: 70,
  offsetX: 0,
  offsetY: 0
};
const DEFAULT_MAP_FOG = {
  enabled: true,
  brushSize: 90,
  brushShape: "circle",
  revealed: []
};
const mapImageShareSnapshotCache = new Map();
const MAP_FOG_BRUSH_SHAPES = new Set(["circle", "square"]);
const MAP_MARKER_FORM_TYPES = new Set(["cone", "square", "circle"]);
const MAP_MARKER_FORM_LABELS = {
  cone: "Cono",
  square: "Cuadrado",
  circle: "Circulo"
};
const MAP_MARKER_ICON_OPTIONS = [
  { value: "marker", label: "Marker" },
  { value: "shop", label: "Tienda" },
  { value: "tavern", label: "Taberna" },
  { value: "inn", label: "Posada" },
  { value: "swords", label: "Espadas" },
  { value: "shield", label: "Escudo" },
  { value: "castle", label: "Castillo" },
  { value: "temple", label: "Templo" },
  { value: "camp", label: "Campamento" },
  { value: "cave", label: "Cueva" },
  { value: "treasure", label: "Tesoro" },
  { value: "danger", label: "Peligro" },
  { value: "quest", label: "Quest" },
  { value: "portal", label: "Portal" }
];
const MAP_MARKER_ICON_VALUES = new Set(MAP_MARKER_ICON_OPTIONS.map((option) => option.value));
const MAP_MARKER_OPACITY_MIN = 0.08;
const MAP_MARKER_OPACITY_MAX = 0.85;
const MAP_MARKER_OPACITY_DEFAULT = 0.32;
const MAP_MARKER_COLOR_OPTIONS = [
  { value: "#f97316", label: "Naranja" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#eab308", label: "Amarillo" },
  { value: "#84cc16", label: "Lima" },
  { value: "#22c55e", label: "Verde" },
  { value: "#10b981", label: "Esmeralda" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#38bdf8", label: "Celeste" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#a855f7", label: "Violeta" },
  { value: "#d946ef", label: "Magenta" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#ef4444", label: "Rojo" },
  { value: "#7f1d1d", label: "Marron" },
  { value: "#64748b", label: "Gris" },
  { value: "#111827", label: "Negro" },
  { value: "#f8fafc", label: "Blanco" }
];
const MAP_MARKER_PATTERN_OPTIONS = [
  { value: "none", label: "None", glyph: "" },
  { value: "acid", label: "Acid", glyph: "\\u2623" },
  { value: "blinded", label: "Blinded", glyph: "\\u25D0" },
  { value: "charmed", label: "Charmed", glyph: "\\u2665" },
  { value: "cold", label: "Cold", glyph: "\\u2744" },
  { value: "deafened", label: "Deafened", glyph: "\\u266B" },
  { value: "disease", label: "Disease", glyph: "\\u2739" },
  { value: "difficult-terrain", label: "Difficult Terrain", glyph: "\\u224B" },
  { value: "exhaustion", label: "Exhaustion", glyph: "\\u25D2" },
  { value: "fire", label: "Fire", glyph: "\\u25B2" },
  { value: "force", label: "Force", glyph: "\\u25C6" },
  { value: "frightened", label: "Frightened", glyph: "!" },
  { value: "grappled", label: "Grappled", glyph: "\\u267E" },
  { value: "incapacitated", label: "Incapacitated", glyph: "\\u2715" },
  { value: "invisible", label: "Invisible", glyph: "\\u25CC" },
  { value: "lightning", label: "Lightning", glyph: "\\u26A1" },
  { value: "necrotic", label: "Necrotic", glyph: "\\u2625" },
  { value: "paralyzed", label: "Paralyzed", glyph: "\\u275A" },
  { value: "petrified", label: "Petrified", glyph: "\\u25A3" },
  { value: "poison", label: "Poison", glyph: "\\u2620" },
  { value: "prone", label: "Prone", glyph: "\\u2014" },
  { value: "psychic", label: "Psychic", glyph: "\\u2726" },
  { value: "radiant", label: "Radiant", glyph: "\\u2600" },
  { value: "restrained", label: "Restrained", glyph: "#" },
  { value: "stunned", label: "Stunned", glyph: "\\u2736" },
  { value: "thunder", label: "Thunder", glyph: "\\u25CE" },
  { value: "unconscious", label: "Unconscious", glyph: "Z" }
];
const MAP_MARKER_PATTERN_VALUES = new Set(MAP_MARKER_PATTERN_OPTIONS.map((option) => option.value));
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
const CHARACTER_ABILITY_FIELD_KEYS = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA"
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

function encodePathSegment(value) {
  return encodeURIComponent(String(value || "").trim()).replace(/'/g, "%27");
}

function monsterTokenSourceCandidates(monster) {
  const source = String(monster?.source || "").trim();
  const aliases = {
    XMM: ["MM"],
    XPHB: ["MM"],
    MPMM: ["VGM", "MM"],
    MTF: ["VGM", "MM"]
  };
  return [...new Set([source, ...(aliases[source] || [])].filter(Boolean))];
}

function monsterTokenNameCandidates(monster) {
  const name = String(monster?.name || "").trim();
  if (!name) return [];
  return [...new Set([
    name,
    name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim(),
    name.replace(/[/:]/g, "-")
  ].filter(Boolean))];
}

function monsterTokenUrls(monster) {
  const sources = monsterTokenSourceCandidates(monster);
  const names = monsterTokenNameCandidates(monster);
  const urls = [];
  sources.forEach((source) => {
    names.forEach((name) => {
      urls.push(`${MONSTER_TOKEN_BASE_PATH}/${encodePathSegment(source)}/${encodePathSegment(name)}.png`);
    });
  });
  urls.push(`${MONSTER_TOKEN_BASE_PATH}/default.png`);
  return [...new Set(urls)];
}

function monsterTokenRequest(monster) {
  return {
    sources: monsterTokenSourceCandidates(monster),
    names: monsterTokenNameCandidates(monster)
  };
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
  if (note?.kind === "map") return note?.titleOverride || note?.mapImage?.name || "VVT Map";
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

function noteTabFrameSize(note, fallback = null) {
  return {
    width: clamp(
      Number(note?.tabFrameWidth ?? note?.width ?? fallback?.width) || NOTE_DEFAULT_WIDTH,
      NOTE_MIN_WIDTH,
      BOARD_WIDTH - BOARD_PADDING * 2
    ),
    height: clamp(
      Number(note?.tabFrameHeight ?? note?.height ?? fallback?.height) || NOTE_DEFAULT_HEIGHT,
      NOTE_MIN_HEIGHT,
      BOARD_HEIGHT - BOARD_PADDING * 2
    )
  };
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
  const nextRootSize = noteTabFrameSize(nextRoot, root);

  return notes.map((note) => {
    if (note.id === nextRootId) {
      return {
        ...note,
        parentNoteId: null,
        tabNoteIds: remainingIds,
        activeTabId: nextActiveTabId,
        x: root.x,
        y: root.y,
        width: nextRootSize.width,
        height: nextRootSize.height,
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
  const noteToClose = notes.find((note) => note.id === noteId) || root;
  if (mapNoteHasTokens(noteToClose)) return notes;
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
  const fallbackActiveNote = notes.find((note) => note.id === fallbackActiveId) || root;
  const fallbackSize = noteTabFrameSize(fallbackActiveNote, root);

  return notes
    .filter((note) => note.id !== noteId)
    .map((note) => (
      note.id === rootId
        ? {
          ...note,
          tabNoteIds: (note.tabNoteIds || []).filter((id) => id !== noteId),
          activeTabId: fallbackActiveId,
          width: fallbackSize.width,
          height: fallbackSize.height
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

function storedImageSnapshot(image) {
  if (!image?.dataUrl) return null;
  return {
    id: image.id || `image-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: image.name || "Imagen",
    type: image.type || "",
    size: Number(image.size) || 0,
    dataUrl: image.dataUrl || "",
    updatedAt: image.updatedAt || ""
  };
}

function restoreStoredImage(image) {
  if (!image?.dataUrl) return null;
  return {
    id: String(image.id || `image-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name: String(image.name || "Imagen"),
    type: String(image.type || ""),
    size: Number(image.size) || 0,
    dataUrl: String(image.dataUrl || ""),
    updatedAt: String(image.updatedAt || "")
  };
}

function mapImageRuntimeSnapshot(image) {
  if (!image) return null;
  return {
    id: String(image.id || image.assetId || `map-image-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    assetId: String(image.assetId || ""),
    name: String(image.name || "Mapa"),
    type: String(image.type || ""),
    size: Number(image.size) || 0,
    objectUrl: image.objectUrl || "",
    dataUrl: image.dataUrl || "",
    updatedAt: String(image.updatedAt || "")
  };
}

function mapImageStorageSnapshot(image) {
  const snapshot = mapImageRuntimeSnapshot(image);
  if (!snapshot) return null;
  const stored = {
    id: snapshot.id,
    assetId: snapshot.assetId,
    name: snapshot.name,
    type: snapshot.type,
    size: snapshot.size,
    updatedAt: snapshot.updatedAt
  };
  if (!stored.assetId && snapshot.dataUrl) stored.dataUrl = snapshot.dataUrl;
  return stored;
}

function restoreStoredMapImage(image) {
  if (!image) return null;
  const assetId = String(image.assetId || "");
  if (!assetId && !image.dataUrl) return null;
  return {
    id: String(image.id || assetId || `map-image-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    assetId,
    name: String(image.name || "Mapa"),
    type: String(image.type || ""),
    size: Number(image.size) || 0,
    dataUrl: image.dataUrl ? String(image.dataUrl) : "",
    objectUrl: "",
    updatedAt: String(image.updatedAt || "")
  };
}

function mapImageUrl(image) {
  return image?.objectUrl || image?.dataUrl || "";
}

function releaseMapImageObjectUrl(image) {
  if (!image?.objectUrl) return;
  try {
    URL.revokeObjectURL(image.objectUrl);
  } catch (_error) {
    // The browser owns object URL lifetime; stale URLs are safe to ignore.
  }
}

function mapImageWithoutObjectUrl(image) {
  return image?.objectUrl ? { ...image, objectUrl: "" } : image;
}

function releaseMapNoteImages(note) {
  if (note?.kind !== "map") return;
  const released = new Set();
  mapPagesForNote(note).forEach((page) => {
    const objectUrl = page.mapImage?.objectUrl;
    if (!objectUrl || released.has(objectUrl)) return;
    released.add(objectUrl);
    releaseMapImageObjectUrl(page.mapImage);
  });
}

function unloadMapNoteImages(note) {
  if (note?.kind !== "map") return note;
  releaseMapNoteImages(note);
  const mapPages = mapPagesForNote(note).map((page) => (
    page.mapImage?.objectUrl ? { ...page, mapImage: mapImageWithoutObjectUrl(page.mapImage) } : page
  ));
  const activePage = mapPages.find((page) => page.id === note.activeMapPageId) || mapPages[0] || null;
  return {
    ...note,
    mapPages,
    mapImage: activePage?.mapImage || mapImageWithoutObjectUrl(note.mapImage)
  };
}

function indexedDbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function openMapImageDatabase() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB no esta disponible."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DM_MAP_IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DM_MAP_IMAGE_STORE_NAME)) db.createObjectStore(DM_MAP_IMAGE_STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open the map store."));
  });
}

async function putMapImageAsset(record) {
  const db = await openMapImageDatabase();
  try {
    const transaction = db.transaction(DM_MAP_IMAGE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(DM_MAP_IMAGE_STORE_NAME);
    const completePromise = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Could not save the map."));
      transaction.onabort = () => reject(transaction.error || new Error("Could not save the map."));
    });
    await indexedDbRequest(store.put(record));
    await completePromise;
  } finally {
    db.close();
  }
}

async function getMapImageAsset(assetId) {
  if (!assetId) return null;
  const db = await openMapImageDatabase();
  try {
    const transaction = db.transaction(DM_MAP_IMAGE_STORE_NAME, "readonly");
    const store = transaction.objectStore(DM_MAP_IMAGE_STORE_NAME);
    return await indexedDbRequest(store.get(assetId));
  } finally {
    db.close();
  }
}

function openSoundDatabase() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB no esta disponible."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DM_SOUND_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DM_SOUND_STORE_NAME)) db.createObjectStore(DM_SOUND_STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open the sound store."));
  });
}

function soundRecordSnapshot(record) {
  if (!record?.id) return null;
  return {
    id: String(record.id),
    name: String(record.name || record.fileName || "Audio"),
    fileName: String(record.fileName || record.name || "audio"),
    type: String(record.type || record.blob?.type || ""),
    size: Number(record.size || record.blob?.size) || 0,
    updatedAt: String(record.updatedAt || "")
  };
}

async function putSoundAsset(record) {
  const db = await openSoundDatabase();
  try {
    const transaction = db.transaction(DM_SOUND_STORE_NAME, "readwrite");
    const store = transaction.objectStore(DM_SOUND_STORE_NAME);
    const completePromise = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Could not save the sound."));
      transaction.onabort = () => reject(transaction.error || new Error("Could not save the sound."));
    });
    await indexedDbRequest(store.put(record));
    await completePromise;
  } finally {
    db.close();
  }
}

async function getSoundAsset(soundId) {
  if (!soundId) return null;
  const db = await openSoundDatabase();
  try {
    const transaction = db.transaction(DM_SOUND_STORE_NAME, "readonly");
    const store = transaction.objectStore(DM_SOUND_STORE_NAME);
    return await indexedDbRequest(store.get(soundId));
  } finally {
    db.close();
  }
}

async function listSoundAssets() {
  const db = await openSoundDatabase();
  try {
    const transaction = db.transaction(DM_SOUND_STORE_NAME, "readonly");
    const store = transaction.objectStore(DM_SOUND_STORE_NAME);
    const records = await indexedDbRequest(store.getAll());
    return (records || [])
      .map(soundRecordSnapshot)
      .filter(Boolean)
      .sort((left, right) => String(left.name).localeCompare(String(right.name), undefined, { sensitivity: "base" }));
  } finally {
    db.close();
  }
}

async function deleteSoundAsset(soundId) {
  if (!soundId) return;
  const db = await openSoundDatabase();
  try {
    const transaction = db.transaction(DM_SOUND_STORE_NAME, "readwrite");
    const store = transaction.objectStore(DM_SOUND_STORE_NAME);
    const completePromise = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Could not delete the sound."));
      transaction.onabort = () => reject(transaction.error || new Error("Could not delete the sound."));
    });
    await indexedDbRequest(store.delete(soundId));
    await completePromise;
  } finally {
    db.close();
  }
}

function isAudioFile(file) {
  const type = String(file?.type || "");
  const name = String(file?.name || "");
  return type.startsWith("audio/") || /\.(mp3|wav|ogg|opus|webm|m4a|aac|flac)$/i.test(name);
}

function soundNameFromFile(file) {
  return String(file?.name || "Audio").replace(/\.[^.]+$/, "").trim() || "Audio";
}

async function readAudioFileAsSoundAsset(file) {
  if (!isAudioFile(file)) throw new Error("Elegi un archivo de audio.");
  const id = `sound-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const updatedAt = new Date().toISOString();
  const record = {
    id,
    name: soundNameFromFile(file),
    fileName: file.name || "audio",
    type: file.type || "",
    size: file.size || 0,
    updatedAt,
    blob: file
  };
  await putSoundAsset(record);
  return soundRecordSnapshot(record);
}

async function renameSoundAsset(soundId, name) {
  const record = await getSoundAsset(soundId);
  if (!record) throw new Error("Audio no encontrado.");
  const nextRecord = {
    ...record,
    name: sanitizeDisplayText(name, record.name || "Audio").slice(0, 80),
    updatedAt: new Date().toISOString()
  };
  await putSoundAsset(nextRecord);
  return soundRecordSnapshot(nextRecord);
}

function dataUrlToBlob(dataUrl) {
  const [header, payload] = String(dataUrl || "").split(",");
  const mime = header?.match(/^data:([^;]+);base64$/)?.[1] || "";
  if (!payload) return null;
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime || "application/octet-stream" });
}

async function readMapImageFileAsStoredImage(file, fallbackName = "Mapa") {
  if (!file || !String(file.type || "").startsWith("image/")) throw new Error("Elegi un archivo de imagen.");
  const id = `map-image-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const updatedAt = new Date().toISOString();
  await putMapImageAsset({
    id,
    name: file.name || fallbackName,
    type: file.type || "",
    size: file.size || 0,
    updatedAt,
    blob: file
  });
  return {
    id,
    assetId: id,
    name: file.name || fallbackName,
    type: file.type || "",
    size: file.size || 0,
    objectUrl: URL.createObjectURL(file),
    dataUrl: "",
    updatedAt
  };
}

async function hydrateMapImage(image) {
  const snapshot = mapImageRuntimeSnapshot(image);
  if (!snapshot || snapshot.objectUrl) return snapshot;
  if (snapshot.assetId) {
    const record = await getMapImageAsset(snapshot.assetId);
    if (record?.blob) {
      return {
        ...snapshot,
        name: snapshot.name || record.name || "Mapa",
        type: snapshot.type || record.type || "",
        size: snapshot.size || record.size || 0,
        updatedAt: snapshot.updatedAt || record.updatedAt || "",
        objectUrl: URL.createObjectURL(record.blob),
        dataUrl: ""
      };
    }
  }
  if (snapshot.dataUrl) {
    const blob = dataUrlToBlob(snapshot.dataUrl);
    if (!blob) return snapshot;
    const id = snapshot.assetId || snapshot.id || `map-image-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const updatedAt = snapshot.updatedAt || new Date().toISOString();
    await putMapImageAsset({
      id,
      name: snapshot.name || "Mapa",
      type: snapshot.type || blob.type || "",
      size: snapshot.size || blob.size || 0,
      updatedAt,
      blob
    });
    return {
      ...snapshot,
      id,
      assetId: id,
      type: snapshot.type || blob.type || "",
      size: snapshot.size || blob.size || 0,
      objectUrl: URL.createObjectURL(blob),
      dataUrl: "",
      updatedAt
    };
  }
  return snapshot;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not prepare the image for sharing."));
    reader.readAsDataURL(blob);
  });
}

function mapImageShareCacheKey(snapshot) {
  if (!snapshot) return "";
  return [
    snapshot.assetId || snapshot.id || "inline",
    snapshot.updatedAt || "",
    snapshot.size || 0,
    snapshot.dataUrl ? snapshot.dataUrl.length : 0
  ].join("|");
}

function cacheMapImageShareSnapshot(cacheKey, image) {
  if (!cacheKey) return;
  if (!mapImageShareSnapshotCache.has(cacheKey)) mapImageShareSnapshotCache.clear();
  mapImageShareSnapshotCache.set(cacheKey, image);
}

async function mapImageShareSnapshot(image) {
  const snapshot = mapImageRuntimeSnapshot(image);
  if (!snapshot) return null;
  const cacheKey = mapImageShareCacheKey(snapshot);
  if (cacheKey && mapImageShareSnapshotCache.has(cacheKey)) return mapImageShareSnapshotCache.get(cacheKey);
  let sharedImage = null;
  if (snapshot.dataUrl) {
    sharedImage = {
      name: snapshot.name,
      type: snapshot.type,
      dataUrl: snapshot.dataUrl
    };
    cacheMapImageShareSnapshot(cacheKey, sharedImage);
    return sharedImage;
  }
  if (snapshot.assetId) {
    const record = await getMapImageAsset(snapshot.assetId);
    if (record?.blob) {
      sharedImage = {
        name: snapshot.name || record.name,
        type: snapshot.type || record.type || record.blob.type || "",
        dataUrl: await blobToDataUrl(record.blob)
      };
      cacheMapImageShareSnapshot(cacheKey, sharedImage);
      return sharedImage;
    }
  }
  if (snapshot.objectUrl) {
    const response = await fetch(snapshot.objectUrl);
    const blob = await response.blob();
    sharedImage = {
      name: snapshot.name,
      type: snapshot.type || blob.type || "",
      dataUrl: await blobToDataUrl(blob)
    };
    cacheMapImageShareSnapshot(cacheKey, sharedImage);
    return sharedImage;
  }
  const hydrated = await hydrateMapImage(snapshot);
  if (hydrated?.dataUrl || hydrated?.objectUrl) return mapImageShareSnapshot(hydrated);
  return null;
}

function anonymizeMapTokenShareSnapshot(snapshot) {
  if (snapshot?.kind !== "monster" || !snapshot.identityHidden) return snapshot;
  return {
    ...snapshot,
    name: MAP_TOKEN_ANONYMOUS_NAME,
    monster: null,
    monsterCustom: null,
    image: null,
    imageUnchanged: false,
    ac: "",
    hpCurrent: "",
    hpMax: "",
    initiative: "",
    initiativeDetail: "",
    actorNote: null
  };
}

function hideMapTokenShareName(snapshot) {
  if (snapshot?.kind !== "monster" || !snapshot.nameHidden) return snapshot;
  return {
    ...snapshot,
    name: MAP_TOKEN_ANONYMOUS_NAME
  };
}

function mapTokenEmbeddedImage(token) {
  return normalizeMapTokenImage(
    token?.image
    || token?.monsterCustom?.tokenImage
    || token?.monster?.tokenImage
  );
}

function mapTokenEmbeddedImageKey(token) {
  const image = mapTokenEmbeddedImage(token);
  if (!image?.dataUrl) return "";
  return `${image.id}|${image.type}|${image.dataUrl.length}`;
}

async function mapTokenShareSnapshot(token, { includeImage = true } = {}) {
  const snapshot = mapTokenSnapshot(token);
  if (!snapshot) return null;
  if (snapshot.hidden) return null;
  const embeddedImage = mapTokenEmbeddedImage(token);
  const shareSnapshot = {
    id: snapshot.id,
    kind: snapshot.kind,
    name: snapshot.name,
    monster: snapshot.monster,
    character: snapshot.kind === "character" && snapshot.character ? { name: snapshot.character.name } : null,
    x: snapshot.x,
    y: snapshot.y,
    size: snapshot.size,
    ac: snapshot.ac,
    hpCurrent: snapshot.hpCurrent,
    hpMax: snapshot.hpMax,
    initiative: snapshot.initiative,
    hidden: snapshot.hidden,
    identityHidden: snapshot.identityHidden,
    nameHidden: snapshot.nameHidden,
    image: includeImage ? embeddedImage : null,
    imageUnchanged: Boolean(embeddedImage && !includeImage)
  };
  if (shareSnapshot.kind === "monster" && shareSnapshot.identityHidden) return anonymizeMapTokenShareSnapshot(shareSnapshot);
  return hideMapTokenShareName(shareSnapshot);
}

function mapShareViewportFromDom(note, page) {
  const noteId = String(note?.id || "");
  const element = Array.from(document.querySelectorAll("[data-map-body-note-id]"))
    .find((entry) => entry.dataset.mapBodyNoteId === noteId);
  const left = Number(element?.dataset.mapBaseLeft);
  const top = Number(element?.dataset.mapBaseTop);
  const width = Number(element?.dataset.mapBaseWidth);
  const height = Number(element?.dataset.mapBaseHeight);
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    return {
      left: Number.isFinite(left) ? left : 0,
      top: Number.isFinite(top) ? top : 0,
      width,
      height
    };
  }
  return {
    left: 0,
    top: 0,
    width: Math.max(1, Number(page?.frameWidth || note?.width) || NOTE_DEFAULT_WIDTH),
    height: Math.max(1, (Number(page?.frameHeight || note?.height) || NOTE_DEFAULT_HEIGHT) - 88)
  };
}

function mapShareViewportEntrySnapshot(entry, viewport) {
  if (!entry || !viewport) return entry;
  return {
    ...entry,
    x: (Number(entry.x) || 0) - (Number(viewport.left) || 0),
    y: (Number(entry.y) || 0) - (Number(viewport.top) || 0)
  };
}

function mapGridShareSnapshot(grid, viewport) {
  const snapshot = mapGridSnapshot(grid);
  if (!viewport) return snapshot;
  return {
    ...snapshot,
    offsetX: (Number(snapshot.offsetX) || 0) - (Number(viewport.left) || 0),
    offsetY: (Number(snapshot.offsetY) || 0) - (Number(viewport.top) || 0)
  };
}

async function mapTokensShareSnapshot(tokens, viewport = null, { includeImage = () => true } = {}) {
  const list = Array.isArray(tokens) ? tokens : [];
  return (await Promise.all(list
    .filter((token) => !token?.hidden)
    .map((token) => mapTokenShareSnapshot(token, { includeImage: includeImage(token) }))))
    .filter(Boolean)
    .map((token) => mapShareViewportEntrySnapshot(token, viewport));
}

function mapTokenMonsterSnapshot(monster) {
  if (!monster?.name) return null;
  return {
    name: String(monster.name || "Monster"),
    source: String(monster.source || "")
  };
}

function mapTokenCharacterSnapshot(character) {
  if (!character?.name) return null;
  return cloneForBoardState(character);
}

function normalizeCombatNumber(value, fallback = "") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const number = Number(text);
  return Number.isFinite(number) ? number : fallback;
}

function mapActorCombatState(actor = {}, { rollInitiative = true } = {}) {
  const character = actor.kind === "character" ? actor.character : null;
  const monster = actor.kind === "character" ? null : actor.monster;
  const hpFallback = character
    ? (character.hpMax || character.hpCurrent || "")
    : (monster?.hp?.average ?? "");
  const hpMax = normalizeCombatNumber(actor.hpMax ?? hpFallback, hpFallback);
  const hpCurrent = normalizeCombatNumber(actor.hpCurrent ?? hpMax, hpMax);
  const dexScore = character?.abilities?.dex ?? monster?.dex ?? 10;
  const initiativeModifier = abilityModifier(Number(dexScore) || 10);
  const initiativeRoll = rollInitiative ? rollD20(initiativeModifier) : null;
  return {
    ac: String(actor.ac || (character ? character.ac : formatAc(monster)) || "Unknown"),
    hpCurrent,
    hpMax,
    initiative: normalizeCombatNumber(actor.initiative ?? initiativeRoll?.total, ""),
    initiativeModifier,
    initiativeDetail: String(actor.initiativeDetail || initiativeRoll?.detail || "")
  };
}

function normalizeMapTokenCombatFields(token) {
  return {
    ac: String(token?.ac || "Unknown"),
    hpCurrent: normalizeCombatNumber(token?.hpCurrent ?? token?.hp, ""),
    hpMax: normalizeCombatNumber(token?.hpMax, ""),
    initiative: normalizeCombatNumber(token?.initiative, ""),
    initiativeModifier: normalizeCombatNumber(token?.initiativeModifier, 0),
    initiativeDetail: String(token?.initiativeDetail || "")
  };
}

function normalizeMapTokenImage(image) {
  if (!image?.dataUrl) return null;
  return {
    id: String(image.id || `map-token-image-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name: String(image.name || "Token.png"),
    type: String(image.type || "image/png"),
    dataUrl: String(image.dataUrl || "")
  };
}

function monsterWithTokenImage(monster, image) {
  const tokenImage = normalizeMapTokenImage(image);
  if (!monster || !tokenImage) return monster;
  return {
    ...monster,
    tokenImage
  };
}

function normalizeLinkedMapTokenLink(link) {
  if (!link?.mapNoteId || !link?.pageId || !link?.tokenId) return null;
  return {
    mapNoteId: String(link.mapNoteId),
    pageId: String(link.pageId),
    tokenId: String(link.tokenId)
  };
}

function normalizeTokenActorNote(actorNote, token = {}) {
  if (!actorNote?.kind) return null;
  const kind = actorNote.kind === "character" ? "character" : "monster";
  const character = kind === "character"
    ? mapTokenCharacterSnapshot(actorNote.character || token.character)
    : null;
  let monsterCustom = kind === "monster" && actorNote.monsterCustom ? cloneForBoardState(actorNote.monsterCustom) : null;
  let monster = kind === "monster"
    ? (monsterCustom || cloneForBoardState(actorNote.monster) || findLibraryEntryByRef("monster", actorNote.monsterRef || token.monster))
    : null;
  if (kind === "monster" && !monster?.tokenImage?.dataUrl && token?.image?.dataUrl) {
    monster = monsterWithTokenImage(monster, token.image);
    if (monsterCustom) monsterCustom = monster;
  }
  if (kind === "character" && !character) return null;
  if (kind === "monster" && !monster) return null;
  const hpFallback = kind === "character"
    ? (character.hpMax || character.hpCurrent || "")
    : (monster?.hp?.average ?? "");
  const monsterTextNotes = kind === "monster" ? normalizeMonsterTextNotes(actorNote.monsterTextNotes) : [];
  const monsterActiveTabId = kind === "monster"
    ? (actorNote.monsterActiveTabId === "stats" || monsterTextNotes.some((entry) => entry.id === actorNote.monsterActiveTabId) ? String(actorNote.monsterActiveTabId || "stats") : "stats")
    : "stats";
  return {
    kind,
    monster,
    monsterCustom,
    character,
    livePlayerId: kind === "character" ? String(actorNote.livePlayerId || token.livePlayerId || "") : "",
    livePlayerName: kind === "character" ? String(actorNote.livePlayerName || token.livePlayerName || "") : "",
    liveSheetData: kind === "character" && actorNote.liveSheetData ? cloneForBoardState(actorNote.liveSheetData) : null,
    liveConnected: kind === "character" ? Boolean(actorNote.liveConnected ?? token.liveConnected ?? false) : false,
    liveLastUpdate: kind === "character" ? (actorNote.liveLastUpdate || token.liveLastUpdate || null) : null,
    monsterTextNotes,
    monsterActiveTabId,
    titleOverride: String(actorNote.titleOverride || ""),
    hpCurrent: actorNote.hpCurrent ?? token.hpCurrent ?? hpFallback,
    hpMax: actorNote.hpMax ?? token.hpMax ?? hpFallback,
    rolls: Array.isArray(actorNote.rolls) ? actorNote.rolls.slice(0, 20) : [],
    dicePanelOpen: Boolean(actorNote.dicePanelOpen)
  };
}

function tokenActorNoteFromToken(token) {
  const stored = normalizeTokenActorNote(token?.actorNote, token);
  if (stored) return stored;
  if (token?.kind === "character") {
    const character = mapTokenCharacterSnapshot(token.character);
    if (!character) return null;
    return normalizeTokenActorNote({
      kind: "character",
      character,
      hpCurrent: token.hpCurrent,
      hpMax: token.hpMax
    }, token);
  }
  const monsterCustom = token?.monsterCustom ? monsterWithTokenImage(cloneForBoardState(token.monsterCustom), token?.image) : null;
  const monster = monsterCustom || monsterWithTokenImage(findLibraryEntryByRef("monster", token?.monster), token?.image);
  if (!monster) return null;
  return normalizeTokenActorNote({
    kind: "monster",
    monster,
    monsterCustom,
    hpCurrent: token.hpCurrent,
    hpMax: token.hpMax
  }, token);
}

function tokenActorNoteSnapshot(note) {
  if (!note || !["monster", "character"].includes(note.kind)) return null;
  return normalizeTokenActorNote({
    kind: note.kind,
    monster: note.kind === "monster" ? note.monster : null,
    monsterCustom: note.kind === "monster" && note.monsterCustom ? cloneForBoardState(note.monsterCustom) : null,
    character: note.kind === "character" ? note.character : null,
    livePlayerId: note.kind === "character" ? String(note.livePlayerId || "") : "",
    livePlayerName: note.kind === "character" ? String(note.livePlayerName || "") : "",
    liveSheetData: note.kind === "character" && note.liveSheetData ? cloneForBoardState(note.liveSheetData) : null,
    liveConnected: note.kind === "character" ? Boolean(note.liveConnected) : false,
    liveLastUpdate: note.kind === "character" ? (note.liveLastUpdate || null) : null,
    monsterTextNotes: note.kind === "monster" ? normalizeMonsterTextNotes(note.monsterTextNotes) : [],
    monsterActiveTabId: note.kind === "monster" ? monsterActivePanelId(note) : "stats",
    titleOverride: note.titleOverride || "",
    hpCurrent: note.hpCurrent,
    hpMax: note.hpMax,
    rolls: note.rolls || [],
    dicePanelOpen: note.dicePanelOpen
  });
}

function normalizeMapToken(token) {
  const kind = token?.kind === "character" ? "character" : "monster";
  const monster = kind === "monster" ? mapTokenMonsterSnapshot(token?.monster) : null;
  const character = kind === "character" ? mapTokenCharacterSnapshot(token?.character) : null;
  if (kind === "monster" && !monster) return null;
  if (kind === "character" && !character) return null;
  const fallbackName = kind === "character" ? character.name : monster.name;
  return {
    id: String(token.id || `map-token-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    kind,
    name: String(token.name || fallbackName),
    monster,
    monsterCustom: token.monsterCustom ? cloneForBoardState(token.monsterCustom) : null,
    character,
    livePlayerId: String(token.livePlayerId || ""),
    livePlayerName: String(token.livePlayerName || ""),
    liveConnected: Boolean(token.liveConnected),
    liveLastUpdate: token.liveLastUpdate || null,
    x: Number.isFinite(Number(token.x)) ? Number(token.x) : 0,
    y: Number.isFinite(Number(token.y)) ? Number(token.y) : 0,
    size: clamp(Number(token.size) || MAP_TOKEN_SIZE, 32, 140),
    image: normalizeMapTokenImage(token.image),
    groupId: String(token.groupId || ""),
    attachedMarkerId: String(token.attachedMarkerId || "").trim(),
    hidden: Boolean(token.hidden || token.playerHidden),
    identityHidden: kind === "monster" && Boolean(token.identityHidden || token.anonymous || token.hideIdentity),
    nameHidden: kind === "monster" && Boolean(token.nameHidden || token.hideName),
    ...normalizeMapTokenCombatFields(token),
    actorNote: normalizeTokenActorNote(token.actorNote, token)
  };
}

function mapTokenSnapshot(token) {
  return normalizeMapToken(token);
}

function normalizeMapTokenGroup(group, index = 0) {
  const source = isPlainObject(group) ? group : {};
  const fallbackName = `Grupo ${index + 1}`;
  return {
    id: String(source.id || `map-token-group-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name: String(source.name || fallbackName).trim().slice(0, 80) || fallbackName,
    global: Boolean(source.global || source.crossPage || source.sharedAcrossMaps),
    inCombat: Boolean(source.inCombat || source.combat || source.combatActive),
    sourcePageId: source.sourcePageId ? String(source.sourcePageId) : "",
    sourcePageName: source.sourcePageName ? String(source.sourcePageName) : ""
  };
}

function normalizeMapTokenGroups(groups) {
  if (!Array.isArray(groups)) return [];
  const seen = new Set();
  return groups
    .map((group, index) => normalizeMapTokenGroup(group, index))
    .filter((group) => {
      if (!group.id || seen.has(group.id)) return false;
      seen.add(group.id);
      return true;
    });
}

function mapTokenGroupsSnapshot(groups) {
  return normalizeMapTokenGroups(groups);
}

function serializeMapTokenDragPayload(payload = {}) {
  return [
    "dm-map-token",
    encodeURIComponent(String(payload.mapNoteId || "")),
    encodeURIComponent(String(payload.sourcePageId || "")),
    encodeURIComponent(String(payload.tokenId || ""))
  ].join(":");
}

function parseMapTokenDragPayload(value) {
  const text = String(value || "");
  if (!text.startsWith("dm-map-token:")) return null;
  const [, mapNoteId = "", sourcePageId = "", tokenId = ""] = text.split(":");
  const payload = {
    mapNoteId: decodeURIComponent(mapNoteId),
    sourcePageId: decodeURIComponent(sourcePageId),
    tokenId: decodeURIComponent(tokenId)
  };
  return payload.sourcePageId && payload.tokenId ? payload : null;
}

function normalizeMapMarkerColor(color) {
  const text = String(color || "").trim().toLowerCase();
  const named = {
    amber: "#f59e0b",
    orange: "#f97316",
    yellow: "#eab308",
    lime: "#84cc16",
    emerald: "#10b981",
    teal: "#14b8a6",
    cyan: "#38bdf8",
    sky: "#38bdf8",
    blue: "#3b82f6",
    indigo: "#6366f1",
    green: "#22c55e",
    red: "#ef4444",
    pink: "#ec4899",
    magenta: "#d946ef",
    purple: "#a855f7",
    violet: "#a855f7",
    brown: "#7f1d1d",
    gray: "#64748b",
    grey: "#64748b",
    black: "#111827",
    white: "#f8fafc"
  }[text];
  if (named) return named;
  return /^#[0-9a-f]{6}$/i.test(text) ? text : MAP_MARKER_COLOR_OPTIONS[0].value;
}

function normalizeMapMarkerOpacity(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? clamp(numeric, MAP_MARKER_OPACITY_MIN, MAP_MARKER_OPACITY_MAX)
    : MAP_MARKER_OPACITY_DEFAULT;
}

function normalizeMapMarkerPattern(pattern) {
  const value = String(pattern || "").trim().toLowerCase();
  return MAP_MARKER_PATTERN_VALUES.has(value) ? value : "none";
}

function normalizeMapMarkerIcon(icon) {
  const value = String(icon || "").trim().toLowerCase();
  return MAP_MARKER_ICON_VALUES.has(value) ? value : "marker";
}

function decodeMapMarkerPatternGlyph(glyph) {
  return String(glyph || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function mapMarkerPatternBackground(pattern, color) {
  const value = normalizeMapMarkerPattern(pattern);
  if (value === "none") return "none";
  const option = MAP_MARKER_PATTERN_OPTIONS.find((entry) => entry.value === value);
  const glyph = decodeMapMarkerPatternGlyph(option?.glyph);
  if (!glyph) return "none";
  const stroke = normalizeMapMarkerColor(color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34"><text x="17" y="23" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="800" fill="${stroke}" fill-opacity="0.72">${glyph}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function mapMarkerColorRgba(color, alpha = 0.35) {
  const hex = normalizeMapMarkerColor(color).replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function normalizeMapMarkerFormType(value) {
  const type = String(value || "").trim().toLowerCase();
  return MAP_MARKER_FORM_TYPES.has(type) ? type : "square";
}

function normalizeMapMarker(marker, index = 0) {
  const source = isPlainObject(marker) ? marker : {};
  const markerType = source.markerType === "shape" || source.kind === "shape" ? "shape" : "pin";
  const formType = normalizeMapMarkerFormType(source.formType || source.shapeType || source.shape);
  const defaultWidth = MAP_MARKER_SHAPE_DEFAULT_SIZE;
  const defaultHeight = MAP_MARKER_SHAPE_DEFAULT_SIZE;
  return {
    id: String(source.id || `map-marker-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    markerType,
    formType,
    label: String(source.label || source.name || (markerType === "shape" ? `${MAP_MARKER_FORM_LABELS[formType]} ${index + 1}` : `Marker ${index + 1}`)).slice(0, 80),
    x: Number.isFinite(Number(source.x)) ? Number(source.x) : 0,
    y: Number.isFinite(Number(source.y)) ? Number(source.y) : 0,
    width: clamp(Number(source.width) || defaultWidth, MAP_MARKER_SHAPE_MIN_SIZE, 2000),
    height: clamp(Number(source.height) || defaultHeight, MAP_MARKER_SHAPE_MIN_SIZE, 2000),
    rotation: Number.isFinite(Number(source.rotation)) ? Number(source.rotation) : 0,
    color: normalizeMapMarkerColor(source.color),
    icon: markerType === "pin" ? normalizeMapMarkerIcon(source.icon || source.markerIcon || source.symbol) : "marker",
    opacity: markerType === "shape" ? normalizeMapMarkerOpacity(source.opacity ?? source.alpha ?? source.fillOpacity) : MAP_MARKER_OPACITY_DEFAULT,
    pattern: markerType === "shape" ? normalizeMapMarkerPattern(source.pattern || source.mask || source.areaPattern) : "none",
    attachedTokenId: markerType === "shape" ? String(source.attachedTokenId || "").trim() : "",
    hidden: Boolean(source.hidden || source.playerHidden)
  };
}

function mapMarkerSnapshot(marker, index = 0) {
  return normalizeMapMarker(marker, index);
}

function mapMarkersSnapshot(markers) {
  return Array.isArray(markers) ? markers.map(mapMarkerSnapshot).filter(Boolean) : [];
}

function mapMarkersShareSnapshot(markers, viewport = null) {
  return mapMarkersSnapshot(markers)
    .filter((marker) => !marker.hidden)
    .map((marker) => mapShareViewportEntrySnapshot(marker, viewport));
}

function normalizeMapGrid(grid) {
  const source = isPlainObject(grid) ? grid : {};
  return {
    enabled: Boolean(source.enabled),
    snap: Boolean(source.snap),
    cellWidth: clamp(Number(source.cellWidth) || DEFAULT_MAP_GRID.cellWidth, 8, 500),
    cellHeight: clamp(Number(source.cellHeight) || DEFAULT_MAP_GRID.cellHeight, 8, 500),
    offsetX: clamp(Number(source.offsetX) || 0, -500, 500),
    offsetY: clamp(Number(source.offsetY) || 0, -500, 500)
  };
}

function normalizeMapFog(fog) {
  const source = isPlainObject(fog) ? fog : {};
  const brushShape = MAP_FOG_BRUSH_SHAPES.has(source.brushShape) ? source.brushShape : DEFAULT_MAP_FOG.brushShape;
  const revealed = Array.isArray(source.revealed)
    ? source.revealed.slice(-FOG_REVEAL_POINT_LIMIT).map((point) => ({
      x: clamp(Number(point?.x) || 0, 0, 1),
      y: clamp(Number(point?.y) || 0, 0, 1),
      rx: clamp(Number(point?.rx ?? point?.r) || 0.06, 0.001, 1),
      ry: clamp(Number(point?.ry ?? point?.r) || 0.06, 0.001, 1),
      shape: MAP_FOG_BRUSH_SHAPES.has(point?.shape) ? point.shape : "circle",
      mode: point?.mode === "hide" ? "hide" : "reveal"
    }))
    : [];
  return {
    enabled: source.enabled !== false,
    brushSize: clamp(Number(source.brushSize) || DEFAULT_MAP_FOG.brushSize, MAP_FOG_BRUSH_MIN_SIZE, MAP_FOG_BRUSH_MAX_SIZE),
    brushShape,
    revealed
  };
}

function mapFogSnapshot(fog) {
  return normalizeMapFog(fog);
}

function appendMapFogPoint(fog, point) {
  const normalized = normalizeMapFog(fog);
  const nextPoint = {
    x: clamp(Number(point?.x) || 0, 0, 1),
    y: clamp(Number(point?.y) || 0, 0, 1),
    rx: clamp(Number(point?.rx) || 0.06, 0.001, 1),
    ry: clamp(Number(point?.ry) || 0.06, 0.001, 1),
    shape: MAP_FOG_BRUSH_SHAPES.has(point?.shape) ? point.shape : normalized.brushShape,
    mode: point?.mode === "hide" ? "hide" : "reveal"
  };
  const last = normalized.revealed[normalized.revealed.length - 1];
  const minDelta = Math.max(nextPoint.rx, nextPoint.ry) * 0.28;
  if (
    last
    && last.mode === nextPoint.mode
    && last.shape === nextPoint.shape
    && Math.hypot(last.x - nextPoint.x, last.y - nextPoint.y) < minDelta
  ) return normalized;
  return {
    ...normalized,
    revealed: [...normalized.revealed, nextPoint].slice(-FOG_REVEAL_POINT_LIMIT)
  };
}

function mapGridSnapshot(grid) {
  return normalizeMapGrid(grid);
}

function defaultMapPageId(noteId = "default") {
  return `map-page-${String(noteId || "default")}`;
}

function mapPageName(page, index = 0) {
  return String(page?.name || page?.mapImage?.name || `Mapa ${index + 1}`);
}

function normalizeMapPage(page, fallbackId = "map-page-default", index = 0) {
  const source = isPlainObject(page) ? page : {};
  return {
    id: String(source.id || fallbackId),
    name: mapPageName(source, index),
    mapImage: source.mapImage ? mapImageRuntimeSnapshot(source.mapImage) : null,
    mapTokens: Array.isArray(source.mapTokens) ? source.mapTokens.map(normalizeMapToken).filter(Boolean) : [],
    mapTokenGroups: mapTokenGroupsSnapshot(source.mapTokenGroups),
    mapMarkers: Array.isArray(source.mapMarkers) ? source.mapMarkers.map((marker, markerIndex) => normalizeMapMarker(marker, markerIndex)).filter(Boolean) : [],
    mapGrid: normalizeMapGrid(source.mapGrid),
    fogOfWar: normalizeMapFog(source.fogOfWar),
    frameWidth: Number(source.frameWidth) || null,
    frameHeight: Number(source.frameHeight) || null
  };
}

function mapPagesForNote(note) {
  if (note?.kind !== "map") return [];
  const pages = Array.isArray(note.mapPages) && note.mapPages.length ? note.mapPages : [];
  if (pages.length) return pages;
  return [normalizeMapPage({
    id: defaultMapPageId(note.id),
    name: note.mapImage?.name || "Mapa 1",
    mapImage: note.mapImage || null,
    mapTokens: note.mapTokens || [],
    mapTokenGroups: note.mapTokenGroups || [],
    mapMarkers: note.mapMarkers || [],
    mapGrid: note.mapGrid,
    fogOfWar: note.fogOfWar
  }, defaultMapPageId(note.id), 0)];
}

function mapPageHasTokens(page) {
  return Array.isArray(page?.mapTokens) && page.mapTokens.length > 0;
}

function mapNoteHasTokens(note) {
  return note?.kind === "map" && mapPagesForNote(note).some(mapPageHasTokens);
}

function activeMapPageForNote(note) {
  const pages = mapPagesForNote(note);
  return pages.find((page) => page.id === note?.activeMapPageId) || pages[0] || null;
}

function syncMapNoteActivePage(note, pages, activePageId = null) {
  const providedPages = (pages || []).filter(Boolean);
  const safePages = providedPages.length ? providedPages : mapPagesForNote(note);
  const nextActiveId = activePageId || note?.activeMapPageId || safePages[0]?.id || null;
  const activePage = safePages.find((page) => page.id === nextActiveId) || safePages[0] || null;
  const activeObjectUrl = activePage?.mapImage?.objectUrl || "";
  const memorySafePages = safePages.map((page) => {
    if (page.id === activePage?.id || !page.mapImage?.objectUrl || page.mapImage.objectUrl === activeObjectUrl) return page;
    releaseMapImageObjectUrl(page.mapImage);
    return { ...page, mapImage: mapImageWithoutObjectUrl(page.mapImage) };
  });
  const frameWidth = activePage?.frameWidth || note.width;
  const frameHeight = activePage?.frameHeight || note.height;
  return {
    ...note,
    mapPages: memorySafePages,
    activeMapPageId: activePage?.id || null,
    mapImage: activePage?.mapImage || null,
    mapTokens: activePage?.mapTokens || [],
    mapTokenGroups: activePage?.mapTokenGroups || [],
    mapMarkers: activePage?.mapMarkers || [],
    mapGrid: activePage?.mapGrid ? mapGridSnapshot(activePage.mapGrid) : normalizeMapGrid(null),
    fogOfWar: activePage?.fogOfWar ? mapFogSnapshot(activePage.fogOfWar) : normalizeMapFog(null),
    width: frameWidth,
    height: frameHeight,
    tabFrameWidth: frameWidth,
    tabFrameHeight: frameHeight
  };
}

function updateMapNotePage(note, pageId, updater) {
  const pages = mapPagesForNote(note);
  const targetId = pageId || note.activeMapPageId || pages[0]?.id;
  const updatedPages = pages.map((page) => (
    page.id === targetId ? normalizeMapPage(updater(page), page.id) : page
  ));
  const activePageId = note.activeMapPageId || activeMapPageForNote(note)?.id || targetId;
  return syncMapNoteActivePage(note, updatedPages, activePageId);
}

function mapPageStorageSnapshot(page) {
  const normalized = normalizeMapPage(page);
  return {
    id: normalized.id,
    name: normalized.name,
    mapImage: normalized.mapImage ? mapImageStorageSnapshot(normalized.mapImage) : null,
    mapTokens: normalized.mapTokens.map(mapTokenSnapshot).filter(Boolean),
    mapTokenGroups: mapTokenGroupsSnapshot(normalized.mapTokenGroups),
    mapMarkers: mapMarkersSnapshot(normalized.mapMarkers),
    mapGrid: mapGridSnapshot(normalized.mapGrid),
    fogOfWar: mapFogSnapshot(normalized.fogOfWar),
    frameWidth: normalized.frameWidth || null,
    frameHeight: normalized.frameHeight || null
  };
}

function restoreStoredMapPage(page, fallbackId, index = 0) {
  return normalizeMapPage({
    id: page?.id || fallbackId,
    name: page?.name,
    mapImage: page?.mapImage ? restoreStoredMapImage(page.mapImage) : null,
    mapTokens: Array.isArray(page?.mapTokens) ? page.mapTokens.map(normalizeMapToken).filter(Boolean) : [],
    mapTokenGroups: mapTokenGroupsSnapshot(page?.mapTokenGroups),
    mapMarkers: mapMarkersSnapshot(page?.mapMarkers),
    mapGrid: page?.mapGrid,
    fogOfWar: page?.fogOfWar,
    frameWidth: page?.frameWidth,
    frameHeight: page?.frameHeight
  }, fallbackId, index);
}

function loadImageElement(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not analyze the image."));
    image.src = dataUrl;
  });
}

function smoothSignal(signal, radius = 1) {
  return signal.map((_, index) => {
    let total = 0;
    let count = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const value = signal[index + offset];
      if (value == null) continue;
      total += value;
      count += 1;
    }
    return count ? total / count : 0;
  });
}

function bestRepeatingGrid(signal, minPeriod, maxPeriod) {
  if (!Array.isArray(signal) || signal.length < minPeriod * 3) return null;
  const mean = signal.reduce((total, value) => total + value, 0) / signal.length;
  const variance = signal.reduce((total, value) => total + (value - mean) ** 2, 0) / signal.length;
  const deviation = Math.sqrt(variance) || 1;
  const normalized = smoothSignal(signal.map((value) => Math.max(0, (value - mean) / deviation)), 1);
  let best = null;
  const safeMaxPeriod = Math.min(maxPeriod, Math.floor(signal.length / 2));

  for (let period = minPeriod; period <= safeMaxPeriod; period += 1) {
    let bestOffsetScore = 0;
    let bestOffset = 0;
    for (let offset = 0; offset < period; offset += 1) {
      let total = 0;
      let count = 0;
      for (let index = offset; index < normalized.length; index += period) {
        total += normalized[index];
        count += 1;
      }
      if (count < 3) continue;
      const score = total / count;
      if (score > bestOffsetScore) {
        bestOffsetScore = score;
        bestOffset = offset;
      }
    }
    const periodScore = bestOffsetScore * Math.log2(Math.max(2, Math.floor(signal.length / period)));
    if (!best || periodScore > best.score) best = { period, offset: bestOffset, score: periodScore, lineScore: bestOffsetScore };
  }

  if (!best || best.lineScore < 0.55) return null;
  return best;
}

function gridInkMaskFromPixels(pixels, width, height) {
  const mask = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const pixelIndex = index * 4;
    const red = pixels[pixelIndex];
    const green = pixels[pixelIndex + 1];
    const blue = pixels[pixelIndex + 2];
    const alpha = pixels[pixelIndex + 3];
    if (alpha < 80) continue;

    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    const neutral = maxChannel - minChannel <= 38;
    const grayLine = neutral && luminance >= 105 && luminance <= 218;
    if (grayLine) mask[index] = 1;
  }
  return mask;
}

function gridInkAxisScores(mask, width, height) {
  const columnScores = Array(width).fill(0);
  const rowScores = Array(height).fill(0);

  for (let y = 1; y < height - 1; y += 1) {
    const rowStart = y * width;
    for (let x = 1; x < width - 1; x += 1) {
      const index = rowStart + x;
      if (!mask[index]) continue;
      const verticalNeighbors = mask[index - width] + mask[index + width];
      const horizontalNeighbors = mask[index - 1] + mask[index + 1];
      if (verticalNeighbors) columnScores[x] += 1 + verticalNeighbors * 0.5;
      if (horizontalNeighbors) rowScores[y] += 1 + horizontalNeighbors * 0.5;
    }
  }

  return {
    columns: columnScores.map((score) => score / height),
    rows: rowScores.map((score) => score / width)
  };
}

function gradientAxisScores(luminance, width, height) {
  const columns = Array.from({ length: width }, (_, x) => {
    if (x <= 0 || x >= width - 1) return 0;
    let total = 0;
    for (let y = 0; y < height; y += 1) {
      const index = y * width + x;
      total += Math.abs(luminance[index] - luminance[index - 1]) + Math.abs(luminance[index + 1] - luminance[index]);
    }
    return total / height;
  });
  const rows = Array.from({ length: height }, (_, y) => {
    if (y <= 0 || y >= height - 1) return 0;
    let total = 0;
    const rowStart = y * width;
    const prevRowStart = (y - 1) * width;
    const nextRowStart = (y + 1) * width;
    for (let x = 0; x < width; x += 1) {
      total += Math.abs(luminance[rowStart + x] - luminance[prevRowStart + x]) + Math.abs(luminance[nextRowStart + x] - luminance[rowStart + x]);
    }
    return total / width;
  });
  return { columns, rows };
}

function chooseDetectedGrid(candidates) {
  const valid = candidates.filter((candidate) => candidate?.xGrid && candidate?.yGrid);
  if (!valid.length) return null;
  return valid
    .map((candidate) => {
      const xPeriod = candidate.xGrid.period;
      const yPeriod = candidate.yGrid.period;
      const aspectPenalty = Math.abs(Math.log(Math.max(xPeriod, yPeriod) / Math.max(1, Math.min(xPeriod, yPeriod))));
      const score = candidate.weight
        * (candidate.xGrid.score + candidate.yGrid.score)
        / (1 + aspectPenalty * 2);
      return { ...candidate, score };
    })
    .sort((left, right) => right.score - left.score)[0];
}

async function detectGridFromImageDataUrl(dataUrl) {
  const image = await loadImageElement(dataUrl);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) throw new Error("Could not read the image size.");

  const maxAnalysisSize = 900;
  const analysisScale = Math.min(1, maxAnalysisSize / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * analysisScale));
  const height = Math.max(1, Math.round(naturalHeight * analysisScale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not prepare the grid analysis.");
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const luminance = new Float32Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const pixelIndex = index * 4;
    luminance[index] = pixels[pixelIndex] * 0.299 + pixels[pixelIndex + 1] * 0.587 + pixels[pixelIndex + 2] * 0.114;
  }

  const minPeriod = Math.max(6, Math.round(18 * analysisScale));
  const maxPeriod = Math.max(minPeriod + 1, Math.round(260 * analysisScale));
  const gridInkScores = gridInkAxisScores(gridInkMaskFromPixels(pixels, width, height), width, height);
  const gradientScores = gradientAxisScores(luminance, width, height);
  const detected = chooseDetectedGrid([
    {
      weight: 2.6,
      xGrid: bestRepeatingGrid(gridInkScores.columns, minPeriod, maxPeriod),
      yGrid: bestRepeatingGrid(gridInkScores.rows, minPeriod, maxPeriod)
    },
    {
      weight: 0.65,
      xGrid: bestRepeatingGrid(gradientScores.columns, minPeriod, maxPeriod),
      yGrid: bestRepeatingGrid(gradientScores.rows, minPeriod, maxPeriod)
    }
  ]);
  if (!detected) throw new Error("No pude detectar un grid claro en esta imagen.");

  return {
    naturalWidth,
    naturalHeight,
    cellWidth: detected.xGrid.period / analysisScale,
    cellHeight: detected.yGrid.period / analysisScale,
    offsetX: detected.xGrid.offset / analysisScale,
    offsetY: detected.yGrid.offset / analysisScale
  };
}

function normalizeGridOffset(value, cellSize) {
  const cell = Math.max(1, Number(cellSize) || 1);
  return ((Number(value) || 0) % cell + cell) % cell;
}

function firstClipboardImageFile(clipboardData) {
  if (!clipboardData) return null;
  const items = Array.from(clipboardData.items || []);
  const imageItem = items.find((item) => item.kind === "file" && String(item.type || "").startsWith("image/"));
  const imageFile = imageItem?.getAsFile?.();
  if (imageFile) return imageFile;
  return Array.from(clipboardData.files || []).find((file) => String(file.type || "").startsWith("image/")) || null;
}

function readImageFileAsStoredImage(file, fallbackName = "Imagen pegada") {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || "").startsWith("image/")) {
      reject(new Error("No image file in clipboard."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) {
        reject(new Error("Could not load the image."));
        return;
      }
      resolve({
        id: `image-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name || fallbackName,
        type: file.type || "",
        size: file.size || 0,
        dataUrl,
        updatedAt: new Date().toISOString()
      });
    };
    reader.onerror = () => reject(new Error("Could not load the image."));
    reader.readAsDataURL(file);
  });
}

function isEditablePasteTarget(target) {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  return Boolean(element.closest("textarea, input, select, [contenteditable='true'], [contenteditable='']"));
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

function normalizeMonsterTextNote(entry, index = 0) {
  const source = isPlainObject(entry) ? entry : {};
  const fallbackTitle = `Nota ${index + 1}`;
  return {
    id: String(source.id || `monster-text-note-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    title: String(source.title || fallbackTitle).trim().slice(0, 80) || fallbackTitle,
    content: String(source.content || "")
  };
}

function normalizeMonsterTextNotes(notes) {
  if (!Array.isArray(notes)) return [];
  const seen = new Set();
  return notes
    .map((entry, index) => normalizeMonsterTextNote(entry, index))
    .filter((entry) => {
      if (!entry.id || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
}

function monsterActivePanelId(note) {
  const textNotes = normalizeMonsterTextNotes(note?.monsterTextNotes);
  const activeId = String(note?.monsterActiveTabId || "stats");
  if (activeId === "stats") return "stats";
  return textNotes.some((entry) => entry.id === activeId) ? activeId : "stats";
}

function noteStorageSnapshot(note) {
  const activeMapPage = note.kind === "map" ? activeMapPageForNote(note) : null;
  const mapPages = note.kind === "map" ? mapPagesForNote(note).map(mapPageStorageSnapshot).filter(Boolean) : [];
  return {
    id: note.id,
    kind: note.kind,
    monsterRef: libraryRef(note.monster),
    monsterCustom: note.kind === "monster" && note.monsterCustom ? cloneForBoardState(note.monsterCustom) : null,
    monsterTextNotes: note.kind === "monster" ? normalizeMonsterTextNotes(note.monsterTextNotes) : [],
    monsterActiveTabId: note.kind === "monster" ? monsterActivePanelId(note) : "stats",
    entryRef: libraryRef(note.entry),
    entryCustom: (note.kind === "spell" || note.kind === "item") && note.entryCustom ? cloneForBoardState(note.entryCustom) : null,
    character: note.character || null,
    textTitle: note.kind === "text" ? note.textTitle || "" : "",
    textContent: note.kind === "text" ? note.textContent || "" : "",
    textImages: note.kind === "text" && Array.isArray(note.textImages) ? note.textImages.map(storedImageSnapshot).filter(Boolean) : [],
    mapImage: activeMapPage?.mapImage ? mapImageStorageSnapshot(activeMapPage.mapImage) : null,
    mapTokens: activeMapPage ? activeMapPage.mapTokens.map(mapTokenSnapshot).filter(Boolean) : [],
    mapTokenGroups: activeMapPage ? mapTokenGroupsSnapshot(activeMapPage.mapTokenGroups) : [],
    mapMarkers: activeMapPage ? mapMarkersSnapshot(activeMapPage.mapMarkers) : [],
    mapGrid: activeMapPage ? mapGridSnapshot(activeMapPage.mapGrid) : null,
    fogOfWar: activeMapPage ? mapFogSnapshot(activeMapPage.fogOfWar) : null,
    mapPages,
    activeMapPageId: note.kind === "map" ? (activeMapPage?.id || note.activeMapPageId || null) : null,
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
    linkedMapToken: normalizeLinkedMapTokenLink(note.linkedMapToken),
    tokenInitiative: note.tokenInitiative ?? "",
    tabFrameWidth: note.tabFrameWidth ?? note.width,
    tabFrameHeight: note.tabFrameHeight ?? note.height,
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
  const mapImage = note.kind === "map" && note.mapImage
    ? restoreStoredMapImage(note.mapImage)
    : null;
  const mapTokens = note.kind === "map" && Array.isArray(note.mapTokens)
    ? note.mapTokens.map(normalizeMapToken).filter(Boolean)
    : [];
  const mapTokenGroups = note.kind === "map" ? mapTokenGroupsSnapshot(note.mapTokenGroups) : [];
  const mapMarkers = note.kind === "map" ? mapMarkersSnapshot(note.mapMarkers) : [];
  const mapGrid = note.kind === "map" ? normalizeMapGrid(note.mapGrid) : null;
  const fogOfWar = note.kind === "map" ? normalizeMapFog(note.fogOfWar) : null;
  const restoredMapPages = note.kind === "map" && Array.isArray(note.mapPages) && note.mapPages.length
    ? note.mapPages.map((page, index) => restoreStoredMapPage(page, page.id || `${defaultMapPageId(note.id)}-${index + 1}`, index)).filter(Boolean)
    : note.kind === "map"
      ? [normalizeMapPage({
        id: defaultMapPageId(note.id),
        name: mapImage?.name || "Mapa 1",
        mapImage,
        mapTokens,
        mapTokenGroups,
        mapMarkers,
        mapGrid,
        fogOfWar,
        frameWidth: Number(note.width) || NOTE_DEFAULT_WIDTH,
        frameHeight: Number(note.height) || NOTE_DEFAULT_HEIGHT
      }, defaultMapPageId(note.id), 0)]
      : [];
  const activeMapPage = restoredMapPages.find((page) => page.id === note.activeMapPageId) || restoredMapPages[0] || null;
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
  const monsterTextNotes = note.kind === "monster" ? normalizeMonsterTextNotes(note.monsterTextNotes) : [];
  const monsterActiveTabId = note.kind === "monster"
    ? (note.monsterActiveTabId === "stats" || monsterTextNotes.some((entry) => entry.id === note.monsterActiveTabId) ? String(note.monsterActiveTabId || "stats") : "stats")
    : "stats";
  return {
    id: String(note.id),
    kind: note.kind,
    monster,
    monsterCustom,
    monsterTextNotes,
    monsterActiveTabId,
    character,
    entry,
    entryCustom,
    textTitle: typeof note.textTitle === "string" ? note.textTitle : "",
    textContent: typeof note.textContent === "string" ? note.textContent : "",
    textImages: note.kind === "text" && Array.isArray(note.textImages) ? note.textImages.map(restoreStoredImage).filter(Boolean) : [],
    mapImage: activeMapPage?.mapImage || mapImage,
    mapTokens: activeMapPage?.mapTokens || mapTokens,
    mapTokenGroups: activeMapPage?.mapTokenGroups || mapTokenGroups,
    mapMarkers: activeMapPage?.mapMarkers || mapMarkers,
    mapGrid: activeMapPage?.mapGrid || mapGrid,
    fogOfWar: activeMapPage?.fogOfWar || fogOfWar,
    mapPages: restoredMapPages,
    activeMapPageId: activeMapPage?.id || null,
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
    linkedMapToken: normalizeLinkedMapTokenLink(note.linkedMapToken),
    tokenInitiative: note.tokenInitiative ?? "",
    tabFrameWidth: Number(note.tabFrameWidth) || width,
    tabFrameHeight: Number(note.tabFrameHeight) || height,
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

function isHomebrewBoardNote(note) {
  if (note?.kind === "item") return Boolean(note.entryCustom?.__homebrew || note.entryCustom);
  if (note?.kind !== "monster") return false;
  return Boolean(note.monsterCustom?.__homebrew || String(note.monsterCustom?.source || "").trim().toLowerCase() === "homebrew");
}

function shouldOfferBoardNoteSave(note) {
  return isHomebrewBoardNote(note)
    || (note?.kind === "monster" && normalizeMonsterTextNotes(note.monsterTextNotes).length > 0);
}

function savedBoardNoteSnapshot(note) {
  return noteStorageSnapshot({
    ...note,
    parentNoteId: null,
    tabNoteIds: [],
    activeTabId: null,
    minimized: false
  });
}

function createSavedBoardNote(note) {
  return {
    id: `saved-note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    savedAt: new Date().toISOString(),
    title: noteDisplayName(note),
    kind: note.kind,
    snapshot: savedBoardNoteSnapshot(note)
  };
}

function restoreSavedBoardNote(savedNote, index = 0) {
  if (!savedNote?.snapshot || typeof savedNote !== "object") return null;
  const restored = restoreStoredNote(savedNote.snapshot);
  if (!restored || !shouldOfferBoardNoteSave(restored)) return null;
  return {
    id: String(savedNote.id || `saved-note-restored-${index}`),
    savedAt: typeof savedNote.savedAt === "string" ? savedNote.savedAt : "",
    title: String(savedNote.title || noteDisplayName(restored)).trim() || noteDisplayName(restored),
    kind: restored.kind,
    snapshot: savedBoardNoteSnapshot(restored)
  };
}

function defaultBoardState() {
  return {
    notes: [],
    savedNotes: [],
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
    const savedNotes = Array.isArray(parsed.savedNotes)
      ? parsed.savedNotes.map(restoreSavedBoardNote).filter(Boolean)
      : [];
    const view = parsed.view && typeof parsed.view === "object"
      ? {
        x: Number(parsed.view.x) || 0,
        y: Number(parsed.view.y) || 0,
        scale: clamp(Number(parsed.view.scale) || 1, BOARD_MIN_ZOOM, BOARD_MAX_ZOOM)
      }
      : { x: 0, y: 0, scale: 1 };
    return { notes, savedNotes, view };
  } catch (error) {
    console.error("Could not load DM board state", error);
    return defaultBoardState();
  }
}

function saveDmBoardState(notes, view, savedNotes = []) {
  if (typeof localStorage === "undefined") return;
  try {
    const persistentNotes = notes.filter((note) => !note.livePlayerId);
    const persistentIds = new Set(persistentNotes.map((note) => note.id));
    localStorage.setItem(DM_BOARD_STORAGE_KEY, JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      view,
      notes: persistentNotes.map((note) => noteStorageSnapshot({
        ...note,
        parentNoteId: persistentIds.has(note.parentNoteId) ? note.parentNoteId : null,
        tabNoteIds: (note.tabNoteIds || []).filter((id) => persistentIds.has(id)),
        activeTabId: persistentIds.has(note.activeTabId) ? note.activeTabId : null
      })),
      savedNotes: (Array.isArray(savedNotes) ? savedNotes : [])
        .map(restoreSavedBoardNote)
        .filter(Boolean)
    }));
  } catch (error) {
    console.error("Could not save DM board state", error);
  }
}

async function hydrateStoredMapImagesInNotes(notes) {
  const list = Array.isArray(notes) ? notes : [];
  let changed = false;
  const migratedNotes = await Promise.all(list.map(async (note) => {
    if (note?.kind !== "map") return note;
    const pages = await Promise.all(mapPagesForNote(note).map(async (page) => {
      const image = page.mapImage;
      if (!image?.dataUrl || image.assetId) return page;
      const hydratedImage = await hydrateMapImage(image);
      if (!hydratedImage || hydratedImage === image || hydratedImage.dataUrl === image.dataUrl) return page;
      changed = true;
      return {
        ...page,
        mapImage: hydratedImage
      };
    }));
    return changed ? syncMapNoteActivePage(note, pages, note.activeMapPageId) : note;
  }));
  return changed ? migratedNotes : list;
}

function loadLivePlayersPanelCollapsed() {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(DM_LIVE_PLAYERS_PANEL_STORAGE_KEY) === "collapsed";
  } catch (error) {
    console.error("Could not load live players panel state", error);
    return false;
  }
}

function saveLivePlayersPanelCollapsed(collapsed) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DM_LIVE_PLAYERS_PANEL_STORAGE_KEY, collapsed ? "collapsed" : "expanded");
  } catch (error) {
    console.error("Could not save live players panel state", error);
  }
}

function loadSoundBarCollapsed() {
  if (typeof localStorage === "undefined") return true;
  try {
    const stored = localStorage.getItem(DM_SOUND_BAR_PANEL_STORAGE_KEY);
    if (!stored) return true;
    return stored === "collapsed";
  } catch (error) {
    console.error("Could not load sound bar panel state", error);
    return true;
  }
}

function saveSoundBarCollapsed(collapsed) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DM_SOUND_BAR_PANEL_STORAGE_KEY, collapsed ? "collapsed" : "expanded");
  } catch (error) {
    console.error("Could not save sound bar panel state", error);
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

function cleanEquipmentPartDisplay(part) {
  const afterLabel = String(part || "").includes(":")
    ? String(part || "").split(":").slice(1).join(":").trim()
    : String(part || "");
  return cleanRulesText(afterLabel)
    .replace(/\([^)]*\)/g, "")
    .replace(/\bcontaining\b[\s\S]*$/i, "")
    .replace(/^\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+/i, "")
    .replace(/^\s*(?:one set of|set of|pair of|a|an|the|one)\s+/i, "")
    .trim();
}

function characterSectionText(character, sectionTitle) {
  const normalizedTitle = normalizeSearch(sectionTitle);
  const section = (character?.sections || []).find(([title]) => normalizeSearch(title) === normalizedTitle);
  return String(section?.[1] || character?.rawData?.[sectionTitle] || "");
}

function characterEquipmentText(character) {
  return characterSectionText(character, "Equipment");
}

function appendCharacterEquipmentItem(equipmentText, itemName) {
  const cleanItem = sanitizeDisplayText(itemName, "");
  if (!cleanItem) return String(equipmentText || "");
  const existing = equipmentResourceCandidates(equipmentText).some((item) => normalizeResourceName(item.display) === normalizeResourceName(cleanItem));
  if (existing) return String(equipmentText || "");
  const current = String(equipmentText || "").trim();
  return [current, `1 ${cleanItem}`].filter(Boolean).join("\n");
}

function removeCharacterEquipmentItem(equipmentText, itemName) {
  const target = normalizeResourceName(itemName);
  if (!target) return String(equipmentText || "");
  return compactLines(equipmentText)
    .map((line) => {
      const bullet = line.match(/^([-*]\s*)/)?.[1] || "";
      const cleanLine = line.replace(/^[-*]\s*/, "");
      if (normalizeResourceName(cleanEquipmentPartDisplay(cleanLine)) === target) return "";
      const parts = cleanLine.split(/(\s*[,;]\s*)/);
      const kept = [];
      for (let index = 0; index < parts.length; index += 2) {
        const part = parts[index] || "";
        const separator = parts[index + 1] || "";
        if (!part.trim()) continue;
        if (normalizeResourceName(cleanEquipmentPartDisplay(part)) === target) continue;
        kept.push(part.trim());
        if (separator && parts.slice(index + 2).some((nextPart, nextIndex) => nextIndex % 2 === 0 && nextPart.trim())) kept.push(separator.trim() ? `${separator.trim()} ` : separator);
      }
      const nextLine = kept.join("").replace(/\s+([,;])/g, "$1").replace(/[,;]\s*$/g, "").trim();
      return nextLine ? `${bullet}${nextLine}` : "";
    })
    .filter(Boolean)
    .join("\n");
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
  if (typeof DecompressionStream !== "function") throw new Error("This screen cannot decompress the code.");
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
    throw new Error("The character code is corrupt or incomplete.");
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

let MONSTER_SEARCH_INDEX = [];
let SPELL_SEARCH_INDEX = [];
let ITEM_SEARCH_INDEX = [];

async function loadDmScreenLibraries() {
  if (dmScreenLibrariesPromise) return dmScreenLibrariesPromise;
  dmScreenLibrariesPromise = Promise.all([
    import("../../../../data/bestiary/bestiary-sublist-data.json"),
    import("../../../../data/spells/spells.json"),
    import("../../../../../vendor/5etools-src-main/data/items.json"),
    import("../../../../../vendor/5etools-src-main/data/items-base.json")
  ]).then(([bestiaryModule, spellsModule, itemsModule, baseItemsModule]) => {
    const loadedBestiary = bestiaryModule.default || bestiaryModule;
    const loadedSpells = spellsModule.default || spellsModule;
    const loadedItemsData = itemsModule.default || itemsModule;
    const loadedBaseItemsData = baseItemsModule.default || baseItemsModule;
    bestiary = Array.isArray(loadedBestiary) ? loadedBestiary : [];
    spells = Array.isArray(loadedSpells) ? loadedSpells : [];
    ITEM_LIBRARY = [...(loadedItemsData.item || []), ...(loadedBaseItemsData.baseitem || [])];
    ITEM_PROPERTY_LOOKUP = new Map((loadedBaseItemsData.itemProperty || []).map((property) => [`${property.abbreviation}|${property.source}`, property]));
    ITEM_TYPE_LOOKUP = new Map((loadedBaseItemsData.itemType || []).map((type) => [`${type.abbreviation}|${type.source}`, type]));
    ITEM_MASTERY_LOOKUP = new Map((loadedBaseItemsData.itemMastery || []).map((mastery) => [`${mastery.name}|${mastery.source}`, mastery]));
    MONSTER_SEARCH_INDEX = buildMonsterSearchIndex(bestiary);
    SPELL_SEARCH_INDEX = buildLibrarySearchIndex(spells, "spell");
    ITEM_SEARCH_INDEX = buildLibrarySearchIndex(ITEM_LIBRARY, "item");
    return { bestiary, spells, items: ITEM_LIBRARY };
  });
  return dmScreenLibrariesPromise;
}

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
    throw new Error("The character code does not contain valid JSON data.");
  }
  if (payload?.type !== CHARACTER_SHEET_CODE_TYPE || payload?.version !== 1 || !isPlainObject(payload.data)) {
    throw new Error("The code does not contain a compatible sheet.");
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

function MapMarkerIcon({ icon = "marker", className = "h-4 w-4" }) {
  const normalizedIcon = normalizeMapMarkerIcon(icon);
  const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  switch (normalizedIcon) {
    case "shop":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M4 10h16" />
          <path {...strokeProps} d="M5 10l1-5h12l1 5" />
          <path {...strokeProps} d="M6 10v9h12v-9" />
          <path {...strokeProps} d="M9 19v-5h6v5" />
          <path {...strokeProps} d="M7 10v2a2 2 0 0 0 4 0v-2" />
          <path {...strokeProps} d="M13 10v2a2 2 0 0 0 4 0v-2" />
        </svg>
      );
    case "tavern":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M7 4h9v11a4.5 4.5 0 0 1-9 0V4z" />
          <path {...strokeProps} d="M16 7h2.5a2.5 2.5 0 0 1 0 5H16" />
          <path {...strokeProps} d="M8 20h8" />
          <path {...strokeProps} d="M10 8h3" />
        </svg>
      );
    case "inn":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M4 20V9l8-5 8 5v11" />
          <path {...strokeProps} d="M8 20v-6h8v6" />
          <path {...strokeProps} d="M8 11h8" />
          <path {...strokeProps} d="M12 14v6" />
        </svg>
      );
    case "swords":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M4 20l6-6" />
          <path {...strokeProps} d="M14 10l6-6" />
          <path {...strokeProps} d="M12 8l4 4" />
          <path {...strokeProps} d="M3 5l16 16" />
          <path {...strokeProps} d="M7 17l-2 2" />
          <path {...strokeProps} d="M17 7l2-2" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z" />
          <path {...strokeProps} d="M12 7v9" />
        </svg>
      );
    case "castle":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M5 20V8" />
          <path {...strokeProps} d="M19 20V8" />
          <path {...strokeProps} d="M5 8V5h3v3h3V5h2v3h3V5h3v3" />
          <path {...strokeProps} d="M4 20h16" />
          <path {...strokeProps} d="M10 20v-5a2 2 0 0 1 4 0v5" />
        </svg>
      );
    case "temple":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M4 9l8-5 8 5H4z" />
          <path {...strokeProps} d="M6 10v8" />
          <path {...strokeProps} d="M10 10v8" />
          <path {...strokeProps} d="M14 10v8" />
          <path {...strokeProps} d="M18 10v8" />
          <path {...strokeProps} d="M4 20h16" />
        </svg>
      );
    case "camp":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M4 20L12 5l8 15" />
          <path {...strokeProps} d="M9 20l3-6 3 6" />
          <path {...strokeProps} d="M6 20h12" />
          <path {...strokeProps} d="M12 5v15" />
        </svg>
      );
    case "cave":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M4 20v-5a8 8 0 0 1 16 0v5" />
          <path {...strokeProps} d="M9 20v-4a3 3 0 0 1 6 0v4" />
          <path {...strokeProps} d="M5 20h14" />
        </svg>
      );
    case "treasure":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M4 10h16v9H4z" />
          <path {...strokeProps} d="M4 10a8 5 0 0 1 16 0" />
          <path {...strokeProps} d="M12 10v9" />
          <path {...strokeProps} d="M10 14h4" />
        </svg>
      );
    case "danger":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M12 4l9 16H3L12 4z" />
          <path {...strokeProps} d="M12 9v5" />
          <path {...strokeProps} d="M12 17h.01" />
        </svg>
      );
    case "quest":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M12 18h.01" />
          <path {...strokeProps} d="M9.5 9a2.7 2.7 0 1 1 4.8 1.7c-1.5 1.3-2.3 1.9-2.3 3.3" />
          <circle {...strokeProps} cx="12" cy="12" r="9" />
        </svg>
      );
    case "portal":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <ellipse {...strokeProps} cx="12" cy="12" rx="7" ry="9" />
          <path {...strokeProps} d="M9 7c4 1 6 4 5 9" />
          <path {...strokeProps} d="M15 7c-4 1-6 4-5 9" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path {...strokeProps} d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11z" />
          <circle {...strokeProps} cx="12" cy="10" r="2" />
        </svg>
      );
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
  editOnDoubleClick = false,
  style = null,
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
      style={style || undefined}
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
      onDoubleClick={(event) => {
        if (!onCommit || !editOnDoubleClick) return;
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

function MonsterRollPanel({ note, onToggle, onResizeCorner = null, className = "relative border-t border-neutral-700 bg-neutral-950" }) {
  const latest = note.rolls?.[0];

  return (
    <section className={className}>
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
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-3 text-xs text-neutral-300">
          <div className="shrink-0 rounded-sm bg-neutral-900 p-2">
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
          <div className="min-h-0 flex-1 overflow-auto rounded-sm border border-neutral-700">
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

function MonsterTokenImage({ monster, className = "" }) {
  const customImage = normalizeMapTokenImage(monster?.tokenImage);
  const customSrc = customImage?.dataUrl || "";
  const urls = useMemo(() => monsterTokenUrls(monster), [monster]);
  const request = useMemo(() => monsterTokenRequest(monster), [monster]);
  const [resolvedUrl, setResolvedUrl] = useState("");
  const [urlIndex, setUrlIndex] = useState(0);

  useEffect(() => {
    let disposed = false;
    setResolvedUrl("");
    setUrlIndex(0);
    if (customSrc) return undefined;
    const api = window.dndSheet?.getMonsterTokenUrl;
    if (!api) return undefined;
    api(request)
      .then((url) => {
        if (!disposed) setResolvedUrl(url || "");
      })
      .catch((error) => {
        console.error(error);
        if (!disposed) setResolvedUrl("");
      });
    return () => {
      disposed = true;
    };
  }, [customSrc, monster?.name, monster?.source]);

  if (!customSrc && !urls.length) return null;

  const src = customSrc || resolvedUrl || urls[Math.min(urlIndex, urls.length - 1)];
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full border-2 border-amber-500/80 bg-neutral-950 shadow-inner ${className}`}>
      {src ? (
        <img
          className="h-full w-full object-cover"
          src={src}
          alt={`${monster?.name || "Monster"} token`}
          draggable={false}
          onError={() => {
            if (customSrc) return;
            if (resolvedUrl) {
              setResolvedUrl("");
              return;
            }
            setUrlIndex((index) => (index < urls.length - 1 ? index + 1 : index));
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-bold uppercase text-neutral-600">
          Token
        </div>
      )}
    </div>
  );
}

function characterInitials(character) {
  const name = String(character?.name || "PC").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "PC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function CharacterTokenImage({ character, className = "" }) {
  const subtitle = [
    character?.race,
    character?.classLevel || (character?.level ? `Lv ${character.level}` : "")
  ].filter(Boolean).join(" | ");
  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-sky-300 bg-sky-950 text-center shadow-inner ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.35),transparent_32%),linear-gradient(135deg,rgba(14,165,233,0.75),rgba(15,23,42,0.95))]" />
      <div className="relative px-1">
        <div className="font-serif text-lg font-black leading-none text-white">{characterInitials(character)}</div>
        {subtitle ? <div className="mt-0.5 max-w-16 truncate text-[8px] font-bold uppercase text-sky-100/80">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function MapTokenImage({ token, className = "" }) {
  if (token?.image?.dataUrl) {
    return (
      <img
        className={`shrink-0 rounded-full border-2 border-amber-300 bg-neutral-950 object-cover ${className}`}
        src={token.image.dataUrl}
        alt={`${token.name || "Token"} token`}
        draggable={false}
      />
    );
  }
  if (token?.kind === "character") return <CharacterTokenImage character={token.character} className={className} />;
  return <MonsterTokenImage monster={token?.monsterCustom || token?.monster} className={className} />;
}

const TOKEN_CROP_PREVIEW_SIZE = 280;
const TOKEN_CROP_OUTPUT_SIZE = 512;

function tokenCropImageName(name, fallbackName = "Token") {
  const cleanName = String(name || fallbackName || "Token").trim();
  const baseName = cleanName.replace(/\.[a-z0-9]+$/i, "") || fallbackName || "Token";
  return `${baseName}-token.png`;
}

function TokenImageCropperModal({ sourceImage, title = "Token", onCancel, onConfirm }) {
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dragRef = useRef(null);

  useEffect(() => {
    let disposed = false;
    setNaturalSize({ width: 0, height: 0 });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError("");
    if (!sourceImage?.dataUrl) return undefined;
    loadImageElement(sourceImage.dataUrl)
      .then((image) => {
        if (disposed) return;
        setNaturalSize({
          width: image.naturalWidth || image.width || 0,
          height: image.naturalHeight || image.height || 0
        });
      })
      .catch((loadError) => {
        console.error(loadError);
        if (!disposed) setError("No pude leer la imagen.");
      });
    return () => {
      disposed = true;
    };
  }, [sourceImage?.dataUrl]);

  const cropGeometry = useMemo(() => {
    const width = naturalSize.width;
    const height = naturalSize.height;
    if (!width || !height) return null;
    const coverScale = Math.max(TOKEN_CROP_PREVIEW_SIZE / width, TOKEN_CROP_PREVIEW_SIZE / height);
    const displayWidth = width * coverScale * zoom;
    const displayHeight = height * coverScale * zoom;
    return {
      displayWidth,
      displayHeight,
      sourceScale: displayWidth / width,
      maxOffsetX: Math.max(0, (displayWidth - TOKEN_CROP_PREVIEW_SIZE) / 2),
      maxOffsetY: Math.max(0, (displayHeight - TOKEN_CROP_PREVIEW_SIZE) / 2)
    };
  }, [naturalSize.height, naturalSize.width, zoom]);

  function clampCropOffset(nextOffset, geometry = cropGeometry) {
    if (!geometry) return { x: 0, y: 0 };
    return {
      x: clamp(nextOffset.x, -geometry.maxOffsetX, geometry.maxOffsetX),
      y: clamp(nextOffset.y, -geometry.maxOffsetY, geometry.maxOffsetY)
    };
  }

  function updateZoom(value) {
    const nextZoom = clamp(Number(value) || 1, 1, 4);
    setZoom(nextZoom);
    if (!naturalSize.width || !naturalSize.height) return;
    const coverScale = Math.max(TOKEN_CROP_PREVIEW_SIZE / naturalSize.width, TOKEN_CROP_PREVIEW_SIZE / naturalSize.height);
    const nextGeometry = {
      displayWidth: naturalSize.width * coverScale * nextZoom,
      displayHeight: naturalSize.height * coverScale * nextZoom
    };
    nextGeometry.maxOffsetX = Math.max(0, (nextGeometry.displayWidth - TOKEN_CROP_PREVIEW_SIZE) / 2);
    nextGeometry.maxOffsetY = Math.max(0, (nextGeometry.displayHeight - TOKEN_CROP_PREVIEW_SIZE) / 2);
    setOffset((current) => clampCropOffset(current, nextGeometry));
  }

  function moveCropBy(deltaX, deltaY) {
    setOffset((current) => clampCropOffset({ x: current.x + deltaX, y: current.y + deltaY }));
  }

  async function confirmCrop() {
    if (!sourceImage?.dataUrl || !cropGeometry || !onConfirm) return;
    setSaving(true);
    setError("");
    try {
      const imageElement = await loadImageElement(sourceImage.dataUrl);
      const sourceScale = cropGeometry.sourceScale || 1;
      const sourceX = (cropGeometry.displayWidth / 2 - TOKEN_CROP_PREVIEW_SIZE / 2 - offset.x) / sourceScale;
      const sourceY = (cropGeometry.displayHeight / 2 - TOKEN_CROP_PREVIEW_SIZE / 2 - offset.y) / sourceScale;
      const sourceSize = TOKEN_CROP_PREVIEW_SIZE / sourceScale;
      const canvas = document.createElement("canvas");
      canvas.width = TOKEN_CROP_OUTPUT_SIZE;
      canvas.height = TOKEN_CROP_OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare token crop.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        imageElement,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        TOKEN_CROP_OUTPUT_SIZE,
        TOKEN_CROP_OUTPUT_SIZE
      );
      const croppedImage = storedImageSnapshot({
        ...sourceImage,
        id: `token-image-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: tokenCropImageName(sourceImage.name, `${title || "Token"} token`),
        type: "image/png",
        size: 0,
        dataUrl: canvas.toDataURL("image/png"),
        updatedAt: new Date().toISOString()
      });
      setSaving(false);
      onConfirm(croppedImage);
      return;
    } catch (cropError) {
      console.error(cropError);
      setError("No pude guardar el recorte.");
      setSaving(false);
    }
  }

  if (!sourceImage?.dataUrl) return null;

  const imageStyle = cropGeometry ? {
    width: `${cropGeometry.displayWidth}px`,
    height: `${cropGeometry.displayHeight}px`,
    left: "50%",
    top: "50%",
    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`
  } : {};

  return createPortal((
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-neutral-950/80 p-4"
      role="dialog"
      aria-modal="true"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="w-full max-w-[520px] border border-amber-500 bg-neutral-950 text-neutral-200 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-serif text-lg font-bold uppercase tracking-wide text-amber-400">Ajustar token</h2>
            <p className="mt-1 text-xs text-neutral-500">Arrastra la imagen y ajusta el zoom.</p>
          </div>
          <button
            className="h-7 w-7 shrink-0 rounded-sm border border-neutral-700 bg-neutral-900 text-sm font-bold text-neutral-200 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            type="button"
            aria-label="Cerrar recorte"
            onClick={onCancel}
          >
            X
          </button>
        </div>
        <div className="space-y-4 px-4 py-4">
          <div className="flex justify-center">
            <div
              className="relative overflow-hidden rounded-full border-2 border-amber-300 bg-neutral-900 shadow-inner ring-4 ring-neutral-900"
              style={{ width: TOKEN_CROP_PREVIEW_SIZE, height: TOKEN_CROP_PREVIEW_SIZE, touchAction: "none" }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture?.(event.pointerId);
                dragRef.current = {
                  pointerId: event.pointerId,
                  clientX: event.clientX,
                  clientY: event.clientY
                };
              }}
              onPointerMove={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                const deltaX = event.clientX - drag.clientX;
                const deltaY = event.clientY - drag.clientY;
                drag.clientX = event.clientX;
                drag.clientY = event.clientY;
                moveCropBy(deltaX, deltaY);
              }}
              onPointerUp={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
              }}
              onPointerCancel={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
              }}
              onWheel={(event) => {
                event.preventDefault();
                updateZoom(zoom + (event.deltaY < 0 ? 0.08 : -0.08));
              }}
            >
              {cropGeometry ? (
                <img
                  className="absolute max-w-none select-none object-fill"
                  src={sourceImage.dataUrl}
                  alt=""
                  draggable={false}
                  style={imageStyle}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wide text-neutral-500">Cargando</div>
              )}
              <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-white/45" />
              <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_30px_rgba(0,0,0,0.55)]" />
            </div>
          </div>
          <label className="block">
            <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-neutral-400">
              <span>Zoom</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              className="w-full accent-amber-400"
              type="range"
              min="1"
              max="4"
              step="0.01"
              value={zoom}
              onChange={(event) => updateZoom(event.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-800 px-4 py-3">
          <button
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-neutral-300 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500/40"
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className="border border-amber-400 bg-amber-500 px-3 py-2 text-xs font-bold uppercase tracking-wide text-neutral-950 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={!cropGeometry || saving}
            onClick={confirmCrop}
          >
            {saving ? "Guardando" : "Usar token"}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}

function MonsterStatBlockHeader({ monster, title = "", onRename = null, onDragStart = null, onMinimize = null, onDuplicate = null, onClose = null, onMonsterEdit = null, onMonsterTokenImageChange = null }) {
  const [pendingTokenImage, setPendingTokenImage] = useState(null);

  async function handleTokenImageChange(event) {
    const input = event.currentTarget;
    const file = Array.from(input.files || []).find((entry) => String(entry.type || "").startsWith("image/"));
    if (!file || !onMonsterTokenImageChange) return;
    try {
      const image = await readImageFileAsStoredImage(file, `${monster?.name || "Monster"} token`);
      setPendingTokenImage(storedImageSnapshot({
        ...image,
        name: file.name || `${monster?.name || "Monster"} token`
      }));
    } catch (error) {
      console.error(error);
    } finally {
      input.value = "";
    }
  }

  return (
    <header
      className={`flex items-start justify-between gap-3 border-b-2 border-amber-500 bg-neutral-900 px-3 py-2 ${onDragStart ? "cursor-move" : ""}`}
      onPointerDown={onDragStart}
    >
      <div className="min-w-0">
        <EditableNoteTitle
          title={title || monster.name}
          className="block max-w-full truncate font-serif text-left text-xl font-bold uppercase leading-none tracking-wide text-amber-500"
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
        <div
          className="group relative h-20 w-20 shrink-0"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <MonsterTokenImage monster={monster} className="h-20 w-20" />
          {onMonsterTokenImageChange ? (
            <label
              className="absolute inset-x-1 bottom-1 cursor-pointer rounded-sm border border-amber-300/70 bg-neutral-950/90 px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-amber-100 opacity-0 shadow transition hover:bg-amber-950 focus-within:opacity-100 group-hover:opacity-100"
              title="Cambiar icono del token"
              onClick={(event) => event.stopPropagation()}
            >
              Cambiar
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={handleTokenImageChange}
              />
            </label>
          ) : null}
          {onMonsterTokenImageChange && monster?.tokenImage?.dataUrl ? (
            <button
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full border border-neutral-600 bg-neutral-950 text-[10px] font-bold text-neutral-200 shadow hover:bg-red-950 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
              type="button"
              title="Restaurar token automatico"
              onClick={(event) => {
                event.stopPropagation();
                onMonsterTokenImageChange(null);
              }}
            >
              X
            </button>
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
      {pendingTokenImage ? (
        <TokenImageCropperModal
          sourceImage={pendingTokenImage}
          title={monster?.name || title || "Token"}
          onCancel={() => setPendingTokenImage(null)}
          onConfirm={(image) => {
            onMonsterTokenImageChange(image);
            setPendingTokenImage(null);
          }}
        />
      ) : null}
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
  onMonsterEdit,
  onMonsterPanelSelect,
  onMonsterTextNoteAdd,
  onMonsterTextNoteRename,
  onMonsterTextNoteChange,
  onMonsterTextNoteRemove
}) {
  const frameNote = shellNote || note;
  const frameNoteId = frameNote.id;
  const noteActionId = actionNoteId || note.id;
  const monsterTextNotes = normalizeMonsterTextNotes(note.monsterTextNotes);
  const activeMonsterPanelId = monsterActivePanelId(note);
  const activeMonsterTextNote = monsterTextNotes.find((entry) => entry.id === activeMonsterPanelId) || null;

  function addRoll(label, roll) {
    onRoll(noteActionId, label, roll);
  }

  if (frameNote.minimized) {
    return (
      <article
        className={`absolute flex h-11 cursor-move items-center justify-between gap-3 overflow-hidden border bg-neutral-900 px-3 text-neutral-300 shadow-2xl ${isDropTarget ? "border-sky-300 ring-2 ring-sky-300/60" : "border-amber-500"}`}
        data-dm-note="true"
        data-note-kind="monster"
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
      data-note-kind="monster"
      data-note-action-id={noteActionId}
      style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: frameNote.width, height: frameNote.height, flexDirection: "column" }}
      onPointerDown={onFocus}
    >
      <MonsterStatBlockHeader
        monster={note.monster}
        title={noteDisplayName(note)}
        onRename={(value) => onRename?.(noteActionId, value)}
        onMonsterEdit={(path, value) => onMonsterEdit?.(noteActionId, path, value)}
        onMonsterTokenImageChange={(image) => onMonsterEdit?.(noteActionId, ["tokenImage"], image)}
        onDragStart={(event) => onDragStart(event, frameNoteId)}
        onMinimize={() => onMinimize(frameNoteId)}
        onDuplicate={() => onDuplicate(noteActionId)}
        onClose={(event) => onClose(noteActionId, event)}
      />
      {tabBar}
      <div
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-neutral-800 bg-neutral-950/90 px-2 py-1.5"
        data-board-control="true"
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <button
          className={`h-8 shrink-0 border px-3 text-xs font-bold uppercase transition focus:outline-none focus:ring-1 focus:ring-amber-400 ${activeMonsterPanelId === "stats" ? "border-amber-500 bg-amber-500/15 text-amber-100" : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500 hover:text-neutral-100"}`}
          type="button"
          onClick={() => onMonsterPanelSelect?.(noteActionId, "stats")}
        >
          Ficha
        </button>
        {monsterTextNotes.map((textNote) => {
          const isActive = activeMonsterPanelId === textNote.id;
          return (
            <div
              key={textNote.id}
              className={`flex h-8 max-w-48 shrink-0 items-center border text-xs transition ${isActive ? "border-amber-500 bg-amber-500/15 text-amber-100" : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500 hover:text-neutral-100"}`}
            >
              <button
                className="min-w-0 flex-1 px-2 text-left"
                type="button"
                title={textNote.title}
                onClick={() => onMonsterPanelSelect?.(noteActionId, textNote.id)}
              >
                <CtrlEditableText
                  value={textNote.title}
                  className="block max-w-32 truncate font-bold uppercase"
                  inputClassName="w-32 border border-amber-500 bg-neutral-950 px-1 py-0.5 text-xs font-bold uppercase text-amber-100 focus:outline-none"
                  title="Doble click o Ctrl+click para renombrar"
                  editOnDoubleClick
                  onCommit={(value) => onMonsterTextNoteRename?.(noteActionId, textNote.id, value)}
                >
                  {textNote.title}
                </CtrlEditableText>
              </button>
              <button
                className="h-full w-7 border-l border-neutral-800 text-[11px] font-bold text-neutral-500 hover:bg-red-950/40 hover:text-red-200 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                type="button"
                title="Eliminar nota"
                onClick={() => onMonsterTextNoteRemove?.(noteActionId, textNote.id)}
              >
                X
              </button>
            </div>
          );
        })}
        <button
          className="h-8 shrink-0 border border-sky-500/60 bg-sky-950/60 px-3 text-xs font-bold uppercase text-sky-100 hover:bg-sky-900 focus:outline-none focus:ring-1 focus:ring-sky-400"
          type="button"
          onClick={() => onMonsterTextNoteAdd?.(noteActionId)}
        >
          + Nota
        </button>
      </div>
      {note.linkedMapToken ? (
        <div className="grid shrink-0 grid-cols-3 border-b border-neutral-800 bg-neutral-950/90 px-3 py-2 text-xs text-neutral-300">
          <div><span className="font-bold uppercase text-neutral-500">AC</span> <span className="font-bold text-sky-200">{formatAc(note.monster)}</span></div>
          <div><span className="font-bold uppercase text-neutral-500">HP</span> <span className="font-bold text-emerald-200">{note.hpCurrent ?? "--"} / {note.hpMax ?? "--"}</span></div>
          <div><span className="font-bold uppercase text-neutral-500">Ini</span> <span className="font-bold text-amber-300">{note.tokenInitiative ?? "Token"}</span></div>
        </div>
      ) : null}
      {activeMonsterTextNote ? (
        <div className="min-h-0 flex flex-1 flex-col bg-neutral-950/80">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-800 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate font-serif text-base font-bold uppercase text-amber-500">{activeMonsterTextNote.title}</div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Notas de {noteDisplayName(note)}</div>
            </div>
          </div>
          <textarea
            className="min-h-0 flex-1 resize-none bg-neutral-950 px-4 py-3 text-sm leading-relaxed text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500/30"
            value={activeMonsterTextNote.content}
            placeholder="Escribi notas privadas de este monstruo..."
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => onMonsterTextNoteChange?.(noteActionId, activeMonsterTextNote.id, event.target.value)}
          />
        </div>
      ) : (
        <div className="min-h-0 flex flex-1">
          <MonsterStatBlockBody
            noteId={noteActionId}
            monster={note.monster}
            onRoll={addRoll}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
            hpState={{ current: note.hpCurrent, max: note.hpMax }}
            onHpChange={(field, value) => onHpChange(noteActionId, field, value)}
            onRollHp={() => onRollHp(noteActionId)}
            onMonsterEdit={(path, value) => onMonsterEdit?.(noteActionId, path, value)}
          />
          <MonsterRollPanel
            note={note}
            onToggle={onToggleDice}
            className="relative flex h-full w-64 shrink-0 flex-col border-l border-neutral-700 bg-neutral-950"
          />
        </div>
      )}
      <ResizeHandle edge="right" className="right-0 top-8 h-[calc(100%-40px)] w-2 cursor-ew-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="bottom" className="bottom-0 left-0 h-2 w-[calc(100%-8px)] cursor-ns-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="corner" className="bottom-1 right-1 h-5 w-5 cursor-nwse-resize border border-amber-400 bg-amber-500/50 hover:bg-amber-500/80 focus:bg-amber-500/80" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
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
      data-note-action-id={noteActionId}
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
  onTextChange,
  onTextImagePaste,
  onTextImageRemove
}) {
  const frameNote = shellNote || note;
  const frameNoteId = frameNote.id;
  const noteActionId = actionNoteId || note.id;
  const title = noteDisplayName(note);
  const images = Array.isArray(note.textImages) ? note.textImages.filter((image) => image?.dataUrl) : [];

  async function handleTextPaste(event) {
    const imageFile = firstClipboardImageFile(event.clipboardData);
    if (!imageFile) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      const image = await readImageFileAsStoredImage(imageFile);
      onTextImagePaste?.(noteActionId, image);
    } catch (error) {
      console.error(error);
    }
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
      data-note-action-id={noteActionId}
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
      {images.length ? (
        <div className="grid max-h-52 shrink-0 grid-cols-2 gap-2 overflow-y-auto border-b border-neutral-800 bg-neutral-950/80 p-3">
          {images.map((image) => (
            <figure key={image.id} className="relative overflow-hidden border border-neutral-800 bg-neutral-950">
              <img
                className="h-32 w-full object-contain"
                src={image.dataUrl}
                alt={image.name || "Imagen pegada"}
                draggable={false}
                onPointerDown={(event) => event.stopPropagation()}
              />
              <figcaption className="truncate border-t border-neutral-800 px-2 py-1 text-[11px] text-neutral-500">
                {image.name || "Imagen pegada"}
              </figcaption>
              <button
                className="absolute right-1 top-1 h-6 w-6 border border-neutral-700 bg-neutral-950/90 text-xs font-bold text-neutral-200 hover:border-red-400 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                type="button"
                aria-label="Quitar imagen"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onTextImageRemove?.(noteActionId, image.id)}
              >
                X
              </button>
            </figure>
          ))}
        </div>
      ) : null}
      <textarea
        className="min-h-0 flex-1 resize-none bg-neutral-950/60 px-4 py-3 text-sm leading-relaxed text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500/30"
        value={note.textContent || ""}
        placeholder="Escribi una nota..."
        onPointerDown={(event) => event.stopPropagation()}
        onPaste={handleTextPaste}
        onChange={(event) => onTextChange(noteActionId, event.target.value)}
      />
      <ResizeHandle edge="right" className="right-0 top-8 h-[calc(100%-40px)] w-2 cursor-ew-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="bottom" className="bottom-0 left-0 h-2 w-[calc(100%-8px)] cursor-ns-resize" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
      <ResizeHandle edge="corner" className="bottom-1 right-1 h-5 w-5 cursor-nwse-resize border border-amber-400 bg-amber-500/50 hover:bg-amber-500/80 focus:bg-amber-500/80" onResizeStart={(event, edge) => onResizeStart(event, frameNoteId, edge)} />
    </article>
  );
}

function MapTokenTracker({
  mapNoteId = "",
  activePageId = "",
  tokens,
  tokenGroups = [],
  onHpChange,
  onTokenContextMenu,
  onRollInitiativeTokens,
  onTokenGroupAdd,
  onTokenGroupRename,
  onTokenGroupRemove,
  onTokenGroupChange,
  onTokenGroupGlobalChange,
  onTokenGroupCombatChange
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [groupDraft, setGroupDraft] = useState("");
  const [draggedTokenId, setDraggedTokenId] = useState("");
  const [dragOverGroupId, setDragOverGroupId] = useState(null);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState({});
  const visibleTokens = [...tokens].sort((left, right) => {
    const rightInitiative = Number(right.initiative);
    const leftInitiative = Number(left.initiative);
    if (Number.isFinite(rightInitiative) && Number.isFinite(leftInitiative) && rightInitiative !== leftInitiative) {
      return rightInitiative - leftInitiative;
    }
    return String(left.name || "").localeCompare(String(right.name || ""));
  });
  const groups = normalizeMapTokenGroups(tokenGroups);
  const groupIds = new Set(groups.map((group) => group.id));
  const tokensByGroup = groups.map((group) => ({
    ...group,
    tokens: visibleTokens.filter((token) => token.groupId === group.id)
  }));
  const ungroupedTokens = visibleTokens.filter((token) => !token.groupId || !groupIds.has(token.groupId));
  const sections = groups.length
    ? [
        ...tokensByGroup,
        ...(ungroupedTokens.length ? [{ id: "", name: "Sin grupo", tokens: ungroupedTokens, ungrouped: true }] : [])
      ]
    : [{ id: "", name: "Tokens", tokens: visibleTokens, ungrouped: true }];
  if (!visibleTokens.length) return null;

  function addGroup() {
    setGroupDraft(`Grupo ${groups.length + 1}`);
    setIsAddingGroup(true);
  }

  function commitGroupDraft() {
    const trimmed = String(groupDraft || "").trim();
    if (!trimmed) {
      setIsAddingGroup(false);
      setGroupDraft("");
      return;
    }
    onTokenGroupAdd?.(trimmed);
    setIsAddingGroup(false);
    setGroupDraft("");
  }

  function removeGroup(group) {
    if (!group?.id) return;
    onTokenGroupRemove?.(group.id, group.sourcePageId || activePageId);
  }

  function draggedTokenIdFromEvent(event) {
    const plainPayload = parseMapTokenDragPayload(event.dataTransfer?.getData?.("text/plain"));
    return draggedTokenId || event.dataTransfer?.getData?.("application/x-dm-map-token") || plainPayload?.tokenId || event.dataTransfer?.getData?.("text/plain") || "";
  }

  function draggedTokenPageIdFromEvent(event) {
    const plainPayload = parseMapTokenDragPayload(event.dataTransfer?.getData?.("text/plain"));
    return event.dataTransfer?.getData?.("application/x-dm-map-token-page") || plainPayload?.sourcePageId || activePageId || "";
  }

  function startTokenDrag(event, token) {
    if (!token?.id) return;
    const sourcePageId = token.sourcePageId || activePageId;
    const plainPayload = serializeMapTokenDragPayload({ mapNoteId, sourcePageId, tokenId: token.id });
    setDraggedTokenId(token.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-dm-map-token", token.id);
    event.dataTransfer.setData("application/x-dm-map-token-note", mapNoteId);
    event.dataTransfer.setData("application/x-dm-map-token-page", sourcePageId);
    event.dataTransfer.setData("text/plain", plainPayload);
  }

  function handleGroupDragOver(event, section) {
    if (!groups.length) return;
    const tokenId = draggedTokenIdFromEvent(event);
    if (!tokenId) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDragOverGroupId(section.id || "");
  }

  function handleGroupDrop(event, section) {
    if (!groups.length) return;
    const tokenId = draggedTokenIdFromEvent(event);
    if (!tokenId) return;
    event.preventDefault();
    event.stopPropagation();
    onTokenGroupChange?.(tokenId, section.id || "", draggedTokenPageIdFromEvent(event));
    setDraggedTokenId("");
    setDragOverGroupId(null);
  }

  function stopTokenDrag() {
    setDraggedTokenId("");
    setDragOverGroupId(null);
  }

  function toggleGroupCollapsed(section) {
    const sectionId = section.id || "__ungrouped__";
    setCollapsedGroupIds((current) => ({
      ...current,
      [sectionId]: !current[sectionId]
    }));
  }

  function isGroupCollapsed(section) {
    return Boolean(collapsedGroupIds[section.id || "__ungrouped__"]);
  }

  function rollSectionInitiative(section) {
    const tokenTargets = (section.tokens || [])
      .map((token) => ({ tokenId: token.id, pageId: token.sourcePageId || activePageId }))
      .filter((target) => target.tokenId && target.pageId);
    if (!tokenTargets.length) return;
    onRollInitiativeTokens?.(tokenTargets);
  }

  function renderTokenRow(token, section) {
    const isDragging = draggedTokenId === token.id;
    const showHealth = section?.ungrouped || Boolean(section?.inCombat);
    return (
      <div
        key={token.id}
        className={`grid cursor-grab grid-cols-[34px_minmax(0,1fr)_48px_92px_54px] items-center gap-2 border-b border-neutral-900 px-3 py-2 text-xs transition hover:bg-neutral-900 focus-within:bg-neutral-900 active:cursor-grabbing ${isDragging ? "bg-sky-950/40 opacity-60" : ""}`}
        title="Arrastrar a un grupo o click derecho para abrir menu del token"
        draggable
        onDragStart={(event) => startTokenDrag(event, token)}
        onDragEnd={stopTokenDrag}
        onContextMenu={(event) => onTokenContextMenu?.(event, token.id, token.sourcePageId || activePageId)}
      >
        <MapTokenImage token={token} className="h-7 w-7" />
        <div className="min-w-0">
          <div className="truncate font-bold text-neutral-100" title={token.name || "Token"}>{token.name || "Token"}</div>
          <div className="flex min-w-0 items-center gap-1">
            <span className="shrink-0 text-[10px] uppercase text-neutral-500">{token.kind === "character" ? "PC" : "Monster"}</span>
            {token.isCrossPageToken ? (
              <span className="min-w-0 truncate text-[10px] font-bold uppercase text-sky-300" title={token.sourcePageName || "Otro mapa"}>
                {token.sourcePageName || "Otro mapa"}
              </span>
            ) : null}
            {groups.length ? (
              <select
                className="min-w-0 flex-1 border border-neutral-800 bg-neutral-950 px-1 py-0.5 text-[10px] font-bold uppercase text-neutral-300 focus:border-amber-500 focus:outline-none"
                title="Mover a grupo"
                value={groupIds.has(token.groupId) ? token.groupId : ""}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onChange={(event) => onTokenGroupChange?.(token.id, event.target.value, token.sourcePageId || activePageId)}
              >
                <option value="">Sin grupo</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
        <div className="truncate text-center font-bold text-sky-200" title={token.ac || "Unknown"}>{token.ac || "?"}</div>
        {showHealth ? (
          <div
            className="flex items-center justify-center gap-1"
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <NumericExpressionInput
              className="h-7 w-10 border border-neutral-700 bg-neutral-900 px-1 text-center font-bold text-neutral-100 focus:border-amber-500 focus:outline-none"
              value={token.hpCurrent}
              integer
              onPointerDown={(event) => event.stopPropagation()}
              onChange={(value) => onHpChange?.(token.id, value, token.sourcePageId || activePageId)}
            />
            {token.hpMax !== "" ? <span className="min-w-0 text-[10px] text-neutral-500">/{token.hpMax}</span> : null}
          </div>
        ) : (
          <div className="text-center text-[10px] font-bold uppercase text-neutral-600" title="Fuera de combate">
            --
          </div>
        )}
        <div className="text-center font-bold text-amber-300" title={token.initiativeDetail || ""}>
          {token.initiative !== "" ? token.initiative : "--"}
        </div>
      </div>
    );
  }

  return (
    <aside
      className="pointer-events-none absolute bottom-3 left-3 top-3 z-20"
      data-board-control="true"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <button
        className="pointer-events-auto absolute left-0 top-2 z-30 flex h-10 w-8 items-center justify-center border border-neutral-700 bg-neutral-950 text-base font-black text-amber-400 shadow-xl hover:border-amber-500 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
        type="button"
        aria-label={collapsed ? "Mostrar lista de tokens" : "Ocultar lista de tokens"}
        title={collapsed ? "Mostrar tokens" : "Ocultar tokens"}
        onClick={() => setCollapsed((value) => !value)}
      >
        {collapsed ? ">" : "<"}
      </button>
      <div
        className={`ml-8 flex h-full w-96 max-w-[calc(100vw-4rem)] flex-col border border-neutral-700 bg-neutral-950 text-neutral-200 shadow-xl transition duration-200 ease-out ${collapsed ? "pointer-events-none -translate-x-[calc(100%+2rem)] opacity-0" : "pointer-events-auto translate-x-0 opacity-100"}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-3 py-2">
          <h3 className="font-serif text-sm font-bold uppercase text-amber-500">Tokens</h3>
          <div className="flex shrink-0 items-center gap-1">
            <button
              className="h-7 shrink-0 border border-sky-500/60 bg-sky-950/60 px-2 text-[11px] font-bold uppercase text-sky-100 hover:bg-sky-900 focus:outline-none focus:ring-1 focus:ring-sky-400"
              type="button"
              title="Agregar subdivision"
              onClick={addGroup}
            >
              Grupo +
            </button>
          </div>
        </div>
        {isAddingGroup ? (
          <div
            className="flex items-center gap-1 border-b border-neutral-800 bg-neutral-900/70 px-3 py-2"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <input
              className="min-w-0 flex-1 border border-sky-500 bg-neutral-950 px-2 py-1 text-xs font-bold uppercase text-sky-100 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
              value={groupDraft}
              autoFocus
              placeholder="Nombre del grupo"
              onChange={(event) => setGroupDraft(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") commitGroupDraft();
                if (event.key === "Escape") {
                  setIsAddingGroup(false);
                  setGroupDraft("");
                }
              }}
            />
            <button
              className="h-7 border border-sky-500/60 bg-sky-950/60 px-2 text-[11px] font-bold uppercase text-sky-100 hover:bg-sky-900 focus:outline-none focus:ring-1 focus:ring-sky-400"
              type="button"
              onClick={commitGroupDraft}
            >
              OK
            </button>
            <button
              className="h-7 border border-neutral-700 bg-neutral-950 px-2 text-[11px] font-bold uppercase text-neutral-300 hover:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              type="button"
              onClick={() => {
                setIsAddingGroup(false);
                setGroupDraft("");
              }}
            >
              X
            </button>
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-[34px_minmax(0,1fr)_48px_92px_54px] gap-2 border-b border-neutral-800 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
            <span />
            <span>Nombre</span>
            <span className="text-center">AC</span>
            <span className="text-center">HP</span>
            <span className="text-center">Ini</span>
          </div>
          {sections.map((section) => {
            const isDropTarget = groups.length > 0 && dragOverGroupId === (section.id || "");
            const isCollapsed = isGroupCollapsed(section);
            return (
            <section
              key={section.id || "ungrouped"}
              className={`border-b border-neutral-800/80 transition ${isDropTarget ? "bg-sky-950/30 ring-1 ring-inset ring-sky-400/70" : ""}`}
              onDragOver={(event) => handleGroupDragOver(event, section)}
              onDragEnter={(event) => handleGroupDragOver(event, section)}
              onDragLeave={(event) => {
                if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
                setDragOverGroupId(null);
              }}
              onDrop={(event) => handleGroupDrop(event, section)}
            >
              {groups.length ? (
                <div className="flex items-center justify-between gap-2 border-b border-neutral-900 bg-neutral-900/70 px-3 py-1.5">
                  <button
                    className="h-6 w-6 shrink-0 border border-neutral-700 bg-neutral-950 text-[11px] font-black text-amber-300 hover:border-amber-500 hover:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    type="button"
                    title={isCollapsed ? "Expandir grupo" : "Colapsar grupo"}
                    onClick={() => toggleGroupCollapsed(section)}
                  >
                    {isCollapsed ? "+" : "-"}
                  </button>
                  <div className="min-w-0 flex-1">
                    {section.ungrouped ? (
                      <span className="block truncate text-[11px] font-black uppercase tracking-wide text-neutral-400">{section.name}</span>
                    ) : (
                      <CtrlEditableText
                        value={section.name}
                        className="block truncate text-[11px] font-black uppercase tracking-wide text-amber-300"
                        inputClassName="w-full border border-amber-500 bg-neutral-950 px-1 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-100 focus:outline-none"
                        title="Doble click o Ctrl+click para renombrar"
                        editOnDoubleClick
                        onCommit={(value) => onTokenGroupRename?.(section.id, value, section.sourcePageId || activePageId)}
                      >
                        {section.name}
                      </CtrlEditableText>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase text-neutral-500">{section.tokens.length}</span>
                  <button
                    className="h-6 shrink-0 border border-amber-500/60 bg-amber-950/60 px-2 text-[10px] font-bold uppercase text-amber-100 hover:bg-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-950 disabled:text-neutral-600"
                    type="button"
                    title="Tirar iniciativa de este grupo"
                    disabled={!section.tokens.length}
                    onClick={() => rollSectionInitiative(section)}
                  >
                    Roll
                  </button>
                  {!section.ungrouped ? (
                    <button
                      className={`h-6 w-7 shrink-0 border text-sm font-black leading-none focus:outline-none focus:ring-1 ${section.inCombat ? "border-red-400/80 bg-red-950/80 text-red-200 hover:bg-red-900 focus:ring-red-400" : "border-neutral-700 bg-neutral-950 text-neutral-500 hover:border-neutral-500 hover:text-neutral-200 focus:ring-neutral-500"}`}
                      type="button"
                      aria-label={section.inCombat ? "Marcar grupo fuera de combate" : "Marcar grupo en combate"}
                      title={section.inCombat ? "En combate: click para sacar de combate" : "Fuera de combate: click para entrar en combate"}
                      onClick={() => onTokenGroupCombatChange?.(section.id, !section.inCombat, section.sourcePageId || activePageId)}
                    >
                      {"\u2694"}
                    </button>
                  ) : null}
                  {!section.ungrouped ? (
                    <button
                      className={`h-6 shrink-0 border px-2 text-[10px] font-bold uppercase focus:outline-none focus:ring-1 ${section.global ? "border-emerald-400/70 bg-emerald-950/70 text-emerald-100 hover:bg-emerald-900 focus:ring-emerald-400" : "border-neutral-700 bg-neutral-950 text-neutral-400 hover:border-sky-400 hover:text-sky-100 focus:ring-sky-400"}`}
                      type="button"
                      title={section.global ? "Este grupo se ve en todos los mapas" : "Hacer visible este grupo en todos los mapas"}
                      onClick={() => onTokenGroupGlobalChange?.(section.id, !section.global, section.sourcePageId || activePageId)}
                    >
                      {section.global ? "Global" : "Local"}
                    </button>
                  ) : null}
                  {!section.ungrouped ? (
                    <button
                      className="h-6 w-6 shrink-0 border border-neutral-700 bg-neutral-950 text-[11px] font-bold text-neutral-400 hover:border-red-400 hover:bg-red-950/50 hover:text-red-100 focus:outline-none focus:ring-1 focus:ring-red-400"
                      type="button"
                      title="Eliminar grupo"
                      onClick={() => removeGroup(section)}
                    >
                      X
                    </button>
                  ) : null}
                </div>
              ) : null}
              {isCollapsed ? null : (
                section.tokens.length ? section.tokens.map((token) => renderTokenRow(token, section)) : (
                  <div className="px-3 py-3 text-center text-[11px] font-bold uppercase text-neutral-600">Sin tokens</div>
                )
              )}
            </section>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function containedMediaRect(containerWidth, containerHeight, naturalWidth, naturalHeight) {
  const safeContainerWidth = Math.max(1, Number(containerWidth) || 1);
  const safeContainerHeight = Math.max(1, Number(containerHeight) || 1);
  const safeNaturalWidth = Math.max(1, Number(naturalWidth) || safeContainerWidth);
  const safeNaturalHeight = Math.max(1, Number(naturalHeight) || safeContainerHeight);
  const scale = Math.min(safeContainerWidth / safeNaturalWidth, safeContainerHeight / safeNaturalHeight);
  const width = safeNaturalWidth * scale;
  const height = safeNaturalHeight * scale;
  return {
    left: (safeContainerWidth - width) / 2,
    top: (safeContainerHeight - height) / 2,
    width,
    height
  };
}

function MapFogOverlay({
  fog,
  layout,
  maskId,
  preview,
  opacity = 0.92,
  className = "z-20 pointer-events-none",
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onContextMenu
}) {
  const normalizedFog = normalizeMapFog(fog);
  if (!normalizedFog.enabled || !layout?.width || !layout?.height) return null;
  function renderBrushShape(point, props = {}) {
    if (point.shape === "square") {
      return (
        <rect
          x={point.x - point.rx}
          y={point.y - point.ry}
          width={point.rx * 2}
          height={point.ry * 2}
          {...props}
        />
      );
    }
    return (
      <ellipse
        cx={point.x}
        cy={point.y}
        rx={point.rx}
        ry={point.ry}
        {...props}
      />
    );
  }
  return (
    <div
      className={`absolute ${className}`}
      style={{ left: layout.left, top: layout.top, width: layout.width, height: layout.height }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
      onContextMenu={onContextMenu}
    >
      <svg className="h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="1" height="1" fill="white" />
            {normalizedFog.revealed.map((point, index) => (
              <g key={`${index}-${point.x}-${point.y}`}>
                {renderBrushShape(point, { fill: point.mode === "hide" ? "white" : "black" })}
              </g>
            ))}
          </mask>
        </defs>
        <rect x="0" y="0" width="1" height="1" fill={`rgba(2,6,23,${opacity})`} mask={`url(#${maskId})`} />
        {preview ? renderBrushShape(preview, {
          fill: preview.mode === "hide" ? "rgba(14,165,233,0.18)" : "rgba(250,204,21,0.16)",
          stroke: preview.mode === "hide" ? "rgba(125,211,252,0.96)" : "rgba(250,204,21,0.96)",
          strokeWidth: 0.004,
          vectorEffect: "non-scaling-stroke"
        }) : null}
      </svg>
    </div>
  );
}

function MapPingOverlay({ pings, layout }) {
  const visiblePings = Array.isArray(pings) ? pings : [];
  if (!visiblePings.length || !layout?.width || !layout?.height) return null;
  return (
    <div
      className="pointer-events-none absolute z-[35]"
      style={{ left: layout.left, top: layout.top, width: layout.width, height: layout.height }}
      aria-hidden="true"
    >
      {visiblePings.map((ping) => (
        <div
          key={ping.id}
          className="absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 animate-[mapPingFade_5s_ease-out_forwards] rounded-full border-[3px] border-sky-300 shadow-[0_0_0_6px_rgba(56,189,248,0.20),0_0_28px_rgba(56,189,248,0.74)] before:absolute before:left-1/2 before:top-1/2 before:h-[3px] before:w-5 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-sky-100 before:shadow-[0_0_10px_rgba(14,165,233,0.9)] after:absolute after:left-1/2 after:top-1/2 after:h-[3px] after:w-5 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-90 after:rounded-full after:bg-sky-100 after:shadow-[0_0_10px_rgba(14,165,233,0.9)]"
          style={{ left: `${ping.x * layout.width}px`, top: `${ping.y * layout.height}px` }}
        >
          <span className="absolute left-1/2 top-[calc(100%+4px)] max-w-36 -translate-x-1/2 truncate border border-sky-400/80 bg-neutral-950/95 px-2 py-1 text-[11px] font-extrabold leading-none text-sky-100 shadow">
            {ping.playerName || "Jugador"}
          </span>
        </div>
      ))}
    </div>
  );
}

function MapNote({
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
  onMapImageChange,
  onMapGridChange,
  onMapPageAdd,
  onMapPageSelect,
  onMapPageRename,
  onMapPageClose,
  onMapFogChange,
  onShareVvtMap,
  onMapPing,
  isSharedVvtMap = false,
  onMapTokenHpChange,
  onMapTokensRollInitiative,
  onMapTokenGroupAdd,
  onMapTokenGroupRename,
  onMapTokenGroupRemove,
  onMapTokenGroupChange,
  onMapTokenGroupGlobalChange,
  onMapTokenGroupCombatChange,
  onMapTrackerTokenDrop,
  selectedMapTokenIds = [],
  onMapTokenSelectionChange,
  onMapTokenDragStart,
  onMapTokenContextMenu,
  onMapContextAddMonster,
  onMapContextAddNpc,
  onMapMarkerAdd,
  onMapMarkerRename,
  onMapMarkerDragStart,
  onMapMarkerResizeStart,
  onMapMarkerContextMenu,
  vvtPings = [],
  boardScale = 1
}) {
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const imageRef = useRef(null);
  const fogBrushPointerRef = useRef(null);
  const fogStrokeRef = useRef(null);
  const fogBrushModeRef = useRef("reveal");
  const pendingImageModeRef = useRef("replace");
  const leftControlDownRef = useRef(false);
  const handleMapWheelRef = useRef(null);
  const mapPanRef = useRef(null);
  const [error, setError] = useState("");
  const [isAutoFittingGrid, setIsAutoFittingGrid] = useState(false);
  const [isGridPanelOpen, setIsGridPanelOpen] = useState(false);
  const [isFogPanelOpen, setIsFogPanelOpen] = useState(false);
  const [isFogBrushActive, setIsFogBrushActive] = useState(false);
  const [fogBrushMode, setFogBrushMode] = useState("reveal");
  const [fogBrushPreview, setFogBrushPreview] = useState(null);
  const [fogStroke, setFogStroke] = useState(null);
  const [fogContextMenu, setFogContextMenu] = useState(null);
  const [contextMenuOpenSections, setContextMenuOpenSections] = useState({ fog: true, token: false, markers: false, forms: false });
  const [baseImageLayout, setBaseImageLayout] = useState(null);
  const [mapView, setMapView] = useState({ scale: 1, x: 0, y: 0 });
  const [mapTokenSelectionBox, setMapTokenSelectionBox] = useState(null);
  const mapTokenSelectionRef = useRef(null);
  const frameNote = shellNote || note;
  const frameNoteId = frameNote.id;
  const noteActionId = actionNoteId || note.id;
  const title = noteDisplayName(note);
  const pages = mapPagesForNote(note);
  const activePage = activeMapPageForNote(note) || pages[0] || normalizeMapPage({ id: defaultMapPageId(noteActionId) }, defaultMapPageId(noteActionId), 0);
  const image = activePage.mapImage || null;
  const imageSrc = mapImageUrl(image);
  const tokens = Array.isArray(activePage.mapTokens) ? activePage.mapTokens : [];
  const activePageId = activePage.id;
  const tokenGroups = mapTokenGroupsSnapshot(activePage.mapTokenGroups).map((group) => ({
    ...group,
    sourcePageId: activePageId,
    sourcePageName: activePage.name
  }));
  const activeGroupIds = new Set(tokenGroups.map((group) => group.id));
  const globalTokenGroups = pages.flatMap((page) => (
    mapTokenGroupsSnapshot(page.mapTokenGroups)
      .filter((group) => group.global && !activeGroupIds.has(group.id))
      .map((group) => ({
        ...group,
        sourcePageId: page.id,
        sourcePageName: page.name
      }))
  ));
  const visibleTokenGroups = [...tokenGroups, ...globalTokenGroups];
  const visibleGlobalGroupIds = new Set(visibleTokenGroups.filter((group) => group.global).map((group) => group.id));
  const visibleTokens = [
    ...tokens.map((token) => ({
      ...token,
      sourcePageId: activePageId,
      sourcePageName: activePage.name,
      isCrossPageToken: false
    })),
    ...pages
      .filter((page) => page.id !== activePageId)
      .flatMap((page) => (page.mapTokens || [])
        .filter((token) => token.groupId && visibleGlobalGroupIds.has(token.groupId))
        .map((token) => ({
          ...token,
          sourcePageId: page.id,
          sourcePageName: page.name,
          isCrossPageToken: true
        })))
  ];
  const markers = Array.isArray(activePage.mapMarkers) ? activePage.mapMarkers : [];
  const grid = normalizeMapGrid(activePage.mapGrid);
  const fog = normalizeMapFog(activePage.fogOfWar);
  const displayedFog = fogStroke || fog;
  const fogMaskId = `map-fog-${noteActionId}-${activePage.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const imageLayout = baseImageLayout ? {
    left: baseImageLayout.left + mapView.x,
    top: baseImageLayout.top + mapView.y,
    width: baseImageLayout.width * mapView.scale,
    height: baseImageLayout.height * mapView.scale
  } : null;
  const mapVisualScale = imageLayout?.width && baseImageLayout?.width ? imageLayout.width / baseImageLayout.width : 1;
  const fixedOverlayScale = 1 / clamp(Number(boardScale) || 1, BOARD_MIN_ZOOM, BOARD_MAX_ZOOM);
  const localImageLayout = imageLayout ? { left: 0, top: 0, width: imageLayout.width, height: imageLayout.height } : null;

  useEffect(() => {
    fogBrushModeRef.current = fogBrushMode;
  }, [fogBrushMode]);

  useEffect(() => {
    fogBrushPointerRef.current = null;
    fogStrokeRef.current = null;
    setFogStroke(null);
  }, [activePage.id]);

  useEffect(() => {
    handleMapWheelRef.current = handleMapWheel;
  });

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return undefined;
    const handleNativeWheel = (event) => {
      handleMapWheelRef.current?.(event);
    };
    body.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      body.removeEventListener("wheel", handleNativeWheel);
    };
  });

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.code === "ControlLeft") leftControlDownRef.current = true;
    }

    function handleKeyUp(event) {
      if (event.code === "ControlLeft") leftControlDownRef.current = false;
    }

    function clearLeftControl() {
      leftControlDownRef.current = false;
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearLeftControl);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearLeftControl);
    };
  }, []);

  useEffect(() => {
    if (!image || image.objectUrl || (!image.assetId && !image.dataUrl)) return undefined;
    let cancelled = false;
    hydrateMapImage(image)
      .then((hydratedImage) => {
        if (cancelled || !hydratedImage) return;
        if (hydratedImage.objectUrl !== image.objectUrl || hydratedImage.dataUrl !== image.dataUrl || hydratedImage.assetId !== image.assetId) {
          onMapImageChange?.(noteActionId, hydratedImage, activePage.id);
        }
      })
      .catch((error) => {
        if (!cancelled) setError(error?.message || "Could not load the map image.");
      });
    return () => {
      cancelled = true;
    };
  }, [activePage.id, image?.assetId, image?.dataUrl, image?.objectUrl, noteActionId]);

  useEffect(() => {
    function updateImageLayout() {
      const body = bodyRef.current;
      const imageElement = imageRef.current;
      if (!body || !imageElement || !imageSrc) {
        setBaseImageLayout(null);
        return;
      }
      const bodyWidth = body.clientWidth || body.getBoundingClientRect().width;
      const bodyHeight = body.clientHeight || body.getBoundingClientRect().height;
      const nextLayout = containedMediaRect(
        bodyWidth,
        bodyHeight,
        imageElement.naturalWidth || bodyWidth,
        imageElement.naturalHeight || bodyHeight
      );
      setBaseImageLayout((current) => (
        current
          && Math.abs(current.left - nextLayout.left) < 0.5
          && Math.abs(current.top - nextLayout.top) < 0.5
          && Math.abs(current.width - nextLayout.width) < 0.5
          && Math.abs(current.height - nextLayout.height) < 0.5
          ? current
          : nextLayout
      ));
    }

    updateImageLayout();
    if (!bodyRef.current || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateImageLayout);
      return () => window.removeEventListener("resize", updateImageLayout);
    }
    const resizeObserver = new ResizeObserver(updateImageLayout);
    resizeObserver.observe(bodyRef.current);
    window.addEventListener("resize", updateImageLayout);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateImageLayout);
    };
  }, [frameNote.height, frameNote.width, imageSrc, image?.updatedAt]);

  useEffect(() => {
    setMapView({ scale: 1, x: 0, y: 0 });
  }, [activePage.id, imageSrc, noteActionId]);

  function openFilePicker(event, mode = "replace") {
    event?.stopPropagation?.();
    pendingImageModeRef.current = mode;
    inputRef.current?.click();
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    applyImageFile(file);
  }

  async function applyImageFile(file) {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setError("Elegi un archivo de imagen.");
      return;
    }
    try {
      const image = await readMapImageFileAsStoredImage(file, "Mapa");
      setError("");
      if (pendingImageModeRef.current === "add") onMapPageAdd?.(noteActionId, image);
      else onMapImageChange?.(noteActionId, image, activePage.id);
      pendingImageModeRef.current = "replace";
    } catch (error) {
      setError(error?.message || "Could not load the image.");
    }
  }

  async function handleMapPaste(event) {
    const imageFile = firstClipboardImageFile(event.clipboardData);
    if (!imageFile) return;
    event.preventDefault();
    event.stopPropagation();
    applyImageFile(imageFile);
  }

  function updateGrid(patch) {
    onMapGridChange?.(noteActionId, normalizeMapGrid({ ...grid, ...patch }), activePage.id);
  }

  function updateFog(patch) {
    onMapFogChange?.(noteActionId, activePage.id, normalizeMapFog({ ...fog, ...patch }));
  }

  function setFogBrushSize(value) {
    const currentSize = clamp(Number(fog.brushSize) || DEFAULT_MAP_FOG.brushSize, MAP_FOG_BRUSH_MIN_SIZE, MAP_FOG_BRUSH_MAX_SIZE);
    const brushSize = clamp(Number(value) || DEFAULT_MAP_FOG.brushSize, MAP_FOG_BRUSH_MIN_SIZE, MAP_FOG_BRUSH_MAX_SIZE);
    if (brushSize === currentSize) return;
    updateFog({ brushSize });
    if (!imageLayout?.width || !imageLayout?.height) return;
    setFogBrushPreview((preview) => (
      preview
        ? {
            ...preview,
            rx: (brushSize / 2) / imageLayout.width,
            ry: (brushSize / 2) / imageLayout.height,
            shape: fog.brushShape
          }
        : preview
    ));
  }

  function updateFogBrushSize(delta) {
    const currentSize = clamp(Number(fog.brushSize) || DEFAULT_MAP_FOG.brushSize, MAP_FOG_BRUSH_MIN_SIZE, MAP_FOG_BRUSH_MAX_SIZE);
    setFogBrushSize(currentSize + delta);
  }

  function updateFogBrushShape(shape) {
    const brushShape = MAP_FOG_BRUSH_SHAPES.has(shape) ? shape : DEFAULT_MAP_FOG.brushShape;
    if (brushShape === fog.brushShape) return;
    updateFog({ brushShape });
    setFogBrushPreview((preview) => (
      preview ? { ...preview, shape: brushShape } : preview
    ));
  }

  useEffect(() => {
    if (!isFogBrushActive) return undefined;
    function handleFogBrushKeyDown(event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditablePasteTarget(event.target)) return;
      const increase = event.key === "+" || event.key === "=" || event.code === "Equal" || event.code === "NumpadAdd";
      const decrease = event.key === "-" || event.key === "_" || event.code === "Minus" || event.code === "NumpadSubtract";
      if (!increase && !decrease) return;
      event.preventDefault();
      event.stopPropagation();
      updateFogBrushSize(increase ? MAP_FOG_BRUSH_KEY_STEP : -MAP_FOG_BRUSH_KEY_STEP);
    }
    window.addEventListener("keydown", handleFogBrushKeyDown);
    return () => window.removeEventListener("keydown", handleFogBrushKeyDown);
  }, [activePage.id, fog.brushSize, fog.brushShape, fog.enabled, fog.revealed, imageLayout?.height, imageLayout?.width, isFogBrushActive, noteActionId]);

  useEffect(() => {
    setFogContextMenu(null);
  }, [activePage.id, imageSrc, noteActionId]);

  useEffect(() => {
    if (!fogContextMenu) return undefined;
    function handlePointerDown(event) {
      if (event.target?.closest?.("[data-map-fog-menu='true']")) return;
      setFogContextMenu(null);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setFogContextMenu(null);
    }
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fogContextMenu]);

  function fogPointFromPointer(event, mode = fogBrushModeRef.current) {
    if (!imageLayout?.width || !imageLayout?.height || !bodyRef.current) return;
    const bodyRect = bodyRef.current.getBoundingClientRect();
    const bodyWidth = bodyRef.current.clientWidth || bodyRect.width;
    const bodyHeight = bodyRef.current.clientHeight || bodyRect.height;
    const scaleX = bodyRect.width ? bodyWidth / bodyRect.width : 1;
    const scaleY = bodyRect.height ? bodyHeight / bodyRect.height : 1;
    const localBodyX = (event.clientX - bodyRect.left) * scaleX;
    const localBodyY = (event.clientY - bodyRect.top) * scaleY;
    const localX = localBodyX - imageLayout.left;
    const localY = localBodyY - imageLayout.top;
    if (localX < 0 || localY < 0 || localX > imageLayout.width || localY > imageLayout.height) return null;
    const brushSize = clamp(Number(fog.brushSize) || DEFAULT_MAP_FOG.brushSize, MAP_FOG_BRUSH_MIN_SIZE, MAP_FOG_BRUSH_MAX_SIZE);
    return {
      x: localX / imageLayout.width,
      y: localY / imageLayout.height,
      rx: (brushSize / 2) / imageLayout.width,
      ry: (brushSize / 2) / imageLayout.height,
      shape: fog.brushShape,
      mode: mode === "hide" ? "hide" : "reveal"
    };
  }

  function updateFogBrushPreview(event) {
    if (!isFogBrushActive) return;
    setFogBrushPreview(fogPointFromPointer(event));
  }

  function paintFogAtPointer(event) {
    const point = fogPointFromPointer(event);
    if (!point) return;
    setFogBrushPreview(point);
    const nextFog = appendMapFogPoint(fogStrokeRef.current || fog, point);
    fogStrokeRef.current = nextFog;
    setFogStroke(nextFog);
  }

  function startFogBrush(event) {
    if (!isFogBrushActive) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    fogBrushPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    paintFogAtPointer(event);
  }

  function moveFogBrush(event) {
    if (!isFogBrushActive) return;
    updateFogBrushPreview(event);
    if (fogBrushPointerRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    paintFogAtPointer(event);
  }

  function stopFogBrush(event) {
    if (fogBrushPointerRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    fogBrushPointerRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const completedFog = fogStrokeRef.current;
    fogStrokeRef.current = null;
    setFogStroke(null);
    if (completedFog) onMapFogChange?.(noteActionId, activePage.id, completedFog);
  }

  function leaveFogBrush(event) {
    if (fogBrushPointerRef.current === event.pointerId) return;
    setFogBrushPreview(null);
  }

  function openFogContextMenu(event) {
    if (!imageSrc || event.target?.closest?.("[data-map-fog-menu='true'], button, input, select, textarea")) return;
    const point = fogPointFromPointer(event, "reveal");
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    const viewportWidth = window.innerWidth || 1200;
    const viewportHeight = window.innerHeight || 800;
    setIsGridPanelOpen(false);
    setIsFogPanelOpen(false);
    setFogContextMenu({
      x: clamp(event.clientX, 8, viewportWidth - 260),
      y: clamp(event.clientY, 8, viewportHeight - 360),
      point,
      tokenPoint: baseImageLayout ? {
        x: baseImageLayout.left + point.x * baseImageLayout.width,
        y: baseImageLayout.top + point.y * baseImageLayout.height
      } : null
    });
  }

  function applyFogContextAction(mode) {
    if (!fogContextMenu?.point) return;
    const point = {
      ...fogContextMenu.point,
      mode: mode === "hide" ? "hide" : "reveal"
    };
    onMapFogChange?.(noteActionId, activePage.id, appendMapFogPoint({ ...fog, enabled: true }, point));
    setFogContextMenu(null);
  }

  function mapContextTokenTarget() {
    if (!fogContextMenu?.tokenPoint) return null;
    const size = MAP_TOKEN_SIZE;
    return {
      mapNoteId: noteActionId,
      pageId: activePage.id,
      x: fogContextMenu.tokenPoint.x - size / 2,
      y: fogContextMenu.tokenPoint.y - size / 2,
      size
    };
  }

  function mapContextMarkerTarget(formType = null) {
    if (!fogContextMenu?.tokenPoint) return null;
    const normalizedFormType = formType ? normalizeMapMarkerFormType(formType) : null;
    return {
      mapNoteId: noteActionId,
      pageId: activePage.id,
      x: fogContextMenu.tokenPoint.x,
      y: fogContextMenu.tokenPoint.y,
      formType: normalizedFormType,
      markerType: normalizedFormType ? "shape" : "pin"
    };
  }

  function requestContextMonsterToken() {
    const target = mapContextTokenTarget();
    if (!target) return;
    onMapContextAddMonster?.(target);
    setFogContextMenu(null);
  }

  function requestContextNpcToken() {
    const target = mapContextTokenTarget();
    if (!target) return;
    onMapContextAddNpc?.(target);
    setFogContextMenu(null);
  }

  function requestContextMarker(formType = null) {
    const target = mapContextMarkerTarget(formType);
    if (!target) return;
    onMapMarkerAdd?.(target);
    setFogContextMenu(null);
  }

  function mapTrackerTokenDragPayload(event) {
    const types = Array.from(event.dataTransfer?.types || []);
    const plainPayload = parseMapTokenDragPayload(event.dataTransfer?.getData?.("text/plain"));
    if (!types.includes("application/x-dm-map-token") && !plainPayload) return null;
    const mapNoteId = event.dataTransfer.getData("application/x-dm-map-token-note") || plainPayload?.mapNoteId || "";
    const sourcePageId = event.dataTransfer.getData("application/x-dm-map-token-page") || plainPayload?.sourcePageId || "";
    const tokenId = event.dataTransfer.getData("application/x-dm-map-token") || plainPayload?.tokenId || "";
    if (mapNoteId && mapNoteId !== noteActionId) return null;
    if (!sourcePageId || !tokenId) return null;
    return { sourcePageId, tokenId };
  }

  function hasMapTrackerTokenDragData(event) {
    const types = Array.from(event.dataTransfer?.types || []);
    return types.includes("application/x-dm-map-token") || types.includes("text/plain");
  }

  function mapTrackerTokenSize(payload) {
    const token = visibleTokens.find((entry) => entry.id === payload?.tokenId && (entry.sourcePageId || activePage.id) === payload?.sourcePageId)
      || visibleTokens.find((entry) => entry.id === payload?.tokenId);
    return clamp(Number(token?.size) || MAP_TOKEN_SIZE, 32, 140);
  }

  function mapTokenDropPointFromPointer(event, size = MAP_TOKEN_SIZE) {
    const basePoint = basePointFromVisualPoint(bodyPointFromPointer(event));
    if (!basePoint) return null;
    const tokenSize = clamp(Number(size) || MAP_TOKEN_SIZE, 32, 140);
    return {
      x: basePoint.x - tokenSize / 2,
      y: basePoint.y - tokenSize / 2,
      size: tokenSize
    };
  }

  function bodyPointFromPointer(event) {
    if (!bodyRef.current) return null;
    const bodyRect = bodyRef.current.getBoundingClientRect();
    const bodyWidth = bodyRef.current.clientWidth || bodyRect.width;
    const bodyHeight = bodyRef.current.clientHeight || bodyRect.height;
    const scaleX = bodyRect.width ? bodyWidth / bodyRect.width : 1;
    const scaleY = bodyRect.height ? bodyHeight / bodyRect.height : 1;
    return {
      x: (event.clientX - bodyRect.left) * scaleX,
      y: (event.clientY - bodyRect.top) * scaleY
    };
  }

  function clampMapView(nextView) {
    if (!bodyRef.current || !baseImageLayout) return { scale: 1, x: 0, y: 0 };
    const bodyWidth = bodyRef.current.clientWidth || bodyRef.current.getBoundingClientRect().width || 1;
    const bodyHeight = bodyRef.current.clientHeight || bodyRef.current.getBoundingClientRect().height || 1;
    const scale = clamp(Number(nextView.scale) || 1, MAP_LOCAL_MIN_ZOOM, MAP_LOCAL_MAX_ZOOM);
    const width = baseImageLayout.width * scale;
    const height = baseImageLayout.height * scale;

    function clampAxis(offset, baseStart, scaledSize, containerSize) {
      const currentStart = baseStart + (Number(offset) || 0);
      if (scaledSize <= containerSize) return (containerSize - scaledSize) / 2 - baseStart;
      return clamp(currentStart, containerSize - scaledSize, 0) - baseStart;
    }

    return {
      scale,
      x: clampAxis(nextView.x, baseImageLayout.left, width, bodyWidth),
      y: clampAxis(nextView.y, baseImageLayout.top, height, bodyHeight)
    };
  }

  function basePointFromVisualPoint(point) {
    if (!pointIsInsideMapImage(point) || !baseImageLayout || !imageLayout) return null;
    return {
      x: baseImageLayout.left + ((point.x - imageLayout.left) / imageLayout.width) * baseImageLayout.width,
      y: baseImageLayout.top + ((point.y - imageLayout.top) / imageLayout.height) * baseImageLayout.height
    };
  }

  function visualPointFromBasePoint(point) {
    if (!point || !baseImageLayout || !imageLayout) return point;
    return {
      x: imageLayout.left + ((Number(point.x) || 0) - baseImageLayout.left) / baseImageLayout.width * imageLayout.width,
      y: imageLayout.top + ((Number(point.y) || 0) - baseImageLayout.top) / baseImageLayout.height * imageLayout.height
    };
  }

  function localVisualPointFromBasePoint(point) {
    const visualPoint = visualPointFromBasePoint(point);
    if (!visualPoint || !imageLayout) return visualPoint;
    return {
      x: visualPoint.x - imageLayout.left,
      y: visualPoint.y - imageLayout.top
    };
  }

  function visualSizeFromBaseSize(size) {
    return clamp(Number(size) || 0, 0, 10000) * mapVisualScale;
  }

  function handleMapWheel(event) {
    if (!imageSrc || !baseImageLayout || !imageLayout) return;
    const point = bodyPointFromPointer(event);
    if (!pointIsInsideMapImage(point)) return;
    event.preventDefault();
    event.stopPropagation();
    const zoomFactor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    setMapView((current) => {
      const oldScale = clamp(Number(current.scale) || 1, MAP_LOCAL_MIN_ZOOM, MAP_LOCAL_MAX_ZOOM);
      const nextScale = clamp(oldScale * zoomFactor, MAP_LOCAL_MIN_ZOOM, MAP_LOCAL_MAX_ZOOM);
      if (Math.abs(nextScale - oldScale) < 0.001) return current;
      const oldLayout = {
        left: baseImageLayout.left + current.x,
        top: baseImageLayout.top + current.y,
        width: baseImageLayout.width * oldScale,
        height: baseImageLayout.height * oldScale
      };
      const nx = clamp((point.x - oldLayout.left) / oldLayout.width, 0, 1);
      const ny = clamp((point.y - oldLayout.top) / oldLayout.height, 0, 1);
      return clampMapView({
        scale: nextScale,
        x: point.x - baseImageLayout.left - nx * baseImageLayout.width * nextScale,
        y: point.y - baseImageLayout.top - ny * baseImageLayout.height * nextScale
      });
    });
  }

  function pointIsInsideMapImage(point) {
    return Boolean(point && imageLayout?.width && imageLayout?.height
      && point.x >= imageLayout.left
      && point.y >= imageLayout.top
      && point.x <= imageLayout.left + imageLayout.width
      && point.y <= imageLayout.top + imageLayout.height);
  }

  function normalizedImagePointFromBodyPoint(point) {
    if (!pointIsInsideMapImage(point)) return null;
    return {
      x: clamp((point.x - imageLayout.left) / imageLayout.width, 0, 1),
      y: clamp((point.y - imageLayout.top) / imageLayout.height, 0, 1)
    };
  }

  function handleDmMapPingPointerDown(event) {
    if (!isSharedVvtMap || !imageSrc || event.button !== 0 || !leftControlDownRef.current) return false;
    const isFormShape = Boolean(event.target?.closest?.("[data-map-form-shape='true']"));
    if (event.target?.closest?.("[data-map-token='true'], button, input, select, textarea")) return false;
    if (!isFormShape && event.target?.closest?.("[data-board-control='true']")) return false;
    const point = normalizedImagePointFromBodyPoint(bodyPointFromPointer(event));
    if (!point) return false;
    event.preventDefault();
    event.stopPropagation();
    onMapPing?.({
      id: `ping-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      x: point.x,
      y: point.y,
      playerId: "dm",
      playerName: "DM",
      createdAt: new Date().toISOString()
    });
    return true;
  }

  function startMapPan(event) {
    if (!imageSrc || mapView.scale <= 1.001 || event.button !== 1) return false;
    const isFormShape = Boolean(event.target?.closest?.("[data-map-form-shape='true']"));
    if (event.target?.closest?.("input, select, textarea")) return false;
    if (!isFormShape && event.target?.closest?.("[data-board-control='true']")) return false;
    const point = bodyPointFromPointer(event);
    if (!pointIsInsideMapImage(point)) return false;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    mapPanRef.current = {
      pointerId: event.pointerId,
      startPoint: point,
      startView: mapView
    };
    return true;
  }

  function mapTokenSelectionRect(start, end) {
    const left = Math.min(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const right = Math.max(start.x, end.x);
    const bottom = Math.max(start.y, end.y);
    return { x: left, y: top, width: right - left, height: bottom - top, right, bottom };
  }

  function mapTokenFrame(token) {
    const size = clamp(Number(token.size) || MAP_TOKEN_SIZE, 32, 140);
    const x = Number(token.x) || 0;
    const y = Number(token.y) || 0;
    return { x, y, width: size, height: size, right: x + size, bottom: y + size };
  }

  function startMapTokenBoxSelection(event) {
    if (handleDmMapPingPointerDown(event)) return;
    if (startMapPan(event)) return;
    if (!imageSrc || isFogBrushActive || event.button !== 0) return;
    if (event.target?.closest?.("[data-map-token='true'], [data-board-control='true'], button, input, select, textarea")) return;
    const point = basePointFromVisualPoint(bodyPointFromPointer(event));
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const append = Boolean(event.shiftKey || event.ctrlKey || event.metaKey);
    mapTokenSelectionRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPoint: point,
      append,
      baseIds: append ? selectedMapTokenIds.slice() : [],
      moved: false
    };
    setMapTokenSelectionBox({ x: point.x, y: point.y, width: 0, height: 0, right: point.x, bottom: point.y });
  }

  function moveMapTokenBoxSelection(event) {
    const pan = mapPanRef.current;
    if (pan?.pointerId === event.pointerId) {
      const point = bodyPointFromPointer(event);
      if (!point) return;
      event.preventDefault();
      event.stopPropagation();
      setMapView(clampMapView({
        ...pan.startView,
        x: pan.startView.x + point.x - pan.startPoint.x,
        y: pan.startView.y + point.y - pan.startPoint.y
      }));
      return;
    }
    const selection = mapTokenSelectionRef.current;
    if (!selection || selection.pointerId !== event.pointerId) return;
    const point = basePointFromVisualPoint(bodyPointFromPointer(event));
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    if (Math.abs(event.clientX - selection.startClientX) > 4 || Math.abs(event.clientY - selection.startClientY) > 4) selection.moved = true;
    const rect = mapTokenSelectionRect(selection.startPoint, point);
    setMapTokenSelectionBox(rect);
    const hitIds = tokens
      .filter((token) => rectsIntersect(rect, mapTokenFrame(token)))
      .map((token) => token.id);
    const nextIds = selection.append ? [...selection.baseIds] : [];
    hitIds.forEach((id) => {
      if (!nextIds.includes(id)) nextIds.push(id);
    });
    onMapTokenSelectionChange?.(noteActionId, activePage.id, nextIds);
  }

  function stopMapTokenBoxSelection(event) {
    if (mapPanRef.current?.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      mapPanRef.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      return;
    }
    const selection = mapTokenSelectionRef.current;
    if (!selection || selection.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    mapTokenSelectionRef.current = null;
    setMapTokenSelectionBox(null);
    if (!selection.moved && !selection.append) onMapTokenSelectionChange?.(noteActionId, activePage.id, []);
  }

  function handleMapTrackerTokenDragOver(event) {
    if (!imageSrc || !hasMapTrackerTokenDragData(event)) return;
    const point = mapTokenDropPointFromPointer(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
  }

  function handleMapTrackerTokenDrop(event) {
    if (!imageSrc) return;
    const payload = mapTrackerTokenDragPayload(event);
    const point = mapTokenDropPointFromPointer(event, mapTrackerTokenSize(payload));
    if (!payload || !point) return;
    event.preventDefault();
    event.stopPropagation();
    onMapTrackerTokenDrop?.(noteActionId, payload.sourcePageId, payload.tokenId, activePage.id, point);
  }

  async function autoFitGrid(event) {
    event?.stopPropagation?.();
    if (!imageSrc || !bodyRef.current) return;
    setIsAutoFittingGrid(true);
    try {
      const detected = await detectGridFromImageDataUrl(imageSrc);
      const bodyWidth = bodyRef.current.clientWidth || frameNote.width;
      const bodyHeight = bodyRef.current.clientHeight || frameNote.height;
      const containScale = Math.min(bodyWidth / detected.naturalWidth, bodyHeight / detected.naturalHeight);
      const visibleWidth = detected.naturalWidth * containScale;
      const visibleHeight = detected.naturalHeight * containScale;
      const imageLeft = (bodyWidth - visibleWidth) / 2;
      const imageTop = (bodyHeight - visibleHeight) / 2;
      const cellWidth = clamp(detected.cellWidth * containScale, 8, 500);
      const cellHeight = clamp(detected.cellHeight * containScale, 8, 500);
      const offsetX = normalizeGridOffset(imageLeft + detected.offsetX * containScale, cellWidth);
      const offsetY = normalizeGridOffset(imageTop + detected.offsetY * containScale, cellHeight);
      updateGrid({
        enabled: true,
        cellWidth: Math.round(cellWidth * 10) / 10,
        cellHeight: Math.round(cellHeight * 10) / 10,
        offsetX: Math.round(offsetX * 10) / 10,
        offsetY: Math.round(offsetY * 10) / 10
      });
      setError("");
    } catch (error) {
      setError(error?.message || "No pude detectar el grid de esta imagen.");
    } finally {
      setIsAutoFittingGrid(false);
    }
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
          title={`Restaurar ${title}`}
        >
          <span className="block truncate font-serif text-sm font-bold uppercase tracking-wide text-amber-500">{title}</span>
          <span className="block truncate text-[11px] text-neutral-500">Map note</span>
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
      data-note-action-id={noteActionId}
      style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: frameNote.width, height: frameNote.height, flexDirection: "column" }}
      onPointerDown={onFocus}
      onPaste={handleMapPaste}
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
          <p className="mt-2 text-sm italic text-neutral-500">VVT map note</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            className={`h-7 border px-2 text-xs font-bold uppercase ${isSharedVvtMap ? "border-emerald-400 bg-emerald-950 text-emerald-100" : "border-neutral-600 bg-neutral-800 text-neutral-100 hover:bg-neutral-700"}`}
            type="button"
            title="Compartir este mapa con jugadores conectados"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onShareVvtMap?.(noteActionId, activePage.id)}
          >
            {isSharedVvtMap ? "LIVE" : "Share"}
          </button>
          <button className="h-7 border border-neutral-600 bg-neutral-800 px-2 text-xs font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => openFilePicker(event, "add")}>MAP +</button>
          <button className="h-7 w-7 border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onMinimize(frameNoteId)}>-</button>
          <button className="h-7 w-7 border border-neutral-600 bg-neutral-800 text-xs font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onDuplicate(noteActionId)}>D</button>
          <button className="h-7 w-7 border border-neutral-600 bg-neutral-800 text-sm font-bold text-neutral-100 hover:bg-neutral-700" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => onClose(noteActionId, event)}>X</button>
        </div>
      </header>
      {tabBar}
      <div
        className="relative shrink-0 border-b border-neutral-800 bg-neutral-950"
        data-board-control="true"
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pr-2">
            {pages.map((page, index) => {
              const isActive = page.id === activePage.id;
              return (
                <div key={page.id} className={`flex max-w-48 shrink-0 items-center border ${isActive ? "border-amber-500 bg-neutral-900 text-amber-200" : "border-neutral-800 bg-neutral-950 text-neutral-400"}`}>
                  <button
                    className="min-w-0 flex-1 truncate px-3 py-1.5 text-left text-xs font-bold uppercase hover:text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    type="button"
                    title={page.name}
                    onClick={() => onMapPageSelect?.(noteActionId, page.id)}
                  >
                    <CtrlEditableText
                      value={page.name || `Mapa ${index + 1}`}
                      className="block truncate"
                      inputClassName="w-32 border border-amber-500 bg-neutral-950 px-1 py-0.5 text-xs font-bold uppercase text-amber-100 focus:outline-none"
                      title="Doble click o Ctrl+click para editar"
                      editOnDoubleClick
                      onCommit={(value) => onMapPageRename?.(noteActionId, page.id, value)}
                    >
                      {page.name || `Mapa ${index + 1}`}
                    </CtrlEditableText>
                  </button>
                  {pages.length > 1 ? (
                    <button
                      className="h-7 w-7 border-l border-neutral-800 text-xs font-bold text-neutral-500 hover:bg-red-950/40 hover:text-red-200 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                      type="button"
                      aria-label={`Cerrar ${page.name || `Mapa ${index + 1}`}`}
                      onClick={() => onMapPageClose?.(noteActionId, page.id)}
                    >
                      X
                    </button>
                  ) : null}
                </div>
              );
            })}
            <button
              className="h-8 shrink-0 border border-neutral-700 bg-neutral-900 px-3 text-xs font-bold uppercase text-sky-200 hover:border-sky-400 hover:bg-sky-950 focus:outline-none focus:ring-1 focus:ring-sky-300/60"
              type="button"
              onClick={(event) => openFilePicker(event, "add")}
            >
              + Mapa
            </button>
          </div>
          {imageSrc ? (
            <div className="flex shrink-0 items-center gap-1 text-[11px] text-neutral-200">
              <div className="relative">
                <button
                  className="flex h-8 min-w-24 items-center justify-between gap-3 border border-neutral-700 bg-neutral-900 px-3 font-bold uppercase text-amber-300 hover:border-amber-500 hover:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                  type="button"
                  onClick={() => {
                    setIsFogPanelOpen(false);
                    setIsGridPanelOpen((open) => !open);
                  }}
                >
                  <span>Grid</span>
                  <span className="text-neutral-500">{isGridPanelOpen ? "-" : "+"}</span>
                </button>
                {isGridPanelOpen ? (
                  <div className="absolute right-0 top-[calc(100%+4px)] z-40 grid w-64 grid-cols-2 gap-2 border border-neutral-700 bg-neutral-950/95 p-3 shadow-xl">
                    <label className="inline-flex items-center gap-1 font-bold uppercase text-amber-300">
                      <input
                        type="checkbox"
                        checked={grid.enabled}
                        onChange={(event) => updateGrid({ enabled: event.target.checked })}
                      />
                      Grid
                    </label>
                    <label className="inline-flex items-center gap-1 font-bold uppercase text-sky-300">
                      <input
                        type="checkbox"
                        checked={grid.snap}
                        onChange={(event) => updateGrid({ snap: event.target.checked })}
                      />
                      Snap
                    </label>
                    <button
                      className="col-span-2 border border-sky-500/60 bg-sky-950/70 px-2 py-1 font-bold uppercase text-sky-100 hover:bg-sky-900 disabled:cursor-wait disabled:opacity-60"
                      type="button"
                      disabled={isAutoFittingGrid}
                      onClick={autoFitGrid}
                    >
                      {isAutoFittingGrid ? "Analizando..." : "Auto"}
                    </button>
                    <label className="flex items-center justify-between gap-2">
                      W
                      <input
                        className="w-16 border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-right text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sky-300"
                        type="number"
                        min="8"
                        max="500"
                        value={grid.cellWidth}
                        onChange={(event) => updateGrid({ cellWidth: event.target.value })}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2">
                      H
                      <input
                        className="w-16 border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-right text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sky-300"
                        type="number"
                        min="8"
                        max="500"
                        value={grid.cellHeight}
                        onChange={(event) => updateGrid({ cellHeight: event.target.value })}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2">
                      X
                      <input
                        className="w-16 border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-right text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sky-300"
                        type="number"
                        min="-500"
                        max="500"
                        value={grid.offsetX}
                        onChange={(event) => updateGrid({ offsetX: event.target.value })}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2">
                      Y
                      <input
                        className="w-16 border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-right text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sky-300"
                        type="number"
                        min="-500"
                        max="500"
                        value={grid.offsetY}
                        onChange={(event) => updateGrid({ offsetY: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
              <div className="relative">
                <button
                  className="flex h-8 min-w-24 items-center justify-between gap-3 border border-neutral-700 bg-neutral-900 px-3 font-bold uppercase text-amber-300 hover:border-amber-500 hover:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                  type="button"
                  onClick={() => {
                    setIsGridPanelOpen(false);
                    setIsFogPanelOpen((open) => !open);
                  }}
                >
                  <span>Fog</span>
                  <span className="text-neutral-500">{isFogPanelOpen ? "-" : "+"}</span>
                </button>
                {isFogPanelOpen ? (
                  <div className="absolute right-0 top-[calc(100%+4px)] z-40 grid w-64 gap-2 border border-neutral-700 bg-neutral-950/95 p-3 shadow-xl">
                    <label className="inline-flex items-center gap-2 font-bold uppercase text-amber-300">
                      <input
                        type="checkbox"
                        checked={fog.enabled}
                        onChange={(event) => updateFog({ enabled: event.target.checked })}
                      />
                      Activar niebla
                    </label>
                    <label className="inline-flex items-center gap-2 font-bold uppercase text-sky-300">
                      <input
                        type="checkbox"
                        checked={isFogBrushActive}
                        onChange={(event) => setIsFogBrushActive(event.target.checked)}
                      />
                      Pincel revelar
                    </label>
                    <div className="grid gap-1 text-neutral-300">
                      <span className="font-bold uppercase text-neutral-400">Forma</span>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          ["circle", "Círculo"],
                          ["square", "Cuadrado"]
                        ].map(([shape, label]) => {
                          const active = fog.brushShape === shape;
                          return (
                            <button
                              key={shape}
                              className={`border px-2 py-1 font-bold uppercase focus:outline-none focus:ring-1 focus:ring-amber-400 ${active ? "border-amber-400 bg-amber-500 text-neutral-950" : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500"}`}
                              type="button"
                              onClick={() => updateFogBrushShape(shape)}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <label className="grid gap-1 text-neutral-300">
                      <span className="font-bold uppercase text-neutral-400">Tamaño {Math.round(fog.brushSize)}px</span>
                      <input
                        type="range"
                        min={MAP_FOG_BRUSH_MIN_SIZE}
                        max={MAP_FOG_BRUSH_MAX_SIZE}
                        value={fog.brushSize}
                        onChange={(event) => setFogBrushSize(event.target.value)}
                      />
                    </label>
                    <button
                      className="border border-red-500/50 bg-red-950/60 px-2 py-1 font-bold uppercase text-red-100 hover:bg-red-900"
                      type="button"
                      onClick={() => updateFog({ revealed: [] })}
                    >
                      Oscurecer todo
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onPointerDown={(event) => event.stopPropagation()}
        onChange={handleFileChange}
      />
      <div
        ref={bodyRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-neutral-950"
        data-map-body-note-id={noteActionId}
        data-map-view-scale={mapVisualScale}
        data-map-base-left={baseImageLayout?.left ?? 0}
        data-map-base-top={baseImageLayout?.top ?? 0}
        data-map-base-width={baseImageLayout?.width ?? 0}
        data-map-base-height={baseImageLayout?.height ?? 0}
        data-map-view-left={imageLayout?.left ?? 0}
        data-map-view-top={imageLayout?.top ?? 0}
        data-map-view-width={imageLayout?.width ?? 0}
        data-map-view-height={imageLayout?.height ?? 0}
        onContextMenu={openFogContextMenu}
        onPointerDownCapture={startMapTokenBoxSelection}
        onPointerMove={moveMapTokenBoxSelection}
        onPointerUp={stopMapTokenBoxSelection}
        onPointerCancel={stopMapTokenBoxSelection}
        onDragOver={handleMapTrackerTokenDragOver}
        onDrop={handleMapTrackerTokenDrop}
      >
        {imageSrc ? (
          <div
            className="absolute overflow-visible"
            style={imageLayout ? {
              left: imageLayout.left,
              top: imageLayout.top,
              width: imageLayout.width,
              height: imageLayout.height
            } : { left: 0, top: 0, width: "100%", height: "100%" }}
          >
            <img
              ref={imageRef}
              className="absolute inset-0 h-full w-full object-contain"
              src={imageSrc}
              alt={image.name || title}
              draggable={false}
              onLoad={(event) => {
                const body = bodyRef.current;
                if (!body) return;
                const bodyRect = body.getBoundingClientRect();
                const bodyWidth = body.clientWidth || bodyRect.width;
                const bodyHeight = body.clientHeight || bodyRect.height;
                setBaseImageLayout(containedMediaRect(bodyWidth, bodyHeight, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight));
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
            {grid.enabled ? (
              <div
                className="pointer-events-none absolute inset-0 z-[1]"
                style={{
                  backgroundImage: "linear-gradient(rgba(56,189,248,0.72) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.72) 1px, transparent 1px)",
                  backgroundSize: `${grid.cellWidth * mapVisualScale}px ${grid.cellHeight * mapVisualScale}px`,
                  backgroundPosition: `${((Number(grid.offsetX) || 0) - (baseImageLayout?.left || 0)) * mapVisualScale}px ${((Number(grid.offsetY) || 0) - (baseImageLayout?.top || 0)) * mapVisualScale}px`
                }}
              />
            ) : null}
            <MapFogOverlay
              fog={displayedFog}
              layout={localImageLayout}
              maskId={fogMaskId}
              preview={isFogBrushActive ? fogBrushPreview : null}
              opacity={0.76}
              className={isFogBrushActive ? "z-[25] cursor-crosshair" : "z-20 pointer-events-none"}
              onPointerDown={startFogBrush}
              onPointerMove={moveFogBrush}
              onPointerUp={stopFogBrush}
              onPointerCancel={stopFogBrush}
              onPointerLeave={leaveFogBrush}
              onContextMenu={openFogContextMenu}
            />
            <MapPingOverlay pings={vvtPings} layout={localImageLayout} />
            {markers.map((marker) => {
              const visualPoint = localVisualPointFromBasePoint(marker);
              if (marker.markerType === "shape") {
                const visualWidth = Math.max(MAP_MARKER_SHAPE_MIN_SIZE * mapVisualScale, (Number(marker.width) || MAP_MARKER_SHAPE_DEFAULT_SIZE) * mapVisualScale);
                const visualHeight = Math.max(MAP_MARKER_SHAPE_MIN_SIZE * mapVisualScale, (Number(marker.height) || MAP_MARKER_SHAPE_DEFAULT_SIZE) * mapVisualScale);
                const color = normalizeMapMarkerColor(marker.color);
                const opacity = normalizeMapMarkerOpacity(marker.opacity);
                const fill = mapMarkerColorRgba(color, opacity);
                const border = mapMarkerColorRgba(color, 0.88);
                const clipPath = marker.formType === "cone" ? "polygon(50% 0%, 100% 100%, 0% 100%)" : undefined;
                const borderRadius = marker.formType === "circle" ? "999px" : "3px";
                const rotation = `rotate(${Number(marker.rotation) || 0}deg)`;
                const patternBackground = mapMarkerPatternBackground(marker.pattern, color);
                return (
                  <div
                    key={marker.id}
                    className={`absolute z-[8] ${marker.hidden ? "opacity-50 saturate-50" : ""}`}
                    data-board-control="true"
                    data-map-form-shape="true"
                    data-map-marker-id={marker.id}
                    data-map-page-id={activePage.id}
                    title={`${marker.label || MAP_MARKER_FORM_LABELS[marker.formType] || "Forma"}${marker.hidden ? " (hidden)" : ""}`}
                    style={{
                      left: visualPoint.x,
                      top: visualPoint.y,
                      width: visualWidth,
                      height: visualHeight
                    }}
                    onPointerDown={(event) => onMapMarkerDragStart?.(event, noteActionId, activePage.id, marker.id)}
                    onContextMenu={(event) => onMapMarkerContextMenu?.(event, noteActionId, activePage.id, marker.id)}
                  >
                    <div
                      className="absolute inset-0 border-2 shadow-[0_0_18px_rgba(0,0,0,0.45)]"
                      style={{
                        background: fill,
                        borderColor: border,
                        clipPath,
                        borderRadius,
                        transform: rotation,
                        transformOrigin: "center"
                      }}
                    />
                    {marker.pattern && marker.pattern !== "none" ? (
                      <div
                        className="pointer-events-none absolute inset-0 mix-blend-screen"
                        style={{
                          backgroundImage: patternBackground,
                          backgroundRepeat: "repeat",
                          backgroundSize: `${Math.max(20, 34 * mapVisualScale)}px ${Math.max(20, 34 * mapVisualScale)}px`,
                          opacity: clamp(opacity + 0.28, 0.25, 0.9),
                          clipPath,
                          borderRadius,
                          transform: rotation,
                          transformOrigin: "center"
                        }}
                      />
                    ) : null}
                    <span
                      className="pointer-events-none absolute left-1 top-1 max-w-[calc(100%-8px)] truncate border border-neutral-800 bg-neutral-950/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-neutral-100 shadow"
                      style={{ transform: `scale(${fixedOverlayScale})`, transformOrigin: "left top" }}
                    >
                      {marker.label || MAP_MARKER_FORM_LABELS[marker.formType] || "Forma"}
                    </span>
                    <button
                      className="absolute bottom-0 right-0 z-10 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-nwse-resize border border-neutral-950 bg-amber-400/90 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
                      type="button"
                      aria-label="Resize form"
                      data-board-control="true"
                      onPointerDown={(event) => onMapMarkerResizeStart?.(event, noteActionId, activePage.id, marker.id)}
                    />
                  </div>
                );
              }
              const markerSize = MAP_MARKER_SIZE * fixedOverlayScale;
              return (
                <div
                  key={marker.id}
                  className={`absolute z-[9] flex -translate-x-1/2 -translate-y-full flex-col items-center ${marker.hidden ? "opacity-50 saturate-50" : ""}`}
                  data-board-control="true"
                  data-map-marker-id={marker.id}
                  data-map-page-id={activePage.id}
                  title={`${marker.label || "Marker"}${marker.hidden ? " (hidden)" : ""}`}
                  style={{
                    left: visualPoint.x,
                    top: visualPoint.y
                  }}
                  onPointerDown={(event) => onMapMarkerDragStart?.(event, noteActionId, activePage.id, marker.id)}
                  onContextMenu={(event) => onMapMarkerContextMenu?.(event, noteActionId, activePage.id, marker.id)}
                >
                  <div
                    className="flex items-center justify-center border-2 border-neutral-950 bg-amber-400 text-neutral-950 shadow-[0_3px_10px_rgba(0,0,0,0.7)]"
                    style={{
                      width: markerSize,
                      height: markerSize,
                      borderRadius: "9999px 9999px 9999px 2px",
                      transform: "rotate(-45deg)"
                    }}
                  >
                    <span className="flex h-full w-full items-center justify-center" style={{ transform: "rotate(45deg)" }}>
                      <MapMarkerIcon icon={marker.icon} className="h-[58%] w-[58%]" />
                    </span>
                  </div>
                  <CtrlEditableText
                    value={marker.label || "Marker"}
                    className="mt-1 max-w-32 truncate border border-neutral-700 bg-neutral-950/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-100 shadow"
                    inputClassName="mt-1 w-32 border border-amber-500 bg-neutral-950 px-1 py-0.5 text-[10px] font-bold uppercase text-amber-100 shadow focus:outline-none"
                    style={{ transform: `scale(${fixedOverlayScale})`, transformOrigin: "top center" }}
                    title="Doble click o Ctrl+click para editar"
                    editOnDoubleClick
                    onCommit={(value) => onMapMarkerRename?.(noteActionId, activePage.id, marker.id, value)}
                  >
                    {marker.label || "Marker"}
                  </CtrlEditableText>
                </div>
              );
            })}
            {tokens.map((token) => {
              const size = clamp(Number(token.size) || MAP_TOKEN_SIZE, 32, 140);
              const visualPoint = localVisualPointFromBasePoint(token);
              const visualSize = Math.max(18, visualSizeFromBaseSize(size));
              const isSelected = selectedMapTokenIds.includes(token.id);
              return (
                <button
                  key={token.id}
                  className={`absolute z-10 rounded-full border-2 bg-neutral-950 shadow-[0_4px_14px_rgba(0,0,0,0.65)] hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300 ${isSelected ? "border-sky-300 ring-4 ring-sky-300/45" : token.identityHidden ? "border-violet-300 ring-2 ring-violet-400/60" : token.nameHidden ? "border-cyan-300 ring-2 ring-cyan-400/50" : "border-amber-300"} ${token.hidden ? "border-dashed opacity-50 saturate-50" : ""}`}
                  type="button"
                  data-map-token="true"
                  data-map-token-id={token.id}
                  data-map-page-id={activePage.id}
                  title={`${token.name || token.character?.name || token.monster?.name || "Token"}${token.hidden ? " (hidden)" : ""}${token.identityHidden ? " (identity hidden)" : ""}${token.nameHidden ? " (name hidden)" : ""}`}
                  style={{
                    left: visualPoint.x,
                    top: visualPoint.y,
                    width: visualSize,
                    height: visualSize
                  }}
                  onPointerDown={(event) => onMapTokenDragStart?.(event, noteActionId, activePage.id, token.id)}
                  onContextMenu={(event) => onMapTokenContextMenu?.(event, noteActionId, activePage.id, token.id)}
                >
                  <MapTokenImage token={token} className="h-full w-full border-0" />
                  <span
                    className="pointer-events-none absolute left-1/2 top-full mt-1 max-w-28 -translate-x-1/2 truncate border border-neutral-700 bg-neutral-950/90 px-1.5 py-0.5 text-[10px] font-bold text-neutral-100 shadow"
                    style={{ transform: `translateX(-50%) scale(${fixedOverlayScale})`, transformOrigin: "top center" }}
                  >
                    {token.name || token.character?.name || token.monster?.name || "Token"}
                  </span>
                </button>
              );
            })}
            {mapTokenSelectionBox ? (
              <div
                className="pointer-events-none absolute z-[12] border border-sky-300 bg-sky-300/15"
                style={{
                  left: localVisualPointFromBasePoint({ x: mapTokenSelectionBox.x, y: mapTokenSelectionBox.y }).x,
                  top: localVisualPointFromBasePoint({ x: mapTokenSelectionBox.x, y: mapTokenSelectionBox.y }).y,
                  width: mapTokenSelectionBox.width * mapVisualScale,
                  height: mapTokenSelectionBox.height * mapVisualScale
                }}
              />
            ) : null}
          </div>
        ) : (
          <button
            className="flex h-full w-full flex-col items-center justify-center gap-3 border border-dashed border-neutral-700 bg-neutral-950/70 px-6 text-center text-neutral-300 hover:border-amber-500 hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500/40"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={openFilePicker}
          >
            <span className="font-serif text-2xl font-bold uppercase text-amber-500">Subir mapa</span>
            <span className="max-w-sm text-sm text-neutral-500">PNG, JPG, WebP o GIF</span>
          </button>
        )}
        {imageSrc ? (
          <MapTokenTracker
            mapNoteId={noteActionId}
            activePageId={activePage.id}
            tokens={visibleTokens}
            tokenGroups={visibleTokenGroups}
            onHpChange={(tokenId, value, sourcePageId) => onMapTokenHpChange?.(noteActionId, sourcePageId || activePage.id, tokenId, value)}
            onTokenGroupAdd={(name) => onMapTokenGroupAdd?.(noteActionId, activePage.id, name)}
            onTokenGroupRename={(groupId, name, sourcePageId) => onMapTokenGroupRename?.(noteActionId, sourcePageId || activePage.id, groupId, name)}
            onTokenGroupRemove={(groupId, sourcePageId) => onMapTokenGroupRemove?.(noteActionId, sourcePageId || activePage.id, groupId)}
            onTokenGroupChange={(tokenId, groupId, sourcePageId) => onMapTokenGroupChange?.(noteActionId, sourcePageId || activePage.id, tokenId, groupId)}
            onTokenGroupGlobalChange={(groupId, global, sourcePageId) => onMapTokenGroupGlobalChange?.(noteActionId, sourcePageId || activePage.id, groupId, global)}
            onTokenGroupCombatChange={(groupId, inCombat, sourcePageId) => onMapTokenGroupCombatChange?.(noteActionId, sourcePageId || activePage.id, groupId, inCombat)}
            onTokenContextMenu={(event, tokenId, sourcePageId) => onMapTokenContextMenu?.(event, noteActionId, sourcePageId || activePage.id, tokenId)}
            onRollInitiativeTokens={(tokenIds) => onMapTokensRollInitiative?.(noteActionId, activePage.id, tokenIds)}
          />
        ) : null}
        {error ? (
          <p className="absolute bottom-3 left-3 max-w-[calc(100%-140px)] border border-red-500/40 bg-red-950/90 px-3 py-2 text-xs text-red-100">
            {error}
          </p>
        ) : null}
        {fogContextMenu ? createPortal((
          <div
            className="fixed z-[10003] max-h-[calc(100vh-16px)] w-64 overflow-y-auto border border-neutral-700 bg-neutral-950 p-1 text-xs text-neutral-200 shadow-2xl"
            data-board-control="true"
            data-map-fog-menu="true"
            style={{ left: fogContextMenu.x, top: fogContextMenu.y }}
            onPointerDown={(event) => event.stopPropagation()}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <button
              className="flex w-full items-center justify-between border-b border-neutral-800 px-3 py-2 text-left font-serif text-sm font-bold uppercase leading-none text-amber-500 hover:bg-neutral-900 focus:bg-neutral-900 focus:outline-none"
              type="button"
              onClick={() => setContextMenuOpenSections((sections) => ({ ...sections, fog: !sections.fog }))}
            >
              <span>FOG</span>
              <span className="font-sans text-xs text-neutral-500">{contextMenuOpenSections.fog ? "-" : "+"}</span>
            </button>
            {contextMenuOpenSections.fog ? (
              <div className="grid gap-2 border-b border-neutral-800 px-3 py-2">
                <div className="grid gap-1">
                  <span className="text-[10px] font-bold uppercase text-neutral-500">Tipo de brush</span>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      ["circle", "Circulo"],
                      ["square", "Cuadrado"]
                    ].map(([shape, label]) => {
                      const active = fog.brushShape === shape;
                      return (
                        <button
                          key={shape}
                          className={`border px-2 py-1 font-bold uppercase focus:outline-none focus:ring-1 focus:ring-amber-400 ${active ? "border-amber-400 bg-amber-500 text-neutral-950" : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-800"}`}
                          type="button"
                          onClick={() => updateFogBrushShape(shape)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="grid gap-1">
                  <span className="text-[10px] font-bold uppercase text-neutral-500">Tamanio {Math.round(fog.brushSize)}px</span>
                  <input
                    type="range"
                    min={MAP_FOG_BRUSH_MIN_SIZE}
                    max={MAP_FOG_BRUSH_MAX_SIZE}
                    value={fog.brushSize}
                    onChange={(event) => setFogBrushSize(event.target.value)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    className="border border-neutral-700 bg-neutral-900 px-2 py-1 font-bold uppercase text-neutral-200 hover:border-neutral-500 hover:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    type="button"
                    onClick={() => updateFogBrushSize(-MAP_FOG_BRUSH_KEY_STEP)}
                  >
                    -{MAP_FOG_BRUSH_KEY_STEP}px
                  </button>
                  <button
                    className="border border-neutral-700 bg-neutral-900 px-2 py-1 font-bold uppercase text-neutral-200 hover:border-neutral-500 hover:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    type="button"
                    onClick={() => updateFogBrushSize(MAP_FOG_BRUSH_KEY_STEP)}
                  >
                    +{MAP_FOG_BRUSH_KEY_STEP}px
                  </button>
                </div>
                <button
                  className="flex w-full items-center justify-between px-0 py-1 text-left font-bold text-sky-200 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
                  type="button"
                  onClick={() => setIsFogBrushActive((active) => !active)}
                >
                  <span>Pincel</span>
                  <span className={isFogBrushActive ? "text-emerald-300" : "text-neutral-500"}>{isFogBrushActive ? "ON" : "OFF"}</span>
                </button>
                <button
                  className="flex w-full items-center justify-between px-0 py-1 text-left font-bold text-amber-300 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
                  type="button"
                  onClick={() => setFogBrushMode((mode) => (mode === "hide" ? "reveal" : "hide"))}
                >
                  <span>Add/Remove Fog</span>
                  <span className="text-neutral-500">{fogBrushMode === "hide" ? "Add" : "Remove"}</span>
                </button>
              </div>
            ) : null}
            <button
              className="flex w-full items-center justify-between px-3 py-2 text-left font-serif text-sm font-bold uppercase leading-none text-amber-500 hover:bg-neutral-900 focus:bg-neutral-900 focus:outline-none"
              type="button"
              onClick={() => setContextMenuOpenSections((sections) => ({ ...sections, token: !sections.token }))}
            >
              <span>TOKEN</span>
              <span className="font-sans text-xs text-neutral-500">{contextMenuOpenSections.token ? "-" : "+"}</span>
            </button>
            {contextMenuOpenSections.token ? (
              <div className="border-t border-neutral-800 pt-1">
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-neutral-100 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
                  type="button"
                  onClick={requestContextNpcToken}
                >
                  <span>Add NPC</span>
                  <span className="text-neutral-500">+</span>
                </button>
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-neutral-100 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
                  type="button"
                  onClick={requestContextMonsterToken}
                >
                  <span>Add Monster</span>
                  <span className="text-neutral-500">+</span>
                </button>
              </div>
            ) : null}
            <button
              className="flex w-full items-center justify-between px-3 py-2 text-left font-serif text-sm font-bold uppercase leading-none text-amber-500 hover:bg-neutral-900 focus:bg-neutral-900 focus:outline-none"
              type="button"
              onClick={() => setContextMenuOpenSections((sections) => ({ ...sections, markers: !sections.markers }))}
            >
              <span>Markers</span>
              <span className="font-sans text-xs text-neutral-500">{contextMenuOpenSections.markers ? "-" : "+"}</span>
            </button>
            {contextMenuOpenSections.markers ? (
              <div className="border-t border-neutral-800 pt-1">
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-neutral-100 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
                  type="button"
                  onClick={() => requestContextMarker()}
                >
                  <span>Add Marker</span>
                  <span className="text-neutral-500">+</span>
                </button>
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-sky-200 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
                  type="button"
                  onClick={() => setContextMenuOpenSections((sections) => ({ ...sections, forms: !sections.forms }))}
                >
                  <span>Forms</span>
                  <span className="text-neutral-500">{contextMenuOpenSections.forms ? "-" : "+"}</span>
                </button>
                {contextMenuOpenSections.forms ? (
                  <div className="border-t border-neutral-800 py-1">
                    {[
                      ["cone", "Cono"],
                      ["square", "Cuadrado"],
                      ["circle", "Circulo"]
                    ].map(([formType, label]) => (
                      <button
                        key={formType}
                        className="flex w-full items-center justify-between px-5 py-2 text-left font-bold text-neutral-100 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
                        type="button"
                        onClick={() => requestContextMarker(formType)}
                      >
                        <span>{label}</span>
                        <span className="text-neutral-500">+</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ), document.body) : null}
      </div>
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

function CharacterDetailSection({ title, children, defaultOpen = false, ...props }) {
  return (
    <details className="mt-3 border border-neutral-800 bg-neutral-950/45" defaultOpen={defaultOpen} {...props}>
      <summary className="cursor-pointer select-none border-b border-neutral-800 px-3 py-2 font-serif text-base uppercase leading-none text-amber-500 hover:bg-neutral-900">
        {title}
      </summary>
      <div className="space-y-3 px-3 py-3 text-sm text-neutral-300">
        {children}
      </div>
    </details>
  );
}

function CharacterResourceButton({ kind, label, onOpenResource, onRemoveResource = null }) {
  if (!onOpenResource) {
    return <InteractiveRulesText text={label} context={kind} onRoll={() => {}} />;
  }
  return (
    <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] border border-neutral-800 bg-neutral-900/80">
      <button
        className="min-w-0 px-3 py-2 text-left leading-relaxed text-neutral-200 transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500/40"
        type="button"
        title={`Agregar nota de ${kind === "spell" ? "spell" : "item"}: ${label}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => onOpenResource(kind, label, event)}
      >
        <span className="block truncate">{label}</span>
      </button>
      {onRemoveResource ? (
        <button
          className="w-9 border-l border-neutral-800 text-xs font-bold text-neutral-500 hover:bg-red-950/40 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-400/50"
          type="button"
          title={`Remover ${label}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemoveResource(label)}
        >
          X
        </button>
      ) : null}
    </div>
  );
}

function CharacterEquipmentBlock({ text, context, onRoll, onOpenResource = null, onAddResource = null, onRemoveResource = null, dropNoteId = "" }) {
  const [draft, setDraft] = useState("");
  const lines = compactLines(text);
  const candidates = equipmentResourceCandidates(text);
  const canEdit = Boolean(onAddResource);
  const entries = candidates.length
    ? candidates.map((item) => ({ label: item.display, removable: true }))
    : lines.map((line) => ({ label: line.replace(/^[-*]\s*/, ""), removable: false }));

  function submitDraft(event) {
    event.preventDefault();
    const itemName = sanitizeDisplayText(draft, "");
    if (!itemName) return;
    onAddResource?.(itemName);
    setDraft("");
  }

  return (
    <div
      className="grid gap-2"
      data-character-equipment-drop={dropNoteId ? "true" : undefined}
      data-drop-note-id={dropNoteId || undefined}
    >
      {canEdit ? (
        <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={submitDraft}>
          <input
            className="h-9 min-w-0 border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-100 focus:border-amber-500 focus:outline-none"
            value={draft}
            placeholder="Sumar item al inventario"
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            className="h-9 border border-amber-500/70 bg-amber-950/70 px-3 text-xs font-bold uppercase text-amber-100 hover:bg-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={!draft.trim()}
          >
            Sumar
          </button>
        </form>
      ) : null}
      {entries.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {entries.map((item, index) => (
            item.removable ? (
              <CharacterResourceButton
                key={`${item.label}-${index}`}
                kind="item"
                label={item.label}
                onOpenResource={onOpenResource}
                onRemoveResource={onRemoveResource}
              />
            ) : (
              <div key={`${item.label}-${index}`} className="min-h-10 border border-neutral-800 bg-neutral-900/80 px-3 py-2 leading-relaxed text-neutral-200">
                <InteractiveRulesText text={item.label} context={context} onRoll={onRoll} />
              </div>
            )
          ))}
        </div>
      ) : (
        <p className="text-neutral-500">Sin datos.</p>
      )}
    </div>
  );
}

function CharacterTextBlock({ text, context, onRoll, onOpenResource = null, onAddResource = null, onRemoveResource = null, dropNoteId = "" }) {
  const lines = compactLines(text);
  const normalizedContext = normalizeSearch(context);
  const isFeatures = normalizedContext.includes("features");
  const isProficiencies = normalizedContext.includes("proficiencies");
  const isEquipment = normalizedContext.includes("equipment");
  if (!String(text || "").trim() && !isEquipment) return <p className="text-neutral-500">Sin datos.</p>;

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
    return (
      <CharacterEquipmentBlock
        text={text}
        context={context}
        onRoll={onRoll}
        onOpenResource={onOpenResource}
        onAddResource={onAddResource}
        onRemoveResource={onRemoveResource}
        dropNoteId={dropNoteId}
      />
    );
  }

  return (
    <div className="space-y-1 whitespace-pre-line leading-relaxed">
      <InteractiveRulesText text={text} context={context} onRoll={onRoll} />
    </div>
  );
}

function CharacterMoneyEditor({ character, noteId, onCharacterFieldChange }) {
  const moneyByKey = new Map(character.money || []);
  if (!onCharacterFieldChange && !moneyByKey.size) return null;
  return (
    <div className="mt-2 grid grid-cols-5 gap-1">
      {["CP", "SP", "EP", "GP", "PP"].map((key) => (
        <label key={key} className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
          {key}
          <NumericExpressionInput
            className="h-7 min-w-0 border border-neutral-700 bg-neutral-950 px-1 text-center text-sm font-bold text-neutral-100 focus:border-amber-500 focus:outline-none"
            value={moneyByKey.get(key) || character.rawData?.[key] || ""}
            min={0}
            integer
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(value) => onCharacterFieldChange?.(noteId, key, value)}
          />
        </label>
      ))}
    </div>
  );
}

function CharacterMonsterVitals({ character, monster, note, onRoll, onHpChange, onCharacterFieldChange }) {
  const initiative = abilityModifier(monster.dex);
  const senses = formatList(monster.senses);
  const skills = formatKeyValueMap(monster.skill);
  const languages = formatList(monster.languages) || "--";
  const editable = Boolean(onCharacterFieldChange);
  const editField = (fieldKey) => editable ? (value) => onCharacterFieldChange(note.id, fieldKey, value) : null;
  const editAbility = (pathParts, value) => {
    if (!editable || !Array.isArray(pathParts) || !pathParts.length) return;
    if (pathParts[0] === "save") {
      const [saveField] = CHARACTER_SAVE_FIELDS[pathParts[1]] || [];
      if (saveField) onCharacterFieldChange(note.id, saveField, value);
      return;
    }
    const abilityField = CHARACTER_ABILITY_FIELD_KEYS[pathParts[0]];
    if (abilityField) onCharacterFieldChange(note.id, abilityField, value);
  };

  return (
    <div className="px-3 py-2 text-sm">
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <div className="space-y-0.5">
          <p><strong className="text-neutral-200">AC</strong>{" "}
            <CtrlEditableText value={character.ac || ""} onCommit={editField("AC")}>{formatAc(monster)}</CtrlEditableText>
          </p>
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
            <label className="flex items-center gap-1 text-xs text-neutral-500">
              Temp
              <NumericExpressionInput
                className="h-7 w-16 border border-neutral-700 bg-neutral-950 px-2 text-sm text-neutral-100 focus:border-amber-500 focus:outline-none"
                value={character.tempHp || ""}
                onPointerDown={(event) => event.stopPropagation()}
                onChange={(value) => onCharacterFieldChange?.(note.id, "HPTemp", value)}
              />
            </label>
          </div>
          <p><strong className="text-neutral-200">Speed</strong>{" "}
            <CtrlEditableText value={character.speed || ""} onCommit={editField("Speed")}>{formatSpeedCompact(monster)}</CtrlEditableText>
          </p>
          <p><strong className="text-neutral-200">Passive</strong>{" "}
            <CtrlEditableText value={character.passive || ""} onCommit={editField("Passive")}>{character.passive || "--"}</CtrlEditableText>
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
        {["str", "dex", "con"].map((ability) => <AbilityCell key={ability} monster={monster} ability={ability} onRoll={onRoll} onEdit={editable ? editAbility : null} />)}
      </div>
      <div className="mt-1 grid gap-1 sm:grid-cols-3">
        {["int", "wis", "cha"].map((ability) => <AbilityCell key={ability} monster={monster} ability={ability} onRoll={onRoll} onEdit={editable ? editAbility : null} />)}
      </div>

      {skills ? <p className="mt-2 leading-snug"><strong className="text-neutral-200">Skills</strong> {skills}</p> : null}
      {senses ? <p className="leading-snug"><strong className="text-neutral-200">Senses</strong> {senses}</p> : null}
      <p className="leading-snug"><strong className="text-neutral-200">Languages</strong> {languages}</p>
      <p className="leading-snug">
        <strong className="text-neutral-200">Character</strong>{" "}
        <CtrlEditableText value={character.race || ""} onCommit={editField("Race ")}>{character.race || "Race"}</CtrlEditableText>
        {" | "}
        <CtrlEditableText value={character.background || ""} onCommit={editField("Background")}>{character.background || "Background"}</CtrlEditableText>
        {character.profBonus ? <>{" | "}Prof <CtrlEditableText value={character.profBonus || ""} onCommit={editField("ProfBonus")}>{character.profBonus}</CtrlEditableText></> : null}
        {character.hitDice ? <>{" | "}HD {character.hitDice}</> : null}
      </p>
      <CharacterMoneyEditor character={character} noteId={note.id} onCharacterFieldChange={onCharacterFieldChange} />
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
  onCharacterFieldChange,
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

  function commitCharacterField(fieldKey, value) {
    onCharacterFieldChange?.(noteActionId, fieldKey, value);
  }
  const canEditRemoteSheet = Boolean(note.livePlayerId && note.liveConnected !== false);
  const characterSections = (() => {
    const sections = Array.isArray(character.sections) ? character.sections : [];
    const hasEquipment = sections.some(([title]) => normalizeSearch(title).includes("equipment"));
    return canEditRemoteSheet && !hasEquipment ? [...sections, ["Equipment", ""]] : sections;
  })();

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
      data-note-action-id={noteActionId}
      style={{ left: frameNote.x, top: frameNote.y, zIndex: frameNote.z, width: frameNote.width, height: frameNote.height, flexDirection: "column" }}
      onPointerDown={onFocus}
    >
      <MonsterStatBlockHeader
        monster={statBlockCharacter}
        title={noteDisplayName(note)}
        onRename={(value) => canEditRemoteSheet ? commitCharacterField("CharacterName", value) : onRename?.(noteActionId, value)}
        onDragStart={(event) => onDragStart(event, frameNoteId)}
        onMinimize={() => onMinimize(frameNoteId)}
        onDuplicate={() => onDuplicate(noteActionId)}
        onClose={(event) => onClose(noteActionId, event)}
      />
      {tabBar}

      <div className="min-h-0 flex-1 overflow-auto text-sm">
        {(character.player || note.livePlayerId) ? (
          <p className="border-b border-neutral-800 px-3 py-2 text-xs text-neutral-500">
            {note.livePlayerId ? (
              <span>
                Live Player{" "}
                <CtrlEditableText value={note.livePlayerName || character.player || ""} onCommit={canEditRemoteSheet ? (value) => commitCharacterField("PlayerName", value) : null}>
                  {note.livePlayerName || character.player || "Player"}
                </CtrlEditableText>
                {" | "}{note.liveConnected === false ? "Disconnected" : "Connected"}
              </span>
            ) : (
              <span>Player {character.player}</span>
            )}
          </p>
        ) : null}
        <div className="grid gap-2 border-b border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs text-neutral-400 sm:grid-cols-3">
          <p>
            <strong className="text-neutral-200">Class</strong>{" "}
            <CtrlEditableText value={character.classLevel || ""} onCommit={canEditRemoteSheet ? (value) => commitCharacterField("ClassLevel", value) : null}>
              {character.classLevel || "Class"}
            </CtrlEditableText>
          </p>
          <p>
            <strong className="text-neutral-200">Level</strong>{" "}
            <CtrlEditableText value={character.level || ""} onCommit={canEditRemoteSheet ? (value) => commitCharacterField("CharacterLevel", value) : null}>
              {character.level || "--"}
            </CtrlEditableText>
          </p>
          <p>
            <strong className="text-neutral-200">Alignment</strong>{" "}
            <CtrlEditableText value={character.alignment || ""} onCommit={canEditRemoteSheet ? (value) => commitCharacterField("Alignment", value) : null}>
              {character.alignment || "--"}
            </CtrlEditableText>
          </p>
        </div>
        <CharacterMonsterVitals
          character={character}
          monster={statBlockCharacter}
          note={note}
          onRoll={addRoll}
          onHpChange={onHpChange}
          onCharacterFieldChange={canEditRemoteSheet ? onCharacterFieldChange : null}
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

        {characterSections.map(([title, text], index) => (
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
              onAddResource={canEditRemoteSheet && normalizeSearch(title).includes("equipment")
                ? (label) => commitCharacterField("Equipment", appendCharacterEquipmentItem(characterEquipmentText(character), label))
                : null}
              onRemoveResource={canEditRemoteSheet && normalizeSearch(title).includes("equipment")
                ? (label) => commitCharacterField("Equipment", removeCharacterEquipmentItem(characterEquipmentText(character), label))
                : null}
              dropNoteId={normalizeSearch(title).includes("equipment") ? noteActionId : ""}
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

function normalizeRaisedHandQueue(entries) {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry?.playerId)
    .map((entry, index) => ({
      playerId: String(entry.playerId),
      playerName: sanitizeDisplayText(entry.playerName, "Jugador"),
      raisedAt: entry.raisedAt || "",
      position: Number(entry.position) || index + 1
    }))
    .sort((left, right) => (left.position - right.position) || String(left.raisedAt).localeCompare(String(right.raisedAt)));
}

function formatLiveTimestamp(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function MapIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6.5 9.5 4l5 2 5.5-2.5v14l-5.5 2.5-5-2-5.5 2.5v-14Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 4v14M14.5 6v14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

function SoundIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9.5h4l5-4v13l-5-4H4v-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 9c1.1 1.5 1.1 4.5 0 6M18.7 6.5c2.4 3.2 2.4 7.8 0 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 5.5h3.5v13H7v-13ZM13.5 5.5H17v13h-3.5v-13Z" fill="currentColor" />
    </svg>
  );
}

function UploadIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4m0 0 4.5 4.5M12 4 7.5 8.5M5 18.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14M9 7V5h6v2m-8 0 .7 12h8.6L17 7M10 10.5v5M14 10.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LivePlayersPanel({
  status,
  diagnostics,
  port,
  error,
  players,
  collapsed,
  tokenEnabled,
  onToggleCollapsed,
  onPortChange,
  onTokenEnabledChange,
  onStart,
  onStop,
  onRunSelfTest,
  onKick,
  onAddMapNote
}) {
  const running = Boolean(status?.running);
  const addresses = Array.isArray(status?.addresses) ? status.addresses : [];
  const tailscaleAddresses = Array.isArray(status?.tailscaleAddresses) ? status.tailscaleAddresses : [];
  const lanAddresses = Array.isArray(status?.lanAddresses) ? status.lanAddresses : addresses.filter((address) => !tailscaleAddresses.includes(address));
  const primaryAddress = tailscaleAddresses[0] || lanAddresses[0] || addresses[0] || "DM_IP";
  const effectivePort = status?.port || port || 8787;
  const recommendedUrl = status?.recommendedUrl || (primaryAddress !== "DM_IP" ? `ws://${primaryAddress}:${effectivePort}` : "");
  const tailscaleUrl = tailscaleAddresses[0] ? `ws://${tailscaleAddresses[0]}:${effectivePort}` : "";
  const sessionToken = status?.tokenEnabled ? status?.sessionToken : "";
  const selfTests = status?.selfTests || {};
  const [magicDnsHost, setMagicDnsHost] = useState("");
  const magicDnsUrl = magicDnsHost.trim() ? `ws://${magicDnsHost.trim()}:${effectivePort}` : "";

  function copyText(text) {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  function testLabel(test, okText, failText, pendingText) {
    if (!running || !test) return pendingText;
    return test.ok ? okText : failText;
  }

  function testClass(test) {
    if (!running || !test) return "border-neutral-800 bg-neutral-950 text-neutral-500";
    return test.ok ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300" : "border-red-500/30 bg-red-950/30 text-red-200";
  }

  if (collapsed) {
    return (
      <div
        className="fixed right-4 top-4 z-40 flex gap-2"
        data-board-control="true"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          className="flex h-14 w-14 items-center justify-center border border-neutral-700 bg-neutral-900/95 text-amber-300 shadow-2xl transition hover:border-amber-500 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          type="button"
          aria-label="Crear mapa VVT"
          title="Crear mapa VVT"
          onClick={onAddMapNote}
        >
          <MapIcon className="h-8 w-8" />
        </button>
        <button
          className="relative flex h-14 w-14 items-center justify-center border border-amber-500 bg-neutral-900/95 text-amber-300 shadow-2xl transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          type="button"
          aria-label="Expand live players panel"
          title={`Live Players: ${players.length} players | ws://${primaryAddress}:${effectivePort}`}
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
      </div>
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
              Players connect to {recommendedUrl || `ws://${primaryAddress}:${effectivePort}`} from the Connect to DM panel.
            </p>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <span className={`border px-2 py-1 text-[11px] font-bold uppercase ${running ? "border-emerald-500/40 text-emerald-300" : "border-neutral-700 text-neutral-500"}`}>
              {running ? "Hosting" : "Stopped"}
            </span>
            <button
              className="h-7 w-7 border border-neutral-700 bg-neutral-950 text-amber-300 hover:border-amber-500 hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onAddMapNote}
              aria-label="Crear mapa VVT"
              title="Crear mapa VVT"
            >
              <MapIcon className="mx-auto h-4 w-4" />
            </button>
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

            <label className="flex items-start gap-2 border border-neutral-800 bg-neutral-950/60 p-2 text-xs text-neutral-300">
              <input
                className="mt-0.5"
                type="checkbox"
                checked={Boolean(tokenEnabled)}
                disabled={running}
                onChange={(event) => onTokenEnabledChange(event.target.checked)}
              />
              <span>
                <span className="block font-bold text-neutral-100">Session token</span>
                <span className="text-neutral-500">Recommended for Tailscale host. Turn off only for local tests.</span>
              </span>
            </label>

            <section className="grid gap-2 border border-emerald-500/30 bg-emerald-950/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-300">Tailscale connection</h3>
                <span className={`border px-2 py-1 text-[10px] font-bold uppercase ${tailscaleAddresses.length ? "border-emerald-500/40 text-emerald-300" : "border-neutral-700 text-neutral-500"}`}>
                  {tailscaleAddresses.length ? "Tailscale detected" : "Tailscale not detected"}
                </span>
              </div>
              {tailscaleUrl ? (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <code className="min-w-0 break-all border border-neutral-800 bg-neutral-950 px-2 py-2 text-xs text-emerald-200">{tailscaleUrl}</code>
                  <button className="border border-neutral-700 bg-neutral-950 px-3 text-xs font-bold text-neutral-200 hover:border-emerald-500" type="button" onClick={() => copyText(tailscaleUrl)}>Copy</button>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">Start the host to show the recommended Tailscale URL.</p>
              )}
              {sessionToken ? (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <code className="min-w-0 break-all border border-neutral-800 bg-neutral-950 px-2 py-2 text-xs text-amber-200">Session code: {sessionToken}</code>
                  <button className="border border-neutral-700 bg-neutral-950 px-3 text-xs font-bold text-neutral-200 hover:border-amber-500" type="button" onClick={() => copyText(sessionToken)}>Copy</button>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">No token mode active.</p>
              )}
              <label className="grid gap-1 text-xs font-bold uppercase text-neutral-500">
                MagicDNS host
                <input
                  className="h-9 border border-neutral-700 bg-neutral-950 px-2 text-sm font-normal normal-case text-neutral-100 focus:border-emerald-500 focus:outline-none"
                  type="text"
                  spellCheck="false"
                  placeholder="kael-pc o kael-pc.tailnet.ts.net"
                  value={magicDnsHost}
                  onChange={(event) => setMagicDnsHost(event.target.value)}
                />
              </label>
              {magicDnsUrl ? (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <code className="min-w-0 break-all border border-neutral-800 bg-neutral-950 px-2 py-2 text-xs text-emerald-200">{magicDnsUrl}</code>
                  <button className="border border-neutral-700 bg-neutral-950 px-3 text-xs font-bold text-neutral-200 hover:border-emerald-500" type="button" onClick={() => copyText(magicDnsUrl)}>Copy</button>
                </div>
              ) : null}
              <div className="grid gap-1 text-xs leading-relaxed text-neutral-400">
                <p>Para usar Tailscale, todos los jugadores deben tener Tailscale instalado y estar en el mismo tailnet o tener acceso compartido a la PC del DM.</p>
                <p>No uses tu IP publica. No abras puertos del router para este modo.</p>
                <p>Usa la IP Tailscale 100.x.y.z o el nombre MagicDNS del DM.</p>
                <p>Si no conecta, proba primero hacer ping a la IP Tailscale del DM.</p>
              </div>
              <p className="text-xs text-neutral-500">{diagnostics?.message || (tailscaleAddresses[0] ? `Tailscale IP detected: ${tailscaleAddresses[0]}` : "No Tailscale IP detected. Open Tailscale and confirm this device is connected.")}</p>
            </section>

            <section className="grid gap-2 border border-neutral-800 bg-neutral-950/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-400">Connection tests</h3>
                <button className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] font-bold text-neutral-300 hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={!running} onClick={onRunSelfTest}>Run tests</button>
              </div>
              <div className="grid gap-1 text-xs">
                <span className={`border px-2 py-1 ${testClass(selfTests.local)}`}>{testLabel(selfTests.local, "Local test OK", "Local test failed", "Local test pending")}</span>
                <span className={`border px-2 py-1 ${testClass(selfTests.tailscale)}`}>{testLabel(selfTests.tailscale, "Tailscale self-test OK", "Tailscale self-test failed", tailscaleAddresses.length ? "Tailscale self-test pending" : "No Tailscale IP for self-test")}</span>
              </div>
              {running && tailscaleAddresses.length && selfTests.tailscale && !selfTests.tailscale.ok ? (
                <p className="border border-red-500/30 bg-red-950/30 px-2 py-1 text-xs text-red-200">
                  The host started, but it is not responding through Tailscale. Check Windows Firewall and allow DnD Character Sheet / Electron on private networks.
                </p>
              ) : null}
            </section>

            <section className="grid gap-1 border border-neutral-800 bg-neutral-950/50 p-3 text-xs text-neutral-400">
              <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">LAN fallback</h3>
              {lanAddresses.length ? lanAddresses.map((address) => (
                <code key={address} className="break-all border border-neutral-800 bg-neutral-950 px-2 py-1 text-amber-200">ws://{address}:{effectivePort}</code>
              )) : (
                <p className="text-neutral-500">{running ? "No LAN IP detected. Check Windows network settings." : "Start the host to show LAN IP addresses."}</p>
              )}
            </section>
            {error ? <p className="border border-red-500/30 bg-red-950/40 px-2 py-1 text-xs text-red-200">{error}</p> : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
            <section className="border border-neutral-800 bg-neutral-950/70">
              <header className="border-b border-neutral-800 px-3 py-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-amber-500">Live Sheets</h3>
              </header>
              <div className="grid gap-1 p-2 text-xs">
                {players.length ? players.map((player) => (
                  <div key={player.playerId} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border border-neutral-800 bg-neutral-900 px-2 py-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${player.connected ? "bg-emerald-400" : "bg-neutral-600"}`} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-neutral-100">{sanitizeDisplayText(player.playerName, "Player")}</p>
                      <p className="truncate text-[11px] text-neutral-500">
                        {player.lastUpdate ? `Character note on board | ${formatLiveTimestamp(player.lastUpdate)}` : "Waiting for sheet snapshot"}
                      </p>
                    </div>
                    <button
                      className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] font-bold text-neutral-300 hover:border-red-500 hover:text-red-200"
                      type="button"
                      onClick={() => onKick(player.playerId)}
                    >
                      {player.connected ? "Kick" : "Remove"}
                    </button>
                  </div>
                )) : (
                  <p className="border border-dashed border-neutral-700 bg-neutral-950/60 p-4 text-center text-sm text-neutral-500">
                    No connected players yet.
                  </p>
                )}
              </div>
            </section>
        </div>
      </>
    </aside>
  );
}

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function SoundButtonRow({ sound, busy, active, onRename, onPlay, onPause, onDelete }) {
  const [draftName, setDraftName] = useState(sound.name || "Audio");

  useEffect(() => {
    setDraftName(sound.name || "Audio");
  }, [sound.id, sound.name]);

  function commitName() {
    const nextName = sanitizeDisplayText(draftName, sound.name || "Audio").slice(0, 80);
    setDraftName(nextName);
    if (nextName !== sound.name) onRename(sound.id, nextName);
  }

  return (
    <div className="grid min-w-[260px] grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 border border-neutral-800 bg-neutral-950/80 px-2 py-2">
      <button
        className="flex h-9 w-9 items-center justify-center border border-amber-500/60 bg-amber-500 text-neutral-950 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:cursor-wait disabled:opacity-60"
        type="button"
        aria-label={`Reproducir ${sound.name || "audio"}`}
        title="Reproducir para jugadores"
        disabled={busy}
        onClick={() => onPlay(sound.id)}
      >
        <PlayIcon className="h-4 w-4" />
      </button>
      <div className="min-w-0">
        <input
          className="h-7 w-full border border-transparent bg-transparent px-1 text-sm font-bold text-neutral-100 outline-none hover:border-neutral-700 focus:border-amber-500 focus:bg-neutral-900"
          value={draftName}
          spellCheck="false"
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraftName(sound.name || "Audio");
              event.currentTarget.blur();
            }
          }}
        />
        <p className="truncate px-1 text-[11px] text-neutral-500">{formatFileSize(sound.size)} {sound.type ? `| ${sound.type}` : ""}</p>
      </div>
      <button
        className={`flex h-8 w-8 items-center justify-center border bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-sky-500 text-sky-200 hover:bg-sky-950/40" : "border-neutral-700 text-neutral-500"}`}
        type="button"
        aria-label={`Pausar ${sound.name || "audio"}`}
        title="Pausar audio"
        disabled={!active || busy}
        onClick={() => onPause(sound.id)}
      >
        <PauseIcon className="h-4 w-4" />
      </button>
      <button
        className="flex h-8 w-8 items-center justify-center border border-neutral-700 bg-neutral-900 text-red-300 hover:border-red-500 hover:bg-red-950/40 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:cursor-wait disabled:opacity-50"
        type="button"
        aria-label={`Eliminar ${sound.name || "audio"}`}
        title="Eliminar audio"
        disabled={busy}
        onClick={() => onDelete(sound.id)}
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function SoundBarPanel({
  sounds,
  collapsed,
  error,
  busyId,
  activeSoundIds,
  connectedPlayerCount,
  fileInputRef,
  onToggleCollapsed,
  onPickFiles,
  onFilesSelected,
  onRename,
  onPlay,
  onPause,
  onDelete
}) {
  if (collapsed) {
    return (
      <div
        className="fixed bottom-4 right-4 z-40"
        data-board-control="true"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          className="relative flex h-14 w-14 items-center justify-center border border-amber-500 bg-neutral-900/95 text-amber-300 shadow-2xl transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          type="button"
          aria-label="Expandir sound bar"
          title={`Sound Bar: ${sounds.length} audios`}
          onClick={onToggleCollapsed}
        >
          <SoundIcon className="h-8 w-8" />
          {sounds.length ? (
            <span className="absolute -bottom-1 -left-1 inline-flex h-6 min-w-6 items-center justify-center border border-neutral-950 bg-amber-500 px-1 text-[11px] font-black leading-none text-neutral-950">
              {sounds.length}
            </span>
          ) : null}
        </button>
      </div>
    );
  }

  return (
    <aside
      className="fixed bottom-4 right-4 z-40 flex max-h-[42vh] w-[min(760px,calc(100vw-32px))] flex-col border border-neutral-700 bg-neutral-900/95 text-neutral-200 shadow-2xl"
      data-board-control="true"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.opus,.webm,.m4a,.aac,.flac"
        multiple
        onChange={onFilesSelected}
      />
      <header className="flex items-start justify-between gap-3 border-b-2 border-amber-500 p-3">
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-amber-500">Sound Bar</h2>
          <p className="truncate text-xs text-neutral-500">
            {connectedPlayerCount} jugadores conectados
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            className="flex h-8 items-center gap-2 border border-neutral-700 bg-neutral-950 px-3 text-xs font-bold uppercase text-emerald-300 hover:border-emerald-500 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            type="button"
            onClick={onPickFiles}
          >
            <UploadIcon className="h-4 w-4" />
            <span>Subir</span>
          </button>
          <button
            className="h-8 w-8 border border-neutral-700 bg-neutral-950 text-sm font-bold text-neutral-300 hover:border-amber-500 hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Colapsar sound bar"
            title="Colapsar"
          >
            -
          </button>
        </div>
      </header>
      {error ? <p className="border-b border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-200">{error}</p> : null}
      <div className="min-h-0 overflow-auto p-3">
        {sounds.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
            {sounds.map((sound) => (
              <SoundButtonRow
                key={sound.id}
                sound={sound}
                busy={Boolean(busyId)}
                active={activeSoundIds.includes(sound.id)}
                onRename={onRename}
                onPlay={onPlay}
                onPause={onPause}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <button
            className="flex w-full items-center justify-center gap-2 border border-dashed border-neutral-700 bg-neutral-950/60 p-5 text-sm font-bold uppercase text-neutral-400 hover:border-amber-500 hover:text-amber-200"
            type="button"
            onClick={onPickFiles}
          >
            <UploadIcon className="h-5 w-5" />
            <span>Subir audios</span>
          </button>
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

function NpcTokenPicker({
  isOpen,
  tokens,
  selectedToken,
  searchQuery,
  loading,
  error,
  onSearch,
  onSelect,
  onAdd,
  onClose
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4" data-monster-picker="true">
      <section className="grid h-[min(720px,calc(100vh-32px))] w-[min(980px,calc(100vw-32px))] grid-cols-1 overflow-hidden border border-neutral-700 bg-neutral-900 text-neutral-300 shadow-2xl md:grid-cols-[430px_1fr]">
        <div className="flex min-h-0 flex-col border-r border-neutral-700">
          <header className="border-b-2 border-amber-500 bg-neutral-950 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-amber-500">Add NPC</h1>
                <p className="text-sm text-neutral-500">{tokens.length} tokens</p>
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
              placeholder="Search tokens"
              autoFocus
            />
          </header>
          <div className="min-h-0 flex-1 overflow-auto bg-neutral-900">
            {loading ? <p className="px-4 py-6 text-sm text-neutral-500">Cargando tokens...</p> : null}
            {!loading && tokens.length ? tokens.map((token) => {
              const active = selectedToken?.id === token.id;
              return (
                <button
                  key={token.id}
                  className={`grid w-full grid-cols-[48px_1fr] items-center gap-3 border-b border-neutral-800 px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-300 ${active ? "bg-amber-500 text-neutral-950 hover:bg-amber-400" : "text-neutral-300 hover:bg-neutral-800"}`}
                  type="button"
                  onClick={() => onSelect(token)}
                >
                  <img className="h-10 w-10 rounded-full border border-neutral-700 bg-neutral-950 object-cover" src={token.url} alt="" draggable={false} />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{token.name}</span>
                    <span className={`block truncate text-[11px] ${active ? "text-neutral-800" : "text-neutral-500"}`}>{token.relativePath}</span>
                  </span>
                </button>
              );
            }) : null}
            {!loading && !tokens.length ? <p className="px-4 py-6 text-sm text-neutral-500">No matches.</p> : null}
          </div>
        </div>
        <div className="flex min-h-0 flex-col bg-neutral-900 p-5">
          {selectedToken ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 items-center justify-center border border-neutral-800 bg-neutral-950/70 p-5">
                <img className="max-h-full max-w-full rounded border border-neutral-700 bg-neutral-950 object-contain" src={selectedToken.url} alt={`${selectedToken.name} preview`} draggable={false} />
              </div>
              <div className="border-t border-neutral-700 pt-4">
                <p className="truncate font-serif text-xl font-bold uppercase text-amber-500">{selectedToken.name}</p>
                <p className="mt-1 truncate text-sm text-neutral-500">{selectedToken.relativePath}</p>
                {error ? <p className="mt-3 border border-red-500/40 bg-red-950/70 px-3 py-2 text-sm text-red-100">{error}</p> : null}
                <button
                  className="mt-4 inline-flex h-10 items-center bg-amber-500 px-4 text-sm font-bold text-neutral-950 shadow-sm transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-neutral-900"
                  type="button"
                  onClick={() => onAdd(selectedToken)}
                >
                  Crear NPC
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              Selecciona un token.
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

function RaisedHandsNote({ hands, onLowerHand }) {
  const queue = normalizeRaisedHandQueue(hands);
  if (!queue.length) return null;
  return (
    <aside
      className="fixed bottom-4 right-4 z-50 w-[min(340px,calc(100vw-32px))] border border-amber-500 bg-neutral-900/95 text-neutral-200 shadow-2xl"
      data-board-control="true"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="border-b-2 border-amber-500 px-3 py-2">
        <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-amber-500">Manos levantadas</h2>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500">Orden de prioridad para hablar</p>
      </header>
      <div className="grid gap-1 p-2">
        {queue.map((hand) => (
          <div key={hand.playerId} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border border-neutral-800 bg-neutral-950 px-2 py-2 text-xs">
            <span className="flex h-7 w-7 items-center justify-center border border-amber-500 bg-amber-500 text-sm font-black text-neutral-950">
              {hand.position}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-neutral-100">{hand.playerName}</p>
              <p className="text-[11px] text-neutral-500">{hand.raisedAt ? `Desde ${formatLiveTimestamp(hand.raisedAt)}` : "Esperando turno"}</p>
            </div>
            <button
              className="border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] font-bold uppercase text-neutral-300 hover:border-amber-500 hover:text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              type="button"
              onClick={() => onLowerHand?.(hand.playerId)}
            >
              Bajar
            </button>
          </div>
        ))}
      </div>
    </aside>
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
              <p className="mt-1 text-sm text-neutral-400">Paste the code and press Enter to create the note.</p>
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
            placeholder="Paste the character sheet code here"
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

function NoteCloseSaveModal({ pendingClose, onSave, onDiscard, onCancel }) {
  if (!pendingClose) return null;
  const notes = Array.isArray(pendingClose.notes) ? pendingClose.notes : [];
  const plural = notes.length > 1;

  return createPortal(
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/75 p-4" onPointerDown={onCancel}>
      <section
        className="w-full max-w-lg border border-amber-500/70 bg-neutral-950 text-neutral-100 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-note-before-close-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="border-b border-neutral-800 px-5 py-4">
          <h2 id="save-note-before-close-title" className="font-serif text-xl font-bold text-amber-500">Guardar nota antes de cerrar</h2>
          <p className="mt-1 text-sm leading-relaxed text-neutral-300">
            {plural
              ? "Estas notas contienen contenido homebrew o notas adicionales. ¿Querés conservarlas para cargarlas después?"
              : "Esta nota contiene contenido homebrew o notas adicionales. ¿Querés conservarla para cargarla después?"}
          </p>
        </header>
        <div className="max-h-48 space-y-1 overflow-auto px-5 py-3 text-sm text-neutral-300">
          {notes.map((note) => <div key={note.id}>• {noteDisplayName(note)}</div>)}
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-neutral-800 px-5 py-4">
          <button className="h-9 border border-neutral-700 bg-neutral-900 px-3 text-sm font-bold text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800" type="button" onClick={onCancel}>Cancelar</button>
          <button className="h-9 border border-red-900 bg-red-950/50 px-3 text-sm font-bold text-red-200 hover:bg-red-900/50" type="button" onClick={onDiscard}>Cerrar sin guardar</button>
          <button className="h-9 bg-amber-500 px-3 text-sm font-bold text-neutral-950 hover:bg-amber-400" type="button" onClick={onSave}>Guardar y cerrar</button>
        </footer>
      </section>
    </div>,
    document.body
  );
}

function SavedBoardNotesModal({ isOpen, savedNotes, onLoad, onClose }) {
  if (!isOpen) return null;
  const notes = Array.isArray(savedNotes) ? savedNotes : [];

  return createPortal(
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/75 p-4" onPointerDown={onClose}>
      <section
        className="w-full max-w-2xl border border-amber-500/70 bg-neutral-950 text-neutral-100 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-board-notes-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 id="saved-board-notes-title" className="font-serif text-xl font-bold text-amber-500">Notas guardadas</h2>
            <p className="mt-1 text-sm text-neutral-400">Cargá una copia de una nota conservada en el punto del tablero donde abriste el menú.</p>
          </div>
          <button className="h-8 w-8 border border-neutral-700 bg-neutral-900 text-sm font-bold text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800" type="button" onClick={onClose}>X</button>
        </header>
        <div className="max-h-[60vh] overflow-auto p-4">
          {!notes.length ? <p className="border border-dashed border-neutral-700 p-5 text-sm text-neutral-400">Todavía no hay notas guardadas.</p> : (
            <div className="space-y-2">
              {notes.map((note) => (
                <article key={note.id} className="flex items-center justify-between gap-4 border border-neutral-800 bg-neutral-900/60 p-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-neutral-100">{note.title}</h3>
                    <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">
                      {note.kind === "monster" ? "Monstruo / NPC" : "Ítem"}
                      {note.savedAt ? ` · ${new Date(note.savedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <button className="h-9 shrink-0 bg-amber-500 px-3 text-sm font-bold text-neutral-950 hover:bg-amber-400" type="button" onClick={() => onLoad(note.id)}>Cargar</button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body
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
  const [librariesReady, setLibrariesReady] = useState(false);
  const [librariesError, setLibrariesError] = useState("");
  const [librariesRevision, setLibrariesRevision] = useState(0);
  const [isReturning, setIsReturning] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editionFilter, setEditionFilter] = useState("all");
  const [crFilter, setCrFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedMonster, setSelectedMonster] = useState(null);
  const [previewRolls, setPreviewRolls] = useState([]);
  const [previewDicePanelOpen, setPreviewDicePanelOpen] = useState(false);
  const [freeDiceOpen, setFreeDiceOpen] = useState(false);
  const [freeDiceSelection, setFreeDiceSelection] = useState(createFreeDiceSelection);
  const [freeDiceRolls, setFreeDiceRolls] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [tokenContextMenu, setTokenContextMenu] = useState(null);
  const [markerContextMenu, setMarkerContextMenu] = useState(null);
  const [pendingMapMarkerAttach, setPendingMapMarkerAttach] = useState(null);
  const [noteSpawnPoint, setNoteSpawnPoint] = useState(null);
  const [resourcePickerKind, setResourcePickerKind] = useState(null);
  const [resourceSearchQuery, setResourceSearchQuery] = useState("");
  const [resourceSortField, setResourceSortField] = useState("name");
  const [resourceSortDirection, setResourceSortDirection] = useState("asc");
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isObsidianPickerOpen, setIsObsidianPickerOpen] = useState(false);
  const [obsidianVault, setObsidianVault] = useState(null);
  const [obsidianNotes, setObsidianNotes] = useState([]);
  const [obsidianSearchQuery, setObsidianSearchQuery] = useState("");
  const [selectedObsidianNote, setSelectedObsidianNote] = useState(null);
  const [obsidianPickerLoading, setObsidianPickerLoading] = useState(false);
  const [obsidianPickerError, setObsidianPickerError] = useState("");
  const [obsidianSpawnPoint, setObsidianSpawnPoint] = useState(null);
  const [monsterNotes, setMonsterNotes] = useState([]);
  const [savedBoardNotes, setSavedBoardNotes] = useState([]);
  const [isSavedBoardNotesOpen, setIsSavedBoardNotesOpen] = useState(false);
  const [savedBoardNotesSpawnPoint, setSavedBoardNotesSpawnPoint] = useState(null);
  const [pendingNoteClose, setPendingNoteClose] = useState(null);
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
  const [pendingMapTokenTarget, setPendingMapTokenTarget] = useState(null);
  const [isNpcTokenPickerOpen, setIsNpcTokenPickerOpen] = useState(false);
  const [npcTokenLibrary, setNpcTokenLibrary] = useState([]);
  const [npcTokenSearchQuery, setNpcTokenSearchQuery] = useState("");
  const [selectedNpcToken, setSelectedNpcToken] = useState(null);
  const [npcTokenPickerLoading, setNpcTokenPickerLoading] = useState(false);
  const [npcTokenPickerError, setNpcTokenPickerError] = useState("");
  const [liveServerStatus, setLiveServerStatus] = useState({ running: false, port: 8787, addresses: [], tailscaleAddresses: [], lanAddresses: [], playerCount: 0 });
  const [liveDiagnostics, setLiveDiagnostics] = useState(null);
  const [livePlayers, setLivePlayers] = useState([]);
  const [raisedHands, setRaisedHands] = useState([]);
  const [liveHostPort, setLiveHostPort] = useState("8787");
  const [liveHostTokenEnabled, setLiveHostTokenEnabled] = useState(true);
  const [liveHostError, setLiveHostError] = useState("");
  const [livePlayersCollapsed, setLivePlayersCollapsed] = useState(loadLivePlayersPanelCollapsed);
  const [soundBarCollapsed, setSoundBarCollapsed] = useState(loadSoundBarCollapsed);
  const [soundButtons, setSoundButtons] = useState([]);
  const [soundBarError, setSoundBarError] = useState("");
  const [soundBarBusyId, setSoundBarBusyId] = useState("");
  const [activeSoundIds, setActiveSoundIds] = useState([]);
  const [sharedVvtMap, setSharedVvtMap] = useState(null);
  const [vvtPings, setVvtPings] = useState([]);
  const [dropTargetNoteId, setDropTargetNoteId] = useState(null);
  const [selectedRootNoteIds, setSelectedRootNoteIds] = useState([]);
  const [selectedMapTokens, setSelectedMapTokens] = useState({ mapNoteId: "", pageId: "", tokenIds: [] });
  const [selectionBox, setSelectionBox] = useState(null);
  const [boardView, setBoardView] = useState(defaultBoardState().view);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredResourceSearchQuery = useDeferredValue(resourceSearchQuery);
  const deferredObsidianSearchQuery = useDeferredValue(obsidianSearchQuery);
  const boardRootRef = useRef(null);
  const dragRef = useRef(null);
  const mapTokenDragRef = useRef(null);
  const mapMarkerDragRef = useRef(null);
  const tabDragRef = useRef(null);
  const resizeRef = useRef(null);
  const panRef = useRef(null);
  const selectionRef = useRef(null);
  const soundFileInputRef = useRef(null);
  const dmSoundAudioPlayersRef = useRef([]);
  const dmSoundAudioPlayersByIdRef = useRef(new Map());
  const tokenContextPointerRef = useRef(null);
  const boardViewRef = useRef(boardView);
  const handleBoardWheelRef = useRef(null);
  const monsterNotesRef = useRef(monsterNotes);
  const savedBoardNotesRef = useRef(savedBoardNotes);
  const publishedVvtTargetKeyRef = useRef("");
  const publishedVvtTokenImageKeysRef = useRef(new Map());
  const librariesReadyRef = useRef(librariesReady);
  const pendingBoardSaveRef = useRef({ notes: monsterNotes, view: boardView, savedNotes: savedBoardNotes });
  const boardSaveTimerRef = useRef(null);
  const selectedMapTokensRef = useRef(selectedMapTokens);
  const focusedRootNoteIdRef = useRef(null);
  const suppressRestoreClickRef = useRef(null);
  const zRef = useRef(20);

  useEffect(() => {
    let cancelled = false;
    loadDmScreenLibraries()
      .then(() => {
        if (cancelled) return;
        const persistedBoardState = loadDmBoardState();
        setMonsterNotes(persistedBoardState.notes);
        setSavedBoardNotes(persistedBoardState.savedNotes);
        setBoardView(persistedBoardState.view);
        zRef.current = Math.max(20, ...persistedBoardState.notes.map((note) => Number(note.z) || 0));
        setSelectedMonster(bestiary[0] || null);
        setSelectedSpell(spells[0] || null);
        setSelectedItem(ITEM_LIBRARY[0] || null);
        setLibrariesRevision((revision) => revision + 1);
        setLibrariesReady(true);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setLibrariesError(error?.message || "Could not load DM libraries.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const editionOptions = useMemo(() => (
    [...new Set(bestiary.map(monsterEdition))].sort(compareText)
  ), [librariesRevision]);

  const crOptions = useMemo(() => (
    [...new Set(bestiary.map(formatCr))].sort((left, right) => crSortValue(left) - crSortValue(right) || compareText(left, right))
  ), [librariesRevision]);

  const filteredMonsters = useMemo(() => {
    const query = normalizeSearch(deferredSearchQuery);
    return filterMonsterIndex(MONSTER_SEARCH_INDEX, {
      query,
      editionFilter,
      crFilter,
      sortField,
      sortDirection
    }).map(({ monster }) => monster);
  }, [crFilter, deferredSearchQuery, editionFilter, librariesRevision, sortDirection, sortField]);

  const filteredResources = useMemo(() => {
    const kind = resourcePickerKind || "spell";
    const index = kind === "spell" ? SPELL_SEARCH_INDEX : ITEM_SEARCH_INDEX;
    const query = normalizeSearch(deferredResourceSearchQuery);
    return filterLibraryIndex(index, kind, {
      query,
      sortField: resourceSortField,
      sortDirection: resourceSortDirection
    }).map(({ entry }) => entry);
  }, [deferredResourceSearchQuery, librariesRevision, resourcePickerKind, resourceSortDirection, resourceSortField]);

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
  const filteredNpcTokens = useMemo(() => {
    const query = normalizeSearch(npcTokenSearchQuery);
    const tokens = Array.isArray(npcTokenLibrary) ? npcTokenLibrary : [];
    if (!query) return tokens;
    return tokens.filter((token) => normalizeSearch([
      token.name,
      token.fileName,
      token.source,
      token.relativePath
    ].join(" ")).includes(query));
  }, [npcTokenLibrary, npcTokenSearchQuery]);

  useEffect(() => {
    if (!librariesReady || !isPickerOpen) return;
    if (selectedMonster && filteredMonsters.includes(selectedMonster)) return;
    selectPickerMonster(filteredMonsters[0] || null);
  }, [filteredMonsters, isPickerOpen, librariesReady, selectedMonster]);

  useEffect(() => {
    if (!librariesReady || !resourcePickerKind) return;
    const selected = resourcePickerKind === "spell" ? selectedSpell : selectedItem;
    if (selected && filteredResources.includes(selected)) return;
    if (resourcePickerKind === "spell") setSelectedSpell(filteredResources[0] || null);
    else setSelectedItem(filteredResources[0] || null);
  }, [filteredResources, librariesReady, resourcePickerKind, selectedItem, selectedSpell]);

  useEffect(() => {
    if (!isNpcTokenPickerOpen) return;
    if (selectedNpcToken && filteredNpcTokens.some((token) => token.id === selectedNpcToken.id)) return;
    setSelectedNpcToken(filteredNpcTokens[0] || null);
  }, [filteredNpcTokens, isNpcTokenPickerOpen, selectedNpcToken]);

  useEffect(() => {
    librariesReadyRef.current = librariesReady;
  }, [librariesReady]);

  useEffect(() => {
    boardViewRef.current = boardView;
  }, [boardView]);

  useEffect(() => {
    selectedMapTokensRef.current = selectedMapTokens;
  }, [selectedMapTokens]);

  useEffect(() => {
    if (!contextMenu && !tokenContextMenu && !markerContextMenu) return undefined;
    function handleGlobalPointerDown(event) {
      if (event.target?.closest?.("[data-context-menu='true']")) return;
      setContextMenu(null);
      setTokenContextMenu(null);
      setMarkerContextMenu(null);
    }
    window.addEventListener("pointerdown", handleGlobalPointerDown, true);
    return () => window.removeEventListener("pointerdown", handleGlobalPointerDown, true);
  }, [contextMenu, tokenContextMenu, markerContextMenu]);

  useEffect(() => {
    handleBoardWheelRef.current = handleBoardWheel;
  });

  useEffect(() => {
    const boardRoot = boardRootRef.current;
    if (!boardRoot) return undefined;
    const handleNativeWheel = (event) => {
      handleBoardWheelRef.current?.(event);
    };
    boardRoot.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      boardRoot.removeEventListener("wheel", handleNativeWheel);
    };
  }, []);

  useEffect(() => {
    monsterNotesRef.current = monsterNotes;
  }, [monsterNotes]);

  useEffect(() => {
    savedBoardNotesRef.current = savedBoardNotes;
  }, [savedBoardNotes]);

  const visibleNotes = useMemo(
    () => monsterNotes.filter((note) => !note.parentNoteId),
    [monsterNotes]
  );
  const sharedVvtTarget = useMemo(() => {
    const maps = monsterNotes.filter((note) => note.kind === "map");
    if (!maps.length) return null;
    const explicitNote = sharedVvtMap?.noteId ? maps.find((note) => note.id === sharedVvtMap.noteId) : null;
    const note = explicitNote || maps.find((entry) => activeMapPageForNote(entry)?.mapImage) || maps[0];
    const pages = mapPagesForNote(note);
    const explicitPage = sharedVvtMap?.pageId ? pages.find((page) => page.id === sharedVvtMap.pageId) : null;
    const page = explicitPage || activeMapPageForNote(note) || pages[0] || null;
    return note && page ? { note, page } : null;
  }, [monsterNotes, sharedVvtMap]);
  const selectedRootNoteIdSet = useMemo(() => new Set(selectedRootNoteIds), [selectedRootNoteIds]);

  function flushBoardStateSave() {
    if (!librariesReadyRef.current) return;
    if (boardSaveTimerRef.current) {
      window.clearTimeout(boardSaveTimerRef.current);
      boardSaveTimerRef.current = null;
    }
    const pending = pendingBoardSaveRef.current;
    saveDmBoardState(pending.notes, pending.view, pending.savedNotes);
  }

  useEffect(() => {
    if (!librariesReady) return undefined;
    let cancelled = false;
    const sourceNotes = monsterNotesRef.current;
    hydrateStoredMapImagesInNotes(sourceNotes)
      .then((migratedNotes) => {
        if (cancelled || migratedNotes === sourceNotes) return;
        setMonsterNotes((currentNotes) => currentNotes === sourceNotes ? migratedNotes : currentNotes);
      })
      .catch((error) => console.error("Could not migrate stored DM map images", error));
    return () => {
      cancelled = true;
    };
  }, [librariesReady]);

  useEffect(() => {
    if (!librariesReady) return undefined;
    pendingBoardSaveRef.current = { notes: monsterNotes, view: boardView, savedNotes: savedBoardNotes };
    if (boardSaveTimerRef.current) window.clearTimeout(boardSaveTimerRef.current);
    boardSaveTimerRef.current = window.setTimeout(() => {
      boardSaveTimerRef.current = null;
      const pending = pendingBoardSaveRef.current;
      saveDmBoardState(pending.notes, pending.view, pending.savedNotes);
    }, DM_BOARD_SAVE_DEBOUNCE_MS);
    return () => {
      if (boardSaveTimerRef.current) {
        window.clearTimeout(boardSaveTimerRef.current);
        boardSaveTimerRef.current = null;
      }
    };
  }, [boardView, librariesReady, monsterNotes, savedBoardNotes]);

  useEffect(() => {
    const handleBeforeUnload = () => flushBoardStateSave();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushBoardStateSave();
    };
  }, []);

  useEffect(() => {
    const liveSheet = window.dndSheet?.liveSheet;
    if (!liveSheet?.publishVvtState) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        if (!sharedVvtTarget?.page?.mapImage) {
          if (publishedVvtTargetKeyRef.current) await liveSheet.publishVvtState({ active: false });
          publishedVvtTargetKeyRef.current = "";
          publishedVvtTokenImageKeysRef.current = new Map();
          return;
        }
        const { note, page } = sharedVvtTarget;
        const targetKey = [
          note.id,
          page.id,
          page.mapImage.assetId || page.mapImage.id || "inline",
          page.mapImage.updatedAt || "",
          page.mapImage.size || 0
        ].join("|");
        const publishFullState = publishedVvtTargetKeyRef.current !== targetKey || !liveSheet.publishVvtPatch;
        const previousTokenImageKeys = publishedVvtTokenImageKeysRef.current;
        const nextTokenImageKeys = new Map((page.mapTokens || []).map((token) => [token.id, mapTokenEmbeddedImageKey(token)]));
        const sourceViewport = mapShareViewportFromDom(note, page);
        const tokens = await mapTokensShareSnapshot(page.mapTokens, sourceViewport, {
          includeImage: (token) => publishFullState || previousTokenImageKeys.get(token.id) !== nextTokenImageKeys.get(token.id)
        });
        if (cancelled) return;
        const statePatch = {
          title: noteDisplayName(note),
          pageName: page.name || "",
          fogOfWar: mapFogSnapshot(page.fogOfWar),
          grid: mapGridShareSnapshot(page.mapGrid, sourceViewport),
          tokens,
          markers: mapMarkersShareSnapshot(page.mapMarkers, sourceViewport),
          sourceViewport: {
            width: Math.max(1, Number(sourceViewport.width) || NOTE_DEFAULT_WIDTH),
            height: Math.max(1, Number(sourceViewport.height) || NOTE_DEFAULT_HEIGHT)
          },
          updatedAt: new Date().toISOString()
        };
        let result = null;
        if (publishFullState) {
          const image = await mapImageShareSnapshot(page.mapImage);
          if (cancelled || !image?.dataUrl) return;
          result = await liveSheet.publishVvtState({ active: true, image, ...statePatch });
        } else {
          result = await liveSheet.publishVvtPatch(statePatch);
          if (!result?.ok) {
            const image = await mapImageShareSnapshot(page.mapImage);
            if (cancelled || !image?.dataUrl) return;
            result = await liveSheet.publishVvtState({ active: true, image, ...statePatch });
          }
        }
        if (!cancelled && result?.ok) {
          publishedVvtTargetKeyRef.current = targetKey;
          publishedVvtTokenImageKeysRef.current = nextTokenImageKeys;
        }
      } catch (error) {
        console.error(error);
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sharedVvtTarget?.note?.id, sharedVvtTarget?.note?.titleOverride, sharedVvtTarget?.page]);

  useEffect(() => {
    saveLivePlayersPanelCollapsed(livePlayersCollapsed);
  }, [livePlayersCollapsed]);

  useEffect(() => {
    saveSoundBarCollapsed(soundBarCollapsed);
  }, [soundBarCollapsed]);

  useEffect(() => {
    let cancelled = false;
    listSoundAssets()
      .then((sounds) => {
        if (!cancelled) setSoundButtons(sounds);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setSoundBarError(error?.message || "No se pudo cargar la libreria de sonidos.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!vvtPings.length) return undefined;
    const timer = window.setTimeout(() => {
      const now = Date.now();
      setVvtPings((pings) => pings.filter((ping) => ping.expiresAt > now));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [vvtPings]);

  useEffect(() => {
    setVvtPings([]);
  }, [sharedVvtTarget?.note?.id, sharedVvtTarget?.page?.id]);

  useEffect(() => {
    function activeNoteFromPasteTarget(target) {
      const targetElement = target instanceof Element ? target : null;
      const directNoteId = targetElement?.closest?.("[data-note-action-id]")?.dataset?.noteActionId || "";
      const notes = monsterNotesRef.current;
      if (directNoteId) return notes.find((note) => note.id === directNoteId) || null;
      const focusedRootId = focusedRootNoteIdRef.current;
      const rootNote = focusedRootId ? notes.find((note) => note.id === focusedRootId) : null;
      if (!rootNote) return null;
      const tabs = groupTabNotes(rootNote, notes);
      return tabs.find((note) => note.id === rootNote.activeTabId) || rootNote;
    }

    async function handleGlobalPaste(event) {
      const targetElement = event.target instanceof Element ? event.target : null;
      if (targetElement?.closest?.("[data-monster-picker='true'], [data-obsidian-picker='true'], [data-context-menu='true'], [data-character-code-modal='true'], [data-homebrew-monster-modal='true'], [data-board-control='true']")) return;
      if (isEditablePasteTarget(event.target)) return;

      const clipboardData = event.clipboardData;
      const imageFile = firstClipboardImageFile(clipboardData);
      if (imageFile) {
        event.preventDefault();
        try {
          const activeNote = activeNoteFromPasteTarget(event.target);
          if (activeNote?.kind === "text") {
            const image = await readImageFileAsStoredImage(imageFile);
            addTextNoteImage(activeNote.id, image);
          } else {
            const image = await readMapImageFileAsStoredImage(imageFile);
            if (activeNote?.kind === "map") updateMapNoteImage(activeNote.id, image);
            else addMapNote(null, image);
          }
        } catch (error) {
          console.error(error);
        }
        return;
      }

      const text = clipboardData?.getData("text/plain") || "";
      if (text.trim()) {
        event.preventDefault();
        addTextNote(null, text);
      }
    }

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
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
        if (typeof status?.tokenEnabled === "boolean") setLiveHostTokenEnabled(status.tokenEnabled);
      })
      .catch(console.error);
    liveSheet.getDiagnostics?.()
      .then((diagnostics) => {
        if (!disposed) setLiveDiagnostics(diagnostics);
      })
      .catch(console.error);
    liveSheet.getPlayers()
      .then((players) => {
        if (!disposed) {
          const nextPlayers = Array.isArray(players) ? players : [];
          setLivePlayers(nextPlayers);
          nextPlayers.forEach(syncLivePlayerCharacterNote);
        }
      })
      .catch(console.error);
    liveSheet.getRaisedHands?.()
      .then((hands) => {
        if (!disposed) setRaisedHands(normalizeRaisedHandQueue(hands));
      })
      .catch(console.error);

    const unsubscribeStatus = liveSheet.onServerStatus((status) => {
      setLiveServerStatus(status || { running: false, port: 8787, addresses: [], tailscaleAddresses: [], lanAddresses: [], playerCount: 0 });
      if (status?.port) setLiveHostPort(String(status.port));
      if (typeof status?.tokenEnabled === "boolean") setLiveHostTokenEnabled(status.tokenEnabled);
      if (status?.running) setLiveHostError("");
    });
    const unsubscribeUpdated = liveSheet.onPlayerUpdated((player) => {
      if (!player?.playerId) return;
      syncLivePlayerCharacterNote(player);
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
      setMonsterNotes((notes) => {
        const liveNote = notes.find((note) => note.livePlayerId === player.playerId);
        if (player.removed && liveNote) return closeSingleNoteInCollection(notes, liveNote.id);
        const nextNotes = notes.map((note) => (
          note.livePlayerId === player.playerId
            ? { ...note, liveConnected: false, liveLastUpdate: player.lastUpdate || note.liveLastUpdate || null }
            : note
        ));
        return liveNote ? persistLinkedTokenNotesInCollection(nextNotes, [liveNote.id]) : nextNotes;
      });
    });
    const unsubscribeRoll = liveSheet.onPlayerRoll?.((roll) => {
      if (!roll) return;
      appendLivePlayerRoll(roll);
    });
    const unsubscribeVvtPing = liveSheet.onVvtPing?.((ping) => {
      appendVvtPing(ping);
    });
    const unsubscribeHandQueue = liveSheet.onPlayerHandQueue?.((hands) => {
      setRaisedHands(normalizeRaisedHandQueue(hands));
    });

    return () => {
      disposed = true;
      unsubscribeStatus?.();
      unsubscribeUpdated?.();
      unsubscribeDisconnected?.();
      unsubscribeRoll?.();
      unsubscribeVvtPing?.();
      unsubscribeHandQueue?.();
    };
  }, []);

  function normalizeVvtPing(ping) {
    const expiresAt = Date.parse(ping?.expiresAt || "") || (Date.now() + VVT_PING_TTL_MS);
    return {
      id: String(ping?.id || `ping-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      playerId: String(ping?.playerId || ""),
      x: clamp(Number(ping?.x) || 0, 0, 1),
      y: clamp(Number(ping?.y) || 0, 0, 1),
      playerName: String(ping?.playerName || "Jugador").slice(0, 80),
      expiresAt
    };
  }

  function appendVvtPing(ping) {
    const normalized = normalizeVvtPing(ping);
    const now = Date.now();
    setVvtPings((pings) => [
      ...pings.filter((entry) => (
        entry.expiresAt > now
        && (
          normalized.playerId
            ? entry.playerId !== normalized.playerId
            : entry.id !== normalized.id
        )
      )),
      normalized
    ].slice(-16));
  }

  async function publishDmVvtPing(ping) {
    try {
      await window.dndSheet?.liveSheet?.publishVvtPing?.(ping);
    } catch (error) {
      console.error(error);
      appendVvtPing(ping);
    }
  }

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
    const result = await liveSheet.startServer({
      port: liveHostPort,
      tokenEnabled: liveHostTokenEnabled
    });
    if (!result?.ok) {
      setLiveHostError(result?.error || "Could not start the local host.");
      if (result?.status) setLiveServerStatus(result.status);
      return;
    }
    setLiveServerStatus(result.status);
    if (result.status?.port) setLiveHostPort(String(result.status.port));
    liveSheet.getDiagnostics?.().then(setLiveDiagnostics).catch(() => {});
  }

  async function stopLiveHost() {
    const liveSheet = window.dndSheet?.liveSheet;
    if (!liveSheet) return;
    const result = await liveSheet.stopServer();
    if (result?.status) setLiveServerStatus(result.status);
    liveSheet.getDiagnostics?.().then(setLiveDiagnostics).catch(() => {});
  }

  async function runLiveHostSelfTest() {
    const liveSheet = window.dndSheet?.liveSheet;
    if (!liveSheet?.runSelfTest) return;
    const result = await liveSheet.runSelfTest();
    if (result?.status) setLiveServerStatus(result.status);
  }

  async function kickLivePlayer(playerId) {
    const liveSheet = window.dndSheet?.liveSheet;
    if (!liveSheet) return;
    await liveSheet.kickPlayer(playerId);
  }

  async function lowerRaisedHand(playerId) {
    if (!playerId) return;
    setRaisedHands((hands) => normalizeRaisedHandQueue(hands).filter((hand) => hand.playerId !== playerId));
    try {
      const result = await window.dndSheet?.liveSheet?.lowerPlayerHand?.(playerId);
      if (result?.raisedHands) setRaisedHands(normalizeRaisedHandQueue(result.raisedHands));
    } catch (error) {
      console.error(error);
    }
  }

  async function refreshSoundButtons() {
    const sounds = await listSoundAssets();
    setSoundButtons(sounds);
    return sounds;
  }

  function pickSoundFiles() {
    setSoundBarError("");
    soundFileInputRef.current?.click?.();
  }

  async function addSoundFiles(event) {
    const files = Array.from(event.target?.files || []);
    if (event.target) event.target.value = "";
    if (!files.length) return;
    setSoundBarError("");
    setSoundBarBusyId("upload");
    try {
      const imported = [];
      for (const file of files) imported.push(await readAudioFileAsSoundAsset(file));
      setSoundButtons((sounds) => [...sounds, ...imported]
        .filter(Boolean)
        .sort((left, right) => String(left.name).localeCompare(String(right.name), undefined, { sensitivity: "base" })));
      setSoundBarCollapsed(false);
    } catch (error) {
      console.error(error);
      setSoundBarError(error?.message || "No se pudo subir el audio.");
      refreshSoundButtons().catch(console.error);
    } finally {
      setSoundBarBusyId("");
    }
  }

  async function renameSoundButton(soundId, name) {
    if (!soundId) return;
    setSoundBarError("");
    try {
      const renamed = await renameSoundAsset(soundId, name);
      setSoundButtons((sounds) => sounds
        .map((sound) => (sound.id === soundId ? renamed : sound))
        .filter(Boolean)
        .sort((left, right) => String(left.name).localeCompare(String(right.name), undefined, { sensitivity: "base" })));
    } catch (error) {
      console.error(error);
      setSoundBarError(error?.message || "No se pudo renombrar el audio.");
      refreshSoundButtons().catch(console.error);
    }
  }

  async function deleteSoundButton(soundId) {
    if (!soundId) return;
    setSoundBarError("");
    setSoundBarBusyId(soundId);
    try {
      await deleteSoundAsset(soundId);
      setSoundButtons((sounds) => sounds.filter((sound) => sound.id !== soundId));
    } catch (error) {
      console.error(error);
      setSoundBarError(error?.message || "No se pudo eliminar el audio.");
    } finally {
      setSoundBarBusyId("");
    }
  }

  function playLocalDmSound(record) {
    const blob = record?.blob;
    if (!blob) return;
    const soundId = String(record.id || "");
    const objectUrl = URL.createObjectURL(blob);
    try {
      const audio = new Audio(objectUrl);
      audio.volume = 1;
      audio.preload = "auto";
      const cleanup = () => {
        dmSoundAudioPlayersRef.current = dmSoundAudioPlayersRef.current.filter((entry) => entry !== audio);
        if (soundId && dmSoundAudioPlayersByIdRef.current.has(soundId)) {
          const entries = dmSoundAudioPlayersByIdRef.current.get(soundId);
          entries.delete(audio);
          if (!entries.size) {
            dmSoundAudioPlayersByIdRef.current.delete(soundId);
            setActiveSoundIds((ids) => ids.filter((id) => id !== soundId));
          }
        }
        URL.revokeObjectURL(objectUrl);
      };
      audio.addEventListener("ended", cleanup, { once: true });
      audio.addEventListener("error", cleanup, { once: true });
      dmSoundAudioPlayersRef.current = [...dmSoundAudioPlayersRef.current, audio];
      if (soundId) {
        if (!dmSoundAudioPlayersByIdRef.current.has(soundId)) dmSoundAudioPlayersByIdRef.current.set(soundId, new Set());
        dmSoundAudioPlayersByIdRef.current.get(soundId).add(audio);
        setActiveSoundIds((ids) => (ids.includes(soundId) ? ids : [...ids, soundId]));
      }
      while (dmSoundAudioPlayersRef.current.length > 8) {
        const staleAudio = dmSoundAudioPlayersRef.current.shift();
        try {
          staleAudio?.pause?.();
        } catch (_error) {
          // Ignore cleanup errors from stale audio elements.
        }
      }
      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise.catch((error) => {
          cleanup();
          console.error(error);
          setSoundBarError("No se pudo reproducir el audio en el DM screen.");
        });
      }
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      console.error(error);
      setSoundBarError("No se pudo reproducir el audio en el DM screen.");
    }
  }

  function pauseLocalDmSound(soundId) {
    const normalizedId = String(soundId || "");
    const targets = normalizedId
      ? [...(dmSoundAudioPlayersByIdRef.current.get(normalizedId) || [])]
      : [...dmSoundAudioPlayersRef.current];
    targets.forEach((audio) => {
      try {
        audio.pause();
      } catch (_error) {
        // Ignore pause errors from stale audio elements.
      }
    });
    if (normalizedId) setActiveSoundIds((ids) => ids.filter((id) => id !== normalizedId));
    else setActiveSoundIds([]);
  }

  async function pauseSoundButton(soundId) {
    if (!soundId) return;
    setSoundBarError("");
    pauseLocalDmSound(soundId);
    try {
      const result = await window.dndSheet?.liveSheet?.publishDmAudioControl?.({
        id: soundId,
        action: "pause",
        sentAt: new Date().toISOString()
      });
      if (result && !result.ok) throw new Error(result.error || "No se pudo pausar el audio.");
    } catch (error) {
      console.error(error);
      setSoundBarError(error?.message || "No se pudo pausar el audio.");
    }
  }

  async function playSoundButton(soundId) {
    if (!soundId) return;
    const liveSheet = window.dndSheet?.liveSheet;
    if (!liveSheet?.publishDmAudio) {
      setSoundBarError("Live sheet API unavailable in this renderer.");
      return;
    }
    setSoundBarError("");
    setSoundBarBusyId(soundId);
    try {
      const record = await getSoundAsset(soundId);
      if (!record?.blob) throw new Error("Audio no encontrado.");
      playLocalDmSound(record);
      const dataUrl = await blobToDataUrl(record.blob);
      const result = await liveSheet.publishDmAudio({
        id: record.id,
        name: record.name || record.fileName || "Audio",
        type: record.type || record.blob.type || "",
        dataUrl,
        volume: 1,
        playedAt: new Date().toISOString()
      });
      if (!result?.ok) throw new Error(result?.error || "No se pudo enviar el audio.");
    } catch (error) {
      console.error(error);
      setSoundBarError(error?.message || "No se pudo enviar el audio.");
    } finally {
      setSoundBarBusyId("");
    }
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
    if (!librariesReady) return;
    setNoteSpawnPoint(spawnPoint);
    setIsPickerOpen(true);
    setContextMenu(null);
    if (!selectedMonster && bestiary[0]) setSelectedMonster(bestiary[0]);
  }

  function openMonsterTokenPicker(target) {
    setPendingMapTokenTarget(target);
    openMonsterPicker(null);
  }

  async function openNpcTokenPicker(target) {
    setPendingMapTokenTarget(target);
    setNpcTokenSearchQuery("");
    setNpcTokenPickerError("");
    setIsNpcTokenPickerOpen(true);
    if (!npcTokenLibrary.length) {
      setNpcTokenPickerLoading(true);
      try {
        const tokens = await window.dndSheet?.listTokenLibrary?.();
        const list = Array.isArray(tokens) ? tokens : [];
        setNpcTokenLibrary(list);
        setSelectedNpcToken(list[0] || null);
      } catch (error) {
        setNpcTokenPickerError(error?.message || "Could not load the token list.");
      } finally {
        setNpcTokenPickerLoading(false);
      }
    }
  }

  function openResourcePicker(kind, spawnPoint = null, { search = "", selectedEntry = null } = {}) {
    if (!librariesReady) return;
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

  function addMonsterTokenToMap(monster, target) {
    if (!monster?.name || !target?.mapNoteId || !target.pageId) return false;
    setMonsterNotes((notes) => notes.map((note) => {
      if (note.id !== target.mapNoteId) return note;
      const page = mapPagesForNote(note).find((entry) => entry.id === target.pageId) || activeMapPageForNote(note);
      if (!page) return note;
      const size = clamp(Number(target.size) || MAP_TOKEN_SIZE, 32, 140);
      const point = clampMapTokenPoint(note, Number(target.x) || 0, Number(target.y) || 0, size, page.id);
      const token = normalizeMapToken({
        id: `map-token-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: "monster",
        name: monster.name || "Monster",
        monster: mapTokenMonsterSnapshot(monster),
        monsterCustom: monster.__homebrew ? cloneForBoardState(monster) : null,
        x: point.x,
        y: point.y,
        size,
        ...mapActorCombatState({ kind: "monster", monster })
      });
      if (!token) return note;
      return updateMapNotePage(note, page.id, (page) => ({
        ...page,
        mapTokens: [...(page.mapTokens || []), token]
      }));
    }));
    return true;
  }

  function genericNpcMonster(name = "NPC") {
    return {
      name,
      source: "NPC",
      size: ["M"],
      type: "humanoid",
      alignment: "Unaligned",
      ac: [10],
      hp: { average: 1, formula: "1d8" },
      speed: { walk: 30 },
      cr: "0",
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      trait: [],
      action: []
    };
  }

  async function addNpcTokenToMap(tokenEntry) {
    if (!tokenEntry?.id || !pendingMapTokenTarget) return;
    setNpcTokenPickerError("");
    try {
      const image = await window.dndSheet?.getTokenLibraryImage?.(tokenEntry.id);
      if (!image?.dataUrl) {
        setNpcTokenPickerError("Could not load the token image.");
        return;
      }
      const monster = genericNpcMonster(tokenEntry.name || "NPC");
      const target = pendingMapTokenTarget;
      setMonsterNotes((notes) => notes.map((note) => {
        if (note.id !== target.mapNoteId) return note;
        const page = mapPagesForNote(note).find((entry) => entry.id === target.pageId) || activeMapPageForNote(note);
        if (!page) return note;
        const size = clamp(Number(target.size) || MAP_TOKEN_SIZE, 32, 140);
        const point = clampMapTokenPoint(note, Number(target.x) || 0, Number(target.y) || 0, size, page.id);
        const mapToken = normalizeMapToken({
          id: `map-token-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          kind: "monster",
          name: tokenEntry.name || "NPC",
          monster: mapTokenMonsterSnapshot(monster),
          monsterCustom: monster,
          image,
          x: point.x,
          y: point.y,
          size,
          ...mapActorCombatState({ kind: "monster", monster, rollInitiative: false })
        });
        if (!mapToken) return note;
        return updateMapNotePage(note, page.id, (page) => ({
          ...page,
          mapTokens: [...(page.mapTokens || []), mapToken]
        }));
      }));
      setPendingMapTokenTarget(null);
      setIsNpcTokenPickerOpen(false);
    } catch (error) {
      setNpcTokenPickerError(error?.message || "Could not create the NPC token.");
    }
  }

  function addMonsterNote(monster) {
    if (pendingMapTokenTarget) {
      addMonsterTokenToMap(monster, pendingMapTokenTarget);
      setPendingMapTokenTarget(null);
      setIsPickerOpen(false);
      return;
    }
    addBoardNote({ kind: "monster", monster });
    setIsPickerOpen(false);
    setNoteSpawnPoint(null);
  }

  function boardCenterSpawnPoint(width, height) {
    const viewportPoint = {
      x: (window.innerWidth || 1200) / 2 - width / 2,
      y: (window.innerHeight || 800) / 2 - height / 2
    };
    return clampBoardPoint(screenToBoardPoint(viewportPoint.x, viewportPoint.y), width, height);
  }

  function addTextNote(positionOverride = null, textContent = "", textImages = []) {
    const width = 420;
    const height = textImages.length ? 460 : 320;
    addBoardNote({
      kind: "text",
      textTitle: "Text Note",
      textContent,
      textImages,
      width,
      height
    }, positionOverride || (textContent || textImages.length ? boardCenterSpawnPoint(width, height) : null));
    setContextMenu(null);
  }

  function addMapNote(positionOverride = null, mapImage = null) {
    const width = 760;
    const height = 520;
    const spawnPoint = positionOverride || boardCenterSpawnPoint(width, height);
    const pageId = `map-page-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    addBoardNote({
      kind: "map",
      titleOverride: "Mapa VVT",
      mapImage,
      mapTokens: [],
      mapTokenGroups: [],
      mapMarkers: [],
      mapGrid: normalizeMapGrid(null),
      fogOfWar: normalizeMapFog(null),
      mapPages: [{
        id: pageId,
        name: mapImage?.name || "Mapa 1",
        mapImage,
        mapTokens: [],
        mapTokenGroups: [],
        mapMarkers: [],
        mapGrid: normalizeMapGrid(null),
        fogOfWar: normalizeMapFog(null),
        frameWidth: width,
        frameHeight: height
      }],
      activeMapPageId: pageId,
      width,
      height
    }, spawnPoint);
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
    if (!librariesReady) return;
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

  function openSavedBoardNotes() {
    if (!contextMenu) return;
    setSavedBoardNotesSpawnPoint({ x: contextMenu.boardX, y: contextMenu.boardY });
    setIsSavedBoardNotesOpen(true);
    setContextMenu(null);
  }

  function closeSavedBoardNotes() {
    setIsSavedBoardNotesOpen(false);
    setSavedBoardNotesSpawnPoint(null);
  }

  function loadSavedBoardNote(savedNoteId) {
    const savedNote = savedBoardNotesRef.current.find((entry) => entry.id === savedNoteId);
    const restored = savedNote ? restoreStoredNote(savedNote.snapshot) : null;
    if (!restored) return;
    addBoardNote({
      kind: restored.kind,
      monster: restored.monster,
      monsterCustom: restored.monsterCustom,
      monsterTextNotes: restored.monsterTextNotes,
      monsterActiveTabId: restored.monsterActiveTabId,
      character: restored.character,
      entry: restored.entry,
      entryCustom: restored.entryCustom,
      textTitle: restored.textTitle,
      textContent: restored.textContent,
      textImages: restored.textImages,
      titleOverride: restored.titleOverride,
      width: restored.width,
      height: restored.height,
      tabFrameWidth: restored.tabFrameWidth,
      tabFrameHeight: restored.tabFrameHeight,
      hpCurrent: restored.hpCurrent,
      hpMax: restored.hpMax
    }, savedBoardNotesSpawnPoint);
    closeSavedBoardNotes();
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
      setCharacterCodeError("Paste a code before continuing.");
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
      setCharacterCodeError(error?.message || "Could not read the character code.");
    }
  }

  function syncLivePlayerCharacterNote(player) {
    if (!player?.playerId || !player?.lastUpdate || !player?.data || !Object.keys(player.data).length) return;
    let character = null;
    try {
      character = characterFromSheetData(player.data);
    } catch (error) {
      console.error(error);
      return;
    }
    if (!character) return;

    setMonsterNotes((notes) => {
      const existing = notes.find((note) => note.livePlayerId === player.playerId);
      const characterHp = character.hpMax || character.hpCurrent || "";
      if (existing) {
        const nextNotes = notes.map((note) => (
          note.id === existing.id
            ? {
              ...note,
              character,
              liveSheetData: player.data || note.liveSheetData || {},
              livePlayerName: player.playerName || note.livePlayerName || "",
              liveConnected: Boolean(player.connected),
              liveLastUpdate: player.lastUpdate || note.liveLastUpdate || null,
              hpCurrent: character.hpCurrent ?? note.hpCurrent,
              hpMax: characterHp || note.hpMax
            }
            : note
        ));
        return persistLinkedTokenNotesInCollection(nextNotes, [existing.id]);
      }

      const liveIndex = notes.filter((note) => note.livePlayerId).length;
      const width = 520;
      const height = 680;
      zRef.current += 1;
      const nextZ = zRef.current;
      const spawnPoint = clampBoardPoint({
        x: 120 + (liveIndex % 4) * 34,
        y: 120 + (liveIndex % 4) * 30
      }, width, height);
      return [
        ...notes,
        {
          id: `live-character-${player.playerId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          kind: "character",
          character,
          monster: null,
          monsterCustom: null,
          entry: null,
          entryCustom: null,
          textTitle: "",
          textContent: "",
          obsidian: null,
          obsidianMarkdown: "",
          obsidianLoading: false,
          obsidianError: "",
          obsidianEditing: false,
          obsidianDraft: "",
          obsidianSaving: false,
          obsidianUpdatedAt: null,
          titleOverride: "",
          parentNoteId: null,
          tabNoteIds: [],
          activeTabId: null,
          x: spawnPoint.x,
          y: spawnPoint.y,
          width,
          height,
          z: nextZ,
          rolls: [],
          dicePanelOpen: false,
          minimized: false,
          hpCurrent: character.hpCurrent,
          hpMax: characterHp,
          livePlayerId: player.playerId,
          liveSheetData: player.data || {},
          livePlayerName: player.playerName || "",
          liveConnected: Boolean(player.connected),
          liveLastUpdate: player.lastUpdate || null
        }
      ];
    });
  }

  function appendLivePlayerRoll(roll) {
    if (!roll?.playerId) return;
    const label = sanitizeDisplayText(roll.title, "Tirada");
    const result = sanitizeDisplayText(roll.result, "--");
    const detail = sanitizeDisplayText(roll.detail, "");
    setMonsterNotes((notes) => notes.map((note) => {
      if (note.livePlayerId !== roll.playerId) return note;
      return {
        ...note,
        dicePanelOpen: true,
        liveConnected: true,
        rolls: [{
          id: `${roll.receivedAt || Date.now()}-${roll.playerId}-${Math.random().toString(16).slice(2)}`,
          label,
          roll: {
            expression: label,
            total: result,
            detail: detail || result
          }
        }, ...(note.rolls || [])].slice(0, 20)
      };
    }));
  }

  function normalizeLiveSheetPatch(patch) {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) return {};
    return Object.fromEntries(Object.entries(patch)
      .map(([key, value]) => [String(key || "").trim(), value == null ? "" : String(value)])
      .filter(([key]) => key && key !== "__proto__" && key !== "constructor" && key !== "prototype"));
  }

  function applyLivePatchToNote(note, patch) {
    const liveSheetData = {
      ...(note.liveSheetData || note.character?.rawData || {}),
      ...patch
    };
    const character = characterFromSheetData(liveSheetData);
    const characterHp = character.hpMax || character.hpCurrent || "";
    return {
      ...note,
      character,
      liveSheetData,
      livePlayerName: liveSheetData.PlayerName || note.livePlayerName || "",
      hpCurrent: character.hpCurrent,
      hpMax: characterHp
    };
  }

  function updateLiveCharacterField(noteId, fieldKey, value) {
    const patch = normalizeLiveSheetPatch({ [fieldKey]: value });
    if (!Object.keys(patch).length) return false;
    const note = monsterNotesRef.current.find((entry) => entry.id === noteId);
    if (!note?.livePlayerId || note.liveConnected === false) return false;

    setMonsterNotes((notes) => {
      const nextNotes = notes.map((entry) => (
        entry.id === noteId ? applyLivePatchToNote(entry, patch) : entry
      ));
      return persistLinkedTokenNotesInCollection(nextNotes, [noteId]);
    });

    const liveSheet = window.dndSheet?.liveSheet;
    if (!liveSheet?.updatePlayerSheet) return true;
    liveSheet.updatePlayerSheet(note.livePlayerId, patch).catch((error) => {
      console.error(error);
    });
    return true;
  }

  function addBoardNote(payload, positionOverride = null) {
    zRef.current += 1;
    const offset = monsterNotes.length % 6;
    const defaultWidth = payload.kind === "monster" ? MONSTER_NOTE_DEFAULT_WIDTH : NOTE_DEFAULT_WIDTH;
    const width = clamp(payload.width || defaultWidth, NOTE_MIN_WIDTH, BOARD_WIDTH - BOARD_PADDING * 2);
    const height = clamp(payload.height || NOTE_DEFAULT_HEIGHT, NOTE_MIN_HEIGHT, BOARD_HEIGHT - BOARD_PADDING * 2);
    const spawnX = positionOverride?.x ?? noteSpawnPoint?.x ?? (96 + offset * 34);
    const spawnY = positionOverride?.y ?? noteSpawnPoint?.y ?? (96 + offset * 28);
    const spawnPoint = clampBoardPoint({ x: spawnX, y: spawnY }, width, height);
    const monster = payload.monster || null;
    const character = payload.character || null;
    const obsidian = payload.obsidian || null;
    const mapImage = payload.mapImage ? mapImageRuntimeSnapshot(payload.mapImage) : null;
    const mapTokens = Array.isArray(payload.mapTokens) ? payload.mapTokens.map(mapTokenSnapshot).filter(Boolean) : [];
    const mapTokenGroups = mapTokenGroupsSnapshot(payload.mapTokenGroups);
    const mapMarkers = mapMarkersSnapshot(payload.mapMarkers);
    const mapGrid = payload.kind === "map" ? mapGridSnapshot(payload.mapGrid) : null;
    const fogOfWar = payload.kind === "map" ? mapFogSnapshot(payload.fogOfWar) : null;
    const noteId = `${payload.kind}-${(monster || payload.entry || character)?.name || obsidian?.relativePath || mapImage?.name || "note"}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const monsterTextNotes = payload.kind === "monster" ? normalizeMonsterTextNotes(payload.monsterTextNotes) : [];
    const monsterActiveTabId = payload.kind === "monster"
      ? (payload.monsterActiveTabId === "stats" || monsterTextNotes.some((entry) => entry.id === payload.monsterActiveTabId) ? String(payload.monsterActiveTabId || "stats") : "stats")
      : "stats";
    const mapPages = payload.kind === "map"
      ? (Array.isArray(payload.mapPages) && payload.mapPages.length
        ? payload.mapPages.map((page, index) => normalizeMapPage(page, page.id || `${defaultMapPageId(noteId)}-${index + 1}`, index))
        : [normalizeMapPage({
          id: payload.activeMapPageId || defaultMapPageId(noteId),
          name: mapImage?.name || "Mapa 1",
          mapImage,
          mapTokens,
          mapTokenGroups,
          mapMarkers,
          mapGrid,
          fogOfWar,
          frameWidth: width,
          frameHeight: height
        }, payload.activeMapPageId || defaultMapPageId(noteId), 0)])
      : [];
    const activeMapPage = mapPages.find((page) => page.id === payload.activeMapPageId) || mapPages[0] || null;
    const hpAverage = monster?.hp?.average ?? "";
    const characterHp = character?.hpMax || character?.hpCurrent || "";
    setMonsterNotes((notes) => [
      ...notes,
      {
        id: noteId,
        kind: payload.kind,
        monster,
        monsterCustom: payload.monsterCustom || null,
        monsterTextNotes,
        monsterActiveTabId,
        character,
        entry: payload.entry || null,
        entryCustom: payload.entryCustom || null,
        textTitle: payload.textTitle || "",
        textContent: payload.textContent || "",
        textImages: Array.isArray(payload.textImages) ? payload.textImages.map(storedImageSnapshot).filter(Boolean) : [],
        mapImage: activeMapPage?.mapImage || mapImage,
        mapTokens: activeMapPage?.mapTokens || mapTokens,
        mapTokenGroups: activeMapPage?.mapTokenGroups || mapTokenGroups,
        mapMarkers: activeMapPage?.mapMarkers || mapMarkers,
        mapGrid: activeMapPage?.mapGrid || mapGrid,
        fogOfWar: activeMapPage?.fogOfWar || fogOfWar,
        mapPages,
        activeMapPageId: activeMapPage?.id || null,
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
        linkedMapToken: normalizeLinkedMapTokenLink(payload.linkedMapToken),
        tokenInitiative: payload.tokenInitiative ?? "",
        tabFrameWidth: payload.tabFrameWidth ?? width,
        tabFrameHeight: payload.tabFrameHeight ?? height,
        x: spawnPoint.x,
        y: spawnPoint.y,
        width,
        height,
        z: zRef.current,
        rolls: [],
        dicePanelOpen: false,
        minimized: false,
        hpCurrent: payload.hpCurrent ?? character?.hpCurrent ?? hpAverage,
        hpMax: payload.hpMax ?? characterHp ?? hpAverage,
        livePlayerId: payload.kind === "character" ? String(payload.livePlayerId || "") : "",
        liveSheetData: payload.kind === "character" && payload.liveSheetData ? cloneForBoardState(payload.liveSheetData) : null,
        livePlayerName: payload.kind === "character" ? String(payload.livePlayerName || "") : "",
        liveConnected: payload.kind === "character" && payload.livePlayerId ? payload.liveConnected !== false : Boolean(payload.liveConnected),
        liveLastUpdate: payload.kind === "character" ? (payload.liveLastUpdate || null) : null
      }
    ]);
  }

  function duplicateNote(noteId) {
    const source = monsterNotes.find((note) => note.id === noteId);
    if (!source) return;
    const copiedMonsterTextNotes = normalizeMonsterTextNotes(source.monsterTextNotes).map((entry, index) => ({
      ...entry,
      id: `monster-text-note-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`
    }));
    const sourceMonsterTextNotes = normalizeMonsterTextNotes(source.monsterTextNotes);
    const activeMonsterTextIndex = sourceMonsterTextNotes.findIndex((entry) => entry.id === source.monsterActiveTabId);
    addBoardNote({
      kind: source.kind,
      monster: source.monster,
      monsterCustom: source.monsterCustom,
      monsterTextNotes: copiedMonsterTextNotes,
      monsterActiveTabId: activeMonsterTextIndex >= 0 ? copiedMonsterTextNotes[activeMonsterTextIndex]?.id : "stats",
      character: source.character,
      entry: source.entry,
      entryCustom: source.entryCustom,
      textTitle: source.textTitle,
      textContent: source.textContent,
      textImages: Array.isArray(source.textImages) ? source.textImages.map((image) => ({ ...image })) : [],
      mapImage: source.mapImage ? mapImageWithoutObjectUrl(source.mapImage) : null,
      mapTokens: Array.isArray(source.mapTokens)
        ? source.mapTokens.map((token) => ({
          ...token,
          id: `map-token-${Date.now()}-${Math.random().toString(16).slice(2)}`
        }))
        : [],
      mapTokenGroups: mapTokenGroupsSnapshot(source.mapTokenGroups),
      mapMarkers: mapMarkersSnapshot(source.mapMarkers).map((marker) => ({
        ...marker,
        id: `map-marker-${Date.now()}-${Math.random().toString(16).slice(2)}`
      })),
      mapGrid: source.mapGrid ? { ...source.mapGrid } : null,
      fogOfWar: source.fogOfWar ? { ...source.fogOfWar, revealed: [...(source.fogOfWar.revealed || [])] } : null,
      mapPages: mapPagesForNote(source).map((page) => ({
        ...page,
        mapImage: page.mapImage ? mapImageWithoutObjectUrl(page.mapImage) : null,
        mapTokens: (page.mapTokens || []).map((token) => ({
          ...token,
          id: `map-token-${Date.now()}-${Math.random().toString(16).slice(2)}`
        })),
        mapTokenGroups: mapTokenGroupsSnapshot(page.mapTokenGroups),
        mapMarkers: mapMarkersSnapshot(page.mapMarkers).map((marker) => ({
          ...marker,
          id: `map-marker-${Date.now()}-${Math.random().toString(16).slice(2)}`
        })),
        mapGrid: page.mapGrid ? { ...page.mapGrid } : null,
        fogOfWar: page.fogOfWar ? { ...page.fogOfWar, revealed: [...(page.fogOfWar.revealed || [])] } : null
      })),
      activeMapPageId: source.activeMapPageId,
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
      tabFrameWidth: source.tabFrameWidth ?? source.width,
      tabFrameHeight: source.tabFrameHeight ?? source.height,
      hpCurrent: source.hpCurrent,
      hpMax: source.hpMax
    }, { x: source.x + 28, y: source.y + 28 });
  }

  function updateTextNote(noteId, textContent) {
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? { ...note, textContent } : note
    )));
  }

  function addTextNoteImage(noteId, image) {
    const storedImage = storedImageSnapshot(image);
    if (!storedImage) return;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? { ...note, textImages: [...(note.textImages || []), storedImage] } : note
    )));
  }

  function removeTextNoteImage(noteId, imageId) {
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? { ...note, textImages: (note.textImages || []).filter((image) => image.id !== imageId) } : note
    )));
  }

  function addMapPage(noteId, mapImage = null) {
    const pageId = `map-page-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setMonsterNotes((notes) => notes.map((note) => {
      if (note.id !== noteId) return note;
      const pages = mapPagesForNote(note);
      const firstPage = pages[0];
      const shouldReplaceEmptyPage = pages.length === 1 && !firstPage.mapImage && !(firstPage.mapTokens || []).length;
      const nextPage = normalizeMapPage({
        id: shouldReplaceEmptyPage ? firstPage.id : pageId,
        name: mapImage?.name || (shouldReplaceEmptyPage ? firstPage.name : `Mapa ${pages.length + 1}`),
        mapImage: mapImage ? mapImageRuntimeSnapshot(mapImage) : null,
        mapTokens: shouldReplaceEmptyPage ? firstPage.mapTokens : [],
        mapMarkers: shouldReplaceEmptyPage ? firstPage.mapMarkers : [],
        mapGrid: shouldReplaceEmptyPage ? firstPage.mapGrid : normalizeMapGrid(null),
        fogOfWar: shouldReplaceEmptyPage ? firstPage.fogOfWar : normalizeMapFog(null),
        frameWidth: shouldReplaceEmptyPage ? (firstPage.frameWidth || note.width) : note.width,
        frameHeight: shouldReplaceEmptyPage ? (firstPage.frameHeight || note.height) : note.height
      }, shouldReplaceEmptyPage ? firstPage.id : pageId, shouldReplaceEmptyPage ? 0 : pages.length);
      return syncMapNoteActivePage(note, shouldReplaceEmptyPage ? [nextPage] : [
        ...pages,
        nextPage
      ], nextPage.id);
    }));
  }

  function selectMapPage(noteId, pageId) {
    setMonsterNotes((notes) => {
      let nextMapNote = null;
      const nextNotes = notes.map((note) => {
        if (note.id !== noteId) return note;
        const pages = mapPagesForNote(note);
        const activeId = note.activeMapPageId || activeMapPageForNote(note)?.id;
        const pagesWithCurrentSize = pages.map((page) => (
          page.id === activeId
            ? { ...page, frameWidth: note.width, frameHeight: note.height }
            : page
        ));
        nextMapNote = syncMapNoteActivePage(note, pagesWithCurrentSize, pageId);
        return nextMapNote;
      });
      if (!nextMapNote) return nextNotes;
      const rootId = resolveRootNoteId(noteId, nextNotes);
      if (!rootId || rootId === noteId) return nextNotes;
      return nextNotes.map((note) => (
        note.id === rootId && (note.activeTabId || note.id) === noteId
          ? {
            ...note,
            width: nextMapNote.width,
            height: nextMapNote.height
          }
          : note
      ));
    });
  }

  function renameMapPage(noteId, pageId, name) {
    const normalizedName = String(name || "").trim();
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        name: normalizedName || page.name
      })) : note
    )));
  }

  function closeMapPage(noteId, pageId) {
    setMonsterNotes((notes) => notes.map((note) => {
      if (note.id !== noteId) return note;
      const pages = mapPagesForNote(note);
      if (pages.length <= 1) return note;
      const pageToClose = pages.find((page) => page.id === pageId);
      if (mapPageHasTokens(pageToClose)) return note;
      releaseMapImageObjectUrl(pageToClose?.mapImage);
      const nextPages = pages.filter((page) => page.id !== pageId);
      const nextActiveId = note.activeMapPageId === pageId ? nextPages[0]?.id : note.activeMapPageId;
      return syncMapNoteActivePage(note, nextPages, nextActiveId);
    }));
  }

  function updateMapNoteImage(noteId, mapImage, pageId = null) {
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        name: page.name || mapImage?.name || "Mapa 1",
        mapImage: (() => {
          const nextImage = mapImageRuntimeSnapshot(mapImage);
          if (page.mapImage?.objectUrl && page.mapImage.objectUrl !== nextImage?.objectUrl) releaseMapImageObjectUrl(page.mapImage);
          return nextImage;
        })()
      })) : note
    )));
  }

  function updateMapGrid(noteId, mapGrid, pageId = null) {
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        mapGrid: mapGridSnapshot(mapGrid)
      })) : note
    )));
  }

  function updateMapFog(noteId, pageId, fogOfWar) {
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        fogOfWar: mapFogSnapshot(fogOfWar)
      })) : note
    )));
  }

  function addMapMarker(target) {
    if (!target?.mapNoteId || !target.pageId) return;
    setMonsterNotes((notes) => notes.map((note) => {
      if (note.id !== target.mapNoteId) return note;
      const metrics = mapBodyMetrics(note);
      const markerCount = mapPagesForNote(note).reduce((count, page) => count + (page.mapMarkers || []).length, 0);
      const isShape = target.markerType === "shape" || target.formType;
      const formType = isShape ? normalizeMapMarkerFormType(target.formType) : null;
      const width = MAP_MARKER_SHAPE_DEFAULT_SIZE;
      const height = MAP_MARKER_SHAPE_DEFAULT_SIZE;
      const x = isShape ? Number(target.x) - width / 2 : Number(target.x);
      const y = isShape ? Number(target.y) - height / 2 : Number(target.y);
      const marker = normalizeMapMarker({
        id: `map-marker-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        markerType: isShape ? "shape" : "pin",
        formType,
        label: isShape ? `${MAP_MARKER_FORM_LABELS[formType]} ${markerCount + 1}` : `Marker ${markerCount + 1}`,
        x: clamp(Number(x) || 0, 0, Math.max(1, metrics.width - (isShape ? width : 0))),
        y: clamp(Number(y) || 0, 0, Math.max(1, metrics.height - (isShape ? height : 0))),
        width,
        height,
        icon: normalizeMapMarkerIcon(target.icon),
        color: MAP_MARKER_COLOR_OPTIONS[0].value
      }, markerCount);
      return updateMapNotePage(note, target.pageId, (page) => ({
        ...page,
        mapMarkers: [...(page.mapMarkers || []), marker]
      }));
    }));
  }

  function renameMapMarker(noteId, pageId, markerId, label) {
    const normalizedLabel = String(label || "").trim();
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        mapMarkers: (page.mapMarkers || []).map((marker) => (
          marker.id === markerId
            ? { ...marker, label: normalizedLabel || marker.label || "Marker" }
            : marker
        ))
      })) : note
    )));
  }

  function clampMapMarkerPoint(mapNote, x, y, marker = null) {
    const metrics = mapBodyMetrics(mapNote);
    const width = marker?.markerType === "shape" ? clamp(Number(marker.width) || MAP_MARKER_SHAPE_DEFAULT_SIZE, MAP_MARKER_SHAPE_MIN_SIZE, 2000) : 0;
    const height = marker?.markerType === "shape" ? clamp(Number(marker.height) || MAP_MARKER_SHAPE_DEFAULT_SIZE, MAP_MARKER_SHAPE_MIN_SIZE, 2000) : 0;
    return {
      x: clamp(Number(x) || 0, 0, Math.max(0, metrics.width - width)),
      y: clamp(Number(y) || 0, 0, Math.max(0, metrics.height - height))
    };
  }

  function activeNoteForRoot(noteId, notes = monsterNotesRef.current) {
    const rootId = resolveRootNoteId(noteId, notes) || noteId;
    const root = notes.find((note) => note.id === rootId);
    if (!root) return notes.find((note) => note.id === noteId) || null;
    const tabs = groupTabNotes(root, notes);
    return tabs.find((note) => note.id === root.activeTabId) || root;
  }

  function findMapBodyElement(mapNoteId) {
    return Array.from(document.querySelectorAll("[data-map-body-note-id]"))
      .find((element) => element.dataset.mapBodyNoteId === mapNoteId) || null;
  }

  function findMapOverlayElement(mapNoteId, pageId, dataKey, entryId) {
    const body = findMapBodyElement(mapNoteId);
    if (!body) return null;
    return Array.from(body.querySelectorAll(`[data-${dataKey}]`)).find((element) => (
      element.dataset.pageId === String(pageId || "")
      && element.dataset[dataKey.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())] === String(entryId || "")
    )) || null;
  }

  function setMapOverlayPreviewPosition(mapNoteId, pageId, dataKey, entryId, point) {
    const body = findMapBodyElement(mapNoteId);
    const element = findMapOverlayElement(mapNoteId, pageId, dataKey, entryId);
    if (!body || !element) return;
    const baseLeft = Number(body.dataset.mapBaseLeft) || 0;
    const baseTop = Number(body.dataset.mapBaseTop) || 0;
    const baseWidth = Number(body.dataset.mapBaseWidth) || 0;
    const baseHeight = Number(body.dataset.mapBaseHeight) || 0;
    const viewWidth = Number(body.dataset.mapViewWidth) || 0;
    const viewHeight = Number(body.dataset.mapViewHeight) || 0;
    const x = baseWidth > 0 && viewWidth > 0 ? ((Number(point.x) - baseLeft) / baseWidth) * viewWidth : Number(point.x) || 0;
    const y = baseHeight > 0 && viewHeight > 0 ? ((Number(point.y) - baseTop) / baseHeight) * viewHeight : Number(point.y) || 0;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  }

  function mapBodyMetrics(mapNote) {
    const scale = boardViewRef.current.scale || 1;
    const body = findMapBodyElement(mapNote.id);
    if (body) {
      const rect = body.getBoundingClientRect();
      const dataset = body.dataset || {};
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width / scale,
        height: rect.height / scale,
        scale,
        mapViewScale: Number(dataset.mapViewScale) || 1,
        baseLeft: Number(dataset.mapBaseLeft) || 0,
        baseTop: Number(dataset.mapBaseTop) || 0,
        baseWidth: Number(dataset.mapBaseWidth) || 0,
        baseHeight: Number(dataset.mapBaseHeight) || 0,
        viewLeft: Number(dataset.mapViewLeft) || 0,
        viewTop: Number(dataset.mapViewTop) || 0,
        viewWidth: Number(dataset.mapViewWidth) || 0,
        viewHeight: Number(dataset.mapViewHeight) || 0
      };
    }
    return {
      left: null,
      top: null,
      width: Math.max(1, Number(mapNote.width) || NOTE_DEFAULT_WIDTH),
      height: Math.max(1, (Number(mapNote.height) || NOTE_DEFAULT_HEIGHT) - 88),
      scale,
      mapViewScale: 1
    };
  }

  function mapVisualPointToBase(metrics, localX, localY) {
    if (!metrics?.baseWidth || !metrics?.baseHeight || !metrics?.viewWidth || !metrics?.viewHeight) {
      return { x: localX, y: localY };
    }
    return {
      x: metrics.baseLeft + ((localX - metrics.viewLeft) / metrics.viewWidth) * metrics.baseWidth,
      y: metrics.baseTop + ((localY - metrics.viewTop) / metrics.viewHeight) * metrics.baseHeight
    };
  }

  function snapMapTokenPoint(mapNote, x, y, pageId = null) {
    const page = pageId ? mapPagesForNote(mapNote).find((entry) => entry.id === pageId) : activeMapPageForNote(mapNote);
    const grid = normalizeMapGrid(page?.mapGrid || mapNote.mapGrid);
    if (!grid.enabled || !grid.snap) return { x, y };
    return {
      x: grid.offsetX + Math.round((x - grid.offsetX) / grid.cellWidth) * grid.cellWidth,
      y: grid.offsetY + Math.round((y - grid.offsetY) / grid.cellHeight) * grid.cellHeight
    };
  }

  function clampMapTokenPoint(mapNote, x, y, size = MAP_TOKEN_SIZE, pageId = null) {
    const metrics = mapBodyMetrics(mapNote);
    const snapped = snapMapTokenPoint(mapNote, x, y, pageId);
    return {
      x: clamp(snapped.x, 0, Math.max(0, metrics.width - size)),
      y: clamp(snapped.y, 0, Math.max(0, metrics.height - size))
    };
  }

  function addActorTokenToMap(sourceRootId, targetRootId, clientX, clientY) {
    const notes = monsterNotesRef.current;
    const sourceNote = activeNoteForRoot(sourceRootId, notes);
    const mapNote = activeNoteForRoot(targetRootId, notes);
    const kind = sourceNote?.kind === "character" ? "character" : sourceNote?.kind === "monster" ? "monster" : "";
    if (!kind || mapNote?.kind !== "map") return false;
    const page = activeMapPageForNote(mapNote);
    if (!page) return false;

    const size = MAP_TOKEN_SIZE;
    const metrics = mapBodyMetrics(mapNote);
    const boardPoint = screenToBoardPoint(clientX, clientY);
    const localX = metrics.left == null ? boardPoint.x - mapNote.x : (clientX - metrics.left) / metrics.scale;
    const localY = metrics.top == null ? boardPoint.y - mapNote.y - 88 : (clientY - metrics.top) / metrics.scale;
    const basePoint = mapVisualPointToBase(metrics, localX, localY);
    const point = clampMapTokenPoint(mapNote, basePoint.x - size / 2, basePoint.y - size / 2, size, page.id);
    const monster = kind === "monster" ? mapTokenMonsterSnapshot(sourceNote.monster) : null;
    const character = kind === "character" ? mapTokenCharacterSnapshot(sourceNote.character) : null;
    const actorNote = tokenActorNoteSnapshot(sourceNote);
    const tokenImage = kind === "monster" ? normalizeMapTokenImage(sourceNote.monsterCustom?.tokenImage || sourceNote.monster?.tokenImage) : null;
    if (kind === "monster" && !monster) return false;
    if (kind === "character" && !character) return false;
    if (!actorNote) return false;
    const tokenId = `map-token-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const token = {
      id: tokenId,
      kind,
      name: noteDisplayName(sourceNote),
      monster,
      monsterCustom: kind === "monster" && sourceNote.monsterCustom ? cloneForBoardState(sourceNote.monsterCustom) : null,
      character,
      livePlayerId: kind === "character" ? String(sourceNote.livePlayerId || "") : "",
      livePlayerName: kind === "character" ? String(sourceNote.livePlayerName || "") : "",
      liveSheetData: kind === "character" && sourceNote.liveSheetData ? cloneForBoardState(sourceNote.liveSheetData) : null,
      liveConnected: kind === "character" ? Boolean(sourceNote.liveConnected) : false,
      liveLastUpdate: kind === "character" ? (sourceNote.liveLastUpdate || null) : null,
      image: tokenImage,
      x: point.x,
      y: point.y,
      size,
      actorNote,
      ...mapActorCombatState({
        kind,
        monster: kind === "monster" ? sourceNote.monster : null,
        character: kind === "character" ? sourceNote.character : null,
        hpCurrent: sourceNote.hpCurrent,
        hpMax: sourceNote.hpMax
      })
    };
    const link = {
      mapNoteId: mapNote.id,
      pageId: page.id,
      tokenId
    };

    setMonsterNotes((notes) => notes.map((note) => {
      if (note.id === mapNote.id) {
        return updateMapNotePage(note, page.id, (page) => ({
          ...page,
          mapTokens: [...(page.mapTokens || []), token]
        }));
      }
      if (kind === "character" && note.id === sourceNote.id) {
        return { ...note, linkedMapToken: link };
      }
      return note;
    }));
    return true;
  }

  function findMapDropTargetAtPointer(sourceRootId, clientX, clientY) {
    const notes = monsterNotesRef.current;
    const targetRootId = findDragDropTarget(sourceRootId, screenToBoardPoint(clientX, clientY), notes);
    const targetNote = targetRootId ? activeNoteForRoot(targetRootId, notes) : null;
    return targetNote?.kind === "map" ? targetRootId : null;
  }

  function restoreDraggedNotesToStart(completedDrag) {
    const startPositions = completedDrag?.startPositions || {};
    const ids = Array.isArray(completedDrag?.noteIds) && completedDrag.noteIds.length ? completedDrag.noteIds : [completedDrag?.noteId];
    setMonsterNotes((notes) => notes.map((note) => {
      const start = startPositions[note.id];
      return start && ids.includes(note.id) ? { ...note, x: start.x, y: start.y } : note;
    }));
  }

  function setMapTokenSelection(mapNoteId, pageId, tokenIds) {
    const ids = Array.from(new Set((tokenIds || []).filter(Boolean)));
    setSelectedMapTokens({ mapNoteId: ids.length ? mapNoteId : "", pageId: ids.length ? pageId : "", tokenIds: ids });
  }

  function attachMapMarkerToToken(mapNoteId, pageId, markerId, tokenId) {
    if (!mapNoteId || !pageId || !markerId || !tokenId) return false;
    let didAttach = false;
    setMonsterNotes((notes) => notes.map((note) => {
      if (note.id !== mapNoteId || note.kind !== "map") return note;
      return updateMapNotePage(note, pageId, (page) => {
        const marker = (page.mapMarkers || []).find((entry) => entry.id === markerId);
        const token = (page.mapTokens || []).find((entry) => entry.id === tokenId);
        if (!marker || marker.markerType !== "shape" || !token) return page;
        didAttach = true;
        return {
          ...page,
          mapMarkers: (page.mapMarkers || []).map((entry) => {
            if (entry.id === markerId) return { ...entry, attachedTokenId: tokenId };
            if (entry.attachedTokenId === tokenId || entry.id === token.attachedMarkerId) return { ...entry, attachedTokenId: "" };
            return entry;
          }),
          mapTokens: (page.mapTokens || []).map((entry) => {
            if (entry.id === tokenId) return { ...entry, attachedMarkerId: markerId };
            if (entry.attachedMarkerId === markerId) return { ...entry, attachedMarkerId: "" };
            return entry;
          })
        };
      });
    }));
    setMapTokenSelection(mapNoteId, pageId, [tokenId]);
    return didAttach;
  }

  function startMapTokenDrag(event, mapNoteId, pageId, tokenId) {
    if (event.button != null && event.button !== 0) {
      if (event.button === 2) {
        const rect = event.currentTarget?.getBoundingClientRect?.();
        tokenContextPointerRef.current = {
          mapNoteId,
          pageId,
          tokenId,
          x: Number(event.clientX) || (rect ? rect.left + rect.width / 2 : 0),
          y: Number(event.clientY) || (rect ? rect.top + rect.height / 2 : 0)
        };
      }
      return;
    }
    const mapNote = monsterNotesRef.current.find((note) => note.id === mapNoteId);
    const page = mapPagesForNote(mapNote).find((entry) => entry.id === pageId) || activeMapPageForNote(mapNote);
    const token = page?.mapTokens?.find((entry) => entry.id === tokenId);
    if (!mapNote || !token) return;
    if (pendingMapMarkerAttach?.mapNoteId === mapNoteId && pendingMapMarkerAttach?.pageId === page.id) {
      event.preventDefault();
      event.stopPropagation();
      attachMapMarkerToToken(mapNoteId, page.id, pendingMapMarkerAttach.markerId, tokenId);
      setPendingMapMarkerAttach(null);
      return;
    }
    const metrics = mapBodyMetrics(mapNote);
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    focusNote(resolveRootNoteId(mapNoteId, monsterNotesRef.current) || mapNoteId);
    const currentSelection = selectedMapTokensRef.current;
    const pageTokenIds = new Set((page.mapTokens || []).map((entry) => entry.id));
    const selectedIds = currentSelection.mapNoteId === mapNoteId
      && currentSelection.pageId === page.id
      && currentSelection.tokenIds.includes(tokenId)
      ? currentSelection.tokenIds.filter((id) => pageTokenIds.has(id))
      : [tokenId];
    setMapTokenSelection(mapNoteId, page.id, selectedIds);
    const selectedTokens = (page.mapTokens || []).filter((entry) => selectedIds.includes(entry.id));
    const startPositions = Object.fromEntries(selectedTokens.map((entry) => {
      const size = clamp(Number(entry.size) || MAP_TOKEN_SIZE, 32, 140);
      return [entry.id, {
        x: Number(entry.x) || 0,
        y: Number(entry.y) || 0,
        size
      }];
    }));
    const attachedMarkerStartPositions = Object.fromEntries((page.mapMarkers || [])
      .filter((entry) => entry.markerType === "shape" && selectedIds.includes(entry.attachedTokenId))
      .map((entry) => [entry.id, {
        x: Number(entry.x) || 0,
        y: Number(entry.y) || 0,
        width: clamp(Number(entry.width) || MAP_MARKER_SHAPE_DEFAULT_SIZE, MAP_MARKER_SHAPE_MIN_SIZE, 2000),
        height: clamp(Number(entry.height) || MAP_MARKER_SHAPE_DEFAULT_SIZE, MAP_MARKER_SHAPE_MIN_SIZE, 2000),
        markerType: "shape"
      }]));
    mapTokenDragRef.current = {
      pointerId: event.pointerId,
      mapNoteId,
      pageId: page?.id || null,
      tokenId,
      tokenIds: selectedIds,
      startPositions,
      attachedMarkerStartPositions,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: Number(token.x) || 0,
      startY: Number(token.y) || 0,
      size: clamp(Number(token.size) || MAP_TOKEN_SIZE, 32, 140),
      scale: (boardViewRef.current.scale || 1) * (metrics.mapViewScale || 1)
    };
  }

  function moveMapToken(event, drag) {
    const mapNote = monsterNotesRef.current.find((note) => note.id === drag.mapNoteId);
    if (!mapNote) return;
    const deltaX = (event.clientX - drag.startClientX) / drag.scale;
    const deltaY = (event.clientY - drag.startClientY) / drag.scale;
    const draggedIds = Array.isArray(drag.tokenIds) && drag.tokenIds.length ? drag.tokenIds : [drag.tokenId];
    const startPositions = drag.startPositions || {};
    const page = mapPagesForNote(mapNote).find((entry) => entry.id === drag.pageId) || activeMapPageForNote(mapNote);
    if (!page) return;
    const previewPositions = {};
    (page.mapTokens || []).forEach((token) => {
      if (!draggedIds.includes(token.id)) return;
      const start = startPositions[token.id] || { x: Number(token.x) || 0, y: Number(token.y) || 0, size: clamp(Number(token.size) || MAP_TOKEN_SIZE, 32, 140) };
      const point = clampMapTokenPoint(mapNote, start.x + deltaX, start.y + deltaY, start.size, drag.pageId);
      previewPositions[token.id] = point;
      setMapOverlayPreviewPosition(drag.mapNoteId, drag.pageId, "map-token-id", token.id, point);
    });
    const previewMarkerPositions = {};
    (page.mapMarkers || []).forEach((marker) => {
      const start = drag.attachedMarkerStartPositions?.[marker.id];
      if (!start || !draggedIds.includes(marker.attachedTokenId)) return;
      const point = clampMapMarkerPoint(mapNote, start.x + deltaX, start.y + deltaY, start);
      previewMarkerPositions[marker.id] = point;
      setMapOverlayPreviewPosition(drag.mapNoteId, drag.pageId, "map-marker-id", marker.id, point);
    });
    drag.previewPositions = previewPositions;
    drag.previewMarkerPositions = previewMarkerPositions;
  }

  function commitMapTokenDrag(drag) {
    const tokenPositions = drag.previewPositions || {};
    const markerPositions = drag.previewMarkerPositions || {};
    if (!Object.keys(tokenPositions).length && !Object.keys(markerPositions).length) return;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === drag.mapNoteId ? updateMapNotePage(note, drag.pageId, (page) => ({
        ...page,
        mapTokens: (page.mapTokens || []).map((token) => (
          tokenPositions[token.id] ? { ...token, ...tokenPositions[token.id] } : token
        )),
        mapMarkers: (page.mapMarkers || []).map((marker) => (
          markerPositions[marker.id] ? { ...marker, ...markerPositions[marker.id] } : marker
        ))
      })) : note
    )));
  }

  function startMapMarkerDrag(event, mapNoteId, pageId, markerId) {
    if (event.button != null && event.button !== 0) return;
    const mapNote = monsterNotesRef.current.find((note) => note.id === mapNoteId);
    const page = mapPagesForNote(mapNote).find((entry) => entry.id === pageId) || activeMapPageForNote(mapNote);
    const marker = page?.mapMarkers?.find((entry) => entry.id === markerId);
    if (!mapNote || !marker) return;
    const metrics = mapBodyMetrics(mapNote);
    const attachedToken = marker.attachedTokenId
      ? (page.mapTokens || []).find((entry) => entry.id === marker.attachedTokenId)
      : null;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    focusNote(resolveRootNoteId(mapNoteId, monsterNotesRef.current) || mapNoteId);
    mapMarkerDragRef.current = {
      pointerId: event.pointerId,
      mapNoteId,
      pageId: page?.id || null,
      markerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: Number(marker.x) || 0,
      startY: Number(marker.y) || 0,
      width: Number(marker.width) || 0,
      height: Number(marker.height) || 0,
      markerType: marker.markerType,
      attachedTokenId: attachedToken?.id || "",
      attachedTokenStart: attachedToken ? {
        x: Number(attachedToken.x) || 0,
        y: Number(attachedToken.y) || 0,
        size: clamp(Number(attachedToken.size) || MAP_TOKEN_SIZE, 32, 140)
      } : null,
      scale: (boardViewRef.current.scale || 1) * (metrics.mapViewScale || 1)
    };
  }

  function moveMapMarker(event, drag) {
    const mapNote = monsterNotesRef.current.find((note) => note.id === drag.mapNoteId);
    if (!mapNote) return;
    const deltaX = (event.clientX - drag.startClientX) / drag.scale;
    const deltaY = (event.clientY - drag.startClientY) / drag.scale;
    const point = clampMapMarkerPoint(mapNote, drag.startX + deltaX, drag.startY + deltaY, drag);
    const actualDeltaX = point.x - drag.startX;
    const actualDeltaY = point.y - drag.startY;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === drag.mapNoteId
        ? updateMapNotePage(note, drag.pageId, (page) => ({
          ...page,
          mapMarkers: (page.mapMarkers || []).map((marker) => (
            marker.id === drag.markerId ? { ...marker, x: point.x, y: point.y } : marker
          )),
          mapTokens: (page.mapTokens || []).map((token) => {
            if (!drag.attachedTokenId || token.id !== drag.attachedTokenId || !drag.attachedTokenStart) return token;
            const tokenPoint = clampMapTokenPoint(mapNote, drag.attachedTokenStart.x + actualDeltaX, drag.attachedTokenStart.y + actualDeltaY, drag.attachedTokenStart.size, drag.pageId);
            return { ...token, x: tokenPoint.x, y: tokenPoint.y };
          })
        }))
        : note
    )));
  }

  function startMapMarkerResize(event, mapNoteId, pageId, markerId) {
    if (event.button != null && event.button !== 0) return;
    const mapNote = monsterNotesRef.current.find((note) => note.id === mapNoteId);
    const page = mapPagesForNote(mapNote).find((entry) => entry.id === pageId) || activeMapPageForNote(mapNote);
    const marker = page?.mapMarkers?.find((entry) => entry.id === markerId);
    if (!mapNote || !marker || marker.markerType !== "shape") return;
    const metrics = mapBodyMetrics(mapNote);
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    focusNote(resolveRootNoteId(mapNoteId, monsterNotesRef.current) || mapNoteId);
    mapMarkerDragRef.current = {
      pointerId: event.pointerId,
      mode: "resize",
      mapNoteId,
      pageId: page?.id || null,
      markerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: Number(marker.x) || 0,
      startY: Number(marker.y) || 0,
      startWidth: clamp(Number(marker.width) || MAP_MARKER_SHAPE_DEFAULT_SIZE, MAP_MARKER_SHAPE_MIN_SIZE, 2000),
      startHeight: clamp(Number(marker.height) || MAP_MARKER_SHAPE_DEFAULT_SIZE, MAP_MARKER_SHAPE_MIN_SIZE, 2000),
      scale: (boardViewRef.current.scale || 1) * (metrics.mapViewScale || 1)
    };
  }

  function resizeMapMarker(event, drag) {
    const mapNote = monsterNotesRef.current.find((note) => note.id === drag.mapNoteId);
    if (!mapNote) return;
    const metrics = mapBodyMetrics(mapNote);
    const deltaX = (event.clientX - drag.startClientX) / drag.scale;
    const deltaY = (event.clientY - drag.startClientY) / drag.scale;
    const maxWidth = Math.max(MAP_MARKER_SHAPE_MIN_SIZE, metrics.width - drag.startX);
    const maxHeight = Math.max(MAP_MARKER_SHAPE_MIN_SIZE, metrics.height - drag.startY);
    const width = clamp(drag.startWidth + deltaX, MAP_MARKER_SHAPE_MIN_SIZE, maxWidth);
    const height = clamp(drag.startHeight + deltaY, MAP_MARKER_SHAPE_MIN_SIZE, maxHeight);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === drag.mapNoteId
        ? updateMapNotePage(note, drag.pageId, (page) => ({
          ...page,
          mapMarkers: (page.mapMarkers || []).map((marker) => (
            marker.id === drag.markerId ? { ...marker, width, height } : marker
          ))
        }))
        : note
    )));
  }

  function updateMapTokenHp(noteId, pageId, tokenId, value) {
    const numericValue = value === "" ? "" : Number(value);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        mapTokens: (page.mapTokens || []).map((token) => (
          token.id === tokenId ? {
            ...token,
            hpCurrent: numericValue,
            actorNote: token.actorNote ? { ...token.actorNote, hpCurrent: numericValue } : token.actorNote
          } : token
        ))
      })) : note
    )));
  }

  function addMapTokenGroup(noteId, pageId, name) {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        mapTokenGroups: [
          ...mapTokenGroupsSnapshot(page.mapTokenGroups),
          normalizeMapTokenGroup({
            id: `map-token-group-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: trimmed
          }, (page.mapTokenGroups || []).length)
        ]
      })) : note
    )));
  }

  function renameMapTokenGroup(noteId, pageId, groupId, name) {
    const trimmed = String(name || "").trim();
    if (!groupId || !trimmed) return;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        mapTokenGroups: mapTokenGroupsSnapshot(page.mapTokenGroups).map((group) => (
          group.id === groupId ? { ...group, name: trimmed.slice(0, 80) } : group
        ))
      })) : note
    )));
  }

  function setMapTokenGroupGlobal(noteId, pageId, groupId, global) {
    if (!groupId) return;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        mapTokenGroups: mapTokenGroupsSnapshot(page.mapTokenGroups).map((group) => (
          group.id === groupId ? { ...group, global: Boolean(global) } : group
        ))
      })) : note
    )));
  }

  function setMapTokenGroupCombat(noteId, pageId, groupId, inCombat) {
    if (!groupId) return;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        mapTokenGroups: mapTokenGroupsSnapshot(page.mapTokenGroups).map((group) => (
          group.id === groupId ? { ...group, inCombat: Boolean(inCombat) } : group
        ))
      })) : note
    )));
  }

  function removeMapTokenGroup(noteId, pageId, groupId) {
    if (!groupId) return;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        mapTokenGroups: mapTokenGroupsSnapshot(page.mapTokenGroups).filter((group) => group.id !== groupId),
        mapTokens: (page.mapTokens || []).map((token) => (
          token.groupId === groupId ? { ...token, groupId: "" } : token
        ))
      })) : note
    )));
  }

  function changeMapTokenGroup(noteId, pageId, tokenId, groupId) {
    const groups = new Set(mapTokenGroupsSnapshot(
      mapPagesForNote(monsterNotesRef.current.find((note) => note.id === noteId) || {})
        .find((page) => page.id === pageId)?.mapTokenGroups
    ).map((group) => group.id));
    const nextGroupId = groupId && groups.has(groupId) ? groupId : "";
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        mapTokens: (page.mapTokens || []).map((token) => (
          token.id === tokenId ? { ...token, groupId: nextGroupId } : token
        ))
      })) : note
    )));
  }

  function dropMapTrackerToken(noteId, sourcePageId, tokenId, targetPageId, point) {
    if (!noteId || !sourcePageId || !tokenId || !targetPageId || !point) return;
    setMonsterNotes((notes) => {
      const linkedNoteIds = notes
        .filter((note) => {
          const link = normalizeLinkedMapTokenLink(note.linkedMapToken);
          return link?.mapNoteId === noteId && link.tokenId === tokenId;
        })
        .map((note) => note.id);
      const preparedNotes = linkedNoteIds.length ? persistLinkedTokenNotesInCollection(notes, linkedNoteIds) : notes;
      let didMoveToken = false;
      const movedNotes = preparedNotes.map((note) => {
        if (note.id !== noteId || note.kind !== "map") return note;
        const pages = mapPagesForNote(note);
        const sourcePage = pages.find((page) => page.id === sourcePageId);
        const sourceToken = sourcePage?.mapTokens?.find((token) => token.id === tokenId)
          || pages.flatMap((page) => page.mapTokens || []).find((token) => token.id === tokenId);
        const targetPage = pages.find((page) => page.id === targetPageId);
        if (!targetPage) return note;
        if (!sourceToken) return note;
        const size = clamp(Number(point.size) || Number(sourceToken.size) || MAP_TOKEN_SIZE, 32, 140);
        const targetPoint = clampMapTokenPoint(note, Number(point.x) || 0, Number(point.y) || 0, size, targetPageId);
        const sourceMarker = pages
          .flatMap((page) => page.mapMarkers || [])
          .find((marker) => marker.markerType === "shape" && (marker.id === sourceToken.attachedMarkerId || marker.attachedTokenId === tokenId));
        const markerDeltaX = targetPoint.x - (Number(sourceToken.x) || 0);
        const markerDeltaY = targetPoint.y - (Number(sourceToken.y) || 0);
        const droppedMarkerPoint = sourceMarker
          ? clampMapMarkerPoint(note, (Number(sourceMarker.x) || 0) + markerDeltaX, (Number(sourceMarker.y) || 0) + markerDeltaY, sourceMarker)
          : null;
        const droppedMarker = sourceMarker ? normalizeMapMarker({
          ...sourceMarker,
          x: droppedMarkerPoint.x,
          y: droppedMarkerPoint.y,
          attachedTokenId: tokenId
        }) : null;
        const droppedToken = normalizeMapToken({
          ...sourceToken,
          x: targetPoint.x,
          y: targetPoint.y,
          size,
          attachedMarkerId: droppedMarker?.id || ""
        });
        if (!droppedToken) return note;
        const updatedPages = pages.map((page) => {
          const remainingTokens = (page.mapTokens || []).filter((token) => token.id !== tokenId);
          const tokenChanged = remainingTokens.length !== (page.mapTokens || []).length;
          const markerChanged = droppedMarker
            ? (page.mapMarkers || []).some((marker) => marker.id === droppedMarker.id)
            : (page.mapMarkers || []).some((marker) => marker.attachedTokenId === tokenId);
          const remainingMarkers = droppedMarker
            ? (page.mapMarkers || []).filter((marker) => marker.id !== droppedMarker.id)
            : (page.mapMarkers || []).map((marker) => (
              marker.attachedTokenId === tokenId ? { ...marker, attachedTokenId: "" } : marker
            ));
          if (page.id !== targetPageId) {
            return !tokenChanged && !markerChanged
              ? page
              : { ...page, mapTokens: remainingTokens, mapMarkers: remainingMarkers };
          }
          return {
            ...page,
            mapTokens: [...remainingTokens, droppedToken],
            mapMarkers: droppedMarker ? [...remainingMarkers, droppedMarker] : remainingMarkers
          };
        });
        didMoveToken = true;
        return syncMapNoteActivePage(note, updatedPages, targetPageId);
      });
      if (!didMoveToken || !linkedNoteIds.length) return movedNotes;
      const linkedIds = new Set(linkedNoteIds);
      return movedNotes.map((note) => {
        if (!linkedIds.has(note.id)) return note;
        const link = normalizeLinkedMapTokenLink(note.linkedMapToken);
        if (!link) return note;
        return {
          ...note,
          linkedMapToken: {
            ...link,
            pageId: targetPageId
          }
        };
      });
    });
    setMapTokenSelection(noteId, targetPageId, [tokenId]);
  }

  function rollMapTokensInitiative(noteId, pageId, tokenIds = null) {
    const targetIds = Array.isArray(tokenIds) && tokenIds.length && typeof tokenIds[0] !== "object" ? new Set(tokenIds) : null;
    const targetPageIds = Array.isArray(tokenIds) && tokenIds.length && typeof tokenIds[0] === "object"
      ? tokenIds.reduce((map, target) => {
        const targetPageId = String(target?.pageId || "");
        const targetTokenId = String(target?.tokenId || "");
        if (!targetPageId || !targetTokenId) return map;
        if (!map.has(targetPageId)) map.set(targetPageId, new Set());
        map.get(targetPageId).add(targetTokenId);
        return map;
      }, new Map())
      : null;
    if (targetPageIds?.size) {
      setMonsterNotes((notes) => notes.map((note) => {
        if (note.id !== noteId) return note;
        const pages = mapPagesForNote(note).map((page) => {
          const ids = targetPageIds.get(page.id);
          if (!ids?.size) return page;
          return {
            ...page,
            mapTokens: (page.mapTokens || []).map((token) => {
              if (!ids.has(token.id)) return token;
              const modifier = Number(token.initiativeModifier) || 0;
              const roll = rollD20(modifier);
              return {
                ...token,
                initiative: roll.total,
                initiativeDetail: roll.detail,
                actorNote: token.actorNote ? { ...token.actorNote, initiative: roll.total, initiativeDetail: roll.detail } : token.actorNote
              };
            })
          };
        });
        return syncMapNoteActivePage(note, pages, note.activeMapPageId || pageId);
      }));
      return;
    }
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === noteId ? updateMapNotePage(note, pageId, (page) => ({
        ...page,
        mapTokens: (page.mapTokens || []).map((token) => {
          if (targetIds && !targetIds.has(token.id)) return token;
          const modifier = Number(token.initiativeModifier) || 0;
          const roll = rollD20(modifier);
          return {
            ...token,
            initiative: roll.total,
            initiativeDetail: roll.detail,
            actorNote: token.actorNote ? { ...token.actorNote, initiative: roll.total, initiativeDetail: roll.detail } : token.actorNote
          };
        })
      })) : note
    )));
  }

  function resizeMapTokenFromMenu(delta) {
    const entry = findMapTokenContextEntry();
    if (!entry) return;
    const targetIds = new Set(mapTokenContextTargetIds(entry));
    if (!targetIds.size) return;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id ? updateMapNotePage(note, entry.page.id, (page) => ({
        ...page,
        mapTokens: (page.mapTokens || []).map((candidate) => {
          if (!targetIds.has(candidate.id)) return candidate;
          const currentSize = clamp(Number(candidate.size) || MAP_TOKEN_SIZE, 32, 140);
          const nextSize = clamp(currentSize + delta, 32, 140);
          const point = clampMapTokenPoint(entry.mapNote, Number(candidate.x) || 0, Number(candidate.y) || 0, nextSize, entry.page.id);
          return { ...candidate, size: nextSize, x: point.x, y: point.y };
        })
      })) : note
    )));
  }

  function toggleMapTokenHiddenFromMenu() {
    const entry = findMapTokenContextEntry();
    if (!entry) return;
    const targetIds = new Set(mapTokenContextTargetIds(entry));
    if (!targetIds.size) return;
    const nextHidden = !Boolean(entry.token.hidden);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapTokens: (page.mapTokens || []).map((token) => (
            targetIds.has(token.id) ? { ...token, hidden: nextHidden } : token
          ))
        }))
        : note
    )));
    setTokenContextMenu(null);
  }

  function toggleMapTokenIdentityHiddenFromMenu() {
    const entry = findMapTokenContextEntry();
    if (!entry || entry.token.kind === "character") return;
    const targetIds = new Set(mapTokenContextTargetIds(entry));
    if (!targetIds.size) return;
    const nextIdentityHidden = !Boolean(entry.token.identityHidden);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapTokens: (page.mapTokens || []).map((token) => (
            targetIds.has(token.id) && token.kind !== "character" ? { ...token, identityHidden: nextIdentityHidden } : token
          ))
        }))
        : note
    )));
    setTokenContextMenu(null);
  }

  function toggleMapTokenNameHiddenFromMenu() {
    const entry = findMapTokenContextEntry();
    if (!entry || entry.token.kind === "character") return;
    const targetIds = new Set(mapTokenContextTargetIds(entry));
    if (!targetIds.size) return;
    const nextNameHidden = !Boolean(entry.token.nameHidden);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapTokens: (page.mapTokens || []).map((token) => (
            targetIds.has(token.id) && token.kind !== "character" ? { ...token, nameHidden: nextNameHidden } : token
          ))
        }))
        : note
    )));
    setTokenContextMenu(null);
  }

  function noteLinkedToMapToken(note, link) {
    const current = normalizeLinkedMapTokenLink(note?.linkedMapToken);
    return Boolean(current && link
      && current.mapNoteId === link.mapNoteId
      && current.pageId === link.pageId
      && current.tokenId === link.tokenId);
  }

  function combatFieldsFromActorNote(note, fallbackToken = {}) {
    const monster = note?.kind === "monster" ? note.monster : null;
    const character = note?.kind === "character" ? note.character : null;
    const ac = note?.kind === "character"
      ? (character?.ac || fallbackToken.ac || "Unknown")
      : (monster ? formatAc(monster) : fallbackToken.ac || "Unknown");
    return {
      ac: String(ac || "Unknown"),
      hpCurrent: note?.hpCurrent ?? fallbackToken.hpCurrent ?? "",
      hpMax: note?.hpMax ?? fallbackToken.hpMax ?? ""
    };
  }

  function applyActorNoteSnapshotToToken(token, actorNote) {
    const snapshot = tokenActorNoteSnapshot(actorNote);
    if (!snapshot) return token;
    const monsterImage = snapshot.kind === "monster" ? normalizeMapTokenImage(snapshot.monsterCustom?.tokenImage || snapshot.monster?.tokenImage) : null;
    const hasMonsterImageField = snapshot.kind === "monster" && (
      Object.prototype.hasOwnProperty.call(snapshot.monsterCustom || {}, "tokenImage")
      || Object.prototype.hasOwnProperty.call(snapshot.monster || {}, "tokenImage")
    );
    return {
      ...token,
      name: noteDisplayName(actorNote),
      ...combatFieldsFromActorNote(actorNote, token),
      actorNote: snapshot,
      monster: snapshot.kind === "monster" ? mapTokenMonsterSnapshot(snapshot.monster) : token.monster,
      monsterCustom: snapshot.kind === "monster" && snapshot.monsterCustom ? cloneForBoardState(snapshot.monsterCustom) : token.monsterCustom,
      image: snapshot.kind === "monster" ? (monsterImage || (hasMonsterImageField ? null : token.image)) : token.image,
      character: snapshot.kind === "character" ? mapTokenCharacterSnapshot(snapshot.character) : token.character,
      livePlayerId: snapshot.kind === "character" ? String(actorNote.livePlayerId || snapshot.livePlayerId || token.livePlayerId || "") : token.livePlayerId,
      livePlayerName: snapshot.kind === "character" ? String(actorNote.livePlayerName || snapshot.livePlayerName || token.livePlayerName || "") : token.livePlayerName,
      liveConnected: snapshot.kind === "character" ? Boolean(actorNote.liveConnected ?? snapshot.liveConnected ?? token.liveConnected) : token.liveConnected,
      liveLastUpdate: snapshot.kind === "character" ? (actorNote.liveLastUpdate || snapshot.liveLastUpdate || token.liveLastUpdate || null) : token.liveLastUpdate
    };
  }

  function persistLinkedTokenNotesInCollection(notes, noteIds) {
    const ids = new Set(Array.from(noteIds || []).filter(Boolean));
    const linkedNotes = notes.filter((note) => ids.has(note.id) && normalizeLinkedMapTokenLink(note.linkedMapToken));
    if (!linkedNotes.length) return notes;

    return linkedNotes.reduce((nextNotes, linkedNote) => {
      const link = normalizeLinkedMapTokenLink(linkedNote.linkedMapToken);
      return nextNotes.map((note) => (
        note.id === link.mapNoteId && note.kind === "map" ? syncMapNoteActivePage(note, mapPagesForNote(note).map((page) => {
          const hasLinkedToken = (page.mapTokens || []).some((token) => token.id === link.tokenId);
          if (!hasLinkedToken) return page;
          return {
            ...page,
            mapTokens: (page.mapTokens || []).map((token) => (
              token.id === link.tokenId ? applyActorNoteSnapshotToToken(token, linkedNote) : token
            ))
          };
        }), note.activeMapPageId || link.pageId) : note
      ));
    }, notes);
  }

  function findMapTokenContextEntry(menu = tokenContextMenu) {
    if (!menu?.mapNoteId || !menu.tokenId) return null;
    const mapNote = monsterNotesRef.current.find((note) => note.id === menu.mapNoteId);
    const page = mapPagesForNote(mapNote).find((entry) => entry.id === menu.pageId) || activeMapPageForNote(mapNote);
    const token = page?.mapTokens?.find((entry) => entry.id === menu.tokenId);
    return mapNote && page && token ? { mapNote, page, token } : null;
  }

  function mapTokenContextTargetIds(entry = findMapTokenContextEntry()) {
    if (!entry) return [];
    const selection = selectedMapTokensRef.current;
    const selectedIds = Array.isArray(selection?.tokenIds) ? selection.tokenIds : [];
    if (
      selection?.mapNoteId === entry.mapNote.id
      && selection?.pageId === entry.page.id
      && selectedIds.includes(entry.token.id)
    ) {
      const pageTokenIds = new Set((entry.page.mapTokens || []).map((token) => token.id));
      return selectedIds.filter((tokenId) => pageTokenIds.has(tokenId));
    }
    return [entry.token.id];
  }

  function mapTokenContextTargets(entry = findMapTokenContextEntry()) {
    if (!entry) return [];
    const targetIds = new Set(mapTokenContextTargetIds(entry));
    return (entry.page.mapTokens || []).filter((token) => targetIds.has(token.id));
  }

  function findMapMarkerContextEntry(menu = markerContextMenu) {
    if (!menu?.mapNoteId || !menu.markerId) return null;
    const mapNote = monsterNotesRef.current.find((note) => note.id === menu.mapNoteId);
    const page = mapPagesForNote(mapNote).find((entry) => entry.id === menu.pageId) || activeMapPageForNote(mapNote);
    const marker = page?.mapMarkers?.find((entry) => entry.id === menu.markerId);
    return mapNote && page && marker ? { mapNote, page, marker } : null;
  }

  function monsterFromMapToken(token) {
    if (token?.monsterCustom) return cloneForBoardState(token.monsterCustom);
    return findLibraryEntryByRef("monster", token?.monster) || null;
  }

  function actorNotePayloadFromMapToken(token) {
    const actorNote = tokenActorNoteFromToken(token);
    if (!actorNote) return null;
    return {
      kind: actorNote.kind,
      monster: actorNote.kind === "monster" ? actorNote.monster : null,
      monsterCustom: actorNote.kind === "monster" && actorNote.monsterCustom ? cloneForBoardState(actorNote.monsterCustom) : null,
      character: actorNote.kind === "character" ? actorNote.character : null,
      livePlayerId: actorNote.kind === "character" ? String(actorNote.livePlayerId || token.livePlayerId || "") : "",
      livePlayerName: actorNote.kind === "character" ? String(actorNote.livePlayerName || token.livePlayerName || "") : "",
      liveSheetData: actorNote.kind === "character" && actorNote.liveSheetData ? cloneForBoardState(actorNote.liveSheetData) : null,
      liveConnected: actorNote.kind === "character" ? Boolean(actorNote.liveConnected ?? token.liveConnected ?? false) : false,
      liveLastUpdate: actorNote.kind === "character" ? (actorNote.liveLastUpdate || token.liveLastUpdate || null) : null,
      monsterTextNotes: actorNote.kind === "monster" ? normalizeMonsterTextNotes(actorNote.monsterTextNotes) : [],
      monsterActiveTabId: actorNote.kind === "monster" ? monsterActivePanelId(actorNote) : "stats",
      titleOverride: actorNote.titleOverride,
      hpCurrent: actorNote.hpCurrent,
      hpMax: actorNote.hpMax,
      rolls: actorNote.rolls || [],
      dicePanelOpen: actorNote.dicePanelOpen,
      tokenInitiative: token.initiative ?? ""
    };
  }

  function openMapTokenContextMenu(event, mapNoteId, pageId, tokenId) {
    event.preventDefault();
    event.stopPropagation();
    const viewportWidth = window.innerWidth || 1200;
    const viewportHeight = window.innerHeight || 800;
    const targetRect = event.currentTarget?.getBoundingClientRect?.();
    const pointer = tokenContextPointerRef.current;
    const hasPointer = pointer
      && pointer.mapNoteId === mapNoteId
      && pointer.pageId === pageId
      && pointer.tokenId === tokenId;
    const eventX = Number(event.clientX);
    const eventY = Number(event.clientY);
    const eventLooksValid = Number.isFinite(eventX)
      && Number.isFinite(eventY)
      && eventX > 0
      && eventY > 0
      && eventX < viewportWidth
      && eventY < viewportHeight
      && (!targetRect || (
        eventX >= targetRect.left - 6
        && eventX <= targetRect.right + 6
        && eventY >= targetRect.top - 6
        && eventY <= targetRect.bottom + 6
      ));
    const clientX = hasPointer
      ? pointer.x
      : eventLooksValid
        ? eventX
        : (targetRect ? targetRect.left + targetRect.width / 2 : viewportWidth / 2);
    const clientY = hasPointer
      ? pointer.y
      : eventLooksValid
        ? eventY
        : (targetRect ? targetRect.top + targetRect.height / 2 : viewportHeight / 2);
    const boardPoint = screenToBoardPoint(clientX, clientY);
    setContextMenu(null);
    setMarkerContextMenu(null);
    setTokenContextMenu({
      x: clamp(clientX, 0, viewportWidth - 1),
      y: clamp(clientY, 0, viewportHeight - 1),
      boardX: boardPoint.x,
      boardY: boardPoint.y,
      mapNoteId,
      pageId,
      tokenId
    });
    tokenContextPointerRef.current = null;
  }

  function openMapMarkerContextMenu(event, mapNoteId, pageId, markerId) {
    event.preventDefault();
    event.stopPropagation();
    const viewportWidth = window.innerWidth || 1200;
    const viewportHeight = window.innerHeight || 800;
    const clientX = clamp(Number(event.clientX) || 0, 0, viewportWidth - 1);
    const clientY = clamp(Number(event.clientY) || 0, 0, viewportHeight - 1);
    setContextMenu(null);
    setTokenContextMenu(null);
    setMarkerContextMenu({
      x: clientX,
      y: clientY,
      mapNoteId,
      pageId,
      markerId
    });
  }

  function duplicateMapTokenFromMenu() {
    const entry = findMapTokenContextEntry();
    if (!entry) return;
    const { mapNote, page } = entry;
    const targets = mapTokenContextTargets(entry);
    if (!targets.length) return;
    const grid = normalizeMapGrid(page.mapGrid);
    const duplicates = targets.map((token, index) => {
      const size = clamp(Number(token.size) || MAP_TOKEN_SIZE, 32, 140);
      const offsetX = grid.enabled ? grid.cellWidth : size + 12;
      const point = clampMapTokenPoint(mapNote, (Number(token.x) || 0) + offsetX, Number(token.y) || 0, size, page.id);
      return normalizeMapToken({
        ...token,
        id: `map-token-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
        x: point.x,
        y: point.y,
        size,
        attachedMarkerId: "",
        ...mapActorCombatState({
          kind: token.kind,
          monster: token.kind === "character" ? null : monsterFromMapToken(token),
          character: token.kind === "character" ? token.character : null,
          hpMax: token.hpMax
        })
      });
    }).filter(Boolean);
    if (!duplicates.length) return;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === mapNote.id ? updateMapNotePage(note, page.id, (page) => ({
        ...page,
        mapTokens: [...(page.mapTokens || []), ...duplicates]
      })) : note
    )));
    setTokenContextMenu(null);
  }

  function openActorNoteFromMapToken() {
    const entry = findMapTokenContextEntry();
    if (!entry) return;
    const payload = actorNotePayloadFromMapToken(entry.token);
    if (!payload) return;
    const link = {
      mapNoteId: entry.mapNote.id,
      pageId: entry.page.id,
      tokenId: entry.token.id
    };
    const existingNote = monsterNotesRef.current.find((note) => noteLinkedToMapToken(note, link));
    if (existingNote) {
      restoreNote(existingNote.id);
      focusNote(existingNote.id);
      setTokenContextMenu(null);
      return;
    }
    const livePlayerId = payload.kind === "character"
      ? String(payload.livePlayerId || entry.token.livePlayerId || entry.token.actorNote?.livePlayerId || "")
      : "";
    if (livePlayerId) {
      const liveNote = monsterNotesRef.current.find((note) => note.livePlayerId === livePlayerId);
      if (liveNote) {
        setMonsterNotes((notes) => {
          const nextNotes = notes.map((note) => (
            note.id === liveNote.id ? { ...note, linkedMapToken: link, minimized: false } : note
          ));
          return persistLinkedTokenNotesInCollection(nextNotes, [liveNote.id]);
        });
        restoreNote(liveNote.id);
        focusNote(liveNote.id);
        setTokenContextMenu(null);
        return;
      }
    }
    const width = payload.kind === "monster" ? MONSTER_NOTE_DEFAULT_WIDTH : NOTE_DEFAULT_WIDTH;
    const height = NOTE_DEFAULT_HEIGHT;
    const spawnPoint = clampBoardPoint({
      x: (tokenContextMenu?.boardX || 0) + 24,
      y: (tokenContextMenu?.boardY || 0) + 24
    }, width, height);
    let notePayload = payload;
    if (livePlayerId) {
      const livePlayer = livePlayers.find((player) => player.playerId === livePlayerId);
      const liveSheetData = livePlayer?.data && Object.keys(livePlayer.data).length
        ? livePlayer.data
        : (payload.liveSheetData || {});
      let liveCharacter = payload.character;
      if (liveSheetData && Object.keys(liveSheetData).length) {
        try {
          liveCharacter = characterFromSheetData(liveSheetData);
        } catch (error) {
          console.error(error);
        }
      }
      notePayload = {
        ...payload,
        character: liveCharacter,
        livePlayerId,
        livePlayerName: livePlayer?.playerName || payload.livePlayerName || "",
        liveSheetData: cloneForBoardState(liveSheetData),
        liveConnected: livePlayer ? Boolean(livePlayer.connected) : payload.liveConnected !== false,
        liveLastUpdate: livePlayer?.lastUpdate || payload.liveLastUpdate || null
      };
    }
    addBoardNote({
      ...notePayload,
      width,
      height,
      linkedMapToken: link
    }, spawnPoint);
    setTokenContextMenu(null);
  }

  function renameMapMarkerFromMenu() {
    const entry = findMapMarkerContextEntry();
    if (!entry) return;
    const currentLabel = entry.marker.label || "Marker";
    setMarkerContextMenu((menu) => (
      menu?.markerId === entry.marker.id
        ? { ...menu, renaming: true, draft: currentLabel }
        : menu
    ));
  }

  function commitMapMarkerRenameFromMenu(event) {
    event?.preventDefault?.();
    const entry = findMapMarkerContextEntry();
    if (!entry) return;
    renameMapMarker(entry.mapNote.id, entry.page.id, entry.marker.id, markerContextMenu?.draft || "");
    setMarkerContextMenu(null);
  }

  function toggleMapMarkerHiddenFromMenu() {
    const entry = findMapMarkerContextEntry();
    if (!entry) return;
    const nextHidden = !Boolean(entry.marker.hidden);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapMarkers: (page.mapMarkers || []).map((marker) => (
            marker.id === entry.marker.id ? { ...marker, hidden: nextHidden } : marker
          ))
        }))
        : note
    )));
    setMarkerContextMenu(null);
  }

  function updateMapMarkerColorFromMenu(color) {
    const entry = findMapMarkerContextEntry();
    if (!entry) return;
    const nextColor = normalizeMapMarkerColor(color);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapMarkers: (page.mapMarkers || []).map((marker) => (
            marker.id === entry.marker.id ? { ...marker, color: nextColor } : marker
          ))
        }))
        : note
    )));
    setMarkerContextMenu(null);
  }

  function updateMapMarkerIconFromMenu(icon) {
    const entry = findMapMarkerContextEntry();
    if (!entry || entry.marker.markerType !== "pin") return;
    const nextIcon = normalizeMapMarkerIcon(icon);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapMarkers: (page.mapMarkers || []).map((marker) => (
            marker.id === entry.marker.id ? { ...marker, icon: nextIcon } : marker
          ))
        }))
        : note
    )));
    setMarkerContextMenu(null);
  }

  function updateMapMarkerOpacityFromMenu(opacity) {
    const entry = findMapMarkerContextEntry();
    if (!entry || entry.marker.markerType !== "shape") return;
    const nextOpacity = normalizeMapMarkerOpacity(Number(opacity) / 100);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapMarkers: (page.mapMarkers || []).map((marker) => (
            marker.id === entry.marker.id ? { ...marker, opacity: nextOpacity } : marker
          ))
        }))
        : note
    )));
  }

  function updateMapMarkerPatternFromMenu(pattern) {
    const entry = findMapMarkerContextEntry();
    if (!entry || entry.marker.markerType !== "shape") return;
    const nextPattern = normalizeMapMarkerPattern(pattern);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapMarkers: (page.mapMarkers || []).map((marker) => (
            marker.id === entry.marker.id ? { ...marker, pattern: nextPattern } : marker
          ))
        }))
        : note
    )));
  }

  function updateMapMarkerFormTypeFromMenu(formType) {
    const entry = findMapMarkerContextEntry();
    if (!entry || entry.marker.markerType !== "shape") return;
    const nextFormType = normalizeMapMarkerFormType(formType);
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapMarkers: (page.mapMarkers || []).map((marker, index) => {
            if (marker.id !== entry.marker.id) return marker;
            const previousPrefix = MAP_MARKER_FORM_LABELS[marker.formType] || "Forma";
            const nextPrefix = MAP_MARKER_FORM_LABELS[nextFormType] || "Forma";
            const currentLabel = String(marker.label || "");
            const generatedSuffix = currentLabel.match(new RegExp(`^${previousPrefix}\\s+(\\d+)$`, "i"))?.[1] || String(index + 1);
            return {
              ...marker,
              formType: nextFormType,
              label: currentLabel && currentLabel !== previousPrefix && currentLabel !== `${previousPrefix} ${generatedSuffix}`
                ? marker.label
                : `${nextPrefix} ${generatedSuffix}`
            };
          })
        }))
        : note
    )));
  }

  function rotateMapMarkerFromMenu(delta) {
    const entry = findMapMarkerContextEntry();
    if (!entry) return;
    const current = Number(entry.marker.rotation) || 0;
    const rotation = ((current + delta) % 360 + 360) % 360;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapMarkers: (page.mapMarkers || []).map((marker) => (
            marker.id === entry.marker.id ? { ...marker, rotation } : marker
          ))
        }))
        : note
    )));
  }

  function startMapMarkerAttachFromMenu() {
    const entry = findMapMarkerContextEntry();
    if (!entry || entry.marker.markerType !== "shape") return;
    setPendingMapMarkerAttach({
      mapNoteId: entry.mapNote.id,
      pageId: entry.page.id,
      markerId: entry.marker.id
    });
    setMarkerContextMenu(null);
  }

  function detachMapMarkerFromMenu() {
    const entry = findMapMarkerContextEntry();
    if (!entry || entry.marker.markerType !== "shape") return;
    const tokenId = String(entry.marker.attachedTokenId || "");
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapMarkers: (page.mapMarkers || []).map((marker) => (
            marker.id === entry.marker.id ? { ...marker, attachedTokenId: "" } : marker
          )),
          mapTokens: (page.mapTokens || []).map((token) => (
            token.id === tokenId || token.attachedMarkerId === entry.marker.id ? { ...token, attachedMarkerId: "" } : token
          ))
        }))
        : note
    )));
    setMarkerContextMenu(null);
  }

  function removeMapTokenFromMenu() {
    const entry = findMapTokenContextEntry();
    if (!entry) return;
    const targetIds = new Set(mapTokenContextTargetIds(entry));
    if (!targetIds.size) return;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapTokens: (page.mapTokens || []).filter((token) => !targetIds.has(token.id)),
          mapMarkers: (page.mapMarkers || []).map((marker) => (
            targetIds.has(marker.attachedTokenId) ? { ...marker, attachedTokenId: "" } : marker
          ))
        }))
        : note
    )));
    setMapTokenSelection(entry.mapNote.id, entry.page.id, []);
    setTokenContextMenu(null);
  }

  function removeMapMarkerFromMenu() {
    const entry = findMapMarkerContextEntry();
    if (!entry) return;
    setMonsterNotes((notes) => notes.map((note) => (
      note.id === entry.mapNote.id
        ? updateMapNotePage(note, entry.page.id, (page) => ({
          ...page,
          mapMarkers: (page.mapMarkers || []).filter((marker) => marker.id !== entry.marker.id),
          mapTokens: (page.mapTokens || []).map((token) => (
            token.attachedMarkerId === entry.marker.id ? { ...token, attachedMarkerId: "" } : token
          ))
        }))
        : note
    )));
    setMarkerContextMenu(null);
  }

  function editMonsterNote(noteId, pathParts, value) {
    if (!Array.isArray(pathParts) || !pathParts.length) return;
    setMonsterNotes((notes) => {
      const nextNotes = notes.map((note) => {
        if (note.id !== noteId || note.kind !== "monster") return note;
        const baseMonster = cloneForBoardState(note.monsterCustom || note.monster) || {};
        const monsterCustom = updateObjectPath(baseMonster, pathParts, value);
        return {
          ...note,
          monster: monsterCustom,
          monsterCustom
        };
      });
      return persistLinkedTokenNotesInCollection(nextNotes, [noteId]);
    });
  }

  function selectMonsterPanel(noteId, panelId) {
    const nextPanelId = String(panelId || "stats");
    setMonsterNotes((notes) => {
      const nextNotes = notes.map((note) => {
        if (note.id !== noteId || note.kind !== "monster") return note;
        const textNotes = normalizeMonsterTextNotes(note.monsterTextNotes);
        const safePanelId = nextPanelId === "stats" || textNotes.some((entry) => entry.id === nextPanelId)
          ? nextPanelId
          : "stats";
        return { ...note, monsterActiveTabId: safePanelId };
      });
      return persistLinkedTokenNotesInCollection(nextNotes, [noteId]);
    });
  }

  function addMonsterTextNote(noteId) {
    setMonsterNotes((notes) => {
      const nextNotes = notes.map((note) => {
        if (note.id !== noteId || note.kind !== "monster") return note;
        const textNotes = normalizeMonsterTextNotes(note.monsterTextNotes);
        const textNote = normalizeMonsterTextNote({
          id: `monster-text-note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          title: `Nota ${textNotes.length + 1}`,
          content: ""
        }, textNotes.length);
        return {
          ...note,
          monsterTextNotes: [...textNotes, textNote],
          monsterActiveTabId: textNote.id
        };
      });
      return persistLinkedTokenNotesInCollection(nextNotes, [noteId]);
    });
  }

  function renameMonsterTextNote(noteId, textNoteId, title) {
    const trimmed = String(title || "").trim();
    if (!textNoteId || !trimmed) return;
    setMonsterNotes((notes) => {
      const nextNotes = notes.map((note) => {
        if (note.id !== noteId || note.kind !== "monster") return note;
        return {
          ...note,
          monsterTextNotes: normalizeMonsterTextNotes(note.monsterTextNotes).map((entry) => (
            entry.id === textNoteId ? { ...entry, title: trimmed.slice(0, 80) } : entry
          ))
        };
      });
      return persistLinkedTokenNotesInCollection(nextNotes, [noteId]);
    });
  }

  function updateMonsterTextNote(noteId, textNoteId, content) {
    if (!textNoteId) return;
    setMonsterNotes((notes) => {
      const nextNotes = notes.map((note) => {
        if (note.id !== noteId || note.kind !== "monster") return note;
        return {
          ...note,
          monsterTextNotes: normalizeMonsterTextNotes(note.monsterTextNotes).map((entry) => (
            entry.id === textNoteId ? { ...entry, content: String(content || "") } : entry
          ))
        };
      });
      return persistLinkedTokenNotesInCollection(nextNotes, [noteId]);
    });
  }

  function removeMonsterTextNote(noteId, textNoteId) {
    if (!textNoteId) return;
    setMonsterNotes((notes) => {
      const nextNotes = notes.map((note) => {
        if (note.id !== noteId || note.kind !== "monster") return note;
        const remaining = normalizeMonsterTextNotes(note.monsterTextNotes).filter((entry) => entry.id !== textNoteId);
        return {
          ...note,
          monsterTextNotes: remaining,
          monsterActiveTabId: note.monsterActiveTabId === textNoteId ? "stats" : monsterActivePanelId({ ...note, monsterTextNotes: remaining })
        };
      });
      return persistLinkedTokenNotesInCollection(nextNotes, [noteId]);
    });
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

  function findCharacterEquipmentDropTarget(clientX, clientY, sourceNoteId = "") {
    const sections = Array.from(document.querySelectorAll("[data-character-equipment-drop='true']"));
    return sections.find((section) => {
      const targetNoteId = section.dataset.dropNoteId || "";
      if (!targetNoteId || targetNoteId === sourceNoteId) return false;
      const rect = section.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }) || null;
  }

  function addItemNoteToCharacterEquipment(itemNoteId, targetNoteId) {
    if (!itemNoteId || !targetNoteId || itemNoteId === targetNoteId) return false;
    const notes = monsterNotesRef.current;
    const itemNote = notes.find((note) => note.id === itemNoteId);
    const targetNote = notes.find((note) => note.id === targetNoteId);
    if (itemNote?.kind !== "item" || !itemNote.entry || targetNote?.kind !== "character" || !targetNote.character) return false;
    const itemName = itemNote.entry.name || noteDisplayName(itemNote);
    const nextEquipment = appendCharacterEquipmentItem(characterEquipmentText(targetNote.character), itemName);
    return updateLiveCharacterField(targetNote.id, "Equipment", nextEquipment);
  }

  function renameNote(noteId, nextTitle) {
    const normalizedTitle = String(nextTitle || "").trim();
    setMonsterNotes((notes) => {
      const nextNotes = notes.map((note) => (
        note.id === noteId ? { ...note, titleOverride: normalizedTitle } : note
      ));
      return persistLinkedTokenNotesInCollection(nextNotes, [noteId]);
    });
  }

  function promoteTabToRoot(notes, rootId, nextRootId) {
    return promoteTabToRootInCollection(notes, rootId, nextRootId);
  }

  function closeSingleTab(noteId) {
    setMonsterNotes((notes) => {
      const preparedNotes = persistLinkedTokenNotesInCollection(notes, [noteId]);
      return closeSingleNoteInCollection(preparedNotes, noteId);
    });
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
    setMonsterNotes((notes) => {
      const root = notes.find((note) => note.id === rootNoteId);
      const tabIds = new Set(noteTabIds(root));
      if (!root || !tabIds.has(tabNoteId)) return notes;
      const currentActiveTabId = root.activeTabId || root.id;
      if (currentActiveTabId === tabNoteId) return notes;
      const targetNote = notes.find((note) => note.id === tabNoteId) || root;
      const targetSize = noteTabFrameSize(targetNote, root);
      return notes.map((note) => {
        const memorySafeNote = note.id === currentActiveTabId ? unloadMapNoteImages(note) : note;
        if (memorySafeNote.id === rootNoteId) {
          const nextRoot = {
            ...memorySafeNote,
            activeTabId: tabNoteId,
            width: targetSize.width,
            height: targetSize.height
          };
          return currentActiveTabId === rootNoteId
            ? {
              ...nextRoot,
              tabFrameWidth: root.width,
              tabFrameHeight: root.height
            }
            : nextRoot;
        }
        if (memorySafeNote.id === currentActiveTabId && tabIds.has(memorySafeNote.id)) {
          return {
            ...memorySafeNote,
            width: root.width,
            height: root.height,
            tabFrameWidth: root.width,
            tabFrameHeight: root.height
          };
        }
        return memorySafeNote;
      });
    });
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
      const currentTargetActiveTabId = targetRoot.activeTabId || targetRootId;
      const nextActiveTabId = movedIds.includes(dragRoot.activeTabId) ? dragRoot.activeTabId : dragRootId;
      const nextActiveNote = notes.find((note) => note.id === nextActiveTabId) || dragRoot;
      const nextActiveSize = noteTabFrameSize(nextActiveNote, targetRoot);

      return notes.map((note) => {
        if (note.id === targetRootId) {
          const nextRoot = {
            ...note,
            tabNoteIds: [...(note.tabNoteIds || []), ...movedIds],
            activeTabId: nextActiveTabId,
            width: nextActiveSize.width,
            height: nextActiveSize.height,
            minimized: false,
            z: nextZ
          };
          return currentTargetActiveTabId === targetRootId
            ? {
              ...nextRoot,
              tabFrameWidth: targetRoot.width,
              tabFrameHeight: targetRoot.height
            }
            : nextRoot;
        }
        if (note.id === currentTargetActiveTabId && targetTabIds.has(note.id)) {
          return {
            ...note,
            width: targetRoot.width,
            height: targetRoot.height,
            tabFrameWidth: targetRoot.width,
            tabFrameHeight: targetRoot.height
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
      if (notes.some((note) => idsToRemove.has(note.id) && mapNoteHasTokens(note))) return notes;
      notes.filter((note) => idsToRemove.has(note.id)).forEach(releaseMapNoteImages);
      const preparedNotes = persistLinkedTokenNotesInCollection(notes, idsToRemove);
      return preparedNotes.filter((note) => !idsToRemove.has(note.id));
    });
  }

  function noteIdsForClose(noteId, closeGroup) {
    const notes = monsterNotesRef.current;
    const rootId = resolveRootNoteId(noteId, notes);
    if (!rootId) return [];
    const root = notes.find((note) => note.id === rootId);
    if (!root) return [];
    return closeGroup ? noteTabIds(root) : [noteId];
  }

  function completeNoteClose({ noteId, closeGroup }) {
    if (closeGroup) closeNote(noteId);
    else closeSingleTab(noteId);
  }

  function requestNoteClose(noteId, closeGroup) {
    const notes = monsterNotesRef.current;
    const idsToClose = noteIdsForClose(noteId, closeGroup);
    if (!idsToClose.length) return;
    const noteIdSet = new Set(idsToClose);
    const closingNotes = notes.filter((note) => noteIdSet.has(note.id));
    if (closingNotes.some(mapNoteHasTokens)) return;
    const notesToSave = closingNotes.filter(shouldOfferBoardNoteSave);
    if (!notesToSave.length) {
      completeNoteClose({ noteId, closeGroup });
      return;
    }
    setPendingNoteClose({ noteId, closeGroup, notes: notesToSave });
  }

  function savePendingNotesAndClose() {
    if (!pendingNoteClose) return;
    const savedNotes = pendingNoteClose.notes.map(createSavedBoardNote);
    setSavedBoardNotes((currentNotes) => [...currentNotes, ...savedNotes]);
    const closeRequest = pendingNoteClose;
    setPendingNoteClose(null);
    completeNoteClose(closeRequest);
  }

  function discardPendingNotesAndClose() {
    if (!pendingNoteClose) return;
    const closeRequest = pendingNoteClose;
    setPendingNoteClose(null);
    completeNoteClose(closeRequest);
  }

  function handleNoteClose(noteId, event) {
    const resolvedNoteId = isModifierEvent(noteId) ? null : noteId;
    const resolvedEvent = isModifierEvent(noteId) ? noteId : event;
    const shiftPressed = Boolean(resolvedEvent?.shiftKey || resolvedEvent?.nativeEvent?.shiftKey);
    if (!resolvedNoteId) return;
    resolvedEvent?.preventDefault?.();
    resolvedEvent?.stopPropagation?.();
    requestNoteClose(resolvedNoteId, shiftPressed);
  }

  function focusNote(noteId) {
    const rootId = resolveRootNoteId(noteId, monsterNotes);
    if (!rootId) return;
    focusedRootNoteIdRef.current = rootId;
    zRef.current += 1;
    setMonsterNotes((notes) => notes.map((note) => note.id === rootId ? { ...note, z: zRef.current } : note));
  }

  function minimizeNote(noteId) {
    setMonsterNotes((notes) => {
      const rootId = resolveRootNoteId(noteId, notes);
      const root = notes.find((note) => note.id === rootId);
      const activeTabId = root?.activeTabId || rootId;
      return notes.map((note) => {
        const memorySafeNote = note.id === activeTabId ? unloadMapNoteImages(note) : note;
        return memorySafeNote.id === rootId ? { ...memorySafeNote, minimized: true, dicePanelOpen: false } : memorySafeNote;
      });
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
    const note = monsterNotesRef.current.find((entry) => entry.id === noteId);
    if (note?.livePlayerId) {
      updateLiveCharacterField(noteId, field === "max" ? "HPMax" : "HPCurrent", value);
      return;
    }
    const numericValue = value === "" ? "" : Number(value);
    setMonsterNotes((notes) => {
      const nextNotes = notes.map((note) => (
        note.id === noteId ? { ...note, [field === "max" ? "hpMax" : "hpCurrent"]: numericValue } : note
      ));
      return persistLinkedTokenNotesInCollection(nextNotes, [noteId]);
    });
  }

  function rollNoteHp(noteId) {
    const note = monsterNotes.find((entry) => entry.id === noteId);
    const expression = note?.monster?.hp?.formula;
    if (!note || !expression) return;
    const roll = rollDiceExpression(expression);
    setMonsterNotes((notes) => {
      const nextNotes = notes.map((entry) => (
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
      ));
      return persistLinkedTokenNotesInCollection(nextNotes, [noteId]);
    });
  }

  function recordMonsterRoll(noteId, label, roll) {
    setMonsterNotes((notes) => {
      const nextNotes = notes.map((note) => {
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
      });
      return persistLinkedTokenNotesInCollection(nextNotes, [noteId]);
    });
  }

  function toggleMonsterDicePanel(noteId) {
    setMonsterNotes((notes) => {
      const nextNotes = notes.map((note) => (
        note.id === noteId ? { ...note, dicePanelOpen: !note.dicePanelOpen } : note
      ));
      return persistLinkedTokenNotesInCollection(nextNotes, [noteId]);
    });
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
    setTokenContextMenu(null);
    setMarkerContextMenu(null);
    const viewportWidth = window.innerWidth || 1200;
    const viewportHeight = window.innerHeight || 800;
    const boardPoint = clampBoardPoint(screenToBoardPoint(event.clientX, event.clientY), NOTE_MIN_WIDTH, NOTE_MIN_HEIGHT);
    setContextMenu({
      x: clamp(event.clientX, 0, viewportWidth - 1),
      y: clamp(event.clientY, 0, viewportHeight - 1),
      boardX: boardPoint.x,
      boardY: boardPoint.y
    });
  }

  function closeBoardContextMenu(event) {
    if (!contextMenu && !tokenContextMenu && !markerContextMenu) return;
    if (event.target?.closest?.("[data-context-menu='true']")) return;
    setContextMenu(null);
    setTokenContextMenu(null);
    setMarkerContextMenu(null);
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

  function openContextMapNote() {
    if (!contextMenu) return;
    addMapNote({ x: contextMenu.boardX, y: contextMenu.boardY });
  }

  function isBoardUiBlocker(event) {
    return Boolean(event.target?.closest?.("[data-monster-picker='true'], [data-obsidian-picker='true'], [data-context-menu='true'], [data-character-code-modal='true'], [data-homebrew-monster-modal='true'], [data-board-control='true']"));
  }

  function isPointerOverNote(event) {
    return Boolean(event.target?.closest?.("[data-dm-note='true']"));
  }

  function isPointerOverMonsterNote(event) {
    const noteElement = event.target?.closest?.("[data-dm-note='true']");
    return noteElement?.dataset?.noteKind === "monster";
  }

  function shouldIgnoreBoardPointer(event, { allowNote = false } = {}) {
    if (isBoardUiBlocker(event)) return true;
    return !allowNote && isPointerOverNote(event);
  }

  function startBoardPan(event, { allowNote = false } = {}) {
    if (event.button != null && event.button !== 0 && event.button !== 1) return;
    if (dragRef.current || resizeRef.current || selectionRef.current || shouldIgnoreBoardPointer(event, { allowNote })) return;
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
    if (event.shiftKey || event.altKey || event.button === 1) startBoardPan(event);
    else startBoardSelection(event);
  }

  function handleBoardPointerDownCapture(event) {
    if (!event.shiftKey || !isPointerOverNote(event) || isBoardUiBlocker(event)) return;
    if (isPointerOverMonsterNote(event)) return;
    closeBoardContextMenu(event);
    startBoardPan(event, { allowNote: true });
    if (panRef.current?.pointerId === event.pointerId) event.stopPropagation();
  }

  function handleBoardWheel(event) {
    if (isBoardUiBlocker(event)) return;
    if (isPointerOverNote(event) && !event.shiftKey) return;
    if (event.cancelable) event.preventDefault();
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
    const activeDragNote = activeNoteForRoot(rootId, monsterNotes);
    const isActorShiftDrag = event.shiftKey && ["monster", "character"].includes(activeDragNote?.kind);
    if ((event.shiftKey && !isActorShiftDrag) || event.ctrlKey || event.metaKey) {
      setSelectedRootNoteIds((ids) => (
        ids.includes(rootId) ? ids.filter((id) => id !== rootId) : [...ids, rootId]
      ));
      focusNote(rootId);
      return;
    }
    const rootNotes = monsterNotes.filter((entry) => !entry.parentNoteId);
    const selectedDragIds = isActorShiftDrag
      ? [rootId]
      : (
        selectedRootNoteIds.includes(rootId)
          ? selectedRootNoteIds.filter((id) => rootNotes.some((entry) => entry.id === id))
          : [rootId]
      );
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
      createActorTokenOnDrop: isActorShiftDrag,
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

  function schedulePointerFrame(operation, event, callback) {
    operation.pendingClientX = event.clientX;
    operation.pendingClientY = event.clientY;
    if (operation.rafId) return;
    operation.rafId = window.requestAnimationFrame(() => {
      operation.rafId = null;
      callback(operation.pendingClientX, operation.pendingClientY);
    });
  }

  function cancelPointerFrame(operation) {
    if (!operation?.rafId) return;
    window.cancelAnimationFrame(operation.rafId);
    operation.rafId = null;
  }

  function updateResizeFrame(resize, clientX, clientY) {
    const maxWidth = Math.max(NOTE_MIN_WIDTH, BOARD_WIDTH - resize.x - BOARD_PADDING);
    const maxHeight = Math.max(NOTE_MIN_HEIGHT, BOARD_HEIGHT - resize.y - BOARD_PADDING);
    const deltaX = (clientX - resize.startX) / resize.scale;
    const deltaY = (clientY - resize.startY) / resize.scale;
    const width = resize.edge === "right" || resize.edge === "corner"
      ? clamp(resize.startWidth + deltaX, NOTE_MIN_WIDTH, maxWidth)
      : resize.startWidth;
    const height = resize.edge === "bottom" || resize.edge === "corner"
      ? clamp(resize.startHeight + deltaY, NOTE_MIN_HEIGHT, maxHeight)
      : resize.startHeight;
    setMonsterNotes((notes) => {
      const root = notes.find((note) => note.id === resize.noteId);
      const activeTabId = root?.activeTabId || resize.noteId;
      const tabIds = new Set(noteTabIds(root));
      return notes.map((note) => {
        if (note.id === resize.noteId) {
          const nextRoot = { ...note, width, height };
          if (note.kind === "map") {
            const activePageId = note.activeMapPageId || activeMapPageForNote(note)?.id;
            const nextMapRoot = updateMapNotePage(nextRoot, activePageId, (page) => ({
              ...page,
              frameWidth: width,
              frameHeight: height
            }));
            return { ...nextMapRoot, tabFrameWidth: width, tabFrameHeight: height };
          }
          return activeTabId === resize.noteId
            ? { ...nextRoot, tabFrameWidth: width, tabFrameHeight: height }
            : nextRoot;
        }
        if (note.id === activeTabId && tabIds.has(note.id)) {
          const nextActiveTab = {
            ...note,
            width,
            height,
            tabFrameWidth: width,
            tabFrameHeight: height
          };
          if (note.kind !== "map") return nextActiveTab;
          const activePageId = note.activeMapPageId || activeMapPageForNote(note)?.id;
          return updateMapNotePage(nextActiveTab, activePageId, (page) => ({
            ...page,
            frameWidth: width,
            frameHeight: height
          }));
        }
        return note;
      });
    });
  }

  function updateBoardDragFrame(drag, clientX, clientY) {
    drag.lastClientX = clientX;
    drag.lastClientY = clientY;
    const deltaX = (clientX - drag.startClientX) / drag.scale;
    const deltaY = (clientY - drag.startClientY) / drag.scale;
    const nextPoint = clampBoardPoint({
      x: drag.startNoteX + deltaX,
      y: drag.startNoteY + deltaY
    }, drag.width, drag.height);
    const nextX = nextPoint.x;
    const nextY = nextPoint.y;
    const isGroupDrag = Array.isArray(drag.noteIds) && drag.noteIds.length > 1;
    const dropTargetId = isGroupDrag ? null : findDragDropTarget(drag.noteId, { x: nextX + drag.width / 2, y: nextY + drag.height / 2 }, monsterNotesRef.current);
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

  function updateDrag(event) {
    const mapMarkerDrag = mapMarkerDragRef.current;
    if (mapMarkerDrag?.pointerId === event.pointerId) {
      schedulePointerFrame(mapMarkerDrag, event, (clientX, clientY) => {
        const frameEvent = { clientX, clientY };
        if (mapMarkerDrag.mode === "resize") resizeMapMarker(frameEvent, mapMarkerDrag);
        else moveMapMarker(frameEvent, mapMarkerDrag);
      });
      return;
    }

    const mapTokenDrag = mapTokenDragRef.current;
    if (mapTokenDrag?.pointerId === event.pointerId) {
      schedulePointerFrame(mapTokenDrag, event, (clientX, clientY) => moveMapToken({ clientX, clientY }, mapTokenDrag));
      return;
    }

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
      schedulePointerFrame(resize, event, (clientX, clientY) => updateResizeFrame(resize, clientX, clientY));
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
    schedulePointerFrame(drag, event, (clientX, clientY) => updateBoardDragFrame(drag, clientX, clientY));
  }

  function stopDrag(event) {
    if (mapMarkerDragRef.current?.pointerId === event.pointerId) {
      const drag = mapMarkerDragRef.current;
      cancelPointerFrame(drag);
      if (drag.pendingClientX != null && drag.pendingClientY != null) {
        const frameEvent = { clientX: drag.pendingClientX, clientY: drag.pendingClientY };
        if (drag.mode === "resize") resizeMapMarker(frameEvent, drag);
        else moveMapMarker(frameEvent, drag);
      }
      mapMarkerDragRef.current = null;
    }
    if (mapTokenDragRef.current?.pointerId === event.pointerId) {
      const drag = mapTokenDragRef.current;
      cancelPointerFrame(drag);
      if (drag.pendingClientX != null && drag.pendingClientY != null) moveMapToken({ clientX: drag.pendingClientX, clientY: drag.pendingClientY }, drag);
      commitMapTokenDrag(drag);
      mapTokenDragRef.current = null;
    }
    if (selectionRef.current?.pointerId === event.pointerId) {
      const completedSelection = selectionRef.current;
      selectionRef.current = null;
      setSelectionBox(null);
      if (!completedSelection.moved && !completedSelection.append) setSelectedRootNoteIds([]);
    }
    if (tabDragRef.current?.pointerId === event.pointerId) tabDragRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) {
      const completedDrag = dragRef.current;
      cancelPointerFrame(completedDrag);
      if (completedDrag.pendingClientX != null && completedDrag.pendingClientY != null) {
        updateBoardDragFrame(completedDrag, completedDrag.pendingClientX, completedDrag.pendingClientY);
      }
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
      if (completedDrag.moved && (!completedDrag.noteIds || completedDrag.noteIds.length <= 1)) {
        const lastClientX = completedDrag.lastClientX ?? event.clientX;
        const lastClientY = completedDrag.lastClientY ?? event.clientY;
        const characterEquipmentDropTarget = findCharacterEquipmentDropTarget(lastClientX, lastClientY, completedDrag.noteId);
        if (characterEquipmentDropTarget && addItemNoteToCharacterEquipment(completedDrag.noteId, characterEquipmentDropTarget.dataset.dropNoteId)) {
          return;
        }
        if (addItemNoteToCharacterEquipment(completedDrag.noteId, completedDrag.dropTargetNoteId)) {
          return;
        }
        const dropTargetActiveNote = completedDrag.dropTargetNoteId ? activeNoteForRoot(completedDrag.dropTargetNoteId) : null;
        const mapDropTargetId = findMapDropTargetAtPointer(completedDrag.noteId, lastClientX, lastClientY)
          || (dropTargetActiveNote?.kind === "map" ? completedDrag.dropTargetNoteId : null);
        if (mapDropTargetId) {
          if ((completedDrag.createActorTokenOnDrop || event.shiftKey) && addActorTokenToMap(
            completedDrag.noteId,
            mapDropTargetId,
            lastClientX,
            lastClientY
          )) {
            restoreDraggedNotesToStart(completedDrag);
          }
          return;
        }
        if (completedDrag.dropTargetNoteId) groupNoteIntoRoot(completedDrag.noteId, completedDrag.dropTargetNoteId);
      }
    }
    if (resizeRef.current?.pointerId === event.pointerId) {
      const resize = resizeRef.current;
      cancelPointerFrame(resize);
      if (resize.pendingClientX != null && resize.pendingClientY != null) updateResizeFrame(resize, resize.pendingClientX, resize.pendingClientY);
      resizeRef.current = null;
    }
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
    flushBoardStateSave();
  }

  const activeTokenContext = findMapTokenContextEntry();
  const activeTokenContextTargets = activeTokenContext ? mapTokenContextTargets(activeTokenContext) : [];
  const activeTokenContextTargetCount = activeTokenContextTargets.length || (activeTokenContext ? 1 : 0);
  const activeMarkerContext = findMapMarkerContextEntry();
  const pendingMapMarkerAttachEntry = pendingMapMarkerAttach ? findMapMarkerContextEntry(pendingMapMarkerAttach) : null;

  return (
    <main
      ref={boardRootRef}
      className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-200"
      onContextMenu={openBoardContextMenu}
      onPointerDownCapture={handleBoardPointerDownCapture}
      onPointerDown={handleBoardPointerDown}
      onPointerMove={updateDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
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
      {pendingMapMarkerAttachEntry ? (
        <div
          className="fixed left-1/2 top-4 z-[10004] flex -translate-x-1/2 items-center gap-3 border border-emerald-500 bg-neutral-950 px-4 py-2 text-xs font-bold uppercase text-emerald-100 shadow-2xl"
          data-board-control="true"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span>Attach: click izquierdo en el token</span>
          <button
            className="border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200 hover:bg-neutral-800"
            type="button"
            onClick={() => setPendingMapMarkerAttach(null)}
          >
            Cancelar
          </button>
        </div>
      ) : null}
      <LivePlayersPanel
        status={liveServerStatus}
        diagnostics={liveDiagnostics}
        port={liveHostPort}
        error={liveHostError}
        players={livePlayers}
        collapsed={livePlayersCollapsed}
        tokenEnabled={liveHostTokenEnabled}
        onToggleCollapsed={() => setLivePlayersCollapsed((value) => !value)}
        onPortChange={setLiveHostPort}
        onTokenEnabledChange={setLiveHostTokenEnabled}
        onStart={startLiveHost}
        onStop={stopLiveHost}
        onRunSelfTest={runLiveHostSelfTest}
        onKick={kickLivePlayer}
        onAddMapNote={() => addMapNote()}
      />
      <SoundBarPanel
        sounds={soundButtons}
        collapsed={soundBarCollapsed}
        error={soundBarError}
        busyId={soundBarBusyId}
        activeSoundIds={activeSoundIds}
        connectedPlayerCount={livePlayers.filter((player) => player.connected).length}
        fileInputRef={soundFileInputRef}
        onToggleCollapsed={() => setSoundBarCollapsed((value) => !value)}
        onPickFiles={pickSoundFiles}
        onFilesSelected={addSoundFiles}
        onRename={renameSoundButton}
        onPlay={playSoundButton}
        onPause={pauseSoundButton}
        onDelete={deleteSoundButton}
      />
      <RaisedHandsNote hands={raisedHands} onLowerHand={lowerRaisedHand} />
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
          const activeFrameSize = activeNote.id === rootNote.id
            ? { width: rootNote.width, height: rootNote.height }
            : noteTabFrameSize(activeNote, rootNote);
          const activeFrameNote = {
            ...rootNote,
            width: activeFrameSize.width,
            height: activeFrameSize.height
          };
          const isActiveSharedMap = activeNote.kind === "map"
            && sharedVvtTarget?.note?.id === activeNote.id
            && sharedVvtTarget?.page?.id === activeMapPageForNote(activeNote)?.id;
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
            shellNote: activeFrameNote,
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
              onMonsterPanelSelect={selectMonsterPanel}
              onMonsterTextNoteAdd={addMonsterTextNote}
              onMonsterTextNoteRename={renameMonsterTextNote}
              onMonsterTextNoteChange={updateMonsterTextNote}
              onMonsterTextNoteRemove={removeMonsterTextNote}
            />
          ) : activeNote.kind === "character" ? (
            <CharacterNote
              {...sharedProps}
              onHpChange={updateNoteHp}
              onCharacterFieldChange={updateLiveCharacterField}
              onOpenResource={addCharacterResourceNote}
            />
          ) : activeNote.kind === "text" ? (
            <TextNote
              {...sharedProps}
              onTextChange={updateTextNote}
              onTextImagePaste={addTextNoteImage}
              onTextImageRemove={removeTextNoteImage}
            />
          ) : activeNote.kind === "map" ? (
            <MapNote
              {...sharedProps}
              onMapImageChange={updateMapNoteImage}
              onMapGridChange={updateMapGrid}
              onMapPageAdd={addMapPage}
              onMapPageSelect={selectMapPage}
              onMapPageRename={renameMapPage}
              onMapPageClose={closeMapPage}
              onMapFogChange={updateMapFog}
              onShareVvtMap={(noteId, pageId) => setSharedVvtMap({ noteId, pageId })}
              onMapPing={publishDmVvtPing}
              isSharedVvtMap={isActiveSharedMap}
              vvtPings={isActiveSharedMap ? vvtPings : []}
              onMapTokenHpChange={updateMapTokenHp}
              onMapTokensRollInitiative={rollMapTokensInitiative}
              onMapTokenGroupAdd={addMapTokenGroup}
              onMapTokenGroupRename={renameMapTokenGroup}
              onMapTokenGroupRemove={removeMapTokenGroup}
              onMapTokenGroupChange={changeMapTokenGroup}
              onMapTokenGroupGlobalChange={setMapTokenGroupGlobal}
              onMapTokenGroupCombatChange={setMapTokenGroupCombat}
              onMapTrackerTokenDrop={dropMapTrackerToken}
              selectedMapTokenIds={selectedMapTokens.mapNoteId === activeNote.id && selectedMapTokens.pageId === activeMapPageForNote(activeNote)?.id ? selectedMapTokens.tokenIds : []}
              onMapTokenSelectionChange={setMapTokenSelection}
              onMapTokenDragStart={startMapTokenDrag}
              onMapTokenContextMenu={openMapTokenContextMenu}
              onMapContextAddMonster={openMonsterTokenPicker}
              onMapContextAddNpc={openNpcTokenPicker}
              onMapMarkerAdd={addMapMarker}
              onMapMarkerRename={renameMapMarker}
              onMapMarkerDragStart={startMapMarkerDrag}
              onMapMarkerResizeStart={startMapMarkerResize}
              onMapMarkerContextMenu={openMapMarkerContextMenu}
              boardScale={boardView.scale}
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
          const tabs = groupTabNotes(note, monsterNotes);
          const activeNote = tabs.find((entry) => entry.id === note.activeTabId) || note;
          const activeFrameSize = activeNote.id === note.id
            ? { width: note.width, height: note.height }
            : noteTabFrameSize(activeNote, note);
          const rect = noteFrameRect({
            ...note,
            width: activeFrameSize.width,
            height: activeFrameSize.height
          });
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
            <p className="mt-1 text-sm italic text-neutral-400">
              {librariesError ? "No se pudieron cargar las librerias" : librariesReady ? "Encounter board" : "Cargando librerias y restaurando tablero..."}
            </p>
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
              <div className="mt-1 font-semibold text-sky-300">{librariesReady ? "Ready" : "Loading"}</div>
            </div>
          </div>
          {librariesError ? <p className="border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">{librariesError}</p> : null}
        </section>
      ) : null}

      {markerContextMenu && activeMarkerContext ? createPortal((
        <div
          className="fixed z-[10002] min-w-48 border border-neutral-700 bg-neutral-900 p-1 text-sm text-neutral-200 shadow-2xl"
          data-context-menu="true"
          style={{ left: markerContextMenu.x, top: markerContextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="border-b border-neutral-800 px-3 py-2">
            <p className="truncate font-serif text-base font-bold uppercase text-amber-500">
              {activeMarkerContext.marker.label || "Marker"}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              {activeMarkerContext.marker.markerType === "shape"
                ? `${MAP_MARKER_FORM_LABELS[activeMarkerContext.marker.formType] || "Forma"}${activeMarkerContext.marker.hidden ? " - hidden" : ""}`
                : (activeMarkerContext.marker.hidden ? "Map marker - hidden" : "Map marker")}
            </p>
          </div>
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-amber-500 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
            type="button"
            onClick={renameMapMarkerFromMenu}
          >
            <span>Cambiar nombre</span>
            <span className="text-neutral-500">Aa</span>
          </button>
          {markerContextMenu.renaming ? (
            <form className="grid gap-2 border-b border-neutral-800 p-2" onSubmit={commitMapMarkerRenameFromMenu}>
              <input
                className="h-8 border border-amber-500 bg-neutral-950 px-2 text-sm font-bold text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                value={markerContextMenu.draft || ""}
                autoFocus
                onChange={(event) => setMarkerContextMenu((menu) => (menu ? { ...menu, draft: event.target.value } : menu))}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setMarkerContextMenu((menu) => (menu ? { ...menu, renaming: false, draft: "" } : menu));
                  }
                }}
              />
              <div className="grid grid-cols-2 gap-1">
                <button
                  className="border border-amber-500 bg-amber-500 px-2 py-1 text-xs font-bold uppercase text-neutral-950 hover:bg-amber-400"
                  type="submit"
                >
                  Guardar
                </button>
                <button
                  className="border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs font-bold uppercase text-neutral-200 hover:bg-neutral-800"
                  type="button"
                  onClick={() => setMarkerContextMenu((menu) => (menu ? { ...menu, renaming: false, draft: "" } : menu))}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : null}
          {activeMarkerContext.marker.markerType === "pin" ? (
            <div className="grid gap-2 border-b border-neutral-800 p-2">
              <span className="px-1 text-[11px] font-bold uppercase tracking-wide text-neutral-500">Icono</span>
              <div className="grid grid-cols-2 gap-1">
                {MAP_MARKER_ICON_OPTIONS.map((option) => {
                  const active = normalizeMapMarkerIcon(activeMarkerContext.marker.icon) === option.value;
                  return (
                    <button
                      key={option.value}
                      className={`flex items-center gap-2 border px-2 py-1.5 text-left text-xs font-bold uppercase ${active ? "border-amber-400 bg-amber-500 text-neutral-950" : "border-neutral-700 bg-neutral-950 text-neutral-200 hover:border-neutral-500 hover:bg-neutral-800"}`}
                      type="button"
                      onClick={() => updateMapMarkerIconFromMenu(option.value)}
                    >
                      <MapMarkerIcon icon={option.value} className="h-4 w-4 shrink-0" />
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {activeMarkerContext.marker.markerType === "shape" ? (
            <div className="grid gap-2 border-b border-neutral-800 p-2">
              <label className="grid gap-1 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Forma</span>
                <select
                  className="h-8 border border-neutral-700 bg-neutral-950 px-2 text-xs font-bold uppercase text-neutral-100 focus:border-amber-400 focus:outline-none"
                  value={normalizeMapMarkerFormType(activeMarkerContext.marker.formType)}
                  onChange={(event) => updateMapMarkerFormTypeFromMenu(event.target.value)}
                >
                  {[
                    ["cone", "Cono"],
                    ["square", "Cuadrado"],
                    ["circle", "Circulo"]
                  ].map(([formType, label]) => (
                    <option key={formType} value={formType}>{label}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-1">
                <button
                  className="flex w-full items-center justify-between border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-left text-xs font-bold uppercase text-emerald-200 hover:border-emerald-500 hover:bg-emerald-950/40"
                  type="button"
                  onClick={startMapMarkerAttachFromMenu}
                >
                  <span>{activeMarkerContext.marker.attachedTokenId ? "Re-attach" : "Attach"}</span>
                  <span className="text-neutral-500">Token</span>
                </button>
                {activeMarkerContext.marker.attachedTokenId ? (
                  <button
                    className="flex w-full items-center justify-between border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-left text-xs font-bold uppercase text-red-200 hover:border-red-500 hover:bg-red-950/40"
                    type="button"
                    onClick={detachMapMarkerFromMenu}
                  >
                    <span>Detach</span>
                    <span className="text-neutral-500">x</span>
                  </button>
                ) : null}
              </div>
              <div className="grid gap-1">
                <span className="px-1 text-[11px] font-bold uppercase tracking-wide text-neutral-500">Girar {Math.round(Number(activeMarkerContext.marker.rotation) || 0)}deg</span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs font-bold uppercase text-neutral-200 hover:border-neutral-500 hover:bg-neutral-800"
                    type="button"
                    onClick={() => rotateMapMarkerFromMenu(-15)}
                  >
                    -15
                  </button>
                  <button
                    className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs font-bold uppercase text-neutral-200 hover:border-neutral-500 hover:bg-neutral-800"
                    type="button"
                    onClick={() => rotateMapMarkerFromMenu(15)}
                  >
                    +15
                  </button>
                  <button
                    className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs font-bold uppercase text-neutral-200 hover:border-neutral-500 hover:bg-neutral-800"
                    type="button"
                    onClick={() => rotateMapMarkerFromMenu(-(Number(activeMarkerContext.marker.rotation) || 0))}
                  >
                    Reset
                  </button>
                </div>
              </div>
              <span className="px-1 text-[11px] font-bold uppercase tracking-wide text-neutral-500">Color</span>
              <div className="grid grid-cols-3 gap-1">
                {MAP_MARKER_COLOR_OPTIONS.map((option) => {
                  const active = normalizeMapMarkerColor(activeMarkerContext.marker.color) === option.value;
                  return (
                    <button
                      key={option.value}
                      className={`flex items-center gap-2 border px-2 py-1 text-left text-xs font-bold uppercase ${active ? "border-amber-400 bg-neutral-800 text-amber-100" : "border-neutral-700 bg-neutral-950 text-neutral-200 hover:border-neutral-500 hover:bg-neutral-800"}`}
                      type="button"
                      onClick={() => updateMapMarkerColorFromMenu(option.value)}
                    >
                      <span
                        className="h-3 w-3 border border-neutral-950"
                        style={{ backgroundColor: option.value }}
                      />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
              <label className="grid gap-1 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                  Transparencia {Math.round(normalizeMapMarkerOpacity(activeMarkerContext.marker.opacity) * 100)}%
                </span>
                <input
                  type="range"
                  min={Math.round(MAP_MARKER_OPACITY_MIN * 100)}
                  max={Math.round(MAP_MARKER_OPACITY_MAX * 100)}
                  value={Math.round(normalizeMapMarkerOpacity(activeMarkerContext.marker.opacity) * 100)}
                  onChange={(event) => updateMapMarkerOpacityFromMenu(event.target.value)}
                />
              </label>
              <label className="grid gap-1 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Pattern / Mask</span>
                <select
                  className="h-8 border border-neutral-700 bg-neutral-950 px-2 text-xs font-bold uppercase text-neutral-100 focus:border-amber-400 focus:outline-none"
                  value={normalizeMapMarkerPattern(activeMarkerContext.marker.pattern)}
                  onChange={(event) => updateMapMarkerPatternFromMenu(event.target.value)}
                >
                  {MAP_MARKER_PATTERN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-sky-200 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
            type="button"
            onClick={toggleMapMarkerHiddenFromMenu}
          >
            <span>Hide</span>
            <span className="text-neutral-500">{activeMarkerContext.marker.hidden ? "ON" : "OFF"}</span>
          </button>
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-red-300 hover:bg-red-950/40 focus:bg-red-950/40 focus:outline-none"
            type="button"
            onClick={removeMapMarkerFromMenu}
          >
            <span>Eliminar marker</span>
            <span className="text-neutral-500">X</span>
          </button>
        </div>
      ), document.body) : null}

      {tokenContextMenu && activeTokenContext ? createPortal((
        <div
          className="fixed z-[10002] min-w-52 border border-neutral-700 bg-neutral-900 p-1 text-sm text-neutral-200 shadow-2xl"
          data-context-menu="true"
          style={{ left: tokenContextMenu.x, top: tokenContextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="border-b border-neutral-800 px-3 py-2">
            <p className="truncate font-serif text-base font-bold uppercase text-amber-500">
              {activeTokenContext.token.name || activeTokenContext.token.character?.name || activeTokenContext.token.monster?.name || "Token"}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              {`${activeTokenContext.token.kind === "character" ? "Player token" : "Monster token"}${activeTokenContext.token.hidden ? " - hidden" : ""}${activeTokenContext.token.identityHidden ? " - identity hidden" : ""}${activeTokenContext.token.nameHidden ? " - name hidden" : ""}`}
            </p>
            {activeTokenContextTargetCount > 1 ? (
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-sky-300">
                {activeTokenContextTargetCount} tokens seleccionados
              </p>
            ) : null}
          </div>
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-amber-500 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
            type="button"
            onClick={duplicateMapTokenFromMenu}
          >
            <span>Multiplicar</span>
            <span className="text-neutral-500">x2</span>
          </button>
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-sky-200 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
            type="button"
            onClick={toggleMapTokenHiddenFromMenu}
          >
            <span>Ocultar token</span>
            <span className="text-neutral-500">{activeTokenContext.token.hidden ? "ON" : "OFF"}</span>
          </button>
          {activeTokenContext.token.kind !== "character" ? (
            <>
              <button
                className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-cyan-200 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
                type="button"
                onClick={toggleMapTokenNameHiddenFromMenu}
              >
                <span>Ocultar nombre</span>
                <span className="text-neutral-500">{activeTokenContext.token.nameHidden ? "ON" : "OFF"}</span>
              </button>
              <button
                className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-violet-200 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
                type="button"
                onClick={toggleMapTokenIdentityHiddenFromMenu}
              >
                <span>Ocultar identidad</span>
                <span className="text-neutral-500">{activeTokenContext.token.identityHidden ? "ON" : "OFF"}</span>
              </button>
            </>
          ) : null}
          <div className="grid grid-cols-2 gap-1 border-y border-neutral-800 p-1">
            <button
              className="px-3 py-2 text-left font-bold text-sky-200 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none disabled:cursor-not-allowed disabled:text-neutral-600"
              type="button"
              onClick={() => resizeMapTokenFromMenu(-8)}
              disabled={activeTokenContextTargets.every((token) => (Number(token.size) || MAP_TOKEN_SIZE) <= 32)}
            >
              - Tamaño
            </button>
            <button
              className="px-3 py-2 text-left font-bold text-sky-200 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none disabled:cursor-not-allowed disabled:text-neutral-600"
              type="button"
              onClick={() => resizeMapTokenFromMenu(8)}
              disabled={activeTokenContextTargets.every((token) => (Number(token.size) || MAP_TOKEN_SIZE) >= 140)}
            >
              + Tamaño
            </button>
          </div>
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-amber-500 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none disabled:cursor-not-allowed disabled:text-neutral-600"
            type="button"
            onClick={openActorNoteFromMapToken}
            disabled={!actorNotePayloadFromMapToken(activeTokenContext.token)}
          >
            <span>{activeTokenContext.token.kind === "character" ? "Ver nota del jugador" : "Ver nota del monstruo"}</span>
            <span className="text-neutral-500">+</span>
          </button>
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-red-300 hover:bg-red-950/40 focus:bg-red-950/40 focus:outline-none"
            type="button"
            onClick={removeMapTokenFromMenu}
          >
            <span>{activeTokenContextTargetCount > 1 ? "Eliminar tokens" : "Eliminar token"}</span>
            <span className="text-neutral-500">X</span>
          </button>
        </div>
      ), document.body) : null}

      {contextMenu ? createPortal((
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
            onClick={openSavedBoardNotes}
          >
            <span>Cargar</span>
            <span className="text-neutral-500">↗</span>
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
            onClick={openContextMapNote}
          >
            <span>Add VVT Map</span>
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
      ), document.body) : null}

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
      <NoteCloseSaveModal
        pendingClose={pendingNoteClose}
        onSave={savePendingNotesAndClose}
        onDiscard={discardPendingNotesAndClose}
        onCancel={() => setPendingNoteClose(null)}
      />
      <SavedBoardNotesModal
        isOpen={isSavedBoardNotesOpen}
        savedNotes={savedBoardNotes}
        onLoad={loadSavedBoardNote}
        onClose={closeSavedBoardNotes}
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
        onClose={() => {
          setIsPickerOpen(false);
          setPendingMapTokenTarget(null);
        }}
      />
      <NpcTokenPicker
        isOpen={isNpcTokenPickerOpen}
        tokens={filteredNpcTokens}
        selectedToken={selectedNpcToken}
        searchQuery={npcTokenSearchQuery}
        loading={npcTokenPickerLoading}
        error={npcTokenPickerError}
        onSearch={setNpcTokenSearchQuery}
        onSelect={setSelectedNpcToken}
        onAdd={addNpcTokenToMap}
        onClose={() => {
          setIsNpcTokenPickerOpen(false);
          setPendingMapTokenTarget(null);
        }}
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
