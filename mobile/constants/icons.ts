// mobile/constants/icons.ts
// The ONLY place app icons are imported. Everything else uses <Icon name="..." />.
// Phosphor icons: MIT licence (see docs/CREDITS.md).

import {
  Armchair,
  Basketball,
  Bed,
  Bell,
  Bicycle,
  BookOpen,
  Camera,
  ChatsCircle,
  Clock,
  Compass,
  Flask,
  Funnel,
  Gear,
  Heart,
  House,
  ImageSquare,
  Laptop,
  MagnifyingGlass,
  MusicNotes,
  Package,
  PlusCircle,
  SealCheck,
  ShoppingBag,
  SignOut,
  TShirt,
  UserCircle,
  Warning,
  WifiSlash,
  XCircle,
} from 'phosphor-react-native';

export const IconRegistry = {
  // Tabs
  House,
  Compass,
  PlusCircle,
  ChatsCircle,
  UserCircle,
  // Categories
  BookOpen,
  Laptop,
  Bed,
  TShirt,
  Flask,
  Bicycle,
  Armchair,
  Basketball,
  MusicNotes,
  Package,
  // Actions & states
  Heart,
  MagnifyingGlass,
  SealCheck,
  Clock,
  XCircle,
  ShoppingBag,
  Camera,
  ImageSquare,
  Funnel,
  Bell,
  Gear,
  SignOut,
  Warning,
  WifiSlash,
} as const;

export type IconName = keyof typeof IconRegistry;

/** Expo Router tab route name -> icon. */
export const TabIcons: Record<string, IconName> = {
  home: 'House',
  explore: 'Compass',
  sell: 'PlusCircle',
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
  stationery: 'Flask',
  cycles: 'Bicycle',
  furniture: 'Armchair',
  sports: 'Basketball',
  music: 'MusicNotes',
  food: 'Package',
  other: 'Package',
};
