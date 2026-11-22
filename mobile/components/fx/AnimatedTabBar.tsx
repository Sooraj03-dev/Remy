import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { ClayCard } from '@components/clay/ClayCard';
import { ClayPressable } from '@components/fx/ClayPressable';
import { ClayText } from '@components/ui/ClayText';
import { Icon } from '@components/ui/Icon';
import { TabIcons } from '@constants/icons';
import { Colors, Radius, Spacing } from '@constants/theme';
import { Springs } from '@constants/motion';

export function AnimatedTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const indicator = useSharedValue(state.index);
  const itemWidth = width / state.routes.length;
  const pillWidth = Math.max(0, itemWidth - Spacing.sm);

  useEffect(() => {
    indicator.value = reduced ? state.index : withSpring(state.index, Springs.snappy);
  }, [indicator, reduced, state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (indicator.value + 0.5) * itemWidth - pillWidth / 2 }],
  }));

  return (
    <View style={[styles.inset, { paddingBottom: insets.bottom }]}>
      <ClayCard style={styles.dock} outlined>
        <View
          accessibilityRole="tablist"
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          style={styles.row}
        >
          <Animated.View
            style={[styles.pill, { width: pillWidth }, indicatorStyle]}
            pointerEvents="none"
          />
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
                  accessibilityLabel={label}
                  haptic={isSell || !focused}
                  tone={isSell ? 'espresso' : undefined}
                  pressScale={0.95}
                  style={[styles.item, isSell && styles.sell]}
                >
                  <Icon name={TabIcons[route.name] ?? 'Package'} size={isSell ? 24 : 21} color={ink} />
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
  pill: {
    position: 'absolute',
    top: Spacing.xs,
    bottom: Spacing.xs,
    borderRadius: Radius.card,
    backgroundColor: Colors.primarySoft,
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
