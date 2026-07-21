import React from "react";
import { Icon } from "@iconify/react/offline";
import {
  campfireIcon,
  castleIcon,
  crossedSwordsIcon,
  diceTwentyFacesTwentyIcon,
  dragonHeadIcon,
  hoodedAssassinIcon,
  lockedChestIcon,
  magicSwirlIcon,
  openTreasureChestIcon,
  potionBallIcon,
  scrollUnfurledIcon,
  shieldIcon,
  sleepingBagIcon,
  spellBookIcon,
  treasureMapIcon
} from "./game-icon-data.js";

function createDndIcon(iconData) {
  return function DndSemanticIcon({ size = 20, className = "", color, title }) {
    return (
      <Icon
        icon={iconData}
        width={size}
        height={size}
        className={className}
        color={color}
        aria-hidden={title ? undefined : true}
        aria-label={title}
        role={title ? "img" : undefined}
      />
    );
  };
}

export const DiceIcon = createDndIcon(diceTwentyFacesTwentyIcon);
export const QuestIcon = createDndIcon(scrollUnfurledIcon);
export const NpcIcon = createDndIcon(hoodedAssassinIcon);
export const LocationIcon = createDndIcon(treasureMapIcon);
export const LootIcon = createDndIcon(lockedChestIcon);
export const SpellbookIcon = createDndIcon(spellBookIcon);
export const CombatIcon = createDndIcon(crossedSwordsIcon);
export const PotionIcon = createDndIcon(potionBallIcon);
export const TreasureIcon = createDndIcon(openTreasureChestIcon);
export const CampfireIcon = createDndIcon(campfireIcon);
export const RestIcon = createDndIcon(sleepingBagIcon);
export const CampaignIcon = createDndIcon(castleIcon);
export const CreatureIcon = createDndIcon(dragonHeadIcon);
export const MagicIcon = createDndIcon(magicSwirlIcon);
export const FantasyShieldIcon = createDndIcon(shieldIcon);
