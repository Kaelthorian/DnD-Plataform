// Extracted general renderer infrastructure.
// Gameplay-heavy feat/spell/rest mechanics intentionally remain inline in index.html for now.

    "use strict";

    const STORAGE_KEY = "dnd-character-sheet-pdf-fields-v2";
    const BASE_WIDTH = 1000;
    const HIDDEN_PDF_PAGES = new Set([2]);
    const desktopStore = window.dndSheet || null;
    const playerI18n = window.dndPlayerI18n || {
      getLanguage: () => "en",
      setLanguage: () => "en",
      t: (key, params = {}) => String(key || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => (
        Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
      )),
      applyTranslations: () => {},
      translateDynamicText: (_key, fallback = "") => fallback
    };
    const t = (key, params) => playerI18n.t(key, params);
    const translateDynamicText = (key, fallback, params) => playerI18n.translateDynamicText(key, fallback, params);
    let latestUpdaterState = null;

    const app = document.getElementById("app");
    const loading = document.getElementById("loading");
    const status = document.getElementById("status");
    const topControlsMenu = document.getElementById("topControlsMenu");
    const topControlsLauncher = document.getElementById("topControlsLauncher");
    const topControlsPanel = document.getElementById("topControlsPanel");
    const appSettingsMenu = document.getElementById("appSettingsMenu");
    const appSettingsLauncher = document.getElementById("appSettingsLauncher");
    const appSettingsPanel = document.getElementById("appSettingsPanel");
    const playerLanguageButtons = [...document.querySelectorAll("[data-player-language]")];
    const dmScreenButton = document.getElementById("dmScreenButton");
    const liveSheetClientButton = document.getElementById("liveSheetClientButton");
    const generateSheetCodeButton = document.getElementById("generateSheetCodeButton");
    const checkUpdatesButton = document.getElementById("checkUpdatesButton");
    const downloadReleaseVersion = document.getElementById("downloadReleaseVersion");
    const downloadReleaseText = document.getElementById("downloadReleaseText");
    const downloadReleaseButton = document.getElementById("downloadReleaseButton");
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
    const turnActionsHeader = document.getElementById("turnActionsHeader");
    const turnActionsTranslate = document.getElementById("turnActionsTranslate");
    const turnActionsCollapse = document.getElementById("turnActionsCollapse");
    const turnActionsResizeHandles = Array.from(document.querySelectorAll("[data-combat-resize-edge]"));
    const turnActionsClose = document.getElementById("turnActionsClose");
    const turnActionsBody = document.getElementById("turnActionsBody");
    const turnActionsNewTurn = document.getElementById("turnActionsNewTurn");
    const turnActionsActionOrb = document.getElementById("turnActionsActionOrb");
    const turnActionsBonusOrb = document.getElementById("turnActionsBonusOrb");
    const turnActionsActionLabel = document.getElementById("turnActionsActionLabel");
    const turnActionsBonusLabel = document.getElementById("turnActionsBonusLabel");
    const turnActionsReactionOrb = document.getElementById("turnActionsReactionOrb");
    const turnActionsMovementOrb = document.getElementById("turnActionsMovementOrb");
    const turnActionsObjectOrb = document.getElementById("turnActionsObjectOrb");
    const turnActionsAttacksCounter = document.getElementById("turnActionsAttacksCounter");
    const turnActionsAttacksOrb = document.getElementById("turnActionsAttacksOrb");
    const turnActionsEndTurn = document.getElementById("turnActionsEndTurn");
    const combatResolution = document.getElementById("combatResolution");
    const combatLogSection = document.getElementById("combatLogSection");
    const combatLogList = document.getElementById("combatLogList");
    const combatLogClear = document.getElementById("combatLogClear");
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
    let itemDrawer = null;
    let itemDrawerTitle = null;
    let itemDrawerMeta = null;
    let itemDrawerBody = null;
    let itemDrawerClose = null;

    // The drawer lives in the static shell, but it can be reconstructed while
    // the sheet is loading. Resolve it again before a detail view uses it.
    function refreshItemDrawerElements() {
      itemDrawer = document.getElementById("itemDrawer");
      itemDrawerTitle = document.getElementById("itemDrawerTitle");
      itemDrawerMeta = document.getElementById("itemDrawerMeta");
      itemDrawerBody = document.getElementById("itemDrawerBody");
      itemDrawerClose = document.getElementById("itemDrawerClose");
      return Boolean(itemDrawer && itemDrawerTitle && itemDrawerMeta && itemDrawerBody);
    }

    refreshItemDrawerElements();
    const itemPickerBackdrop = document.getElementById("itemPickerBackdrop");
    const itemPickerClose = document.getElementById("itemPickerClose");
    const itemPickerSearch = document.getElementById("itemPickerSearch");
    const itemPickerFilters = document.getElementById("itemPickerFilters");
    const itemPickerList = document.getElementById("itemPickerList");
    const itemPickerCount = document.getElementById("itemPickerCount");
    const itemPickerDetail = document.getElementById("itemPickerDetail");
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
    const liveSheetConnectionMode = document.getElementById("liveSheetConnectionMode");
    const liveSheetModeHelp = document.getElementById("liveSheetModeHelp");
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
    let retiredItems = [];
    let itemLookupByCatalogId = new Map();
    let itemLookupByIdentity = new Map();
    let itemLookupByNameSource = new Map();
    let itemLookupByName = new Map();
    let itemCatalogNameSourceCounts = new Map();
    let itemCatalogReady = false;
    let itemCatalogReadyPromise = Promise.resolve(false);
    let itemCatalogLoadMeta = {};
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
    const LIVE_SHEET_CLIENT_SETTINGS_KEY = "dnd-character-sheet-live-client-v1";
    const LIVE_SHEET_PLAYER_ID_KEY = "dnd-character-sheet-live-player-id-v1";
    let liveSheetClientSocket = null;
    let liveSheetClientSendTimer = null;
    let liveSheetClientManualDisconnect = false;
    let liveVttState = null;
    let liveVttImageDataUrl = "";
    let liveVttElements = null;
    let liveVttPings = [];
    let liveVttBaseLayout = null;
    let liveVttView = { scale: 1, x: 0, y: 0 };
    let liveVttViewKey = "";
    let liveVttPointer = null;
    let liveVttHandRaised = false;
    let liveVttHandStateReason = "sync";
    let liveVttHandQueue = [];
    let liveDmAudioPlayers = [];
    const liveDmAudioPlayersById = new Map();
    let liveDmYoutubePanel = null;
    let liveDmYoutubeTitle = null;
    let liveDmYoutubePlayer = null;
    let liveDmYoutubePlayerId = "";
    let liveDmYoutubeVideoId = "";
    const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";
    const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
    const liveVttTokenImageCache = new Map();
    const LIVE_VTT_PING_TTL_MS = 5000;
    const LIVE_VTT_MIN_ZOOM = 1;
    const LIVE_VTT_MAX_ZOOM = 4;

    function liveVttCombatTargetRoster() {
      const state = liveVttState;
      const roster = { party: [], enemies: [] };
      if (!state?.active) return roster;
      const seen = {
        party: new Set(),
        enemies: new Set()
      };
      const addTarget = (group, participant) => {
        const name = String(participant?.name || participant?.character?.name || "").trim();
        if (!name) return;
        const key = `${participant?.kind || group}:${name.toLocaleLowerCase()}`;
        if (seen[group].has(key)) return;
        seen[group].add(key);
        roster[group].push({ id: String(participant?.id || key), name });
      };

      (Array.isArray(state.tokens) ? state.tokens : [])
        .filter((token) => token?.kind === "character" && !token?.hidden && !token?.playerHidden)
        .forEach((token) => addTarget("party", token));
      if (!state.combat?.active) return roster;
      (Array.isArray(state.combat.participants) ? state.combat.participants : [])
        .filter((participant) => !participant?.hidden && !participant?.playerHidden)
        .forEach((participant) => addTarget(participant?.kind === "character" ? "party" : "enemies", participant));
      return roster;
    }

    // Public roster intentionally exposes visible names only; AC and HP stay DM-private.
    globalThis.dndLiveVttCombatTargetRoster = liveVttCombatTargetRoster;

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
        showStatus("Could not open DM screen");
      }
    }

    function loadLiveSheetClientSettings() {
      try {
        const parsed = JSON.parse(localStorage.getItem(LIVE_SHEET_CLIENT_SETTINGS_KEY) || "{}");
        if (liveSheetConnectionMode) {
          const mode = String(parsed.connectionMode || "tailscale");
          liveSheetConnectionMode.value = ["lan", "tailscale", "direct-internet"].includes(mode) ? mode : "tailscale";
        }
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
        connectionMode: liveSheetConnectionMode?.value || "tailscale",
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
      const translated = translateDynamicText(text, text);
      if (liveSheetClientStatus) {
        liveSheetClientStatus.textContent = translated;
        liveSheetClientStatus.dataset.tone = tone;
        liveSheetClientStatus.dataset.statusKey = text;
      }
      if (liveSheetConnectButton) {
        const connected = liveSheetClientSocket?.readyState === WebSocket.OPEN;
        const connecting = liveSheetClientSocket?.readyState === WebSocket.CONNECTING;
        liveSheetConnectButton.textContent = connected ? t("live.disconnect") : (connecting ? t("live.connecting") : t("live.connect"));
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
      publicData.__liveStatuses = Array.isArray(data?.__sheetMeta?.activeStatuses)
        ? [...data.__sheetMeta.activeStatuses]
        : [];
      delete publicData.__sheetMeta;
      return publicData;
    }

    function ensureLiveVttWindow() {
      if (liveVttElements) return liveVttElements;
      const style = document.createElement("style");
      style.textContent = `
        .live-vtt-window {
          position: fixed;
          inset: 4vh 4vw;
          z-index: 9998;
          display: flex;
          flex-direction: column;
          min-width: 280px;
          min-height: 220px;
          border: 1px solid rgba(245, 158, 11, 0.72);
          background: #020617;
          color: #e5e7eb;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.72);
        }
        .live-vtt-window[hidden] { display: none; }
        .live-vtt-window.is-minimized {
          inset: auto 4vw 4vh auto;
          width: min(360px, 92vw);
          min-height: 0;
        }
        .live-vtt-window.is-minimized .live-vtt-body {
          display: none;
        }
        .live-vtt-map[hidden],
        .live-vtt-combat[hidden],
        .live-vtt-grid[hidden],
        .live-vtt-tokens[hidden],
        .live-vtt-markers[hidden],
        .live-vtt-fog[hidden],
        .live-vtt-empty[hidden] {
          display: none;
        }
        .live-vtt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 2px solid #f59e0b;
          padding: 10px 12px;
          background: #111827;
        }
        .live-vtt-title {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font: 700 14px/1.1 system-ui, sans-serif;
          text-transform: uppercase;
          color: #fbbf24;
        }
        .live-vtt-window-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .live-vtt-minimize {
          width: 28px;
          height: 28px;
          border: 1px solid #4b5563;
          background: #1f2937;
          color: #f9fafb;
          font-weight: 700;
        }
        .live-vtt-hand {
          height: 28px;
          min-width: 96px;
          border: 1px solid #4b5563;
          background: #1f2937;
          color: #fde68a;
          font: 900 11px/1 system-ui, sans-serif;
          text-transform: uppercase;
        }
        .live-vtt-hand[aria-pressed="true"] {
          border-color: #fbbf24;
          background: #fbbf24;
          color: #111827;
          box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.24);
        }
        .live-vtt-hand-panel {
          display: grid;
          gap: 7px;
          border-bottom: 1px solid rgba(75, 85, 99, 0.9);
          padding: 8px 12px;
          background: rgba(15, 23, 42, 0.98);
        }
        .live-vtt-hand-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .live-vtt-hand-queue-title {
          color: #fbbf24;
          font: 900 11px/1 system-ui, sans-serif;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .live-vtt-hand-status {
          color: #9ca3af;
          font: 700 11px/1.2 system-ui, sans-serif;
          text-align: right;
        }
        .live-vtt-hand-status[data-raised="true"] {
          color: #fde68a;
        }
        .live-vtt-hand-queue {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 5px;
          max-height: 102px;
          overflow: auto;
        }
        .live-vtt-hand-entry {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr) auto;
          align-items: center;
          gap: 6px;
          border: 1px solid #374151;
          background: #020617;
          padding: 4px 6px;
          color: #e5e7eb;
          font: 700 11px/1.2 system-ui, sans-serif;
        }
        .live-vtt-hand-entry[data-own="true"] {
          border-color: #f59e0b;
          background: rgba(120, 53, 15, 0.26);
        }
        .live-vtt-hand-position {
          display: flex;
          width: 24px;
          height: 24px;
          align-items: center;
          justify-content: center;
          background: #f59e0b;
          color: #111827;
          font-weight: 900;
        }
        .live-vtt-hand-player {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .live-vtt-hand-you {
          color: #fbbf24;
          font-size: 9px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .live-vtt-hand-empty {
          color: #6b7280;
          font: 600 11px/1.2 system-ui, sans-serif;
        }
        .live-vtt-window.is-minimized .live-vtt-hand-queue {
          grid-template-columns: 1fr;
          max-height: 68px;
        }
        .live-vtt-combat {
          position: absolute;
          left: 50%;
          top: 10px;
          z-index: 8;
          width: min(880px, calc(100% - 32px));
          height: 104px;
          transform: translateX(-50%);
          overflow: hidden;
          pointer-events: none;
          filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.72));
        }
        .live-vtt-combat-track {
          display: flex;
          align-items: flex-start;
          gap: 4px;
          min-width: max-content;
          padding: 3px;
        }
        .live-vtt-combat-card {
          position: relative;
          flex: 0 0 66px;
          width: 66px;
          height: 82px;
          overflow: hidden;
          border: 3px solid #111827;
          border-radius: 2px;
          background: #111827;
          color: #f8fafc;
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.55);
          transition: width 180ms ease, height 180ms ease, transform 180ms ease;
        }
        .live-vtt-combat-card[data-active="true"] {
          flex-basis: 78px;
          width: 78px;
          height: 98px;
          border-color: #38bdf8;
          box-shadow: 0 0 0 2px #0f172a, 0 0 12px rgba(56, 189, 248, 0.88), 0 0 26px rgba(14, 165, 233, 0.62);
        }
        .live-vtt-combat-portrait {
          position: relative;
          display: flex;
          width: 100%;
          height: calc(100% - 16px);
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: radial-gradient(circle at 40% 25%, #334155, #020617 72%);
          font: 900 17px/1 system-ui, sans-serif;
        }
        .live-vtt-combat-card[data-kind="character"] .live-vtt-combat-portrait {
          background: radial-gradient(circle at 40% 25%, #0369a1, #082f49 72%);
        }
        .live-vtt-combat-card .live-vtt-token-image {
          border-radius: 0;
        }
        .live-vtt-combat-card .live-vtt-token-initials {
          position: relative;
          z-index: 1;
        }
        .live-vtt-combat-name {
          position: absolute;
          inset: auto 2px 17px;
          z-index: 2;
          overflow: hidden;
          padding: 2px 3px;
          background: rgba(2, 6, 23, 0.84);
          text-overflow: ellipsis;
          white-space: nowrap;
          font: 800 9px/1.1 system-ui, sans-serif;
          text-align: center;
        }
        .live-vtt-combat-initiative {
          position: absolute;
          left: 2px;
          top: 2px;
          z-index: 3;
          min-width: 20px;
          border: 1px solid rgba(255, 255, 255, 0.72);
          border-radius: 999px;
          background: rgba(2, 6, 23, 0.9);
          padding: 2px 4px;
          color: #fef3c7;
          font: 900 9px/1 system-ui, sans-serif;
          text-align: center;
        }
        .live-vtt-combat-health {
          position: absolute;
          inset: auto 2px 2px;
          height: 10px;
          overflow: hidden;
          border: 1px solid #020617;
          background: #7f1d1d;
        }
        .live-vtt-combat-health-fill {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #0284c7, #38bdf8);
        }
        .live-vtt-round-divider {
          flex: 0 0 10px;
          width: 10px;
          height: 82px;
          margin: 0 4px;
          border: 2px solid #111827;
          background: repeating-linear-gradient(135deg, #9ca3af 0 6px, #4b5563 6px 12px);
          box-shadow: 0 0 0 1px rgba(229, 231, 235, 0.52);
        }
        .live-vtt-body {
          position: relative;
          flex: 1;
          overflow: hidden;
          background: #020617;
        }
        .live-vtt-map {
          position: absolute;
          object-fit: contain;
          display: block;
        }
        .live-vtt-fog {
          position: absolute;
          pointer-events: none;
          z-index: 4;
        }
        .live-vtt-pings {
          position: absolute;
          pointer-events: none;
          z-index: 5;
        }
        .live-vtt-pings[hidden] {
          display: none;
        }
        .live-vtt-ping {
          position: absolute;
          width: 54px;
          height: 54px;
          transform: translate(-50%, -50%);
          border: 3px solid #38bdf8;
          border-radius: 999px;
          box-shadow: 0 0 0 6px rgba(56, 189, 248, 0.2), 0 0 28px rgba(56, 189, 248, 0.74);
          animation: live-vtt-ping-fade 5s ease-out forwards;
        }
        .live-vtt-ping::before,
        .live-vtt-ping::after {
          content: "";
          position: absolute;
          inset: 50% auto auto 50%;
          width: 18px;
          height: 3px;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: #e0f2fe;
          box-shadow: 0 0 10px rgba(14, 165, 233, 0.9);
        }
        .live-vtt-ping::after {
          transform: translate(-50%, -50%) rotate(90deg);
        }
        .live-vtt-ping-label {
          position: absolute;
          left: 50%;
          top: calc(100% + 4px);
          max-width: 140px;
          transform: translateX(-50%);
          overflow: hidden;
          border: 1px solid rgba(56, 189, 248, 0.8);
          background: rgba(2, 6, 23, 0.92);
          padding: 3px 7px;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #e0f2fe;
          font: 800 11px/1.1 system-ui, sans-serif;
        }
        @keyframes live-vtt-ping-fade {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.72); }
          8% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          72% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.22); }
        }
        .live-vtt-grid {
          position: absolute;
          pointer-events: none;
          z-index: 2;
        }
        .live-vtt-tokens {
          position: absolute;
          pointer-events: none;
          z-index: 3;
        }
        .live-vtt-markers {
          position: absolute;
          pointer-events: none;
          z-index: 5;
        }
        .live-vtt-marker {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translate(-50%, -100%);
          color: #fef3c7;
          font: 800 10px/1.1 system-ui, sans-serif;
          text-transform: uppercase;
        }
        .live-vtt-marker[data-marker-type="shape"] {
          display: block;
          transform: none;
          color: #f8fafc;
        }
        .live-vtt-marker-shape {
          position: absolute;
          inset: 0;
          border: 2px solid var(--live-vtt-marker-border, rgba(245, 158, 11, 0.88));
          background: var(--live-vtt-marker-fill, rgba(245, 158, 11, 0.32));
          box-shadow: 0 0 18px rgba(0, 0, 0, 0.45);
        }
        .live-vtt-marker-shape[data-form-type="cone"] {
          clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
        }
        .live-vtt-marker-shape[data-form-type="circle"] {
          border-radius: 999px;
        }
        .live-vtt-marker-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.8;
          mix-blend-mode: screen;
          background-repeat: repeat;
        }
        .live-vtt-marker-pin {
          display: flex;
          width: 28px;
          height: 28px;
          align-items: center;
          justify-content: center;
          transform: rotate(-45deg);
          border: 2px solid #020617;
          border-radius: 9999px 9999px 9999px 2px;
          background: #fbbf24;
          color: #020617;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.7);
          font: 900 11px/1 system-ui, sans-serif;
        }
        .live-vtt-marker-pin span {
          transform: rotate(45deg);
        }
        .live-vtt-marker-pin-icon {
          display: flex;
          width: 58%;
          height: 58%;
          align-items: center;
          justify-content: center;
        }
        .live-vtt-marker-pin-icon svg {
          width: 100%;
          height: 100%;
        }
        .live-vtt-marker-label {
          max-width: 128px;
          margin-top: 4px;
          overflow: hidden;
          border: 1px solid rgba(75, 85, 99, 0.92);
          background: rgba(2, 6, 23, 0.92);
          padding: 2px 6px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .live-vtt-token {
          position: absolute;
          transform-origin: 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fcd34d;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 25%, rgba(255,255,255,0.24), transparent 30%), #0f172a;
          color: #f8fafc;
          box-shadow: 0 5px 14px rgba(0, 0, 0, 0.72);
          font: 800 12px/1 system-ui, sans-serif;
        }
        .live-vtt-token[data-kind="character"] {
          border-color: #7dd3fc;
          background: radial-gradient(circle at 35% 25%, rgba(255,255,255,0.28), transparent 30%), #075985;
        }
        .live-vtt-token[data-has-image="true"] .live-vtt-token-initials {
          display: none;
        }
        .live-vtt-token-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          object-fit: cover;
        }
        .live-vtt-token-initials {
          position: relative;
          z-index: 1;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
        }
        .live-vtt-token-label {
          position: absolute;
          left: 50%;
          top: calc(100% + 3px);
          max-width: 92px;
          transform: translateX(-50%);
          overflow: hidden;
          border: 1px solid rgba(75, 85, 99, 0.92);
          background: rgba(2, 6, 23, 0.92);
          padding: 2px 5px;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #f9fafb;
          font: 700 10px/1.1 system-ui, sans-serif;
        }
        .live-vtt-token-health {
          position: absolute;
          inset: -5px;
          z-index: 3;
          border-radius: 999px;
          background: conic-gradient(
            from -90deg,
            var(--live-vtt-health-color, #22c55e) 0deg var(--live-vtt-health-angle, 0deg),
            rgba(15, 23, 42, 0.88) var(--live-vtt-health-angle, 0deg) 360deg
          );
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
          pointer-events: none;
        }
        .live-vtt-token-health[data-state="wounded"] {
          --live-vtt-health-color: #f59e0b;
        }
        .live-vtt-token-health[data-state="critical"] {
          --live-vtt-health-color: #ef4444;
        }
        .live-vtt-empty {
          display: flex;
          height: 100%;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
          color: #9ca3af;
          font: 600 14px/1.35 system-ui, sans-serif;
        }
      `;
      document.head.appendChild(style);

      const root = document.createElement("section");
      root.className = "live-vtt-window";
      root.hidden = true;
      root.setAttribute("aria-label", "VTT map");
      root.innerHTML = `
        <header class="live-vtt-header">
          <div class="live-vtt-title"></div>
          <div class="live-vtt-window-actions">
            <button class="live-vtt-hand" type="button" aria-pressed="false"></button>
            <button class="live-vtt-minimize" type="button" aria-label="Minimizar VTT">-</button>
          </div>
        </header>
        <section class="live-vtt-hand-panel" aria-live="polite">
          <div class="live-vtt-hand-summary">
            <span class="live-vtt-hand-queue-title"></span>
            <span class="live-vtt-hand-status"></span>
          </div>
          <div class="live-vtt-hand-queue"></div>
        </section>
        <div class="live-vtt-body">
          <div class="live-vtt-empty">Esperando mapa VTT del DM.</div>
          <div class="live-vtt-combat" aria-live="polite" hidden><div class="live-vtt-combat-track"></div></div>
          <img class="live-vtt-map" alt="Mapa VTT" draggable="false" hidden>
          <div class="live-vtt-grid" hidden></div>
          <div class="live-vtt-tokens" hidden></div>
          <div class="live-vtt-markers" hidden></div>
          <canvas class="live-vtt-fog" hidden></canvas>
          <div class="live-vtt-pings" hidden></div>
        </div>
      `;
      document.body.appendChild(root);
      const elements = {
        root,
        title: root.querySelector(".live-vtt-title"),
        hand: root.querySelector(".live-vtt-hand"),
        handQueueTitle: root.querySelector(".live-vtt-hand-queue-title"),
        handStatus: root.querySelector(".live-vtt-hand-status"),
        handQueue: root.querySelector(".live-vtt-hand-queue"),
        minimize: root.querySelector(".live-vtt-minimize"),
        body: root.querySelector(".live-vtt-body"),
        empty: root.querySelector(".live-vtt-empty"),
        combat: root.querySelector(".live-vtt-combat"),
        combatTrack: root.querySelector(".live-vtt-combat-track"),
        image: root.querySelector(".live-vtt-map"),
        grid: root.querySelector(".live-vtt-grid"),
        tokens: root.querySelector(".live-vtt-tokens"),
        markers: root.querySelector(".live-vtt-markers"),
        fog: root.querySelector(".live-vtt-fog"),
        pings: root.querySelector(".live-vtt-pings")
      };
      elements.minimize.addEventListener("click", () => {
        const minimized = !root.classList.contains("is-minimized");
        root.classList.toggle("is-minimized", minimized);
        elements.minimize.textContent = minimized ? "+" : "-";
        elements.minimize.setAttribute("aria-label", minimized ? "Restaurar VTT" : "Minimizar VTT");
        if (!minimized) requestAnimationFrame(updateLiveVttLayout);
      });
      elements.hand.addEventListener("click", toggleLiveVttHand);
      elements.body.addEventListener("pointerdown", handleLiveVttPointerDown);
      elements.body.addEventListener("pointermove", handleLiveVttPointerMove);
      elements.body.addEventListener("pointerup", handleLiveVttPointerUp);
      elements.body.addEventListener("pointercancel", handleLiveVttPointerUp);
      elements.body.addEventListener("wheel", handleLiveVttWheel, { passive: false });
      elements.image.addEventListener("load", updateLiveVttLayout);
      window.addEventListener("resize", updateLiveVttLayout);
      liveVttElements = elements;
      setLiveVttHandRaised(liveVttHandRaised);
      return elements;
    }

    function liveVttContainedRect(containerWidth, containerHeight, naturalWidth, naturalHeight) {
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

    function liveVttClamp(value, min, max) {
      return Math.min(max, Math.max(min, Number(value) || 0));
    }

    function liveVttClampView(view, baseLayout = liveVttBaseLayout) {
      const elements = liveVttElements;
      if (!elements || !baseLayout) return { scale: 1, x: 0, y: 0 };
      const rect = elements.body.getBoundingClientRect();
      const scale = liveVttClamp(view.scale || 1, LIVE_VTT_MIN_ZOOM, LIVE_VTT_MAX_ZOOM);
      const width = baseLayout.width * scale;
      const height = baseLayout.height * scale;

      function clampAxis(offset, baseStart, scaledSize, containerSize) {
        const currentStart = baseStart + (Number(offset) || 0);
        if (scaledSize <= containerSize) return (containerSize - scaledSize) / 2 - baseStart;
        return liveVttClamp(currentStart, containerSize - scaledSize, 0) - baseStart;
      }

      return {
        scale,
        x: clampAxis(view.x, baseLayout.left, width, rect.width || 1),
        y: clampAxis(view.y, baseLayout.top, height, rect.height || 1)
      };
    }

    function liveVttZoomedLayout(baseLayout = liveVttBaseLayout) {
      if (!baseLayout) return null;
      const view = liveVttClampView(liveVttView, baseLayout);
      liveVttView = view;
      return {
        left: baseLayout.left + view.x,
        top: baseLayout.top + view.y,
        width: baseLayout.width * view.scale,
        height: baseLayout.height * view.scale
      };
    }

    function updateLiveVttLayout() {
      const elements = liveVttElements;
      if (!elements || elements.root.hidden || elements.root.classList.contains("is-minimized") || elements.image.hidden) return;
      const rect = elements.body.getBoundingClientRect();
      liveVttBaseLayout = liveVttContainedRect(rect.width, rect.height, elements.image.naturalWidth, elements.image.naturalHeight);
      const layout = liveVttZoomedLayout(liveVttBaseLayout);
      elements.image.style.left = `${layout.left}px`;
      elements.image.style.top = `${layout.top}px`;
      elements.image.style.width = `${layout.width}px`;
      elements.image.style.height = `${layout.height}px`;
      elements.fog.style.left = `${layout.left}px`;
      elements.fog.style.top = `${layout.top}px`;
      elements.fog.style.width = `${layout.width}px`;
      elements.fog.style.height = `${layout.height}px`;
      elements.grid.style.left = `${layout.left}px`;
      elements.grid.style.top = `${layout.top}px`;
      elements.grid.style.width = `${layout.width}px`;
      elements.grid.style.height = `${layout.height}px`;
      elements.tokens.style.left = `${layout.left}px`;
      elements.tokens.style.top = `${layout.top}px`;
      elements.tokens.style.width = `${layout.width}px`;
      elements.tokens.style.height = `${layout.height}px`;
      elements.markers.style.left = `${layout.left}px`;
      elements.markers.style.top = `${layout.top}px`;
      elements.markers.style.width = `${layout.width}px`;
      elements.markers.style.height = `${layout.height}px`;
      elements.pings.style.left = `${layout.left}px`;
      elements.pings.style.top = `${layout.top}px`;
      elements.pings.style.width = `${layout.width}px`;
      elements.pings.style.height = `${layout.height}px`;
      renderLiveVttTokens(elements.tokens, liveVttState?.tokens, liveVttState?.sourceViewport, layout);
      renderLiveVttMarkers(elements.markers, liveVttState?.markers, liveVttState?.sourceViewport, layout);
      renderLiveVttFog(elements.fog, liveVttState?.fogOfWar, layout);
      renderLiveVttPings(elements.pings, layout);
    }

    function handleLiveVttWheel(event) {
      if (!liveVttState?.active || !liveVttElements || liveVttElements.image.hidden || !liveVttBaseLayout) return;
      const elements = liveVttElements;
      const rect = elements.body.getBoundingClientRect();
      const layout = liveVttZoomedLayout(liveVttBaseLayout);
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      if (localX < layout.left || localY < layout.top || localX > layout.left + layout.width || localY > layout.top + layout.height) return;
      event.preventDefault();
      event.stopPropagation();
      const oldScale = liveVttView.scale || 1;
      const nextScale = liveVttClamp(oldScale * (event.deltaY < 0 ? 1.12 : 1 / 1.12), LIVE_VTT_MIN_ZOOM, LIVE_VTT_MAX_ZOOM);
      if (Math.abs(nextScale - oldScale) < 0.001) return;
      const nx = liveVttClamp((localX - layout.left) / layout.width, 0, 1);
      const ny = liveVttClamp((localY - layout.top) / layout.height, 0, 1);
      liveVttView = liveVttClampView({
        scale: nextScale,
        x: localX - liveVttBaseLayout.left - nx * liveVttBaseLayout.width * nextScale,
        y: localY - liveVttBaseLayout.top - ny * liveVttBaseLayout.height * nextScale
      }, liveVttBaseLayout);
      updateLiveVttLayout();
    }

    function renderLiveVttGrid(element, grid) {
      if (!grid?.enabled) {
        element.hidden = true;
        element.removeAttribute("style");
        return;
      }
      element.hidden = false;
      element.style.backgroundImage = "linear-gradient(rgba(56,189,248,0.58) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.58) 1px, transparent 1px)";
      element.style.backgroundSize = `${Number(grid.cellWidth) || 70}px ${Number(grid.cellHeight) || 70}px`;
      element.style.backgroundPosition = `${Number(grid.offsetX) || 0}px ${Number(grid.offsetY) || 0}px`;
    }

    function liveVttInitials(name) {
      const parts = String(name || "Token").trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return "T";
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
    }

    function liveVttHpRatio(token) {
      const current = Number.parseFloat(String(token?.hpCurrent ?? "").replace(",", "."));
      const max = Number.parseFloat(String(token?.hpMax ?? "").replace(",", "."));
      if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) return null;
      return Math.max(0, Math.min(1, current / max));
    }

    function normalizeLiveVttMarkerColor(color) {
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
      return /^#[0-9a-f]{6}$/i.test(text) ? text : "#f59e0b";
    }

    function liveVttMarkerColorRgba(color, alpha = 0.35) {
      const hex = normalizeLiveVttMarkerColor(color).replace("#", "");
      const red = Number.parseInt(hex.slice(0, 2), 16);
      const green = Number.parseInt(hex.slice(2, 4), 16);
      const blue = Number.parseInt(hex.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    function normalizeLiveVttMarkerOpacity(value) {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? Math.max(0.08, Math.min(0.85, numeric)) : 0.32;
    }

    const LIVE_VTT_MARKER_PATTERN_GLYPHS = {
      acid: "\\u2623",
      blinded: "\\u25D0",
      charmed: "\\u2665",
      cold: "\\u2744",
      deafened: "\\u266B",
      disease: "\\u2739",
      "difficult-terrain": "\\u224B",
      exhaustion: "\\u25D2",
      fire: "\\u25B2",
      force: "\\u25C6",
      frightened: "!",
      grappled: "\\u267E",
      incapacitated: "\\u2715",
      invisible: "\\u25CC",
      lightning: "\\u26A1",
      necrotic: "\\u2625",
      paralyzed: "\\u275A",
      petrified: "\\u25A3",
      poison: "\\u2620",
      prone: "\\u2014",
      psychic: "\\u2726",
      radiant: "\\u2600",
      restrained: "#",
      stunned: "\\u2736",
      thunder: "\\u25CE",
      unconscious: "Z"
    };

    function normalizeLiveVttMarkerPattern(pattern) {
      const value = String(pattern || "").trim().toLowerCase();
      return Object.prototype.hasOwnProperty.call(LIVE_VTT_MARKER_PATTERN_GLYPHS, value) ? value : "none";
    }

    function decodeLiveVttMarkerPatternGlyph(glyph) {
      return String(glyph || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
    }

    function liveVttMarkerPatternBackground(pattern, color) {
      const value = normalizeLiveVttMarkerPattern(pattern);
      if (value === "none") return "none";
      const glyph = decodeLiveVttMarkerPatternGlyph(LIVE_VTT_MARKER_PATTERN_GLYPHS[value]);
      if (!glyph) return "none";
      const stroke = normalizeLiveVttMarkerColor(color);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34"><text x="17" y="23" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="800" fill="${stroke}" fill-opacity="0.72">${glyph}</text></svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    }

    const LIVE_VTT_MARKER_ICON_VALUES = new Set(["marker", "shop", "tavern", "inn", "swords", "shield", "castle", "temple", "camp", "cave", "treasure", "danger", "quest", "portal"]);

    function normalizeLiveVttMarkerIcon(icon) {
      const value = String(icon || "").trim().toLowerCase();
      return LIVE_VTT_MARKER_ICON_VALUES.has(value) ? value : "marker";
    }

    function liveVttMarkerIconSvg(icon) {
      const stroke = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
      const paths = {
        shop: `<path ${stroke} d="M4 10h16"/><path ${stroke} d="M5 10l1-5h12l1 5"/><path ${stroke} d="M6 10v9h12v-9"/><path ${stroke} d="M9 19v-5h6v5"/><path ${stroke} d="M7 10v2a2 2 0 0 0 4 0v-2"/><path ${stroke} d="M13 10v2a2 2 0 0 0 4 0v-2"/>`,
        tavern: `<path ${stroke} d="M7 4h9v11a4.5 4.5 0 0 1-9 0V4z"/><path ${stroke} d="M16 7h2.5a2.5 2.5 0 0 1 0 5H16"/><path ${stroke} d="M8 20h8"/><path ${stroke} d="M10 8h3"/>`,
        inn: `<path ${stroke} d="M4 20V9l8-5 8 5v11"/><path ${stroke} d="M8 20v-6h8v6"/><path ${stroke} d="M8 11h8"/><path ${stroke} d="M12 14v6"/>`,
        swords: `<path ${stroke} d="M4 20l6-6"/><path ${stroke} d="M14 10l6-6"/><path ${stroke} d="M12 8l4 4"/><path ${stroke} d="M3 5l16 16"/><path ${stroke} d="M7 17l-2 2"/><path ${stroke} d="M17 7l2-2"/>`,
        shield: `<path ${stroke} d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z"/><path ${stroke} d="M12 7v9"/>`,
        castle: `<path ${stroke} d="M5 20V8"/><path ${stroke} d="M19 20V8"/><path ${stroke} d="M5 8V5h3v3h3V5h2v3h3V5h3v3"/><path ${stroke} d="M4 20h16"/><path ${stroke} d="M10 20v-5a2 2 0 0 1 4 0v5"/>`,
        temple: `<path ${stroke} d="M4 9l8-5 8 5H4z"/><path ${stroke} d="M6 10v8"/><path ${stroke} d="M10 10v8"/><path ${stroke} d="M14 10v8"/><path ${stroke} d="M18 10v8"/><path ${stroke} d="M4 20h16"/>`,
        camp: `<path ${stroke} d="M4 20L12 5l8 15"/><path ${stroke} d="M9 20l3-6 3 6"/><path ${stroke} d="M6 20h12"/><path ${stroke} d="M12 5v15"/>`,
        cave: `<path ${stroke} d="M4 20v-5a8 8 0 0 1 16 0v5"/><path ${stroke} d="M9 20v-4a3 3 0 0 1 6 0v4"/><path ${stroke} d="M5 20h14"/>`,
        treasure: `<path ${stroke} d="M4 10h16v9H4z"/><path ${stroke} d="M4 10a8 5 0 0 1 16 0"/><path ${stroke} d="M12 10v9"/><path ${stroke} d="M10 14h4"/>`,
        danger: `<path ${stroke} d="M12 4l9 16H3L12 4z"/><path ${stroke} d="M12 9v5"/><path ${stroke} d="M12 17h.01"/>`,
        quest: `<path ${stroke} d="M12 18h.01"/><path ${stroke} d="M9.5 9a2.7 2.7 0 1 1 4.8 1.7c-1.5 1.3-2.3 1.9-2.3 3.3"/><circle ${stroke} cx="12" cy="12" r="9"/>`,
        portal: `<ellipse ${stroke} cx="12" cy="12" rx="7" ry="9"/><path ${stroke} d="M9 7c4 1 6 4 5 9"/><path ${stroke} d="M15 7c-4 1-6 4-5 9"/>`,
        marker: `<path ${stroke} d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11z"/><circle ${stroke} cx="12" cy="10" r="2"/>`
      };
      return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[normalizeLiveVttMarkerIcon(icon)] || paths.marker}</svg>`;
    }

    function liveVttTokenImageCacheKey(request) {
      const sources = Array.isArray(request?.sources) ? request.sources.join("|") : "";
      const names = Array.isArray(request?.names) ? request.names.join("|") : "";
      return `${sources}::${names}`;
    }

    function resolveLiveVttTokenImage(token, node) {
      const request = token?.imageRequest;
      if (!request || token.kind === "character") return;
      const api = window.dndSheet?.getMonsterTokenUrl;
      if (!api) return;
      const cacheKey = liveVttTokenImageCacheKey(request);
      if (!cacheKey) return;

      function attachImage(url) {
        if (!url || node.querySelector(".live-vtt-token-image")) return;
        const image = document.createElement("img");
        image.className = "live-vtt-token-image";
        image.alt = `${token.name || "Token"} token`;
        image.draggable = false;
        image.src = url;
        node.dataset.hasImage = "true";
        node.prepend(image);
      }

      if (token.image?.dataUrl) {
        attachImage(token.image.dataUrl);
        return;
      }

      const cached = liveVttTokenImageCache.get(cacheKey);
      if (typeof cached === "string") {
        attachImage(cached);
        return;
      }
      if (cached?.then) {
        cached.then(attachImage).catch(() => {});
        return;
      }

      const pending = api(request)
        .then((url) => {
          liveVttTokenImageCache.set(cacheKey, url || "");
          attachImage(url);
          return url || "";
        })
        .catch(() => {
          liveVttTokenImageCache.delete(cacheKey);
          return "";
        });
      liveVttTokenImageCache.set(cacheKey, pending);
    }

    function renderLiveVttTokens(element, tokens, sourceViewport, layout = null) {
      const visibleTokens = Array.isArray(tokens) ? tokens.filter((token) => !token?.hidden && !token?.playerHidden) : [];
      if (!visibleTokens.length) {
        element.hidden = true;
        element.replaceChildren();
        return;
      }
      element.hidden = false;
      const width = Math.max(1, Number(sourceViewport?.width) || Number(layout?.width) || 1);
      const height = Math.max(1, Number(sourceViewport?.height) || Number(layout?.height) || 1);
      const scaleX = (Number(layout?.width) || element.clientWidth || width) / width;
      const scaleY = (Number(layout?.height) || element.clientHeight || height) / height;
      const scale = Math.min(scaleX, scaleY);
      const nodes = visibleTokens.map((token) => {
        const size = Math.max(8, Number(token.size) || 56);
        const node = document.createElement("div");
        node.className = "live-vtt-token";
        node.dataset.kind = token.kind === "character" ? "character" : "monster";
        node.title = [token.name || "Token", token.ac ? `AC ${token.ac}` : ""].filter(Boolean).join(" | ");
        node.style.left = `${(Number(token.x) || 0) * scaleX}px`;
        node.style.top = `${(Number(token.y) || 0) * scaleY}px`;
        node.style.width = `${size * scale}px`;
        node.style.height = `${size * scale}px`;

        const initials = document.createElement("span");
        initials.className = "live-vtt-token-initials";
        initials.textContent = liveVttInitials(token.name);
        node.appendChild(initials);
        resolveLiveVttTokenImage(token, node);

        const label = document.createElement("span");
        label.className = "live-vtt-token-label";
        label.textContent = token.name || "Token";
        node.appendChild(label);

        const hpRatio = liveVttHpRatio(token);
        if (hpRatio !== null) {
          const health = document.createElement("div");
          health.className = "live-vtt-token-health";
          health.dataset.state = hpRatio <= 0.25 ? "critical" : (hpRatio <= 0.5 ? "wounded" : "healthy");
          health.style.setProperty("--live-vtt-health-angle", `${hpRatio * 360}deg`);
          health.setAttribute("aria-hidden", "true");
          node.appendChild(health);
        }
        return node;
      });
      element.replaceChildren(...nodes);
    }

    function renderLiveVttCombat(combat) {
      const elements = liveVttElements;
      if (!elements?.combat || !elements.combatTrack) return;
      const participants = Array.isArray(combat?.participants)
        ? combat.participants.filter((participant) => !participant?.hidden && !participant?.playerHidden)
        : [];
      if (!combat?.active || !participants.length) {
        elements.combat.hidden = true;
        elements.combatTrack.replaceChildren();
        return;
      }

      const activeIndex = participants.findIndex((participant) => participant.id === combat.activeId);
      const currentRound = participants.slice(activeIndex >= 0 ? activeIndex : 0);
      const round = Math.max(1, Number(combat.round) || 1);

      function participantCard(participant, isActive = false) {
        const card = document.createElement("div");
        card.className = "live-vtt-combat-card";
        card.dataset.active = String(isActive);
        card.dataset.kind = participant.kind === "character" ? "character" : "monster";
        card.title = isActive
          ? t("live.combatActiveTurn", { name: participant.name || "Token", round })
          : [participant.name || "Token", participant.initiative !== "" ? t("live.combatInitiative", { initiative: participant.initiative }) : ""].filter(Boolean).join(" | ");

        const portrait = document.createElement("div");
        portrait.className = "live-vtt-combat-portrait";
        const initials = document.createElement("span");
        initials.className = "live-vtt-token-initials";
        initials.textContent = liveVttInitials(participant.name);
        portrait.appendChild(initials);
        resolveLiveVttTokenImage(participant, portrait);
        card.appendChild(portrait);

        const name = document.createElement("span");
        name.className = "live-vtt-combat-name";
        name.textContent = participant.name || "Token";
        card.appendChild(name);

        if (participant.initiative !== "") {
          const initiative = document.createElement("span");
          initiative.className = "live-vtt-combat-initiative";
          initiative.textContent = String(participant.initiative);
          card.appendChild(initiative);
        }

        const hpRatio = liveVttHpRatio(participant);
        if (hpRatio !== null) {
          const health = document.createElement("span");
          health.className = "live-vtt-combat-health";
          const fill = document.createElement("span");
          fill.className = "live-vtt-combat-health-fill";
          fill.style.width = `${Math.round(Math.max(0, Math.min(1, hpRatio)) * 100)}%`;
          health.appendChild(fill);
          card.appendChild(health);
        }
        return card;
      }

      const nodes = currentRound.map((participant, index) => participantCard(participant, activeIndex >= 0 && index === 0));
      const divider = document.createElement("div");
      divider.className = "live-vtt-round-divider";
      divider.title = t("live.combatRoundEnd", { round });
      divider.setAttribute("aria-label", t("live.combatRoundEnd", { round }));
      nodes.push(divider, ...participants.map((participant) => participantCard(participant, false)));
      elements.combatTrack.replaceChildren(...nodes);
      elements.combat.setAttribute("aria-label", t("live.combatRound", { round }));
      elements.combat.hidden = false;
    }

    function renderLiveVttMarkers(element, markers, sourceViewport, layout = null) {
      const visibleMarkers = Array.isArray(markers) ? markers.filter((marker) => !marker?.hidden && !marker?.playerHidden) : [];
      if (!visibleMarkers.length) {
        element.hidden = true;
        element.replaceChildren();
        return;
      }
      element.hidden = false;
      const width = Math.max(1, Number(sourceViewport?.width) || Number(layout?.width) || 1);
      const height = Math.max(1, Number(sourceViewport?.height) || Number(layout?.height) || 1);
      const scaleX = (Number(layout?.width) || element.clientWidth || width) / width;
      const scaleY = (Number(layout?.height) || element.clientHeight || height) / height;
      const nodes = visibleMarkers.map((marker) => {
        const node = document.createElement("div");
        node.className = "live-vtt-marker";
        node.title = marker.label || "Marker";
        node.style.left = `${(Number(marker.x) || 0) * scaleX}px`;
        node.style.top = `${(Number(marker.y) || 0) * scaleY}px`;
        if (marker.markerType === "shape") {
          const formType = ["cone", "square", "circle"].includes(marker.formType) ? marker.formType : "square";
          const markerWidth = Math.max(8, Number(marker.width) || 120);
          const markerHeight = Math.max(8, Number(marker.height) || 120);
          const clipPath = formType === "cone" ? "polygon(50% 0%, 100% 100%, 0% 100%)" : "";
          const borderRadius = formType === "circle" ? "999px" : "";
          const rotation = `rotate(${Number(marker.rotation) || 0}deg)`;
          const opacity = normalizeLiveVttMarkerOpacity(marker.opacity);
          node.dataset.markerType = "shape";
          node.style.width = `${markerWidth * scaleX}px`;
          node.style.height = `${markerHeight * scaleY}px`;
          node.style.setProperty("--live-vtt-marker-fill", liveVttMarkerColorRgba(marker.color, opacity));
          node.style.setProperty("--live-vtt-marker-border", liveVttMarkerColorRgba(marker.color, 0.88));
          const shape = document.createElement("span");
          shape.className = "live-vtt-marker-shape";
          shape.dataset.formType = formType;
          shape.style.transform = rotation;
          node.appendChild(shape);
          const pattern = normalizeLiveVttMarkerPattern(marker.pattern);
          if (pattern !== "none") {
            const patternNode = document.createElement("span");
            patternNode.className = "live-vtt-marker-pattern";
            patternNode.style.backgroundImage = liveVttMarkerPatternBackground(pattern, marker.color);
            patternNode.style.backgroundSize = `${Math.max(20, 34 * scaleX)}px ${Math.max(20, 34 * scaleY)}px`;
            patternNode.style.opacity = String(Math.max(0.25, Math.min(0.9, opacity + 0.28)));
            patternNode.style.clipPath = clipPath;
            patternNode.style.borderRadius = borderRadius;
            patternNode.style.transform = rotation;
            patternNode.style.transformOrigin = "center";
            node.appendChild(patternNode);
          }
          const label = document.createElement("span");
          label.className = "live-vtt-marker-label";
          label.textContent = marker.label || "Forma";
          node.appendChild(label);
          return node;
        }

        const pin = document.createElement("span");
        pin.className = "live-vtt-marker-pin";
        pin.style.width = "28px";
        pin.style.height = "28px";
        const pinText = document.createElement("span");
        pinText.className = "live-vtt-marker-pin-icon";
        pinText.innerHTML = liveVttMarkerIconSvg(marker.icon);
        pin.appendChild(pinText);
        node.appendChild(pin);

        const label = document.createElement("span");
        label.className = "live-vtt-marker-label";
        label.textContent = marker.label || "Marker";
        node.appendChild(label);
        return node;
      });
      element.replaceChildren(...nodes);
    }

    function renderLiveVttFog(canvas, fog, layout = null) {
      const enabled = fog?.enabled !== false;
      const revealed = Array.isArray(fog?.revealed) ? fog.revealed : [];
      if (!enabled) {
        canvas.hidden = true;
        const context = canvas.getContext("2d");
        context?.clearRect(0, 0, canvas.width || 1, canvas.height || 1);
        return;
      }
      canvas.hidden = false;
      const cssWidth = Math.max(1, Math.round(Number(layout?.width) || canvas.clientWidth || canvas.getBoundingClientRect().width || 1));
      const cssHeight = Math.max(1, Math.round(Number(layout?.height) || canvas.clientHeight || canvas.getBoundingClientRect().height || 1));
      if (canvas.width !== cssWidth) canvas.width = cssWidth;
      if (canvas.height !== cssHeight) canvas.height = cssHeight;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, cssWidth, cssHeight);
      context.globalCompositeOperation = "source-over";
      context.fillStyle = "#000000";
      context.fillRect(0, 0, cssWidth, cssHeight);

      revealed.forEach((point) => {
        const x = Math.min(1, Math.max(0, Number(point.x) || 0));
        const y = Math.min(1, Math.max(0, Number(point.y) || 0));
        const rx = Math.min(1, Math.max(0.001, Number(point.rx ?? point.r) || 0.06));
        const ry = Math.min(1, Math.max(0.001, Number(point.ry ?? point.r) || 0.06));
        const centerX = x * cssWidth;
        const centerY = y * cssHeight;
        const radiusX = rx * cssWidth;
        const radiusY = ry * cssHeight;
        context.globalCompositeOperation = point.mode === "hide" ? "source-over" : "destination-out";
        context.fillStyle = "#000000";
        if (point.shape === "square") {
          context.fillRect(centerX - radiusX, centerY - radiusY, radiusX * 2, radiusY * 2);
        } else {
          context.beginPath();
          context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
          context.fill();
        }
      });
      context.globalCompositeOperation = "source-over";
    }

    function normalizeLiveVttPing(ping) {
      const expiresAt = Date.parse(ping?.expiresAt || "") || (Date.now() + LIVE_VTT_PING_TTL_MS);
      return {
        id: String(ping?.id || `ping-${Date.now()}-${Math.random().toString(16).slice(2)}`),
        playerId: String(ping?.playerId || ""),
        x: Math.min(1, Math.max(0, Number(ping?.x) || 0)),
        y: Math.min(1, Math.max(0, Number(ping?.y) || 0)),
        playerName: String(ping?.playerName || "Jugador").slice(0, 80),
        expiresAt
      };
    }

    function pruneLiveVttPings(now = Date.now()) {
      liveVttPings = liveVttPings.filter((ping) => Number(ping.expiresAt) > now);
      return liveVttPings;
    }

    function renderLiveVttPings(element, layout = null) {
      if (!element) return;
      const pings = pruneLiveVttPings();
      if (!pings.length) {
        element.hidden = true;
        element.replaceChildren();
        return;
      }
      const width = Number(layout?.width) || element.clientWidth || 1;
      const height = Number(layout?.height) || element.clientHeight || 1;
      element.hidden = false;
      const nodes = pings.map((ping) => {
        const node = document.createElement("div");
        node.className = "live-vtt-ping";
        node.style.left = `${ping.x * width}px`;
        node.style.top = `${ping.y * height}px`;
        node.title = `Ping: ${ping.playerName}`;
        const label = document.createElement("span");
        label.className = "live-vtt-ping-label";
        label.textContent = ping.playerName;
        node.appendChild(label);
        return node;
      });
      element.replaceChildren(...nodes);
    }

    function addLiveVttPing(ping) {
      const normalized = normalizeLiveVttPing(ping);
      liveVttPings = [
        ...pruneLiveVttPings().filter((entry) => (
          normalized.playerId
            ? entry.playerId !== normalized.playerId
            : entry.id !== normalized.id
        )),
        normalized
      ].slice(-16);
      requestAnimationFrame(updateLiveVttLayout);
      const timeout = Math.max(0, normalized.expiresAt - Date.now());
      window.setTimeout(() => {
        pruneLiveVttPings();
        requestAnimationFrame(updateLiveVttLayout);
      }, timeout + 40);
    }

    function youtubeEmbedUrl(videoId, autoplay = false, controls = false) {
      if (!YOUTUBE_VIDEO_ID_PATTERN.test(String(videoId || ""))) return "";
      const params = new URLSearchParams({
        enablejsapi: "1",
        autoplay: autoplay ? "1" : "0",
        controls: controls ? "1" : "0",
        playsinline: "1",
        rel: "0"
      });
      return `${YOUTUBE_EMBED_ORIGIN}/embed/${videoId}?${params.toString()}`;
    }

    function sendYoutubePlayerCommand(frame, command, args = []) {
      if (!frame?.contentWindow || !command) return;
      // The iframe starts as file:// before Chromium commits the remote navigation.
      // Commands contain no user data; inbound events remain restricted to YouTube's origin.
      frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: command, args }), "*");
    }

    function playLiveDmYoutubeAudio(audioPayload) {
      const videoId = String(audioPayload?.videoId || "");
      if (!YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) return;
      const audioId = String(audioPayload?.id || "");
      const volume = Math.min(1, Math.max(0, Number(audioPayload?.volume) || 1));
      const translate = (key) => window.dndPlayerI18n?.t?.(key) || key;
      if (!liveDmYoutubePlayer) {
        liveDmYoutubePanel = document.createElement("section");
        liveDmYoutubePanel.className = "live-dm-youtube-panel";
        liveDmYoutubePanel.setAttribute("aria-label", translate("live.dmMusic"));

        const header = document.createElement("header");
        header.className = "live-dm-youtube-header";
        liveDmYoutubeTitle = document.createElement("strong");
        liveDmYoutubeTitle.className = "live-dm-youtube-title";
        liveDmYoutubeTitle.textContent = translate("live.dmMusicTitle");
        const closeButton = document.createElement("button");
        closeButton.className = "live-dm-youtube-close";
        closeButton.type = "button";
        closeButton.setAttribute("aria-label", translate("live.dmMusicClose"));
        closeButton.textContent = "X";
        closeButton.addEventListener("click", () => {
          sendYoutubePlayerCommand(liveDmYoutubePlayer, "pauseVideo");
          liveDmYoutubePanel?.remove();
          liveDmYoutubePanel = null;
          liveDmYoutubeTitle = null;
          liveDmYoutubePlayer = null;
          liveDmYoutubePlayerId = "";
          liveDmYoutubeVideoId = "";
        });
        header.append(liveDmYoutubeTitle, closeButton);

        liveDmYoutubePlayer = document.createElement("iframe");
        liveDmYoutubePlayer.className = "live-dm-youtube-audio";
        liveDmYoutubePlayer.title = translate("live.dmMusicPlayer");
        liveDmYoutubePlayer.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
        liveDmYoutubePlayer.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        liveDmYoutubePlayer.setAttribute("allowfullscreen", "");
        liveDmYoutubePanel.append(header, liveDmYoutubePlayer);
        document.body.appendChild(liveDmYoutubePanel);
      }
      if (liveDmYoutubeTitle) liveDmYoutubeTitle.textContent = String(audioPayload?.name || translate("live.dmMusicTitle"));
      liveDmYoutubePlayerId = audioId;
      const isNewVideo = liveDmYoutubeVideoId !== videoId;
      liveDmYoutubeVideoId = videoId;
      if (isNewVideo) {
        liveDmYoutubePlayer.src = youtubeEmbedUrl(videoId, true, true);
      } else {
        sendYoutubePlayerCommand(liveDmYoutubePlayer, "setVolume", [Math.round(volume * 100)]);
        sendYoutubePlayerCommand(liveDmYoutubePlayer, "playVideo");
      }
      liveDmYoutubePlayer.onload = () => {
        sendYoutubePlayerCommand(liveDmYoutubePlayer, "setVolume", [Math.round(volume * 100)]);
        sendYoutubePlayerCommand(liveDmYoutubePlayer, "playVideo");
      };
    }

    function playLiveDmAudio(audioPayload) {
      if (audioPayload?.kind === "youtube") {
        playLiveDmYoutubeAudio(audioPayload);
        return;
      }
      const dataUrl = String(audioPayload?.dataUrl || "");
      if (!dataUrl || !/^data:audio\//i.test(dataUrl)) return;
      const audioId = String(audioPayload?.id || "");
      try {
        const audio = new Audio(dataUrl);
        audio.volume = Math.min(1, Math.max(0, Number(audioPayload?.volume) || 1));
        audio.preload = "auto";
        const cleanup = () => {
          liveDmAudioPlayers = liveDmAudioPlayers.filter((entry) => entry !== audio);
          if (audioId && liveDmAudioPlayersById.has(audioId)) {
            const entries = liveDmAudioPlayersById.get(audioId);
            entries.delete(audio);
            if (!entries.size) liveDmAudioPlayersById.delete(audioId);
          }
        };
        audio.addEventListener("ended", cleanup, { once: true });
        audio.addEventListener("error", cleanup, { once: true });
        liveDmAudioPlayers.push(audio);
        if (audioId) {
          if (!liveDmAudioPlayersById.has(audioId)) liveDmAudioPlayersById.set(audioId, new Set());
          liveDmAudioPlayersById.get(audioId).add(audio);
        }
        while (liveDmAudioPlayers.length > 8) {
          const staleAudio = liveDmAudioPlayers.shift();
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
            showStatus("No se pudo reproducir el audio del DM.");
          });
        }
      } catch (error) {
        console.error(error);
        showStatus("No se pudo reproducir el audio del DM.");
      }
    }

    function controlLiveDmAudio(control) {
      const action = String(control?.action || "").toLowerCase();
      if (!["pause", "resume"].includes(action)) return;
      const audioId = String(control?.id || "");
      if (liveDmYoutubePlayer && (!audioId || audioId === liveDmYoutubePlayerId)) {
        sendYoutubePlayerCommand(liveDmYoutubePlayer, action === "pause" ? "pauseVideo" : "playVideo");
      }
      const targets = audioId
        ? [...(liveDmAudioPlayersById.get(audioId) || [])]
        : [...liveDmAudioPlayers];
      targets.forEach((audio) => {
        try {
          if (action === "pause") audio.pause();
          else {
            const playPromise = audio.play();
            if (playPromise?.catch) playPromise.catch(console.error);
          }
        } catch (_error) {
          // Ignore pause errors from stale audio elements.
        }
      });
    }

    function liveVttPointFromEvent(event) {
      if (!liveVttState?.active || !liveVttElements || liveVttElements.image.hidden) return null;
      const elements = liveVttElements;
      const rect = elements.body.getBoundingClientRect();
      const layout = liveVttZoomedLayout(liveVttBaseLayout || liveVttContainedRect(rect.width, rect.height, elements.image.naturalWidth, elements.image.naturalHeight));
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const x = (localX - layout.left) / layout.width;
      const y = (localY - layout.top) / layout.height;
      if (x < 0 || y < 0 || x > 1 || y > 1) return null;
      return { x, y, localX, localY };
    }

    function sendLiveVttPing(point) {
      if (!point) return;
      sendLiveSheetMessage({
        type: "vtt:ping",
        ping: {
          id: `ping-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          x: point.x,
          y: point.y,
          createdAt: new Date().toISOString()
        }
      });
    }

    function normalizeLiveVttHandQueue(entries) {
      return (Array.isArray(entries) ? entries : [])
        .filter((entry) => entry?.playerId)
        .slice(0, 40)
        .map((entry, index) => ({
          playerId: String(entry.playerId),
          playerName: String(entry.playerName || "Player").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120) || "Player",
          raisedAt: String(entry.raisedAt || ""),
          position: Math.max(1, Number(entry.position) || index + 1)
        }))
        .sort((left, right) => (left.position - right.position) || left.raisedAt.localeCompare(right.raisedAt));
    }

    function renderLiveVttHandQueue(entries = liveVttHandQueue) {
      liveVttHandQueue = normalizeLiveVttHandQueue(entries);
      const elements = liveVttElements;
      if (!elements?.handQueue) return;
      const ownPlayerId = liveSheetPlayerId();
      const ownHand = liveVttHandQueue.find((hand) => hand.playerId === ownPlayerId);
      elements.handQueueTitle.textContent = t("live.handQueueTitle");
      elements.handStatus.dataset.raised = liveVttHandRaised ? "true" : "false";
      if (liveVttHandRaised) {
        elements.handStatus.textContent = ownHand
          ? t("live.handRaisedPosition", { position: ownHand.position })
          : t("live.handRaisedWaiting");
      } else if (liveVttHandStateReason === "dm") {
        elements.handStatus.textContent = t("live.handLoweredByDm");
      } else if (liveVttHandStateReason === "self") {
        elements.handStatus.textContent = t("live.handLoweredSelf");
      } else {
        elements.handStatus.textContent = t("live.handNotRaised");
      }

      const rows = liveVttHandQueue.map((hand) => {
        const isOwnHand = hand.playerId === ownPlayerId;
        const row = document.createElement("div");
        row.className = "live-vtt-hand-entry";
        row.dataset.own = isOwnHand ? "true" : "false";

        const position = document.createElement("span");
        position.className = "live-vtt-hand-position";
        position.textContent = String(hand.position);

        const playerName = document.createElement("span");
        playerName.className = "live-vtt-hand-player";
        playerName.textContent = hand.playerName;

        const ownLabel = document.createElement("span");
        ownLabel.className = "live-vtt-hand-you";
        ownLabel.textContent = isOwnHand ? t("live.handYou") : "";
        row.append(position, playerName, ownLabel);
        return row;
      });
      if (!rows.length) {
        const empty = document.createElement("div");
        empty.className = "live-vtt-hand-empty";
        empty.textContent = t("live.handQueueEmpty");
        rows.push(empty);
      }
      elements.handQueue.replaceChildren(...rows);
    }

    function setLiveVttHandRaised(raised, reason = "") {
      liveVttHandRaised = Boolean(raised);
      if (reason) liveVttHandStateReason = reason;
      const handButton = liveVttElements?.hand;
      if (!handButton) return;
      handButton.setAttribute("aria-pressed", liveVttHandRaised ? "true" : "false");
      handButton.textContent = t(liveVttHandRaised ? "live.handLower" : "live.handRaise");
      handButton.setAttribute("aria-label", t(liveVttHandRaised ? "live.handLowerAria" : "live.handRaiseAria"));
      renderLiveVttHandQueue();
    }

    function toggleLiveVttHand(event) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      const nextRaised = !liveVttHandRaised;
      if (!sendLiveSheetMessage({ type: "player:hand", raised: nextRaised })) {
        showStatus(t("live.notConnectedToDm"));
        return;
      }
      setLiveVttHandRaised(nextRaised, "self");
    }

    function handleLiveVttPointerDown(event) {
      if (event.button != null && event.button !== 0 && event.button !== 1) return;
      if (event.target?.closest?.(".live-vtt-window-actions")) return;
      const point = liveVttPointFromEvent(event);
      if (!point) return;
      if (event.button === 1 && liveVttView.scale <= 1.001) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      liveVttPointer = {
        pointerId: event.pointerId,
        button: event.button || 0,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startLocalX: point.localX,
        startLocalY: point.localY,
        startView: { ...liveVttView },
        moved: false
      };
    }

    function handleLiveVttPointerMove(event) {
      if (!liveVttPointer || liveVttPointer.pointerId !== event.pointerId) return;
      if (Math.abs(event.clientX - liveVttPointer.startClientX) > 4 || Math.abs(event.clientY - liveVttPointer.startClientY) > 4) {
        liveVttPointer.moved = true;
      }
      if (liveVttPointer.button !== 1 || !liveVttPointer.moved || liveVttView.scale <= 1.001) return;
      const elements = liveVttElements;
      if (!elements || !liveVttBaseLayout) return;
      const rect = elements.body.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      event.preventDefault();
      event.stopPropagation();
      liveVttView = liveVttClampView({
        ...liveVttPointer.startView,
        x: liveVttPointer.startView.x + localX - liveVttPointer.startLocalX,
        y: liveVttPointer.startView.y + localY - liveVttPointer.startLocalY
      }, liveVttBaseLayout);
      updateLiveVttLayout();
    }

    function handleLiveVttPointerUp(event) {
      if (!liveVttPointer || liveVttPointer.pointerId !== event.pointerId) return;
      const completed = liveVttPointer;
      liveVttPointer = null;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      if (completed.button === 0 && !completed.moved) sendLiveVttPing(liveVttPointFromEvent(event));
    }

    function renderLiveVttState(state) {
      liveVttState = state || null;
      const elements = ensureLiveVttWindow();
      if (!state?.active || !state.image?.dataUrl) {
        liveVttView = { scale: 1, x: 0, y: 0 };
        liveVttBaseLayout = null;
        liveVttViewKey = "";
        elements.root.hidden = true;
        elements.image.hidden = true;
        elements.image.removeAttribute("src");
        liveVttImageDataUrl = "";
        elements.empty.hidden = false;
        elements.fog.hidden = true;
        elements.grid.hidden = true;
        elements.tokens.hidden = true;
        elements.markers.hidden = true;
        elements.pings.hidden = true;
        elements.tokens.replaceChildren();
        elements.markers.replaceChildren();
        elements.pings.replaceChildren();
        renderLiveVttCombat(null);
        liveVttPings = [];
        return;
      }
      const nextViewKey = [state.title || "", state.pageName || "", state.image?.name || "", String(state.image?.dataUrl || "").slice(0, 96)].join("|");
      if (nextViewKey !== liveVttViewKey) {
        liveVttView = { scale: 1, x: 0, y: 0 };
        liveVttViewKey = nextViewKey;
      }
      elements.title.textContent = [state.title || "Mapa VTT", state.pageName || ""].filter(Boolean).join(" - ");
      if (liveVttImageDataUrl !== state.image.dataUrl) {
        elements.image.src = state.image.dataUrl;
        liveVttImageDataUrl = state.image.dataUrl;
      }
      elements.image.alt = state.image.name || "Mapa VTT";
      elements.image.hidden = false;
      elements.empty.hidden = true;
      renderLiveVttGrid(elements.grid, state.grid);
      renderLiveVttFog(elements.fog, state.fogOfWar);
      renderLiveVttTokens(elements.tokens, state.tokens, state.sourceViewport);
      renderLiveVttCombat(state.combat);
      renderLiveVttMarkers(elements.markers, state.markers, state.sourceViewport);
      elements.root.hidden = false;
      requestAnimationFrame(updateLiveVttLayout);
    }

    function renderLiveVttPatch(patch) {
      if (!patch || !liveVttState?.active) return;
      const nextPatch = { ...patch };
      if (Array.isArray(patch.tokens)) {
        const previousTokens = new Map((liveVttState.tokens || []).map((token) => [token.id, token]));
        nextPatch.tokens = patch.tokens.map((token) => {
          const previous = previousTokens.get(token.id);
          if (!token.imageUnchanged || token.image?.dataUrl || !previous?.image?.dataUrl) return token;
          return { ...token, image: previous.image };
        });
      }
      if (Array.isArray(patch.combat?.participants)) {
        const previousParticipants = new Map((liveVttState.combat?.participants || []).map((participant) => [participant.id, participant]));
        nextPatch.combat = {
          ...patch.combat,
          participants: patch.combat.participants.map((participant) => {
            const previous = previousParticipants.get(participant.id);
            if (!participant.imageUnchanged || participant.image?.dataUrl || !previous?.image?.dataUrl) return participant;
            return { ...participant, image: previous.image };
          })
        };
      }
      renderLiveVttState({
        ...liveVttState,
        ...nextPatch,
        image: liveVttState.image
      });
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
    window.isLiveSheetConnected = () => liveSheetClientSocket?.readyState === WebSocket.OPEN;
    window.liveSheetPlayerDisplayName = () => defaultLiveSheetPlayerName();

    function scheduleLiveSheetUpdate() {
      if (!liveSheetClientSocket || liveSheetClientSocket.readyState !== WebSocket.OPEN) return;
      clearTimeout(liveSheetClientSendTimer);
      liveSheetClientSendTimer = setTimeout(() => {
        try {
          sendLiveSheetSnapshot();
        } catch (error) {
          console.error(error);
          setLiveSheetClientStatus("live.sendFailed", "error");
        }
      }, 500);
    }

    function openLiveSheetClientPanel() {
      loadLiveSheetClientSettings();
      refreshLiveSheetConnectionMode();
      if (!liveSheetPlayerName?.value?.trim()) liveSheetPlayerName.value = defaultLiveSheetPlayerName();
      if (!liveSheetPort?.value) liveSheetPort.value = "8787";
      if (liveSheetClientBackdrop) {
        liveSheetClientBackdrop.hidden = false;
        liveSheetClientBackdrop.setAttribute("aria-hidden", "false");
      }
      setAppSettingsMenuOpen(false);
      setLiveSheetClientStatus(liveSheetClientSocket?.readyState === WebSocket.OPEN ? "live.connected" : "live.disconnected", liveSheetClientSocket?.readyState === WebSocket.OPEN ? "ok" : "neutral");
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
      renderLiveVttHandQueue([]);
      setLiveVttHandRaised(false, "sync");
      renderLiveVttState({ active: false });
      setLiveSheetClientStatus("live.disconnected", "neutral");
      showStatus(t("live.disconnectedStatus"));
    }

    function refreshLiveSheetConnectionMode() {
      const mode = liveSheetConnectionMode?.value || "tailscale";
      const helpKey = mode === "direct-internet" ? "live.help.direct" : `live.help.${mode}`;
      if (liveSheetModeHelp) {
        liveSheetModeHelp.textContent = t(helpKey);
        liveSheetModeHelp.dataset.i18n = helpKey;
      }
      if (liveSheetSessionToken) {
        const required = mode === "direct-internet";
        liveSheetSessionToken.required = required;
        liveSheetSessionToken.setAttribute("aria-required", required ? "true" : "false");
      }
    }

    async function normalizeLiveSheetTarget(rawHost, rawPort) {
      const api = window.dndSheet?.liveSheet;
      if (api?.normalizeConnectionTarget) return api.normalizeConnectionTarget(rawHost, rawPort);

      const input = String(rawHost || "").trim();
      if (!input) return { ok: false, error: "INVALID_HOST" };
      if (/^wss:\/\//i.test(input)) return { ok: false, error: "WSS_NOT_CONFIGURED" };
      try {
        const parsed = new URL(/^ws:\/\//i.test(input) ? input : `ws://${input}`);
        if (parsed.protocol !== "ws:") return { ok: false, error: "INVALID_SCHEME" };
        const port = parsed.port ? Number.parseInt(parsed.port, 10) : Number.parseInt(rawPort, 10);
        if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, error: "INVALID_PORT" };
        const host = parsed.hostname;
        const formattedHost = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
        return { ok: true, host, port, url: `ws://${formattedHost}:${port}` };
      } catch (_error) {
        return { ok: false, error: "INVALID_HOST" };
      }
    }

    async function connectLiveSheetClient() {
      if (liveSheetClientSocket?.readyState === WebSocket.OPEN || liveSheetClientSocket?.readyState === WebSocket.CONNECTING) {
        disconnectLiveSheetClient();
        return;
      }

      const connectionMode = liveSheetConnectionMode?.value || "tailscale";
      if (connectionMode === "direct-internet" && !liveSheetSessionToken?.value?.trim()) {
        setLiveSheetClientStatus("live.tokenRequiredDirect", "error");
        liveSheetSessionToken?.focus();
        return;
      }
      if (!liveSheetDmIp?.value?.trim()) {
        setLiveSheetClientStatus("live.enterHost", "error");
        liveSheetDmIp?.focus();
        return;
      }

      let target;
      try {
        target = await normalizeLiveSheetTarget(liveSheetDmIp.value, liveSheetPort?.value || "8787");
      } catch (_error) {
        target = { ok: false, error: "INVALID_HOST" };
      }
      if (!target?.ok) {
        setLiveSheetClientStatus(target?.error === "WSS_NOT_CONFIGURED" ? "live.wssNotConfigured" : (target?.error === "INVALID_PORT" ? "live.invalidPort" : "live.invalidAddress"), "error");
        (target?.error === "INVALID_PORT" ? liveSheetPort : liveSheetDmIp)?.focus?.();
        return;
      }

      const { host: dmHost, port, url } = target;
      if (liveSheetDmIp) liveSheetDmIp.value = dmHost;
      if (liveSheetPort) liveSheetPort.value = String(port);
      saveLiveSheetClientSettings();
      liveSheetClientManualDisconnect = false;
      setLiveSheetClientStatus(t("live.connectingTo", { url }), "neutral");
      try {
        const socket = new WebSocket(url);
        liveSheetClientSocket = socket;
        socket.addEventListener("open", () => {
          setLiveSheetClientStatus(t("live.connectedTo", { url }), "ok");
          sendLiveSheetHello();
          sendLiveSheetSnapshot();
          showStatus(t("live.connectedStatus"));
        });
        socket.addEventListener("message", (event) => {
          let payload = null;
          try {
            payload = JSON.parse(String(event.data || ""));
          } catch (_error) {
            return;
          }
          if (payload?.type === "server:welcome") {
            setLiveSheetClientStatus(t("live.connectedTo", { url }), "ok");
          }
          if (payload?.type === "server:ack" && payload.receivedType === "sheet:update") {
            setLiveSheetClientStatus("live.synced", "ok");
          }
          if (payload?.type === "dm:sheet:patch") {
            const applied = typeof applyLiveSheetPatch === "function" ? applyLiveSheetPatch(payload.patch) : false;
            setLiveSheetClientStatus(applied ? "live.synced" : "live.patchUnmatched", applied ? "ok" : "error");
          }
          if (payload?.type === "dm:vtt:state") {
            renderLiveVttState(payload.state);
          }
          if (payload?.type === "dm:vtt:patch") {
            renderLiveVttPatch(payload.patch);
          }
          if (payload?.type === "dm:vtt:ping") {
            addLiveVttPing(payload.ping);
          }
          if (payload?.type === "dm:audio:play") {
            playLiveDmAudio(payload.audio);
          }
          if (payload?.type === "dm:audio:control") {
            controlLiveDmAudio(payload.control);
          }
          if (payload?.type === "dm:hand:state") {
            if (Array.isArray(payload.raisedHands)) renderLiveVttHandQueue(payload.raisedHands);
            setLiveVttHandRaised(Boolean(payload.raised), payload.reason || "sync");
          }
          if (payload?.type === "dm:hand:queue") {
            renderLiveVttHandQueue(payload.raisedHands);
          }
          if (payload?.type === "player:roll") {
            window.showLiveSheetRoll?.(payload.roll);
          }
        });
        socket.addEventListener("close", () => {
          if (liveSheetClientSocket === socket) liveSheetClientSocket = null;
          renderLiveVttHandQueue([]);
          setLiveVttHandRaised(false, "sync");
          renderLiveVttState({ active: false });
          setLiveSheetClientStatus(liveSheetClientManualDisconnect ? "live.disconnected" : "live.disconnectedFromDm", liveSheetClientManualDisconnect ? "neutral" : "error");
        });
        socket.addEventListener("error", () => {
          setLiveSheetClientStatus("live.connectFailed", "error");
        });
      } catch (error) {
        console.error(error);
        liveSheetClientSocket = null;
        setLiveSheetClientStatus("live.invalidAddress", "error");
      }
    }

    function syncSettingsControls() {
      playerLanguageButtons.forEach((button) => {
        const active = button.dataset.playerLanguage === playerI18n.getLanguage();
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    function refreshTranslatedUi() {
      playerI18n.applyTranslations(document);
      refreshLiveSheetConnectionMode();
      syncSettingsControls();
      if (liveSheetClientStatus) {
        setLiveSheetClientStatus(liveSheetClientStatus.dataset.statusKey || liveSheetClientStatus.textContent || "Disconnected", liveSheetClientStatus.dataset.tone || "neutral");
      }
      setLiveVttHandRaised(liveVttHandRaised, liveVttHandStateReason);
      if (typeof updateCharacterReadyButton === "function") updateCharacterReadyButton();
      if (typeof renderAlertsPanel === "function") renderAlertsPanel();
      if (typeof updateEquipmentPanel === "function") updateEquipmentPanel();
      if (typeof updatePreparedSpellsPanel === "function") updatePreparedSpellsPanel();
      if (typeof syncTurnActionTranslationButton === "function") syncTurnActionTranslationButton();
      if (latestUpdaterState) renderUpdaterState(latestUpdaterState);
    }

    window.addEventListener("dnd:i18n:languagechange", refreshTranslatedUi);

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

    function updateReleaseText(key, fallback, params) {
      return t(key, params) || translateDynamicText(key, fallback, params) || fallback;
    }

    function updateVersionLabel(state) {
      const version = state?.updateInfo?.version || "";
      return version ? ` ${version}` : "";
    }

    function renderCurrentVersion(state = {}) {
      if (!downloadReleaseVersion) return;
      const currentVersion = state.currentVersion || "";
      if (!currentVersion) {
        downloadReleaseVersion.textContent = "";
        downloadReleaseVersion.hidden = true;
        return;
      }

      downloadReleaseVersion.hidden = false;
      downloadReleaseVersion.textContent = updateReleaseText("release.currentVersion", "Installed: {version}", { version: currentVersion });
    }

    function renderUpdaterState(state = {}) {
      if (!state.currentVersion && latestUpdaterState?.currentVersion) {
        state = { ...state, currentVersion: latestUpdaterState.currentVersion };
      }
      latestUpdaterState = state;
      const updater = desktopStore?.updater;
      if (!downloadReleaseText || !downloadReleaseButton) return;
      if (!updater || state.status === "unavailable") {
        downloadReleaseText.closest(".download-release")?.setAttribute("hidden", "");
        if (checkUpdatesButton) checkUpdatesButton.disabled = true;
        return;
      }

      downloadReleaseText.closest(".download-release")?.removeAttribute("hidden");
      renderCurrentVersion(state);
      downloadReleaseButton.dataset.updaterAction = "check";
      downloadReleaseButton.disabled = false;
      if (checkUpdatesButton) checkUpdatesButton.disabled = state.status === "checking" || state.status === "downloading";

      if (state.status === "checking") {
        downloadReleaseText.textContent = updateReleaseText("release.checkingNow", "Checking for updates...");
        downloadReleaseButton.textContent = updateReleaseText("release.check", "Check");
        downloadReleaseButton.disabled = true;
        return;
      }

      if (state.status === "available") {
        downloadReleaseText.textContent = updateReleaseText("release.available", `Version${updateVersionLabel(state)} is available`, { version: state.updateInfo?.version || "" });
        downloadReleaseButton.textContent = updateReleaseText("release.downloadUpdate", "Download update");
        downloadReleaseButton.dataset.updaterAction = "download";
        return;
      }

      if (state.status === "downloading") {
        const percent = Math.max(0, Math.min(100, Math.round(state.progress?.percent || 0)));
        downloadReleaseText.textContent = updateReleaseText("release.downloading", `Downloading update ${percent}%`, { percent });
        downloadReleaseButton.textContent = `${percent}%`;
        downloadReleaseButton.disabled = true;
        return;
      }

      if (state.status === "downloaded") {
        downloadReleaseText.textContent = updateReleaseText("release.downloaded", "Update ready to install");
        downloadReleaseButton.textContent = updateReleaseText("release.restartInstall", "Restart and install");
        downloadReleaseButton.dataset.updaterAction = "install";
        return;
      }

      if (state.status === "up-to-date") {
        downloadReleaseText.textContent = updateReleaseText("release.upToDate", "Latest version installed");
        downloadReleaseButton.textContent = updateReleaseText("release.check", "Check");
        return;
      }

      if (state.status === "error") {
        downloadReleaseText.textContent = state.error || updateReleaseText("release.error", "Could not check for updates");
        downloadReleaseButton.textContent = updateReleaseText("release.tryAgain", "Try again");
        return;
      }

      downloadReleaseText.textContent = updateReleaseText("release.checking", "Checking latest version...");
      downloadReleaseButton.textContent = updateReleaseText("release.check", "Check");
    }

    async function runUpdaterAction(action = "check") {
      const updater = desktopStore?.updater;
      if (!updater) return;
      try {
        if (action === "download") {
          renderUpdaterState({ status: "downloading", progress: null });
          renderUpdaterState(await updater.download());
          return;
        }
        if (action === "install") {
          if (typeof saveData === "function") await saveData();
          renderUpdaterState(await updater.install());
          return;
        }
        renderUpdaterState({ status: "checking" });
        renderUpdaterState(await updater.check());
      } catch (error) {
        console.error(error);
        renderUpdaterState({ status: "error", error: error?.message || updateReleaseText("release.error", "Could not check for updates") });
      }
    }

    function setupUpdaterUi() {
      const updater = desktopStore?.updater;
      if (!downloadReleaseText || !downloadReleaseButton) return;

      downloadReleaseButton.addEventListener("click", () => {
        runUpdaterAction(downloadReleaseButton.dataset.updaterAction || "check").catch(console.error);
      });
      checkUpdatesButton?.addEventListener("click", () => {
        setAppSettingsMenuOpen(false);
        runUpdaterAction("check").catch(console.error);
      });

      if (!updater) {
        renderUpdaterState({ status: "unavailable" });
        return;
      }

      updater.getState()
        .then(renderUpdaterState)
        .catch((error) => renderUpdaterState({ status: "error", error: error?.message || String(error) }));
      const unsubscribeUpdater = updater.onStateChanged(renderUpdaterState);
      window.addEventListener("beforeunload", () => {
        try {
          unsubscribeUpdater?.();
        } catch (_error) {
          // Ignore listener cleanup errors.
        }
      }, { once: true });
    }

    async function loadPdfJs() {
      try {
        if (!Promise.try) {
          Promise.try = (callback, ...args) => new Promise((resolve) => resolve(callback(...args)));
        }
        pdfjsLib = await import("../../../node_modules/pdfjs-dist/legacy/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", window.location.href).href;
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
        xhr.onerror = () => reject(new Error(`Could not load ${resourcePath}`));
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
      if (desktopStore?.loadSpells) return dedupeSpellsByIdentity(await desktopStore.loadSpells());
      return dedupeSpellsByIdentity(await fetchLocalResource("../../data/spells/spells.json"));
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
      return dedupeSpellsByIdentity(spellOptions)
        .map((spell) => {
          const detail = detailsByKey.get(spellMetadataKey(spell))
            || detailsByName.get(normalizeName(spell?.name || ""))?.find((candidate) => {
              const candidateSource = sourceKey(candidate?.source || "");
              const spellSource = sourceKey(spell?.source || optionSource(spell) || "");
              return spellSource ? candidateSource === spellSource : true;
            })
            || detailsByName.get(normalizeName(spell?.name || ""))?.[0];
          if (!detail) return spell;
          return {
            ...spell,
            time: spell.time || detail.time,
            duration: spell.duration || detail.duration,
            range: spell.range || detail.range,
            components: spell.components || detail.components,
            savingThrow: spell.savingThrow || detail.savingThrow,
            spellAttack: spell.spellAttack || detail.spellAttack,
            damageInflict: spell.damageInflict || detail.damageInflict,
            conditionInflict: spell.conditionInflict || detail.conditionInflict,
            miscTags: spell.miscTags || detail.miscTags,
            areaTags: spell.areaTags || detail.areaTags,
            entriesHigherLevel: spell.entriesHigherLevel || detail.entriesHigherLevel,
            scalingLevelDice: spell.scalingLevelDice || detail.scalingLevelDice,
            concentration: typeof spell.concentration === "boolean"
              ? spell.concentration
              : Array.isArray(detail.duration) && detail.duration.some((duration) => duration?.concentration)
          };
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
        fetchLocalResource("../../data/items/items.json"),
        fetchLocalResource("../../data/items/items-base.json")
      ]);
      return {
        items: itemsResponse,
        baseItems: baseItemsResponse
      };
    }

    function itemIdentityPart(value) {
      return String(value ?? "").trim().toLowerCase().normalize("NFC");
    }

    function catalogVariantToken(item, context = {}) {
      const explicit = item?.catalogVariantToken || item?.variantToken;
      if (explicit) return String(explicit);
      try {
        return String(globalThis.dndItemCatalog?.itemVariantToken?.(item, context) || "root");
      } catch (_error) {
        return String(context.variantToken || item?.variant || "root");
      }
    }

    function localItemIdentityKey(item, context = {}) {
      return [
        item?.name || context.name || "",
        item?.source || context.source || "legacy",
        catalogVariantToken(item, context)
      ].map(itemIdentityPart).join("|");
    }

    function catalogItemIdentityKey(item, context = {}) {
      const explicit = item?.catalogKey;
      if (explicit) return String(explicit);
      const identityContext = { ...context, variantToken: catalogVariantToken(item, context) };
      try {
        return String(globalThis.dndItemCatalog?.itemCatalogKey?.(item, identityContext) || localItemIdentityKey(item, identityContext));
      } catch (_error) {
        return localItemIdentityKey(item, identityContext);
      }
    }

    function catalogItemId(item, context = {}) {
      const explicit = item?.catalogId;
      if (explicit) return String(explicit);
      const identityContext = { ...context, variantToken: catalogVariantToken(item, context) };
      try {
        return String(globalThis.dndItemCatalog?.itemCatalogId?.(item, identityContext) || catalogItemIdentityKey(item, identityContext));
      } catch (_error) {
        return catalogItemIdentityKey(item, identityContext);
      }
    }

    function itemNameSourceKey(itemOrName, source = "") {
      const item = itemOrName && typeof itemOrName === "object" ? itemOrName : null;
      return [item?.name || itemOrName || "", item?.source || source || "legacy"]
        .map(itemIdentityPart)
        .join("|");
    }

    function isCatalogItemUnavailable(item) {
      if (!item) return false;
      return item.__catalogUnavailable === true
        || item.unavailable === true
        || item.removedFromCatalog === true
        || ["deleted", "removed", "retired", "unavailable"].includes(itemIdentityPart(item.catalogStatus || item.status));
    }

    function attachItemCatalogIdentities(itemsList = []) {
      const source = (Array.isArray(itemsList) ? itemsList : []).filter(Boolean);
      const attach = globalThis.dndItemCatalog?.attachCatalogIdentities;
      if (typeof attach === "function") {
        const decorated = attach(source);
        if (Array.isArray(decorated)) return decorated;
      }
      const decorate = globalThis.dndItemCatalog?.decorateItem;
      return source.map((item) => {
        if (typeof decorate === "function") return decorate(item);
        return {
          ...item,
          catalogId: catalogItemId(item),
          catalogKey: catalogItemIdentityKey(item),
          catalogVariantToken: catalogVariantToken(item)
        };
      });
    }

    function materializeSpecificItemVariant(parent, variant) {
      const specific = variant?.specificVariant;
      if (!specific || typeof specific !== "object") return null;
      const specificEntries = Array.isArray(specific.entries) ? specific.entries.filter(Boolean) : specific.entries;
      return {
        ...parent,
        ...(variant.base && typeof variant.base === "object" ? variant.base : {}),
        ...specific,
        entries: specificEntries?.length ? specific.entries : parent.entries,
        additionalEntries: specific.additionalEntries || parent.additionalEntries,
        variants: [],
        catalogParentId: specific.catalogParentId || parent.catalogId || catalogItemId(parent)
      };
    }

    function catalogIndexEntries(item) {
      const entries = [item];
      (Array.isArray(item?.variants) ? item.variants : []).forEach((variant) => {
        const specific = materializeSpecificItemVariant(item, variant);
        if (specific) entries.push(specific);
      });
      return entries.filter(Boolean);
    }

    function indexCatalogItem(item) {
      catalogIndexEntries(item).forEach((entry) => {
        const catalogId = catalogItemId(entry);
        const catalogKey = catalogItemIdentityKey(entry);
        const localKey = localItemIdentityKey(entry);
        const nameSourceKey = itemNameSourceKey(entry);
        if (catalogId && !itemLookupByCatalogId.has(catalogId)) itemLookupByCatalogId.set(catalogId, entry);
        [catalogKey, localKey].filter(Boolean).forEach((key) => {
          if (!itemLookupByIdentity.has(key)) itemLookupByIdentity.set(key, entry);
        });
        if (nameSourceKey) {
          const matches = itemLookupByNameSource.get(nameSourceKey) || [];
          if (!matches.includes(entry)) matches.push(entry);
          itemLookupByNameSource.set(nameSourceKey, matches);
        }
        [normalizeName(entry?.name || ""), normalizeItemLookupName(entry?.name || "")]
          .filter(Boolean)
          .forEach((key) => {
            const previous = itemLookupByName.get(key);
            const preferred = globalThis.dndItemCatalog?.preferItemForLegacyName?.(previous, entry)
              || preferModernEntry(previous, entry, (item) => item?.source || "");
            itemLookupByName.set(key, preferred);
          });
      });
    }

    function applyItemCatalogData(itemData) {
      const activeSource = Array.isArray(itemData?.items?.item) ? itemData.items.item : [];
      items = attachItemCatalogIdentities(activeSource);
      const declaredExpectedCount = Number(itemData?.items?._meta?.expectedActiveRecords);
      const expectedCount = Number.isInteger(declaredExpectedCount) && declaredExpectedCount > 0 ? declaredExpectedCount : 1779;
      const validation = globalThis.dndItemCatalog?.validateItemCatalog?.(items, { expectedCount });
      if (validation && validation.ok === false) {
        throw new Error(`Invalid app-owned item catalog: ${validation.errors?.join?.("; ") || "validation failed"}`);
      }
      if (items.length !== expectedCount) throw new Error(`Invalid app-owned item catalog count: expected ${expectedCount}, received ${items.length}.`);

      retiredItems = (Array.isArray(itemData?.items?.tombstone) ? itemData.items.tombstone : [])
        .filter(Boolean)
        .map((item) => {
          const catalogVariantToken = item.variantToken || item.catalogVariantToken || "root";
          const identityContext = { variantToken: catalogVariantToken };
          return {
            ...item,
            catalogId: item.catalogId || catalogItemId(item, identityContext),
            catalogKey: item.catalogKey || catalogItemIdentityKey(item, identityContext),
            catalogVariantToken,
            __catalogUnavailable: true,
            unavailable: true,
            removedFromCatalog: true
          };
        });
      itemProperties = Array.isArray(itemData?.baseItems?.itemProperty) ? itemData.baseItems.itemProperty : [];
      itemTypes = Array.isArray(itemData?.baseItems?.itemType) ? itemData.baseItems.itemType : [];
      itemMasteries = Array.isArray(itemData?.baseItems?.itemMastery) ? itemData.baseItems.itemMastery : [];
      itemLookupByCatalogId = new Map();
      itemLookupByIdentity = new Map();
      itemLookupByNameSource = new Map();
      itemLookupByName = new Map();
      itemCatalogNameSourceCounts = new Map();
      items.forEach((item) => {
        const key = itemNameSourceKey(item);
        itemCatalogNameSourceCounts.set(key, (itemCatalogNameSourceCounts.get(key) || 0) + 1);
      });
      items.forEach(indexCatalogItem);
      retiredItems.forEach(indexCatalogItem);
      itemCatalogLoadMeta = {
        ...(itemData?.cacheMeta || {}),
        expectedCount,
        activeCount: items.length,
        tombstoneCount: retiredItems.length,
        validation
      };
      itemCatalogReady = true;
      return true;
    }

    async function waitForItemCatalog() {
      try {
        return await itemCatalogReadyPromise;
      } catch (_error) {
        return false;
      }
    }

    async function runWithConcurrency(itemsList, limit, task) {
      const queue = Array.from(itemsList || []);
      let cursor = 0;
      const workerCount = Math.max(1, Math.min(Number(limit) || 1, queue.length || 1));
      await Promise.all(Array.from({ length: workerCount }, async () => {
        while (cursor < queue.length) {
          const index = cursor;
          cursor += 1;
          await task(queue[index], index);
        }
      }));
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

    function spellIdentityKey(spell) {
      const explicitId = normalizeName(spell?.id || "");
      if (explicitId) return explicitId;
      return [spell?.name || "", spell?.source || optionSource(spell) || "legacy", spell?.level ?? ""]
        .map((value) => normalizeName(String(value)))
        .join("|");
    }

    function dedupeSpellsByIdentity(itemsList = []) {
      const byIdentity = new Map();
      (Array.isArray(itemsList) ? itemsList : []).filter(Boolean).forEach((spell) => {
        const key = spellIdentityKey(spell);
        if (!key || byIdentity.has(key)) return;
        byIdentity.set(key, spell);
      });
      return [...byIdentity.values()];
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

    function runAfterNextPaint(callback) {
      if (typeof callback !== "function") return;
      if (typeof requestAnimationFrame !== "function") {
        setTimeout(callback, 0);
        return;
      }
      requestAnimationFrame(() => setTimeout(callback, 0));
    }

    let panelRefreshFrame = 0;
    const pendingPanelRefreshes = new Set();

    function schedulePanelRefresh(callback) {
      if (typeof callback !== "function") return;
      pendingPanelRefreshes.add(callback);
      if (panelRefreshFrame) return;
      panelRefreshFrame = 1;
      runAfterNextPaint(() => {
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

    function isEquipmentFieldEvent(event) {
      return String(event?.target?.dataset?.key || "").trim().toLowerCase().includes("equipment");
    }

    function scheduleUnlessEquipmentField(event, callback) {
      if (!isEquipmentFieldEvent(event)) callback();
    }

    async function renderPage(pdf, pageNumber, mountMarker = null) {
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
      if (mountMarker?.parentNode) mountMarker.replaceWith(pageNode);
      else app.appendChild(pageNode);

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
      itemCatalogReadyPromise = loadItemOptions()
        .then(applyItemCatalogData)
        .catch((error) => {
          console.error("Item catalog failed to load", error);
          itemCatalogReady = false;
          return false;
        });
      const [raceOptions, raceDetailData, backgroundOptions, backgroundDetailData, classOptions, classDetailData, spellOptions, spellActionMetadata, featData, optionalFeatureData, conditionData, languageData] = await Promise.all([
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
      globalThis.dndConditionEngine?.setExternalConditionEntries?.(conditionData);
      languages = Array.isArray(languageData?.language) ? languageData.language : [];

      const pdfBytes = await loadPdfBytes();
      const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      const visiblePages = Array.from({ length: pdf.numPages }, (_item, index) => index + 1)
        .filter((pageNumber) => !HIDDEN_PDF_PAGES.has(pageNumber));
      const pageMarkers = visiblePages.map((pageNumber) => {
        const marker = document.createComment(`sheet-page-${pageNumber}`);
        app.appendChild(marker);
        return { pageNumber, marker };
      });
      await runWithConcurrency(pageMarkers, 2, ({ pageNumber, marker }) => renderPage(pdf, pageNumber, marker));

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
      setupUpdaterUi();
      void itemCatalogReadyPromise.then((loaded) => {
        if (!loaded) return;
        updateEquipmentPanel();
        updateArmorClass();
        updatePreparedSpellsPanel();
        renderAlertsPanel();
        invalidateCombatActionCache?.("item-catalog-ready");
        scheduleCombatActionCacheWarmup?.();
        scheduleTurnActionsPanelRefresh();
      });
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
      playerLanguageButtons.forEach((button) => {
        button.addEventListener("click", () => {
          playerI18n.setLanguage(button.dataset.playerLanguage || "en");
          syncSettingsControls();
          requestAnimationFrame(() => applyCombatWindowLayout());
        });
      });
      dmScreenButton?.addEventListener("click", openDmScreen);
      liveSheetClientButton?.addEventListener("click", openLiveSheetClientPanel);
      liveSheetClientClose?.addEventListener("click", closeLiveSheetClientPanel);
      liveSheetClientCancel?.addEventListener("click", closeLiveSheetClientPanel);
      liveSheetConnectButton?.addEventListener("click", connectLiveSheetClient);
      [liveSheetConnectionMode, liveSheetDmIp, liveSheetPort, liveSheetPlayerName]
        .filter(Boolean)
        .forEach((input) => input.addEventListener("change", saveLiveSheetClientSettings));
      liveSheetConnectionMode?.addEventListener("change", refreshLiveSheetConnectionMode);
      liveSheetClientBackdrop?.addEventListener("click", (event) => {
        if (event.target === liveSheetClientBackdrop) closeLiveSheetClientPanel();
      });
      generateSheetCodeButton?.addEventListener("click", () => {
        generateCharacterSheetCode().catch((error) => {
          console.error(error);
          showStatus(error?.message || t("export.generateFailed"));
        });
      });
      clearFieldsButton?.addEventListener("click", () => {
        clearAllFields().catch(console.error);
      });
      saveSlotSelect?.addEventListener("change", (event) => {
        setTopControlsMenuOpen(false);
        switchSaveSlot(event.target.value).catch(console.error);
      });
      [clearFieldsButton, characterReadyButton, turnActionsButton]
        .filter(Boolean)
        .forEach((button) => button.addEventListener("click", () => setTopControlsMenuOpen(false)));
      longRestButton?.addEventListener("click", longRestSpellResources);
      shortRestButton?.addEventListener("click", shortRestResources);
      characterReadyButton?.addEventListener("click", toggleCharacterReady);
      turnActionsButton?.addEventListener("click", () => {
        globalThis.dndRestRuntime?.interrupt?.("initiative");
        openTurnActionsPanel().catch(console.error);
      });
      turnActionsClose?.addEventListener("click", closeTurnActionsPanel);
      turnActionsTranslate?.addEventListener("click", () => toggleTurnActionTranslations().catch(console.error));
      turnActionsCollapse?.addEventListener("click", toggleTurnActionsPanelCollapsed);
      turnActionsHeader?.addEventListener("pointerdown", startCombatWindowMove);
      turnActionsResizeHandles.forEach((handle) => {
        handle.addEventListener("pointerdown", (event) => startCombatWindowResize(event, handle.dataset.combatResizeEdge || "corner"));
      });
      turnActionsNewTurn?.addEventListener("click", startNewCombatTurn);
      turnActionsEndTurn?.addEventListener("click", requestEndCombatTurn);
      combatLogClear?.addEventListener("click", clearCombatLog);
      window.addEventListener("resize", () => applyCombatWindowLayout());
      app.addEventListener("pointerdown", handleLockedSheetEvent, true);
      app.addEventListener("keydown", handleLockedSheetEvent, true);
      app.addEventListener("beforeinput", handleLockedSheetEvent, true);
      document.addEventListener("pointerdown", handleLockedAuxiliaryInput, true);
      document.addEventListener("keydown", handleLockedAuxiliaryInput, true);
      document.addEventListener("change", handleLockedAuxiliaryInput, true);
      app.addEventListener("input", handleDerivedStatInput);
      app.addEventListener("change", handleDerivedStatInput);
      app.addEventListener("input", (event) => globalThis.dndRestRuntime?.handleFieldEvent?.(event));
      app.addEventListener("change", (event) => globalThis.dndRestRuntime?.handleFieldEvent?.(event));
      app.addEventListener("change", handleWizardPreparedLimitChange);
      app.addEventListener("input", scheduleSave);
      app.addEventListener("change", scheduleSave);
      app.addEventListener("input", scheduleLiveSheetUpdate);
      app.addEventListener("change", scheduleLiveSheetUpdate);
      app.addEventListener("input", (event) => scheduleUnlessEquipmentField(event, schedulePreparedSpellsPanelRefresh));
      app.addEventListener("change", (event) => scheduleUnlessEquipmentField(event, schedulePreparedSpellsPanelRefresh));
      app.addEventListener("input", (event) => scheduleUnlessEquipmentField(event, scheduleEquipmentPanelRefresh));
      app.addEventListener("change", (event) => scheduleUnlessEquipmentField(event, scheduleEquipmentPanelRefresh));
      app.addEventListener("input", (event) => scheduleUnlessEquipmentField(event, scheduleAlertsPanelRefresh));
      app.addEventListener("change", (event) => scheduleUnlessEquipmentField(event, scheduleAlertsPanelRefresh));
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
      app.addEventListener("input", (event) => scheduleUnlessEquipmentField(event, scheduleTurnActionsPanelRefresh));
      app.addEventListener("change", (event) => scheduleUnlessEquipmentField(event, scheduleTurnActionsPanelRefresh));
      app.addEventListener("input", (event) => {
        if (!isEquipmentFieldEvent(event)) globalThis.invalidateCombatActionCache?.("field-input");
      });
      app.addEventListener("change", (event) => {
        if (!isEquipmentFieldEvent(event)) globalThis.invalidateCombatActionCache?.("field-change");
      });
      app.addEventListener("input", (event) => {
        if (!isEquipmentFieldEvent(event)) globalThis.scheduleCombatActionCacheWarmup?.();
      });
      app.addEventListener("change", (event) => {
        if (!isEquipmentFieldEvent(event)) globalThis.scheduleCombatActionCacheWarmup?.();
      });
      app.addEventListener("change", handleSpellAvailabilityChange);
      itemDrawerClose?.addEventListener("click", closeItemDrawer);
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
