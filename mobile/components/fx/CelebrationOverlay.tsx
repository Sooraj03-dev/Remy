// mobile/components/fx/CelebrationOverlay.tsx
// Confetti for listing submissions, approvals, and orders.

import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import { AnimatedCheckDraw } from '@components/fx/MotionPrimitives';
import { CelebratingRemy, NibblingRemy } from '@components/ui/RemyReactions';
import { ClayText } from '@components/ui/ClayText';
import { Colors, Radius, Spacing } from '@constants/theme';

export interface CelebrationOverlayProps {
  visible: boolean;
  title: string;
  message?: string;
  onDismiss: () => void;
  autoDismissMs?: number;
  pendingApproval?: boolean;
}

const CONFETTI_COLORS = [Colors.primary, Colors.successBg, Colors.accent, Colors.white, Colors.text];

export function CelebrationOverlay({
  visible,
  title,
  message,
  onDismiss,
  autoDismissMs = 2500,
  pendingApproval = false,
}: CelebrationOverlayProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    progress.value = reduced ? 1 : withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    timer.current = setTimeout(onDismiss, autoDismissMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [autoDismissMs, onDismiss, progress, reduced, visible]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + progress.value * 0.08 }, { translateY: (1 - progress.value) * 16 }],
  }));

  if (!visible) return null;

  return (
    <Animated.View entering={reduced ? undefined : FadeIn.duration(160)} style={styles.overlay}>
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss celebration"
      />
      {!reduced && !pendingApproval ? (
        <View style={styles.confetti} pointerEvents="none">
          <ConfettiCannon
            count={110}
            origin={{ x: 0, y: 0 }}
            autoStart
            fadeOut
            fallSpeed={2600}
            explosionSpeed={420}
            colors={CONFETTI_COLORS}
          />
        </View>
      ) : null}

      <Animated.View style={[styles.card, cardStyle]}>
        {pendingApproval ? <NibblingRemy size={130} /> : <CelebratingRemy size={145} />}
        {!pendingApproval ? <AnimatedCheckDraw visible={visible} size={44} /> : null}
        <ClayText variant="h2" align="center" style={styles.title}>
          {title}
        </ClayText>
        {message ? (
          <ClayText variant="body" color="textSecondary" align="center">
            {message}
          </ClayText>
        ) : null}
        <ClayText variant="caption" color="textSecondary" align="center" style={styles.hint}>
          Tap anywhere to continue
        </ClayText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 900,
    elevation: 90,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  confetti: { ...StyleSheet.absoluteFillObject, overflow: 'visible' },
  card: {
    width: '82%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 6, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 16,
  },
  title: { marginTop: Spacing.xs },
  hint: { marginTop: Spacing.xs },
});
