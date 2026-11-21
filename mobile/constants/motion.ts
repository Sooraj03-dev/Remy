// mobile/constants/motion.ts
// Motion tokens — durations in ms, springs for Reanimated withSpring.

import type { WithSpringConfig } from 'react-native-reanimated';

export const Durations = {
  fast: 120,
  base: 200,
  slow: 320,
  lazy: 500,
} as const;

export const Springs = {
  /** Quick UI acknowledgement; settles almost instantly. */
  snappy: { damping: 18, stiffness: 240, mass: 0.7 },
  /** Playful overshoot for mascots, hearts and the raised Sell button. */
  bouncy: { damping: 11, stiffness: 260, mass: 0.8 },
  /** Calm drift for blobs and large surfaces. */
  gentle: { damping: 24, stiffness: 110, mass: 1 },
} as const satisfies Record<string, WithSpringConfig>;

export const Stagger = {
  step: 60,
  maxAnimatedItems: 10,
} as const;

export const Motion = {
  duration: Durations,
  spring: Springs,
  stagger: Stagger,
} as const;
