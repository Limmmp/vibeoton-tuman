import React, { memo, type RefObject } from 'react';
import { WebView } from 'react-native-webview';

export type MapHandlers = { message: (raw: string) => void; error: (text: string) => void; reload: () => void };
export const MapSurface = memo(function MapSurface({ uri, generation, web, handlers }: { uri: string; generation: number; web: RefObject<WebView<object> | null>; handlers: RefObject<MapHandlers> }) {
  // The ref keeps event logic current without rerendering WebView for GPS, sheets or notifications.
  return <WebView<object> key={generation} ref={web} source={{ uri }} style={{ flex: 1 }} javaScriptEnabled domStorageEnabled
    onMessage={event => handlers.current.message(event.nativeEvent.data)}
    onError={event => handlers.current.error(event.nativeEvent.description)}
    onContentProcessDidTerminate={() => handlers.current.reload()}
    onHttpError={event => { if (event.nativeEvent.url === uri) handlers.current.error(`HTTP ${event.nativeEvent.statusCode}`); }} />;
});
