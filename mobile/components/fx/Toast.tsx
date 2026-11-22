// mobile/components/fx/Toast.tsx
// Clay toast (success / error / info) sliding in from the top, swipe to dismiss.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@components/ui/Icon';
import { ClayText } from '@components/ui/ClayText';
import { Colors, Radius, Spacing } from '@constants/theme';
import type { IconName } from '@constants/icons';

export type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, IconName> = {
  success: 'SealCheck',
  error: 'XCircle',
  info: 'Bell',
};

const ACCENTS: Record<ToastType, string> = {
  success: Colors.successText,
  error: Colors.error,
  info: Colors.primary,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; type: ToastType } | null>(null);
  const counter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    counter.current += 1;
    setToast({ id: counter.current, message, type });
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <ToastView
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast((current) => (current?.id === toast.id ? null : current))}
        />
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // Keeps components usable outside the provider (e.g. isolated previews).
    return { showToast: () => undefined };
  }
  return context;
}

function ToastView({
  message,
  type,
  onHide,
}: {
  message: string;
  type: ToastType;
  onHide: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const translateY = useSharedValue(-90);
  const opacity = useSharedValue(0);
  const dragY = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    opacity.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) runOnJS(onHide)();
    });
    translateY.value = withTiming(-90, { duration: 160 });
  }, [onHide, opacity, translateY]);

  useEffect(() => {
    translateY.value = reduced ? 0 : withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 200 });
    timer.current = setTimeout(dismiss, 3200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [dismiss, opacity, reduced, translateY]);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) dragY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY < -24) {
        dragY.value = withTiming(-120, { duration: 160 }, (finished) => {
          if (finished) runOnJS(onHide)();
        });
      } else {
        dragY.value = withTiming(0, { duration: 160 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value + dragY.value }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.layer, { paddingTop: insets.top + Spacing.sm }]}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.toast, animatedStyle]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <View style={[styles.iconWrap, { backgroundColor: `${ACCENTS[type]}22` }]}>
            <Icon name={ICONS[type]} size="sm" weight="fill" color={ACCENTS[type]} />
          </View>
          <ClayText variant="bodyBold" style={styles.message}>
            {message}
          </ClayText>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    zIndex: 1200,
    elevation: 120,
  },
  toast: {
    width: '90%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1 },
});
