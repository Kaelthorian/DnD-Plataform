// Extracted general renderer infrastructure.
// Gameplay-heavy feat/spell/rest mechanics intentionally remain inline in index.html for now.

    "use strict";

    const STORAGE_KEY = "dnd-character-sheet-pdf-fields-v2";
    const BASE_WIDTH = 1000;
    const desktopStore = window.dndSheet || null;

    const app = document.getElementById("app");
    const loading = document.getElementById("loading");
    const status = document.getElementById("status");
    const clearFieldsButton = document.getElementById("clearFieldsButton");
    const longRestButton = document.getElementById("longRestButton");
    const characterReadyButton = document.getElementById("characterReadyButton");
    const optionMenu = document.getElementById("optionMenu");
    const optionList = document.getElementById("optionList");
    const optionDescription = document.getElementById("optionDescription");
    const alertsPanel = document.getElementById("alertsPanel");
    const alertsTrigger = document.getElementById("alertsTrigger");
    const alertsIcon = document.getElementById("alertsIcon");
    const alertsBadge = document.getElementById("alertsBadge");
    const alertsList = document.getElementById("alertsList");
    const alertsCounts = document.getElementById("alertsCounts");
    const diceTray = document.getElementById("diceTray");
    const diceTitle = document.getElementById("diceTitle");
    const diceResult = document.getElementById("diceResult");
    const diceDetail = document.getElementById("diceDetail");
    const itemDrawer = document.getElementById("itemDrawer");
    const itemDrawerTitle = document.getElementById("itemDrawerTitle");
    const itemDrawerMeta = document.getElementById("itemDrawerMeta");
    const itemDrawerBody = document.getElementById("itemDrawerBody");
    const itemDrawerClose = document.getElementById("itemDrawerClose");
    const itemPickerBackdrop = document.getElementById("itemPickerBackdrop");
    const itemPickerClose = document.getElementById("itemPickerClose");
    const itemPickerSearch = document.getElementById("itemPickerSearch");
    const itemPickerFilters = document.getElementById("itemPickerFilters");
    const itemPickerList = document.getElementById("itemPickerList");
    const itemPickerQuantity = document.getElementById("itemPickerQuantity");
    const itemPickerAdd = document.getElementById("itemPickerAdd");
    const damageTooltip = document.getElementById("damageTooltip");
    let fieldOptions = new Map();
    let spells = [];
    let feats = [];
    let items = [];
    let raceDetails = [];
    let backgroundDetails = [];
    let classDetails = [];
    let optionalFeatures = [];
    let itemProperties = [];
    let itemTypes = [];
    let itemMasteries = [];
    let languages = [];
    let equipmentPanel = null;
    let activeSelectField = null;
    let pdfjsLib = null;
    let preparedSpellsPanel = null;
    let diceTimer = null;
    let selectedPickerItem = null;
    let sheetMeta = { choices: {} };
    let activeItemFilter = "all";
    const collapsibleSectionState = {};

    async function loadPdfJs() {
      try {
        if (!Promise.try) {
          Promise.try = (callback, ...args) => new Promise((resolve) => resolve(callback(...args)));
        }
        pdfjsLib = await import("../../../node_modules/pdfjs-dist/legacy/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs";
      } catch (error) {
        throw new Error("No se encontro PDF.js. Ejecuta `npm install` en la carpeta del proyecto antes de abrir la app.");
      }
    }

    function base64ToBytes(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }

    async function loadPdfBytes() {
      if (desktopStore?.loadPdf) return base64ToBytes(await desktopStore.loadPdf());
      const response = await fetch("./assets/DnD_5E_CharacterSheet_FormFillable.pdf");
      if (!response.ok) {
        throw new Error(`No se encontro DnD_5E_CharacterSheet_FormFillable.pdf (${response.status})`);
      }
      return new Uint8Array(await response.arrayBuffer());
    }

    async function loadRaceOptions() {
      if (desktopStore?.loadRaces) return dedupeModernByName(await desktopStore.loadRaces(), optionName, optionSource);
      const response = await fetch("../../data/races/races.json");
      return dedupeModernByName(await response.json(), optionName, optionSource);
    }

    async function loadRaceDetails() {
      const localResponse = await fetch("../../data/races/race-details.json");
      if (localResponse.ok) return localResponse.json();
      const response = await fetch("../../../vendor/5etools-src-main/data/races.json");
      if (!response.ok) return {};
      return response.json();
    }

    async function loadBackgroundOptions() {
      if (desktopStore?.loadBackgrounds) return dedupeModernByName(await desktopStore.loadBackgrounds(), optionName, optionSource);
      const response = await fetch("../../data/backgrounds/backgrounds.json");
      return dedupeModernByName(await response.json(), optionName, optionSource);
    }

    async function loadBackgroundDetails() {
      const response = await fetch("../../../vendor/5etools-src-main/data/backgrounds.json");
      if (!response.ok) return {};
      return response.json();
    }

    async function loadClassOptions() {
      const withoutSidekicks = (options) => (options || []).filter((option) => !/sidekick/i.test(optionName(option)));
      if (desktopStore?.loadClasses) return dedupeModernByName(withoutSidekicks(await desktopStore.loadClasses()), optionName, optionSource);
      const response = await fetch("../../data/classes/classes.json");
      return dedupeModernByName(withoutSidekicks(await response.json()), optionName, optionSource);
    }

    async function loadClassDetails() {
      const indexResponse = await fetch("../../../vendor/5etools-src-main/data/class/index.json");
      if (!indexResponse.ok) return [];
      const classIndex = await indexResponse.json();
      const files = Object.values(classIndex).filter((file) => /^class-.*\.json$/i.test(file));
      const responses = await Promise.all(files.map((file) => fetch(`../../../vendor/5etools-src-main/data/class/${file}`).catch(() => null)));
      const loaded = await Promise.all(responses.map(async (response) => response?.ok ? response.json() : null));
      return loaded.filter(Boolean);
    }

    async function loadSpellOptions() {
      if (desktopStore?.loadSpells) return dedupeModernByName(await desktopStore.loadSpells(), (spell) => spell?.name || "", (spell) => spell?.source || "");
      const response = await fetch("../../data/spells/spells.json");
      return dedupeModernByName(await response.json(), (spell) => spell?.name || "", (spell) => spell?.source || "");
    }

    async function loadFeatOptions() {
      if (desktopStore?.loadFeats) return desktopStore.loadFeats();
      const response = await fetch("../../../vendor/5etools-src-main/data/feats.json");
      return response.json();
    }

    async function loadOptionalFeatureOptions() {
      const response = await fetch("../../../vendor/5etools-src-main/data/optionalfeatures.json");
      if (!response.ok) return {};
      return response.json();
    }

    async function loadItemOptions() {
      if (desktopStore?.loadItems) return desktopStore.loadItems();
      const [itemsResponse, baseItemsResponse] = await Promise.all([
        fetch("../../../vendor/5etools-src-main/data/items.json"),
        fetch("../../../vendor/5etools-src-main/data/items-base.json")
      ]);
      return {
        items: await itemsResponse.json(),
        baseItems: await baseItemsResponse.json()
      };
    }

    async function loadLanguageOptions() {
      if (desktopStore?.loadLanguages) return desktopStore.loadLanguages();
      const response = await fetch("../../../vendor/5etools-src-main/data/languages.json");
      return response.json();
    }

    const MODERN_SOURCE_REPLACEMENTS = {
      phb: "xphb",
      dmg: "xdmg",
      mm: "xmm"
    };

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

    function modernReplacementSource(source) {
      return MODERN_SOURCE_REPLACEMENTS[sourceKey(source)] || "";
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

    function preferModernEntry(previous, next, sourceGetter = (item) => item?.source || "") {
      if (!previous) return next;
      const previousRank = sourcePreferenceRank(sourceGetter(previous));
      const nextRank = sourcePreferenceRank(sourceGetter(next));
      if (nextRank !== previousRank) return nextRank < previousRank ? next : previous;
      return previous;
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

    function levelOptions() {
      return Array.from({ length: 20 }, (_item, index) => {
        const level = index + 1;
        const proficiency = proficiencyBonusForLevel(level);
        return {
          name: String(level),
          description: `Character level ${level}. Proficiency bonus ${formatModifier(proficiency)}.`
        };
      });
    }

    function alignmentOptions() {
      return [
        ["Lawful Good", "Acts with compassion, honor, and respect for order."],
        ["Neutral Good", "Does the best they can without strong bias toward law or chaos."],
        ["Chaotic Good", "Follows conscience and freedom while trying to do good."],
        ["Lawful Neutral", "Values order, tradition, or code over moral extremes."],
        ["True Neutral", "Avoids strong commitment to law, chaos, good, or evil."],
        ["Chaotic Neutral", "Values freedom and impulse without a strong moral allegiance."],
        ["Lawful Evil", "Uses order, rules, or hierarchy for selfish or harmful ends."],
        ["Neutral Evil", "Pursues self-interest without compassion or loyalty to order."],
        ["Chaotic Evil", "Acts with destructive selfishness and contempt for order."]
      ].map(([name, description]) => ({ name, description }));
    }

    function getSpellLevel(pageNumber, rect) {
      if (pageNumber !== 3) return null;
      const x = rect[0];
      const y = rect[1];
      if (x < 210) {
        if (y >= 480) return 0;
        if (y >= 228) return 1;
        return 2;
      }
      if (x < 400) {
        if (y >= 399) return 3;
        if (y >= 173) return 4;
        return 5;
      }
      if (y >= 455) return 6;
      if (y >= 285) return 7;
      if (y >= 144) return 8;
      return 9;
    }

    function getSelectOptions(key, pageNumber, rect) {
      const normalizedKey = key.trim().toLowerCase();
      if (normalizedKey === "race") return fieldOptions.get("race");
      if (normalizedKey === "background") return fieldOptions.get("background");
      if (normalizedKey === "alignment") return fieldOptions.get("alignment");
      if (normalizedKey === "classlevel" || normalizedKey.startsWith("spellcasting class")) return fieldOptions.get("class");
      if (normalizedKey === "characterlevel") return fieldOptions.get("level");
      if (normalizedKey.startsWith("spells ")) return { type: "spell", level: getSpellLevel(pageNumber, rect) };
      return null;
    }

    const CENTERED_NUMBER_FIELDS = new Set([
      "str",
      "strmod",
      "dex",
      "dexmod",
      "con",
      "conmod",
      "int",
      "intmod",
      "wis",
      "wismod",
      "cha",
      "chamod",
      "profbonus",
      "ac",
      "initiative",
      "speed",
      "inspiration",
      "xp",
      "hpmax",
      "hpcurrent",
      "hptemp",
      "hdtotal",
      "hd",
      "passive",
      "cp",
      "sp",
      "ep",
      "gp",
      "pp",
      "spellcastingability 2",
      "spellsavedc  2",
      "spellatkbonus 2"
    ]);

    function isCenteredNumberField(normalizedKey) {
      return CENTERED_NUMBER_FIELDS.has(normalizedKey)
        || normalizedKey.startsWith("st ")
        || normalizedKey.startsWith("slotstotal ")
        || normalizedKey.startsWith("slotsremaining ")
        || [
          "acrobatics",
          "animal",
          "arcana",
          "athletics",
          "deception",
          "history",
          "insight",
          "intimidation",
          "investigation",
          "medicine",
          "nature",
          "perception",
          "performance",
          "persuasion",
          "religion",
          "sleightofhand",
          "stealth",
          "survival"
        ].includes(normalizedKey);
    }

    function getFieldValueByNormalizedKey(normalizedKey) {
      const field = [...document.querySelectorAll(".field")].find((element) => element.dataset.key?.trim().toLowerCase() === normalizedKey);
      return field?.value?.trim() || "";
    }

    function getSelectedClassName() {
      return getFieldValueByNormalizedKey("spellcasting class 2") || getFieldValueByNormalizedKey("classlevel");
    }

    function getMainClassName() {
      return getFieldValueByNormalizedKey("classlevel");
    }

    function getSelectedRaceName() {
      return getFieldValueByNormalizedKey("race");
    }


    let saveTimer;
    function scheduleSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveData().catch(console.error), 220);
    }

    async function renderPage(pdf, pageNumber) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = BASE_WIDTH / baseViewport.width;
      const viewport = page.getViewport({ scale });

      const pageNode = document.createElement("section");
      pageNode.className = "sheet-page";
      pageNode.style.aspectRatio = `${viewport.width} / ${viewport.height}`;

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      pageNode.appendChild(canvas);

      const layer = document.createElement("form");
      layer.className = "field-layer";
      layer.autocomplete = "off";
      pageNode.appendChild(layer);
      app.appendChild(pageNode);

      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

      const annotations = await page.getAnnotations({ intent: "display" });
      annotations.forEach((annotation, index) => {
        const field = makeField(annotation, pageNumber, index, viewport);
        if (field) layer.appendChild(field);
      });
      createEquipmentPanel(layer);
      if (pageNumber === 1) createAddEquipmentButton(layer, viewport);
      if (pageNumber === 1) layer.appendChild(makeSyntheticLevelField(viewport));
      if (pageNumber === 1) createPreparedSpellsPanel(layer, viewport);
      if (pageNumber === 1) createRollHotspots(layer, viewport);
      if (pageNumber === 3) linkPreparedSpellFields(layer);
    }

    async function init() {
      await loadPdfJs();
      const [raceOptions, raceDetailData, backgroundOptions, backgroundDetailData, classOptions, classDetailData, spellOptions, featData, optionalFeatureData, itemData, languageData] = await Promise.all([
        loadRaceOptions(),
        loadRaceDetails(),
        loadBackgroundOptions(),
        loadBackgroundDetails(),
        loadClassOptions(),
        loadClassDetails(),
        loadSpellOptions(),
        loadFeatOptions(),
        loadOptionalFeatureOptions(),
        loadItemOptions(),
        loadLanguageOptions()
      ]);
      raceDetails = Array.isArray(raceDetailData?.race) ? raceDetailData.race : [];
      backgroundDetails = dedupeModernByName(Array.isArray(backgroundDetailData?.background) ? backgroundDetailData.background : [], (background) => background?.name || "", (background) => background?.source || "");
      fieldOptions = new Map([
        ["race", raceOptions],
        ["background", backgroundOptions],
        ["class", classOptions],
        ["alignment", alignmentOptions()],
        ["level", levelOptions()]
      ]);
      spells = dedupeModernByName(spellOptions, (spell) => spell?.name || "", (spell) => spell?.source || "");
      classDetails = classDetailData;
      feats = dedupeModernByName(Array.isArray(featData?.feat) ? featData.feat : [], (feat) => feat?.name || "", (feat) => feat?.source || "");
      optionalFeatures = dedupeModernByName(Array.isArray(optionalFeatureData?.optionalfeature) ? optionalFeatureData.optionalfeature : [], (feature) => feature?.name || "", (feature) => feature?.source || "");
      items = dedupeModernByName([
        ...(Array.isArray(itemData?.baseItems?.baseitem) ? itemData.baseItems.baseitem : []),
        ...(Array.isArray(itemData?.items?.item) ? itemData.items.item : [])
      ], (item) => item?.name || "", (item) => item?.source || "");
      itemProperties = Array.isArray(itemData?.baseItems?.itemProperty) ? itemData.baseItems.itemProperty : [];
      itemTypes = Array.isArray(itemData?.baseItems?.itemType) ? itemData.baseItems.itemType : [];
      itemMasteries = Array.isArray(itemData?.baseItems?.itemMastery) ? itemData.baseItems.itemMastery : [];
      languages = Array.isArray(languageData?.language) ? languageData.language : [];

      const pdfBytes = await loadPdfBytes();
      const pdf = await pdfjsLib.getDocument({ data: pdfBytes, disableWorker: true }).promise;

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        await renderPage(pdf, pageNumber);
      }

      applyData(await loadData());
      syncAutoCantrips();
      pruneInvalidSpellSourceSelections();
      pruneDuplicateSpellSelections();
      pruneOverLimitSpellSelections();
      updateDerivedStats();
      updateSpellcastingFields({ syncClass: true });
      updateSpellSlots();
      updatePreparedSpellsPanel();
      renderAlertsPanel();
      clearFieldsButton?.addEventListener("click", () => {
        clearAllFields().catch(console.error);
      });
      longRestButton?.addEventListener("click", longRestSpellResources);
      characterReadyButton?.addEventListener("click", toggleCharacterReady);
      app.addEventListener("pointerdown", handleLockedSheetEvent, true);
      app.addEventListener("keydown", handleLockedSheetEvent, true);
      app.addEventListener("beforeinput", handleLockedSheetEvent, true);
      document.addEventListener("pointerdown", handleLockedAuxiliaryInput, true);
      document.addEventListener("keydown", handleLockedAuxiliaryInput, true);
      document.addEventListener("change", handleLockedAuxiliaryInput, true);
      app.addEventListener("input", handleDerivedStatInput);
      app.addEventListener("change", handleDerivedStatInput);
      app.addEventListener("change", handleWizardPreparedLimitChange);
      app.addEventListener("input", scheduleSave);
      app.addEventListener("change", scheduleSave);
      app.addEventListener("input", updatePreparedSpellsPanel);
      app.addEventListener("change", updatePreparedSpellsPanel);
      app.addEventListener("input", updateEquipmentPanel);
      app.addEventListener("change", updateEquipmentPanel);
      app.addEventListener("input", renderAlertsPanel);
      app.addEventListener("change", renderAlertsPanel);
      app.addEventListener("change", handleSpellAvailabilityChange);
      itemDrawerClose.addEventListener("click", closeItemDrawer);
      itemPickerClose?.addEventListener("click", closeItemPicker);
      itemPickerSearch?.addEventListener("input", renderItemPickerList);
      itemPickerFilters?.addEventListener("click", (event) => {
        const button = event.target.closest(".item-picker-filter");
        if (!button) return;
        activeItemFilter = button.dataset.filter || "all";
        selectedPickerItem = null;
        if (itemPickerAdd) itemPickerAdd.disabled = true;
        renderItemPickerList();
      });
      itemPickerQuantity?.addEventListener("input", () => {
        if (selectedPickerItem) showItemDrawer({ displayName: selectedPickerItem.name, quantity: pickerQuantity() }, selectedPickerItem);
      });
      itemPickerAdd?.addEventListener("click", addSelectedPickerItem);
      itemPickerBackdrop?.addEventListener("click", (event) => {
        if (event.target === itemPickerBackdrop) closeItemPicker();
      });
      document.addEventListener("pointerdown", (event) => {
        if (!activeSelectField) return;
        if (event.target === activeSelectField || optionMenu.contains(event.target)) return;
        closeOptionMenu();
      });
      window.addEventListener("resize", closeOptionMenu);
      window.addEventListener("scroll", (event) => {
        if (optionMenu.contains(event.target)) return;
        closeOptionMenu();
      }, true);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeOptionMenu();
          closeItemPicker();
          closeItemDrawer();
        }
      });
      loading.style.display = "none";
    }


    const RELEASE_REPO = "Kaelthorian/DnD-Plataform";
    const downloadReleaseText = document.getElementById("downloadReleaseText");
    const downloadReleaseButton = document.getElementById("downloadReleaseButton");

    function pickReleaseAsset(assets) {
      const preferredExtensions = [".exe", ".msi", ".zip", ".7z"];
      return preferredExtensions
        .map((extension) => assets.find((asset) => asset.name.toLowerCase().endsWith(extension)))
        .find(Boolean) || assets[0] || null;
    }

    async function loadDownloadRelease() {
      try {
        const response = await fetch(`https://api.github.com/repos/${RELEASE_REPO}/releases/latest`, {
          headers: { Accept: "application/vnd.github+json" }
        });
        if (!response.ok) throw new Error(`GitHub respondio ${response.status}`);

        const release = await response.json();
        const asset = pickReleaseAsset(release.assets || []);
        downloadReleaseText.textContent = release.tag_name ? `Ultima version: ${release.tag_name}` : "Ultima version disponible";
        downloadReleaseButton.href = asset ? asset.browser_download_url : release.html_url;
        downloadReleaseButton.textContent = asset ? "Descargar" : "Ver release";
      } catch (error) {
        downloadReleaseText.textContent = "Ultima version";
        downloadReleaseButton.href = `https://github.com/${RELEASE_REPO}/releases/latest`;
        downloadReleaseButton.textContent = "Ver release";
      }
    }

    loadDownloadRelease();
