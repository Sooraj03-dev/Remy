// mobile/app/dev/motion-lab.tsx
// Dev-only gallery for the motion system. Guarded by __DEV__.

import React, { useState } from 'react';
import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  AnimatedOwl,
  ClayButton,
  ClayCard,
  ClayPressable,
  ClayText,
  CelebrationOverlay,
  FloatingBlobs,
  HeartBurst,
  OrderStepper,
  SkeletonCard,
  VerifiedBadge,
  useToast,
  type OwlMood,
} from '@components/index';
import { Colors, Spacing } from '@constants/theme';
import { Copy } from '@constants/copy';

const MOODS: OwlMood[] = ['idle', 'happy', 'curious', 'sleepy', 'shocked', 'celebrate'];

export default function MotionLabRoute() {
  if (!__DEV__) return <Redirect href="/(tabs)/home" />;
  return <MotionLab />;
}

function MotionLab() {
  const [mood, setMood] = useState<OwlMood>('idle');
  const [wishlisted, setWishlisted] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'placed' | 'confirmed' | 'meetup_arranged' | 'completed' | 'cancelled'>('placed');
  const { showToast } = useToast();

  return (
    <View style={styles.screen}>
      <FloatingBlobs variant="auth" />
      <ScrollView contentContainerStyle={styles.content}>
        <ClayText variant="h1">Motion lab</ClayText>
        <ClayText variant="caption">Dev-only. Not shipped in release builds.</ClayText>

        <ClayCard style={styles.card}>
          <ClayText variant="h3">AnimatedOwl</ClayText>
          <View style={styles.owl}>
            <AnimatedOwl mood={mood} size={170} />
          </View>
          <View style={styles.row}>
            {MOODS.map((item) => (
              <ClayButton
                key={item}
                label={item}
                variant={mood === item ? 'primary' : 'secondary'}
                onPress={() => setMood(item)}
                style={styles.chipButton}
              />
            ))}
          </View>
          <ClayText variant="caption">{Copy.owl.tapHint} — five quick taps for the easter egg.</ClayText>
        </ClayCard>

        <ClayCard style={styles.card}>
          <ClayText variant="h3">ClayPressable</ClayText>
          <ClayPressable style={styles.pressable} haptic>
            <ClayText variant="bodyBold">Squish me</ClayText>
          </ClayPressable>
          <ClayButton
            label="Toggle loading"
            loading={loading}
            onPress={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1800);
            }}
          />
          <ClayButton label="Disabled" disabled />
        </ClayCard>

        <ClayCard style={styles.card}>
          <ClayText variant="h3">HeartBurst</ClayText>
          <HeartBurst active={wishlisted} onPress={() => setWishlisted((value) => !value)} size={30} />
        </ClayCard>

        <ClayCard style={styles.card}>
          <ClayText variant="h3">VerifiedBadge</ClayText>
          <VerifiedBadge />
          <VerifiedBadge label="Verified listing" compact />
        </ClayCard>

        <ClayCard style={styles.card}>
          <ClayText variant="h3">SkeletonCard</ClayText>
          <SkeletonCard width={200} height={190} />
        </ClayCard>

        <ClayCard style={styles.card}>
          <ClayText variant="h3">OrderStepper</ClayText>
          <OrderStepper status={status} />
          <View style={styles.row}>
            {(['placed', 'confirmed', 'meetup_arranged', 'completed', 'cancelled'] as const).map((item) => (
              <ClayButton
                key={item}
                label={item.replace('_', ' ')}
                variant={status === item ? 'primary' : 'secondary'}
                onPress={() => setStatus(item)}
                style={styles.chipButton}
              />
            ))}
          </View>
        </ClayCard>

        <ClayCard style={styles.card}>
          <ClayText variant="h3">Toast</ClayText>
          <View style={styles.row}>
            <ClayButton label="Success" onPress={() => showToast(Copy.success.submitted, 'success')} style={styles.chipButton} />
            <ClayButton label="Error" variant="danger" onPress={() => showToast(Copy.error.title, 'error')} style={styles.chipButton} />
            <ClayButton label="Info" variant="secondary" onPress={() => showToast(Copy.loading.feed[1], 'info')} style={styles.chipButton} />
          </View>
        </ClayCard>

        <ClayCard style={styles.card}>
          <ClayText variant="h3">CelebrationOverlay</ClayText>
          <ClayButton label="Celebrate" onPress={() => setCelebrating(true)} />
        </ClayCard>
      </ScrollView>

      <CelebrationOverlay
        visible={celebrating}
        title={Copy.success.approved}
        message={Copy.success.orderPlacedBody}
        onDismiss={() => setCelebrating(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  card: { gap: Spacing.sm },
  owl: { alignItems: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chipButton: { minHeight: 38, paddingVertical: 6, paddingHorizontal: 12 },
  pressable: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 7,
  },
});
