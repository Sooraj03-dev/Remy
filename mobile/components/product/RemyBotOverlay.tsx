// mobile/components/product/RemyBotOverlay.tsx
// Interactive draggable Remy mouse bot: drag onto any product card for a live summary without clicking.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { ClayCard } from '@components/clay/ClayCard';
import { ClayPressable } from '@components/fx/ClayPressable';
import { AppIcon } from '@components/ui/AppIcon';
import { ClayText } from '@components/ui/ClayText';
import { REMY_FACE, RemyArt, RemyLayer } from '@components/ui/RemyArt';
import { Durations, Springs } from '@constants/motion';
import { Colors, Radius, Spacing, clayElevation } from '@constants/theme';
import {
  generateProductBotBrief,
  type BotTopic,
  type BotVerdict,
} from '../../utils/productSummary';
import type { Product } from '../../../shared/types';

export interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RegisteredCard {
  product: Product;
  ref: React.RefObject<View | null>;
}

interface MeasuredCard {
  product: Product;
  rect: CardRect;
}

interface RemyScoutContextValue {
  activeProductId: string | null;
  scoutMode: 'idle' | 'dragging' | 'perched';
  registerCard: (id: string, product: Product, ref: React.RefObject<View | null>) => void;
  unregisterCard: (id: string) => void;
  onPointerHoverCard: (product: Product, ref: React.RefObject<View | null>) => void;
  onPointerLeaveCard: (productId: string) => void;
}

const RemyScoutContext = createContext<RemyScoutContextValue | null>(null);

export function useOptionalRemyScout() {
  return useContext(RemyScoutContext);
}

interface RemyScoutHostProps {
  children: React.ReactNode;
  focused?: boolean;
  hidden?: boolean;
  browsingTime?: SharedValue<number>;
}

type ScoutMode = 'idle' | 'dragging' | 'perched';

const ROAM_SIZE = 54;
const HIT_PADDING = 14;
const REST_STOPS = [0.84, 0.14, 0.56, 0.08, 0.92, 0.36];
const RESTING_BODY = ['body', ...REMY_FACE, 'paws'] as const;

const TOPIC_PILLS: { key: Exclude<BotTopic, 'summary'>; label: string }[] = [
  { key: 'condition', label: 'Condition?' },
  { key: 'deal', label: 'Deal check' },
  { key: 'meetup', label: 'Meetup' },
];

const GROUND_SHADOW = (
  <Svg width={48} height={12} viewBox="0 0 48 12">
    <Defs>
      <RadialGradient id="remy-scout-ground">
        <Stop offset="0" stopColor={Colors.shadowColor} stopOpacity={0.36} />
        <Stop offset="1" stopColor={Colors.shadowColor} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Ellipse cx={24} cy={6} rx={24} ry={6} fill="url(#remy-scout-ground)" />
  </Svg>
);

const HOP_SPARKLES = (
  <Svg width={38} height={24} viewBox="0 0 38 24">
    <Path
      d="M19 3L21 8L26 10L21 12L19 17L17 12L12 10L17 8ZM7 11L8 14L11 15L8 16L7 19L6 16L3 15L6 14ZM31 12L32 15L35 16L32 17L31 20L30 17L27 16L30 15Z"
      fill={Colors.accent}
    />
  </Svg>
);

function getVerdictColors(tone: BotVerdict['tone']) {
  switch (tone) {
    case 'success':
      return { bg: Colors.successBg, text: Colors.successText };
    case 'error':
      return { bg: Colors.errorBg, text: Colors.errorText };
    case 'accent':
      return { bg: Colors.accentSoft, text: Colors.primary };
    default:
      return { bg: Colors.primarySoft, text: Colors.primary };
  }
}

