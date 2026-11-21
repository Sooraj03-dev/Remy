// mobile/components/fx/OrderStepper.tsx
// Animated order lifecycle: placed -> confirmed -> meetup -> completed.

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import type { OrderStatus } from '@shared/index';
import { Icon } from '@components/ui/Icon';
import { ClayText } from '@components/ui/ClayText';
import { Colors, Radius, Spacing } from '@constants/theme';

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'meetup_arranged', label: 'Meetup' },
  { key: 'completed', label: 'Completed' },
];

export interface OrderStepperProps {
  status: OrderStatus;
  compact?: boolean;
}

export function OrderStepper({ status, compact = false }: OrderStepperProps) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const closed = status === 'cancelled' || status === 'refunded';
  const activeIndex = STEPS.findIndex((step) => step.key === status);
  const progress = closed ? 0 : Math.max(0, activeIndex) / (STEPS.length - 1);
  const line = useSharedValue(0);

  useEffect(() => {
    line.value = reduced
      ? progress
      : withTiming(progress, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [line, progress, reduced]);

  const lineStyle = useAnimatedStyle(() => ({ width: line.value * width }));

  if (closed) {
    return (
      <View style={[styles.closedRow, compact && styles.closedCompact]}>
        <Icon name="XCircle" size="sm" weight="fill" color="error" />
        <ClayText variant="captionBold" color="error">
          {status === 'refunded' ? 'Order refunded' : 'Order cancelled'}
        </ClayText>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityLabel={`Order progress: step ${Math.max(1, activeIndex + 1)} of ${STEPS.length}`}
    >
      <View style={[styles.track, { top: compact ? 13 : 15 }]}>
        <View style={styles.trackBg} />
        <Animated.View style={[styles.trackFill, lineStyle]} />
      </View>

      <View style={styles.steps}>
        {STEPS.map((step, index) => {
          const reached = index <= activeIndex;
          return (
            <View key={step.key} style={styles.step}>
              <View style={[styles.dotWrap, compact && styles.dotCompact]}>
                <View style={[styles.dot, reached && styles.dotReached]} />
                {reached ? <View style={styles.dotInner} /> : null}
              </View>
              <ClayText
                variant="caption"
                color={reached ? 'text' : 'textSecondary'}
                align="center"
                numberOfLines={1}
                style={styles.stepLabel}
              >
                {step.label}
              </ClayText>
            </View>
          );
        })}
      </View>

      {status === 'completed' && !reduced ? (
        <View style={styles.confetti} pointerEvents="none">
          <ConfettiCannon
            count={40}
            origin={{ x: width / 2, y: 12 }}
            autoStart
            fadeOut
            fallSpeed={2600}
            colors={[Colors.primary, Colors.mint, Colors.peach]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', paddingVertical: Spacing.xs, position: 'relative' },
  track: { position: 'absolute', left: '8%', right: '8%', height: 4, justifyContent: 'center' },
  trackBg: { height: 4, borderRadius: 2, backgroundColor: Colors.border },
  trackFill: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: Colors.primary },
  steps: { flexDirection: 'row', justifyContent: 'space-between' },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  dotWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  dotCompact: { width: 26, height: 26 },
  dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.border },
  dotReached: { backgroundColor: Colors.primary },
  dotInner: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  stepLabel: { fontSize: 10 },
  closedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.peach,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  closedCompact: { paddingVertical: 4 },
  confetti: { ...StyleSheet.absoluteFillObject, overflow: 'visible' },
});
