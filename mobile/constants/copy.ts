// mobile/constants/copy.ts
// One place for user-facing microcopy. Real API/error details are never replaced
// by these strings — they are shown alongside, or used only as the headline.

export const Copy = {
  app: {
    name: 'Thrifty Owl',
    tagline: 'Buy · Sell · Hoot — on campus',
    wordmark: 'Thrifty Owl',
  },
  loading: {
    feed: [
      'Fetching fresh deals...',
      'Asking the wise owl...',
      'Checking the campus nest...',
    ],
    search: ['Ruffling through listings...', 'Asking the wise owl...'],
    product: ['Unwrapping this find...', 'Asking the owl for details...'],
    orders: ['Checking your deals...', 'The owl is reviewing your orders...'],
    chats: ['Opening the nest...', 'Fetching your conversations...'],
    checkout: ['Getting the meetup ready...', 'Checking the handshake details...'],
  },
  empty: {
    listings: 'No listings yet. The owl is napping. Wake it up with your first listing!',
    listingsTitle: 'Nothing in the nest yet',
    search: 'No matches. Even the owl squints at that one.',
    searchTitle: 'No treasures found',
    orders: 'No orders yet. Your first campus deal is one tap away.',
    ordersTitle: 'No deals yet',
    chats: 'No chats yet. Place an order and the owl will introduce you.',
    chatsTitle: 'Quiet nest',
    wishlist: 'Your wishlist is empty. Tap a heart to keep an eye on a find.',
  },
  success: {
    submitted: 'Sent to the verifier! Hoot hoot, sit tight.',
    approved: "You're live! Your stuff is now on the campus feed.",
    orderPlaced: 'Deal locked in! Time to plan the meetup.',
    orderPlacedBody: 'Your order is with the seller. Coordinate the handover in chat.',
    wishlistSaved: 'Saved for later. The owl will keep an eye on it.',
    signedIn: 'Welcome back to the nest.',
  },
  error: {
    title: 'Oops, the owl dropped something. Try again?',
    generic: 'Something went sideways. Please try again.',
    offline: 'No signal. Even owls need wifi.',
    offlineTitle: 'You are offline',
    retry: 'Try again',
  },
  owl: {
    hoot: 'Hoot hoot!',
    easterEgg: 'Hoot hoot!',
    tapHint: 'Tap the owl for a hoot',
    napping: 'Zzz...',
    curious: 'Curious owl is watching.',
    shocked: 'Oh no — the owl dropped it.',
    celebrating: 'Hoot hoot!',
  },
  sell: {
    headerTitle: 'Sell on Campus',
    headerSubtitle: 'List a second-hand item',
    submit: 'Submit listing',
    submitting: 'Sending to the verifier...',
  },
  auth: {
    loginTitle: 'Thrifty Owl',
    loginSubtitle: 'Sign in with your university account',
    signupTitle: 'Create Account',
    signupTagline: 'Join your campus nest',
  },
} as const;

/** Small helper for rotating loading lines without repeating indices. */
export function pickVariant(lines: readonly string[], seed = Date.now()): string {
  return lines[Math.abs(seed) % lines.length] ?? lines[0] ?? '';
}

/** Heuristic for friendly offline headings; the raw error is still shown. */
export function isOfflineError(message?: string | null): boolean {
  if (!message) return false;
  return /network request failed|failed to fetch|network error|offline|timed out|timeout/i.test(message);
}