export function RemyScoutHost({
  children,
  focused = true,
  hidden = false,
  browsingTime,
}: RemyScoutHostProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<View | null>(null);

  // Registered visible product cards
  const cardsMapRef = useRef<Map<string, RegisteredCard>>(new Map());
  const measuredCardsRef = useRef<MeasuredCard[]>([]);
  const containerWindowRef = useRef<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // React state for UI bubble & card highlights
  const [scoutMode, setScoutMode] = useState<ScoutMode>('idle');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeRect, setActiveRect] = useState<CardRect | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<BotTopic>('summary');
  const [showOnboardingHint, setShowOnboardingHint] = useState(true);
  const [tapHintVisible, setTapHintVisible] = useState(false);
  const [containerHeight, setContainerHeight] = useState(680);

  const scoutModeRef = useRef<ScoutMode>('idle');
  const activeProductIdRef = useRef<string | null>(null);
  const activeRectRef = useRef<CardRect | null>(null);
  const tapHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reanimated shared values
  const containerW = useSharedValue(0);
  const containerH = useSharedValue(0);
  const scurryClock = useSharedValue(0);
  const position = useSharedValue(REST_STOPS[0]);
  const restingPlace = useSharedValue(REST_STOPS[0]);
  const facing = useSharedValue(1);
  const walk = useSharedValue(0);
  const breath = useSharedValue(0);
  const blink = useSharedValue(1);
  const wag = useSharedValue(0);
  const hop = useSharedValue(0);
  const squash = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const pop = useSharedValue(0);
  const popLift = useSharedValue(0);

  // Drag / perch translation offsets relative to the current dock slot
  const isDraggingSV = useSharedValue(false);
  const isEngagedSV = useSharedValue(false); // true during drag OR perch
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const startDragX = useSharedValue(0);
  const startDragY = useSharedValue(0);
  const grabScale = useSharedValue(1);
  const radarPulse = useSharedValue(0);

  const isPaused = hidden || !focused;

  const updateScoutState = useCallback(
    (nextMode: ScoutMode, product: Product | null, rect: CardRect | null) => {
      scoutModeRef.current = nextMode;
      activeProductIdRef.current = product?.id ?? null;
      activeRectRef.current = rect;
      setScoutMode(nextMode);
      setActiveProduct(product);
      setActiveRect(rect);
      if (nextMode === 'idle') {
        setSelectedTopic('summary');
      }
    },
    [],
  );

  // Measure host & all mounted cards in local container coordinates
  const measureVisibleCards = useCallback(() => {
    const host = containerRef.current;
    if (!host) return;

    host.measureInWindow((ox, oy, ow, oh) => {
      containerWindowRef.current = { x: ox, y: oy, width: ow, height: oh };
      const entries = Array.from(cardsMapRef.current.entries());
      if (entries.length === 0) {
        measuredCardsRef.current = [];
        return;
      }

      const nextMeasured: MeasuredCard[] = [];
      let pending = entries.length;

      entries.forEach(([_id, entry]) => {
        const node = entry.ref.current;
        if (!node) {
          pending -= 1;
          if (pending === 0) measuredCardsRef.current = nextMeasured;
          return;
        }
        node.measureInWindow((cx, cy, cw, ch) => {
          if (cw > 0 && ch > 0) {
            nextMeasured.push({
              product: entry.product,
              rect: {
                x: cx - ox,
                y: cy - oy,
                width: cw,
                height: ch,
              },
            });
          }
          pending -= 1;
          if (pending === 0) {
            measuredCardsRef.current = nextMeasured;
          }
        });
      });
    });
  }, []);

  const triggerSparkle = useCallback(() => {
    runOnUI(() => {
      'worklet';
      pop.value = withSequence(
        withTiming(1, { duration: 0 }),
        withDelay(220, withTiming(0, { duration: 380 })),
      );
      if (!reducedMotion) {
        popLift.value = withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(-22, { duration: 520 }),
        );
        wiggle.value = withSequence(
          withTiming(-12, { duration: 65 }),
          withTiming(10, { duration: 80 }),
          withSpring(0, Springs.snappy),
        );
        wag.value = withSequence(
          withRepeat(withSequence(withTiming(-14, { duration: 80 }), withTiming(14, { duration: 80 })), 3),
          withSpring(0, Springs.snappy),
        );
      }
    })();
  }, [pop, popLift, reducedMotion, wag, wiggle]);

  const recallRemy = useCallback(() => {
    updateScoutState('idle', null, null);
    runOnUI(() => {
      'worklet';
      isDraggingSV.value = false;
      isEngagedSV.value = false;
      grabScale.value = reducedMotion ? 1 : withSpring(1, Springs.snappy);
      dragX.value = reducedMotion ? 0 : withSpring(0, Springs.bouncy);
      dragY.value = reducedMotion ? 0 : withSpring(0, Springs.bouncy);
      cancelAnimation(radarPulse);
      radarPulse.value = 0;
    })();
  }, [dragX, dragY, grabScale, isDraggingSV, isEngagedSV, radarPulse, reducedMotion, updateScoutState]);

  // Clear state when screen loses focus
  useEffect(() => {
    if (!focused && scoutModeRef.current !== 'idle') {
      recallRemy();
    }
  }, [focused, recallRemy]);

  // Idle ambient breathing, blinking, and horizontal scurrying
  useEffect(() => {
    if (isPaused || reducedMotion) return;

    runOnUI(() => {
      'worklet';
      breath.value = withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
      blink.value = withRepeat(
        withSequence(
          withDelay(3600, withTiming(0.12, { duration: 80 })),
          withTiming(1, { duration: 110 }),
          withDelay(4800, withTiming(0.12, { duration: 75 })),
          withTiming(1, { duration: 110 }),
        ),
        -1,
      );

      function scheduleScurry() {
        scurryClock.value = withDelay(
          6500 + Math.random() * 4000,
          withTiming(1 - scurryClock.value, { duration: 0 }, (finished) => {
            if (!finished) return;
            if (!isEngagedSV.value) {
              const stop = restingPlace.value;
              const choices = REST_STOPS.filter((next) => Math.abs(next - stop) > 0.2);
              const next = choices[Math.floor(Math.random() * choices.length)] ?? REST_STOPS[0];
              facing.value = next > stop ? -1 : 1;
              position.value = withTiming(next, {
                duration: 760,
                easing: Easing.inOut(Easing.quad),
              });
              walk.value = withSequence(
                withTiming(1, { duration: 650, easing: Easing.linear }),
                withTiming(0, { duration: 110 }),
              );
              restingPlace.value = next;
            }
            scheduleScurry();
          }),
          ReduceMotion.Never,
        );
      }

      scheduleScurry();
    })();

    return () => {
      runOnUI(() => {
        'worklet';
        cancelAnimation(scurryClock);
        cancelAnimation(breath);
        cancelAnimation(blink);
        breath.value = 0;
        blink.value = 1;
        walk.value = 0;
      })();
    };
  }, [
    blink,
    breath,
    browsingTime,
    facing,
    isEngagedSV,
    isPaused,
    position,
    reducedMotion,
    restingPlace,
    scurryClock,
    walk,
  ]);

  const onContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      containerW.value = width;
      containerH.value = height;
      if (height > 0) setContainerHeight(height);
    },
    [containerH, containerW],
  );

  // Called on drag start
  const handleDragStartJS = useCallback(() => {
    setShowOnboardingHint(false);
    setTapHintVisible(false);
    if (tapHintTimerRef.current) clearTimeout(tapHintTimerRef.current);
    scoutModeRef.current = 'dragging';
    setScoutMode('dragging');
    setSelectedTopic('summary');

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }
    measureVisibleCards();
    // Second pass slightly later to catch any post-spring layout settles
    setTimeout(measureVisibleCards, 120);
  }, [measureVisibleCards]);

  // Hit-test Remy's visual center against measured product cards
  const hitTestAtJS = useCallback(
    (cx: number, cy: number) => {
      const measured = measuredCardsRef.current;
      let hit: MeasuredCard | null = null;
      for (let i = 0; i < measured.length; i += 1) {
        const { rect } = measured[i];
        if (
          cx >= rect.x - HIT_PADDING &&
          cx <= rect.x + rect.width + HIT_PADDING &&
          cy >= rect.y - HIT_PADDING &&
          cy <= rect.y + rect.height + HIT_PADDING
        ) {
          hit = measured[i];
          break;
        }
      }

      const nextId = hit?.product.id ?? null;
      if (nextId !== activeProductIdRef.current) {
        activeProductIdRef.current = nextId;
        activeRectRef.current = hit?.rect ?? null;
        setActiveProduct(hit?.product ?? null);
        setActiveRect(hit?.rect ?? null);
        setSelectedTopic('summary');
        if (hit) {
          if (Platform.OS !== 'web') {
            Haptics.selectionAsync().catch(() => undefined);
          }
          triggerSparkle();
        }
      }
    },
    [triggerSparkle],
  );

  // Called when finger lifts after dragging
  const handleDragEndJS = useCallback(() => {
    const currentProduct = activeProductIdRef.current
      ? measuredCardsRef.current.find((m) => m.product.id === activeProductIdRef.current)?.product ?? null
      : null;
    const rect = activeRectRef.current;

    if (currentProduct && rect) {
      scoutModeRef.current = 'perched';
      setScoutMode('perched');
      setActiveProduct(currentProduct);
      setActiveRect(rect);

      // Compute neat perch position near top-right corner of the card
      const w = containerW.value;
      const h = containerH.value;
      const span = Math.max(0, w - ROAM_SIZE - Spacing.base * 2);
      const baseX = Spacing.base + position.value * span;
      const dockY = Math.max(0, h - ROAM_SIZE - 4);

      const targetLeft = Math.max(
        Spacing.sm,
        Math.min(w - ROAM_SIZE - Spacing.sm, rect.x + rect.width - ROAM_SIZE * 0.72),
      );
      const targetTop = Math.max(
        Spacing.sm,
        Math.min(h - ROAM_SIZE - Spacing.sm, rect.y - ROAM_SIZE * 0.38),
      );

      const targetDX = targetLeft - baseX;
      const targetDY = targetTop - dockY;

      runOnUI(() => {
        'worklet';
        isDraggingSV.value = false;
        isEngagedSV.value = true;
        grabScale.value = reducedMotion ? 1 : withSpring(1.06, Springs.snappy);
        dragX.value = reducedMotion ? targetDX : withSpring(targetDX, Springs.bouncy);
        dragY.value = reducedMotion ? targetDY : withSpring(targetDY, Springs.bouncy);
      })();

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }
    } else {
      recallRemy();
    }
  }, [containerH, containerW, dragX, dragY, grabScale, isDraggingSV, isEngagedSV, position, recallRemy, reducedMotion]);

  const handleTapRemyJS = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    if (scoutModeRef.current === 'perched') {
      // Cycle through quick interactive bot topics on tap while perched
      setSelectedTopic((prev) => {
        const order: BotTopic[] = ['summary', 'condition', 'deal', 'meetup'];
        const idx = order.indexOf(prev);
        return order[(idx + 1) % order.length];
      });
      triggerSparkle();
      return;
    }

    setTapHintVisible(true);
    if (tapHintTimerRef.current) clearTimeout(tapHintTimerRef.current);
    tapHintTimerRef.current = setTimeout(() => {
      setTapHintVisible(false);
    }, 3200);

    runOnUI(() => {
      'worklet';
      pop.value = withSequence(
        withTiming(1, { duration: 0 }),
        withDelay(200, withTiming(0, { duration: 420 })),
      );
      if (reducedMotion) return;
      squash.value = withSequence(withTiming(1, { duration: 70 }), withSpring(0, Springs.snappy));
      popLift.value = withSequence(withTiming(0, { duration: 0 }), withTiming(-22, { duration: 540 }));
      hop.value = withSequence(withTiming(-15, { duration: 140 }), withSpring(0, Springs.bouncy));
      wiggle.value = withSequence(
        withTiming(-14, { duration: 80 }),
        withTiming(11, { duration: 100 }),
        withSpring(0, Springs.snappy),
      );
    })();
  }, [hop, pop, popLift, reducedMotion, squash, triggerSparkle, wiggle]);

  // Combined Pan + Tap gesture on Remy
  const remyGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(6)
      .hitSlop(12)
      .onStart(() => {
        isDraggingSV.value = true;
        isEngagedSV.value = true;
        startDragX.value = dragX.value;
        startDragY.value = dragY.value;
        cancelAnimation(position);
        cancelAnimation(scurryClock);
        walk.value = 0;
        grabScale.value = reducedMotion ? 1 : withSpring(1.18, Springs.snappy);
        if (!reducedMotion) {
          radarPulse.value = withRepeat(
            withTiming(1, { duration: 950, easing: Easing.inOut(Easing.sin) }),
            -1,
            true,
          );
        }
        runOnJS(handleDragStartJS)();
      })
      .onUpdate((event) => {
        dragX.value = startDragX.value + event.translationX;
        dragY.value = startDragY.value + event.translationY;

        const span = Math.max(0, containerW.value - ROAM_SIZE - Spacing.base * 2);
        const baseX = Spacing.base + position.value * span;
        const dockY = Math.max(0, containerH.value - ROAM_SIZE - 4);
        const cx = baseX + dragX.value + ROAM_SIZE / 2;
        const cy = dockY + dragY.value + ROAM_SIZE / 2;

        runOnJS(hitTestAtJS)(cx, cy);
      })
      .onEnd(() => {
        runOnJS(handleDragEndJS)();
      })
      .onFinalize((_, success) => {
        if (!success && isDraggingSV.value) {
          runOnJS(handleDragEndJS)();
        }
      });

    const tap = Gesture.Tap().hitSlop(12).onEnd(() => {
      runOnJS(handleTapRemyJS)();
    });

    return Gesture.Exclusive(pan, tap);
  }, [
    containerH,
    containerW,
    dragX,
    dragY,
    grabScale,
    handleDragEndJS,
    handleDragStartJS,
    handleTapRemyJS,
    hitTestAtJS,
    isDraggingSV,
    isEngagedSV,
    position,
    radarPulse,
    reducedMotion,
    scurryClock,
    startDragX,
    startDragY,
    walk,
  ]);

  // Context callbacks for ProductCard
  const registerCard = useCallback(
    (id: string, product: Product, ref: React.RefObject<View | null>) => {
      cardsMapRef.current.set(id, { product, ref });
    },
    [],
  );

  const unregisterCard = useCallback((id: string) => {
    cardsMapRef.current.delete(id);
  }, []);

  // Hardware mouse / web pointer hover support
  const onPointerHoverCard = useCallback(
    (product: Product, ref: React.RefObject<View | null>) => {
      if (hoverLeaveTimerRef.current) {
        clearTimeout(hoverLeaveTimerRef.current);
        hoverLeaveTimerRef.current = null;
      }
      const host = containerRef.current;
      const card = ref.current;
      if (!host || !card) return;

      host.measureInWindow((ox, oy) => {
        card.measureInWindow((cx, cy, cw, ch) => {
          if (cw <= 0 || ch <= 0) return;
          const rect = { x: cx - ox, y: cy - oy, width: cw, height: ch };
          setShowOnboardingHint(false);
          updateScoutState('perched', product, rect);

          const w = containerW.value;
          const h = containerH.value;
          const span = Math.max(0, w - ROAM_SIZE - Spacing.base * 2);
          const baseX = Spacing.base + position.value * span;
          const dockY = Math.max(0, h - ROAM_SIZE - 4);
          const targetLeft = Math.max(
            Spacing.sm,
            Math.min(w - ROAM_SIZE - Spacing.sm, rect.x + rect.width - ROAM_SIZE * 0.72),
          );
          const targetTop = Math.max(
            Spacing.sm,
            Math.min(h - ROAM_SIZE - Spacing.sm, rect.y - ROAM_SIZE * 0.38),
          );
          const targetDX = targetLeft - baseX;
          const targetDY = targetTop - dockY;

          runOnUI(() => {
            'worklet';
            isEngagedSV.value = true;
            grabScale.value = reducedMotion ? 1 : withSpring(1.06, Springs.snappy);
            dragX.value = reducedMotion ? targetDX : withSpring(targetDX, Springs.bouncy);
            dragY.value = reducedMotion ? targetDY : withSpring(targetDY, Springs.bouncy);
          })();
          triggerSparkle();
        });
      });
    },
    [
      containerH,
      containerW,
      dragX,
      dragY,
      grabScale,
      isEngagedSV,
      position,
      reducedMotion,
      triggerSparkle,
      updateScoutState,
    ],
  );

  const onPointerLeaveCard = useCallback(
    (productId: string) => {
      if (scoutModeRef.current === 'dragging') return;
      if (activeProductIdRef.current !== productId) return;
      if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = setTimeout(() => {
        if (scoutModeRef.current === 'perched' && activeProductIdRef.current === productId) {
          // Leave perched on Web only if they didn't engage; keep on mobile touch
          if (Platform.OS === 'web') {
            recallRemy();
          }
        }
      }, 240);
    },
    [recallRemy],
  );

  const contextValue = useMemo<RemyScoutContextValue>(
    () => ({
      activeProductId: activeProduct?.id ?? null,
      scoutMode,
      registerCard,
      unregisterCard,
      onPointerHoverCard,
      onPointerLeaveCard,
    }),
    [
      activeProduct?.id,
      onPointerHoverCard,
      onPointerLeaveCard,
      registerCard,
      scoutMode,
      unregisterCard,
    ],
  );

  // Animated styles for Remy
  const travelerStyle = useAnimatedStyle(() => {
    const span = Math.max(0, containerW.value - ROAM_SIZE - Spacing.base * 2);
    const baseX = Spacing.base + position.value * span;
    const dockY = Math.max(0, containerH.value - ROAM_SIZE - 4);
    const ready = containerW.value > 0 && containerH.value > 0;
    return {
      opacity: ready ? 1 : 0,
      transform: [
        { translateX: baseX + dragX.value },
        { translateY: dockY + dragY.value },
        { scale: grabScale.value },
      ],
    };
  });

  const bodyMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: hop.value + squash.value * 3 },
      { scaleX: 1 + squash.value * 0.11 },
      { scaleY: 1 + breath.value * 0.045 - squash.value * 0.17 },
    ],
  }));

  const restingStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, walk.value * 8),
  }));

  const walkingStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, walk.value * 8),
    transform: [
      { scaleX: facing.value },
      { translateY: -Math.abs(Math.sin(walk.value * Math.PI * 6)) * 4 },
    ],
  }));

  const leftEarStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wiggle.value}deg` }],
  }));
  const rightEarStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-wiggle.value}deg` }],
  }));
  const eyesStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blink.value }],
  }));
  const tailStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wag.value}deg` }, { scaleX: 1 - wag.value * 0.01 }],
  }));
  const sparklesStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ translateY: popLift.value }],
  }));
  const groundStyle = useAnimatedStyle(() => ({
    opacity: isEngagedSV.value ? 0 : 1 + Math.min(0, hop.value) * 0.038,
    transform: [{ scaleX: 1 + Math.min(0, hop.value) * 0.022 }],
  }));
  const radarRingStyle = useAnimatedStyle(() => ({
    opacity: isEngagedSV.value ? 0.25 + radarPulse.value * 0.45 : 0,
    transform: [{ scale: 0.95 + radarPulse.value * 0.22 }],
  }));

  // Bot Summary Bubble content & placement
  const brief = useMemo(
    () => (activeProduct ? generateProductBotBrief(activeProduct) : null),
    [activeProduct],
  );

  const bubblePositionStyle = useMemo(() => {
    const h = containerWindowRef.current.height || containerHeight || 680;
    if (!activeRect) return { top: Math.max(80, h * 0.28) };
    const cardMidY = activeRect.y + activeRect.height / 2;
    if (cardMidY < h * 0.48) {
      // Card is in upper half: anchor bubble cleanly below the card
      const top = Math.min(h - 190, activeRect.y + activeRect.height + 12);
      return { top: Math.max(12, top) };
    }
    // Card is in middle/lower half: anchor bubble bottom 12px above the card top
    const bottom = Math.max(16, h - activeRect.y + 12);
    return { bottom };
  }, [activeRect, containerHeight]);

  const activeMessage = useMemo(() => {
    if (!brief) return '';
    if (selectedTopic === 'summary') return brief.shortSummary;
    return brief.replies[selectedTopic];
  }, [brief, selectedTopic]);

  const verdictColors = brief ? getVerdictColors(brief.verdict.tone) : null;

  return (
    <RemyScoutContext.Provider value={contextValue}>
      <View
        ref={containerRef}
        collapsable={false}
        style={styles.host}
        onLayout={onContainerLayout}
      >
        {children}

        {!isPaused ? (
          <View style={styles.overlayLayer} pointerEvents="box-none">
            {/* Backdrop to dismiss perched bot when user taps outside */}
            {scoutMode === 'perched' ? (
              <Pressable
                style={StyleSheet.absoluteFillObject}
                onPress={recallRemy}
                accessibilityLabel="Close Remy Bot summary"
              />
            ) : null}

            {/* Floating Bot Summary Bubble (shown on drag hover or perched) */}
            {activeProduct && brief && verdictColors ? (
              <View
                style={[styles.bubbleAnchor, bubblePositionStyle]}
                pointerEvents={scoutMode === 'perched' ? 'box-none' : 'none'}
              >
                <ClayCard outlined gradient style={styles.bubbleCard}>
                  {/* Bot header */}
                  <View style={styles.bubbleHeader}>
                    <View style={styles.botBadge}>
                      <AppIcon name="aiAssist" size={14} tint="primary" />
                      <ClayText variant="captionBold" color="primary">
                        Remy Bot
                      </ClayText>
                    </View>

                    <View style={[styles.verdictPill, { backgroundColor: verdictColors.bg }]}>
                      <ClayText variant="label" color={verdictColors.text}>
                        {brief.verdict.label}
                      </ClayText>
                    </View>

                    {scoutMode === 'perched' ? (
                      <ClayPressable
                        onPress={recallRemy}
                        accessibilityLabel="Recall Remy"
                        style={styles.closeBtn}
                        pressScale={0.9}
                      >
                        <AppIcon name="close" size={15} tint="textSecondary" />
                      </ClayPressable>
                    ) : null}
                  </View>

                  {/* Product preview row */}
                  <View style={styles.productRow}>
                    {activeProduct.images[0] ? (
                      <Image
                        source={activeProduct.images[0]}
                        style={styles.thumb}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <AppIcon name="image" size={18} tint="textSecondary" />
                      </View>
                    )}
                    <View style={styles.productMeta}>
                      <ClayText variant="bodyBold" numberOfLines={1}>
                        {activeProduct.title}
                      </ClayText>
                      <View style={styles.priceConditionRow}>
                        <ClayText variant="bodyBold" color="primary">
                          ₹{activeProduct.price.toLocaleString('en-IN')}
                        </ClayText>
                        <View style={styles.dot} />
                        <ClayText variant="caption" color="textSecondary">
                          {brief.conditionLabel}
                        </ClayText>
                      </View>
                    </View>
                  </View>

                  {/* Bot speech message */}
                  <View style={styles.speechBox}>
                    <ClayText variant="body" style={styles.speechText}>
                      {activeMessage}
                    </ClayText>
                  </View>

                  {/* Interactive controls when perched vs hint while dragging */}
                  {scoutMode === 'perched' ? (
                    <View style={styles.interactiveArea}>
                      <View style={styles.topicRow}>
                        <ClayPressable
                          onPress={() => setSelectedTopic('summary')}
                          style={[
                            styles.topicChip,
                            selectedTopic === 'summary' && styles.topicChipActive,
                          ]}
                          pressScale={0.94}
                        >
                          <ClayText
                            variant="captionBold"
                            color={selectedTopic === 'summary' ? 'white' : 'primary'}
                          >
                            Summary
                          </ClayText>
                        </ClayPressable>
                        {TOPIC_PILLS.map((pill) => {
                          const active = selectedTopic === pill.key;
                          return (
                            <ClayPressable
                              key={pill.key}
                              onPress={() => setSelectedTopic(pill.key)}
                              style={[styles.topicChip, active && styles.topicChipActive]}
                              pressScale={0.94}
                            >
                              <ClayText
                                variant="captionBold"
                                color={active ? 'white' : 'primary'}
                              >
                                {pill.label}
                              </ClayText>
                            </ClayPressable>
                          );
                        })}
                      </View>

                      <View style={styles.bubbleFooter}>
                        <ClayText variant="caption" color="textSecondary" style={styles.dragNextHint}>
                          Drag Remy to compare another
                        </ClayText>
                        <ClayPressable
                          onPress={() => {
                            const targetId = activeProduct.id;
                            recallRemy();
                            router.push(`/product/${targetId}`);
                          }}
                          style={styles.openBtn}
                          pressScale={0.95}
                        >
                          <ClayText variant="captionBold" color="white">
                            View item
                          </ClayText>
                          <AppIcon name="chevronRight" size={14} tint="white" />
                        </ClayPressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.draggingHintRow}>
                      <AppIcon name="aiAssist" size={13} tint="accent" />
                      <ClayText variant="caption" color="textSecondary">
                        Drop Remy to ask questions, or slide to another item
                      </ClayText>
                    </View>
                  )}
                </ClayCard>
              </View>
            ) : null}

            {/* Idle / Tap discoverability pill safely docked above the roaming lane */}
            {scoutMode === 'idle' && (showOnboardingHint || tapHintVisible) ? (
              <View style={styles.hintBubble} pointerEvents="none">
                <AppIcon name="aiAssist" size={13} tint="primary" />
                <ClayText variant="captionBold" color="primary" numberOfLines={1}>
                  {tapHintVisible ? 'Drag me onto any product!' : 'Drag Remy onto an item'}
                </ClayText>
              </View>
            ) : null}

            {/* Draggable Remy Mouse Bot */}
            <Animated.View style={[styles.traveler, travelerStyle]} pointerEvents="box-none">

              {/* Glowing bot radar ring when dragging or perched */}
              <Animated.View style={[styles.radarRing, radarRingStyle]} pointerEvents="none" />

              <Animated.View style={[styles.ground, groundStyle]} pointerEvents="none">
                {GROUND_SHADOW}
              </Animated.View>
              <Animated.View style={[styles.sparkles, sparklesStyle]} pointerEvents="none">
                {HOP_SPARKLES}
              </Animated.View>

              <GestureDetector gesture={remyGesture}>
                <Animated.View
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Remy Bot"
                  accessibilityHint="Drag onto any product card for a quick AI summary without opening it"
                  style={styles.remyHitBox}
                >
                  <Animated.View style={bodyMotion} pointerEvents="none">
                    <Animated.View style={restingStyle}>
                      <RemyArt size={ROAM_SIZE} parts={['feet']} />
                      <RemyLayer
                        size={ROAM_SIZE}
                        parts={['tail']}
                        style={[{ transformOrigin: '72% 80%' }, tailStyle]}
                      />
                      <RemyLayer
                        size={ROAM_SIZE}
                        parts={['leftEar']}
                        style={[{ transformOrigin: '36% 34%' }, leftEarStyle]}
                      />
                      <RemyLayer
                        size={ROAM_SIZE}
                        parts={['rightEar']}
                        style={[{ transformOrigin: '66% 34%' }, rightEarStyle]}
                      />
                      <RemyLayer size={ROAM_SIZE} parts={RESTING_BODY} />
                      <RemyLayer
                        size={ROAM_SIZE}
                        parts={['eyes']}
                        style={[{ transformOrigin: '49% 47%' }, eyesStyle]}
                      />
                    </Animated.View>
                    <Animated.View style={[StyleSheet.absoluteFillObject, walkingStyle]}>
                      <RemyArt size={ROAM_SIZE} pose="walking" />
                    </Animated.View>
                  </Animated.View>

                  {/* Cute Bot Scout badge on Remy */}
                  <View style={styles.botBadgeCorner} pointerEvents="none">
                    <AppIcon
                      name={scoutMode !== 'idle' ? 'search' : 'aiAssist'}
                      size={12}
                      tint={scoutMode !== 'idle' ? 'white' : 'primary'}
                    />
                  </View>
                </Animated.View>
              </GestureDetector>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </RemyScoutContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, position: 'relative' },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 20,
  },
  traveler: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: ROAM_SIZE,
    height: ROAM_SIZE,
    zIndex: 60,
  },
  remyHitBox: {
    width: ROAM_SIZE,
    height: ROAM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ground: {
    position: 'absolute',
    left: 3,
    bottom: -2,
  },
  sparkles: {
    position: 'absolute',
    left: Spacing.sm,
    top: -Spacing.sm,
    zIndex: 2,
  },
  radarRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  botBadgeCorner: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    borderWidth: 1.5,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...clayElevation,
  },
  hintBubble: {
    position: 'absolute',
    bottom: ROAM_SIZE + 8,
    right: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...clayElevation,
  },
  bubbleAnchor: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    zIndex: 55,
  },
  bubbleCard: {
    padding: Spacing.md,
    borderRadius: Radius.card,
    gap: Spacing.sm,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  botBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentSoft,
  },
  verdictPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  closeBtn: {
    marginLeft: 'auto',
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productMeta: {
    flex: 1,
    gap: 2,
  },
  priceConditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.textSecondary,
  },
  speechBox: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  speechText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textPrimary,
  },
  interactiveArea: {
    gap: Spacing.sm,
  },
  topicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
  },
  topicChipActive: {
    backgroundColor: Colors.primary,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  dragNextHint: {
    flex: 1,
    fontSize: 11,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  draggingHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});
