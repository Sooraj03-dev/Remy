import { useEffect, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useAnimatedScrollHandler, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { Springs } from '@constants/motion';

export function useFeedMascot(refreshing: boolean, focused: boolean) {
  const reduced = useReducedMotion();
  const pull = useSharedValue(0);
  const offset = useSharedValue(0);
  const browsingTime = useSharedValue(0);
  const firstX = useSharedValue(0);
  const firstY = useSharedValue(0);
  const tracking = useSharedValue(false);
  const busy = useSharedValue(refreshing);

  useEffect(() => {
    busy.value = refreshing;
    if (!focused) {
      pull.value = 0;
      tracking.value = false;
    }
  }, [busy, focused, pull, refreshing, tracking]);

  const gesture = useMemo(() => {
    // Observe the drag without activating a gesture that could claim scrolling or taps.
    const observePull = Gesture.Manual()
      .onTouchesDown((event) => {
        const touch = event.allTouches[0];
        tracking.value = focused && !busy.value && offset.value <= 1 && event.numberOfTouches === 1;
        if (tracking.value && touch) {
          firstX.value = touch.absoluteX;
          firstY.value = touch.absoluteY;
        }
      })
      .onTouchesMove((event) => {
        const touch = event.allTouches[0];
        if (!tracking.value || !touch || busy.value) return;
        const down = touch.absoluteY - firstY.value;
        const across = Math.abs(touch.absoluteX - firstX.value);
        pull.value = down > across && down > 7 ? Math.min(64, (down - 7) * 0.72) : 0;
      })
      .onTouchesUp((_, manager) => {
        tracking.value = false;
        pull.value = reduced ? 0 : withSpring(0, Springs.snappy);
        manager.fail();
      })
      .onTouchesCancelled(() => {
        tracking.value = false;
        pull.value = reduced ? 0 : withSpring(0, Springs.snappy);
      });

    return Gesture.Simultaneous(Gesture.Native(), observePull);
  }, [busy, firstX, firstY, focused, offset, pull, reduced, tracking]);

  const onFeedScroll = useAnimatedScrollHandler(({ contentOffset }) => {
    const y = contentOffset.y;
    // iOS and Android overscroll
    if (focused && !busy.value && y < 0) {
      pull.value = Math.min(64, -y);
    } else if (pull.value !== 0) {
      pull.value = 0;
    }
    offset.value = y;
  });
  const onProductScroll = useAnimatedScrollHandler(() => {
    // Lightweight product scroll tracking
  });

  return { gesture, onFeedScroll, onProductScroll, pull, browsingTime };
}
