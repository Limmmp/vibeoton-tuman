import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { collectionUrl } from './collection-url';
import { Button, colors, u } from './ui';

export function CollectionPanel({ address, model, locate }: { address: string; model?: string; locate: (id: string) => void }) {
  const [error, setError] = useState(''), [generation, setGeneration] = useState(0);
  if (!address) return <Text style={u.text}>Сначала подключи карту в настройках.</Text>;
  const uri = collectionUrl(address, model);
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>
    {!!error && <View style={{ padding: 16, gap: 8 }}><Text style={u.text}>{error}</Text><Button label="Повторить" onPress={() => { setError(''); setGeneration(value => value + 1); }} /></View>}
    <WebView key={generation} source={{ uri }} style={{ flex: 1, backgroundColor: colors.bg }} javaScriptEnabled domStorageEnabled
      onMessage={event => { try { const message = JSON.parse(event.nativeEvent.data); if (message.type === 'collectionLocate' && typeof message.id === 'string') locate(message.id); } catch {} }}
      onError={event => setError(event.nativeEvent.description)}
      onContentProcessDidTerminate={() => setGeneration(value => value + 1)}
      onHttpError={event => { if (event.nativeEvent.url === uri) setError('Коллекция ещё не опубликована по адресу карты. Обнови движок или подключи локальную версию.'); }} />
  </View>;
}
