import React, { useEffect, useRef, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeInUp, FadeOutUp, Keyframe, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { colors, u } from './ui';

// Движение «Тумана» (animate-expo, apple-design): только transform и opacity, жесты — на UI-потоке,
// пружины без перелёта по умолчанию, перелёт — только когда жест нёс инерцию. Снижение движения — системное.

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SHEET_SPRING = { duration: 320, dampingRatio: 0.82, overshootClamping: true, reduceMotion: ReduceMotion.System } as const;

/** Появление контента снизу, лесенкой по индексу (не больше шести шагов, чтобы длинный список не ждал). */
export const enter = (index = 0) => FadeInUp.duration(260).delay(Math.min(index, 6) * 45).easing(EASE_OUT)
  .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] }).reduceMotion(ReduceMotion.System);

/** Награда — единственный «праздничный» момент: мягкое увеличение из 0,92, без появления из ничего. */
export const celebrate = new Keyframe({ 0: { opacity: 0, transform: [{ scale: 0.92 }, { translateY: 8 }] }, 100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }], easing: EASE_OUT } }).duration(420).reduceMotion(ReduceMotion.System);

/** Тактильный отклик: один на действие пользователя, всегда вместе с видимой реакцией. */
export const haptic = {
  select: () => { if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {}); },
  snap: () => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  success: () => { if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  error: () => { if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); },
};

export function Entrance({ children }: { children: ReactNode }) {
  return <Animated.View entering={enter()}>{children}</Animated.View>;
}

/** Уведомление въезжает сверху и уезжает туда же — по тому же пути. */
export function Notice({ text, onPress }: { text: string; onPress: () => void }) {
  if (!text) return null;
  return <Animated.View key={text} entering={FadeInDown.duration(240).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} exiting={FadeOutUp.duration(180).reduceMotion(ReduceMotion.System)} style={{ position: 'absolute', top: 90, left: 10, right: 10, zIndex: 10 }}>
    <Pressable accessibilityRole="button" onPress={onPress} style={{ backgroundColor: colors.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18 }}><Text style={u.text}>{text}</Text></Pressable>
  </Animated.View>;
}

/** Резинка у края: чем дальше за границу, тем слабее следует (формула из Designing Fluid Interfaces). */
function rubberband(overshoot: number, dimension: number) {
  'worklet';
  const c = 0.55;
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}

/** Куда долетит шторка по инерции: экспоненциальное замедление, как прокрутка в iOS. */
function project(velocity: number) {
  'worklet';
  const rate = 0.99;
  return ((velocity / 1000) * rate) / (1 - rate);
}

/** Шторка фиксированной высоты: жест двигает её, не меняя размер WebView-карты и не размонтируя содержимое. */
export function SwipeSheet({ level, onLevel, title, children, scroll = true }: { level: number; onLevel: (level: number) => void; title: string; children: ReactNode; scroll?: boolean }) {
  const { height: screenHeight } = useWindowDimensions();
  const [availableHeight, setAvailableHeight] = React.useState<number | null>(null);
  const height = Math.max(58, Math.min(availableHeight ?? screenHeight * 0.68, screenHeight * 0.68));
  const offsets = [height - 58, height * 0.46, 0];
  const reduced = useReducedMotion();
  const y = useSharedValue(offsets[level]);
  const start = useSharedValue(0);
  const points = useSharedValue(offsets);
  const fromGesture = useRef(false); // уровень выставил жест — пружина уже летит со скоростью пальца
  const levelRef = useRef(level);
  levelRef.current = level;
  useEffect(() => { points.set(offsets); }, [height]);
  useEffect(() => {
    if (fromGesture.current) { fromGesture.current = false; return; }
    y.set(reduced ? offsets[level] : withSpring(offsets[level], SHEET_SPRING));
  }, [level, height, reduced]);

  const settle = (next: number) => {
    if (next !== levelRef.current) { fromGesture.current = true; haptic.snap(); onLevel(next); }
  };
  const cycle = () => onLevel(levelRef.current >= 2 ? 0 : levelRef.current + 1);

  const pan = Gesture.Pan().activeOffsetY([-8, 8]).failOffsetX([-24, 24])
    .onStart(() => { start.set(y.get()); })
    .onUpdate(e => {
      const pts = points.get(), max = pts[0];
      const raw = start.get() + e.translationY;
      y.set(raw < 0 ? -rubberband(-raw, max) : raw > max ? max + rubberband(raw - max, max) : raw);
    })
    .onEnd(e => {
      const pts = points.get();
      const target = y.get() + project(e.velocityY);
      let next = 0;
      for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i] - target) < Math.abs(pts[next] - target)) next = i;
      y.set(withSpring(pts[next], { ...SHEET_SPRING, velocity: e.velocityY }));
      scheduleOnRN(settle, next);
    });
  const tap = Gesture.Tap().maxDuration(250).onEnd(() => { scheduleOnRN(cycle); });
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return <View pointerEvents="box-none" onLayout={event => setAvailableHeight(event.nativeEvent.layout.height)} style={{ flex: 1, overflow: 'hidden' }}>
    <Animated.View style={[s.sheet, { height }, sheetStyle]}>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View accessible accessibilityLabel={`${title}. Проведи вверх, чтобы развернуть`} accessibilityRole="adjustable" accessibilityActions={[{ name: 'increment', label: 'Развернуть' }, { name: 'decrement', label: 'Свернуть' }]} onAccessibilityAction={event => onLevel(Math.max(0, Math.min(2, level + (event.nativeEvent.actionName === 'increment' ? 1 : -1))))} style={s.handle}>
          <View style={s.grip} /><Text style={[u.label, { color: colors.text }]}>{title}</Text>
        </View>
      </GestureDetector>
      {scroll ? <ScrollView scrollEnabled={level !== 0} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>{children}</ScrollView> : <View style={{ flex: 1 }}>{children}</View>}
    </Animated.View>
  </View>;
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 16 },
  handle: { height: 58, alignItems: 'center', justifyContent: 'center', gap: 6 },
  grip: { width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)' },
});
