// Extracted general renderer infrastructure.
// Gameplay-heavy feat/spell/rest mechanics intentionally remain inline in index.html for now.

    "use strict";

    const STORAGE_KEY = "dnd-character-sheet-pdf-fields-v2";
    const BASE_WIDTH = 1000;
    const HIDDEN_PDF_PAGES = new Set([2]);
    const desktopStore = window.dndSheet || null;

    const app = document.getElementById("app");
    const loading = document.getElementById("loading");
    const status = document.getElementById("status");
    const topControlsMenu = document.getElementById("topControlsMenu");
    const topControlsLauncher = document.getElementById("topControlsLauncher");
    const topControlsPanel = document.getElementById("topControlsPanel");
    const appSettingsMenu = document.getElementById("appSettingsMenu");
    const appSettingsLauncher = document.getElementById("appSettingsLauncher");
    const appSettingsPanel = document.getElementById("appSettingsPanel");
    const diceAnimationToggle = document.getElementById("diceAnimationToggle");
    const dmScreenButton = document.getElementById("dmScreenButton");
    const liveSheetClientButton = document.getElementById("liveSheetClientButton");
    const generateSheetCodeButton = document.getElementById("generateSheetCodeButton");
    const saveSlotControl = document.getElementById("saveSlotControl");
    const saveSlotSelect = document.getElementById("saveSlotSelect");
    const saveSlotLabel = document.getElementById("saveSlotLabel");
    const clearFieldsButton = document.getElementById("clearFieldsButton");
    const longRestButton = document.getElementById("longRestButton");
    const shortRestButton = document.getElementById("shortRestButton");
    const characterReadyButton = document.getElementById("characterReadyButton");
    const turnActionsButton = document.getElementById("turnActionsButton");
    const turnActionsBackdrop = document.getElementById("turnActionsBackdrop");
    const turnActionsPanel = document.getElementById("turnActionsPanel");
    const turnActionsClose = document.getElementById("turnActionsClose");
    const turnActionsBody = document.getElementById("turnActionsBody");
    const turnActionsNewTurn = document.getElementById("turnActionsNewTurn");
    const turnActionsActionOrb = document.getElementById("turnActionsActionOrb");
    const turnActionsBonusOrb = document.getElementById("turnActionsBonusOrb");
    const turnActionsActionLabel = document.getElementById("turnActionsActionLabel");
    const turnActionsBonusLabel = document.getElementById("turnActionsBonusLabel");
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
    const familiarPickerBackdrop = document.getElementById("familiarPickerBackdrop");
    const familiarPickerClose = document.getElementById("familiarPickerClose");
    const familiarPickerList = document.getElementById("familiarPickerList");
    const familiarPickerOtherInput = document.getElementById("familiarPickerOtherInput");
    const familiarPickerCancel = document.getElementById("familiarPickerCancel");
    const familiarPickerConfirm = document.getElementById("familiarPickerConfirm");
    const familiarNoteRoot = document.getElementById("familiarNoteRoot");
    const damageTooltip = document.getElementById("damageTooltip");
    const liveSheetClientBackdrop = document.getElementById("liveSheetClientBackdrop");
    const liveSheetClientClose = document.getElementById("liveSheetClientClose");
    const liveSheetClientCancel = document.getElementById("liveSheetClientCancel");
    const liveSheetDmIp = document.getElementById("liveSheetDmIp");
    const liveSheetPort = document.getElementById("liveSheetPort");
    const liveSheetSessionToken = document.getElementById("liveSheetSessionToken");
    const liveSheetPlayerName = document.getElementById("liveSheetPlayerName");
    const liveSheetConnectButton = document.getElementById("liveSheetConnectButton");
    const liveSheetClientStatus = document.getElementById("liveSheetClientStatus");
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
    let activeSaveStore = null;
    let activeSaveSlotId = "slot-1";
    let isSwitchingSaveSlot = false;
    let sheetBackgroundImageUrl = "./assets/Background.png";
    let platformBackgroundImageUrl = "./assets/BackgroundSheet.png";
    const collapsibleSectionState = {};
    let fieldLookupCache = null;
    const UI_SETTINGS_KEY = "dnd-character-sheet-ui-settings-v1";
    const uiSettings = {
      diceRollAnimations: false
    };
    const LIVE_SHEET_CLIENT_SETTINGS_KEY = "dnd-character-sheet-live-client-v1";
    const LIVE_SHEET_PLAYER_ID_KEY = "dnd-character-sheet-live-player-id-v1";
    let liveSheetClientSocket = null;
    let liveSheetClientSendTimer = null;
    let liveSheetClientManualDisconnect = false;

    function loadUiSettings() {
      try {
        const parsed = JSON.parse(localStorage.getItem(UI_SETTINGS_KEY) || "{}");
        uiSettings.diceRollAnimations = Boolean(parsed?.diceRollAnimations);
      } catch (_error) {
        uiSettings.diceRollAnimations = false;
      }
      window.dndUiSettings = uiSettings;
    }

    function saveUiSettings() {
      localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(uiSettings));
      window.dndUiSettings = uiSettings;
    }

    function isDiceRollAnimationEnabled() {
      return Boolean(uiSettings.diceRollAnimations);
    }

    window.isDiceRollAnimationEnabled = isDiceRollAnimationEnabled;

    async function openDmScreen() {
      setAppSettingsMenuOpen(false);
      try {
        if (saveTimer) {
          clearTimeout(saveTimer);
          saveTimer = null;
        }
        if (typeof saveData === "function") await saveData();
        if (desktopStore?.openDmScreen) {
          await desktopStore.openDmScreen();
          return;
        }
        window.location.href = "./dm-screen.html";
      } catch (error) {
        console.error(error);
        showStatus("No se pudo abrir DM screen");
      }
    }

    function loadLiveSheetClientSettings() {
      try {
        const parsed = JSON.parse(localStorage.getItem(LIVE_SHEET_CLIENT_SETTINGS_KEY) || "{}");
        if (liveSheetDmIp) liveSheetDmIp.value = String(parsed.host || parsed.dmIp || "");
        if (liveSheetPort) liveSheetPort.value = String(parsed.port || "8787");
        if (liveSheetPlayerName) liveSheetPlayerName.value = String(parsed.playerName || "");
      } catch (_error) {
        if (liveSheetPort) liveSheetPort.value = "8787";
      }
    }

    function saveLiveSheetClientSettings() {
      localStorage.setItem(LIVE_SHEET_CLIENT_SETTINGS_KEY, JSON.stringify({
        host: liveSheetDmIp?.value?.trim() || "",
        port: liveSheetPort?.value?.trim() || "8787",
        playerName: liveSheetPlayerName?.value?.trim() || ""
      }));
    }

    function liveSheetPlayerId() {
      let playerId = localStorage.getItem(LIVE_SHEET_PLAYER_ID_KEY);
      if (!playerId) {
        playerId = globalThis.crypto?.randomUUID?.() || `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        localStorage.setItem(LIVE_SHEET_PLAYER_ID_KEY, playerId);
      }
      return playerId;
    }

    function setLiveSheetClientStatus(text, tone = "neutral") {
      if (liveSheetClientStatus) {
        liveSheetClientStatus.textContent = text;
        liveSheetClientStatus.dataset.tone = tone;
      }
      if (liveSheetConnectButton) {
        const connected = liveSheetClientSocket?.readyState === WebSocket.OPEN;
        const connecting = liveSheetClientSocket?.readyState === WebSocket.CONNECTING;
        liveSheetConnectButton.textContent = connected ? "Disconnect" : (connecting ? "Connecting..." : "Connect");
        liveSheetConnectButton.disabled = connecting;
      }
    }

    function defaultLiveSheetPlayerName() {
      const explicit = liveSheetPlayerName?.value?.trim();
      if (explicit) return explicit;
      const sheetPlayer = getFieldValueByNormalizedKey("playername");
      const sheetCharacter = getFieldValueByNormalizedKey("charactername");
      return sheetPlayer || sheetCharacter || "Player";
    }

    function liveSheetPublicData() {
      const data = typeof collectData === "function" ? collectData() : {};
      const publicData = { ...data };
      delete publicData.__sheetMeta;
      return publicData;
    }

    function sendLiveSheetMessage(payload) {
      if (!liveSheetClientSocket || liveSheetClientSocket.readyState !== WebSocket.OPEN) return false;
      liveSheetClientSocket.send(JSON.stringify({
        version: 1,
        playerId: liveSheetPlayerId(),
        playerName: defaultLiveSheetPlayerName(),
        sessionToken: liveSheetSessionToken?.value?.trim() || "",
        ...payload
      }));
      return true;
    }

    function sendLiveSheetHello() {
      sendLiveSheetMessage({ type: "player:hello" });
    }

    function sendLiveSheetSnapshot() {
      sendLiveSheetMessage({
        type: "sheet:update",
        data: liveSheetPublicData()
      });
    }

    function sendLiveSheetRollEvent(title, result, detail) {
      try {
        sendLiveSheetMessage({
          type: "roll:event",
          roll: {
            title: String(title || "Tirada"),
            result: String(result || ""),
            detail: String(detail || ""),
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error(error);
      }
    }
    window.sendLiveSheetRollEvent = sendLiveSheetRollEvent;

    function scheduleLiveSheetUpdate() {
      if (!liveSheetClientSocket || liveSheetClientSocket.readyState !== WebSocket.OPEN) return;
      clearTimeout(liveSheetClientSendTimer);
      liveSheetClientSendTimer = setTimeout(() => {
        try {
          sendLiveSheetSnapshot();
        } catch (error) {
          console.error(error);
          setLiveSheetClientStatus("No se pudo enviar la planilla.", "error");
        }
      }, 500);
    }

    function openLiveSheetClientPanel() {
      loadLiveSheetClientSettings();
      if (!liveSheetPlayerName?.value?.trim()) liveSheetPlayerName.value = defaultLiveSheetPlayerName();
      if (!liveSheetPort?.value) liveSheetPort.value = "8787";
      if (liveSheetClientBackdrop) {
        liveSheetClientBackdrop.hidden = false;
        liveSheetClientBackdrop.setAttribute("aria-hidden", "false");
      }
      setAppSettingsMenuOpen(false);
      setLiveSheetClientStatus(liveSheetClientSocket?.readyState === WebSocket.OPEN ? "Connected" : "Disconnected", liveSheetClientSocket?.readyState === WebSocket.OPEN ? "ok" : "neutral");
      requestAnimationFrame(() => {
        (liveSheetDmIp?.value ? liveSheetPlayerName : liveSheetDmIp)?.focus?.();
      });
    }

    function closeLiveSheetClientPanel() {
      if (liveSheetClientBackdrop) {
        liveSheetClientBackdrop.hidden = true;
        liveSheetClientBackdrop.setAttribute("aria-hidden", "true");
      }
      saveLiveSheetClientSettings();
    }

    function disconnectLiveSheetClient() {
      liveSheetClientManualDisconnect = true;
      clearTimeout(liveSheetClientSendTimer);
      liveSheetClientSendTimer = null;
      if (liveSheetClientSocket) {
        try {
          liveSheetClientSocket.close(1000, "Player disconnected");
        } catch (_error) {
          // Ignore close errors from stale sockets.
        }
      }
      liveSheetClientSocket = null;
      setLiveSheetClientStatus("Disconnected", "neutral");
      showStatus("Live sheet desconectada");
    }

    function normalizeLiveSheetHost(rawHost) {
      const trimmed = String(rawHost || "").trim();
      if (!trimmed) return "";
      const withoutProtocol = trimmed.replace(/^wss?:\/\//i, "");
      return withoutProtocol.split("/")[0].split(":")[0].trim();
    }

    function connectLiveSheetClient() {
      if (liveSheetClientSocket?.readyState === WebSocket.OPEN || liveSheetClientSocket?.readyState === WebSocket.CONNECTING) {
        disconnectLiveSheetClient();
        return;
      }

      const dmHost = normalizeLiveSheetHost(liveSheetDmIp?.value);
      const port = Number.parseInt(liveSheetPort?.value || "8787", 10);
      if (!dmHost) {
        setLiveSheetClientStatus("Ingresa el host o IP Tailscale del DM.", "error");
        liveSheetDmIp?.focus();
        return;
      }
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        setLiveSheetClientStatus("Puerto invalido.", "error");
        liveSheetPort?.focus();
        return;
      }

      if (liveSheetDmIp) liveSheetDmIp.value = dmHost;
      saveLiveSheetClientSettings();
      const url = `ws://${dmHost}:${port}`;
      liveSheetClientManualDisconnect = false;
      setLiveSheetClientStatus(`Connecting to ${url}`, "neutral");
      try {
        const socket = new WebSocket(url);
        liveSheetClientSocket = socket;
        socket.addEventListener("open", () => {
          setLiveSheetClientStatus(`Connected to ${url}`, "ok");
          sendLiveSheetHello();
          sendLiveSheetSnapshot();
          showStatus("Live sheet conectada");
        });
        socket.addEventListener("message", (event) => {
          let payload = null;
          try {
            payload = JSON.parse(String(event.data || ""));
          } catch (_error) {
            return;
          }
          if (payload?.type === "server:welcome") {
            setLiveSheetClientStatus(`Connected to ${url}`, "ok");
          }
          if (payload?.type === "server:ack" && payload.receivedType === "sheet:update") {
            setLiveSheetClientStatus("Synced with DM", "ok");
          }
          if (payload?.type === "dm:sheet:patch") {
            const applied = typeof applyLiveSheetPatch === "function" ? applyLiveSheetPatch(payload.patch) : false;
            setLiveSheetClientStatus(applied ? "Synced with DM" : "DM edit received, no matching fields", applied ? "ok" : "error");
          }
        });
        socket.addEventListener("close", () => {
          if (liveSheetClientSocket === socket) liveSheetClientSocket = null;
          setLiveSheetClientStatus(liveSheetClientManualDisconnect ? "Disconnected" : "Disconnected from DM.", liveSheetClientManualDisconnect ? "neutral" : "error");
        });
        socket.addEventListener("error", () => {
          setLiveSheetClientStatus("No se pudo conectar con el DM.", "error");
        });
      } catch (error) {
        console.error(error);
        liveSheetClientSocket = null;
        setLiveSheetClientStatus("Direccion WebSocket invalida.", "error");
      }
    }

    function syncSettingsControls() {
      if (diceAnimationToggle) diceAnimationToggle.checked = Boolean(uiSettings.diceRollAnimations);
    }

    loadUiSettings();

    function invalidateFieldLookupCache() {
      fieldLookupCache = null;
    }

    function fieldLookup() {
      if (fieldLookupCache) return fieldLookupCache;
      const fields = [...document.querySelectorAll(".field")];
      const byKey = new Map();
      fields.forEach((field) => {
        const key = field.dataset.key?.trim().toLowerCase();
        if (key && !byKey.has(key)) byKey.set(key, field);
      });
      fieldLookupCache = {
        fields,
        spellFields: fields.filter((field) => field.matches(".field.select[data-option-type='spell']")),
        byKey
      };
      return fieldLookupCache;
    }

    function allFieldElements() {
      return fieldLookup().fields;
    }

    function allSpellFieldElements() {
      return fieldLookup().spellFields;
    }

    function getFieldElementByNormalizedKey(normalizedKey) {
      return fieldLookup().byKey.get(String(normalizedKey || "").trim().toLowerCase()) || null;
    }

    if (app && typeof MutationObserver !== "undefined") {
      new MutationObserver(invalidateFieldLookupCache).observe(app, { childList: true, subtree: true });
    }

    function isTopControlsMenuOpen() {
      return Boolean(topControlsMenu?.classList.contains("open"));
    }

    function setTopControlsMenuOpen(open) {
      if (!topControlsMenu || !topControlsLauncher || !topControlsPanel) return;
      topControlsMenu.classList.toggle("open", Boolean(open));
      topControlsLauncher.setAttribute("aria-expanded", open ? "true" : "false");
      topControlsPanel.hidden = !open;
    }

    function isAppSettingsMenuOpen() {
      return Boolean(appSettingsMenu?.classList.contains("open"));
    }

    function setAppSettingsMenuOpen(open) {
      if (!appSettingsMenu || !appSettingsLauncher || !appSettingsPanel) return;
      appSettingsMenu.classList.toggle("open", Boolean(open));
      appSettingsLauncher.setAttribute("aria-expanded", open ? "true" : "false");
      appSettingsPanel.hidden = !open;
    }

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

    function isFileProtocol() {
      return window.location.protocol === "file:";
    }

    async function fetchLocalResource(resourcePath, { responseType = "json" } = {}) {
      const absoluteUrl = new URL(resourcePath, window.location.href).toString();
      if (!isFileProtocol()) {
        const response = await fetch(absoluteUrl);
        if (!response.ok) throw new Error(`No se encontro ${resourcePath} (${response.status})`);
        if (responseType === "arraybuffer") return response.arrayBuffer();
        if (responseType === "text") return response.text();
        return response.json();
      }
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", absoluteUrl, true);
        xhr.responseType = responseType === "arraybuffer" ? "arraybuffer" : "text";
        xhr.onload = () => {
          if (!(xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300))) {
            reject(new Error(`No se encontro ${resourcePath} (${xhr.status})`));
            return;
          }
          try {
            if (responseType === "arraybuffer") {
              resolve(xhr.response);
              return;
            }
            const text = xhr.responseText;
            resolve(responseType === "json" ? JSON.parse(text) : text);
          } catch (error) {
            reject(error);
          }
        };
        xhr.onerror = () => reject(new Error(`No se pudo cargar ${resourcePath}`));
        xhr.send();
      });
    }

    async function loadPdfBytes() {
      if (desktopStore?.loadPdf) return base64ToBytes(await desktopStore.loadPdf());
      return new Uint8Array(await fetchLocalResource("./assets/DnD_5E_CharacterSheet_FormFillable.pdf", { responseType: "arraybuffer" }));
    }

    async function resolveSheetBackgroundImageUrl() {
      try {
        const customUrl = await desktopStore?.getBackgroundImageUrl?.();
        return customUrl || "./assets/Background.png";
      } catch (_error) {
        return "./assets/Background.png";
      }
    }

    async function resolvePlatformBackgroundImageUrl() {
      try {
        const customUrl = await desktopStore?.getPlatformBackgroundImageUrl?.();
        return customUrl || "./assets/BackgroundSheet.png";
      } catch (_error) {
        return "./assets/BackgroundSheet.png";
      }
    }

    function applyPlatformBackgroundImage(backgroundUrl) {
      platformBackgroundImageUrl = backgroundUrl || "./assets/BackgroundSheet.png";
      document.documentElement.style.setProperty("--platform-background-image", `url("${platformBackgroundImageUrl}")`);
    }

    async function loadRaceOptions() {
      if (desktopStore?.loadRaces) return dedupeModernByName(await desktopStore.loadRaces(), optionName, optionSource);
      return dedupeModernByName(await fetchLocalResource("../../data/races/races.json"), optionName, optionSource);
    }

    async function loadRaceDetails() {
      try {
        return await fetchLocalResource("../../data/races/race-details.json");
      } catch (_error) {
        try {
          return await fetchLocalResource("../../../vendor/5etools-src-main/data/races.json");
        } catch (_vendorError) {
          return {};
        }
      }
    }

    async function loadBackgroundOptions() {
      if (desktopStore?.loadBackgrounds) return dedupeBackgroundOptions(await desktopStore.loadBackgrounds());
      return dedupeBackgroundOptions(await fetchLocalResource("../../data/backgrounds/backgrounds.json"));
    }

    async function loadBackgroundDetails() {
      try {
        return await fetchLocalResource("../../../vendor/5etools-src-main/data/backgrounds.json");
      } catch (_error) {
        return {};
      }
    }

    async function loadClassOptions() {
      const withoutSidekicks = (options) => (options || []).filter((option) => !/sidekick/i.test(optionName(option)));
      if (desktopStore?.loadClasses) return dedupeModernByName(withoutSidekicks(await desktopStore.loadClasses()), optionName, optionSource);
      return dedupeModernByName(withoutSidekicks(await fetchLocalResource("../../data/classes/classes.json")), optionName, optionSource);
    }

    async function loadClassDetails() {
      let classIndex;
      try {
        classIndex = await fetchLocalResource("../../../vendor/5etools-src-main/data/class/index.json");
      } catch (_error) {
        return [];
      }
      const files = Object.values(classIndex).filter((file) => /^class-.*\.json$/i.test(file));
      const loaded = await Promise.all(files.map((file) => fetchLocalResource(`../../../vendor/5etools-src-main/data/class/${file}`).catch(() => null)));
      return loaded.filter(Boolean);
    }

    async function loadSpellOptions() {
      if (desktopStore?.loadSpells) return dedupeModernByName(await desktopStore.loadSpells(), (spell) => spell?.name || "", (spell) => spell?.source || "");
      return dedupeModernByName(await fetchLocalResource("../../data/spells/spells.json"), (spell) => spell?.name || "", (spell) => spell?.source || "");
    }

    async function loadSpellActionMetadata() {
      let spellIndex;
      try {
        spellIndex = await fetchLocalResource("../../../vendor/5etools-src-main/data/spells/index.json");
      } catch (_error) {
        return [];
      }
      const files = Object.values(spellIndex).filter((file) => /^spells-.*\.json$/i.test(file));
      const loaded = await Promise.all(files.map((file) => fetchLocalResource(`../../../vendor/5etools-src-main/data/spells/${file}`).catch(() => null)));
      return loaded.flatMap((payload) => Array.isArray(payload?.spell) ? payload.spell : []);
    }

    function spellMetadataKey(spell) {
      return `${normalizeName(spell?.name || "")}|${sourceKey(spell?.source || optionSource(spell) || "")}`;
    }

    function mergeSpellActionMetadata(spellOptions, spellDetails) {
      const detailsByKey = new Map();
      const detailsByName = new Map();
      (Array.isArray(spellDetails) ? spellDetails : [])
        .filter(Boolean)
        .forEach((spell) => {
          detailsByKey.set(spellMetadataKey(spell), spell);
          const nameKey = normalizeName(spell?.name || "");
          if (!nameKey) return;
          if (!detailsByName.has(nameKey)) detailsByName.set(nameKey, []);
          detailsByName.get(nameKey).push(spell);
        });
      return dedupeModernByName(spellOptions, (spell) => spell?.name || "", (spell) => spell?.source || "")
        .map((spell) => {
          const detail = detailsByKey.get(spellMetadataKey(spell))
            || detailsByName.get(normalizeName(spell?.name || ""))?.find((candidate) => {
              const candidateSource = sourceKey(candidate?.source || "");
              const spellSource = sourceKey(spell?.source || optionSource(spell) || "");
              return spellSource ? candidateSource === spellSource : true;
            })
            || detailsByName.get(normalizeName(spell?.name || ""))?.[0];
          if (!detail?.time) return spell;
          return { ...spell, time: detail.time };
        });
    }

    async function loadFeatOptions() {
      if (desktopStore?.loadFeats) return desktopStore.loadFeats();
      return fetchLocalResource("../../../vendor/5etools-src-main/data/feats.json");
    }

    async function loadOptionalFeatureOptions() {
      try {
        return await fetchLocalResource("../../../vendor/5etools-src-main/data/optionalfeatures.json");
      } catch (_error) {
        return {};
      }
    }

    async function loadItemOptions() {
      if (desktopStore?.loadItems) return desktopStore.loadItems();
      const [itemsResponse, baseItemsResponse] = await Promise.all([
        fetchLocalResource("../../../vendor/5etools-src-main/data/items.json"),
        fetchLocalResource("../../../vendor/5etools-src-main/data/items-base.json")
      ]);
      return {
        items: itemsResponse,
        baseItems: baseItemsResponse
      };
    }

    async function loadConditionOptions() {
      if (desktopStore?.loadConditionsDiseases) return desktopStore.loadConditionsDiseases();
      return fetchLocalResource("../../../vendor/5etools-src-main/data/conditionsdiseases.json");
    }

    async function loadLanguageOptions() {
      if (desktopStore?.loadLanguages) return desktopStore.loadLanguages();
      return fetchLocalResource("../../../vendor/5etools-src-main/data/languages.json");
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

    function dedupeBackgroundOptions(itemsList = []) {
      const byDisplayName = new Map();
      itemsList.forEach((item) => {
        const key = String(optionName(item) || "").trim().toLowerCase();
        if (!key) return;
        byDisplayName.set(key, preferModernEntry(byDisplayName.get(key), item, optionSource));
      });
      return [...byDisplayName.values()];
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
      const field = getFieldElementByNormalizedKey(normalizedKey);
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
      scheduleLiveSheetUpdate();
    }

    let panelRefreshFrame = 0;
    const pendingPanelRefreshes = new Set();

    function schedulePanelRefresh(callback) {
      if (typeof callback !== "function") return;
      pendingPanelRefreshes.add(callback);
      if (panelRefreshFrame) return;
      panelRefreshFrame = requestAnimationFrame(() => {
        panelRefreshFrame = 0;
        const callbacks = [...pendingPanelRefreshes];
        pendingPanelRefreshes.clear();
        callbacks.forEach((refresh) => refresh());
      });
    }

    function schedulePreparedSpellsPanelRefresh() {
      schedulePanelRefresh(updatePreparedSpellsPanel);
    }

    function scheduleEquipmentPanelRefresh() {
      schedulePanelRefresh(updateEquipmentPanel);
    }

    function scheduleAlertsPanelRefresh() {
      schedulePanelRefresh(renderAlertsPanel);
    }

    function scheduleTurnActionsPanelRefresh() {
      schedulePanelRefresh(refreshTurnActionsPanelIfVisible);
    }

    async function renderPage(pdf, pageNumber) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = BASE_WIDTH / baseViewport.width;
      const viewport = page.getViewport({ scale });

      const pageNode = document.createElement("section");
      pageNode.className = "sheet-page";
      pageNode.classList.add("sheet-page-back-art");
      pageNode.style.aspectRatio = `${viewport.width} / ${viewport.height}`;

      const artLayer = document.createElement("div");
      artLayer.className = "sheet-page-art-layer";
      const artImage = document.createElement("img");
      artImage.className = "sheet-page-art-image";
      artImage.src = sheetBackgroundImageUrl;
      artImage.alt = "";
      artImage.setAttribute("aria-hidden", "true");
      artLayer.appendChild(artImage);
      pageNode.appendChild(artLayer);

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
      if (pageNumber === 1) createStatusDock(layer);
      if (pageNumber === 1) layer.appendChild(makeSyntheticLevelField(viewport));
      if (pageNumber === 1) createPreparedSpellsPanel(layer, viewport);
      if (pageNumber === 1) createRollHotspots(layer, viewport);
      if (pageNumber === 3) linkPreparedSpellFields(layer);
    }

    async function init() {
      await loadPdfJs();
      sheetBackgroundImageUrl = await resolveSheetBackgroundImageUrl();
      applyPlatformBackgroundImage(await resolvePlatformBackgroundImageUrl());
      document.documentElement.style.setProperty("--sheet-background-image", `url("${sheetBackgroundImageUrl}")`);
      if (desktopStore?.onPlatformBackgroundChanged) {
        const unsubscribePlatformBackground = desktopStore.onPlatformBackgroundChanged((nextUrl) => {
          applyPlatformBackgroundImage(nextUrl);
        });
        window.addEventListener("beforeunload", () => {
          try {
            unsubscribePlatformBackground?.();
          } catch (_error) {
            // Ignore listener cleanup errors.
          }
        }, { once: true });
      }
      const [raceOptions, raceDetailData, backgroundOptions, backgroundDetailData, classOptions, classDetailData, spellOptions, spellActionMetadata, featData, optionalFeatureData, itemData, conditionData, languageData] = await Promise.all([
        loadRaceOptions(),
        loadRaceDetails(),
        loadBackgroundOptions(),
        loadBackgroundDetails(),
        loadClassOptions(),
        loadClassDetails(),
        loadSpellOptions(),
        loadSpellActionMetadata(),
        loadFeatOptions(),
        loadOptionalFeatureOptions(),
        loadItemOptions(),
        loadConditionOptions(),
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
      spells = mergeSpellActionMetadata(spellOptions, spellActionMetadata);
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
      globalThis.dndConditionEngine?.setExternalConditionEntries?.(conditionData);
      languages = Array.isArray(languageData?.language) ? languageData.language : [];

      const pdfBytes = await loadPdfBytes();
      const pdf = await pdfjsLib.getDocument({ data: pdfBytes, disableWorker: true }).promise;

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        if (HIDDEN_PDF_PAGES.has(pageNumber)) continue;
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
      updateEquipmentPanel();
      updateInteractionState();
      syncSettingsControls();
      topControlsLauncher?.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      topControlsLauncher?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setAppSettingsMenuOpen(false);
        setTopControlsMenuOpen(!isTopControlsMenuOpen());
      });
      appSettingsLauncher?.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      appSettingsLauncher?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setTopControlsMenuOpen(false);
        setAppSettingsMenuOpen(!isAppSettingsMenuOpen());
      });
      diceAnimationToggle?.addEventListener("change", (event) => {
        uiSettings.diceRollAnimations = Boolean(event.target.checked);
        saveUiSettings();
        if (!uiSettings.diceRollAnimations) window.stopDiceRoll3d?.();
        showStatus(uiSettings.diceRollAnimations ? "Dados 3D activados" : "Dados 3D desactivados");
      });
      dmScreenButton?.addEventListener("click", openDmScreen);
      liveSheetClientButton?.addEventListener("click", openLiveSheetClientPanel);
      liveSheetClientClose?.addEventListener("click", closeLiveSheetClientPanel);
      liveSheetClientCancel?.addEventListener("click", closeLiveSheetClientPanel);
      liveSheetConnectButton?.addEventListener("click", connectLiveSheetClient);
      [liveSheetDmIp, liveSheetPort, liveSheetPlayerName]
        .filter(Boolean)
        .forEach((input) => input.addEventListener("change", saveLiveSheetClientSettings));
      liveSheetClientBackdrop?.addEventListener("click", (event) => {
        if (event.target === liveSheetClientBackdrop) closeLiveSheetClientPanel();
      });
      generateSheetCodeButton?.addEventListener("click", () => {
        generateCharacterSheetCode().catch((error) => {
          console.error(error);
          showStatus(error?.message || "No se pudo generar el codigo");
        });
      });
      clearFieldsButton?.addEventListener("click", () => {
        clearAllFields().catch(console.error);
      });
      saveSlotSelect?.addEventListener("change", (event) => {
        setTopControlsMenuOpen(false);
        switchSaveSlot(event.target.value).catch(console.error);
      });
      [clearFieldsButton, longRestButton, shortRestButton, characterReadyButton, turnActionsButton]
        .filter(Boolean)
        .forEach((button) => button.addEventListener("click", () => setTopControlsMenuOpen(false)));
      longRestButton?.addEventListener("click", longRestSpellResources);
      shortRestButton?.addEventListener("click", shortRestResources);
      characterReadyButton?.addEventListener("click", toggleCharacterReady);
      turnActionsButton?.addEventListener("click", openTurnActionsPanel);
      turnActionsClose?.addEventListener("click", closeTurnActionsPanel);
      turnActionsNewTurn?.addEventListener("click", startNewCombatTurn);
      turnActionsBackdrop?.addEventListener("click", (event) => {
        if (event.target === turnActionsBackdrop) closeTurnActionsPanel();
      });
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
      app.addEventListener("input", scheduleLiveSheetUpdate);
      app.addEventListener("change", scheduleLiveSheetUpdate);
      app.addEventListener("input", schedulePreparedSpellsPanelRefresh);
      app.addEventListener("change", schedulePreparedSpellsPanelRefresh);
      app.addEventListener("input", scheduleEquipmentPanelRefresh);
      app.addEventListener("change", scheduleEquipmentPanelRefresh);
      app.addEventListener("input", scheduleAlertsPanelRefresh);
      app.addEventListener("change", scheduleAlertsPanelRefresh);
      document.addEventListener("pointerdown", (event) => {
        if (!isTopControlsMenuOpen() || topControlsMenu?.contains(event.target)) return;
        setTopControlsMenuOpen(false);
      });
      document.addEventListener("pointerdown", (event) => {
        if (!isAppSettingsMenuOpen() || appSettingsMenu?.contains(event.target)) return;
        setAppSettingsMenuOpen(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !isTopControlsMenuOpen()) return;
        setTopControlsMenuOpen(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !isAppSettingsMenuOpen()) return;
        setAppSettingsMenuOpen(false);
      });
      app.addEventListener("input", scheduleTurnActionsPanelRefresh);
      app.addEventListener("change", scheduleTurnActionsPanelRefresh);
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
      familiarPickerClose?.addEventListener("click", closeFindFamiliarPicker);
      familiarPickerCancel?.addEventListener("click", closeFindFamiliarPicker);
      familiarPickerConfirm?.addEventListener("click", confirmFindFamiliarCast);
      familiarPickerBackdrop?.addEventListener("click", (event) => {
        if (event.target === familiarPickerBackdrop) closeFindFamiliarPicker();
      });
      familiarPickerOtherInput?.addEventListener("input", () => selectFindFamiliarOption("other"));
      familiarPickerOtherInput?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        confirmFindFamiliarCast();
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
          closeFindFamiliarPicker();
          closeItemDrawer();
          closeTurnActionsPanel();
          closeLiveSheetClientPanel();
        }
      });
      window.addEventListener("beforeunload", () => {
        if (liveSheetClientSocket) {
          liveSheetClientManualDisconnect = true;
          liveSheetClientSocket.close(1000, "Window closed");
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
