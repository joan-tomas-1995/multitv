import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import type { Channel } from '../types';
import { ChannelLogo } from './ChannelLogo';
import { IconButton } from './IconButton';

type Props = {
  visible: boolean;
  channels: Channel[];
  groups: string[];
  layout: string[];
  maxTiles: number;
  onClose: () => void;
  onAdd: (id: string) => void;
  onSelect: (id: string) => void;
  onAddCustom: () => void;
  onImport: () => void;
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function ChannelPicker({
  visible,
  channels,
  groups,
  layout,
  maxTiles,
  onClose,
  onAdd,
  onSelect,
  onAddCustom,
  onImport
}: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const sections = useMemo(() => {
    const search = normalize(query.trim());
    return groups
      .map((group) => ({
        title: group,
        data: channels.filter(
          (channel) => channel.group === group && (!search || normalize(channel.name).includes(search))
        )
      }))
      .filter((section) => section.data.length > 0);
  }, [channels, groups, query]);

  const total = sections.reduce((sum, section) => sum + section.data.length, 0);
  const atMax = layout.length >= maxTiles;
  const externalCount = channels.filter((channel) => channel.externalUrl).length;
  const playableCount = channels.length - externalCount;
  const subtitle = externalCount
    ? `${playableCount} canales · ${externalCount} oficiales`
    : `${playableCount} disponibles`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Canales</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <IconButton icon="close" label="Cerrar" onPress={onClose} />
        </View>

        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.muted2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar canal…"
            placeholderTextColor={colors.muted2}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        {atMax ? (
          <Text style={styles.limit}>
            Máximo {maxTiles} canales en pantalla. Quita uno para añadir otro.
          </Text>
        ) : null}

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {total === 0 ? 'No hay canales que coincidan con la búsqueda.' : ''}
            </Text>
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.groupTitle}>{section.title}</Text>
          )}
          renderItem={({ item }) => {
            const external = Boolean(item.externalUrl);
            const inLayout = layout.includes(item.id);
            const disabled = !external && atMax && !inLayout;
            return (
              <Pressable
                disabled={disabled}
                onPress={() => {
                  if (inLayout) {
                    onSelect(item.id);
                    onClose();
                  } else {
                    onAdd(item.id);
                  }
                }}
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.itemPressed,
                  disabled && styles.itemDisabled
                ]}
              >
                <ChannelLogo channel={item} size={32} />
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                {external ? <Text style={styles.itemMeta}>Oficial</Text> : null}
                <MaterialCommunityIcons
                  name={external ? 'open-in-new' : inLayout ? 'check-circle' : disabled ? 'lock-outline' : 'plus-circle-outline'}
                  size={20}
                  color={external || inLayout ? colors.accent : colors.muted2}
                />
              </Pressable>
            );
          }}
        />

        <View style={styles.footer}>
          <Pressable style={styles.footerButton} onPress={onAddCustom}>
            <MaterialCommunityIcons name="plus" size={17} color={colors.text} />
            <Text style={styles.footerText}>Canal propio</Text>
          </Pressable>
          <Pressable style={styles.footerButton} onPress={onImport}>
            <MaterialCommunityIcons name="playlist-plus" size={18} color={colors.text} />
            <Text style={styles.footerText}>Importar M3U</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4
  },
  subtitle: {
    color: colors.muted2,
    fontSize: 11.5,
    marginTop: 2
  },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0
  },
  limit: {
    color: colors.muted2,
    fontSize: 11.5,
    marginHorizontal: 18,
    marginBottom: 6
  },
  list: {
    paddingHorizontal: 10,
    paddingBottom: 12
  },
  groupTitle: {
    color: colors.muted2,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 4,
    marginLeft: 8
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 9
  },
  itemPressed: {
    backgroundColor: colors.surface2
  },
  itemDisabled: {
    opacity: 0.45
  },
  itemName: {
    flex: 1,
    color: '#d7e0ed',
    fontSize: 14
  },
  itemMeta: {
    color: colors.accent,
    fontSize: 10.5,
    fontWeight: '700'
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 30,
    fontSize: 13
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  footerButton: {
    flex: 1,
    height: 42,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7
  },
  footerText: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '700'
  }
});
