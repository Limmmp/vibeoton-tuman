import React, { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, u } from './ui';

export function Entrance({ children }: { children: ReactNode }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let disposed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!disposed) Animated.timing(value, { toValue: 1, duration: reduced ? 0 : 200, useNativeDriver: true }).start();
    });
    return () => { disposed = true; value.stopAnimation(); };
  }, [value]);
  return <Animated.View style={{ opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>{children}</Animated.View>;
}

export function Notice({ text, onPress }: { text: string; onPress: () => void }) {
  const [displayed, setDisplayed] = React.useState(text);
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let live = true;
    if (text) setDisplayed(text);
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!live) return;
      Animated.timing(opacity, { toValue: text ? 1 : 0, duration: reduced ? 0 : 200, useNativeDriver: true }).start(({ finished }) => { if (live && finished && !text) setDisplayed(''); });
    });
    return () => { live = false; opacity.stopAnimation(); };
  }, [text, opacity]);
  if (!displayed) return null;
  return <Animated.View style={{ position: 'absolute', top: 90, left: 10, right: 10, zIndex: 10, opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }}><Pressable accessibilityRole="button" onPress={onPress} style={{ backgroundColor: colors.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18 }}><Text style={u.text}>{displayed}</Text></Pressable></Animated.View>;
}

/** Fixed-size surface: gestures move it without resizing the WebView or unmounting its contents. */
export function SwipeSheet({ level, onLevel, title, children, scroll = true }: { level: number; onLevel: (level: number) => void; title: string; children: ReactNode; scroll?: boolean }) {
  const { height: screenHeight } = useWindowDimensions();
  const [availableHeight, setAvailableHeight] = React.useState<number | null>(null);
  // Measure the space above the footer, not the full display including system controls.
  const height = Math.max(58, Math.min(availableHeight ?? screenHeight * 0.68, screenHeight * 0.68));
  const offsets = [height - 58, height * 0.46, 0];
  const translate = useRef(new Animated.Value(offsets[level])).current;
  const current = useRef(offsets[level]);
  const dragStart = useRef(0);
  const latest = useRef({ offsets, onLevel, height });
  latest.current = { offsets, onLevel, height };
  const reduced = useRef(false);
  useEffect(() => { let live = true; AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) reduced.current = value; }); return () => { live = false; }; }, []);
  useEffect(() => {
    const listener = translate.addListener(({ value }) => { current.current = value; });
    return () => translate.removeListener(listener);
  }, [translate]);
  // Пружина шторки (dampingRatio ≈ 0.8 по Apple) продолжает движение со скоростью пальца — без шва между жестом и анимацией.
  const snap = (target: number, velocity = 0) => {
    Animated.spring(translate, { toValue: target, velocity, useNativeDriver: true, stiffness: 300, damping: 28, mass: 1, overshootClamping: true }).start();
  };
  useEffect(() => { if (reduced.current) translate.setValue(offsets[level]); else snap(offsets[level]); }, [level, height]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => { translate.stopAnimation(); dragStart.current = current.current; },
    onPanResponderMove: (_, gesture) => translate.setValue(Math.max(0, Math.min(latest.current.height - 58, dragStart.current + gesture.dy))),
    onPanResponderRelease: (_, gesture) => {
      const projected = current.current + gesture.vy * 110;
      const points = latest.current.offsets;
      const next = points.reduce((best, value, index) => Math.abs(value - projected) < Math.abs(points[best] - projected) ? index : best, 0);
      snap(points[next], gesture.vy); latest.current.onLevel(next);
    },
    onPanResponderTerminate: () => { const points = latest.current.offsets; snap(points.reduce((best, point) => Math.abs(point - current.current) < Math.abs(best - current.current) ? point : best)); },
  }), [translate]);
  return <View pointerEvents="box-none" onLayout={event => setAvailableHeight(event.nativeEvent.layout.height)} style={{ flex: 1, overflow: 'hidden' }}><Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height, transform: [{ translateY: translate }], backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 16 }}>
    <View {...pan.panHandlers} accessible accessibilityLabel={`${title}. Проведи вверх, чтобы развернуть`} accessibilityRole="adjustable" accessibilityActions={[{ name: 'increment', label: 'Развернуть' }, { name: 'decrement', label: 'Свернуть' }]} onAccessibilityAction={event => onLevel(Math.max(0, Math.min(2, level + (event.nativeEvent.actionName === 'increment' ? 1 : -1))))} style={{ height: 58, alignItems: 'center', justifyContent: 'center', gap: 6 }}><View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)' }} /><Text style={[u.label, { color: colors.text }]}>{title}</Text></View>
    {scroll ? <ScrollView scrollEnabled={level !== 0} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>{children}</ScrollView> : <View style={{ flex: 1 }}>{children}</View>}
  </Animated.View></View>;
}
