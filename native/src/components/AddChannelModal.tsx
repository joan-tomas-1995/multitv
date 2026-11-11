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
import { isHttpUrl, newCustomId } from '../utils';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (channel: Channel) => void;
};

export function AddChannelModal({ visible, onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [logo, setLogo] = useState('');
  const [referer, setReferer] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
      setUrl('');
      setLogo('');
      setReferer('');
      setError('');
    }
  }, [visible]);

  const submit = () => {
    if (!name.trim()) {
      setError('Ponle un nombre al canal.');
      return;
    }
    if (!isHttpUrl(url.trim())) {
      setError('La URL del stream no es válida.');
      return;
    }
    if (logo.trim() && !isHttpUrl(logo.trim())) {
      setError('La URL del logo no es válida.');
      return;
    }
    onAdd({
      id: newCustomId(),
      name: name.trim().slice(0, 60),
      group: 'Mis canales',
      logo: logo.trim(),
      urls: [url.trim()],
      headers: referer.trim() ? { referer: referer.trim() } : undefined,
      custom: true
    });
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
              <Text style={styles.title}>Añadir canal</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Cerrar">
                <Text style={styles.close}>Cerrar</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.lead}>
                Un canal HLS propio, por ejemplo de tu proveedor legal o de una lista privada.
              </Text>

              <Field label="Nombre" value={name} onChangeText={setName} placeholder="Mi canal" />
              <Field
                label="URL del stream"
                value={url}
                onChangeText={setUrl}
                placeholder="https://ejemplo.com/directo/index.m3u8"
                keyboardType="url"
              />
              <Field
                label="Logo (opcional)"
                value={logo}
                onChangeText={setLogo}
                placeholder="https://…/logo.png"
                keyboardType="url"
              />
              <Field
                label="Referer (opcional)"
                value={referer}
                onChangeText={setReferer}
                placeholder="https://…"
                keyboardType="url"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={styles.primaryButton} onPress={submit}>
                <Text style={styles.primaryText}>Añadir canal</Text>
              </Pressable>
              <Text style={styles.hint}>Solo HLS (.m3u8). Se guarda en este dispositivo.</Text>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'url';
};

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default' }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted2}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
      />
    </View>
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
    marginBottom: 14
  },
  field: {
    marginBottom: 12
  },
  label: {
    color: colors.muted,
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 5
  },
  input: {
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: 12,
    fontSize: 13.5
  },
  error: {
    color: '#ff8fa3',
    fontSize: 12,
    marginBottom: 10
  },
  primaryButton: {
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
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
