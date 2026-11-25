// mobile/constants/motion.ts
// Motion tokens — durations in ms, easings, and springs for Reanimated.
// Micro: 120-180ms | Standard: 220-300ms | Large/Shared: 350-450ms.

import { Easing, type WithSpringConfig } from 'react-native-reanimated';

export const Durations = {
  fast: 140,
  micro: 150,
  base: 260,
  standard: 260,
  slow: 380,
  large: 400,
  lazy: 500,
} as const;

export const Easings = {
  enter: Easing.out(Easing.cubic),
  exit: Easing.in(Easing.cubic),
  standard: Easing.inOut(Easing.cubic),
} as const;

export const Springs = {
  /** Minimal-overshoot spring for presses and tab/chip selections. */
  snappy: { damping: 20, stiffness: 260, mass: 0.7 },
  /** Light spring for cards, hearts, and mascot hops with minimal overshoot. */
  bouncy: { damping: 14, stiffness: 240, mass: 0.8 },
  /** Calm drift for large surfaces and ambient loops. */
  gentle: { damping: 24, stiffness: 120, mass: 1 },
} as const satisfies Record<string, WithSpringConfig>;

export const Stagger = {
  step: 40,
  maxAnimatedItems: 8,
  riseDistance: 12,
} as const;

export const Motion = {
  duration: Durations,
  easing: Easings,
  spring: Springs,
  stagger: Stagger,
} as const;
