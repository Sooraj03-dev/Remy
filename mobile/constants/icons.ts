// mobile/constants/icons.ts
// Semantic icon registry mapped onto locally bundled Kubai Line icons (24x24 grid).

import kubaiLine from '../assets/icons/kubai-line.json';

export type KubaiLineLayer = {
  d: string;
  k: 'shell' | 'line' | 'solid' | string;
  on?: string;
  tint?: boolean;
  lit?: boolean;
  cap?: 'butt' | 'round' | 'square' | string;
  part?: string;
};

export type KubaiLineGlyph = {
  o: KubaiLineLayer[];
  f: KubaiLineLayer[];
  x?: KubaiLineLayer[];
};

const glyphs = kubaiLine as Record<string, KubaiLineGlyph>;

/**
 * Semantic UI names -> Kubai Line glyphs.
 * Screens and shared components use these semantic names instead of raw filenames.
 */
export const SemanticIcons = {
  // Navigation & chrome
  home: glyphs.home,
  explore: glyphs.compass,
  sell: glyphs.plus,
  chats: glyphs['message-circle'],
  profile: glyphs.user,
  search: glyphs.search,
  favorite: glyphs.heart,
  back: glyphs['arrow-left'],
  chevronRight: glyphs['chevron-right'],
  filter: glyphs.sliders,
  notifications: glyphs.bell,
  settings: glyphs.settings,
  logout: glyphs['log-out'],

  // Campus trust & status
  location: glyphs['map-pin'],
  meetup: glyphs.hand,
  safeZone: glyphs['shield-check'],
  aiVerified: glyphs['badge-verified'],
  aiAssist: glyphs.sparkles,
  student: glyphs['graduation-cap'],

  // Categories
  textbooks: glyphs['book-open'],
  electronics: glyphs.laptop,
  audio: glyphs.headphones,
  clothing: glyphs.shirt,
  sports: glyphs.bicycle,
  basketball: glyphs.basketball,
  furniture: glyphs.bed,
  lamp: glyphs.lamp,
  stationery: glyphs.pencil,
  notebook: glyphs.notebook,
  bags: glyphs.backpack,
  calculator: glyphs.calculator,
  food: glyphs.utensils,
  coffee: glyphs.coffee,
  music: glyphs.music,
  package: glyphs.package,

  // Payments & commerce
  upi: glyphs.zap,
  wallet: glyphs.wallet,
  cash: glyphs.banknote,
  coins: glyphs.coins,
  card: glyphs['credit-card'],
  bag: glyphs['shopping-bag'],
  store: glyphs.store,

  // Actions & states
  send: glyphs.send,
  camera: glyphs.camera,
  image: glyphs.image,
  time: glyphs.clock,
  calendar: glyphs.calendar,
  check: glyphs.check,
  checkCircle: glyphs['circle-check'],
  close: glyphs.x,
  closeCircle: glyphs['circle-x'],
  star: glyphs.star,
  flag: glyphs.flag,
  refund: glyphs['rotate-ccw'],
  warning: glyphs['triangle-alert'],
  offline: glyphs['wifi-off'],
  restricted: glyphs.ban,
  tip: glyphs.lightbulb,
  score: glyphs['chart-bar'],
  clipboard: glyphs.clipboard,
  thumbsUp: glyphs['thumbs-up'],
  rocket: glyphs.rocket,
  trophy: glyphs.trophy,
} as const;

export type AppIconName = keyof typeof SemanticIcons;

/**
 * Legacy PascalCase aliases preserved for existing FX/UI primitives so all
 * icons render from the unified Kubai Line registry.
 */
export const LegacyIconAliases = {
  House: 'home',
  Compass: 'explore',
  Plus: 'sell',
  ChatsCircle: 'chats',
  UserCircle: 'profile',
  BookOpen: 'textbooks',
  Laptop: 'electronics',
  Bed: 'furniture',
  TShirt: 'clothing',
  PencilLine: 'stationery',
  Bicycle: 'sports',
  Armchair: 'lamp',
  Trophy: 'trophy',
  MusicNotes: 'music',
  Package: 'package',
  Heart: 'favorite',
  MagnifyingGlass: 'search',
  SealCheck: 'aiVerified',
  ShieldCheck: 'safeZone',
  Clock: 'time',
  XCircle: 'closeCircle',
  ShoppingBag: 'bag',
  Camera: 'camera',
  ImageSquare: 'image',
  Funnel: 'filter',
  Bell: 'notifications',
  Gear: 'settings',
  SignOut: 'logout',
  Warning: 'warning',
  WifiSlash: 'offline',
} as const satisfies Record<string, AppIconName>;

export type LegacyIconName = keyof typeof LegacyIconAliases;
export type IconName = AppIconName | LegacyIconName;

export function resolveIconName(name: IconName): AppIconName {
  if (name in LegacyIconAliases) {
    return LegacyIconAliases[name as LegacyIconName];
  }
  return name as AppIconName;
}

/** Expo Router tab route name -> semantic icon. */
export const TabIcons: Record<string, AppIconName> = {
  home: 'home',
  explore: 'explore',
  sell: 'sell',
  chats: 'chats',
  profile: 'profile',
};

/** Backend ProductCategory values (plus the UI's "all") -> semantic icon. */
export const CategoryIcons: Record<string, AppIconName> = {
  all: 'package',
  books: 'textbooks',
  textiles: 'textbooks',
  electronics: 'electronics',
  hostel: 'furniture',
  clothing: 'clothing',
  stationery: 'stationery',
  cycles: 'sports',
  furniture: 'furniture',
  sports: 'basketball',
  music: 'music',
  food: 'food',
  other: 'package',
};
