// mobile/constants/copy.ts
// One place for user-facing microcopy. Real API/error details are never replaced
// by these strings — they are shown alongside, or used only as the headline.

export const Copy = {
  app: {
    name: 'Remy',
    tagline: 'Buy and sell on campus',
  },
  loading: {
    feed: [
      'Fetching fresh deals...',
      'Sniffing out campus deals...',
      'Checking the campus feed...',
    ],
    search: ['Looking through listings...', 'Checking for matches...'],
    product: ['Loading this listing...', 'Getting the listing details...'],
    orders: ['Checking your deals...', 'Loading your orders...'],
    chats: ['Opening your chats...', 'Fetching your conversations...'],
    checkout: ['Getting the meetup ready...', 'Checking the handshake details...'],
  },
  empty: {
    listings: 'List an item to get the campus feed started.',
    listingsTitle: 'No listings yet',
    search: 'Try a different search term.',
    searchTitle: 'No treasures found',
    orders: 'No orders yet. Your first campus deal is one tap away.',
    ordersTitle: 'No deals yet',
    chats: 'Place an order to start a conversation.',
    chatsTitle: 'No chats yet',
    wishlist: 'Your wishlist is empty. Tap a heart to keep an eye on a find.',
  },
  success: {
    submitted: 'Listing submitted for review',
    approved: "You're live! Your stuff is now on the campus feed.",
    orderPlaced: 'Deal locked in! Time to plan the meetup.',
    orderPlacedBody: 'Your order is with the seller. Coordinate the handover in chat.',
    wishlistSaved: 'Saved to your wishlist.',
    signedIn: 'Welcome back.',
  },
  error: {
    title: 'Something went wrong',
    generic: 'Something went sideways. Please try again.',
    offline: 'Check your connection and try again.',
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
    loginSubtitle: 'Sign in with your university account',
    signupTitle: 'Create Account',
    signupTagline: 'Join your campus marketplace',
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
