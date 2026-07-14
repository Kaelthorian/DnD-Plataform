(function initPlayerI18n(globalScope) {
  "use strict";

  const STORAGE_KEY = "dnd-character-sheet-language-v1";
  const DEFAULT_LANGUAGE = "en";
  const SUPPORTED_LANGUAGES = new Set(["en", "es"]);

  const EN = {
    "app.title": "DnD Character Sheet",
    "release.checking": "Checking latest version...",
    "release.download": "Download",
    "release.check": "Check",
    "release.currentVersion": "Installed: {version}",
    "release.checkingNow": "Checking for updates...",
    "release.available": "Version {version} is available",
    "release.downloadUpdate": "Download update",
    "release.downloading": "Downloading update {percent}%",
    "release.downloaded": "Update ready to install",
    "release.restartInstall": "Restart and install",
    "release.upToDate": "Latest version installed",
    "release.error": "Could not check for updates",
    "release.tryAgain": "Try again",
    "controls.open": "Open controls",
    "settings.open": "Open settings",
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.language.english": "English",
    "settings.language.spanish": "Espa\u00f1ol",
    "settings.dmScreen": "DM screen",
    "settings.connectToDm": "Connect to DM",
    "settings.generateCode": "Generate code",
    "settings.importCharacter": "Import character",
    "settings.checkUpdates": "Check for updates",
    "top.character": "Character",
    "top.clearFields": "Clear fields",
    "top.restControls": "Rest controls",
    "top.longRest": "Long rest",
    "top.longRest.start": "Start long rest",
    "top.longRest.finish": "Finish long rest",
    "top.shortRest": "Short rest",
    "top.shortRest.start": "Start short rest",
    "top.shortRest.finish": "Finish short rest",
    "rest.longBlockedByShort": "Finish the short rest before starting a long rest.",
    "rest.shortBlockedByLong": "Finish the long rest before starting a short rest.",
    "top.characterReady.unlocked": "\ud83d\udd13 Character Ready",
    "top.characterReady.locked": "\ud83d\udd12 Character Ready",
    "top.startCombat": "Start combat",
    "live.title": "Connect to DM",
    "live.subtitle": "Tailscale or local network live sheet sharing",
    "live.host": "DM host / Tailscale IP",
    "live.hostPlaceholder": "100.x.y.z or kael-pc",
    "live.port": "Port",
    "live.sessionToken": "Session token",
    "live.sessionTokenPlaceholder": "Optional code from DM",
    "live.playerName": "Player name",
    "live.playerNamePlaceholder": "Player",
    "live.help": "Use the DM's Tailscale 100.x.y.z IP or MagicDNS name. Do not use a public IP or port forwarding.",
    "live.cancel": "Close",
    "live.connect": "Connect",
    "live.disconnect": "Disconnect",
    "live.connecting": "Connecting...",
    "live.connected": "Connected",
    "live.disconnected": "Disconnected",
    "live.disconnectedFromDm": "Disconnected from DM.",
    "live.synced": "Synced with DM",
    "live.patchUnmatched": "DM edit received, no matching fields",
    "live.enterHost": "Enter the DM host or Tailscale IP.",
    "live.invalidPort": "Invalid port.",
    "live.connectingTo": "Connecting to {url}",
    "live.connectedTo": "Connected to {url}",
    "live.connectedStatus": "Live sheet connected",
    "live.disconnectedStatus": "Live sheet disconnected",
    "live.notConnectedToDm": "You are not connected to the DM.",
    "live.handRaise": "Raise hand",
    "live.handLower": "Lower hand",
    "live.handRaiseAria": "Raise your hand",
    "live.handLowerAria": "Lower your hand",
    "live.handQueueTitle": "Raised hands - speaking order",
    "live.handQueueEmpty": "No hands are raised.",
    "live.handYou": "You",
    "live.handRaisedPosition": "Your hand is raised - position {position}.",
    "live.handRaisedWaiting": "Your hand is raised - waiting for position.",
    "live.handNotRaised": "Your hand is not raised.",
    "live.handLoweredByDm": "The DM lowered your hand.",
    "live.handLoweredSelf": "You lowered your hand.",
    "live.combatRound": "Combat initiative - round {round}",
    "live.combatActiveTurn": "{name}'s turn - round {round}",
    "live.combatRoundEnd": "End of round {round}",
    "live.combatInitiative": "Initiative {initiative}",
    "live.sendFailed": "Could not send the sheet.",
    "live.connectFailed": "Could not connect to the DM.",
    "live.invalidAddress": "Invalid WebSocket address.",
    "common.close": "Close",
    "common.cancel": "Cancel",
    "common.import": "Import",
    "common.add": "Add",
    "common.open": "Open",
    "common.other": "Other",
    "common.cast": "Cast",
    "common.saved": "Saved",
    "common.loadingSheet": "Loading sheet...",
    "common.search": "Search...",
    "alerts.open": "View pending alerts",
    "alerts.pending": "Pending alerts",
    "alerts.none": "No pending alerts.",
    "alerts.noneSummary": "No pending alerts",
    "alerts.summary": "{total} alert(s): {critical} critical, {important} important, {optional} optional",
    "alerts.counts": "{critical} crit / {important} imp / {optional} opt",
    "alerts.critical": "Critical",
    "alerts.important": "Important",
    "alerts.optional": "Optional",
    "alerts.tooManyPreparedSpells": "Too many prepared spells",
    "alerts.preparedSpellLimit": "Prepared {prepared}; your current limit is {limit}.",
    "alerts.reviewSpellbook": "Review spellbook",
    "alerts.reviewProficienciesLanguages": "Review proficiencies/languages",
    "alerts.missingProficienciesLanguages": "Missing proficiencies or languages derived from class, race, and background.",
    "dice.freeTitle": "Free dice",
    "dice.freeSubtitle": "D2, d3, d4, d6, d10, percentile d10, d12, d20, d30, d60, and d100",
    "dice.type": "Die type",
    "dice.remove": "Remove die",
    "dice.add": "Add die",
    "dice.roll": "Roll",
    "dice.log": "Log",
    "dice.selectWithPlus": "Select dice with +.",
    "dice.selectAtLeastOne": "Select at least one die.",
    "dice.invalidCombination": "Could not roll that combination.",
    "dice.maxFree": "Maximum {max} dice per free roll.",
    "dice.dice": "Dice: {label}",
    "dice.rolls": "Rolls {expression}: {rolls} = {subtotal}",
    "dice.total": "Total: {total}",
    "dice.freeRoll": "Free roll: {label}",
    "dice.damage": "damage",
    "dice.noDamageType": "No damage type detected",
    "dice.noDamageDice": "No damage dice found in the description.",
    "dice.criticalReady": "{name}: critical ready, the next damage roll doubles the dice",
    "dice.criticalReadyPrefix": "Critical ready.",
    "dice.criticalNoBaseDice": "Critical: no base damage dice to double for this attack.",
    "dice.criticalExpression": "Critical: {base} -> {final}",
    "dice.rollDamage": "{prefix}Roll damage {label} {type} {levelText}",
    "dice.atLevel": "at level {level}",
    "dice.noDamageDiceShort": "No damage dice detected",
    "item.drawerTitle": "Objeto",
    "item.addItem": "Add item",
    "item.filters": "Item filters",
    "item.filterAll": "All",
    "item.filterWeapons": "Weapons",
    "item.filterArmor": "Armor",
    "item.filterAccessories": "Accessories",
    "item.filterConsumables": "Consumables",
    "item.filterGear": "Gear",
    "item.searchPlaceholder": "Search item",
    "item.quantity": "Quantity",
    "item.added": "Item added",
    "item.damageDetected": "Detected damage",
    "item.damageType": "Damage type",
    "item.damage": "Damage",
    "item.noData": "No data",
    "item.noClassData": "Choose a class/background and level to generate features.",
    "item.noRaceData": "Choose a race to see this option.",
    "item.description": "Description",
    "familiar.title": "Find Familiar",
    "familiar.subtitle": "Choose the form you want to summon.",
    "familiar.otherBeast": "Other CR 0 Beast",
    "familiar.otherPlaceholder": "Beast name",
    "familiar.closeTab": "Close {name}",
    "familiar.closeHint": "Click closes this item. Shift+click closes the whole group.",
    "turn.title": "Start combat",
    "turn.subtitle": "Available actions based on the character's current state.",
    "turn.actions": "Actions",
    "turn.actionsWithCount": "Actions ({count})",
    "turn.bonusActions": "Bonus actions",
    "turn.bonusActionsWithCount": "Bonus actions ({count})",
    "turn.newTurn": "New turn",
    "turn.newTurnRestored": "New turn: actions restored",
    "turn.noCost": "{title}: does not consume Action or Bonus Action",
    "turn.noActions": "No actions available this turn",
    "turn.noBonusActions": "No bonus actions available this turn",
    "turn.spent": "{title}: {type} spent{suffix}",
    "turn.effectActive": ", effect active",
    "turn.remainingHp": "Remaining {remaining}/{max} HP | Spent {used}",
    "turn.layOnHandsSpent": "Lay on Hands: {amount} point(s) spent. {remaining}/{max} left",
    "turn.layOnHandsRestored": "Lay on Hands: {amount} point(s) restored to the pool. {remaining}/{max} left",
    "turn.resources": "Resources",
    "turn.activeStatuses": "Active statuses",
    "turn.noUsableActions": "No usable actions found for the current sheet state.",
    "turn.actionsAvailable": "{count} actions available",
    "turn.bonusActionsAvailable": "{count} bonus actions available",
    "turn.group.movement.title": "Movement",
    "turn.group.movement.subtitle": "Movement limited by movement speed. You can move before, during, or after your actions.",
    "turn.group.action.title": "Action",
    "turn.group.action.subtitle": "Action 1/turn. You can also interact with one object or environmental feature for free once.",
    "turn.group.bonus.title": "Bonus Action",
    "turn.group.bonus.subtitle": "Bonus action max. 1/turn. It only exists if a spell, ability, or feature says you can use one.",
    "turn.group.reaction.title": "Reaction",
    "turn.group.reaction.subtitle": "Reaction max. 1/round. It is an instant response to a trigger.",
    "import.title": "Import character",
    "import.subtitle": "Paste a code and choose which save slot to load it into.",
    "import.codeLabel": "Character code",
    "import.codePlaceholder": "Paste the character sheet code here",
    "import.slot": "Ranura de guardado",
    "import.emptyCode": "Paste a code before importing.",
    "import.readFailed": "Could not read the character code.",
    "import.openFailed": "Could not open import.",
    "import.importFailed": "Could not import the character.",
    "import.imported": "Character imported",
    "import.browserUnsupported": "This browser cannot decompress the code.",
    "import.invalidJson": "The character code does not contain valid JSON data.",
    "import.incompatible": "The code does not contain a compatible sheet.",
    "import.corrupt": "The character code is corrupt or incomplete.",
    "export.copyFailed": "Could not copy to clipboard.",
    "export.generateFailed": "Could not generate the code",
    "export.invalidCode": "Invalid character code.",
    "export.copied": "Character code copied ({count} characters)",
    "character.loaded": "Character loaded",
    "character.readyLocked": "Character ready: the sheet is locked.",
    "character.readyChoiceLocked": "Character ready: that choice is locked.",
    "character.readySheetLocked": "Character ready: sheet locked",
    "character.editingEnabled": "Character editing enabled",
    "character.lockedPart": "Character ready: that part of the sheet is locked.",
    "save.autosaved": "Autosaved",
    "pdf.loadFailed": "Could not load the PDF: {message}",
    "translation.appliesExamined": "Translation applies only to the examined text.",
    "translation.translateText": "Translate text",
    "translation.viewOriginal": "View original",
    "translation.original": "Original text",
    "translation.translating": "Translating examined text...",
    "translation.translated": "Translated text",
    "translation.failed": "Could not translate the text.",
    "spell.translateFailed": "Could not translate the spell description.",
    "spell.removeFromBook": "Remove from book",
    "spell.addToBook": "Add to book",
    "spell.searchKnownCantrip": "Search known cantrip...",
    "spell.searchCantrip": "Search cantrip...",
    "spell.searchSpellbook": "Search spellbook",
    "spell.searchSpell": "Search spell",
    "spell.searchKnownSpell": "Search known spell",
    "spell.searchSelectedSpell": "Search selected spell",
    "spell.closeDetail": "Close detail",
    "spell.cast": "Cast {name} ({label})",
    "spell.selected": "Selected",
    "spell.learn": "Learn",
    "spell.known": "Known",
    "spell.remove": "Remove",
    "spell.learnCantrips": "Learn cantrips",
    "spell.learnSpells": "Learn spells",
    "feature.searchOption": "Search option...",
    "feature.selectOptionDetail": "Select an option to see the detail.",
    "feature.searchFeature": "Search feature...",
    "status.add": "Add status",
    "status.search": "Search status...",
    "status.searchLabel": "Search status",
    "status.characterStatuses": "Character statuses",
    "status.benefit": "Benefit",
    "status.penalty": "Penalty",
    "sorcery.points": "Sorcery Points",
    "sorcery.fontOfMagic": "Font of Magic",
    "sorcery.notEnough": "Not enough Sorcery Points.",
    "sorcery.atMaximum": "Sorcery Points are already at maximum.",
    "sorcery.notEnoughCapacity": "There is not enough room in the Sorcery Point pool to gain the full amount.",
    "sorcery.slotUnavailable": "That Spell Slot is not available.",
    "sorcery.invalidSlot": "That Spell Slot level cannot be created.",
    "sorcery.levelTooLow": "Sorcerer level is too low for that Spell Slot.",
    "sorcery.converted": "Level {level} Spell Slot converted: gained {gained} SP.",
    "sorcery.created": "Temporary level {level} Spell Slot created for {cost} SP.",
    "sorcery.convertSlot": "Convert Spell Slot",
    "sorcery.createSlot": "Create Spell Slot",
    "sorcery.slotLevel": "Level {level} Slot",
    "sorcery.gainPoints": "Gain {count} SP",
    "sorcery.noSlots": "No Spell Slots are available to convert.",
    "sorcery.costAndLevel": "{cost} SP - Sorcerer level {level}+",
    "sorcery.temporaryNote": "Created slots behave like normal slots, persist when saving, and disappear on a Long Rest.",
    "sorcery.metamagic": "Metamagic",
    "sorcery.quickenedDescription": "Spend 2 Sorcery Points to cast an Action spell as a Bonus Action.",
    "sorcery.spellUnavailable": "Spell unavailable.",
    "sorcery.alreadyCastLevelSpell": "You already cast a level 1+ spell this turn.",
    "sorcery.cantripNoSlot": "Cantrip - no Spell Slot",
    "sorcery.noSlotLevel": "No level {level} Spell Slot available.",
    "sorcery.freeUse": "Uses its free casting",
    "sorcery.usesSlot": "Uses one level {level} Spell Slot",
    "sorcery.quickenedSummary": "Cost: 2 SP. Available: {current}/{maximum}.",
    "sorcery.cantrip": "Cantrip",
    "sorcery.noActionSpells": "There are no prepared Action spells to cast.",
    "sorcery.quickenedMeta": "Metamagic - Bonus Action - 2 SP",
    "sorcery.choose": "Choose",
    "sorcery.quickenedChooseTitle": "Choose an Action spell to cast as a Bonus Action. SP: {current}/{maximum}",
    "sorcery.quickenedBlocksLevelSpell": "You cannot cast a level 1+ spell after using Quickened Spell this turn.",
    "sorcery.quickenedCast": "{spell} cast as a Bonus Action with Quickened Spell (2 SP).",
    "sorcery.quickenedCastWithSlot": "{spell} cast as a Bonus Action at level {level} with Quickened Spell (2 SP). Slots: {remaining}/{total}."
  };

  const ES = {
    "app.title": "Planilla DnD",
    "release.checking": "Buscando \u00faltima versi\u00f3n...",
    "release.download": "Descargar",
    "release.check": "Buscar",
    "release.currentVersion": "Instalada: {version}",
    "release.checkingNow": "Buscando actualizaciones...",
    "release.available": "Version {version} disponible",
    "release.downloadUpdate": "Descargar actualizacion",
    "release.downloading": "Descargando actualizacion {percent}%",
    "release.downloaded": "Actualizacion lista para instalar",
    "release.restartInstall": "Reiniciar e instalar",
    "release.upToDate": "Ya tienes la ultima version",
    "release.error": "No se pudieron buscar actualizaciones",
    "release.tryAgain": "Reintentar",
    "controls.open": "Abrir controles",
    "settings.open": "Abrir ajustes",
    "settings.title": "Ajustes",
    "settings.language": "Idioma",
    "settings.language.english": "English",
    "settings.language.spanish": "Espa\u00f1ol",
    "settings.dmScreen": "Pantalla del DM",
    "settings.connectToDm": "Conectar con el DM",
    "settings.generateCode": "Generar c\u00f3digo",
    "settings.importCharacter": "Importar personaje",
    "settings.checkUpdates": "Buscar actualizaciones",
    "top.character": "Personaje",
    "top.clearFields": "Limpiar campos",
    "top.restControls": "Controles de descanso",
    "top.longRest": "Descanso largo",
    "top.longRest.start": "Iniciar descanso largo",
    "top.longRest.finish": "Terminar descanso largo",
    "top.shortRest": "Descanso corto",
    "top.shortRest.start": "Iniciar descanso corto",
    "top.shortRest.finish": "Terminar descanso corto",
    "rest.longBlockedByShort": "Termina el descanso corto antes de iniciar un descanso largo.",
    "rest.shortBlockedByLong": "Termina el descanso largo antes de iniciar un descanso corto.",
    "top.characterReady.unlocked": "\ud83d\udd13 Personaje listo",
    "top.characterReady.locked": "\ud83d\udd12 Personaje listo",
    "top.startCombat": "Empezar combate",
    "live.title": "Conectar con el DM",
    "live.subtitle": "Compartir planilla en vivo por Tailscale o red local",
    "live.host": "Host del DM / IP Tailscale",
    "live.hostPlaceholder": "100.x.y.z o kael-pc",
    "live.port": "Puerto",
    "live.sessionToken": "Token de sesi\u00f3n",
    "live.sessionTokenPlaceholder": "C\u00f3digo opcional del DM",
    "live.playerName": "Nombre del jugador",
    "live.playerNamePlaceholder": "Jugador",
    "live.help": "Usa la IP Tailscale 100.x.y.z o el nombre MagicDNS del DM. No uses IP p\u00fablica ni port forwarding.",
    "live.cancel": "Cerrar",
    "live.connect": "Conectar",
    "live.disconnect": "Desconectar",
    "live.connecting": "Conectando...",
    "live.connected": "Conectado",
    "live.disconnected": "Desconectado",
    "live.disconnectedFromDm": "Desconectado del DM.",
    "live.patchUnmatched": "Edici\u00f3n del DM recibida, sin campos coincidentes",
    "live.enterHost": "Ingresa el host o IP Tailscale del DM.",
    "live.invalidPort": "Puerto inv\u00e1lido.",
    "live.connectingTo": "Conectando a {url}",
    "live.connectedTo": "Conectado a {url}",
    "live.synced": "Sincronizado con el DM",
    "live.connectedStatus": "Live sheet conectada",
    "live.disconnectedStatus": "Live sheet desconectada",
    "live.notConnectedToDm": "No estás conectado al DM.",
    "live.handRaise": "Levantar mano",
    "live.handLower": "Bajar mano",
    "live.handRaiseAria": "Levantar la mano",
    "live.handLowerAria": "Bajar la mano",
    "live.handQueueTitle": "Manos levantadas - orden para hablar",
    "live.handQueueEmpty": "No hay manos levantadas.",
    "live.handYou": "Vos",
    "live.handRaisedPosition": "Tu mano está levantada - posición {position}.",
    "live.handRaisedWaiting": "Tu mano está levantada - esperando posición.",
    "live.handNotRaised": "Tu mano no está levantada.",
    "live.handLoweredByDm": "El DM bajó tu mano.",
    "live.handLoweredSelf": "Bajaste tu mano.",
    "live.combatRound": "Iniciativa de combate - ronda {round}",
    "live.combatActiveTurn": "Turno de {name} - ronda {round}",
    "live.combatRoundEnd": "Fin de la ronda {round}",
    "live.combatInitiative": "Iniciativa {initiative}",
    "live.sendFailed": "No se pudo enviar la planilla.",
    "live.connectFailed": "No se pudo conectar con el DM.",
    "live.invalidAddress": "Direcci\u00f3n WebSocket inv\u00e1lida.",
    "common.close": "Cerrar",
    "common.cancel": "Cancelar",
    "common.import": "Importar",
    "common.add": "Agregar",
    "common.open": "Abrir",
    "common.other": "Otro",
    "common.cast": "Lanzar",
    "common.saved": "Guardado",
    "common.loadingSheet": "Cargando planilla...",
    "common.search": "Buscar...",
    "alerts.open": "Ver alertas pendientes",
    "alerts.pending": "Alertas pendientes",
    "alerts.none": "No hay alertas pendientes.",
    "alerts.noneSummary": "No hay alertas pendientes",
    "alerts.summary": "{total} alerta(s): {critical} cr\u00edticas, {important} importantes, {optional} opcionales",
    "alerts.counts": "{critical} crit / {important} imp / {optional} opc",
    "alerts.critical": "Cr\u00edtica",
    "alerts.important": "Importante",
    "alerts.optional": "Opcional",
    "alerts.tooManyPreparedSpells": "Demasiados spells preparados",
    "alerts.preparedSpellLimit": "Preparaste {prepared}; tu l\u00edmite actual es {limit}.",
    "alerts.reviewSpellbook": "Revisar spellbook",
    "alerts.reviewProficienciesLanguages": "Revisar proficiencies/languages",
    "alerts.missingProficienciesLanguages": "Faltan proficiencies o languages derivados de clase, raza y background.",
    "dice.freeTitle": "Dados libres",
    "dice.freeSubtitle": "D2, d3, d4, d6, d10, d10 porcentual, d12, d20, d30, d60 y d100",
    "dice.type": "Tipo de dado",
    "dice.remove": "Quitar dado",
    "dice.add": "Agregar dado",
    "dice.roll": "Tirar",
    "dice.log": "Registro",
    "dice.selectWithPlus": "Selecciona dados con +.",
    "dice.selectAtLeastOne": "Selecciona al menos un dado.",
    "dice.invalidCombination": "No se pudo tirar esa combinaci\u00f3n.",
    "dice.maxFree": "M\u00e1ximo {max} dados por tirada libre.",
    "dice.dice": "Dados: {label}",
    "dice.rolls": "Tiradas {expression}: {rolls} = {subtotal}",
    "dice.total": "Total: {total}",
    "dice.freeRoll": "Tirada libre: {label}",
    "dice.damage": "da\u00f1o",
    "dice.noDamageType": "Sin tipo de da\u00f1o detectado",
    "dice.noDamageDice": "No encontr\u00e9 dados de da\u00f1o en la descripci\u00f3n.",
    "dice.criticalReady": "{name}: cr\u00edtico listo, el pr\u00f3ximo da\u00f1o duplica los dados",
    "dice.criticalReadyPrefix": "Cr\u00edtico listo.",
    "dice.criticalNoBaseDice": "Cr\u00edtico: no hay dados de da\u00f1o base para duplicar en este ataque.",
    "dice.criticalExpression": "Cr\u00edtico: {base} -> {final}",
    "dice.rollDamage": "{prefix}Tirar da\u00f1o {label} {type} {levelText}",
    "dice.atLevel": "a nivel {level}",
    "dice.noDamageDiceShort": "Sin dados de da\u00f1o detectados",
    "item.drawerTitle": "Item",
    "item.addItem": "Agregar item",
    "item.filters": "Filtros de items",
    "item.filterAll": "Todos",
    "item.filterWeapons": "Armas",
    "item.filterArmor": "Armaduras",
    "item.filterAccessories": "Accesorios",
    "item.filterConsumables": "Consumibles",
    "item.filterGear": "Equipo",
    "item.searchPlaceholder": "Buscar item",
    "item.quantity": "Cantidad",
    "item.added": "Item agregado",
    "item.damageDetected": "Da\u00f1o detectado",
    "item.damageType": "Tipo de da\u00f1o",
    "item.damage": "Da\u00f1o",
    "item.noData": "Sin datos",
    "item.noClassData": "Eleg\u00ed una clase/background y nivel para generar features.",
    "item.noRaceData": "Eleg\u00ed una raza para ver esta opci\u00f3n.",
    "item.description": "Descripci\u00f3n",
    "familiar.title": "Find Familiar",
    "familiar.subtitle": "Elige la forma que quieres invocar.",
    "familiar.otherBeast": "Otra bestia CR 0",
    "familiar.otherPlaceholder": "Nombre de la bestia",
    "familiar.closeTab": "Cerrar {name}",
    "familiar.closeHint": "Click cierra este item. Shift+click cierra todo el grupo.",
    "turn.title": "Empezar combate",
    "turn.subtitle": "Acciones disponibles seg\u00fan el estado actual del personaje.",
    "turn.actions": "Acciones",
    "turn.actionsWithCount": "Acciones ({count})",
    "turn.bonusActions": "Acciones bonus",
    "turn.bonusActionsWithCount": "Acciones bonus ({count})",
    "turn.newTurn": "Nuevo turno",
    "turn.newTurnRestored": "Nuevo turno: acciones restauradas",
    "turn.noCost": "{title}: no consume Acci\u00f3n ni Acci\u00f3n Bonus",
    "turn.noActions": "Sin acciones disponibles este turno",
    "turn.noBonusActions": "Sin acciones bonus disponibles este turno",
    "turn.spent": "{title}: {type} gastada{suffix}",
    "turn.effectActive": ", efecto activo",
    "turn.remainingHp": "Restante {remaining}/{max} HP | Gastado {used}",
    "turn.layOnHandsSpent": "Lay on Hands: {amount} punto(s) gastados. Restan {remaining}/{max}",
    "turn.layOnHandsRestored": "Lay on Hands: {amount} punto(s) restaurados al pool. Restan {remaining}/{max}",
    "turn.resources": "Recursos",
    "turn.activeStatuses": "Estados activos",
    "turn.noUsableActions": "No encontr\u00e9 acciones utilizables con el estado actual de la ficha.",
    "turn.actionsAvailable": "{count} acciones disponibles",
    "turn.bonusActionsAvailable": "{count} acciones bonus disponibles",
    "turn.group.movement.subtitle": "Movimiento limitado por la velocidad. Puedes moverte antes, durante o despu\u00e9s de tus acciones.",
    "turn.group.movement.title": "Movimiento",
    "turn.group.action.title": "Acci\u00f3n",
    "turn.group.action.subtitle": "Acci\u00f3n 1/turno. Tambi\u00e9n puedes interactuar gratis con un objeto o parte del entorno una vez.",
    "turn.group.bonus.title": "Acci\u00f3n Bonus",
    "turn.group.bonus.subtitle": "Acci\u00f3n bonus m\u00e1x. 1/turno. Solo existe si un spell, habilidad o feature dice que puedes hacerlo.",
    "turn.group.reaction.title": "Reacci\u00f3n",
    "turn.group.reaction.subtitle": "Reacci\u00f3n m\u00e1x. 1/ronda. Es una respuesta instant\u00e1nea a un disparador.",
    "import.title": "Importar personaje",
    "import.subtitle": "Pega un c\u00f3digo y elige en qu\u00e9 save slot cargarlo.",
    "import.codeLabel": "C\u00f3digo de personaje",
    "import.codePlaceholder": "Pega aqu\u00ed el c\u00f3digo del character sheet",
    "import.slot": "Save slot",
    "import.emptyCode": "Pega un c\u00f3digo antes de importar.",
    "import.readFailed": "No se pudo leer el c\u00f3digo del personaje.",
    "import.openFailed": "No se pudo abrir la importaci\u00f3n",
    "import.importFailed": "No se pudo importar el personaje.",
    "import.imported": "Personaje importado",
    "import.browserUnsupported": "Este navegador no puede descomprimir el c\u00f3digo.",
    "import.invalidJson": "El c\u00f3digo del personaje no contiene datos JSON v\u00e1lidos.",
    "import.incompatible": "El c\u00f3digo no contiene una planilla compatible.",
    "import.corrupt": "El c\u00f3digo del personaje est\u00e1 corrupto o incompleto.",
    "export.copyFailed": "No se pudo copiar al portapapeles.",
    "export.generateFailed": "No se pudo generar el c\u00f3digo",
    "export.invalidCode": "C\u00f3digo de personaje inv\u00e1lido.",
    "export.copied": "C\u00f3digo de personaje copiado ({count} caracteres)",
    "character.loaded": "Personaje cargado",
    "character.readyLocked": "Personaje listo: la planilla est\u00e1 bloqueada.",
    "character.readyChoiceLocked": "Personaje listo: esa elecci\u00f3n est\u00e1 bloqueada.",
    "character.readySheetLocked": "Personaje listo: planilla bloqueada",
    "character.editingEnabled": "Edici\u00f3n de personaje habilitada",
    "character.lockedPart": "Personaje listo: esa parte de la planilla est\u00e1 bloqueada.",
    "save.autosaved": "Guardado autom\u00e1tico",
    "pdf.loadFailed": "No se pudo cargar el PDF: {message}",
    "translation.appliesExamined": "La traducci\u00f3n aplica solo al texto examinado.",
    "translation.translateText": "Traducir texto",
    "translation.viewOriginal": "Ver original",
    "translation.original": "Texto original",
    "translation.translating": "Traduciendo texto examinado...",
    "translation.translated": "Texto traducido",
    "translation.failed": "No se pudo traducir el texto.",
    "spell.translateFailed": "No se pudo traducir la descripci\u00f3n de la spell.",
    "spell.removeFromBook": "Quitar del libro",
    "spell.addToBook": "Agregar al libro",
    "spell.searchKnownCantrip": "Buscar cantrip conocido...",
    "spell.searchCantrip": "Buscar cantrip...",
    "spell.searchSpellbook": "Buscar en spellbook",
    "spell.searchSpell": "Buscar spell",
    "spell.searchKnownSpell": "Buscar spell conocido",
    "spell.searchSelectedSpell": "Buscar spell seleccionada",
    "spell.closeDetail": "Cerrar detalle",
    "spell.cast": "Lanzar {name} ({label})",
    "spell.selected": "Seleccionada",
    "spell.learn": "Aprender",
    "spell.known": "Conocida",
    "spell.remove": "Quitar",
    "spell.learnCantrips": "Aprender cantrips",
    "spell.learnSpells": "Aprender spells",
    "feature.searchOption": "Buscar opci\u00f3n...",
    "feature.selectOptionDetail": "Selecciona una opci\u00f3n para ver el detalle.",
    "feature.searchFeature": "Buscar feature...",
    "status.add": "Agregar estado",
    "status.search": "Buscar estado...",
    "status.searchLabel": "Buscar estado",
    "status.characterStatuses": "Estados del personaje",
    "status.benefit": "Beneficio",
    "status.penalty": "Penalidad",
    "sorcery.points": "Sorcery Points",
    "sorcery.fontOfMagic": "Font of Magic",
    "sorcery.notEnough": "No tienes suficientes Sorcery Points.",
    "sorcery.atMaximum": "Los Sorcery Points ya están al máximo.",
    "sorcery.notEnoughCapacity": "No hay espacio suficiente en el pool para ganar todos los Sorcery Points.",
    "sorcery.slotUnavailable": "Ese Spell Slot no está disponible.",
    "sorcery.invalidSlot": "No se puede crear un Spell Slot de ese nivel.",
    "sorcery.levelTooLow": "Tu nivel de Sorcerer es demasiado bajo para ese Spell Slot.",
    "sorcery.converted": "Spell Slot nivel {level} convertido: ganaste {gained} SP.",
    "sorcery.created": "Spell Slot temporal nivel {level} creado por {cost} SP.",
    "sorcery.convertSlot": "Convertir Spell Slot",
    "sorcery.createSlot": "Crear Spell Slot",
    "sorcery.slotLevel": "Slot nivel {level}",
    "sorcery.gainPoints": "Ganar {count} SP",
    "sorcery.noSlots": "No hay Spell Slots disponibles para convertir.",
    "sorcery.costAndLevel": "{cost} SP - Sorcerer nivel {level}+",
    "sorcery.temporaryNote": "Los slots creados funcionan como slots normales, persisten al guardar y desaparecen con un Long Rest.",
    "sorcery.metamagic": "Metamagic",
    "sorcery.quickenedDescription": "Gasta 2 Sorcery Points para castear como Bonus Action una magia cuyo tiempo sea una Action.",
    "sorcery.spellUnavailable": "Magia no disponible.",
    "sorcery.alreadyCastLevelSpell": "Ya casteaste una magia de nivel 1+ este turno.",
    "sorcery.cantripNoSlot": "Cantrip - no gasta Spell Slot",
    "sorcery.noSlotLevel": "No hay Spell Slot nivel {level} disponible.",
    "sorcery.freeUse": "Usa su casteo gratuito",
    "sorcery.usesSlot": "Gasta un Spell Slot nivel {level}",
    "sorcery.quickenedSummary": "Costo: 2 SP. Disponibles: {current}/{maximum}.",
    "sorcery.cantrip": "Cantrip",
    "sorcery.noActionSpells": "No hay magias preparadas de tiempo Action para castear.",
    "sorcery.quickenedMeta": "Metamagic - Bonus Action - 2 SP",
    "sorcery.choose": "Elegir",
    "sorcery.quickenedChooseTitle": "Elegir una magia de tiempo Action para castear como Bonus Action. SP: {current}/{maximum}",
    "sorcery.quickenedBlocksLevelSpell": "No puedes castear una magia de nivel 1+ después de usar Quickened Spell este turno.",
    "sorcery.quickenedCast": "{spell} casteada como Bonus Action con Quickened Spell (2 SP).",
    "sorcery.quickenedCastWithSlot": "{spell} casteada como Bonus Action a nivel {level} con Quickened Spell (2 SP). Slots: {remaining}/{total}."
  };

  const DICTIONARIES = {
    en: EN,
    es: { ...EN, ...ES }
  };

  const LEGACY_PHRASES = {
    "Planilla DnD": "app.title",
    "Buscando ultima version...": "release.checking",
    "Buscando \u00faltima versi\u00f3n...": "release.checking",
    "Descargar": "release.download",
    "Abrir controles": "controls.open",
    "Abrir ajustes": "settings.open",
    "Personaje": "top.character",
    "Limpiar campos": "top.clearFields",
    "Long rest": "top.longRest",
    "Short rest": "top.shortRest",
    "\ud83d\udd13 Personaje Listo": "top.characterReady.unlocked",
    "\ud83d\udd12 Personaje Listo": "top.characterReady.locked",
    "Empezar combate": "top.startCombat",
    "Generar codigo": "settings.generateCode",
    "Generar c\u00f3digo": "settings.generateCode",
    "Importar character": "settings.importCharacter",
    "Cerrar": "common.close",
    "Alertas pendientes": "alerts.pending",
    "Cargando planilla...": "common.loadingSheet",
    "Guardado": "common.saved",
    "Dados libres": "dice.freeTitle",
    "D2, d3, d4, d6, d10, d10 porcentual, d12, d20, d30, d60 y d100": "dice.freeSubtitle",
    "Tipo de dado": "dice.type",
    "Quitar dado": "dice.remove",
    "Agregar dado": "dice.add",
    "Agregar item": "item.addItem",
    "Filtros de items": "item.filters",
    "Todos": "item.filterAll",
    "Armas": "item.filterWeapons",
    "Armaduras": "item.filterArmor",
    "Accesorios": "item.filterAccessories",
    "Consumibles": "item.filterConsumables",
    "Equipo": "item.filterGear",
    "Buscar item": "item.searchPlaceholder",
    "Cantidad": "item.quantity",
    "Elegi la forma que queres invocar.": "familiar.subtitle",
    "Eleg\u00ed la forma que quer\u00e9s invocar.": "familiar.subtitle",
    "Nombre de la bestia": "familiar.otherPlaceholder",
    "Cancelar": "common.cancel",
    "Acciones disponibles segun el estado actual del personaje.": "turn.subtitle",
    "Acciones disponibles seg\u00fan el estado actual del personaje.": "turn.subtitle",
    "Acciones": "turn.actions",
    "Acciones bonus": "turn.bonusActions",
    "Nuevo turno": "turn.newTurn",
    "Pega un codigo y elige en que save slot cargarlo.": "import.subtitle",
    "Pega un c\u00f3digo y elige en qu\u00e9 save slot cargarlo.": "import.subtitle",
    "Codigo de personaje": "import.codeLabel",
    "C\u00f3digo de personaje": "import.codeLabel",
    "Pega aqui el codigo del character sheet": "import.codePlaceholder",
    "Pega aqu\u00ed el c\u00f3digo del character sheet": "import.codePlaceholder",
    "Importar": "common.import"
  };

  const phraseToKey = new Map();
  Object.entries(EN).forEach(([key, value]) => phraseToKey.set(value, key));
  Object.entries(ES).forEach(([key, value]) => phraseToKey.set(value, key));
  Object.entries(LEGACY_PHRASES).forEach(([value, key]) => phraseToKey.set(value, key));

  let currentLanguage = DEFAULT_LANGUAGE;
  let observer = null;
  let applyingTranslations = false;

  function readStoredLanguage() {
    try {
      const stored = globalScope.localStorage?.getItem(STORAGE_KEY);
      return SUPPORTED_LANGUAGES.has(stored) ? stored : DEFAULT_LANGUAGE;
    } catch (_error) {
      return DEFAULT_LANGUAGE;
    }
  }

  currentLanguage = readStoredLanguage();

  function interpolate(value, params = {}) {
    return String(value || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => (
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
    ));
  }

  function hasKey(key) {
    return Boolean(DICTIONARIES.en[key]);
  }

  function t(key, params = {}) {
    const dictionary = DICTIONARIES[currentLanguage] || DICTIONARIES.en;
    return interpolate(dictionary[key] || DICTIONARIES.en[key] || String(key || ""), params);
  }

  function normalizeFreeText(text, language = currentLanguage) {
    let output = String(text || "");
    if (language === "en") {
      const replacements = [
        [/\bQue haces\b/gi, "What you do"],
        [/\bQu[eé] haces\b/gi, "What you do"],
        [/\bSuma\b/gi, "Benefit"],
        [/\bResta\b/gi, "Tradeoff"],
        [/\bAcci[oó]n Bonus\b/g, "Bonus Action"],
        [/\bAccion Bonus\b/g, "Bonus Action"],
        [/\bAcci[oó]n\b/g, "Action"],
        [/\baccion\b/gi, "action"],
        [/\bReacci[oó]n\b/g, "Reaction"],
        [/\bturno\b/gi, "turn"],
        [/\bproximo\b/gi, "next"],
        [/\bpr[oó]ximo\b/gi, "next"],
        [/\bda\u00f1o\b/gi, "damage"],
        [/\bcritico\b/gi, "critical"],
        [/\bcr\u00edtico\b/gi, "critical"],
        [/\bdescripcion\b/gi, "description"],
        [/\bdescripci\u00f3n\b/gi, "description"],
        [/\bcuracion\b/gi, "healing"],
        [/\bcuraci\u00f3n\b/gi, "healing"],
        [/\bMovimiento\b/g, "Movement"],
        [/\bmovimiento\b/g, "movement"],
        [/\bTirar\b/g, "Roll"],
        [/\btirar\b/g, "roll"],
        [/\bataque\b/gi, "attack"],
        [/\bventaja\b/gi, "advantage"],
        [/\bdesventaja\b/gi, "disadvantage"],
        [/\bdados\b/gi, "dice"],
        [/\blibres\b/gi, "free"],
        [/\biniciativa\b/gi, "initiative"],
        [/\bModificador\b/g, "Modifier"],
        [/\bTipo\b/g, "Type"],
        [/\bpies\b/gi, "feet"],
        [/\bsin prof\b/gi, "without proficiency"]
      ];
      replacements.forEach(([pattern, replacement]) => {
        output = output.replace(pattern, replacement);
      });
    } else {
      const replacements = [
        [/\bWhat you do\b/g, "Qu\u00e9 haces"],
        [/\bBenefit\b/g, "Suma"],
        [/\bTradeoff\b/g, "Resta"],
        [/\bBonus Action\b/g, "Acci\u00f3n Bonus"],
        [/\bAction\b/g, "Acci\u00f3n"],
        [/\bReaction\b/g, "Reacci\u00f3n"],
        [/\bRoll\b/g, "Tirar"],
        [/\bNew turn\b/g, "Nuevo turno"]
      ];
      replacements.forEach(([pattern, replacement]) => {
        output = output.replace(pattern, replacement);
      });
    }
    return output;
  }

  function translateDynamicText(key, fallback = "", params = {}) {
    if (hasKey(key)) return t(key, params);
    const source = fallback || key;
    const phraseKey = phraseToKey.get(String(source || "").trim());
    if (phraseKey) return t(phraseKey, params);
    return interpolate(normalizeFreeText(source, currentLanguage), params);
  }

  function setNodeText(node, value) {
    if (node.nodeType === 3 && node.nodeValue !== value) node.nodeValue = value;
  }

  function setAttributeIfChanged(element, attribute, value) {
    if (!element?.setAttribute) return;
    if (element.getAttribute(attribute) === value) return;
    element.setAttribute(attribute, value);
  }

  function applyElementTranslations(element) {
    const key = element.getAttribute?.("data-i18n");
    if (key) {
      const value = t(key);
      if (element.textContent !== value) element.textContent = value;
    }

    const titleKey = element.getAttribute?.("data-i18n-title");
    if (titleKey) setAttributeIfChanged(element, "title", t(titleKey));

    const placeholderKey = element.getAttribute?.("data-i18n-placeholder");
    if (placeholderKey) setAttributeIfChanged(element, "placeholder", t(placeholderKey));

    const ariaKey = element.getAttribute?.("data-i18n-aria-label");
    if (ariaKey) setAttributeIfChanged(element, "aria-label", t(ariaKey));

    ["title", "placeholder", "aria-label"].forEach((attribute) => {
      if (!element.hasAttribute?.(attribute)) return;
      const value = element.getAttribute(attribute);
      const phraseKey = phraseToKey.get(String(value || "").trim());
      if (phraseKey) setAttributeIfChanged(element, attribute, t(phraseKey));
    });
  }

  function shouldSkipNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    if (parent.closest("script, style, textarea, code, pre")) return true;
    return false;
  }

  function translateTextNode(node) {
    if (shouldSkipNode(node)) return;
    const value = node.nodeValue;
    if (!String(value || "").trim()) return;
    const leading = value.match(/^\s*/)?.[0] || "";
    const trailing = value.match(/\s*$/)?.[0] || "";
    const trimmed = value.trim();
    const phraseKey = phraseToKey.get(trimmed);
    if (phraseKey) {
      setNodeText(node, `${leading}${t(phraseKey)}${trailing}`);
      return;
    }
    const normalized = normalizeFreeText(trimmed, currentLanguage);
    if (normalized !== trimmed) setNodeText(node, `${leading}${normalized}${trailing}`);
  }

  function applyTranslations(root = globalScope.document) {
    if (!root?.querySelectorAll || applyingTranslations) return;
    applyingTranslations = true;
    try {
      const documentElement = root.ownerDocument?.documentElement || globalScope.document?.documentElement;
      if (documentElement) documentElement.lang = currentLanguage;
      if (globalScope.document?.title) globalScope.document.title = t("app.title");

      const elements = root.nodeType === 1 ? [root, ...root.querySelectorAll("*")] : [...root.querySelectorAll("*")];
      elements.forEach(applyElementTranslations);

      const walkerRoot = root.nodeType === 9 ? root.body : root;
      if (walkerRoot && globalScope.document?.createTreeWalker) {
        const walker = globalScope.document.createTreeWalker(walkerRoot, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          translateTextNode(node);
          node = walker.nextNode();
        }
      }
    } finally {
      applyingTranslations = false;
    }
  }

  function setLanguage(language) {
    const nextLanguage = SUPPORTED_LANGUAGES.has(language) ? language : DEFAULT_LANGUAGE;
    if (nextLanguage === currentLanguage) {
      applyTranslations();
      return currentLanguage;
    }
    currentLanguage = nextLanguage;
    try {
      globalScope.localStorage?.setItem(STORAGE_KEY, currentLanguage);
    } catch (_error) {
      // localStorage can be unavailable in tests or hardened browser contexts.
    }
    applyTranslations();
    globalScope.dispatchEvent?.(new CustomEvent("dnd:i18n:languagechange", { detail: { language: currentLanguage } }));
    return currentLanguage;
  }

  function getLanguage() {
    return currentLanguage;
  }

  function observeTranslations() {
    if (!globalScope.MutationObserver || observer || !globalScope.document?.body) return;
    observer = new MutationObserver((mutations) => {
      if (applyingTranslations) return;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) applyTranslations(node);
          else if (node.nodeType === 3) translateTextNode(node);
        });
      });
    });
    observer.observe(globalScope.document.body, {
      childList: true,
      subtree: true
    });
  }

  const api = {
    STORAGE_KEY,
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES: [...SUPPORTED_LANGUAGES],
    sourceDictionaries: {
      en: EN,
      es: ES
    },
    dictionaries: DICTIONARIES,
    getLanguage,
    setLanguage,
    t,
    applyTranslations,
    translateDynamicText,
    normalizeFreeText
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (globalScope) {
    globalScope.dndPlayerI18n = api;
    if (globalScope.document) {
      if (globalScope.document.readyState === "loading") {
        globalScope.document.addEventListener("DOMContentLoaded", () => {
          applyTranslations();
          observeTranslations();
        }, { once: true });
      } else {
        applyTranslations();
        observeTranslations();
      }
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
