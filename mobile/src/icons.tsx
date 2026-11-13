import React from 'react';
import { Image, Text } from 'react-native';
const assets = {
  study: require('../public/images/pin-study.png'), creative: require('../public/images/pin-creative.png'),
  leisure: require('../public/images/pin-leisure.png'), history: require('../public/images/pin-history.png'),
  quest: require('../public/images/pin-quest.png'), event: require('../public/images/pin-event.png'),
  collect: require('../public/images/pin-collect.png'), player: require('../public/images/player.png'),
};
export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const source = assets[name as keyof typeof assets];
  return source ? <Image accessible={false} source={source} resizeMode="contain" style={{ width: size, height: size }} /> : <Text accessible={false} style={{ fontSize: size, color: '#A4B4BF' }}>{({ menu: '☰', company: '♧', profile: '○', inbox: '◇' } as Record<string, string>)[name] || '○'}</Text>;
}
