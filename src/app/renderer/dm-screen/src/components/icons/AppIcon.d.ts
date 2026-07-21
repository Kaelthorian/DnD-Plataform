import type { ButtonHTMLAttributes } from "react";

export type AppIconProps = {
  name: string;
  size?: number;
  className?: string;
  color?: string;
  title?: string;
};

export type AppIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  label: string;
  size?: number;
};

export declare function AppIcon(props: AppIconProps): JSX.Element;
export declare function AppIconButton(props: AppIconButtonProps): JSX.Element;
export declare const appIconNames: readonly string[];
