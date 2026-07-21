import type { AppIconProps } from "./AppIcon";

export type DndIconProps = Omit<AppIconProps, "name">;
export type DndIconComponent = (props: DndIconProps) => JSX.Element;

export declare const DiceIcon: DndIconComponent;
export declare const QuestIcon: DndIconComponent;
export declare const NpcIcon: DndIconComponent;
export declare const LocationIcon: DndIconComponent;
export declare const LootIcon: DndIconComponent;
export declare const SpellbookIcon: DndIconComponent;
export declare const CombatIcon: DndIconComponent;
export declare const PotionIcon: DndIconComponent;
export declare const TreasureIcon: DndIconComponent;
export declare const CampfireIcon: DndIconComponent;
export declare const RestIcon: DndIconComponent;
export declare const CampaignIcon: DndIconComponent;
export declare const CreatureIcon: DndIconComponent;
export declare const MagicIcon: DndIconComponent;
export declare const FantasyShieldIcon: DndIconComponent;
