import { Image, StyleSheet, Text, View } from 'react-native';
import { logoSource } from '../catalog';
import { colors } from '../theme';
import type { Channel } from '../types';
import { hueFor, initials } from '../utils';

type Props = {
  channel: Channel;
  size: number;
};

export function ChannelLogo({ channel, size }: Props) {
  const source = logoSource(channel);

  if (!source) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius: Math.max(6, size * 0.22),
            backgroundColor: `hsl(${hueFor(channel.name)} 52% 30%)`
          }
        ]}
      >
        <Text style={[styles.initials, { fontSize: Math.max(8, size * 0.32) }]}>
          {initials(channel.name)}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.chip,
        { width: size, height: size, borderRadius: Math.max(6, size * 0.22) }
      ]}
    >
      <Image source={source} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  initials: {
    color: colors.text,
    fontWeight: '800'
  }
});
