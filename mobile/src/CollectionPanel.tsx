import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { collectionUrl } from './collection-url';
import { Button, u } from './shared/ui/primitives';
import { colors } from './shared/theme/tokens';

export function CollectionPanel({ address, model, locate }: { address: string; model?: string; locate: (id: string) => void }) {
  const [error, setError] = useState(''), [generation, setGeneration] = useState(0);
  const [loading, setLoading] = useState(true);
  const reducedMotion = useReducedMotion();
  if (!address) return <Text style={u.text}>Сначала подключи карту в настройках.</Text>;
  const uri = collectionUrl(address, model);
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>
    {!!error && <View style={{ padding: 16, gap: 8 }}><Text style={u.text}>{error}</Text><Button label="Повторить" onPress={() => { setError(''); setLoading(true); setGeneration(value => value + 1); }} /></View>}
    <WebView key={generation} source={{ uri }} style={{ flex: 1, backgroundColor: colors.bg, opacity: loading ? 0 : 1 }} javaScriptEnabled domStorageEnabled
      onLoadStart={() => { setLoading(true); setError(''); }}
      onLoadEnd={() => setLoading(false)}
      onMessage={event => { try { const message = JSON.parse(event.nativeEvent.data); if (message.type === 'collectionLocate' && typeof message.id === 'string') locate(message.id); } catch {} }}
      onError={event => { setLoading(false); setError(event.nativeEvent.description); }}
      onContentProcessDidTerminate={() => { setLoading(true); setGeneration(value => value + 1); }}
      onHttpError={event => { if (event.nativeEvent.url === uri) { setLoading(false); setError('Коллекция ещё не опубликована по адресу карты. Обнови движок или подключи локальную версию.'); } }} />
    {loading && !error && <View accessibilityLiveRegion="polite" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
      {!reducedMotion && <ActivityIndicator color={colors.amber} />}
      <Text style={u.text}>Загружаем награды…</Text>
    </View>}
  </View>;
}
