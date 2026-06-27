(function createConditionModule(globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  globalScope.dndConditionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function conditionFactory() {
  "use strict";

  const STATUS_DEFINITIONS = [
    {
      id: "bardic-inspiration",
      name: "Bardic Inspiration",
      symbol: "BI d6",
      tone: "positive",
      description: "Suma 1d6 a un attack roll, ability check o saving throw. Quitalo despues de usarlo.",
      effects: {
        attackBonusDice: [{ label: "Bardic Inspiration", expression: "1d6" }],
        checkBonusDice: [{ label: "Bardic Inspiration", expression: "1d6" }],
        saveBonusDice: [{ label: "Bardic Inspiration", expression: "1d6" }]
      }
    },
    {
      id: "blessed",
      name: "Blessed",
      symbol: "+1d4",
      tone: "positive",
      description: "Suma 1d4 a tus attack rolls y saving throws mientras dure la bendicion.",
      effects: {
        attackBonusDice: [{ label: "Bless", expression: "1d4" }],
        saveBonusDice: [{ label: "Bless", expression: "1d4" }]
      }
    },
    {
      id: "advantage-attack-rolls",
      name: "Advantage Attacks",
      symbol: "ADV ATK",
      tone: "positive",
      description: "Tus attack rolls se tiran con advantage mientras este estado siga activo.",
      effects: {
        attackRollMode: "advantage"
      }
    },
    {
      id: "advantage-ability-checks",
      name: "Advantage Checks",
      symbol: "ADV CHK",
      tone: "positive",
      description: "Tus ability checks se tiran con advantage mientras este estado siga activo.",
      effects: {
        abilityCheckMode: "advantage"
      }
    },
    {
      id: "advantage-saving-throws",
      name: "Advantage Saves",
      symbol: "ADV SAV",
      tone: "positive",
      description: "Tus saving throws se tiran con advantage mientras este estado siga activo.",
      effects: {
        saveRollMode: "advantage"
      }
    },
    {
      id: "dodging",
      name: "Dodging",
      symbol: "DOD",
      tone: "positive",
      description: "Los ataques contra ti tienen disadvantage. Tus Dex saves tienen advantage si ves el efecto.",
      effects: {
        saveModesByAbility: { DEX: "advantage" },
        generalNotes: ["Ataques contra ti con disadvantage mientras mantengas Dodge."]
      }
    },
    {
      id: "hasted",
      name: "Hasted",
      symbol: "HST",
      tone: "positive",
      description: "+2 AC, Speed al doble y advantage en Dexterity saving throws.",
      effects: {
        acBonus: 2,
        speedMultiplier: 2,
        saveModesByAbility: { DEX: "advantage" },
        generalNotes: ["La accion extra limitada de Haste se resuelve manualmente."]
      }
    },
    {
      id: "invisible",
      name: "Invisible",
      symbol: "INV",
      tone: "positive",
      description: "Tus attack rolls tienen advantage. Los ataques contra ti suelen tener disadvantage.",
      effects: {
        attackRollMode: "advantage",
        generalNotes: ["Ataques contra ti normalmente con disadvantage mientras sigas invisible."]
      }
    },
    {
      id: "shielded",
      name: "Shielded",
      symbol: "AC+2",
      tone: "positive",
      description: "Un ward temporal o efecto de fe te protege con +2 AC.",
      effects: {
        acBonus: 2
      }
    },
    {
      id: "shield-spell",
      name: "Shield",
      symbol: "AC+5",
      tone: "positive",
      description: "+5 AC hasta el inicio de tu proximo turno. Quitalo despues de resolver la ronda.",
      effects: {
        acBonus: 5
      }
    },
    {
      id: "shield-of-faith",
      name: "Shield of Faith",
      symbol: "AC+2",
      tone: "positive",
      description: "+2 AC mientras mantengas concentracion.",
      effects: {
        acBonus: 2
      }
    },
    {
      id: "mage-armor",
      name: "Mage Armor",
      symbol: "AC 13",
      tone: "positive",
      description: "Tu base AC pasa a 13 + DEX mientras no uses armadura.",
      effects: {
        baseArmorClassRules: [{ label: "Mage Armor", base: 13, ability: "DEX", requiresNoArmor: true, allowsShield: true }]
      }
    },
    {
      id: "guidance",
      name: "Guidance",
      symbol: "+1d4",
      tone: "positive",
      description: "Suma 1d4 a un ability check. Quitalo despues de usarlo.",
      effects: {
        checkBonusDice: [{ label: "Guidance", expression: "1d4" }]
      }
    },
    {
      id: "resistance-spell",
      name: "Resistance",
      symbol: "+1d4",
      tone: "positive",
      description: "Suma 1d4 a un saving throw. Quitalo despues de usarlo.",
      effects: {
        saveBonusDice: [{ label: "Resistance", expression: "1d4" }]
      }
    },
    {
      id: "longstrider",
      name: "Longstrider",
      symbol: "SPD+10",
      tone: "positive",
      description: "+10 ft. a tu Speed mientras dure el spell.",
      effects: {
        speedBonus: 10
      }
    },
    {
      id: "blurred",
      name: "Blur",
      symbol: "BLR",
      tone: "positive",
      description: "Los ataques contra ti tienen disadvantage mientras mantengas concentracion, salvo criaturas que no dependan de vista.",
      effects: {
        generalNotes: ["Ataques contra ti con disadvantage mientras Blur siga activo."]
      }
    },
    {
      id: "protection-from-evil-and-good",
      name: "Protection from Evil and Good",
      symbol: "PEG",
      tone: "positive",
      description: "Aberrations, Celestials, Elementals, Fey, Fiends y Undead tienen disadvantage al atacarte; tambien ayuda contra charm, frightened y possession.",
      effects: {
        generalNotes: ["Tipos protegidos tienen disadvantage al atacarte; ventaja en saves contra charm, frightened y possession de esos tipos."]
      }
    },
    {
      id: "foresight",
      name: "Foresight",
      symbol: "FST",
      tone: "positive",
      description: "Advantage en attack rolls, ability checks y saving throws; ataques contra ti tienen disadvantage.",
      effects: {
        attackRollMode: "advantage",
        abilityCheckMode: "advantage",
        saveRollMode: "advantage",
        generalNotes: ["Ataques contra ti con disadvantage mientras Foresight siga activo."]
      }
    },
    {
      id: "blinded",
      name: "Blinded",
      symbol: "BLD",
      tone: "negative",
      description: "No puedes ver, tus attack rolls tienen disadvantage y los checks basados en vista fallan.",
      effects: {
        attackRollMode: "disadvantage",
        passivePerceptionModifier: -5,
        attackNotes: ["No ves al objetivo: ataques con disadvantage."],
        checkNotes: ["Checks que dependan de la vista fallan automaticamente."],
        generalNotes: ["Ataques contra ti suelen tener advantage."]
      }
    },
    {
      id: "disadvantage-attack-rolls",
      name: "Disadvantage Attacks",
      symbol: "DIS ATK",
      tone: "negative",
      description: "Tus attack rolls se tiran con disadvantage mientras este estado siga activo.",
      effects: {
        attackRollMode: "disadvantage"
      }
    },
    {
      id: "disadvantage-ability-checks",
      name: "Disadvantage Checks",
      symbol: "DIS CHK",
      tone: "negative",
      description: "Tus ability checks se tiran con disadvantage mientras este estado siga activo.",
      effects: {
        abilityCheckMode: "disadvantage"
      }
    },
    {
      id: "disadvantage-saving-throws",
      name: "Disadvantage Saves",
      symbol: "DIS SAV",
      tone: "negative",
      description: "Tus saving throws se tiran con disadvantage mientras este estado siga activo.",
      effects: {
        saveRollMode: "disadvantage"
      }
    },
    {
      id: "charmed",
      name: "Charmed",
      symbol: "CHR",
      tone: "negative",
      description: "No puedes atacar al charmer y el charmer tiene ventaja social contra ti.",
      effects: {
        generalNotes: ["No puedes atacar ni targetear con efectos daninos al charmer."]
      }
    },
    {
      id: "deafened",
      name: "Deafened",
      symbol: "DEA",
      tone: "negative",
      description: "No puedes oir y los checks que dependen del oido fallan.",
      effects: {
        checkNotes: ["Checks que dependan del oido fallan automaticamente."]
      }
    },
    {
      id: "frightened",
      name: "Frightened",
      symbol: "FRG",
      tone: "negative",
      description: "Mientras veas la fuente del miedo, tienes disadvantage en attack rolls y ability checks.",
      effects: {
        attackRollMode: "disadvantage",
        abilityCheckMode: "disadvantage",
        attackNotes: ["Aplica mientras veas la fuente del miedo."],
        checkNotes: ["Aplica mientras veas la fuente del miedo."]
      }
    },
    {
      id: "grappled",
      name: "Grappled",
      symbol: "GRP",
      tone: "negative",
      description: "Tu Speed pasa a 0 hasta que termine el grapple.",
      effects: {
        speedOverride: 0
      }
    },
    {
      id: "incapacitated",
      name: "Incapacitated",
      symbol: "INC",
      tone: "negative",
      description: "No puedes tomar actions ni reactions.",
      effects: {
        actionsBlocked: true,
        bonusActionsBlocked: true,
        reactionsBlocked: true
      }
    },
    {
      id: "paralyzed",
      name: "Paralyzed",
      symbol: "PAR",
      tone: "negative",
      description: "Estas incapacitated, no puedes moverte y los ataques contra ti ganan beneficios fuertes.",
      effects: {
        speedOverride: 0,
        actionsBlocked: true,
        bonusActionsBlocked: true,
        reactionsBlocked: true,
        generalNotes: ["Ataques contra ti con advantage; golpes melee cercanos pueden critico automatico."]
      }
    },
    {
      id: "petrified",
      name: "Petrified",
      symbol: "PET",
      tone: "negative",
      description: "Te vuelves piedra, quedas incapacitated y tu Speed pasa a 0.",
      effects: {
        speedOverride: 0,
        actionsBlocked: true,
        bonusActionsBlocked: true,
        reactionsBlocked: true,
        generalNotes: ["Tu cuerpo queda inerte; otras resistencias del estado se resuelven manualmente."]
      }
    },
    {
      id: "poisoned",
      name: "Poisoned",
      symbol: "PSN",
      tone: "negative",
      description: "Tienes disadvantage en attack rolls y ability checks.",
      effects: {
        attackRollMode: "disadvantage",
        abilityCheckMode: "disadvantage"
      }
    },
    {
      id: "prone",
      name: "Prone",
      symbol: "PRN",
      tone: "negative",
      description: "Tus ataques a distancia sufren y levantarte cuesta la mitad de tu Speed.",
      effects: {
        attackNotes: ["Ataques con disadvantage salvo melee a 5 ft."],
        generalNotes: ["Levantarte cuesta la mitad de tu Speed."]
      }
    },
    {
      id: "restrained",
      name: "Restrained",
      symbol: "RST",
      tone: "negative",
      description: "Tu Speed pasa a 0, los ataques contra ti tienen advantage y tus ataques y Dex saves empeoran.",
      effects: {
        speedOverride: 0,
        attackRollMode: "disadvantage",
        saveModesByAbility: { DEX: "disadvantage" },
        generalNotes: ["Ataques contra ti con advantage mientras sigas restrained."]
      }
    },
    {
      id: "stunned",
      name: "Stunned",
      symbol: "STN",
      tone: "negative",
      description: "Estas incapacitated, no puedes moverte y los STR/DEX saves practicamente fallan.",
      effects: {
        speedOverride: 0,
        actionsBlocked: true,
        bonusActionsBlocked: true,
        reactionsBlocked: true,
        saveModesByAbility: { STR: "disadvantage", DEX: "disadvantage" },
        generalNotes: ["STR y DEX saves suelen fallar automaticamente; ataques contra ti con advantage."]
      }
    },
    {
      id: "unconscious",
      name: "Unconscious",
      symbol: "UNC",
      tone: "negative",
      description: "Estas incapacitated, prone, no puedes moverte y los ataques contra ti son devastadores.",
      effects: {
        speedOverride: 0,
        actionsBlocked: true,
        bonusActionsBlocked: true,
        reactionsBlocked: true,
        saveModesByAbility: { STR: "disadvantage", DEX: "disadvantage" },
        generalNotes: ["Estas prone; ataques melee cercanos pueden critico automatico."]
      }
    }
  ];

  let externalStatusDefinitions = [];
  let definitionsById = buildDefinitionsById();

  function buildDefinitionsById() {
    return new Map(
      [...STATUS_DEFINITIONS, ...externalStatusDefinitions].map((definition) => [definition.id, definition])
    );
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function slugText(value) {
    return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function strip5eTags(value) {
    return String(value || "")
      .replace(/{@(?:feat|spell|item|filter|book|condition|skill|creature|class|background|action|itemProperty|quickref|status|sense|hazard|dice|dc)\s+([^}|]+)(?:\|[^}]*)?}/g, "$1")
      .replace(/{@b\s+([^}]+)}/g, "$1")
      .replace(/{@i\s+([^}]+)}/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function entryToText(entry) {
    if (typeof entry === "string") return strip5eTags(entry);
    if (!entry || typeof entry !== "object") return "";
    if (entry.type === "list") return (entry.items || []).map(entryToText).filter(Boolean).join(" ");
    if (entry.type === "entries") {
      const name = strip5eTags(entry.name || "");
      const text = (entry.entries || []).map(entryToText).filter(Boolean).join(" ");
      return [name, text].filter(Boolean).join(": ");
    }
    if (entry.type === "table") {
      const caption = strip5eTags(entry.caption || "");
      const rows = (entry.rows || [])
        .map((row) => (Array.isArray(row) ? row.map(entryToText).filter(Boolean).join(": ") : entryToText(row)))
        .filter(Boolean)
        .join("; ");
      return [caption, rows].filter(Boolean).join(": ");
    }
    if (Array.isArray(entry.entries)) return entry.entries.map(entryToText).filter(Boolean).join(" ");
    if (Array.isArray(entry.items)) return entry.items.map(entryToText).filter(Boolean).join(" ");
    return strip5eTags(entry.name || "");
  }

  function entriesToText(entries = []) {
    return (Array.isArray(entries) ? entries : [entries]).map(entryToText).filter(Boolean).join(" ");
  }

  function symbolForStatusName(name) {
    const words = String(name || "").match(/[A-Za-z0-9]+/g) || [];
    if (!words.length) return "STS";
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
    return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
  }

  function externalStatusTone(entry) {
    const name = normalizeText(entry?.name || "");
    if (name === "valor") return "positive";
    return "negative";
  }

  function createExternalStatusDefinition(entry) {
    const name = String(entry?.name || "").trim();
    const source = String(entry?.source || "").trim();
    const details = entriesToText(entry?.entries) || "Estado importado desde conditionsdiseases.json.";
    const description = details.length > 220 ? `${details.slice(0, 217).trim()}...` : details;
    return {
      id: `condition-${slugText(name)}-${slugText(source) || "custom"}`,
      name,
      symbol: symbolForStatusName(name),
      tone: externalStatusTone(entry),
      description,
      details,
      source,
      effects: {
        generalNotes: [description]
      }
    };
  }

  function conditionEntriesFromPayload(payload) {
    if (Array.isArray(payload)) return payload;
    return [
      ...(Array.isArray(payload?.condition) ? payload.condition : []),
      ...(Array.isArray(payload?.disease) ? payload.disease : []),
      ...(Array.isArray(payload?.status) ? payload.status : [])
    ];
  }

  function setExternalConditionEntries(payload) {
    const existingNames = new Set(STATUS_DEFINITIONS.map((definition) => normalizeText(definition.name)));
    const seenIds = new Set(STATUS_DEFINITIONS.map((definition) => definition.id));
    externalStatusDefinitions = conditionEntriesFromPayload(payload)
      .filter((entry) => entry?.name && !existingNames.has(normalizeText(entry.name)))
      .map(createExternalStatusDefinition)
      .filter((definition) => definition.id && !seenIds.has(definition.id) && seenIds.add(definition.id));
    definitionsById = buildDefinitionsById();
    return externalStatusDefinitions.length;
  }

  function getStatusDefinitions() {
    return [...STATUS_DEFINITIONS, ...externalStatusDefinitions]
      .map((definition) => ({ ...definition, effects: { ...(definition.effects || {}) } }));
  }

  function findStatusDefinition(id) {
    const definition = definitionsById.get(String(id || "").trim());
    return definition ? { ...definition, effects: { ...(definition.effects || {}) } } : null;
  }

  function normalizeStatusIds(ids = []) {
    const seen = new Set();
    return (Array.isArray(ids) ? ids : [])
      .map((id) => String(id || "").trim())
      .filter((id) => id && definitionsById.has(id) && !seen.has(id) && seen.add(id));
  }

  function mergeRollModes(modes = []) {
    let hasAdvantage = false;
    let hasDisadvantage = false;
    (Array.isArray(modes) ? modes : [modes]).forEach((mode) => {
      if (mode === "advantage") hasAdvantage = true;
      if (mode === "disadvantage") hasDisadvantage = true;
    });
    if (hasAdvantage && hasDisadvantage) return "normal";
    if (hasAdvantage) return "advantage";
    if (hasDisadvantage) return "disadvantage";
    return "normal";
  }

  function appendRollMode(target, value) {
    if (value === "advantage" || value === "disadvantage") target.push(value);
  }

  function appendDice(target, values = []) {
    (Array.isArray(values) ? values : []).forEach((entry) => {
      const expression = String(entry?.expression || "").trim();
      if (!expression) return;
      target.push({
        label: String(entry?.label || "").trim() || expression,
        expression
      });
    });
  }

  function appendLines(target, values = []) {
    (Array.isArray(values) ? values : []).forEach((value) => {
      const line = String(value || "").trim();
      if (line) target.push(line);
    });
  }

  function collectStatusEffects(ids = []) {
    const definitions = normalizeStatusIds(ids)
      .map((id) => definitionsById.get(id))
      .filter(Boolean);
    const saveModesByAbility = {
      STR: [],
      DEX: [],
      CON: [],
      INT: [],
      WIS: [],
      CHA: []
    };
    const effects = {
      definitions,
      acBonus: 0,
      speedMultiplier: 1,
      speedBonus: 0,
      speedOverride: null,
      passivePerceptionModifier: 0,
      baseArmorClassRules: [],
      attackRollModes: [],
      abilityCheckModes: [],
      saveRollModes: [],
      saveModesByAbility,
      attackBonusDice: [],
      checkBonusDice: [],
      saveBonusDice: [],
      attackNotes: [],
      checkNotes: [],
      saveNotes: [],
      generalNotes: [],
      actionsBlocked: false,
      bonusActionsBlocked: false,
      reactionsBlocked: false
    };

    definitions.forEach((definition) => {
      const raw = definition.effects || {};
      effects.acBonus += Number(raw.acBonus) || 0;
      if (Number.isFinite(Number(raw.speedMultiplier)) && Number(raw.speedMultiplier) > 0) {
        effects.speedMultiplier *= Number(raw.speedMultiplier);
      }
      effects.speedBonus += Number(raw.speedBonus) || 0;
      if (Number.isFinite(Number(raw.speedOverride))) effects.speedOverride = Number(raw.speedOverride);
      effects.passivePerceptionModifier += Number(raw.passivePerceptionModifier) || 0;
      if (Array.isArray(raw.baseArmorClassRules)) {
        raw.baseArmorClassRules.forEach((rule) => {
          if (!Number.isFinite(Number(rule?.base))) return;
          effects.baseArmorClassRules.push({
            label: String(rule.label || definition.name || "Status").trim(),
            base: Number(rule.base),
            ability: String(rule.ability || "DEX").trim().toUpperCase(),
            requiresNoArmor: Boolean(rule.requiresNoArmor),
            allowsShield: rule.allowsShield !== false
          });
        });
      }
      appendRollMode(effects.attackRollModes, raw.attackRollMode);
      appendRollMode(effects.abilityCheckModes, raw.abilityCheckMode);
      appendRollMode(effects.saveRollModes, raw.saveRollMode);
      Object.entries(raw.saveModesByAbility || {}).forEach(([ability, mode]) => {
        const key = String(ability || "").trim().toUpperCase();
        if (!saveModesByAbility[key]) return;
        appendRollMode(saveModesByAbility[key], mode);
      });
      appendDice(effects.attackBonusDice, raw.attackBonusDice);
      appendDice(effects.checkBonusDice, raw.checkBonusDice);
      appendDice(effects.saveBonusDice, raw.saveBonusDice);
      appendLines(effects.attackNotes, raw.attackNotes);
      appendLines(effects.checkNotes, raw.checkNotes);
      appendLines(effects.saveNotes, raw.saveNotes);
      appendLines(effects.generalNotes, raw.generalNotes);
      effects.actionsBlocked = effects.actionsBlocked || Boolean(raw.actionsBlocked);
      effects.bonusActionsBlocked = effects.bonusActionsBlocked || Boolean(raw.bonusActionsBlocked);
      effects.reactionsBlocked = effects.reactionsBlocked || Boolean(raw.reactionsBlocked);
    });

    return {
      ...effects,
      attackRollMode: mergeRollModes(effects.attackRollModes),
      abilityCheckMode: mergeRollModes(effects.abilityCheckModes),
      saveRollMode: mergeRollModes(effects.saveRollModes),
      saveModeByAbility: Object.fromEntries(
        Object.entries(saveModesByAbility).map(([ability, modes]) => [ability, mergeRollModes(modes)])
      )
    };
  }

  return {
    getStatusDefinitions,
    findStatusDefinition,
    setExternalConditionEntries,
    normalizeStatusIds,
    mergeRollModes,
    collectStatusEffects
  };
});
