import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveStream, streamHeaders } from '../resolvers';
import { colors, radius } from '../theme';
import type { Channel } from '../types';
import { ChannelLogo } from './ChannelLogo';

type Props = {
  channel: Channel;
  width: number;
  isActive: boolean;
  paused: boolean;
  volume: number;
  isSolo?: boolean;
  onSelect: () => void;
  onTogglePause: () => void;
  onSolo: () => void;
  onRemove: () => void;
};

const MAX_AUTO_RETRIES = 2;

export function ChannelTile({
  channel,
  width,
  isActive,
  paused,
  volume,
  isSolo,
  onSelect,
  onTogglePause,
  onSolo,
  onRemove
}: Props) {
  const videoRef = useRef<VideoView>(null);
  const pausedRef = useRef(paused);
  const activeRef = useRef(isActive);
  const volumeRef = useRef(volume);
  const [attempt, setAttempt] = useState(0);
  const [errorText, setErrorText] = useState('');
  const [hasSource, setHasSource] = useState(false);

  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
    instance.muted = true;
    instance.volume = volume;
    instance.audioMixingMode = 'mixWithOthers';
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    let cancelled = false;
    setErrorText('');
    setHasSource(false);

    (async () => {
      try {
        const url = await resolveStream(channel, attempt);
        if (cancelled) return;
        const source: VideoSource = {
          uri: url,
          headers: streamHeaders(channel),
          contentType: 'hls'
        };
        player.replace(source);
        player.muted = !activeRef.current;
        player.volume = volumeRef.current;
        if (!pausedRef.current) player.play();
        setHasSource(true);
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : 'No se pudo cargar el canal');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [channel, attempt, player]);

  useEffect(() => {
    player.muted = !isActive;
  }, [isActive, player]);

  useEffect(() => {
    player.volume = volume;
  }, [player, volume]);

  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);

  useEffect(() => {
    if (status !== 'error' || attempt >= MAX_AUTO_RETRIES) return;
    const timer = setTimeout(() => setAttempt((value) => value + 1), 1600);
    return () => clearTimeout(timer);
  }, [status, attempt]);

  const failed = Boolean(errorText) || (status === 'error' && attempt >= MAX_AUTO_RETRIES);
  const loading = !failed && (!hasSource || status === 'loading' || status === 'idle');
  const pausedLabel = paused && !loading && !failed;

  return (
    <View style={[styles.tile, isSolo ? styles.soloTile : { width, aspectRatio: 16 / 9 }]}>
      <VideoView
        ref={videoRef}
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
        fullscreenOptions={{ enable: true }}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Escuchar ${channel.name}`}
        onPress={onSelect}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(2,4,7,0.82)', 'rgba(2,4,7,0)', 'rgba(2,4,7,0.9)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="box-none" style={styles.topBar}>
        <ChannelLogo channel={channel} size={22} />
        <Text style={styles.name} numberOfLines={1}>{channel.name}</Text>
        {isActive ? (
          <MaterialCommunityIcons name="volume-high" size={13} color={colors.ok} />
        ) : null}
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${channel.name} de la parrilla`}
          hitSlop={7}
          onPress={onRemove}
          style={({ pressed }) => [styles.topClose, pressed && styles.topClosePressed]}
        >
          <MaterialCommunityIcons name="close" size={12} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View pointerEvents="none" style={styles.centerOverlay}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.overlayText}>Conectando…</Text>
        </View>
      ) : null}

      {pausedLabel ? (
        <View pointerEvents="none" style={styles.pausedPill}>
          <Text style={styles.pausedText}>Pausado</Text>
        </View>
      ) : null}

      {failed ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Sin señal</Text>
          <Text style={styles.errorText} numberOfLines={2}>
            {errorText || 'No se puede reproducir ahora mismo.'}
          </Text>
          <View style={styles.errorActions}>
            <Pressable style={styles.smallButton} onPress={() => setAttempt((value) => value + 1)}>
              <Text style={styles.smallButtonText}>Reintentar</Text>
            </Pressable>
            <Pressable style={styles.smallButton} onPress={onRemove}>
              <Text style={styles.smallButtonText}>Quitar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.controls}>
        <TileButton
          icon={isActive ? 'volume-high' : 'volume-off'}
          label={isActive ? 'Silenciar' : 'Escuchar'}
          active={isActive}
          onPress={onSelect}
        />
        <TileButton
          icon={isPlaying ? 'pause' : 'play'}
          label={isPlaying ? 'Pausar' : 'Reanudar'}
          onPress={onTogglePause}
        />
        <TileButton icon="arrow-expand-all" label="Ver solo" onPress={onSolo} active={isSolo} />
        <TileButton
          icon="fullscreen"
          label="Pantalla completa"
          onPress={() => videoRef.current?.enterFullscreen()}
        />
        <View style={styles.spacer} />
      </View>
    </View>
  );
}

type TileButtonProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
};

function TileButton({ icon, label, onPress, active }: TileButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.controlButton, pressed && styles.controlPressed]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={15}
        color={active ? colors.ok : colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.black,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border
  },
  soloTile: {
    flex: 1,
    width: '100%',
    borderRadius: 0,
    borderWidth: 0
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 6,
    paddingHorizontal: 8,
    paddingTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  name: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 11.5,
    fontWeight: '700'
  },
  live: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(2,4,7,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent
  },
  liveText: {
    color: '#ffd7de',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6
  },
  topClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2,4,7,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)'
  },
  topClosePressed: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7
  },
  overlayText: {
    color: colors.muted,
    fontSize: 10.5
  },
  pausedPill: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -14,
    marginLeft: -38,
    width: 76,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(2,4,7,0.75)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center'
  },
  pausedText: {
    color: colors.text,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4,6,10,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 5
  },
  errorTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  errorText: {
    color: colors.muted,
    fontSize: 10,
    textAlign: 'center'
  },
  errorActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 5
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border
  },
  smallButtonText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700'
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 5,
    paddingBottom: 4,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1
  },
  controlButton: {
    width: 27,
    height: 27,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center'
  },
  controlPressed: {
    backgroundColor: 'rgba(255,255,255,0.14)'
  },
  spacer: {
    flex: 1
  }
});
