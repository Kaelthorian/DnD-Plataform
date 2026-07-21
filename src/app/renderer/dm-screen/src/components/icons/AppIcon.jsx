import React from "react";
import {
  Archive,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  Copy,
  Crosshair,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Folder,
  Image,
  Link2,
  Lock,
  Map,
  Maximize2,
  Menu,
  Minimize2,
  Minus,
  MoreHorizontal,
  Move,
  Pause,
  Pencil,
  Pin,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Swords,
  Table2,
  Tag,
  Trash2,
  Underline,
  Unlock,
  Upload,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";

const APP_ICONS = Object.freeze({
  archive: Archive,
  bell: Bell,
  book: BookOpen,
  check: Check,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  close: X,
  copy: Copy,
  crosshair: Crosshair,
  download: Download,
  externalLink: ExternalLink,
  eye: Eye,
  eyeOff: EyeOff,
  file: FileText,
  filter: Filter,
  folder: Folder,
  help: CircleHelp,
  image: Image,
  link: Link2,
  lock: Lock,
  map: Map,
  maximize: Maximize2,
  menu: Menu,
  minimize: Minimize2,
  minus: Minus,
  more: MoreHorizontal,
  move: Move,
  pause: Pause,
  pencil: Pencil,
  pin: Pin,
  play: Play,
  plus: Plus,
  redo: Redo2,
  refresh: RefreshCw,
  reset: RotateCcw,
  search: Search,
  settings: Settings,
  shield: Shield,
  swords: Swords,
  table: Table2,
  tag: Tag,
  trash: Trash2,
  underline: Underline,
  unlock: Unlock,
  upload: Upload,
  user: UserRound,
  users: Users,
  volume: Volume2,
  volumeOff: VolumeX,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut
});

export function AppIcon({ name, size = 18, className = "", color, title }) {
  const IconComponent = APP_ICONS[name] || CircleHelp;
  const accessibleProps = title ? { role: "img", "aria-label": title } : { "aria-hidden": true };
  return (
    <IconComponent
      className={className}
      color={color}
      size={size}
      strokeWidth={1.8}
      {...accessibleProps}
    />
  );
}

export function AppIconButton({
  icon,
  label,
  size = 18,
  className = "",
  type = "button",
  ...buttonProps
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`dm-icon-button ${className}`.trim()}
      {...buttonProps}
    >
      <AppIcon name={icon} size={size} />
    </button>
  );
}

export const appIconNames = Object.freeze(Object.keys(APP_ICONS));
