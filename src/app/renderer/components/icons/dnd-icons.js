(function exposeDndIcons(root) {
  "use strict";

  // Curated semantic fantasy icons. Callers use these names instead of
  // depending on the internal drawing or a third-party collection name.
  const definitions = Object.freeze({
    dice: '<path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4L12 2.8Z"/><path d="m4.5 7.7 7.5 4.1 7.5-4.1M12 11.8v8.7"/><circle cx="12" cy="7.1" r=".8"/><circle cx="8.2" cy="12.8" r=".8"/><circle cx="15.8" cy="15.8" r=".8"/>',
    session: '<path d="M5 3.5h12.5A1.5 1.5 0 0 1 19 5v15H6.5A1.5 1.5 0 0 1 5 18.5v-15Z"/><path d="M5 17.5c0-.8.7-1.5 1.5-1.5H19M8 7h7M8 10h5"/>',
    npc: '<path d="M12 3.2 15.2 8l-1.4 3.2 3.7 7.6H6.5l3.7-7.6L8.8 8 12 3.2Z"/><path d="M9.3 8h5.4M9 18.8l-2 2M15 18.8l2 2"/>',
    quest: '<path d="m5 4 14 16M19 4 5 20"/><path d="m5 4 3 1-2 2-1-3Zm14 0-3 1 2 2 1-3ZM5 20l3-1-2-2-1 3Zm14 0-3-1 2-2 1 3Z"/>',
    location: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/>',
    loot: '<path d="M4 9h16v11H4zM3 9l2-4h14l2 4M12 9v11"/><path d="M9.5 13h5v3h-5z"/>',
    spellbook: '<path d="M4 4.5c3.2-.7 5.8-.2 8 1.5v14c-2.2-1.7-4.8-2.2-8-1.5v-14ZM20 4.5c-3.2-.7-5.8-.2-8 1.5v14c2.2-1.7 4.8-2.2 8-1.5v-14Z"/><path d="m12 8 .8 1.7 1.7.8-1.7.8L12 13l-.8-1.7-1.7-.8 1.7-.8L12 8Z"/>',
    combat: '<path d="m5 4 14 16M19 4 5 20"/><path d="M4 3.5 8 5 5.5 7.5 4 3.5Zm16 0L16 5l2.5 2.5L20 3.5ZM4 20.5 8 19l-2.5-2.5L4 20.5Zm16 0L16 19l2.5-2.5 1.5 4Z"/>',
    potion: '<path d="M9 3h6M10 3v5l-4.5 8a3.2 3.2 0 0 0 2.8 4.8h7.4a3.2 3.2 0 0 0 2.8-4.8L14 8V3"/><path d="M7.5 14h9M9.5 17.5h.1M13 16h.1"/>',
    treasure: '<path d="M4 10V8a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2M3 10h18v10H3z"/><path d="M3 14h18M10 12h4v5h-4z"/>',
    handout: '<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 14h6M9 17h4"/>',
    custom: '<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/><circle cx="12" cy="12" r="3"/>'
  });

  const component = (name) => (props = {}) => root.AppIcon?.({ ...props, name });
  root.dndIcons = Object.freeze({
    definitions,
    DiceIcon: component("dice"),
    QuestIcon: component("quest"),
    NpcIcon: component("npc"),
    LocationIcon: component("location"),
    LootIcon: component("loot"),
    SpellbookIcon: component("spellbook"),
    CombatIcon: component("combat"),
    PotionIcon: component("potion"),
    TreasureIcon: component("treasure")
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
