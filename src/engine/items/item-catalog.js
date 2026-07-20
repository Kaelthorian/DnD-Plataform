(function createItemCatalogModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndItemCatalog = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function itemCatalogFactory() {
  "use strict";

  const GENERATED_IDENTITY_FIELDS = Object.freeze([
    "catalogId",
    "catalogKey",
    "catalogParentId",
    "catalogVariantToken"
  ]);

  const AMMUNITION_BASE_OVERRIDES = Object.freeze({
    "sling bullets of althemone|mot": "sling bullet",
    "unbreakable arrow|xge": "arrow"
  });
  let automationRegistry = null;

  function setItemAutomationRegistry(registry) {
    automationRegistry = registry && typeof registry.augmentProfile === "function" ? registry : null;
    return automationRegistry;
  }

  function normalizeIdentityPart(value) {
    return String(value == null ? "" : value)
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function normalizeBaseItemReference(value) {
    if (value && typeof value === "object") {
      return `${normalizeIdentityPart(value.name)}|${normalizeIdentityPart(value.source)}`;
    }
    const [name = "", source = ""] = String(value || "").split("|");
    return `${normalizeIdentityPart(name)}|${normalizeIdentityPart(source)}`;
  }

  function normalizeAmmunitionName(value) {
    const [name = ""] = String(value || "").split("|");
    const normalized = normalizeIdentityPart(name);
    return normalized === "crossbow bolt" ? "bolt" : normalized;
  }

  function ammunitionBaseName(item = {}) {
    const explicitBase = normalizeAmmunitionName(item.baseItem);
    if (explicitBase) return explicitBase;
    const identity = `${normalizeIdentityPart(item.name)}|${normalizeIdentityPart(item.source)}`;
    return AMMUNITION_BASE_OVERRIDES[identity] || normalizeAmmunitionName(item.name);
  }

  function taggedReferenceParts(value) {
    const structured = value && typeof value === "object" && !Array.isArray(value) ? value : null;
    const raw = structured?.uid
      ?? structured?.value
      ?? structured?.id
      ?? (structured?.abbreviation ? `${structured.abbreviation}|${structured.source || ""}` : null)
      ?? (structured?.name ? `${structured.name}|${structured.source || ""}` : null)
      ?? value
      ?? "";
    const [code = "", source = ""] = String(raw).split("|");
    return {
      code: code.trim(),
      source: source.trim(),
      note: structured?.note == null ? "" : renderEntryText(structured.note)
    };
  }

  function resolveItemTypeMetadata(itemTypes = [], typeReference, seen = new Set()) {
    const { code, source } = taggedReferenceParts(typeReference);
    if (!code || !Array.isArray(itemTypes)) return null;
    const normalizedCode = normalizeIdentityPart(code);
    const normalizedSource = normalizeIdentityPart(source);
    const match = itemTypes.find((entry) => (
      normalizeIdentityPart(entry?.abbreviation) === normalizedCode
      && (!normalizedSource || normalizeIdentityPart(entry?.source) === normalizedSource)
    )) || itemTypes.find((entry) => normalizeIdentityPart(entry?.abbreviation) === normalizedCode) || null;
    if (!match) return null;
    const identity = `${normalizeIdentityPart(match.abbreviation)}|${normalizeIdentityPart(match.source)}`;
    if (seen.has(identity)) return { ...match };
    if (!match._copy) return { ...match };
    const nextSeen = new Set(seen);
    nextSeen.add(identity);
    const parent = resolveItemTypeMetadata(itemTypes, match._copy, nextSeen);
    return parent ? { ...parent, ...match, entries: match.entries ?? parent.entries } : { ...match };
  }

  function itemVariantToken(item = {}, context = {}) {
    if (context.variantToken) return String(context.variantToken);
    if (item.variantToken) return String(item.variantToken);
    const baseItem = context.baseItem || item.baseItem;
    if (context.specificVariant || item.genericVariant || baseItem) {
      const normalizedBase = normalizeBaseItemReference(baseItem || context.base || {});
      return `specific:${normalizedBase}`;
    }
    if (context.group || Array.isArray(item.items)) return "group";
    const typeCode = String(item.type || "").split("|")[0].toUpperCase();
    if (context.template || Array.isArray(item.variants) || item.inherits || typeCode === "GV") return "template";
    return "root";
  }

  function itemCatalogKey(item = {}, context = {}) {
    return [
      normalizeIdentityPart(item.name),
      normalizeIdentityPart(item.source),
      itemVariantToken(item, context)
    ].join("\u001f");
  }

  function itemCatalogId(item = {}, context = {}) {
    return `item:${encodeURIComponent(itemCatalogKey(item, context))}`;
  }

  function decorateItem(item = {}, context = {}) {
    const clean = { ...item };
    GENERATED_IDENTITY_FIELDS.forEach((field) => delete clean[field]);
    const catalogVariantToken = itemVariantToken(clean, context);
    const identityContext = { ...context, variantToken: catalogVariantToken };
    const catalogKey = itemCatalogKey(clean, identityContext);
    const catalogId = itemCatalogId(clean, identityContext);
    if (Array.isArray(clean.variants)) {
      clean.variants = clean.variants.map((variant) => {
        if (!variant || typeof variant !== "object") return variant;
        const nextVariant = { ...variant };
        if (variant.specificVariant && typeof variant.specificVariant === "object") {
          const baseItem = variant.specificVariant.baseItem
            || (variant.base ? `${variant.base.name || ""}|${variant.base.source || ""}` : "");
          nextVariant.specificVariant = decorateItem(variant.specificVariant, {
            specificVariant: true,
            baseItem,
            base: variant.base,
            parentId: catalogId
          });
        }
        return nextVariant;
      });
    }
    const decorated = {
      ...clean,
      catalogId,
      catalogKey,
      catalogVariantToken
    };
    if (context.parentId) decorated.catalogParentId = context.parentId;
    return decorated;
  }

  function attachCatalogIdentities(items = []) {
    if (!Array.isArray(items)) throw new TypeError("Item catalog must be an array.");
    return items.map((item) => decorateItem(item));
  }

  function collectCatalogRecords(items = []) {
    const records = [];
    items.forEach((item, index) => {
      records.push({ item, location: `item[${index}]`, specific: false });
      (item?.variants || []).forEach((variant, variantIndex) => {
        if (!variant?.specificVariant) return;
        records.push({
          item: variant.specificVariant,
          location: `item[${index}].variants[${variantIndex}].specificVariant`,
          specific: true,
          baseItem: variant.specificVariant.baseItem
            || (variant.base ? `${variant.base.name || ""}|${variant.base.source || ""}` : "")
        });
      });
    });
    return records;
  }

  function validateItemCatalog(items, options = {}) {
    const errors = [];
    if (!Array.isArray(items)) {
      const report = { ok: false, records: 0, specificVariants: 0, identities: 0, errors: ["Item catalog must be an array."] };
      if (options.throwOnError) {
        const error = new Error(report.errors[0]);
        error.report = report;
        throw error;
      }
      return report;
    }
    if (options.expectedCount != null && items.length !== Number(options.expectedCount)) {
      errors.push(`Expected ${Number(options.expectedCount)} top-level items, found ${items.length}.`);
    }
    const identities = new Map();
    const ids = new Map();
    const records = collectCatalogRecords(items);
    records.forEach((record) => {
      const item = record.item || {};
      const context = record.specific ? { specificVariant: true, baseItem: record.baseItem } : {};
      const label = record.location;
      if (!normalizeIdentityPart(item.name)) errors.push(`${label}: missing name.`);
      if (!normalizeIdentityPart(item.source)) errors.push(`${label}: missing source.`);
      if (record.specific && !normalizeIdentityPart(record.baseItem)) errors.push(`${label}: missing baseItem identity.`);
      const key = itemCatalogKey(item, context);
      const id = itemCatalogId(item, context);
      if (identities.has(key)) errors.push(`${label}: duplicate item identity also used by ${identities.get(key)}.`);
      else identities.set(key, label);
      if (ids.has(id)) errors.push(`${label}: duplicate catalogId also used by ${ids.get(id)}.`);
      else ids.set(id, label);
      if (item.catalogKey != null && item.catalogKey !== key) errors.push(`${label}: stale catalogKey.`);
      if (item.catalogId != null && item.catalogId !== id) errors.push(`${label}: stale catalogId.`);
      const token = itemVariantToken(item, context);
      if (item.catalogVariantToken != null && item.catalogVariantToken !== token) errors.push(`${label}: stale catalogVariantToken.`);
    });
    const report = {
      ok: errors.length === 0,
      records: items.length,
      specificVariants: records.length - items.length,
      identities: identities.size,
      errors
    };
    if (!report.ok && options.throwOnError) {
      const error = new Error(`Invalid item catalog:\n${errors.slice(0, 12).join("\n")}`);
      error.report = report;
      throw error;
    }
    return report;
  }

  function tagDisplayValue(tagName, payload) {
    const tag = String(tagName || "").toLowerCase();
    const parts = String(payload || "").split("|");
    const primary = parts[0] || "";
    if (tag === "variantrule") return parts[2] || primary;
    if (["action", "condition", "creature", "deity", "hazard", "item", "itemproperty", "language", "sense", "skill", "spell", "status"].includes(tag)) {
      return parts[2] || primary;
    }
    if (tag === "book" || tag === "adventure") return parts[3] || primary;
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
    if (tag === "scaledamage" || tag === "scaledice") return parts[2] || primary;
    return primary || String(payload || "");
  }

  function renderTags(value) {
    const input = String(value == null ? "" : value);
    let output = "";
    for (let index = 0; index < input.length;) {
      if (input[index] !== "{" || input[index + 1] !== "@") {
        output += input[index];
        index += 1;
        continue;
      }
      let depth = 1;
      let cursor = index + 2;
      while (cursor < input.length && depth > 0) {
        if (input[cursor] === "{") {
          depth += 1;
          cursor += 1;
          continue;
        }
        if (input[cursor] === "}") depth -= 1;
        cursor += 1;
      }
      if (depth !== 0) {
        output += input.slice(index);
        break;
      }
      const body = input.slice(index + 2, cursor - 1);
      const separator = body.search(/\s/);
      const tag = separator < 0 ? body : body.slice(0, separator);
      const payload = separator < 0 ? "" : renderTags(body.slice(separator + 1));
      output += tagDisplayValue(tag, payload);
      index = cursor;
    }
    return output;
  }

  function strip5eTags(value, variables = {}) {
    return renderTags(value)
      .replace(/\{=([^}]+)}/g, (match, field) => {
        const replacement = variables && Object.prototype.hasOwnProperty.call(variables, field) ? variables[field] : null;
        return replacement == null ? match : String(replacement);
      })
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/[ \t]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .trim();
  }

  function renderEntryText(entry, variables = {}) {
    if (entry == null) return "";
    if (typeof entry === "string" || typeof entry === "number") return strip5eTags(entry, variables);
    if (Array.isArray(entry)) return entry.map((value) => renderEntryText(value, variables)).filter(Boolean).join("\n\n");
    if (typeof entry !== "object") return "";
    if (entry.type === "list") {
      return (entry.items || []).map((item) => {
        const text = renderEntryText(item, variables);
        return text ? `- ${text}` : "";
      }).filter(Boolean).join("\n");
    }
    if (entry.type === "table") {
      const caption = strip5eTags(entry.caption || "", variables);
      const headings = (entry.colLabels || []).map((value) => renderEntryText(value, variables)).filter(Boolean).join(" | ");
      const rows = (entry.rows || []).map((row) => {
        const cells = Array.isArray(row) ? row : row?.row || [];
        return (Array.isArray(cells) ? cells : [cells]).map((value) => renderEntryText(value, variables)).join(" | ");
      });
      return [caption, headings, ...rows].filter(Boolean).join("\n");
    }
    if (entry.type === "cell") {
      if (entry.entry != null) return renderEntryText(entry.entry, variables);
      if (entry.exact != null) return String(entry.exact);
      if (entry.roll?.exact != null) return String(entry.roll.exact);
      if (entry.roll?.min != null && entry.roll?.max != null) return `${entry.roll.min}-${entry.roll.max}`;
      return renderEntryText(entry.roll, variables);
    }
    const name = strip5eTags(entry.name || entry.caption || "", variables);
    const body = entry.entries != null
      ? renderEntryText(entry.entries, variables)
      : entry.items != null
      ? renderEntryText(entry.items, variables)
      : entry.entry != null
      ? renderEntryText(entry.entry, variables)
      : "";
    if (name && body) return `${name}. ${body}`;
    return body || name;
  }

  function numberFromBonus(value) {
    if (value == null || value === "") return null;
    const text = String(value).trim();
    if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  function persistentHeldArmorClassBonus(item = {}) {
    const declared = numberFromBonus(item.bonusAc);
    if (!Number.isFinite(declared) || declared === 0) return 0;
    const description = renderEntryText(item.entries || [], item);
    const pattern = /\bwhile (?:you are )?holding (?:it|this [^,.;]+|the [^,.;]+),?\s+you (?:have|gain) (?:a )?\+(\d+)\s+bonus to (?:your )?(?:armor class|ac)\b/gi;
    for (const match of description.matchAll(pattern)) {
      if (Number(match[1]) === declared) return declared;
    }
    return 0;
  }

  function persistentWornArmorClassBonus(item = {}) {
    const declared = numberFromBonus(item.bonusAc);
    if (!Number.isFinite(declared) || declared === 0) return 0;
    const description = renderEntryText(item.entries || [], item);
    const sentences = description.split(/(?<=[.!?])\s+/);
    return sentences.some((sentence) => {
      if (/\b(?:against|if|when|whenever|until|reaction|bonus action)\b/i.test(sentence)) return false;
      const match = sentence.match(/\+(\d+)\s+bonus to (?:your )?(?:armor class|ac)\b/i);
      if (!match || Number(match[1]) !== declared) return false;
      return /\bwhile (?:you )?(?:wear|are wearing)|\bwhile wearing|\bwhile .* orbits? your head\b/i.test(sentence);
    }) ? declared : 0;
  }

  function persistentEquipmentModes(value) {
    const text = typeof value === "string" ? value : renderEntryText(value?.entries || value || [], value || {});
    const modes = [];
    if (/\bwhile\b[^.!?\n]*\b(?:hold|holding)\b|\bwhile (?:you )?hold\b/i.test(text)) modes.push("held");
    if (/\bwhile\b[^.!?\n]*\b(?:wear|wearing)\b|\bwhile (?:you )?wear\b/i.test(text)) modes.push("worn");
    if (/\b(?:on your person|carrying it|carry it)\b/i.test(text)) modes.push("carried");
    if (/\bwhile attuned\b/i.test(text)) modes.push("attuned");
    return [...new Set(modes)];
  }

  function equipmentModesMatch(modes, slots) {
    const required = Array.isArray(modes) ? modes : [];
    const equipped = new Set(slots instanceof Set ? [...slots] : Array.isArray(slots) ? slots : []);
    if (!required.length || !equipped.size) return false;
    return required.some((mode) => {
      if (mode === "held") return equipped.has("mainHand") || equipped.has("offHand");
      if (mode === "worn") return equipped.has("armor") || equipped.has("accessory");
      return mode === "carried" || mode === "attuned";
    });
  }

  function persistentDefenseProfile(item = {}) {
    const empty = { resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [] };
    const raw = {
      resistances: Array.isArray(item.resist) ? [...item.resist] : [],
      immunities: Array.isArray(item.immune) ? [...item.immune] : [],
      vulnerabilities: Array.isArray(item.vulnerable) ? [...item.vulnerable] : [],
      conditionImmunities: Array.isArray(item.conditionImmune) ? [...item.conditionImmune] : []
    };
    if (!Object.values(raw).some((values) => values.length)) return empty;
    const blocks = renderEntryText(item.entries || [], item).split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
    const safeBlocks = blocks.filter((block, index) => {
      const inheritedScope = index > 0 && /\bfollowing benefits\b/i.test(blocks[index - 1]) ? blocks[index - 1] : "";
      const scopedBlock = inheritedScope ? `${inheritedScope}\n${block}` : block;
      const modes = persistentEquipmentModes(scopedBlock);
      if (!modes.length) return false;
      return !/\b(?:as|using) (?:an?|your) (?:action|bonus action|reaction|magic action)\b|\bfor (?:that|the) duration\b|\bfor \d+ (?:round|minute|hour|day)s?\b|\buntil\b|\btransform(?:ed|ation|ing)?\b|\bwhile cursed\b|\bdraw(?:n|ing)? (?:a|the|this) card\b|\bif you (?:aren't|are not|are not a|aren't a)\b/i.test(scopedBlock);
    });
    const hasSafe = (pattern) => safeBlocks.some((block) => pattern.test(block));
    return {
      resistances: hasSafe(/\bresistan(?:ce|t)\b/i) ? raw.resistances : [],
      immunities: hasSafe(/\b(?:immune|immunity|immunities)\b/i) ? raw.immunities : [],
      vulnerabilities: hasSafe(/\bvulnerab(?:le|ility|ilities)\b/i) ? raw.vulnerabilities : [],
      conditionImmunities: hasSafe(/\b(?:immune|immunity|immunities|can(?:not|'t) be)\b/i) ? raw.conditionImmunities : []
    };
  }

  const STATIC_ABILITY_SCORE_NAMES = Object.freeze({
    str: { ability: "STR", name: "Strength" },
    dex: { ability: "DEX", name: "Dexterity" },
    con: { ability: "CON", name: "Constitution" },
    int: { ability: "INT", name: "Intelligence" },
    wis: { ability: "WIS", name: "Wisdom" },
    cha: { ability: "CHA", name: "Charisma" }
  });

  function persistentAbilityScoreProfile(item = {}) {
    const declared = item?.ability?.static;
    if (!declared || typeof declared !== "object" || Array.isArray(declared)) return [];
    const sentences = renderEntryText(item.entries || [], item)
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    return Object.entries(declared).flatMap(([key, value]) => {
      const definition = STATIC_ABILITY_SCORE_NAMES[normalizeIdentityPart(key)];
      const score = Number(value);
      if (!definition || !Number.isInteger(score) || score < 1 || score > 30) return [];
      const scorePattern = new RegExp(`\\b${definition.name} score\\b[^.!?]*\\b(?:is|becomes?|changes? to)\\s+${score}\\b`, "i");
      const sentence = sentences.find((entry) => scorePattern.test(entry) && persistentEquipmentModes(entry).length);
      if (!sentence) return [];
      if (/\b(?:for \d+ (?:round|minute|hour|day)s?|until|when you drink|after you|as an? (?:action|bonus action|reaction|magic action))\b/i.test(sentence)) return [];
      return [{
        ability: definition.ability,
        score,
        equipmentModes: persistentEquipmentModes(sentence)
      }];
    });
  }

  function matchingPersistentBonusSentence(item, declared, requiredPattern) {
    if (!Number.isFinite(declared) || declared === 0) return "";
    const description = renderEntryText(item.entries || [], item);
    const signed = declared > 0 ? `\\+${declared}` : String(declared).replace("-", "[-\u2212]");
    return description.split(/(?<=[.!?])\s+/).find((sentence) => {
      if (/\b(?:against|when|whenever|until|for the duration|after you|the next)\b/i.test(sentence)) return false;
      return new RegExp(`${signed}\\s+(?:bonus|penalty)\\s+to`, "i").test(sentence) && requiredPattern.test(sentence);
    }) || "";
  }

  function savingThrowBonusProfile(item = {}) {
    const declared = numberFromBonus(item.bonusSavingThrow);
    const sentence = matchingPersistentBonusSentence(item, declared, /\bsaving throws?\b/i);
    if (!sentence) return null;
    const hasEquipmentScope = /\bwhile\b[^.!?]*\b(?:hold(?:ing)?|wear(?:ing)?|attuned|on your person)\b|\bon your person\b/i.test(sentence);
    const hasUnsupportedCondition = /\b(?:bright light|good-aligned|evil-aligned|made to|avoid dropping|avoid being|drawn? (?:this|the) card)\b/i.test(sentence);
    if (!hasEquipmentScope || hasUnsupportedCondition) return null;
    const abilityMatches = [...sentence.matchAll(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throws?\b/gi)]
      .map((match) => match[1].slice(0, 3).toUpperCase());
    return {
      bonus: declared,
      abilities: abilityMatches.length ? [...new Set(abilityMatches)] : null,
      equipmentModes: persistentEquipmentModes(sentence)
    };
  }

  function spellcastingBonusProfile(item = {}) {
    const attackBonus = numberFromBonus(item.bonusSpellAttack);
    const saveDcBonus = numberFromBonus(item.bonusSpellSaveDc);
    const attackSentence = matchingPersistentBonusSentence(item, attackBonus, /\bspell attack rolls?\b/i);
    const saveSentence = matchingPersistentBonusSentence(item, saveDcBonus, /\bsaving throw DCs?\b|\bspell save DCs?\b/i);
    const text = `${attackSentence} ${saveSentence}`;
    const description = renderEntryText(item.entries || [], item);
    const classes = [...text.matchAll(/\b(Artificer|Bard|Cleric|Druid|Paladin|Ranger|Sorcerer|Warlock|Wizard)\b/gi)]
      .map((match) => normalizeIdentityPart(match[1]));
    const abilities = [...text.matchAll(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\b(?=[^.]*\bspellcasting ability\b)/gi)]
      .map((match) => match[1].slice(0, 3).toUpperCase());
    return {
      attackBonus: attackSentence ? attackBonus : 0,
      saveDcBonus: saveSentence ? saveDcBonus : 0,
      classes: [...new Set(classes)],
      abilities: [...new Set(abilities)],
      equipmentModes: persistentEquipmentModes(text).length
        ? persistentEquipmentModes(text)
        : persistentEquipmentModes(description)
    };
  }

  function itemSourcePreferenceRank(source) {
    const normalized = normalizeIdentityPart(source);
    if (["xphb", "xdmg", "xmm"].includes(normalized)) return 0;
    if (["phb", "dmg", "mm"].includes(normalized)) return 3;
    return 1;
  }

  function catalogRecordUnavailable(item) {
    const status = normalizeIdentityPart(item?.catalogStatus || item?.status);
    return item?.__catalogUnavailable === true
      || item?.unavailable === true
      || item?.removedFromCatalog === true
      || ["deleted", "removed", "retired", "unavailable"].includes(status);
  }

  function preferItemForLegacyName(previous, next) {
    if (!previous) return next;
    if (!next) return previous;
    const previousUnavailable = catalogRecordUnavailable(previous);
    const nextUnavailable = catalogRecordUnavailable(next);
    if (previousUnavailable !== nextUnavailable) return nextUnavailable ? previous : next;
    const previousRank = itemSourcePreferenceRank(previous.source);
    const nextRank = itemSourcePreferenceRank(next.source);
    return nextRank < previousRank ? next : previous;
  }

  function spellReference(value) {
    const [name = "", source = ""] = String(value || "").split("|");
    return { name: strip5eTags(name), source: String(source || "").trim() };
  }

  function attachedSpellReferences(value, path = [], output = []) {
    if (typeof value === "string") {
      const spell = spellReference(value);
      if (spell.name) {
        output.push({
          ...spell,
          usage: path[0] || "always",
          cost: path.length > 1 ? path.slice(1).join(".") : null
        });
      }
      return output;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => attachedSpellReferences(entry, path, output));
      return output;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, entry]) => {
        // 5etools stores the casting ability beside the spell buckets. It is
        // metadata (for example `ability: "int"`), not a spell reference.
        if (!path.length && key === "ability") return;
        attachedSpellReferences(entry, [...path, key], output);
      });
    }
    return output;
  }

  function itemAutomationProfile(item = {}) {
    const rangeMatch = String(item.range || "").match(/^(\d+)(?:\s*\/\s*(\d+))?/);
    const type = String(item.type || "").split("|")[0].toUpperCase();
    const description = renderEntryText(item.entries || [], item);
    const attachedSpells = attachedSpellReferences(item.attachedSpells);
    const profile = {
      catalogId: item.catalogId || itemCatalogId(item),
      catalogKey: item.catalogKey || itemCatalogKey(item),
      variantToken: item.catalogVariantToken || itemVariantToken(item),
      category: { type, rarity: String(item.rarity || "none"), wondrous: item.wondrous === true },
      weapon: {
        enabled: item.weapon === true || Boolean(item.dmg1 || item.weaponCategory),
        category: item.weaponCategory || "",
        damage: item.dmg1 ? { dice: String(item.dmg1), type: String(item.dmgType || "") } : null,
        versatileDamage: item.dmg2 ? String(item.dmg2) : null,
        range: rangeMatch ? { normal: Number(rangeMatch[1]), long: rangeMatch[2] ? Number(rangeMatch[2]) : null } : null,
        properties: Array.isArray(item.property) ? [...item.property] : [],
        mastery: Array.isArray(item.mastery) ? [...item.mastery] : [],
        attackBonus: numberFromBonus(item.bonusWeaponAttack ?? item.bonusWeapon),
        damageBonus: numberFromBonus(item.bonusWeaponDamage ?? item.bonusWeapon),
        ammunition: item.ammo === true || Boolean(item.ammoType),
        ammunitionType: item.ammoType || ""
      },
      armor: {
        enabled: item.armor === true || ["LA", "MA", "HA", "S"].includes(type) || item.ac != null,
        baseAc: numberFromBonus(item.ac),
        bonusAc: numberFromBonus(item.bonusAc),
        dexterityMax: numberFromBonus(item.dexterityMax),
        strength: numberFromBonus(item.strength),
        stealthDisadvantage: item.stealth === true
      },
      attunement: {
        required: Boolean(item.reqAttune),
        requirement: item.reqAttune === true ? "" : String(item.reqAttune || ""),
        tags: Array.isArray(item.reqAttuneTags) ? item.reqAttuneTags.map((tag) => ({ ...tag })) : []
      },
      resources: {
        charges: numberFromBonus(item.charges),
        recharge: item.recharge ?? null,
        rechargeAmount: item.rechargeAmount ?? null,
        reload: numberFromBonus(item.reload),
        raw: {
          charges: item.charges ?? null,
          recharge: item.recharge ?? null,
          rechargeAmount: item.rechargeAmount ?? null,
          reload: item.reload ?? null
        }
      },
      spells: {
        attached: attachedSpells,
        attackBonus: numberFromBonus(item.bonusSpellAttack),
        saveDcBonus: numberFromBonus(item.bonusSpellSaveDc),
        damageBonus: numberFromBonus(item.bonusSpellDamage),
        raw: item.attachedSpells ?? null
      },
      defenses: {
        resistances: Array.isArray(item.resist) ? [...item.resist] : [],
        immunities: Array.isArray(item.immune) ? [...item.immune] : [],
        vulnerabilities: Array.isArray(item.vulnerable) ? [...item.vulnerable] : [],
        conditionImmunities: Array.isArray(item.conditionImmune) ? [...item.conditionImmune] : [],
        savingThrowBonus: numberFromBonus(item.bonusSavingThrow)
      },
      abilityScores: {
        static: persistentAbilityScoreProfile(item)
      },
      consumable: item.poison === true
        || Array.isArray(item.poisonTypes)
        || (Array.isArray(item.miscTags) && item.miscTags.includes("CNS"))
        || ["P", "POT", "SC"].includes(type),
      vehicle: {
        enabled: item.vehAc != null || item.vehHp != null || item.crew != null,
        armorClass: numberFromBonus(item.vehAc),
        hitPoints: numberFromBonus(item.vehHp),
        damageThreshold: numberFromBonus(item.vehDmgThresh),
        crew: item.crew ?? null,
        passengers: item.capPassenger ?? null,
        cargo: item.capCargo ?? null,
        speed: item.vehSpeed ?? item.speed ?? null
      },
      description,
      manualRules: Boolean(description),
      raw: {
        type: item.type ?? null,
        rarity: item.rarity ?? null,
        requires: item.requires ?? null,
        excludes: item.excludes ?? null,
        inherits: item.inherits ?? null,
        variants: item.variants ?? null
      }
    };
    return automationRegistry
      ? automationRegistry.augmentProfile(profile, item)
      : {
        ...profile,
        resources: { ...profile.resources, definitions: [] },
        capabilities: [],
        attackRiders: [],
        actions: [],
        modifiers: [],
        manualCapabilities: []
      };
  }

  return Object.freeze({
    GENERATED_IDENTITY_FIELDS,
    ammunitionBaseName,
    attachCatalogIdentities,
    attachedSpellReferences,
    collectCatalogRecords,
    decorateItem,
    itemAutomationProfile,
    setItemAutomationRegistry,
    itemCatalogId,
    itemCatalogKey,
    itemVariantToken,
    equipmentModesMatch,
    persistentDefenseProfile,
    persistentAbilityScoreProfile,
    persistentEquipmentModes,
    persistentHeldArmorClassBonus,
    persistentWornArmorClassBonus,
    preferItemForLegacyName,
    normalizeBaseItemReference,
    normalizeIdentityPart,
    renderEntryText,
    resolveItemTypeMetadata,
    savingThrowBonusProfile,
    spellcastingBonusProfile,
    strip5eTags,
    taggedReferenceParts,
    validateItemCatalog
  });
});
