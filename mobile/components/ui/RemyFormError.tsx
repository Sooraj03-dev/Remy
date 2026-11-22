import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors, Radius, Spacing } from '@constants/theme';
import { ClayText } from './ClayText';
import { DizzyRemy } from './RemyReactions';

export function useRemyFormFeedback(error: string | null, submit: () => Promise<void>) {
  const [previousError, setPreviousError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const onSubmit = async () => {
    if (!error) return submit();
    setAttempt((count) => count + 1);
    setPreviousError(error);
    try {
      await submit();
    } finally {
      setPreviousError(null);
    }
  };

  return { message: error ?? previousError, attempt, onSubmit };
}

export function RemyFormError({ message, attempt }: { message: string | null; attempt: number }) {
  if (!message) return null;

  return (
    <View style={styles.error} accessibilityLiveRegion="polite">
      <DizzyRemy size={52} attempt={attempt} />
      <ClayText variant="captionBold" color="errorText" style={styles.message}>{message}</ClayText>
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.errorBg,
    marginBottom: Spacing.xs,
  },
  message: { flex: 1 },
});
