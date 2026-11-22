// mobile/constants/icons.ts
// The ONLY place app icons are imported. Everything else uses <Icon name="..." />.
// Lucide icons are shared across the mobile app.

import {
  Armchair,
  Trophy,
  BedDouble,
  Bell,
  Bike,
  BookOpen,
  Camera,
  MessageCircle,
  Clock,
  Compass,
  PencilLine,
  Filter,
  Settings,
  Heart,
  House,
  Image,
  Laptop,
  Search,
  Music,
  Package,
  Plus,
  BadgeCheck,
  ShieldCheck,
  ShoppingBag,
  LogOut,
  Shirt,
  CircleUserRound,
  TriangleAlert,
  WifiOff,
  CircleX,
} from 'lucide-react-native';

export const IconRegistry = {
  // Tabs
  House,
  Compass,
  Plus,
  ChatsCircle: MessageCircle,
  UserCircle: CircleUserRound,
  // Categories
  BookOpen,
  Laptop,
  Bed: BedDouble,
  TShirt: Shirt,
  PencilLine,
  Bicycle: Bike,
  Armchair,
  Trophy,
  MusicNotes: Music,
  Package,
  // Actions & states
  Heart,
  MagnifyingGlass: Search,
  SealCheck: BadgeCheck,
  ShieldCheck,
  Clock,
  XCircle: CircleX,
  ShoppingBag,
  Camera,
  ImageSquare: Image,
  Funnel: Filter,
  Bell,
  Gear: Settings,
  SignOut: LogOut,
  Warning: TriangleAlert,
  WifiSlash: WifiOff,
} as const;

export type IconName = keyof typeof IconRegistry;

/** Expo Router tab route name -> icon. */
export const TabIcons: Record<string, IconName> = {
  home: 'House',
  explore: 'Compass',
  sell: 'Plus',
  chats: 'ChatsCircle',
  profile: 'UserCircle',
};

/** Backend ProductCategory values (plus the UI's "all") -> icon. */
export const CategoryIcons: Record<string, IconName> = {
  all: 'Package',
  books: 'BookOpen',
  textiles: 'BookOpen',
  electronics: 'Laptop',
  hostel: 'Bed',
  clothing: 'TShirt',
  stationery: 'PencilLine',
  cycles: 'Bicycle',
  furniture: 'Armchair',
  sports: 'Trophy',
  music: 'MusicNotes',
  food: 'Package',
  other: 'Package',
};
