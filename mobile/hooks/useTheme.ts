// mobile/hooks/useTheme.ts
// Convenience hook for accessing theme tokens

import { Colors, Spacing, Radius, Typography, clayElevation } from '@constants/theme';

export function useTheme() {
  return { Colors, Spacing, Radius, Typography, clayElevation };
}

