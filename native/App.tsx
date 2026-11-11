import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AddChannelModal } from './src/components/AddChannelModal';
import { ChannelPicker } from './src/components/ChannelPicker';
import { ChannelTile } from './src/components/ChannelTile';
import { IconButton } from './src/components/IconButton';
import { ImportM3uModal } from './src/components/ImportM3uModal';
import { SettingsModal } from './src/components/SettingsModal';
import { catalog, channels, initialLayout } from './src/catalog';
import { loadState, saveState } from './src/storage';
import { colors } from './src/theme';
import type { Channel } from './src/types';

const MAX_TILES = 6;

export default function App() {
  useKeepAwake();

  const { width } = useWindowDimensions();
  const [ready, setReady] = useState(false);
  const [layout, setLayout] = useState<string[]>(initialLayout);
  const [customChannels, setCustomChannels] = useState<Channel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [soloId, setSoloId] = useState<string | null>(null);
  const [columns, setColumns] = useState(2);
  const [volume, setVolume] = useState(0.8);
  const [pausedIds, setPausedIds] = useState<Set<string>>(() => new Set());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [clock, setClock] = useState('--:--');
  const [toast, setToast] = useState('');

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    loadState().then((saved) => {
      if (!mounted) return;
      const custom = saved.custom || [];
      const known = new Set([...channels.map((channel) => channel.id), ...custom.map((channel) => channel.id)]);
      const playable = new Map(
        [...channels, ...custom].map((channel) => [channel.id, !channel.externalUrl])
      );
      const savedLayout = (saved.layout || [])
        .filter((id) => known.has(id) && playable.get(id))
        .slice(0, MAX_TILES);
      setCustomChannels(custom);
      setLayout(saved.layout ? savedLayout : initialLayout);
      if (saved.columns) setColumns(saved.columns);
      if (saved.volume !== undefined) setVolume(saved.volume);
      setReady(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      saveState({ layout, columns, volume, custom: customChannels });
    }, 300);
    return () => clearTimeout(timer);
  }, [ready, layout, columns, volume, customChannels]);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const tick = () => setClock(formatter.format(new Date()));
    tick();
    const timer = setInterval(tick, 15000);
    return () => clearInterval(timer);
  }, []);

  const allChannels = useMemo(() => [...channels, ...customChannels], [customChannels]);
  const channelById = useMemo(
    () => new Map(allChannels.map((channel) => [channel.id, channel])),
    [allChannels]
  );

  const groups = useMemo(() => {
    const result = [...catalog.groups];
    for (const channel of customChannels) {
      if (!result.includes(channel.group)) result.push(channel.group);
    }
    return result;
  }, [customChannels]);

  const layoutChannels = useMemo(
    () => layout.map((id) => channelById.get(id)).filter((channel): channel is Channel => Boolean(channel)),
    [layout, channelById]
  );

  const activeChannel = activeId ? channelById.get(activeId) : null;
  const activeCount = layoutChannels.length;
  const allPaused =
    layoutChannels.length > 0 && layoutChannels.every((channel) => pausedIds.has(channel.id));

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  };

  const focusChannel = (id: string) => {
    setActiveId(id);
    setPausedIds((previous) => {
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  };

  const selectChannel = (id: string) => {
    if (activeId === id) {
      setActiveId(null);
      return;
    }
    focusChannel(id);
  };

  const openExternal = async (channel: Channel) => {
    if (!channel.externalUrl) return;
    try {
      await Linking.openURL(channel.externalUrl);
      showToast(`${channel.name} se abre en el navegador`);
    } catch {
      showToast(`No se pudo abrir ${channel.name}`);
    }
  };

  const addChannel = (id: string) => {
    const channel = channelById.get(id);
    if (!channel) return;
    if (channel.externalUrl) {
      void openExternal(channel);
      return;
    }
    if (layout.includes(id)) {
      focusChannel(id);
      return;
    }
    if (layout.length >= MAX_TILES) {
      showToast(`Máximo ${MAX_TILES} canales a la vez`);
      return;
    }
    setLayout((previous) => [...previous, id]);
    focusChannel(id);
  };

  const removeChannel = (id: string) => {
    setLayout((previous) => previous.filter((item) => item !== id));
    setActiveId((previous) => (previous === id ? null : previous));
    setSoloId((previous) => (previous === id ? null : previous));
    setPausedIds((previous) => {
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  };

  const togglePause = (id: string) => {
    setPausedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePauseAll = () => {
    setPausedIds(allPaused ? new Set() : new Set(layout));
  };

  const muteAll = () => {
    setActiveId(null);
    showToast('Todo silenciado');
  };

  const toggleSolo = (id: string) => {
    setSoloId((previous) => (previous === id ? null : id));
    focusChannel(id);
  };

  const addCustomChannel = (channel: Channel) => {
    setAddVisible(false);
    setCustomChannels((previous) => [...previous, channel]);
    if (layout.length >= MAX_TILES) {
      showToast(`${channel.name} guardado. Máximo ${MAX_TILES} en pantalla`);
      return;
    }
    setLayout((previous) => [...previous, channel.id]);
    focusChannel(channel.id);
    showToast(`${channel.name} añadido`);
  };

  const importChannels = (list: Channel[]) => {
    setImportVisible(false);
    const knownUrls = new Set(customChannels.map((channel) => channel.urls[0]));
    const fresh = list.filter((channel) => !knownUrls.has(channel.urls[0]));
    if (!fresh.length) {
      showToast('Esos canales ya estaban en la lista');
      return;
    }
    setCustomChannels((previous) => [...previous, ...fresh]);
    if (!layout.length) {
      setLayout(fresh.slice(0, Math.min(4, MAX_TILES)).map((channel) => channel.id));
    }
    showToast(`${fresh.length} ${fresh.length === 1 ? 'canal añadido a la lista' : 'canales añadidos a la lista'}`);
  };

  const gridColumns = Math.min(columns, width < 600 ? 2 : 3);
  const gap = 8;
  const padding = 10;
  const tileWidth = (width - padding * 2 - gap * (gridColumns - 1)) / gridColumns;
  const soloChannel = soloId ? channelById.get(soloId) : null;

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>Cargando MultiTV…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <MaterialCommunityIcons name="television" size={20} color="#fff" />
            </View>
            <Text style={styles.brandText}>
              Multi<Text style={styles.brandAccent}>TV</Text>
            </Text>
          </View>

          {width > 430 ? <Text style={styles.clock}>{clock}</Text> : null}

          <View style={styles.actions}>
            <IconButton icon="magnify" label="Buscar canales" onPress={() => setPickerVisible(true)} />
            <IconButton
              icon="volume-off"
              label="Silenciar todo"
              onPress={muteAll}
              active={!activeId}
            />
            {width >= 380 ? (
              <IconButton
                icon={allPaused ? 'play' : 'pause'}
                label={allPaused ? 'Reanudar todo' : 'Pausar todo'}
                onPress={togglePauseAll}
                active={allPaused}
              />
            ) : null}
            {width >= 380 ? (
              <IconButton icon="plus" label="Añadir canal" onPress={() => setAddVisible(true)} />
            ) : null}
            <IconButton icon="cog-outline" label="Ajustes" onPress={() => setSettingsVisible(true)} />
          </View>
        </View>

        {layoutChannels.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="television-off" size={52} color={colors.muted2} />
            <Text style={styles.emptyTitle}>Tu parrilla está vacía</Text>
            <Text style={styles.emptyText}>Elige canales de la lista para empezar.</Text>
            <Pressable style={styles.primaryButton} onPress={() => setPickerVisible(true)}>
              <Text style={styles.primaryText}>Elegir canales</Text>
            </Pressable>
          </View>
        ) : soloChannel ? (
          <View style={styles.soloContainer}>
            <ChannelTile
              key={soloChannel.id}
              channel={soloChannel}
              width={width}
              isActive={activeId === soloChannel.id}
              paused={pausedIds.has(soloChannel.id)}
              volume={volume}
              isSolo
              onSelect={() => selectChannel(soloChannel.id)}
              onTogglePause={() => togglePause(soloChannel.id)}
              onSolo={() => setSoloId(null)}
              onRemove={() => removeChannel(soloChannel.id)}
            />
            <Pressable style={styles.exitSolo} onPress={() => setSoloId(null)}>
              <MaterialCommunityIcons name="arrow-collapse-all" size={16} color={colors.text} />
              <Text style={styles.exitSoloText}>Salir de solo</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={styles.gridScroll}
            contentContainerStyle={[styles.grid, { padding, gap }]}
          >
            {layoutChannels.map((channel) => (
              <ChannelTile
                key={channel.id}
                channel={channel}
                width={tileWidth}
                isActive={activeId === channel.id}
                paused={pausedIds.has(channel.id)}
                volume={volume}
                onSelect={() => selectChannel(channel.id)}
                onTogglePause={() => togglePause(channel.id)}
                onSolo={() => toggleSolo(channel.id)}
                onRemove={() => removeChannel(channel.id)}
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.status}>
          <Text style={styles.statusText} numberOfLines={1}>
            {activeCount} {activeCount === 1 ? 'TV' : 'TVs'} ·{' '}
            {activeChannel ? `Audio: ${activeChannel.name}` : 'Todo silenciado'}
          </Text>
          {width > 600 ? (
            <Text style={styles.statusHint}>Toca una TV para escuchar su audio</Text>
          ) : null}
        </View>

        {toast ? (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}

        <ChannelPicker
          visible={pickerVisible}
          channels={allChannels}
          groups={groups}
          layout={layout}
          maxTiles={MAX_TILES}
          onClose={() => setPickerVisible(false)}
          onAdd={addChannel}
          onSelect={focusChannel}
          onAddCustom={() => {
            setPickerVisible(false);
            setAddVisible(true);
          }}
          onImport={() => {
            setPickerVisible(false);
            setImportVisible(true);
          }}
        />

        <AddChannelModal
          visible={addVisible}
          onClose={() => setAddVisible(false)}
          onAdd={addCustomChannel}
        />

        <ImportM3uModal
          visible={importVisible}
          onClose={() => setImportVisible(false)}
          onImport={importChannels}
        />

        <SettingsModal
          visible={settingsVisible}
          columns={columns}
          volume={volume}
          paused={allPaused}
          onClose={() => setSettingsVisible(false)}
          onChangeColumns={setColumns}
          onChangeVolume={setVolume}
          onMuteAll={() => {
            muteAll();
            setSettingsVisible(false);
          }}
          onTogglePauseAll={togglePauseAll}
          onAddChannel={() => {
            setSettingsVisible(false);
            setAddVisible(true);
          }}
          onImport={() => {
            setSettingsVisible(false);
            setImportVisible(true);
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13
  },
  header: {
    height: 58,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(9,13,20,0.92)'
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  brandAccent: {
    color: colors.accent,
    fontWeight: '900'
  },
  clock: {
    color: colors.muted,
    fontSize: 12,
    marginLeft: 2
  },
  actions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1
  },
  gridScroll: {
    flex: 1
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start'
  },
  soloContainer: {
    flex: 1,
    backgroundColor: '#000'
  },
  exitSolo: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: 'rgba(13,19,29,0.88)',
    borderWidth: 1,
    borderColor: colors.borderStrong
  },
  exitSoloText: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: '700'
  },
  status: {
    height: 32,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(9,13,20,0.9)'
  },
  statusText: {
    flexShrink: 1,
    color: colors.muted,
    fontSize: 11
  },
  statusHint: {
    color: colors.muted2,
    fontSize: 10.5
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center'
  },
  primaryButton: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: colors.accent
  },
  primaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800'
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: 'rgba(19,27,39,0.97)',
    borderWidth: 1,
    borderColor: colors.borderStrong
  },
  toastText: {
    color: colors.text,
    fontSize: 12,
    textAlign: 'center'
  }
});
