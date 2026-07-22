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
    const appSidebar = document.getElementById("appSidebar");
    const sidebarMenuButton = document.getElementById("sidebarMenuButton");
    const sidebarMenuClose = document.getElementById("sidebarMenuClose");
    const sidebarMenuPanel = document.getElementById("sidebarMenuPanel");
    const sidebarSheetButton = document.getElementById("sidebarSheetButton");
    const sidebarNotesButton = document.getElementById("sidebarNotesButton");
    const notesWorkspace = document.getElementById("notesWorkspace");
    const notesNewButton = document.getElementById("notesNewButton");
    const notesNewTabButton = document.getElementById("notesNewTabButton");
    const notesBackButton = document.getElementById("notesBackButton");
    const notesCategoryList = document.getElementById("notesCategoryList");
    const notesFolderList = document.getElementById("notesFolderList");
    const notesTabs = document.getElementById("notesTabs");
    const notesSearchInput = document.getElementById("notesSearchInput");
    const notesTreeContextMenu = document.getElementById("notesTreeContextMenu");
    const notesTreeContextActions = document.getElementById("notesTreeContextActions");
    const notesTreeDeleteButton = document.getElementById("notesTreeDeleteButton");
    const notesTreeDeleteLabel = document.getElementById("notesTreeDeleteLabel");
    const notesTreeFolderForm = document.getElementById("notesTreeFolderForm");
    const notesTreeFolderName = document.getElementById("notesTreeFolderName");
    const notesCategoryBrowser = document.getElementById("notesCategoryBrowser");
    const notesCategoryBrowserTitle = document.getElementById("notesCategoryBrowserTitle");
    const notesCategoryBrowserCount = document.getElementById("notesCategoryBrowserCount");
    const notesCategoryBrowserList = document.getElementById("notesCategoryBrowserList");
    const notesCategoryNewButton = document.getElementById("notesCategoryNewButton");
    const notesTitleInput = document.getElementById("notesTitleInput");
    const notesBodyInput = document.getElementById("notesBodyInput");
    const notesBodyPreview = notesBodyInput;
    const notesLinkForm = document.getElementById("notesLinkForm");
    const notesLinkUrl = document.getElementById("notesLinkUrl");
    const notesStarButton = document.getElementById("notesStarButton");
    const notesEditorStatus = document.getElementById("notesEditorStatus");
    const notesTags = document.getElementById("notesTags");
    const notesTagLibrary = document.getElementById("notesTagLibrary");
    const notesTagInput = document.getElementById("notesTagInput");
    const notesAddTagButton = document.getElementById("notesAddTagButton");
    const notesTagColors = document.getElementById("notesTagColors");
    const notesLabelColors = document.getElementById("notesLabelColors");
    const notesMainFolderSelect = document.getElementById("notesMainFolderSelect");
    const notesCreateMainFolderButton = document.getElementById("notesCreateMainFolderButton");
    const notesMainFolderForm = document.getElementById("notesMainFolderForm");
    const notesMainFolderName = document.getElementById("notesMainFolderName");
    const notesShareToggle = document.getElementById("notesShareToggle");
    const notesShareStatus = document.getElementById("notesShareStatus");
    const notesTemplateList = document.getElementById("notesTemplateList");
    const notesTaskList = document.getElementById("notesTaskList");
    const notesTaskInput = document.getElementById("notesTaskInput");
    const notesAddTaskButton = document.getElementById("notesAddTaskButton");
    const notesPinButton = document.getElementById("notesPinButton");
    const notesArchiveButton = document.getElementById("notesArchiveButton");
    const notesDuplicateButton = document.getElementById("notesDuplicateButton");
    const notesExportButton = document.getElementById("notesExportButton");
    const notesDeleteButton = document.getElementById("notesDeleteButton");
    const notesNotificationsButton = document.getElementById("notesNotificationsButton");
    const notesHelpButton = document.getElementById("notesHelpButton");
    const notesSettingsButton = document.getElementById("notesSettingsButton");
    const sidebarViewButtons = [...document.querySelectorAll("[data-sidebar-view]")];
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
    const turnActionsTranslate = document.getElementById("turnActionsTranslate");
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
    const combatToggleInitiative = document.getElementById("combatToggleInitiative");
    const combatToggleContext = document.getElementById("combatToggleContext");
    const combatToggleActions = document.getElementById("combatToggleActions");
    const combatResolution = document.getElementById("combatResolution");
    const combatLogSection = document.getElementById("combatLogSection");
    const combatLogList = document.getElementById("combatLogList");
    const combatLogClear = document.getElementById("combatLogClear");
    const combatMapViewport = document.getElementById("combatMapViewport");
    const combatMapEmpty = document.getElementById("combatMapEmpty");
    const combatMapStatus = document.getElementById("combatMapStatus");
    const combatInitiativeList = document.getElementById("combatInitiativeList");
    const combatRoundLabel = document.getElementById("combatRoundLabel");
    const combatLongRestButton = document.getElementById("combatLongRestButton");
    const combatShortRestButton = document.getElementById("combatShortRestButton");
    const combatMapLiveIndicator = document.querySelector(".combat-map-live-indicator");
    const combatBoardMain = document.getElementById("combatBoardMain");
    const combatInitiativePanel = document.querySelector(".combat-initiative-panel");
    const combatMapPanel = document.querySelector(".combat-map-panel");
    const combatContextPanel = document.querySelector(".combat-context-panel");
    const combatInitiativeSplitter = document.getElementById("combatInitiativeSplitter");
    const combatContextSplitter = document.getElementById("combatContextSplitter");
    const combatActionSplitter = document.getElementById("combatActionSplitter");
    const combatPanelVisibility = {
      initiative: true,
      context: true,
      actions: true
    };
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
    const PLAYER_NOTES_STORAGE_KEY = "dnd-character-sheet-player-notes-v1";
    const PLAYER_NOTES_CATEGORIES = Object.freeze(["session", "npcs", "quests", "locations", "loot", "combat", "handouts", "custom"]);
    const PLAYER_NOTE_CATEGORY_LABEL_KEYS = Object.freeze({
      session: "notes.sessionNotes",
      npcs: "notes.npcs",
      quests: "notes.quests",
      locations: "notes.locations",
      loot: "notes.loot",
      combat: "notes.combatNotes",
      handouts: "notes.handouts",
      custom: "notes.custom"
    });
    const PLAYER_NOTE_CATEGORY_FOLDER_NAMES = Object.freeze({
      session: "Session Notes",
      npcs: "NPCs",
      quests: "Quests",
      locations: "Locations",
      loot: "Loot",
      combat: "Combat Notes",
      handouts: "Handouts",
      custom: "Custom"
    });
    const PLAYER_NOTE_CATEGORY_TEMPLATES = Object.freeze({ session: "session", npcs: "npc", quests: "quest", combat: "encounter" });
    const PLAYER_NOTE_COLORS = Object.freeze(["gray", "red", "amber", "green", "blue", "purple"]);
    const PLAYER_NOTE_BROWSE_CATEGORIES = PLAYER_NOTES_CATEGORIES;
    const PLAYER_NOTE_TAG_COLORS = Object.freeze(["gray", "red", "amber", "orange", "yellow", "green", "teal", "cyan", "blue", "indigo", "purple", "pink"]);
    const PLAYER_NOTE_TEMPLATES = Object.freeze({
      session: {
        title: "Session Recap",
        category: "session",
        body: "## Summary\n\nWhat happened in this session?\n\n## Clues\n\n- \n\n## NPCs met\n\n- \n\n## Loot\n\n- \n"
      },
      npc: {
        title: "NPC Profile",
        category: "npcs",
        body: "## NPC Profile\n\nName: \nRole: \n\n## Appearance\n\n\n## Goals\n\n- \n\n## Secrets\n\n- \n"
      },
      quest: {
        title: "Quest Log",
        category: "quests",
        body: "## Quest\n\nObjective: \n\n## Leads\n\n- \n\n## Rewards\n\n- \n"
      },
      encounter: {
        title: "Encounter Notes",
        category: "combat",
        body: "## Encounter\n\nLocation: \n\n## Enemies\n\n- \n\n## Tactics\n\n- \n\n## Aftermath\n\n"
      }
    });
    let playerNotesStore = null;
    let playerNotesFilter = "all";
    let playerNotesFolderFilter = "";
    let playerNotesSearch = "";
    let playerNotesActiveId = "";
    let playerNotesOpenIds = [];
    let playerNotesBrowseMode = false;
    let playerNotesTagColor = "amber";
    let playerNotesSelectedTagName = "";
    let playerNotesTreeContextFolderId = "";
    let playerNotesTreeContextTarget = { kind: "root", id: "" };
    let playerNotesDragPayload = null;
    const playerNotesCollapsedFolders = new Set();
    const playerNotesPreviewCache = new Map();
    let playerNotesRenderedPreviewKey = "";
    let playerNotesSavedRange = null;
    let playerNotesSaveTimer = null;
    let playerNotesShareTimer = null;
    let playerNotesInitialized = false;
    let liveSheetClientSocket = null;
    let liveSheetClientSendTimer = null;
    let liveSheetClientManualDisconnect = false;
    let liveVttState = null;
    let liveVttImageDataUrl = "";
    let liveVttElements = null;
    let liveVttOriginalParent = null;
    let liveVttCombatSurfaceActive = false;
    let liveVttPings = [];
    let liveVttBaseLayout = null;
    let liveVttView = { scale: 1, x: 0, y: 0 };
    let liveVttViewKey = "";
    let liveVttPointer = null;
    let liveVttHandRaised = false;
    let liveVttHandStateReason = "sync";
    let liveVttHandQueue = [];
    const COMBAT_BOARD_LAYOUT_KEY = "dnd-character-sheet-combat-board-v1";
    let combatBoardLayout = loadCombatBoardLayout();
    let combatBoardResizeState = null;
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
    const vttMovementEngine = globalThis.dndVttMovementEngine;

    const COMBAT_BOARD_MIN_WIDTHS = Object.freeze({ initiative: 220, map: 320, context: 240 });
    const COMBAT_BOARD_MIN_HEIGHTS = Object.freeze({ board: 250, actions: 220 });

    function clampCombatBoardValue(value, min, max) {
      return Math.min(max, Math.max(min, Number(value) || 0));
    }

    function normalizeCombatBoardLayout(layout = {}) {
      return {
        initiativeRatio: clampCombatBoardValue(layout.initiativeRatio, 0.16, 0.46) || 0.22,
        contextRatio: clampCombatBoardValue(layout.contextRatio, 0.16, 0.42) || 0.25,
        actionRatio: clampCombatBoardValue(layout.actionRatio, 0.2, 0.58) || 0.34
      };
    }

    function loadCombatBoardLayout() {
      try {
        const parsed = JSON.parse(localStorage.getItem(COMBAT_BOARD_LAYOUT_KEY) || "{}");
        return normalizeCombatBoardLayout(parsed);
      } catch (_error) {
        return normalizeCombatBoardLayout();
      }
    }

    function persistCombatBoardLayout() {
      try {
        localStorage.setItem(COMBAT_BOARD_LAYOUT_KEY, JSON.stringify(combatBoardLayout));
      } catch (_error) {
        // Layout persistence is optional; keep the current session usable.
      }
    }

    function applyCombatBoardLayout({ persist = false } = {}) {
      if (!combatBoardMain) return;
      const boardRect = combatBoardMain.getBoundingClientRect();
      if (boardRect.width <= 0) return;

      const availableWidth = Math.max(1, boardRect.width - 20 - 40 - 16);
      const minimumWidth = COMBAT_BOARD_MIN_WIDTHS.initiative + COMBAT_BOARD_MIN_WIDTHS.map + COMBAT_BOARD_MIN_WIDTHS.context;
      if (availableWidth >= minimumWidth) {
        let initiativeWidth = availableWidth * combatBoardLayout.initiativeRatio;
        let contextWidth = availableWidth * combatBoardLayout.contextRatio;
        const maximumSideWidth = availableWidth - COMBAT_BOARD_MIN_WIDTHS.map;
        if (initiativeWidth + contextWidth > maximumSideWidth) {
          const overflow = initiativeWidth + contextWidth - maximumSideWidth;
          const initiativeReduction = overflow * (initiativeWidth / Math.max(1, initiativeWidth + contextWidth));
          initiativeWidth -= initiativeReduction;
          contextWidth -= overflow - initiativeReduction;
        }
        initiativeWidth = clampCombatBoardValue(initiativeWidth, COMBAT_BOARD_MIN_WIDTHS.initiative, maximumSideWidth - COMBAT_BOARD_MIN_WIDTHS.context);
        contextWidth = clampCombatBoardValue(contextWidth, COMBAT_BOARD_MIN_WIDTHS.context, maximumSideWidth - initiativeWidth);
        combatBoardLayout.initiativeRatio = initiativeWidth / availableWidth;
        combatBoardLayout.contextRatio = contextWidth / availableWidth;
        combatBoardMain.style.setProperty("--combat-initiative-size", `${initiativeWidth}px`);
        combatBoardMain.style.setProperty("--combat-context-size", `${contextWidth}px`);
        combatInitiativeSplitter?.setAttribute("aria-valuenow", String(Math.round(initiativeWidth)));
        combatContextSplitter?.setAttribute("aria-valuenow", String(Math.round(contextWidth)));
      }

      const panelRect = turnActionsPanel?.getBoundingClientRect?.();
      const headerRect = document.getElementById("turnActionsHeader")?.getBoundingClientRect?.();
      if (panelRect && headerRect && panelRect.height > 0) {
        const availableHeight = Math.max(1, panelRect.height - headerRect.height - 8);
        const maximumActionHeight = Math.max(COMBAT_BOARD_MIN_HEIGHTS.actions, availableHeight - COMBAT_BOARD_MIN_HEIGHTS.board);
        const actionHeight = clampCombatBoardValue(
          availableHeight * combatBoardLayout.actionRatio,
          COMBAT_BOARD_MIN_HEIGHTS.actions,
          maximumActionHeight
        );
        combatBoardLayout.actionRatio = actionHeight / availableHeight;
        turnActionsPanel.style.setProperty("--combat-action-size", `${actionHeight}px`);
        combatActionSplitter?.setAttribute("aria-valuenow", String(Math.round(actionHeight)));
      }
      if (persist) persistCombatBoardLayout();
    }

    const combatPanelToggleConfig = Object.freeze({
      initiative: { button: () => combatToggleInitiative, hide: "combat.hideResources", show: "combat.showResources" },
      context: { button: () => combatToggleContext, hide: "combat.hideLog", show: "combat.showLog" },
      actions: { button: () => combatToggleActions, hide: "combat.hideActions", show: "combat.showActions" }
    });

    function applyCombatPanelVisibility({ refreshLayout = true } = {}) {
      if (!combatBoardMain || !turnActionsPanel) return;
      combatBoardMain.classList.toggle("is-initiative-hidden", !combatPanelVisibility.initiative);
      combatBoardMain.classList.toggle("is-context-hidden", !combatPanelVisibility.context);
      turnActionsPanel.classList.toggle("is-actions-hidden", !combatPanelVisibility.actions);
      Object.entries(combatPanelToggleConfig).forEach(([key, config]) => {
        const button = config.button();
        const visible = combatPanelVisibility[key];
        if (!button) return;
        button.setAttribute("aria-pressed", String(visible));
        button.textContent = t(visible ? config.hide : config.show);
        button.title = t(visible ? config.hide : config.show);
      });
      if (!refreshLayout) return;
      requestAnimationFrame(() => {
        applyCombatBoardLayout();
        const refreshVttLayout = () => globalThis.dndCharacterSheetVttSurface?.refreshLayout?.();
        refreshVttLayout();
        window.setTimeout(refreshVttLayout, 210);
        window.setTimeout(refreshVttLayout, 420);
      });
    }

    function toggleCombatPanel(key) {
      if (!Object.prototype.hasOwnProperty.call(combatPanelVisibility, key)) return;
      combatPanelVisibility[key] = !combatPanelVisibility[key];
      applyCombatPanelVisibility();
    }

    Object.entries(combatPanelToggleConfig).forEach(([key, config]) => {
      config.button()?.addEventListener("click", () => toggleCombatPanel(key));
    });
    applyCombatPanelVisibility({ refreshLayout: false });

    function combatBoardResizeKeyDelta(event, type) {
      const amount = event.shiftKey ? 0.05 : 0.02;
      if (type === "initiative") return event.key === "ArrowRight" ? amount : event.key === "ArrowLeft" ? -amount : 0;
      if (type === "context") return event.key === "ArrowLeft" ? amount : event.key === "ArrowRight" ? -amount : 0;
      return event.key === "ArrowUp" ? amount : event.key === "ArrowDown" ? -amount : 0;
    }

    function handleCombatBoardResizeKey(event, type) {
      const delta = combatBoardResizeKeyDelta(event, type);
      if (!delta) return;
      event.preventDefault();
      if (type === "initiative") combatBoardLayout.initiativeRatio += delta;
      else if (type === "context") combatBoardLayout.contextRatio += delta;
      else combatBoardLayout.actionRatio += delta;
      combatBoardLayout = normalizeCombatBoardLayout(combatBoardLayout);
      applyCombatBoardLayout({ persist: true });
      globalThis.dndCharacterSheetVttSurface?.refreshLayout?.();
    }

    function startCombatBoardResize(event, type) {
      if (event.button != null && event.button !== 0) return;
      const initiativeRect = combatInitiativePanel?.getBoundingClientRect?.();
      const mapRect = combatMapPanel?.getBoundingClientRect?.();
      const contextRect = combatContextPanel?.getBoundingClientRect?.();
      const boardRect = combatBoardMain?.getBoundingClientRect?.();
      const actionRect = document.querySelector(".combat-action-dock")?.getBoundingClientRect?.();
      if (!initiativeRect || !mapRect || !contextRect || !boardRect || !actionRect) return;
      combatBoardResizeState = {
        type,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        initiativeWidth: initiativeRect.width,
        mapWidth: mapRect.width,
        contextWidth: contextRect.width,
        boardHeight: boardRect.height,
        actionHeight: actionRect.height
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      document.body.classList.add("combat-board-resizing");
      event.preventDefault();
    }

    function moveCombatBoardResize(event) {
      const state = combatBoardResizeState;
      if (!state || state.pointerId !== event.pointerId) return;
      if (state.type === "initiative" || state.type === "context") {
        const totalWidth = state.initiativeWidth + state.mapWidth + state.contextWidth;
        if (state.type === "initiative") {
          const nextInitiative = clampCombatBoardValue(
            state.initiativeWidth + event.clientX - state.startX,
            COMBAT_BOARD_MIN_WIDTHS.initiative,
            totalWidth - COMBAT_BOARD_MIN_WIDTHS.map - COMBAT_BOARD_MIN_WIDTHS.context
          );
          combatBoardLayout.initiativeRatio = nextInitiative / totalWidth;
        } else {
          const nextContext = clampCombatBoardValue(
            state.contextWidth - event.clientX + state.startX,
            COMBAT_BOARD_MIN_WIDTHS.context,
            totalWidth - COMBAT_BOARD_MIN_WIDTHS.initiative - COMBAT_BOARD_MIN_WIDTHS.map
          );
          combatBoardLayout.contextRatio = nextContext / totalWidth;
        }
      } else {
        const totalHeight = state.boardHeight + state.actionHeight;
        const nextActionHeight = clampCombatBoardValue(
          state.actionHeight - event.clientY + state.startY,
          COMBAT_BOARD_MIN_HEIGHTS.actions,
          totalHeight - COMBAT_BOARD_MIN_HEIGHTS.board
        );
        combatBoardLayout.actionRatio = nextActionHeight / totalHeight;
      }
      combatBoardLayout = normalizeCombatBoardLayout(combatBoardLayout);
      applyCombatBoardLayout();
      globalThis.dndCharacterSheetVttSurface?.refreshLayout?.();
      event.preventDefault();
    }

    function stopCombatBoardResize(event) {
      if (!combatBoardResizeState || (event?.pointerId != null && event.pointerId !== combatBoardResizeState.pointerId)) return;
      combatBoardResizeState = null;
      document.body.classList.remove("combat-board-resizing");
      persistCombatBoardLayout();
    }

    function setupCombatBoardResize() {
      [[combatInitiativeSplitter, "initiative"], [combatContextSplitter, "context"], [combatActionSplitter, "actions"]]
        .filter(([splitter]) => splitter)
        .forEach(([splitter, type]) => {
          splitter.addEventListener("pointerdown", (event) => startCombatBoardResize(event, type));
          splitter.addEventListener("keydown", (event) => handleCombatBoardResizeKey(event, type));
        });
      window.addEventListener("pointermove", moveCombatBoardResize);
      window.addEventListener("pointerup", stopCombatBoardResize);
      window.addEventListener("pointercancel", stopCombatBoardResize);
      applyCombatBoardLayout();
    }

    globalThis.dndCombatBoardSurface = {
      apply: applyCombatBoardLayout,
      setup: setupCombatBoardResize,
      setPanelVisibility(key, visible) {
        if (!Object.prototype.hasOwnProperty.call(combatPanelVisibility, key)) return;
        combatPanelVisibility[key] = Boolean(visible);
        applyCombatPanelVisibility();
      },
      panelVisibility: () => ({ ...combatPanelVisibility })
    };

    function visibleLiveVttCombatParticipants(combat) {
      return Array.isArray(combat?.participants)
        ? combat.participants.filter((participant) => !participant?.hidden && !participant?.playerHidden)
        : [];
    }

    function liveVttCombatTargetRoster() {
      const state = liveVttState;
      const combatActive = Boolean(state?.active && state.combat?.active);
      const roster = { party: [], enemies: [], combatActive };
      if (!combatActive) return roster;
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

      visibleLiveVttCombatParticipants(state.combat)
        .forEach((participant) => addTarget(participant?.kind === "character" ? "party" : "enemies", participant));
      return roster;
    }

    // Public roster intentionally exposes visible names only; AC and HP stay DM-private.
    globalThis.dndLiveVttCombatTargetRoster = liveVttCombatTargetRoster;

    async function openDmScreen() {
      closeSidebarMenu();
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
        .live-vtt-map[hidden],
        .live-vtt-combat[hidden],
        .live-vtt-grid[hidden],
        .live-vtt-tokens[hidden],
        .live-vtt-markers[hidden],
        .live-vtt-fog[hidden],
        .live-vtt-empty[hidden] {
          display: none;
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
          position: absolute;
          right: 12px;
          bottom: 12px;
          z-index: 12;
          display: grid;
          width: min(360px, calc(100% - 24px));
          max-height: min(196px, calc(100% - 24px));
          gap: 7px;
          overflow: hidden;
          border: 1px solid rgba(245, 158, 11, 0.76);
          border-radius: 4px;
          padding: 8px 10px;
          background: rgba(10, 12, 12, 0.96);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.46);
        }
        .live-vtt-hand-controls {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          min-width: 0;
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
        .live-vtt-marker-measurement {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          color: #fff;
          font: 900 9px/1 system-ui, sans-serif;
          text-transform: none;
          filter: drop-shadow(0 1px 2px #000);
        }
        .live-vtt-marker-measurement-line-x {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          border-top: 1px dashed rgba(255, 255, 255, 0.92);
        }
        .live-vtt-marker-measurement-line-y {
          position: absolute;
          bottom: 0;
          left: 50%;
          top: 0;
          border-left: 1px dashed rgba(255, 255, 255, 0.92);
        }
        .live-vtt-marker-measurement-label {
          position: absolute;
          left: 50%;
          top: 50%;
          background: rgba(2, 6, 23, 0.84);
          padding: 2px 3px;
          white-space: nowrap;
        }
        .live-vtt-marker-measurement-label-x {
          bottom: 4px;
          top: auto;
          transform: translateX(-50%);
        }
        .live-vtt-marker-measurement-label-y {
          left: calc(100% + 4px);
          top: 50%;
          transform: translateY(-50%);
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
        <div class="live-vtt-body">
          <div class="live-vtt-empty">Esperando mapa VTT del DM.</div>
          <div class="live-vtt-combat" aria-live="polite" hidden><div class="live-vtt-combat-track"></div></div>
          <img class="live-vtt-map" alt="Mapa VTT" draggable="false" hidden>
          <div class="live-vtt-grid" hidden></div>
          <div class="live-vtt-tokens" hidden></div>
          <div class="live-vtt-markers" hidden></div>
          <canvas class="live-vtt-fog" hidden></canvas>
          <div class="live-vtt-pings" hidden></div>
          <section class="live-vtt-hand-panel" aria-live="polite">
            <div class="live-vtt-hand-summary">
              <span class="live-vtt-hand-queue-title"></span>
              <div class="live-vtt-hand-controls">
                <span class="live-vtt-hand-status"></span>
                <button class="live-vtt-hand" type="button" aria-pressed="false"></button>
              </div>
            </div>
            <div class="live-vtt-hand-queue"></div>
          </section>
        </div>
      `;
      document.body.appendChild(root);
      const elements = {
        root,
        hand: root.querySelector(".live-vtt-hand"),
        handQueueTitle: root.querySelector(".live-vtt-hand-queue-title"),
        handStatus: root.querySelector(".live-vtt-hand-status"),
        handQueue: root.querySelector(".live-vtt-hand-queue"),
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

    function setLiveVttCombatSurface(active) {
      liveVttCombatSurfaceActive = Boolean(active);
      const elements = ensureLiveVttWindow();
      if (liveVttCombatSurfaceActive && combatMapViewport) {
        if (elements.root.parentNode !== combatMapViewport) {
          liveVttOriginalParent = elements.root.parentNode;
          combatMapViewport.appendChild(elements.root);
        }
        elements.root.dataset.combatSurface = "true";
        elements.root.hidden = !liveVttState?.active;
      } else {
        const returnParent = liveVttOriginalParent?.isConnected ? liveVttOriginalParent : document.body;
        if (elements.root.parentNode === combatMapViewport) returnParent.appendChild(elements.root);
        delete elements.root.dataset.combatSurface;
        elements.root.hidden = true;
      }
      renderCombatBoard(liveVttState?.combat);
      requestAnimationFrame(updateLiveVttLayout);
    }

    globalThis.dndCharacterSheetVttSurface = {
      setCombatSurface: setLiveVttCombatSurface,
      getState: () => liveVttState,
      refreshLayout: () => requestAnimationFrame(updateLiveVttLayout)
    };

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
      const participants = visibleLiveVttCombatParticipants(combat);
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

    function renderCombatInitiative(combat) {
      if (!combatInitiativeList) return;
      const participants = visibleLiveVttCombatParticipants(combat);
      const activeIndex = participants.findIndex((participant) => participant.id === combat?.activeId);
      if (combatRoundLabel) {
        combatRoundLabel.textContent = combat?.active
          ? t("combat.round", { round: Math.max(1, Number(combat.round) || 1) })
          : t("combat.waitingForDm");
      }
      if (!participants.length) {
        const empty = document.createElement("div");
        empty.className = "combat-panel-empty";
        empty.textContent = combat?.active ? t("combat.initiativeEmpty") : t("combat.connectInitiative");
        combatInitiativeList.replaceChildren(empty);
        return;
      }

      const rows = participants.map((participant, index) => {
        const row = document.createElement("article");
        row.className = "combat-initiative-row";
        row.dataset.active = String(activeIndex >= 0 && index === activeIndex);
        row.dataset.kind = participant.kind === "character" ? "character" : "monster";

        const portrait = document.createElement("div");
        portrait.className = "combat-initiative-portrait";
        const initials = document.createElement("span");
        initials.textContent = liveVttInitials(participant.name);
        portrait.appendChild(initials);
        resolveLiveVttTokenImage(participant, portrait);

        const copy = document.createElement("div");
        copy.className = "combat-initiative-copy";
        const name = document.createElement("strong");
        name.className = "combat-initiative-name";
        name.textContent = participant.name || t("combat.unknownCombatant");
        const kind = document.createElement("span");
        kind.className = "combat-initiative-kind";
        kind.textContent = participant.kind === "character" ? t("combat.character") : t("combat.enemy");
        copy.append(name, kind);

        const initiative = document.createElement("span");
        initiative.className = "combat-initiative-value";
        initiative.textContent = participant.initiative === "" || participant.initiative == null
          ? "-"
          : String(participant.initiative);
        row.append(portrait, copy, initiative);

        const hpRatio = liveVttHpRatio(participant);
        if (hpRatio !== null) {
          const health = document.createElement("div");
          health.className = "combat-initiative-health";
          const fill = document.createElement("span");
          fill.style.width = `${Math.round(hpRatio * 100)}%`;
          health.appendChild(fill);
          row.appendChild(health);
        }
        return row;
      });
      combatInitiativeList.replaceChildren(...rows);
    }

    function renderCombatBoard(combat) {
      const hasMap = Boolean(liveVttState?.active && liveVttState.image?.dataUrl);
      if (combatMapEmpty) combatMapEmpty.hidden = hasMap;
      if (combatMapStatus) combatMapStatus.textContent = hasMap ? t("combat.mapConnected") : t("combat.mapWaiting");
      if (combatMapLiveIndicator) combatMapLiveIndicator.dataset.connected = String(hasMap);
      renderCombatInitiative(combat);
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
          const dimensions = vttMovementEngine.shapeDimensionsFeet(markerWidth, markerHeight);
          const measurement = document.createElement("span");
          measurement.className = "live-vtt-marker-measurement";
          measurement.style.transform = rotation;
          measurement.style.transformOrigin = "center";
          const lineX = document.createElement("span");
          lineX.className = "live-vtt-marker-measurement-line-x";
          const labelX = document.createElement("span");
          labelX.className = "live-vtt-marker-measurement-label live-vtt-marker-measurement-label-x";
          labelX.textContent = `${vttMovementEngine.formatFeet(dimensions.width)} ft`;
          const lineY = document.createElement("span");
          lineY.className = "live-vtt-marker-measurement-line-y";
          const labelY = document.createElement("span");
          labelY.className = "live-vtt-marker-measurement-label live-vtt-marker-measurement-label-y";
          labelY.textContent = `${vttMovementEngine.formatFeet(dimensions.height)} ft`;
          measurement.append(lineX, labelX, lineY, labelY);
          node.appendChild(measurement);
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
      if (event.target?.closest?.(".live-vtt-hand")) return;
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
        renderCombatBoard(null);
        liveVttPings = [];
        return;
      }
      const nextViewKey = [state.title || "", state.pageName || "", state.image?.name || "", String(state.image?.dataUrl || "").slice(0, 96)].join("|");
      if (nextViewKey !== liveVttViewKey) {
        liveVttView = { scale: 1, x: 0, y: 0 };
        liveVttViewKey = nextViewKey;
      }
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
      renderCombatBoard(state.combat);
      renderLiveVttMarkers(elements.markers, state.markers, state.sourceViewport);
      // The player VTT has a single visible home: the combat map.
      elements.root.hidden = !liveVttCombatSurfaceActive;
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
      closeSidebarMenu();
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
          const openCombat = globalThis.dndCharacterSheetCombatSurface?.open;
          if (typeof openCombat === "function") Promise.resolve(openCombat()).catch(console.error);
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
          if (payload?.type === "dm:notes:state") {
            playerNotesHandleSharedState(payload.notes);
          }
          if (payload?.type === "dm:notes:upsert") {
            playerNotesHandleIncoming(payload.note);
          }
          if (payload?.type === "dm:notes:remove") {
            playerNotesHandleIncomingRemove(payload.noteId);
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
      applyCombatPanelVisibility({ refreshLayout: false });
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

    function isSidebarMenuOpen() {
      return Boolean(sidebarMenuPanel && !sidebarMenuPanel.hidden);
    }

    function setSidebarView(view = "sheet") {
      const nextView = ["combat", "notes"].includes(view) ? view : "sheet";
      sidebarViewButtons.forEach((button) => {
        const active = button.dataset.sidebarView === nextView;
        button.classList.toggle("is-active", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
      if (notesWorkspace) {
        const notesOpen = nextView === "notes";
        notesWorkspace.hidden = !notesOpen;
        notesWorkspace.setAttribute("aria-hidden", notesOpen ? "false" : "true");
        if (notesOpen) {
          playerNotesLoadForActiveSlot();
          playerNotesRender();
        }
      }
    }

    function playerNotesNow() {
      return new Date().toISOString();
    }

    function playerNotesNewId(prefix = "note") {
      const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      return `${prefix}-${String(random).replace(/[^a-zA-Z0-9-]/g, "-")}`;
    }

    function playerNotesStorageKey(slotId = activeSaveSlotId) {
      return `${PLAYER_NOTES_STORAGE_KEY}:${slotId || "slot-1"}`;
    }

    function playerNotesEmptyStore() {
      return {
        version: 4,
        folders: [{ id: "campaign", name: "Campaign", parentId: "" }],
        tags: [],
        attachments: [],
        notes: []
      };
    }

    function playerNotesNormalizeTask(task) {
      if (!task || typeof task !== "object") return null;
      const text = String(task.text || "").trim().slice(0, 240);
      if (!text) return null;
      return {
        id: String(task.id || playerNotesNewId("task")).replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 120),
        text,
        completed: Boolean(task.completed),
        reminderAt: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(task.reminderAt || ""))
          ? String(task.reminderAt).slice(0, 40)
          : ""
      };
    }

    function playerNotesNormalizeLink(link) {
      if (!link || typeof link !== "object") return null;
      const label = String(link.label || "").trim().slice(0, 120);
      if (!label) return null;
      return {
        id: String(link.id || playerNotesNewId("link")).replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 120),
        label,
        type: String(link.type || "Session").trim().slice(0, 40) || "Session"
      };
    }

    function playerNotesNormalizeNote(note = {}) {
      const now = playerNotesNow();
      const category = PLAYER_NOTES_CATEGORIES.includes(String(note.category || "").toLowerCase())
        ? String(note.category).toLowerCase()
        : "session";
      const color = PLAYER_NOTE_COLORS.includes(String(note.color || "").toLowerCase())
        ? String(note.color).toLowerCase()
        : "amber";
      return {
        id: String(note.id || playerNotesNewId()).replace(/[^a-zA-Z0-9_.:-]/g, "-").slice(0, 120),
        title: String(note.title || "Untitled Note").trim().slice(0, 160) || "Untitled Note",
        category,
        folderId: String(note.folderId || "").replace(/[^a-zA-Z0-9_.:-]/g, "-").slice(0, 80),
        body: String(note.body || "").replace(/\r\n?/g, "\n").slice(0, 24000),
        tags: [...new Set((Array.isArray(note.tags) ? note.tags : [])
          .map((tag) => String(tag || "").trim().toLowerCase().slice(0, 32))
          .filter(Boolean))].slice(0, 16),
        color,
        tasks: (Array.isArray(note.tasks) ? note.tasks : []).map(playerNotesNormalizeTask).filter(Boolean).slice(0, 48),
        links: (Array.isArray(note.links) ? note.links : []).map(playerNotesNormalizeLink).filter(Boolean).slice(0, 24),
        pinned: Boolean(note.pinned),
        archived: Boolean(note.archived),
        shared: Boolean(note.shared),
        sharedBy: note.sharedBy && typeof note.sharedBy === "object"
          ? { playerId: String(note.sharedBy.playerId || "").slice(0, 120), playerName: String(note.sharedBy.playerName || "Jugador").slice(0, 80) }
          : null,
        createdAt: String(note.createdAt || now).slice(0, 40),
        updatedAt: String(note.updatedAt || now).slice(0, 40)
      };
    }

    function playerNotesNormalizeStore(raw) {
      const store = raw && typeof raw === "object" ? raw : playerNotesEmptyStore();
      const folders = (Array.isArray(store.folders) ? store.folders : [])
        .map((folder) => {
          if (!folder || typeof folder !== "object") return null;
          const name = String(folder.name || "").trim().slice(0, 80);
          if (!name) return null;
          return {
            id: String(folder.id || playerNotesNewId("folder")).replace(/[^a-zA-Z0-9_.:-]/g, "-").slice(0, 80),
            name,
            parentId: String(folder.parentId || "").replace(/[^a-zA-Z0-9_.:-]/g, "-").slice(0, 80),
            category: PLAYER_NOTES_CATEGORIES.includes(String(folder.category || "").toLowerCase())
              ? String(folder.category).toLowerCase()
              : ""
          };
        })
        .filter(Boolean);
      const folderIds = new Set(folders.map((folder) => folder.id));
      const claimedFolderCategories = new Set();
      const safeFolders = folders.map((folder) => {
        const parentId = folder.parentId && folder.parentId !== folder.id && folderIds.has(folder.parentId) ? folder.parentId : "";
        const category = !parentId && folder.category && !claimedFolderCategories.has(folder.category) ? folder.category : "";
        if (category) claimedFolderCategories.add(category);
        return { ...folder, parentId, category };
      });
      const notes = [...new Map((Array.isArray(store.notes) ? store.notes : [])
        .map(playerNotesNormalizeNote)
        .map((note) => [note.id, { ...note, folderId: folderIds.has(note.folderId) ? note.folderId : "" }])).values()]
        .slice(0, 240);
      const tagByName = new Map();
      const rawTags = Array.isArray(store.tags) ? store.tags : [];
      rawTags.forEach((tag, index) => {
        const name = String(typeof tag === "string" ? tag : tag?.name || "").trim().toLowerCase().replace(/^#/, "").slice(0, 32);
        if (!name || tagByName.has(name)) return;
        const color = PLAYER_NOTE_TAG_COLORS.includes(String(tag?.color || "").toLowerCase())
          ? String(tag.color).toLowerCase()
          : PLAYER_NOTE_TAG_COLORS[index % PLAYER_NOTE_TAG_COLORS.length];
        tagByName.set(name, { id: String(tag?.id || playerNotesNewId("tag")).replace(/[^a-zA-Z0-9_.:-]/g, "-").slice(0, 100), name, color });
      });
      notes.forEach((note) => note.tags.forEach((name) => {
        if (!tagByName.has(name)) tagByName.set(name, { id: playerNotesNewId("tag"), name, color: PLAYER_NOTE_TAG_COLORS[tagByName.size % PLAYER_NOTE_TAG_COLORS.length] });
      }));
      let attachmentBytes = 0;
      const attachments = (Array.isArray(store.attachments) ? store.attachments : [])
        .map((attachment) => {
          if (!attachment || typeof attachment !== "object") return null;
          const dataUrl = String(attachment.dataUrl || "");
          if (!/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(dataUrl) || dataUrl.length > 260000) return null;
          attachmentBytes += dataUrl.length;
          if (attachmentBytes > 4200000) return null;
          return {
            id: String(attachment.id || playerNotesNewId("attachment")).replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 120),
            name: String(attachment.name || "image").replace(/[\r\n|\]]/g, " ").trim().slice(0, 120) || "image",
            dataUrl
          };
        })
        .filter(Boolean)
        .slice(0, 32);
      return { version: 4, folders: safeFolders, tags: [...tagByName.values()].slice(0, 96), attachments, notes };
    }

    function playerNotesSaveStore() {
      if (!playerNotesStore) return;
      try {
        localStorage.setItem(playerNotesStorageKey(), JSON.stringify(playerNotesStore));
      } catch (error) {
        console.warn("Could not save player notes.", error);
      }
    }

    function playerNotesDefaultNote() {
      const now = playerNotesNow();
      return playerNotesNormalizeNote({
        id: playerNotesNewId(),
        title: "Session Notes",
        category: "session",
        folderId: "campaign",
        body: "## Summary\n\nWrite down what happens during the adventure.\n\n## Clues\n\n- \n\n## To Do\n\n- [ ] Add your first task",
        tags: ["session"],
        createdAt: now,
        updatedAt: now
      });
    }

    function playerNotesLoadForActiveSlot() {
      let raw = null;
      try {
        raw = JSON.parse(localStorage.getItem(playerNotesStorageKey()) || "null");
      } catch (error) {
        console.warn("Could not load player notes.", error);
      }
      playerNotesStore = playerNotesNormalizeStore(raw);
      if (!playerNotesStore.notes.length) {
        playerNotesStore.notes.push(playerNotesDefaultNote());
        playerNotesSaveStore();
      }
      const noteIds = new Set(playerNotesStore.notes.map((note) => note.id));
      playerNotesOpenIds = playerNotesOpenIds.filter((id) => noteIds.has(id));
      if (!playerNotesOpenIds.length) playerNotesOpenIds = [playerNotesStore.notes[0].id];
      if (!noteIds.has(playerNotesActiveId)) playerNotesActiveId = playerNotesOpenIds[0];
    }

    function playerNotesActiveNote() {
      return playerNotesStore?.notes?.find((note) => note.id === playerNotesActiveId) || null;
    }

    function playerNotesCategoryLabel(category) {
      const key = PLAYER_NOTE_CATEGORY_LABEL_KEYS[category];
      return key ? t(key) : String(category || "");
    }

    function playerNotesSetNoteCategory(note, category) {
      if (!note || !PLAYER_NOTES_CATEGORIES.includes(category)) return;
      note.category = category;
      note.tags = [...(note.tags || []).filter((tag) => !PLAYER_NOTES_CATEGORIES.includes(tag)), category].slice(0, 16);
    }

    function playerNotesFolderDisplayName(folder) {
      return folder?.category ? playerNotesCategoryLabel(folder.category) : String(folder?.name || "");
    }

    function playerNotesRootFolder(folderId) {
      const foldersById = new Map((playerNotesStore?.folders || []).map((folder) => [folder.id, folder]));
      const visited = new Set();
      let folder = foldersById.get(folderId) || null;
      while (folder?.parentId && !visited.has(folder.id)) {
        visited.add(folder.id);
        folder = foldersById.get(folder.parentId) || folder;
        if (visited.has(folder.id)) break;
      }
      return folder;
    }

    function playerNotesEnsureCategoryMainFolder(category) {
      if (!PLAYER_NOTES_CATEGORIES.includes(category) || !playerNotesStore) return "";
      const existing = playerNotesStore.folders.find((folder) => !folder.parentId && folder.category === category);
      if (existing) return existing.id;
      const preferredId = `main-${category}`;
      const folder = {
        id: playerNotesStore.folders.some((entry) => entry.id === preferredId) ? playerNotesNewId("folder") : preferredId,
        name: PLAYER_NOTE_CATEGORY_FOLDER_NAMES[category],
        parentId: "",
        category
      };
      playerNotesStore.folders.push(folder);
      return folder.id;
    }

    function playerNotesCategoryForFolder(folderId) {
      return playerNotesRootFolder(folderId)?.category || "";
    }

    function playerNotesVisibleNotes() {
      const query = playerNotesSearch.trim().toLowerCase();
      return (playerNotesStore?.notes || [])
        .filter((note) => {
          if (note.archived) return false;
          if (playerNotesFilter === "shared" && !note.shared) return false;
          if (PLAYER_NOTES_CATEGORIES.includes(playerNotesFilter) && note.category !== playerNotesFilter) return false;
          if (!query) return true;
          return [note.title, note.body, ...(note.tags || [])].join(" ").toLowerCase().includes(query);
        })
        .sort((left, right) => Number(right.pinned) - Number(left.pinned) || String(right.updatedAt).localeCompare(String(left.updatedAt)));
    }

    function playerNotesFormatDate(value) {
      if (!value) return "-";
      try {
        return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
      } catch (_error) {
        return String(value);
      }
    }

    function playerNotesIcon(name, size = 17) {
      return globalThis.AppIcon?.({ name, size }) || document.createTextNode("");
    }

    function playerNotesRenderCategories() {
      const notes = playerNotesStore?.notes || [];
      notesCategoryList?.querySelectorAll("[data-notes-category]").forEach((button) => {
        const category = button.dataset.notesCategory || "all";
        button.classList.toggle("is-active", category === playerNotesFilter && !playerNotesFolderFilter);
      });
      const allCount = notes.filter((note) => !note.archived).length;
      const sharedCount = notes.filter((note) => !note.archived && note.shared).length;
      document.getElementById("notesAllCount")?.replaceChildren(document.createTextNode(String(allCount)));
      document.getElementById("notesSharedCount")?.replaceChildren(document.createTextNode(String(sharedCount)));
      notesCategoryList?.querySelectorAll("[data-notes-count]").forEach((badge) => {
        const category = badge.dataset.notesCount;
        badge.textContent = String(notes.filter((note) => !note.archived && note.category === category).length);
      });
    }

    function playerNotesRenderFolderTree() {
      if (!notesFolderList) return;
      const folders = playerNotesStore?.folders || [];
      const visibleNotes = playerNotesVisibleNotes();
      const filtering = playerNotesFilter !== "all" || Boolean(playerNotesSearch.trim());
      const childrenByParent = new Map();
      folders.forEach((folder) => {
        const parentId = folder.parentId || "";
        if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
        childrenByParent.get(parentId).push(folder);
      });
      const notesByFolder = new Map();
      visibleNotes.forEach((note) => {
        const folderId = folders.some((folder) => folder.id === note.folderId) ? note.folderId : "";
        if (!notesByFolder.has(folderId)) notesByFolder.set(folderId, []);
        notesByFolder.get(folderId).push(note);
      });
      const branchNoteCountCache = new Map();
      const branchNoteCount = (folderId, trail = new Set()) => {
        if (branchNoteCountCache.has(folderId)) return branchNoteCountCache.get(folderId);
        if (trail.has(folderId)) return 0;
        const nextTrail = new Set([...trail, folderId]);
        const count = (notesByFolder.get(folderId) || []).length
          + (childrenByParent.get(folderId) || []).reduce((total, child) => total + branchNoteCount(child.id, nextTrail), 0);
        branchNoteCountCache.set(folderId, count);
        return count;
      };

      const createNoteRow = (note) => {
        const row = document.createElement("div");
        row.className = "notes-tree-note-row";
        row.draggable = true;
        row.dataset.notesNoteNode = note.id;
        row.setAttribute("role", "treeitem");
        const button = document.createElement("button");
        button.type = "button";
        button.className = `notes-tree-note-button${note.id === playerNotesActiveId ? " is-active" : ""}`;
        button.dataset.notesId = note.id;
        const icon = document.createElement("span");
        icon.className = "notes-tree-note-icon";
        icon.appendChild(playerNotesIcon("file", 15));
        const title = document.createElement("span");
        title.className = "notes-tree-note-title";
        title.textContent = note.title;
        const dot = document.createElement("span");
        dot.className = "notes-tree-note-dot";
        dot.style.background = note.color === "gray" ? "#737a7b" : note.color === "red" ? "#e16152" : note.color === "green" ? "#5aaf59" : note.color === "blue" ? "#4f87cc" : note.color === "purple" ? "#8758c4" : "#e5a925";
        button.append(icon, title, dot);
        row.appendChild(button);
        return row;
      };

      const renderedFolderIds = new Set();
      const renderBranch = (parentId, depth = 0, trail = new Set()) => {
        const nodes = [];
        (childrenByParent.get(parentId) || []).forEach((folder) => {
          if (trail.has(folder.id) || renderedFolderIds.has(folder.id)) return;
          const visibleBranchCount = branchNoteCount(folder.id);
          if (filtering && !visibleBranchCount) return;
          renderedFolderIds.add(folder.id);
          const childFolders = childrenByParent.get(folder.id) || [];
          const directNotes = notesByFolder.get(folder.id) || [];
          const hasChildren = childFolders.length > 0 || directNotes.length > 0;
          const collapsed = !filtering && playerNotesCollapsedFolders.has(folder.id);
          const folderNode = document.createElement("div");
          folderNode.className = "notes-tree-folder";
          folderNode.draggable = true;
          folderNode.dataset.notesFolderNode = folder.id;
          folderNode.setAttribute("role", "treeitem");
          folderNode.setAttribute("aria-level", String(depth + 1));
          if (hasChildren) folderNode.setAttribute("aria-expanded", collapsed ? "false" : "true");
          const row = document.createElement("div");
          row.className = "notes-folder-row";

          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = `notes-folder-toggle${hasChildren ? " has-children" : ""}`;
          toggle.dataset.notesFolderToggle = folder.id;
          if (hasChildren) toggle.appendChild(playerNotesIcon(collapsed ? "chevronRight" : "chevronDown", 14));
          toggle.setAttribute("aria-label", hasChildren ? t(collapsed ? "notes.expandFolder" : "notes.collapseFolder") : "");
          toggle.title = hasChildren ? t(collapsed ? "notes.expandFolder" : "notes.collapseFolder") : "";
          toggle.disabled = !hasChildren;

          const button = document.createElement("button");
          button.type = "button";
          button.className = `notes-folder-button${playerNotesFolderFilter === folder.id ? " is-active" : ""}`;
          button.dataset.notesFolder = folder.id;
          const icon = document.createElement("span");
          icon.className = "notes-folder-icon";
          icon.appendChild(playerNotesIcon("folder", 16));
          const label = document.createElement("span");
          const folderName = playerNotesFolderDisplayName(folder);
          label.textContent = folderName;
          const count = document.createElement("span");
          count.className = "notes-category-count";
          count.textContent = String(visibleBranchCount);
          button.append(icon, label, count);

          const addChild = document.createElement("button");
          addChild.type = "button";
          addChild.className = "notes-folder-add-child";
          addChild.dataset.notesAddChildFolder = folder.id;
          addChild.appendChild(playerNotesIcon("plus", 14));
          addChild.title = t("notes.addFolder");
          addChild.setAttribute("aria-label", t("notes.addSubfolderTo", { name: folderName }));
          row.append(toggle, button, addChild);
          folderNode.appendChild(row);
          if (!collapsed) {
            const children = document.createElement("div");
            children.className = "notes-tree-children";
            children.setAttribute("role", "group");
            children.append(...renderBranch(folder.id, depth + 1, new Set([...trail, folder.id])));
            children.append(...directNotes.map(createNoteRow));
            if (children.childElementCount) folderNode.appendChild(children);
          }
          nodes.push(folderNode);
        });
        return nodes;
      };
      const roots = [...renderBranch(""), ...(notesByFolder.get("") || []).map(createNoteRow)];
      folders.forEach((folder) => {
        if (!renderedFolderIds.has(folder.id) && (!filtering || branchNoteCount(folder.id))) roots.push(...renderBranch(folder.parentId || ""));
      });
      if (!roots.length) {
        const empty = document.createElement("div");
        empty.className = "notes-tree-empty";
        empty.textContent = t("notes.noNotes");
        notesFolderList.replaceChildren(empty);
        return;
      }
      notesFolderList.replaceChildren(...roots);
    }

    function playerNotesRenderTabs() {
      if (!notesTabs) return;
      notesTabs.replaceChildren(...playerNotesOpenIds
        .map((id) => playerNotesStore?.notes?.find((note) => note.id === id))
        .filter(Boolean)
        .map((note) => {
          const tab = document.createElement("div");
          tab.className = `notes-tab${note.id === playerNotesActiveId ? " is-active" : ""}`;
          tab.dataset.notesId = note.id;
          tab.setAttribute("role", "tab");
          tab.setAttribute("aria-selected", note.id === playerNotesActiveId ? "true" : "false");
          const label = document.createElement("span");
          label.className = "notes-tab-label";
          label.textContent = note.title;
          const close = document.createElement("button");
          close.type = "button";
          close.className = "notes-tab-close";
          close.dataset.notesCloseId = note.id;
          close.setAttribute("aria-label", t("common.close"));
          close.title = t("common.close");
          close.appendChild(playerNotesIcon("x", 14));
          tab.append(label, close);
          return tab;
        }));
    }

    function playerNotesRenderActiveSelection() {
      notesFolderList?.querySelectorAll("[data-notes-id]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.notesId === playerNotesActiveId);
      });
      notesTabs?.querySelectorAll("[data-notes-id]").forEach((tab) => {
        const active = tab.dataset.notesId === playerNotesActiveId;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });
    }

    function playerNotesTagDefinition(name) {
      return playerNotesStore?.tags?.find((tag) => tag.name === name) || null;
    }

    function playerNotesColorForTag(name) {
      return playerNotesTagDefinition(name)?.color || PLAYER_NOTE_TAG_COLORS[0];
    }

    function playerNotesRenderTagColors() {
      if (!notesTagColors) return;
      const activeColor = playerNotesSelectedTagName ? playerNotesColorForTag(playerNotesSelectedTagName) : playerNotesTagColor;
      notesTagColors.replaceChildren(...PLAYER_NOTE_TAG_COLORS.map((color) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = activeColor === color ? "is-active" : "";
        button.dataset.notesTagColor = color;
        button.setAttribute("aria-label", t("notes.tagColorName", { color }));
        button.title = t("notes.tagColorName", { color });
        return button;
      }));
    }

    function playerNotesRenderTagLibrary(note) {
      if (!notesTagLibrary) return;
      notesTagLibrary.replaceChildren(...(playerNotesStore?.tags || []).map((tag) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `notes-tag-library-button${note?.tags?.includes(tag.name) ? " is-assigned" : ""}${playerNotesSelectedTagName === tag.name ? " is-selected" : ""}`;
        button.dataset.notesTag = tag.name;
        button.dataset.color = tag.color;
        button.title = t("notes.toggleTagHint");
        const dot = document.createElement("span");
        dot.className = "notes-tag-library-dot";
        const label = document.createElement("span");
        label.textContent = `#${tag.name}`;
        button.append(dot, label);
        return button;
      }));
    }

    function playerNotesRenderTags(note) {
      if (!notesTags) return;
      notesTags.replaceChildren(...(note?.tags || []).map((tag) => {
        const chip = document.createElement("span");
        chip.className = "notes-tag";
        chip.dataset.color = playerNotesColorForTag(tag);
        chip.dataset.notesTag = tag;
        chip.appendChild(document.createTextNode(`#${tag}`));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.notesRemoveTag = tag;
        remove.setAttribute("aria-label", `${t("notes.delete")} ${tag}`);
        remove.title = `${t("notes.delete")} ${tag}`;
        remove.appendChild(playerNotesIcon("x", 13));
        chip.appendChild(remove);
        return chip;
      }));
      playerNotesRenderTagLibrary(note);
      playerNotesRenderTagColors();
    }

    function playerNotesRenderMainFolder(note) {
      if (!notesMainFolderSelect) return;
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = t("notes.noMainFolder");
      const categoryGroup = document.createElement("optgroup");
      categoryGroup.label = t("notes.categoryFolders");
      categoryGroup.append(...PLAYER_NOTES_CATEGORIES.map((category) => {
        const option = document.createElement("option");
        option.value = `category:${category}`;
        option.textContent = playerNotesCategoryLabel(category);
        return option;
      }));
      const customRoots = (playerNotesStore?.folders || [])
        .filter((folder) => !folder.parentId && !folder.category)
        .sort((left, right) => playerNotesFolderDisplayName(left).localeCompare(playerNotesFolderDisplayName(right)));
      const customGroup = document.createElement("optgroup");
      customGroup.label = t("notes.customMainFolders");
      customGroup.append(...customRoots.map((folder) => {
        const option = document.createElement("option");
        option.value = `folder:${folder.id}`;
        option.textContent = playerNotesFolderDisplayName(folder);
        return option;
      }));
      notesMainFolderSelect.replaceChildren(emptyOption, categoryGroup, customGroup);
      const root = playerNotesRootFolder(note?.folderId || "");
      notesMainFolderSelect.value = root?.category ? `category:${root.category}` : root ? `folder:${root.id}` : "";
      notesMainFolderSelect.disabled = !note;
      if (notesCreateMainFolderButton) notesCreateMainFolderButton.disabled = !note;
      if (!note) {
        notesMainFolderForm?.setAttribute("hidden", "");
        if (notesMainFolderName) notesMainFolderName.value = "";
      }
    }

    function playerNotesRenderCategoryBrowser() {
      const browse = playerNotesBrowseMode && PLAYER_NOTE_BROWSE_CATEGORIES.includes(playerNotesFilter);
      const editorColumn = notesWorkspace?.querySelector(".notes-editor-column");
      const detailsPanel = notesWorkspace?.querySelector(".notes-details-panel");
      if (notesCategoryBrowser) notesCategoryBrowser.hidden = !browse;
      if (editorColumn) editorColumn.hidden = browse;
      if (detailsPanel) detailsPanel.hidden = browse;
      if (!browse || !notesCategoryBrowserList) return;
      const visibleNotes = playerNotesVisibleNotes();
      if (notesCategoryBrowserTitle) notesCategoryBrowserTitle.textContent = playerNotesCategoryLabel(playerNotesFilter);
      if (notesCategoryBrowserCount) notesCategoryBrowserCount.textContent = t("notes.categoryCount", { count: visibleNotes.length });
      notesCategoryBrowserList.replaceChildren(...visibleNotes.map((note) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "notes-category-note-row";
        button.dataset.notesBrowserId = note.id;
        const copy = document.createElement("span");
        copy.className = "notes-category-note-copy";
        const title = document.createElement("strong");
        title.textContent = note.title;
        const meta = document.createElement("span");
        meta.className = "notes-category-note-meta";
        const folder = playerNotesStore?.folders?.find((entry) => entry.id === note.folderId);
        meta.textContent = [playerNotesFolderDisplayName(folder), playerNotesFormatDate(note.updatedAt)].filter(Boolean).join(" • ");
        copy.append(title, meta);
        const tags = document.createElement("span");
        tags.className = "notes-category-note-tags";
        tags.append(...note.tags.map((tag) => {
          const chip = document.createElement("span");
          chip.className = "notes-category-note-tag";
          chip.dataset.color = playerNotesColorForTag(tag);
          chip.appendChild(document.createTextNode(`#${tag}`));
          return chip;
        }));
        button.append(copy, tags);
        return button;
      }));
    }

    function playerNotesRenderTasks(note) {
      if (!notesTaskList) return;
      notesTaskList.replaceChildren(...(note?.tasks || []).map((task) => {
        const row = document.createElement("div");
        row.className = "notes-task-row";
        row.dataset.completed = String(task.completed);
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.dataset.notesTaskId = task.id;
        const label = document.createElement("span");
        label.className = "notes-task-label";
        label.textContent = task.text;
        const reminder = document.createElement("time");
        reminder.className = "notes-task-reminder";
        reminder.dateTime = task.reminderAt || "";
        reminder.textContent = task.reminderAt ? playerNotesFormatDate(task.reminderAt) : "";
        reminder.hidden = !task.reminderAt;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "notes-task-delete";
        remove.dataset.notesRemoveTask = task.id;
        remove.setAttribute("aria-label", `${t("notes.delete")} ${task.text}`);
        remove.title = `${t("notes.delete")} ${task.text}`;
        remove.appendChild(playerNotesIcon("x", 13));
        const copy = document.createElement("span");
        copy.className = "notes-task-copy";
        copy.append(label, reminder);
        row.append(checkbox, copy, remove);
        return row;
      }));
    }

    function playerNotesSetEditorDisabled(disabled) {
      [notesTitleInput, notesStarButton, notesShareToggle, notesPinButton, notesArchiveButton, notesDuplicateButton, notesExportButton, notesDeleteButton, notesTagInput, notesAddTagButton, notesMainFolderSelect, notesCreateMainFolderButton, notesAddTaskButton, notesLinkUrl]
        .filter(Boolean)
        .forEach((element) => { element.disabled = disabled; });
      if (notesBodyInput) {
        notesBodyInput.contentEditable = String(!disabled);
        notesBodyInput.setAttribute("aria-disabled", String(disabled));
      }
      notesWorkspace?.querySelectorAll("[data-note-command], [data-note-color], [data-note-template]").forEach((element) => { element.disabled = disabled; });
    }

    function playerNotesAppendObsidianInline(parent, text) {
      const engine = globalThis.dndObsidianMarkdownEngine;
      const parts = engine?.tokenizeObsidianInline?.(text) || [{ type: "text", text: String(text || "") }];
      parts.forEach((part) => {
        if (part.type === "text") {
          parent.appendChild(document.createTextNode(part.text));
          return;
        }
        if (part.type === "wiki") {
          const target = engine.cleanObsidianTarget(part.target);
          const button = document.createElement("span");
          button.className = "notes-obsidian-link notes-rich-wiki-link";
          button.dataset.markdownToken = String(part.target || "");
          button.textContent = engine.obsidianDisplayAlias(part.target);
          button.addEventListener("click", (event) => {
            if (!event.ctrlKey && !event.metaKey) return;
            const targetNote = playerNotesStore?.notes?.find((note) => note.title.toLowerCase() === target.toLowerCase());
            if (targetNote) {
              playerNotesBrowseMode = false;
              playerNotesSetActive(targetNote.id);
            }
          });
          parent.appendChild(button);
          return;
        }
        if (part.type === "link") {
          const link = document.createElement("a");
          link.className = "notes-obsidian-link";
          link.textContent = part.label;
          link.href = /^(?:https?:\/\/|mailto:)/i.test(String(part.href || "")) ? part.href : "#";
          link.target = "_blank";
          link.rel = "noreferrer noopener";
          link.addEventListener("click", (event) => {
            if (!event.ctrlKey && !event.metaKey) event.preventDefault();
          });
          parent.appendChild(link);
          return;
        }
        if (part.type === "image") {
          const target = engine.cleanObsidianTarget(part.target);
          const attachment = target.startsWith("attachment:")
            ? playerNotesStore?.attachments?.find((entry) => entry.id === target.slice("attachment:".length))
            : null;
          if (attachment) {
            const image = document.createElement("img");
            image.className = "notes-obsidian-image";
            image.src = attachment.dataUrl;
            image.alt = engine.obsidianDisplayAlias(part.target) || attachment.name || t("notes.imagePlaceholder");
            image.dataset.markdownToken = String(part.target || "");
            image.contentEditable = "false";
            image.draggable = false;
            image.loading = "lazy";
            parent.appendChild(image);
          } else {
            const placeholder = document.createElement("span");
            placeholder.className = "notes-obsidian-image-placeholder";
            placeholder.textContent = `[${engine.obsidianDisplayAlias(part.target) || t("notes.imagePlaceholder")}]`;
            parent.appendChild(placeholder);
          }
          return;
        }
        const element = document.createElement(part.type === "bold" ? "strong" : part.type === "italic" ? "em" : part.type === "underline" ? "u" : part.type === "strike" ? "del" : part.type === "highlight" ? "mark" : "code");
        element.className = `notes-obsidian-inline-${part.type}`;
        playerNotesAppendObsidianInline(element, part.text);
        parent.appendChild(element);
      });
    }

    function playerNotesPreviewBlocks(note) {
      const noteId = String(note?.id || "");
      const body = String(note?.body || "");
      const cached = playerNotesPreviewCache.get(noteId);
      if (cached?.body === body) return cached.blocks;
      const blocks = globalThis.dndObsidianMarkdownEngine?.parseObsidianMarkdown?.(body) || [];
      playerNotesPreviewCache.set(noteId, { body, blocks });
      while (playerNotesPreviewCache.size > 48) {
        playerNotesPreviewCache.delete(playerNotesPreviewCache.keys().next().value);
      }
      return blocks;
    }

    function playerNotesRenderObsidianPreview(note) {
      if (!notesBodyPreview) return;
      const body = String(note?.body || "");
      const renderKey = `${playerI18n?.getLanguage?.() || "en"}\u0000${note?.id || ""}\u0000${body}`;
      if (renderKey === playerNotesRenderedPreviewKey) return;
      notesBodyPreview.textContent = "";
      const blocks = playerNotesPreviewBlocks(note);
      if (!blocks.length) {
        playerNotesRenderedPreviewKey = renderKey;
        return;
      }
      blocks.forEach((block) => {
        if (block.type === "heading") {
          const heading = document.createElement(`h${Math.min(6, Math.max(2, block.level + 1))}`);
          heading.className = `notes-obsidian-heading notes-obsidian-heading-${block.level}`;
          heading.dataset.markdownLevel = String(block.level);
          playerNotesAppendObsidianInline(heading, block.text);
          notesBodyPreview.appendChild(heading);
          return;
        }
        if (block.type === "hr") {
          notesBodyPreview.appendChild(document.createElement("hr"));
          return;
        }
        if (block.type === "code") {
          const pre = document.createElement("pre");
          pre.className = "notes-obsidian-code";
          pre.dataset.markdownLanguage = block.language || "";
          pre.textContent = block.text;
          notesBodyPreview.appendChild(pre);
          return;
        }
        if (block.type === "list") {
          const list = document.createElement(block.ordered ? "ol" : "ul");
          list.className = `notes-obsidian-list${block.ordered ? " ordered" : ""}`;
          block.items.forEach((item) => {
            const listItem = document.createElement("li");
            if (item.task) {
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.checked = item.checked;
              checkbox.contentEditable = "false";
              listItem.className = "notes-obsidian-task";
              listItem.append(checkbox);
            }
            const copy = document.createElement("span");
            copy.className = item.checked ? "is-complete" : "";
            playerNotesAppendObsidianInline(copy, item.text);
            listItem.appendChild(copy);
            list.appendChild(listItem);
          });
          notesBodyPreview.appendChild(list);
          return;
        }
        if (block.type === "table") {
          const table = document.createElement("table");
          table.className = "notes-obsidian-table";
          const head = document.createElement("thead");
          const headRow = document.createElement("tr");
          (block.headers || []).forEach((cell) => {
            const heading = document.createElement("th");
            playerNotesAppendObsidianInline(heading, cell);
            headRow.appendChild(heading);
          });
          head.appendChild(headRow);
          const body = document.createElement("tbody");
          (block.rows || []).forEach((row) => {
            const tableRow = document.createElement("tr");
            (block.headers || []).forEach((_header, index) => {
              const cell = document.createElement("td");
              playerNotesAppendObsidianInline(cell, row[index] || "");
              tableRow.appendChild(cell);
            });
            body.appendChild(tableRow);
          });
          table.append(head, body);
          notesBodyPreview.appendChild(table);
          return;
        }
        if (block.type === "quote" || block.type === "callout") {
          const quote = document.createElement("blockquote");
          quote.className = `notes-obsidian-quote${block.type === "callout" ? " is-callout" : ""}`;
          if (block.type === "callout") {
            quote.dataset.markdownCalloutKind = block.kind || "note";
            quote.dataset.markdownCalloutTitle = block.title || block.kind || "note";
            const title = document.createElement("strong");
            title.textContent = `${block.kind}: ${block.title}`;
            quote.appendChild(title);
          }
          (block.lines || []).forEach((line) => {
            const paragraph = document.createElement("p");
            playerNotesAppendObsidianInline(paragraph, line);
            quote.appendChild(paragraph);
          });
          notesBodyPreview.appendChild(quote);
          return;
        }
        const paragraph = document.createElement("p");
        playerNotesAppendObsidianInline(paragraph, block.text);
        notesBodyPreview.appendChild(paragraph);
      });
      playerNotesRenderedPreviewKey = renderKey;
    }

    function playerNotesRichInlineMarkdown(node) {
      if (!node) return "";
      if (node.nodeType === Node.TEXT_NODE) return String(node.nodeValue || "").replace(/\u200b/g, "");
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const element = node;
      const tag = element.tagName.toLowerCase();
      if (tag === "br") return "\n";
      if (tag === "input") return "";
      if (tag === "img") return element.dataset.markdownToken || `![${element.alt || t("notes.imagePlaceholder")}](#)`;
      if (element.dataset.markdownToken) return element.dataset.markdownToken;
      if (["ul", "ol", "blockquote", "pre", "table", "hr", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
        return `\n${playerNotesRichBlockMarkdown(element)}\n`;
      }
      const content = [...element.childNodes].map(playerNotesRichInlineMarkdown).join("");
      if (tag === "strong" || tag === "b") return `**${content}**`;
      if (tag === "em" || tag === "i") return `*${content}*`;
      if (tag === "u") return `__${content}__`;
      if (tag === "del" || tag === "s" || tag === "strike") return `~~${content}~~`;
      if (tag === "mark" || (tag === "span" && element.style.backgroundColor)) return `==${content}==`;
      if (tag === "code") return `\`${content}\``;
      if (tag === "a") return `[${content}](${element.getAttribute("href") || "https://"})`;
      if (tag === "p" || tag === "div") return `${content}\n`;
      return content;
    }

    function playerNotesRichBlockMarkdown(node) {
      if (!node) return "";
      if (node.nodeType === Node.TEXT_NODE) return playerNotesRichInlineMarkdown(node).trim();
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const element = node;
      const tag = element.tagName.toLowerCase();
      if (tag === "hr") return "---";
      if (/^h[1-6]$/.test(tag)) {
        const level = Math.max(1, Math.min(6, Number(element.dataset.markdownLevel) || Number(tag.slice(1))));
        return `${"#".repeat(level)} ${[...element.childNodes].map(playerNotesRichInlineMarkdown).join("")}`;
      }
      if (tag === "pre") {
        const language = String(element.dataset.markdownLanguage || "");
        return `\`\`\`${language}\n${String(element.textContent || "").replace(/\u200b/g, "")}\n\`\`\``;
      }
      if (tag === "ul" || tag === "ol") {
        let ordinal = 0;
        return [...element.children].filter((child) => child.tagName?.toLowerCase() === "li").map((item) => {
          ordinal += 1;
          const checkbox = item.querySelector(":scope > input[type='checkbox']");
          const content = [...item.childNodes].filter((child) => child !== checkbox).map(playerNotesRichInlineMarkdown).join("").trim();
          if (checkbox) return `- [${checkbox.checked ? "x" : " "}] ${content}`;
          return `${tag === "ol" ? `${ordinal}.` : "-"} ${content}`;
        }).join("\n");
      }
      if (tag === "blockquote") {
        const lines = [...element.children]
          .filter((child) => child.tagName?.toLowerCase() !== "strong")
          .map((child) => playerNotesRichInlineMarkdown(child).trim())
          .filter(Boolean);
        if (element.dataset.markdownCalloutKind) {
          const header = `> [!${element.dataset.markdownCalloutKind}] ${element.dataset.markdownCalloutTitle || ""}`.trimEnd();
          return [header, ...lines.map((line) => `> ${line}`)].join("\n");
        }
        const sourceLines = lines.length ? lines : String(element.textContent || "").split("\n").filter(Boolean);
        return sourceLines.map((line) => `> ${line}`).join("\n");
      }
      if (tag === "table") {
        const headers = [...element.querySelectorAll(":scope > thead > tr:first-child > th")].map((cell) => playerNotesRichInlineMarkdown(cell).trim());
        const rows = [...element.querySelectorAll(":scope > tbody > tr")].map((row) => [...row.children].map((cell) => playerNotesRichInlineMarkdown(cell).trim()));
        if (!headers.length) return "";
        return [
          `| ${headers.join(" | ")} |`,
          `| ${headers.map(() => "---").join(" | ")} |`,
          ...rows.map((row) => `| ${headers.map((_header, index) => row[index] || "").join(" | ")} |`)
        ].join("\n");
      }
      return [...element.childNodes].map(playerNotesRichInlineMarkdown).join("").trimEnd();
    }

    function playerNotesRichEditorMarkdown() {
      if (!notesBodyInput) return "";
      return [...notesBodyInput.childNodes]
        .map(playerNotesRichBlockMarkdown)
        .filter((part) => part !== "")
        .join("\n\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\n+|\n+$/g, "");
    }

    function playerNotesNormalizeRichDom() {
      if (!notesBodyInput) return;
      notesBodyInput.querySelectorAll("ul, ol").forEach((list) => {
        list.classList.add("notes-obsidian-list");
        list.classList.toggle("ordered", list.tagName.toLowerCase() === "ol");
      });
      notesBodyInput.querySelectorAll("blockquote").forEach((quote) => quote.classList.add("notes-obsidian-quote"));
      notesBodyInput.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
        const level = Math.max(1, Math.min(6, Number(heading.dataset.markdownLevel) || Number(heading.tagName.slice(1))));
        heading.dataset.markdownLevel = String(level);
        heading.classList.add("notes-obsidian-heading", `notes-obsidian-heading-${level}`);
      });
      notesBodyInput.querySelectorAll("a").forEach((link) => link.classList.add("notes-obsidian-link"));
      notesBodyInput.querySelectorAll("table").forEach((table) => table.classList.add("notes-obsidian-table"));
    }

    function playerNotesSyncRichEditor({ share = true } = {}) {
      const note = playerNotesActiveNote();
      if (!note || !notesBodyInput) return false;
      playerNotesNormalizeRichDom();
      const markdown = playerNotesRichEditorMarkdown();
      if (!markdown && notesBodyInput.childNodes.length) notesBodyInput.replaceChildren();
      if (markdown.length > 24000) {
        if (notesEditorStatus) notesEditorStatus.textContent = t("notes.noteTooLong");
        return false;
      }
      note.body = markdown;
      playerNotesRenderedPreviewKey = `${playerI18n?.getLanguage?.() || "en"}\u0000${note.id}\u0000${note.body}`;
      playerNotesPersist(note, { share });
      return true;
    }

    function playerNotesEditorSelectionRange() {
      const selection = window.getSelection?.();
      if (!selection?.rangeCount) return null;
      const range = selection.getRangeAt(0);
      return notesBodyInput?.contains(range.commonAncestorContainer) ? range : null;
    }

    function playerNotesPlaceCaretAfter(node) {
      const spacer = document.createTextNode("\u200b");
      node.parentNode?.insertBefore(spacer, node.nextSibling);
      const range = document.createRange();
      range.setStart(spacer, 1);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }

    function playerNotesApplyTypedMarkdownShortcut() {
      const selection = window.getSelection?.();
      if (!selection?.isCollapsed || !selection.anchorNode || selection.anchorNode.nodeType !== Node.TEXT_NODE) return false;
      if (!notesBodyInput?.contains(selection.anchorNode)) return false;
      const shortcut = globalThis.dndObsidianMarkdownEngine?.findMarkdownRichShortcut?.(selection.anchorNode.nodeValue, selection.anchorOffset);
      if (!shortcut) return false;
      const element = document.createElement(shortcut.type === "bold" ? "strong" : shortcut.type === "italic" ? "em" : shortcut.type === "underline" ? "u" : shortcut.type === "strike" ? "del" : shortcut.type === "highlight" ? "mark" : shortcut.type === "link" ? "a" : "code");
      element.className = `notes-obsidian-inline-${shortcut.type}`;
      element.textContent = shortcut.text;
      if (shortcut.type === "link") {
        element.href = shortcut.href;
        element.classList.add("notes-obsidian-link");
      }
      const range = document.createRange();
      range.setStart(selection.anchorNode, shortcut.start);
      range.setEnd(selection.anchorNode, shortcut.end);
      range.deleteContents();
      range.insertNode(element);
      playerNotesPlaceCaretAfter(element);
      return true;
    }

    function playerNotesRenderDetails() {
      const note = playerNotesActiveNote();
      playerNotesSetEditorDisabled(!note);
      if (!note) {
        if (notesTitleInput) notesTitleInput.value = "";
        if (notesShareStatus) notesShareStatus.textContent = "";
        notesBodyInput?.replaceChildren();
        playerNotesRenderedPreviewKey = "";
        playerNotesRenderTags(null);
        playerNotesRenderMainFolder(null);
        playerNotesRenderTasks(null);
        return;
      }
      if (notesTitleInput && notesTitleInput.value !== note.title) notesTitleInput.value = note.title;
      playerNotesRenderObsidianPreview(note);
      if (notesStarButton) {
        notesStarButton.classList.toggle("is-active", note.pinned);
        notesStarButton.replaceChildren(playerNotesIcon("star", 21));
        notesStarButton.setAttribute("aria-pressed", String(note.pinned));
      }
      if (notesPinButton) notesPinButton.classList.toggle("is-active", note.pinned);
      if (notesArchiveButton) {
        notesArchiveButton.classList.toggle("is-active", note.archived);
        notesArchiveButton.querySelector("span:last-child")?.replaceChildren(document.createTextNode(note.archived ? t("notes.unarchived") : t("notes.archive")));
      }
      if (notesShareToggle) notesShareToggle.checked = note.shared;
      if (notesShareStatus) {
        notesShareStatus.dataset.tone = "";
        notesShareStatus.textContent = note.shared
          ? (note.sharedBy?.playerName ? t("notes.sharedBy", { name: note.sharedBy.playerName }) : t("notes.shared"))
          : t("notes.unshared");
      }
      notesLabelColors?.querySelectorAll("[data-note-color]").forEach((button) => button.classList.toggle("is-active", button.dataset.noteColor === note.color));
      playerNotesRenderTags(note);
      playerNotesRenderMainFolder(note);
      playerNotesRenderTasks(note);
    }

    function playerNotesRender() {
      if (!playerNotesStore) playerNotesLoadForActiveSlot();
      playerNotesRenderCategories();
      playerNotesRenderFolderTree();
      playerNotesRenderTabs();
      playerNotesRenderCategoryBrowser();
      playerNotesRenderDetails();
    }

    function playerNotesPersist(note = playerNotesActiveNote(), { share = true } = {}) {
      if (!note || !playerNotesStore) return;
      note.updatedAt = playerNotesNow();
      clearTimeout(playerNotesSaveTimer);
      playerNotesSaveTimer = setTimeout(() => {
        playerNotesSaveStore();
        if (notesEditorStatus) notesEditorStatus.textContent = t("notes.saved");
      }, 180);
      if (share && note.shared) playerNotesScheduleShare(note);
    }

    function playerNotesScheduleShare(note) {
      clearTimeout(playerNotesShareTimer);
      playerNotesShareTimer = setTimeout(() => {
        if (!note?.shared) return;
        if (!sendLiveSheetMessage({ type: "player:note:share", note })) {
          if (notesShareStatus) {
            notesShareStatus.dataset.tone = "error";
            notesShareStatus.textContent = t("notes.shareRequiresConnection");
          }
        }
      }, 180);
    }

    function playerNotesUpdate(patch, options = {}) {
      const note = playerNotesActiveNote();
      if (!note) return;
      Object.assign(note, patch);
      if (Object.prototype.hasOwnProperty.call(patch, "folderId")) playerNotesRevealNotePath(note);
      playerNotesPersist(note, options);
      playerNotesRenderFolderTree();
      playerNotesRenderTabs();
      playerNotesRenderDetails();
    }

    function playerNotesRevealNotePath(note) {
      const foldersById = new Map((playerNotesStore?.folders || []).map((folder) => [folder.id, folder]));
      const visited = new Set();
      let folderId = note?.folderId || "";
      let changed = false;
      while (folderId && !visited.has(folderId)) {
        visited.add(folderId);
        if (playerNotesCollapsedFolders.delete(folderId)) changed = true;
        folderId = foldersById.get(folderId)?.parentId || "";
      }
      return changed;
    }

    function playerNotesSetActive(id) {
      const note = playerNotesStore?.notes?.find((entry) => entry.id === id);
      if (!note) return;
      playerNotesActiveId = note.id;
      playerNotesBrowseMode = false;
      playerNotesCloseLinkForm();
      notesMainFolderForm?.setAttribute("hidden", "");
      if (notesMainFolderName) notesMainFolderName.value = "";
      const openedNewTab = !playerNotesOpenIds.includes(note.id);
      const revealedPath = playerNotesRevealNotePath(note);
      if (openedNewTab) playerNotesOpenIds.push(note.id);
      if (openedNewTab) playerNotesRenderTabs();
      if (revealedPath) playerNotesRenderFolderTree();
      else playerNotesRenderActiveSelection();
      playerNotesRenderCategoryBrowser();
      playerNotesRenderDetails();
    }

    function playerNotesCreate(templateKey = "session", targetFolderId = playerNotesFolderFilter || playerNotesStore?.folders?.[0]?.id || "", categoryOverride = "") {
      const requestedCategory = PLAYER_NOTES_CATEGORIES.includes(categoryOverride) ? categoryOverride : "";
      const template = PLAYER_NOTE_TEMPLATES[templateKey] || {
        title: playerNotesCategoryLabel(requestedCategory) || t("notes.newNote"),
        category: requestedCategory || "session",
        body: ""
      };
      const category = requestedCategory || template.category;
      const now = playerNotesNow();
      const note = playerNotesNormalizeNote({
        id: playerNotesNewId(),
        title: template.title,
        category,
        folderId: targetFolderId,
        body: template.body,
        tags: [category],
        createdAt: now,
        updatedAt: now
      });
      playerNotesStore.notes.unshift(note);
      playerNotesFilter = "all";
      playerNotesFolderFilter = targetFolderId;
      playerNotesSearch = "";
      if (notesSearchInput) notesSearchInput.value = "";
      playerNotesActiveId = note.id;
      playerNotesRevealNotePath(note);
      playerNotesBrowseMode = false;
      playerNotesOpenIds = [...new Set([note.id, ...playerNotesOpenIds])].slice(0, 12);
      playerNotesSaveStore();
      playerNotesRender();
      if (notesEditorStatus) notesEditorStatus.textContent = t("notes.noteCreated");
    }

    function playerNotesCreateForCategory(category) {
      if (!PLAYER_NOTES_CATEGORIES.includes(category) || !playerNotesStore) return;
      const folderId = playerNotesEnsureCategoryMainFolder(category);
      playerNotesCreate(PLAYER_NOTE_CATEGORY_TEMPLATES[category] || "", folderId, category);
    }

    function playerNotesCreateFromCurrentContext() {
      if (PLAYER_NOTES_CATEGORIES.includes(playerNotesFilter) && !playerNotesFolderFilter) {
        playerNotesCreateForCategory(playerNotesFilter);
        return;
      }
      const folderId = playerNotesFolderFilter || playerNotesStore?.folders?.[0]?.id || "";
      const category = playerNotesCategoryForFolder(folderId);
      if (category) playerNotesCreate(PLAYER_NOTE_CATEGORY_TEMPLATES[category] || "", folderId, category);
      else playerNotesCreate("session", folderId);
    }

    function playerNotesAssignMainFolder(value) {
      const note = playerNotesActiveNote();
      if (!note || !playerNotesStore) return;
      const rawValue = String(value || "");
      let folderId = "";
      let category = note.category;
      if (rawValue.startsWith("category:")) {
        const requestedCategory = rawValue.slice("category:".length);
        if (!PLAYER_NOTES_CATEGORIES.includes(requestedCategory)) return;
        category = requestedCategory;
        folderId = playerNotesEnsureCategoryMainFolder(requestedCategory);
      } else if (rawValue.startsWith("folder:")) {
        const requestedFolder = playerNotesStore.folders.find((folder) => !folder.parentId && folder.id === rawValue.slice("folder:".length));
        if (!requestedFolder) return;
        folderId = requestedFolder.id;
      }
      note.folderId = folderId;
      playerNotesSetNoteCategory(note, category);
      playerNotesFolderFilter = "";
      playerNotesFilter = "all";
      playerNotesBrowseMode = false;
      playerNotesCollapsedFolders.delete(folderId);
      playerNotesPersist(note, { share: true });
      playerNotesSaveStore();
      playerNotesRenderCategories();
      playerNotesRenderFolderTree();
      playerNotesRenderDetails();
    }

    function playerNotesCreateMainFolder(rawName = notesMainFolderName?.value) {
      const note = playerNotesActiveNote();
      const name = String(rawName || "").trim().slice(0, 80);
      if (!note || !name || !playerNotesStore) return false;
      let folder = playerNotesStore.folders.find((entry) => !entry.parentId && !entry.category && entry.name.toLowerCase() === name.toLowerCase());
      if (!folder) {
        folder = { id: playerNotesNewId("folder"), name, parentId: "", category: "" };
        playerNotesStore.folders.push(folder);
      }
      note.folderId = folder.id;
      playerNotesFolderFilter = "";
      playerNotesFilter = "all";
      playerNotesBrowseMode = false;
      playerNotesCollapsedFolders.delete(folder.id);
      notesMainFolderForm?.setAttribute("hidden", "");
      if (notesMainFolderName) notesMainFolderName.value = "";
      playerNotesPersist(note, { share: true });
      playerNotesSaveStore();
      playerNotesRenderFolderTree();
      playerNotesRenderDetails();
      if (notesEditorStatus) notesEditorStatus.textContent = t("notes.mainFolderCreated");
      return true;
    }

    function playerNotesDuplicate() {
      const source = playerNotesActiveNote();
      if (!source) return;
      const note = playerNotesNormalizeNote({
        ...source,
        id: playerNotesNewId(),
        title: t("notes.duplicateTitle", { title: source.title }),
        shared: false,
        sharedBy: null,
        createdAt: playerNotesNow(),
        updatedAt: playerNotesNow()
      });
      playerNotesStore.notes.unshift(note);
      playerNotesActiveId = note.id;
      playerNotesBrowseMode = false;
      playerNotesOpenIds = [...new Set([note.id, ...playerNotesOpenIds])].slice(0, 12);
      playerNotesSaveStore();
      playerNotesRender();
    }

    function playerNotesDeleteNote(noteId = playerNotesActiveId) {
      const note = playerNotesStore?.notes?.find((entry) => entry.id === noteId);
      if (!note || !window.confirm(`${t("notes.delete")} "${note.title}"?`)) return;
      if (note.shared) sendLiveSheetMessage({ type: "player:note:unshare", noteId: note.id });
      playerNotesStore.notes = playerNotesStore.notes.filter((entry) => entry.id !== note.id);
      playerNotesOpenIds = playerNotesOpenIds.filter((id) => id !== note.id);
      if (!playerNotesOpenIds.length && playerNotesStore.notes.length) playerNotesOpenIds = [playerNotesStore.notes[0].id];
      if (playerNotesActiveId === note.id) playerNotesActiveId = playerNotesOpenIds[0] || "";
      playerNotesSaveStore();
      playerNotesRender();
      if (notesEditorStatus) notesEditorStatus.textContent = t("notes.deleted");
    }

    function playerNotesDelete() {
      playerNotesDeleteNote(playerNotesActiveId);
    }

    function playerNotesDeleteFolder(folderId) {
      const folder = playerNotesStore?.folders?.find((entry) => entry.id === folderId);
      if (!folder || !window.confirm(t("notes.deleteFolderConfirm", { name: playerNotesFolderDisplayName(folder) }))) return;
      const parentId = folder.parentId || "";
      playerNotesStore.notes.forEach((note) => {
        if (note.folderId === folder.id) note.folderId = parentId;
      });
      playerNotesStore.folders.forEach((entry) => {
        if (entry.parentId === folder.id) entry.parentId = parentId;
      });
      playerNotesStore.folders = playerNotesStore.folders.filter((entry) => entry.id !== folder.id);
      playerNotesCollapsedFolders.delete(folder.id);
      if (playerNotesFolderFilter === folder.id) playerNotesFolderFilter = parentId;
      playerNotesSaveStore();
      playerNotesRender();
      if (notesEditorStatus) notesEditorStatus.textContent = t("notes.deleted");
    }

    function playerNotesToggleArchive() {
      const note = playerNotesActiveNote();
      if (!note) return;
      note.archived = !note.archived;
      playerNotesPersist(note);
      playerNotesRender();
      if (notesEditorStatus) notesEditorStatus.textContent = t(note.archived ? "notes.archived" : "notes.unarchived");
    }

    function playerNotesExport() {
      const note = playerNotesActiveNote();
      if (!note) return;
      const exportedBody = String(note.body || "").replace(/!\[\[attachment:([^|\]]+)(?:\|([^\]]+))?\]\]/g, (token, id, alias) => {
        const attachment = playerNotesStore?.attachments?.find((entry) => entry.id === id);
        return attachment ? `![${alias || attachment.name || "image"}](${attachment.dataUrl})` : token;
      });
      const markdown = [
        `# ${note.title}`,
        "",
        exportedBody,
        "",
        note.tags.length ? `Tags: ${note.tags.map((tag) => `#${tag}`).join(" ")}` : "",
        note.tasks.length ? `\n## Tasks\n${note.tasks.map((task) => `- [${task.completed ? "x" : " "}] ${task.text}`).join("\n")}` : ""
      ].filter(Boolean).join("\n");
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${note.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "note"}.md`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      if (notesEditorStatus) notesEditorStatus.textContent = t("notes.exported");
    }

    function playerNotesInsertRichNode(node, sourceRange = playerNotesEditorSelectionRange()) {
      if (!node || !notesBodyInput) return false;
      notesBodyInput.focus();
      const range = sourceRange?.cloneRange?.() || document.createRange();
      if (!sourceRange) {
        range.selectNodeContents(notesBodyInput);
        range.collapse(false);
      }
      range.deleteContents();
      range.insertNode(node);
      playerNotesPlaceCaretAfter(node);
      playerNotesSyncRichEditor();
      return true;
    }

    function playerNotesWrapRichSelection(tagName, className = "") {
      const range = playerNotesEditorSelectionRange();
      if (!range) return false;
      const element = document.createElement(tagName);
      if (className) element.className = className;
      if (range.collapsed) {
        element.appendChild(document.createTextNode("\u200b"));
        range.insertNode(element);
        const caret = document.createRange();
        caret.setStart(element.firstChild, 1);
        caret.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(caret);
      } else {
        element.appendChild(range.extractContents());
        range.insertNode(element);
        const selection = window.getSelection();
        const selected = document.createRange();
        selected.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(selected);
      }
      playerNotesSyncRichEditor();
      return true;
    }

    function playerNotesInsertTaskBlock() {
      const list = document.createElement("ul");
      list.className = "notes-obsidian-list";
      const item = document.createElement("li");
      item.className = "notes-obsidian-task";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.contentEditable = "false";
      const copy = document.createElement("span");
      const range = playerNotesEditorSelectionRange();
      copy.textContent = range && !range.collapsed ? range.toString() : t("notes.task");
      item.append(checkbox, copy);
      list.appendChild(item);
      return playerNotesInsertRichNode(list, range);
    }

    function playerNotesInsertTable() {
      const table = document.createElement("table");
      table.className = "notes-obsidian-table";
      const head = document.createElement("thead");
      const headRow = document.createElement("tr");
      [t("notes.tableColumnOne"), t("notes.tableColumnTwo")].forEach((label) => {
        const cell = document.createElement("th");
        cell.textContent = label;
        headRow.appendChild(cell);
      });
      head.appendChild(headRow);
      const body = document.createElement("tbody");
      const row = document.createElement("tr");
      row.append(document.createElement("td"), document.createElement("td"));
      body.appendChild(row);
      table.append(head, body);
      return playerNotesInsertRichNode(table);
    }

    function playerNotesOpenLinkForm() {
      const range = playerNotesEditorSelectionRange();
      if (!range || !notesLinkForm || !notesLinkUrl) return;
      playerNotesSavedRange = range.cloneRange();
      notesLinkForm.hidden = false;
      notesLinkUrl.value = "https://";
      notesLinkUrl.focus();
      notesLinkUrl.setSelectionRange(notesLinkUrl.value.length, notesLinkUrl.value.length);
    }

    function playerNotesCloseLinkForm() {
      if (notesLinkForm) notesLinkForm.hidden = true;
      playerNotesSavedRange = null;
      if (notesLinkUrl) notesLinkUrl.value = "https://";
    }

    function playerNotesApplyLink() {
      if (!playerNotesSavedRange || !notesLinkUrl) return false;
      let href = String(notesLinkUrl.value || "").trim();
      if (!/^(?:https?:\/\/|mailto:)/i.test(href)) href = `https://${href.replace(/^\/+/, "")}`;
      if (!/^https?:\/\/\S+$/i.test(href) && !/^mailto:[^\s@]+@[^\s@]+$/i.test(href)) return false;
      const range = playerNotesSavedRange.cloneRange();
      const anchor = document.createElement("a");
      anchor.className = "notes-obsidian-link";
      anchor.href = href;
      anchor.textContent = range.collapsed ? t("notes.linkLabel") : range.toString();
      range.deleteContents();
      range.insertNode(anchor);
      playerNotesCloseLinkForm();
      playerNotesPlaceCaretAfter(anchor);
      playerNotesSyncRichEditor();
      return true;
    }

    function playerNotesInsert(command) {
      const note = playerNotesActiveNote();
      if (!note || !notesBodyInput) return;
      notesBodyInput.focus();
      if (["undo", "redo"].includes(command)) {
        document.execCommand(command);
        queueMicrotask(() => playerNotesSyncRichEditor());
        return;
      }
      if (command === "image") {
        playerNotesInsertImage(playerNotesEditorSelectionRange()?.cloneRange?.() || null);
        return;
      }
      if (command === "link") {
        playerNotesOpenLinkForm();
        return;
      }
      if (command === "table") {
        playerNotesInsertTable();
        return;
      }
      if (command === "task") {
        playerNotesInsertTaskBlock();
        return;
      }
      if (command === "code") {
        playerNotesWrapRichSelection("code", "notes-obsidian-inline-code");
        return;
      }
      if (command === "highlight") {
        playerNotesWrapRichSelection("mark", "notes-obsidian-inline-highlight");
        return;
      }
      const nativeCommands = {
        bold: ["bold"],
        italic: ["italic"],
        underline: ["underline"],
        strike: ["strikeThrough"],
        heading: ["formatBlock", "h2"],
        bullet: ["insertUnorderedList"],
        numbered: ["insertOrderedList"],
        quote: ["formatBlock", "blockquote"]
      };
      const [nativeCommand, value] = nativeCommands[command] || [];
      if (!nativeCommand) return;
      document.execCommand(nativeCommand, false, value);
      playerNotesSyncRichEditor();
    }

    function playerNotesReadImage(file) {
      return new Promise((resolve, reject) => {
        if (!file || !/^image\/(?:png|jpeg|webp|gif)$/i.test(file.type || "")) {
          reject(new Error(t("notes.imageUnsupported")));
          return;
        }
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
          try {
            let width = image.naturalWidth || image.width;
            let height = image.naturalHeight || image.height;
            const scale = Math.min(1, 960 / Math.max(width, height));
            width = Math.max(1, Math.round(width * scale));
            height = Math.max(1, Math.round(height * scale));
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d", { alpha: false });
            let dataUrl = "";
            for (let attempt = 0; attempt < 6; attempt += 1) {
              canvas.width = width;
              canvas.height = height;
              context.fillStyle = "#efe1bd";
              context.fillRect(0, 0, width, height);
              context.drawImage(image, 0, 0, width, height);
              dataUrl = canvas.toDataURL("image/webp", Math.max(0.48, 0.82 - attempt * 0.07));
              if (dataUrl.length <= 240000) break;
              width = Math.max(240, Math.round(width * 0.78));
              height = Math.max(180, Math.round(height * 0.78));
            }
            URL.revokeObjectURL(url);
            if (!dataUrl || dataUrl.length > 240000) reject(new Error(t("notes.imageTooLarge")));
            else resolve(dataUrl);
          } catch (error) {
            URL.revokeObjectURL(url);
            reject(error);
          }
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error(t("notes.imageUnsupported")));
        };
        image.src = url;
      });
    }

    async function playerNotesInsertImageFiles(files, sourceRange = playerNotesEditorSelectionRange()?.cloneRange?.() || null) {
      const note = playerNotesActiveNote();
      if (!note || !notesBodyInput || !playerNotesStore) return;
      const sourceFiles = [...(files || [])].filter((file) => /^image\/(?:png|jpeg|webp|gif)$/i.test(file?.type || "")).slice(0, 6);
      if (!sourceFiles.length) return;
      const pendingAttachments = [];
      const tokens = [];
      let attachmentBytes = (playerNotesStore.attachments || []).reduce((total, attachment) => total + String(attachment.dataUrl || "").length, 0);
      let failureMessage = "";
      for (const file of sourceFiles) {
        try {
          const dataUrl = await playerNotesReadImage(file);
          if ((playerNotesStore.attachments || []).length + pendingAttachments.length >= 32 || attachmentBytes + dataUrl.length > 4200000) {
            failureMessage = t("notes.imageTooLarge");
            break;
          }
          const attachment = {
            id: playerNotesNewId("attachment"),
            name: String(file.name || t("notes.pastedImageName")).replace(/[\r\n|\]]/g, " ").trim().slice(0, 120) || t("notes.pastedImageName"),
            dataUrl
          };
          pendingAttachments.push(attachment);
          tokens.push(`![[attachment:${attachment.id}|${attachment.name}]]`);
          attachmentBytes += dataUrl.length;
        } catch (error) {
          failureMessage = error?.message || t("notes.imageUnsupported");
        }
      }
      if (!tokens.length) {
        if (notesEditorStatus) notesEditorStatus.textContent = failureMessage || t("notes.imageUnsupported");
        return;
      }
      if (playerNotesRichEditorMarkdown().length + tokens.join("\n").length > 24000) {
        if (notesEditorStatus) notesEditorStatus.textContent = t("notes.imageTooLarge");
        return;
      }
      playerNotesStore.attachments = [...(playerNotesStore.attachments || []), ...pendingAttachments];
      const group = document.createElement("div");
      group.className = "notes-rich-image-group";
      pendingAttachments.forEach((attachment, index) => {
        const image = document.createElement("img");
        image.className = "notes-obsidian-image";
        image.src = attachment.dataUrl;
        image.alt = attachment.name;
        image.dataset.markdownToken = `![[attachment:${attachment.id}|${attachment.name}]]`;
        image.contentEditable = "false";
        image.draggable = false;
        group.appendChild(image);
        if (index < pendingAttachments.length - 1) group.appendChild(document.createElement("br"));
      });
      const safeRange = sourceRange && notesBodyInput.contains(sourceRange.commonAncestorContainer) ? sourceRange : null;
      playerNotesInsertRichNode(group, safeRange);
      if (notesEditorStatus) notesEditorStatus.textContent = failureMessage || t("notes.imageAdded");
    }

    function playerNotesInsertImage(sourceRange = playerNotesEditorSelectionRange()?.cloneRange?.() || null) {
      const note = playerNotesActiveNote();
      if (!note || !notesBodyInput || !playerNotesStore) return;
      const picker = document.createElement("input");
      picker.type = "file";
      picker.accept = "image/png,image/jpeg,image/webp,image/gif";
      picker.addEventListener("change", () => {
        const file = picker.files?.[0];
        if (!file) return;
        playerNotesInsertImageFiles([file], sourceRange);
      }, { once: true });
      picker.click();
    }

    function playerNotesAddTag(rawTag = notesTagInput?.value) {
      const note = playerNotesActiveNote();
      const tag = String(rawTag || "").trim().toLowerCase().replace(/^#/, "").slice(0, 32);
      if (!note || !tag) return;
      const existing = playerNotesTagDefinition(tag);
      if (!existing) {
        playerNotesStore.tags = [...(playerNotesStore.tags || []), {
          id: playerNotesNewId("tag"),
          name: tag,
          color: playerNotesTagColor
        }].slice(0, 96);
      }
      playerNotesSelectedTagName = tag;
      note.tags = note.tags.includes(tag) ? note.tags : [...note.tags, tag].slice(0, 16);
      if (notesTagInput) notesTagInput.value = "";
      playerNotesSaveStore();
      playerNotesUpdate({ tags: note.tags });
    }

    function playerNotesToggleTag(name) {
      const note = playerNotesActiveNote();
      const tag = String(name || "").trim().toLowerCase();
      if (!note || !tag || !playerNotesTagDefinition(tag)) return;
      playerNotesSelectedTagName = tag;
      note.tags = note.tags.includes(tag)
        ? note.tags.filter((entry) => entry !== tag)
        : [...note.tags, tag].slice(0, 16);
      playerNotesUpdate({ tags: note.tags });
    }

    function playerNotesSetTagColor(color) {
      if (!PLAYER_NOTE_TAG_COLORS.includes(color)) return;
      if (playerNotesSelectedTagName) {
        const tag = playerNotesTagDefinition(playerNotesSelectedTagName);
        if (tag) {
          tag.color = color;
          playerNotesSaveStore();
          playerNotesRenderDetails();
          return;
        }
      }
      playerNotesTagColor = color;
      playerNotesRenderTagColors();
    }

    function playerNotesAddTask(rawText = notesTaskInput?.value) {
      const note = playerNotesActiveNote();
      const text = String(rawText || "").trim().slice(0, 240);
      if (!note || !text) return;
      note.tasks = [...note.tasks, { id: playerNotesNewId("task"), text, completed: false, reminderAt: "" }].slice(0, 48);
      if (notesTaskInput) notesTaskInput.value = "";
      playerNotesUpdate({ tasks: note.tasks });
    }

    function playerNotesCloseTreeContextMenu() {
      if (!notesTreeContextMenu) return;
      notesTreeContextMenu.hidden = true;
      notesTreeContextActions?.removeAttribute("hidden");
      notesTreeFolderForm?.setAttribute("hidden", "");
      if (notesTreeFolderName) notesTreeFolderName.value = "";
    }

    function playerNotesPositionTreeContextMenu(clientX, clientY) {
      if (!notesTreeContextMenu) return;
      notesTreeContextMenu.style.left = "0px";
      notesTreeContextMenu.style.top = "0px";
      const margin = 8;
      const left = Math.max(margin, Math.min(Number(clientX) || margin, window.innerWidth - notesTreeContextMenu.offsetWidth - margin));
      const top = Math.max(margin, Math.min(Number(clientY) || margin, window.innerHeight - notesTreeContextMenu.offsetHeight - margin));
      notesTreeContextMenu.style.left = `${left}px`;
      notesTreeContextMenu.style.top = `${top}px`;
    }

    function playerNotesOpenTreeContextMenu(clientX, clientY, folderId = "", { folderForm = false, target = { kind: "root", id: "" } } = {}) {
      if (!notesTreeContextMenu) return;
      const safeFolderId = playerNotesStore?.folders?.some((folder) => folder.id === folderId) ? folderId : "";
      const safeTarget = target?.kind === "note" && playerNotesStore?.notes?.some((note) => note.id === target.id)
        ? { kind: "note", id: target.id }
        : target?.kind === "folder" && playerNotesStore?.folders?.some((folder) => folder.id === target.id)
          ? { kind: "folder", id: target.id }
          : { kind: "root", id: "" };
      playerNotesTreeContextFolderId = safeFolderId;
      playerNotesTreeContextTarget = safeTarget;
      if (notesTreeDeleteButton) notesTreeDeleteButton.hidden = safeTarget.kind === "root";
      if (notesTreeDeleteLabel) notesTreeDeleteLabel.textContent = t(safeTarget.kind === "folder" ? "notes.deleteFolder" : "notes.deleteNote");
      notesTreeContextMenu.hidden = false;
      notesTreeContextActions?.toggleAttribute("hidden", folderForm);
      notesTreeFolderForm?.toggleAttribute("hidden", !folderForm);
      playerNotesPositionTreeContextMenu(clientX, clientY);
      if (folderForm) notesTreeFolderName?.focus();
      else notesTreeContextMenu.querySelector("[data-notes-tree-action]")?.focus();
    }

    function playerNotesOpenFolderCreator(folderId, anchor) {
      const rect = anchor?.getBoundingClientRect?.() || notesFolderList?.getBoundingClientRect?.();
      playerNotesOpenTreeContextMenu(rect?.left || 8, rect?.bottom || 8, folderId, { folderForm: true });
    }

    function playerNotesAddFolder(parentId = "", rawName = "") {
      if (!playerNotesStore) return false;
      const name = String(rawName || "").trim().slice(0, 80);
      if (!name) return false;
      const safeParentId = playerNotesStore.folders.some((folder) => folder.id === parentId) ? String(parentId) : "";
      const folder = { id: playerNotesNewId("folder"), name, parentId: safeParentId, category: "" };
      playerNotesStore.folders.push(folder);
      playerNotesFolderFilter = folder.id;
      playerNotesFilter = "all";
      playerNotesSearch = "";
      if (notesSearchInput) notesSearchInput.value = "";
      playerNotesCollapsedFolders.delete(folder.parentId);
      playerNotesSaveStore();
      playerNotesRender();
      return true;
    }

    function playerNotesFolderContains(folderId, possibleDescendantId) {
      const foldersById = new Map((playerNotesStore?.folders || []).map((folder) => [folder.id, folder]));
      const visited = new Set();
      let currentId = possibleDescendantId;
      while (currentId && !visited.has(currentId)) {
        if (currentId === folderId) return true;
        visited.add(currentId);
        currentId = foldersById.get(currentId)?.parentId || "";
      }
      return false;
    }

    function playerNotesDropTarget(eventTarget) {
      const directFolder = eventTarget?.closest?.("[data-notes-folder]");
      if (directFolder) return { folderId: directFolder.dataset.notesFolder || "", element: directFolder };
      const folderNode = eventTarget?.closest?.("[data-notes-folder-node]");
      if (folderNode) return { folderId: folderNode.dataset.notesFolderNode || "", element: folderNode.querySelector(":scope > .notes-folder-row .notes-folder-button") || folderNode };
      return { folderId: "", element: notesFolderList };
    }

    function playerNotesCanDrop(payload, targetFolderId) {
      if (!payload?.id) return false;
      if (payload.kind === "note") return Boolean(playerNotesStore?.notes?.some((note) => note.id === payload.id));
      const draggedFolder = playerNotesStore?.folders?.find((folder) => folder.id === payload.id);
      if (payload.kind !== "folder" || !draggedFolder) return false;
      if (draggedFolder.category && targetFolderId) return false;
      return payload.id !== targetFolderId && !playerNotesFolderContains(payload.id, targetFolderId);
    }

    function playerNotesClearDropTarget() {
      notesFolderList?.classList.remove("is-drop-target", "is-drop-root-target");
      notesFolderList?.querySelectorAll(".is-drop-target").forEach((element) => element.classList.remove("is-drop-target"));
    }

    function playerNotesMoveTreeEntry(payload, targetFolderId) {
      if (!playerNotesCanDrop(payload, targetFolderId)) return;
      if (payload.kind === "note") {
        const note = playerNotesStore.notes.find((entry) => entry.id === payload.id);
        if (!note || note.folderId === targetFolderId) return;
        note.folderId = targetFolderId;
        const targetCategory = playerNotesCategoryForFolder(targetFolderId);
        if (targetCategory) playerNotesSetNoteCategory(note, targetCategory);
        playerNotesCollapsedFolders.delete(targetFolderId);
        playerNotesPersist(note, { share: true });
        playerNotesRenderCategories();
        playerNotesRenderFolderTree();
        playerNotesRenderDetails();
        return;
      }
      const folder = playerNotesStore.folders.find((entry) => entry.id === payload.id);
      if (!folder || folder.parentId === targetFolderId) return;
      folder.parentId = targetFolderId;
      const targetCategory = playerNotesCategoryForFolder(targetFolderId);
      if (targetCategory) {
        playerNotesStore.notes.forEach((note) => {
          if (!playerNotesFolderContains(folder.id, note.folderId)) return;
          playerNotesSetNoteCategory(note, targetCategory);
          note.updatedAt = playerNotesNow();
          if (note.shared) playerNotesScheduleShare(note);
        });
      }
      playerNotesCollapsedFolders.delete(targetFolderId);
      playerNotesSaveStore();
      playerNotesRenderCategories();
      playerNotesRenderFolderTree();
    }

    function playerNotesToggleShare() {
      const note = playerNotesActiveNote();
      if (!note || !notesShareToggle) return;
      if (notesShareToggle.checked) {
        if (!liveSheetClientSocket || liveSheetClientSocket.readyState !== WebSocket.OPEN) {
          notesShareToggle.checked = false;
          if (notesShareStatus) {
            notesShareStatus.dataset.tone = "error";
            notesShareStatus.textContent = t("notes.shareRequiresConnection");
          }
          return;
        }
        note.shared = true;
        note.sharedBy = { playerId: liveSheetPlayerId(), playerName: defaultLiveSheetPlayerName() };
        playerNotesPersist(note);
        playerNotesScheduleShare(note);
      } else {
        note.shared = false;
        note.sharedBy = null;
        sendLiveSheetMessage({ type: "player:note:unshare", noteId: note.id });
        playerNotesPersist(note, { share: false });
      }
      playerNotesRenderDetails();
      if (notesEditorStatus) notesEditorStatus.textContent = t(note.shared ? "notes.shared" : "notes.unshared");
    }

    function playerNotesApplyTemplate(templateKey) {
      const note = playerNotesActiveNote();
      const template = PLAYER_NOTE_TEMPLATES[templateKey];
      if (!note || !template) return;
      note.title = template.title;
      note.category = template.category;
      note.folderId = playerNotesEnsureCategoryMainFolder(template.category);
      note.body = template.body;
      note.tags = [template.category];
      note.tasks = [];
      playerNotesUpdate(note);
      if (notesEditorStatus) notesEditorStatus.textContent = t("notes.templateApplied");
    }

    function playerNotesHandleIncoming(notePayload) {
      const incoming = playerNotesNormalizeNote(notePayload);
      if (!incoming?.id) return;
      if (!playerNotesStore) playerNotesLoadForActiveSlot();
      incoming.tags.forEach((name) => {
        if (!playerNotesTagDefinition(name)) {
          playerNotesStore.tags.push({ id: playerNotesNewId("tag"), name, color: PLAYER_NOTE_TAG_COLORS[playerNotesStore.tags.length % PLAYER_NOTE_TAG_COLORS.length] });
        }
      });
      const existingIndex = playerNotesStore?.notes?.findIndex((note) => note.id === incoming.id) ?? -1;
      if (existingIndex >= 0) playerNotesStore.notes.splice(existingIndex, 1, incoming);
      else playerNotesStore?.notes?.unshift(incoming);
      if (!playerNotesOpenIds.includes(incoming.id)) playerNotesOpenIds.push(incoming.id);
      playerNotesSaveStore();
      if (!playerNotesActiveId) playerNotesActiveId = incoming.id;
      playerNotesRender();
      if (notesShareStatus && incoming.id === playerNotesActiveId) notesShareStatus.textContent = t("notes.sharedBy", { name: incoming.sharedBy?.playerName || "Jugador" });
    }

    function playerNotesHandleSharedState(notePayloads) {
      const incomingNotes = (Array.isArray(notePayloads) ? notePayloads : []).map(playerNotesNormalizeNote).filter(Boolean);
      const incomingIds = new Set(incomingNotes.map((note) => note.id));
      if (!playerNotesStore) playerNotesLoadForActiveSlot();
      incomingNotes.forEach((note) => note.tags.forEach((name) => {
        if (!playerNotesTagDefinition(name)) playerNotesStore.tags.push({ id: playerNotesNewId("tag"), name, color: PLAYER_NOTE_TAG_COLORS[playerNotesStore.tags.length % PLAYER_NOTE_TAG_COLORS.length] });
      }));
      playerNotesStore.notes = playerNotesStore.notes.filter((note) => !note.shared || incomingIds.has(note.id));
      incomingNotes.forEach((note) => {
        const index = playerNotesStore.notes.findIndex((entry) => entry.id === note.id);
        if (index >= 0) playerNotesStore.notes.splice(index, 1, note);
        else playerNotesStore.notes.unshift(note);
      });
      playerNotesSaveStore();
      if (!playerNotesActiveId && incomingNotes[0]) playerNotesActiveId = incomingNotes[0].id;
      if (!notesWorkspace?.hidden) playerNotesRender();
    }

    function playerNotesHandleIncomingRemove(noteId) {
      const id = String(noteId || "");
      const note = playerNotesStore?.notes?.find((entry) => entry.id === id);
      if (!note || !note.shared) return;
      playerNotesStore.notes = playerNotesStore.notes.filter((entry) => entry.id !== id);
      playerNotesOpenIds = playerNotesOpenIds.filter((entry) => entry !== id);
      if (playerNotesActiveId === id) playerNotesActiveId = playerNotesOpenIds[0] || playerNotesStore.notes[0]?.id || "";
      playerNotesSaveStore();
      playerNotesRender();
    }

    function playerNotesInit() {
      if (playerNotesInitialized) return;
      playerNotesInitialized = true;
      playerNotesLoadForActiveSlot();
      sidebarNotesButton?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeSidebarMenu();
        if (typeof closeTurnActionsPanel === "function") closeTurnActionsPanel();
        setSidebarView("notes");
      });
      notesNewButton?.addEventListener("click", playerNotesCreateFromCurrentContext);
      notesNewTabButton?.addEventListener("click", playerNotesCreateFromCurrentContext);
      notesBackButton?.addEventListener("click", () => {
        if (typeof closeTurnActionsPanel === "function") closeTurnActionsPanel();
        setSidebarView("sheet");
      });
      notesCategoryList?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-notes-category]");
        if (!button) return;
        playerNotesFilter = button.dataset.notesCategory || "all";
        playerNotesFolderFilter = "";
        playerNotesBrowseMode = PLAYER_NOTE_BROWSE_CATEGORIES.includes(playerNotesFilter);
        playerNotesRender();
      });
      notesFolderList?.addEventListener("click", (event) => {
        const noteButton = event.target.closest("[data-notes-id]");
        if (noteButton) {
          playerNotesSetActive(noteButton.dataset.notesId);
          return;
        }
        const toggle = event.target.closest("[data-notes-folder-toggle]");
        if (toggle) {
          const folderId = toggle.dataset.notesFolderToggle || "";
          if (playerNotesCollapsedFolders.has(folderId)) playerNotesCollapsedFolders.delete(folderId);
          else playerNotesCollapsedFolders.add(folderId);
          playerNotesRenderFolderTree();
          return;
        }
        const childButton = event.target.closest("[data-notes-add-child-folder]");
        if (childButton) {
          playerNotesOpenFolderCreator(childButton.dataset.notesAddChildFolder || "", childButton);
          return;
        }
        const button = event.target.closest("[data-notes-folder]");
        if (!button) return;
        playerNotesFolderFilter = button.dataset.notesFolder || "";
        playerNotesFilter = "all";
        playerNotesRender();
      });
      notesFolderList?.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        const noteId = event.target.closest("[data-notes-note-node]")?.dataset.notesNoteNode || "";
        const note = playerNotesStore?.notes?.find((entry) => entry.id === noteId);
        const folderId = event.target.closest("[data-notes-folder-node]")?.dataset.notesFolderNode || "";
        const target = note
          ? { kind: "note", id: note.id }
          : folderId
            ? { kind: "folder", id: folderId }
            : { kind: "root", id: "" };
        playerNotesOpenTreeContextMenu(event.clientX, event.clientY, note?.folderId || folderId, { target });
      });
      notesFolderList?.addEventListener("dragstart", (event) => {
        const noteNode = event.target.closest("[data-notes-note-node]");
        const folderNode = event.target.closest("[data-notes-folder-node]");
        const payload = noteNode
          ? { kind: "note", id: noteNode.dataset.notesNoteNode || "" }
          : folderNode
            ? { kind: "folder", id: folderNode.dataset.notesFolderNode || "" }
            : null;
        if (!payload?.id || !event.dataTransfer) {
          event.preventDefault();
          return;
        }
        playerNotesCloseTreeContextMenu();
        playerNotesDragPayload = payload;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-dnd-player-notes-tree", JSON.stringify(payload));
        event.dataTransfer.setData("text/plain", payload.id);
        (noteNode || folderNode)?.classList.add("is-dragging");
      });
      notesFolderList?.addEventListener("dragover", (event) => {
        const target = playerNotesDropTarget(event.target);
        if (!playerNotesCanDrop(playerNotesDragPayload, target.folderId)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        playerNotesClearDropTarget();
        target.element?.classList.add("is-drop-target");
        if (!target.folderId) notesFolderList.classList.add("is-drop-root-target");
      });
      notesFolderList?.addEventListener("drop", (event) => {
        const target = playerNotesDropTarget(event.target);
        let payload = playerNotesDragPayload;
        if (!payload && event.dataTransfer) {
          try {
            payload = JSON.parse(event.dataTransfer.getData("application/x-dnd-player-notes-tree") || "null");
          } catch (_error) {
            payload = null;
          }
        }
        if (!playerNotesCanDrop(payload, target.folderId)) return;
        event.preventDefault();
        event.stopPropagation();
        playerNotesMoveTreeEntry(payload, target.folderId);
        playerNotesDragPayload = null;
        playerNotesClearDropTarget();
      });
      notesFolderList?.addEventListener("dragend", () => {
        playerNotesDragPayload = null;
        notesFolderList.querySelectorAll(".is-dragging").forEach((element) => element.classList.remove("is-dragging"));
        playerNotesClearDropTarget();
      });
      notesFolderList?.addEventListener("scroll", playerNotesCloseTreeContextMenu, { passive: true });
      notesTreeContextActions?.addEventListener("click", (event) => {
        const action = event.target.closest("[data-notes-tree-action]")?.dataset.notesTreeAction;
        if (action === "note") {
          const targetFolderId = playerNotesTreeContextFolderId;
          playerNotesCloseTreeContextMenu();
          const category = playerNotesCategoryForFolder(targetFolderId);
          playerNotesCreate(PLAYER_NOTE_CATEGORY_TEMPLATES[category] || (category ? "" : "session"), targetFolderId, category);
        } else if (action === "folder") {
          notesTreeContextActions.hidden = true;
          notesTreeFolderForm.hidden = false;
          const left = Number.parseFloat(notesTreeContextMenu.style.left) || 8;
          const top = Number.parseFloat(notesTreeContextMenu.style.top) || 8;
          playerNotesPositionTreeContextMenu(left, top);
          notesTreeFolderName?.focus();
        } else if (action === "delete") {
          const target = playerNotesTreeContextTarget;
          playerNotesCloseTreeContextMenu();
          if (target.kind === "note") playerNotesDeleteNote(target.id);
          else if (target.kind === "folder") playerNotesDeleteFolder(target.id);
        }
      });
      notesTreeFolderForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (playerNotesAddFolder(playerNotesTreeContextFolderId, notesTreeFolderName?.value)) playerNotesCloseTreeContextMenu();
      });
      notesTreeFolderForm?.querySelector("[data-notes-tree-cancel]")?.addEventListener("click", playerNotesCloseTreeContextMenu);
      document.addEventListener("pointerdown", (event) => {
        if (!notesTreeContextMenu?.hidden && !notesTreeContextMenu.contains(event.target)) playerNotesCloseTreeContextMenu();
      });
      notesCategoryBrowserList?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-notes-browser-id]");
        if (button) playerNotesSetActive(button.dataset.notesBrowserId);
      });
      notesCategoryNewButton?.addEventListener("click", () => {
        if (PLAYER_NOTES_CATEGORIES.includes(playerNotesFilter)) playerNotesCreateForCategory(playerNotesFilter);
      });
      notesTabs?.addEventListener("click", (event) => {
        const closeId = event.target.closest("[data-notes-close-id]")?.dataset.notesCloseId;
        if (closeId) {
          event.stopPropagation();
          playerNotesOpenIds = playerNotesOpenIds.filter((id) => id !== closeId);
          if (playerNotesActiveId === closeId) playerNotesActiveId = playerNotesOpenIds[0] || playerNotesStore?.notes?.[0]?.id || "";
          playerNotesRender();
          return;
        }
        const tab = event.target.closest("[data-notes-id]");
        if (tab) playerNotesSetActive(tab.dataset.notesId);
      });
      notesSearchInput?.addEventListener("input", () => {
        playerNotesSearch = notesSearchInput.value || "";
        playerNotesRenderFolderTree();
        playerNotesRenderCategoryBrowser();
      });
      notesTitleInput?.addEventListener("input", () => playerNotesUpdate({ title: notesTitleInput.value.slice(0, 160) }, { share: true }));
      notesBodyInput?.addEventListener("input", () => {
        playerNotesApplyTypedMarkdownShortcut();
        playerNotesSyncRichEditor();
      });
      notesBodyInput?.addEventListener("change", (event) => {
        if (event.target.matches?.("input[type='checkbox']")) playerNotesSyncRichEditor();
      });
      notesBodyInput?.addEventListener("paste", (event) => {
        const clipboard = event.clipboardData;
        if (!clipboard) return;
        const itemFiles = [...(clipboard.items || [])]
          .filter((item) => item.kind === "file" && /^image\//i.test(item.type || ""))
          .map((item) => item.getAsFile())
          .filter(Boolean);
        const imageFiles = itemFiles.length
          ? itemFiles
          : [...(clipboard.files || [])].filter((file) => /^image\//i.test(file.type || ""));
        if (imageFiles.length) {
          event.preventDefault();
          playerNotesInsertImageFiles(imageFiles, playerNotesEditorSelectionRange()?.cloneRange?.() || null);
          return;
        }
        const plainText = clipboard.getData("text/plain");
        if (plainText) {
          event.preventDefault();
          document.execCommand("insertText", false, plainText);
        }
      });
      notesStarButton?.addEventListener("click", () => playerNotesUpdate({ pinned: !playerNotesActiveNote()?.pinned }));
      notesPinButton?.addEventListener("click", () => playerNotesUpdate({ pinned: !playerNotesActiveNote()?.pinned }));
      notesArchiveButton?.addEventListener("click", playerNotesToggleArchive);
      notesDuplicateButton?.addEventListener("click", playerNotesDuplicate);
      notesExportButton?.addEventListener("click", playerNotesExport);
      notesDeleteButton?.addEventListener("click", playerNotesDelete);
      notesWorkspace?.querySelectorAll("[data-note-command]").forEach((button) => {
        button.addEventListener("mousedown", (event) => {
          if (event.button === 0) event.preventDefault();
        });
        button.addEventListener("click", () => playerNotesInsert(button.dataset.noteCommand));
      });
      notesLinkForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!playerNotesApplyLink()) notesLinkUrl?.focus();
      });
      notesLinkForm?.querySelector("[data-notes-link-cancel]")?.addEventListener("click", () => {
        playerNotesCloseLinkForm();
        notesBodyInput?.focus();
      });
      notesTagInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          playerNotesAddTag();
        }
      });
      notesAddTagButton?.addEventListener("click", () => notesTagInput?.focus());
      notesTags?.addEventListener("click", (event) => {
        const tag = event.target.closest("[data-notes-remove-tag]")?.dataset.notesRemoveTag;
        if (!tag) {
          const selected = event.target.closest("[data-notes-tag]")?.dataset.notesTag;
          if (selected) playerNotesSelectedTagName = selected;
          playerNotesRenderTagColors();
          return;
        }
        const note = playerNotesActiveNote();
        if (note) playerNotesUpdate({ tags: note.tags.filter((entry) => entry !== tag) });
      });
      notesTagLibrary?.addEventListener("click", (event) => {
        const tag = event.target.closest("[data-notes-tag]")?.dataset.notesTag;
        if (tag) playerNotesToggleTag(tag);
      });
      notesTagColors?.addEventListener("click", (event) => {
        const color = event.target.closest("[data-notes-tag-color]")?.dataset.notesTagColor;
        if (color) playerNotesSetTagColor(color);
      });
      notesLabelColors?.addEventListener("click", (event) => {
        const color = event.target.closest("[data-note-color]")?.dataset.noteColor;
        if (color) playerNotesUpdate({ color });
      });
      notesMainFolderSelect?.addEventListener("change", () => playerNotesAssignMainFolder(notesMainFolderSelect.value));
      notesCreateMainFolderButton?.addEventListener("click", () => {
        notesMainFolderForm?.removeAttribute("hidden");
        notesMainFolderName?.focus();
      });
      notesMainFolderForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        playerNotesCreateMainFolder();
      });
      notesMainFolderForm?.querySelector("[data-notes-main-folder-cancel]")?.addEventListener("click", () => {
        notesMainFolderForm.setAttribute("hidden", "");
        if (notesMainFolderName) notesMainFolderName.value = "";
      });
      notesShareToggle?.addEventListener("change", playerNotesToggleShare);
      notesTemplateList?.addEventListener("click", (event) => {
        const template = event.target.closest("[data-note-template]")?.dataset.noteTemplate;
        if (template) playerNotesApplyTemplate(template);
      });
      notesAddTaskButton?.addEventListener("click", () => playerNotesAddTask());
      notesTaskInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          playerNotesAddTask();
        }
      });
      notesTaskList?.addEventListener("change", (event) => {
        const id = event.target.closest("[data-notes-task-id]")?.dataset.notesTaskId;
        const note = playerNotesActiveNote();
        if (!id || !note) return;
        note.tasks = note.tasks.map((task) => task.id === id ? { ...task, completed: Boolean(event.target.checked) } : task);
        playerNotesUpdate({ tasks: note.tasks });
      });
      notesTaskList?.addEventListener("click", (event) => {
        const id = event.target.closest("[data-notes-remove-task]")?.dataset.notesRemoveTask;
        const note = playerNotesActiveNote();
        if (id && note) playerNotesUpdate({ tasks: note.tasks.filter((task) => task.id !== id) });
      });
      notesTaskInput?.addEventListener("focus", () => notesAddTaskButton?.classList.add("is-ready"));
      notesNotificationsButton?.addEventListener("click", () => {
        const now = Date.now();
        const due = (playerNotesStore?.notes || []).flatMap((note) => note.tasks || [])
          .filter((task) => !task.completed && task.reminderAt && new Date(task.reminderAt).getTime() <= now);
        if (notesEditorStatus) notesEditorStatus.textContent = t("notes.remindersDue", { count: due.length });
      });
      notesHelpButton?.addEventListener("click", () => {
        if (notesEditorStatus) notesEditorStatus.textContent = t("notes.shortcutSummary");
      });
      notesSettingsButton?.addEventListener("click", () => {
        setSidebarMenuOpen(true);
        setAppSettingsMenuOpen(true);
      });
      document.getElementById("notesAddFolderButton")?.addEventListener("click", (event) => playerNotesOpenFolderCreator(playerNotesFolderFilter, event.currentTarget));
      document.addEventListener("keydown", (event) => {
        if (!notesWorkspace || notesWorkspace.hidden) return;
        if (event.key === "Escape" && !notesTreeContextMenu?.hidden) {
          event.preventDefault();
          playerNotesCloseTreeContextMenu();
          return;
        }
        if (event.key === "Escape" && notesLinkForm && !notesLinkForm.hidden) {
          event.preventDefault();
          playerNotesCloseLinkForm();
          notesBodyInput?.focus();
          return;
        }
        if (event.key === "Escape" && notesMainFolderForm && !notesMainFolderForm.hidden) {
          event.preventDefault();
          notesMainFolderForm.hidden = true;
          if (notesMainFolderName) notesMainFolderName.value = "";
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          notesSearchInput?.focus();
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b" && document.activeElement === notesBodyInput) {
          event.preventDefault();
          playerNotesInsert("bold");
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i" && document.activeElement === notesBodyInput) {
          event.preventDefault();
          playerNotesInsert("italic");
        }
        if (event.key === "Escape") setSidebarView("sheet");
      });
      globalThis.dndPlayerNotes = {
        loadForActiveSlot: () => {
          playerNotesLoadForActiveSlot();
          if (!notesWorkspace?.hidden) playerNotesRender();
        },
        clearActiveSlot: () => {
          try { localStorage.removeItem(playerNotesStorageKey()); } catch (_error) { /* Ignore cleanup failures. */ }
          playerNotesLoadForActiveSlot();
          playerNotesRender();
        },
        receiveShared: playerNotesHandleIncoming,
        removeShared: playerNotesHandleIncomingRemove
      };
      playerNotesRender();
    }

    globalThis.dndCharacterSheetNavigation = { setView: setSidebarView };

    function setSidebarMenuOpen(open) {
      const nextOpen = Boolean(open);
      if (sidebarMenuPanel) sidebarMenuPanel.hidden = !nextOpen;
      if (sidebarMenuButton) {
        sidebarMenuButton.setAttribute("aria-expanded", String(nextOpen));
        const label = t(nextOpen ? "sidebar.closeMenu" : "sidebar.openMenu");
        sidebarMenuButton.setAttribute("aria-label", label);
        sidebarMenuButton.setAttribute("title", label);
      }
      appSidebar?.classList.toggle("menu-open", nextOpen);
      setTopControlsMenuOpen(nextOpen);
      setAppSettingsMenuOpen(nextOpen);
    }

    function closeSidebarMenu() {
      setSidebarMenuOpen(false);
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
        closeSidebarMenu();
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
      const [itemsResponse, baseItemsResponse, automationResponse] = await Promise.all([
        fetchLocalResource("../../data/items/items.json"),
        fetchLocalResource("../../data/items/items-base.json"),
        fetchLocalResource("../../data/items/item-automation.json")
      ]);
      return {
        items: itemsResponse,
        baseItems: baseItemsResponse,
        automation: automationResponse
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
      const automationRegistry = globalThis.dndItemAutomationRegistry?.createItemAutomationRegistry?.({
        overlay: itemData?.automation || { schemaVersion: 1, items: [] },
        catalog: { item: items }
      });
      globalThis.dndItemCatalog?.setItemAutomationRegistry?.(automationRegistry);
      const declaredExpectedCount = Number(itemData?.items?._meta?.expectedActiveRecords);
      const expectedCount = Number.isInteger(declaredExpectedCount) && declaredExpectedCount > 0 ? declaredExpectedCount : 2253;
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
        automationCount: automationRegistry?.size || 0,
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
      playerNotesInit();
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
      sidebarMenuButton?.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      sidebarMenuButton?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setSidebarMenuOpen(!isSidebarMenuOpen());
      });
      sidebarMenuClose?.addEventListener("click", () => closeSidebarMenu());
      sidebarSheetButton?.addEventListener("click", () => {
        closeSidebarMenu();
        if (typeof closeTurnActionsPanel === "function") closeTurnActionsPanel();
        setSidebarView("sheet");
        app?.focus?.({ preventScroll: true });
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
          requestAnimationFrame(() => globalThis.dndCombatBoardSurface?.apply?.());
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
        closeSidebarMenu();
        switchSaveSlot(event.target.value)
          .then(() => globalThis.dndPlayerNotes?.loadForActiveSlot?.())
          .catch(console.error);
      });
      [clearFieldsButton, characterReadyButton, turnActionsButton]
        .filter(Boolean)
        .forEach((button) => button.addEventListener("click", () => closeSidebarMenu()));
      longRestButton?.addEventListener("click", longRestSpellResources);
      shortRestButton?.addEventListener("click", shortRestResources);
      combatLongRestButton?.addEventListener("click", longRestSpellResources);
      combatShortRestButton?.addEventListener("click", shortRestResources);
      characterReadyButton?.addEventListener("click", toggleCharacterReady);
      turnActionsButton?.addEventListener("click", () => {
        setSidebarView("combat");
        globalThis.dndRestRuntime?.interrupt?.("initiative");
        openTurnActionsPanel().catch(console.error);
      });
      turnActionsTranslate?.addEventListener("click", () => toggleTurnActionTranslations().catch(console.error));
      turnActionsNewTurn?.addEventListener("click", startNewCombatTurn);
      turnActionsEndTurn?.addEventListener("click", requestEndCombatTurn);
      combatLogClear?.addEventListener("click", clearCombatLog);
      setupCombatBoardResize();
      window.addEventListener("resize", () => {
        applyCombatBoardLayout();
        globalThis.dndCharacterSheetVttSurface?.refreshLayout?.();
      });
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
        if (!isSidebarMenuOpen() || sidebarMenuPanel?.contains(event.target) || sidebarMenuButton?.contains(event.target)) return;
        closeSidebarMenu();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !isSidebarMenuOpen()) return;
        closeSidebarMenu();
        sidebarMenuButton?.focus();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !isAppSettingsMenuOpen()) return;
        setAppSettingsMenuOpen(false);
        appSettingsLauncher?.focus();
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
