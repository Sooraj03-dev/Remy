import kubai from '../assets/icons/kubai.json';

// The shared native icon renderer uses the two color regions of each Kubai glyph.
export const IconRegistry = {
  House: kubai.home,
  Compass: kubai.compass,
  Plus: kubai['plus-square'],
  ChatsCircle: kubai['message-circle'],
  UserCircle: kubai['user-round'],
  BookOpen: kubai['book-open'],
  Laptop: kubai.laptop,
  Bed: kubai.bed,
  TShirt: kubai.hanger,
  PencilLine: kubai.pencil,
  Bicycle: kubai.bicycle,
  Armchair: kubai.chair,
  Trophy: kubai.trophy,
  MusicNotes: kubai.music,
  Package: kubai.package,
  Heart: kubai.heart,
  MagnifyingGlass: kubai.search,
  SealCheck: kubai['badge-verified'],
  ShieldCheck: kubai['shield-check'],
  Clock: kubai.clock,
  XCircle: kubai['circle-x'],
  ShoppingBag: kubai['shopping-bag'],
  Camera: kubai.camera,
  ImageSquare: kubai.image,
  Funnel: kubai.filter,
  Bell: kubai.bell,
  Gear: kubai.settings,
  SignOut: kubai['log-out'],
  Warning: kubai['triangle-alert'],
  WifiSlash: kubai['wifi-off'],
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
