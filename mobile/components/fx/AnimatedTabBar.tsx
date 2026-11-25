import React, { useCallback, useEffect } from 'react';
import { I18nManager, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { ClayCard } from '@components/clay/ClayCard';
import { ClayPressable } from '@components/fx/ClayPressable';
import { ClayText } from '@components/ui/ClayText';
import { AppIcon } from '@components/ui/AppIcon';
import { TabIcons, type IconName } from '@constants/icons';
import { Colors, Radius, Spacing } from '@constants/theme';
import { Springs } from '@constants/motion';

const dockSpring = { ...Springs.snappy, overshootClamping: true };

function TabGlyph({ name, focused, isSell }: { name: IconName; focused: boolean; isSell: boolean }) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);

  useEffect(() => {
    if (focused && !reduced) {
      pop.value = withSequence(
        withSpring(1.12, Springs.snappy),
        withSpring(1, Springs.bouncy),
      );
    }
  }, [focused, pop, reduced]);

  const emphasis = useDerivedValue(() => {
    const target = focused ? 1 : 0;
    return reduced ? target : withSpring(target, dockSpring);
  });
  const glyphStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * emphasis.value }, { scale: pop.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={glyphStyle}>
      <AppIcon
        name={name}
        size={isSell ? 24 : 22}
        variant={focused && !isSell ? 'duotone' : 'line'}
        tint={isSell ? 'background' : focused ? 'primary' : 'textSecondary'}
      />
    </Animated.View>
  );
}

export function AnimatedTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const reduced = useReducedMotion();
  const rowWidth = useSharedValue(0);
  const indicator = useSharedValue(state.index);
  const slotCount = state.routes.length;
  const direction = I18nManager.isRTL ? -1 : 1;
  const measureRow = useCallback((event: LayoutChangeEvent) => {
    rowWidth.value = event.nativeEvent.layout.width;
  }, [rowWidth]);

  useEffect(() => {
    indicator.value = reduced ? state.index : withSpring(state.index, dockSpring);
  }, [indicator, reduced, state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: rowWidth.value > 0 ? 1 : 0,
    transform: [{ translateX: direction * indicator.value * rowWidth.value / slotCount }],
  }));

  return (
    <View style={[styles.inset, { paddingBottom: insets.bottom }]}>
      <ClayCard style={styles.dock} outlined>
        <View
          accessibilityRole="tablist"
          onLayout={measureRow}
          style={styles.row}
        >
          <Animated.View
            style={[styles.indicatorSlot, { width: `${100 / slotCount}%` }, indicatorStyle]}
            pointerEvents="none"
          >
            <View style={styles.pill} />
          </Animated.View>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
            const focused = state.index === index;
            const isSell = route.name === 'sell';
            const ink = isSell ? 'background' : focused ? 'primary' : 'textSecondary';

            return (
              <View key={route.key} style={styles.slot}>
                <ClayPressable
                  onPress={() => {
                    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                  }}
                  onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                  testID={options.tabBarTestID}
                  haptic={isSell || !focused}
                  tone={isSell ? 'espresso' : undefined}
                  pressScale={0.95}
                  style={[styles.item, isSell && styles.sell]}
                >
                  <TabGlyph name={TabIcons[route.name] ?? 'Package'} focused={focused} isSell={isSell} />
                  <ClayText variant="captionBold" color={ink} style={styles.label} numberOfLines={1}>
                    {label}
                  </ClayText>
                </ClayPressable>
              </View>
            );
          })}
        </View>
      </ClayCard>
    </View>
  );
}

const styles = StyleSheet.create({
  inset: { backgroundColor: Colors.background },
  dock: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  indicatorSlot: {
    position: 'absolute',
    start: 0,
    top: Spacing.xs,
    bottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  pill: {
    flex: 1,
    borderRadius: Radius.card,
    backgroundColor: Colors.accentSoft,
  },
  slot: { flex: 1, minWidth: 0 },
  item: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 1,
  },
  sell: {
    alignSelf: 'center',
    width: '98%',
    minWidth: 44,
    minHeight: 52,
    marginTop: -4,
    borderRadius: Radius.card,
  },
  label: { fontSize: 10 },
});
