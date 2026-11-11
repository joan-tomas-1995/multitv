import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';

type Props = {
  visible: boolean;
  columns: number;
  volume: number;
  paused: boolean;
  onClose: () => void;
  onChangeColumns: (value: number) => void;
  onChangeVolume: (value: number) => void;
  onMuteAll: () => void;
  onTogglePauseAll: () => void;
  onAddChannel: () => void;
  onImport: () => void;
};

export function SettingsModal({
  visible,
  columns,
  volume,
  paused,
  onClose,
  onChangeColumns,
  onChangeVolume,
  onMuteAll,
  onTogglePauseAll,
  onAddChannel,
  onImport
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>Ajustes</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Cerrar">
              <Text style={styles.close}>Cerrar</Text>
            </Pressable>
          </View>

          <ScrollView>
            <Text style={styles.section}>Columnas</Text>
            <View style={styles.segmented}>
              {[1, 2, 3].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => onChangeColumns(value)}
                  style={[styles.segment, columns === value && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, columns === value && styles.segmentTextActive]}>
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.section}>Volumen</Text>
            <View style={styles.volumeRow}>
              <MaterialCommunityIcons name="volume-low" size={19} color={colors.muted} />
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                step={0.01}
                value={volume}
                onValueChange={onChangeVolume}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.surface3}
                thumbTintColor={colors.accent}
              />
              <MaterialCommunityIcons name="volume-high" size={19} color={colors.muted} />
            </View>

            <Text style={styles.section}>Reproducción</Text>
            <View style={styles.actions}>
              <Action icon="volume-off" label="Silenciar todo" onPress={onMuteAll} />
              <Action
                icon={paused ? 'play' : 'pause'}
                label={paused ? 'Reanudar todo' : 'Pausar todo'}
                onPress={onTogglePauseAll}
              />
            </View>

            <Text style={styles.section}>Canales</Text>
            <View style={styles.actions}>
              <Action icon="plus" label="Añadir canal" onPress={onAddChannel} />
              <Action icon="playlist-plus" label="Importar M3U" onPress={onImport} />
            </View>

            <Text style={styles.note}>
              Máximo 6 canales a la vez. En iPhone/iPad, si notas cortes, usa 2–4.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

type ActionProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
};

function Action({ icon, label, onPress }: ActionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
    >
      <MaterialCommunityIcons name={icon} size={19} color={colors.text} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,4,7,0.72)',
    justifyContent: 'flex-end'
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 18,
    paddingTop: 18
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800'
  },
  close: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600'
  },
  section: {
    color: colors.muted2,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 7
  },
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border
  },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentActive: {
    backgroundColor: colors.accentSoft
  },
  segmentText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700'
  },
  segmentTextActive: {
    color: colors.accent
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  slider: {
    flex: 1,
    height: 38
  },
  actions: {
    flexDirection: 'row',
    gap: 8
  },
  action: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 8
  },
  actionPressed: {
    backgroundColor: colors.surface2
  },
  actionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700'
  },
  note: {
    color: colors.muted2,
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 18,
    marginBottom: 8
  }
});
