// mobile/components/fx/AnimatedTabBar.tsx
// Clay tab bar: sliding lavender pill, icon bounce, raised pulsing Sell button.

import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Icon } from '@components/ui/Icon';
import { ClayText } from '@components/ui/ClayText';
import { TabIcons, type IconName } from '@constants/icons';
import { Colors, Radius, Spacing } from '@constants/theme';
import { Springs } from '@constants/motion';

const BAR_HEIGHT = 64;
const SELL_INDEX = 2;

export function AnimatedTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const reduced = useReducedMotion();
  const [barWidth, setBarWidth] = useState(0);
  const indicator = useSharedValue(state.index);
  const pulse = useSharedValue(0);

  const count = state.routes.length;
  const itemWidth = barWidth > 0 ? barWidth / count : 0;
  const pillWidth = Math.max(0, itemWidth - 14);

  useEffect(() => {
    indicator.value = reduced ? state.index : withSpring(state.index, Springs.snappy);
  }, [indicator, reduced, state.index]);

  useEffect(() => {
    if (reduced) return;
    pulse.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 850, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 850, easing: Easing.inOut(Easing.sin) }),
        ),
        3,
        false,
      ),
    );
  }, [pulse, reduced]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicator.value * itemWidth + (itemWidth - pillWidth) / 2 }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.05 }],
  }));

  return (
    <View
      style={[styles.bar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      <Animated.View style={[styles.pill, { width: pillWidth }, indicatorStyle]} pointerEvents="none" />

      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        const label =
          typeof descriptor.options.tabBarLabel === 'string'
            ? descriptor.options.tabBarLabel
            : descriptor.options.title ?? route.name;
        const focused = state.index === index;
        const iconName = TabIcons[route.name] ?? 'Package';
        const isSell = index === SELL_INDEX;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.item}
          >
            {isSell ? (
              <Animated.View style={[styles.sellButton, reduced ? undefined : pulseStyle]}>
                <Icon name={iconName} size="lg" weight="bold" color="white" />
              </Animated.View>
            ) : (
              <TabGlyph name={iconName} focused={focused} reduced={reduced} />
            )}
            <ClayText
              variant="caption"
              color={focused ? 'primary' : 'textSecondary'}
              style={[styles.label, isSell && styles.sellLabel]}
              numberOfLines={1}
            >
              {label}
            </ClayText>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabGlyph({
  name,
  focused,
  reduced,
}: {
  name: IconName;
  focused: boolean;
  reduced: boolean;
}) {
  const bounce = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      bounce.value = 1;
      return;
    }
    bounce.value = focused
      ? withSequence(withSpring(1.18, Springs.bouncy), withSpring(1, Springs.bouncy))
      : withSpring(1, Springs.snappy);
  }, [bounce, focused, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: bounce.value }] }));

  return (
    <Animated.View style={[styles.glyph, animatedStyle]}>
      <Icon
        name={name}
        size="md"
        weight={focused ? 'fill' : 'regular'}
        color={focused ? 'primary' : 'rgba(52,41,73,0.6)'}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: 10,
    height: BAR_HEIGHT + 10,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 14,
    overflow: 'visible',
  },
  pill: {
    position: 'absolute',
    top: 6,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: `${Colors.primary}22`,
  },
  item: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    paddingTop: Spacing.xs,
  },
  glyph: { height: 28, alignItems: 'center', justifyContent: 'center' },
  sellButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    borderWidth: 4,
    borderColor: Colors.white,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
  },
  label: { fontSize: 10 },
  sellLabel: { marginTop: 0 },
});
