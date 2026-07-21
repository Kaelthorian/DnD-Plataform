export type AppIconProps = {
  name: string;
  size?: number;
  className?: string;
  color?: string;
  title?: string;
};

export declare function AppIcon(props: AppIconProps): SVGSVGElement | null;

export type SemanticDndIcon = (props?: Omit<AppIconProps, "name">) => SVGSVGElement | null;

export declare const DiceIcon: SemanticDndIcon;
export declare const QuestIcon: SemanticDndIcon;
export declare const NpcIcon: SemanticDndIcon;
export declare const LocationIcon: SemanticDndIcon;
export declare const LootIcon: SemanticDndIcon;
export declare const SpellbookIcon: SemanticDndIcon;
export declare const CombatIcon: SemanticDndIcon;
export declare const PotionIcon: SemanticDndIcon;
export declare const TreasureIcon: SemanticDndIcon;
