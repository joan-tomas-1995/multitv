import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import type { Channel } from '../types';
import { newCustomId, parseM3u } from '../utils';

type Props = {
  visible: boolean;
  onClose: () => void;
  onImport: (channels: Channel[]) => void;
};

export function ImportM3uModal({ visible, onClose, onImport }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setText('');
      setError('');
    }
  }, [visible]);

  const submit = () => {
    const entries = parseM3u(text);
    if (!entries.length) {
      setError('No se encontraron canales válidos en la lista.');
      return;
    }
    const channels: Channel[] = entries.slice(0, 300).map((entry) => ({
      id: newCustomId(),
      name: entry.name.slice(0, 60),
      group: entry.group?.trim() || 'Mis canales',
      logo: entry.logo && /^https?:\/\//.test(entry.logo) ? entry.logo : '',
      urls: [entry.url],
      headers: entry.referer ? { referer: entry.referer } : undefined,
      custom: true
    }));
    onImport(channels);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.header}>
              <Text style={styles.title}>Importar lista M3U</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Cerrar">
                <Text style={styles.close}>Cerrar</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.lead}>
                Pega el contenido de una lista M3U. Los canales se guardan solo en este dispositivo.
              </Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={'#EXTM3U\n#EXTINF:-1,La 1\nhttps://…/la1.m3u8'}
                placeholderTextColor={colors.muted2}
                style={styles.textarea}
                multiline
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable style={styles.primaryButton} onPress={submit}>
                <Text style={styles.primaryText}>Importar</Text>
              </Pressable>
              <Text style={styles.hint}>Máximo 300 canales por importación.</Text>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,4,7,0.72)',
    justifyContent: 'flex-end'
  },
  sheetWrap: {
    maxHeight: '92%'
  },
  sheet: {
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
    marginBottom: 4
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
  lead: {
    color: colors.muted,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12
  },
  textarea: {
    minHeight: 210,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    padding: 12,
    fontSize: 12,
    lineHeight: 17
  },
  error: {
    color: '#ff8fa3',
    fontSize: 12,
    marginTop: 8
  },
  primaryButton: {
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12
  },
  primaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800'
  },
  hint: {
    color: colors.muted2,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 6
  }
});
