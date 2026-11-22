import React, { useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ClayButton } from '@components/clay/ClayButton';
import { ClayCard } from '@components/clay/ClayCard';
import { ClayText } from '@components/ui/ClayText';
import { RemyArt } from '@components/ui/RemyArt';
import { Copy, isOfflineError } from '@constants/copy';
import { Spacing } from '@constants/theme';

interface MarketplaceErrorProps {
  error: string;
  onRetry: () => Promise<void>;
  style?: StyleProp<ViewStyle>;
}

export function MarketplaceError({ error, onRetry, style }: MarketplaceErrorProps) {
  const [retrying, setRetrying] = useState(false);
  const offline = isOfflineError(error);

  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <ClayCard outlined style={[styles.card, style]}>
      <RemyArt size={82} pose="dizzy" />
      <ClayText variant="h3" align="center">
        {offline ? Copy.error.offlineTitle : Copy.error.title}
      </ClayText>
      <ClayText variant="body" color="textSecondary" align="center">
        {offline ? Copy.error.offline : error}
      </ClayText>
      <ClayButton label={Copy.error.retry} onPress={retry} loading={retrying} style={styles.retry} />
    </ClayCard>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', padding: Spacing.lg, gap: Spacing.xs },
  retry: { marginTop: Spacing.sm, minWidth: 130 },
});
