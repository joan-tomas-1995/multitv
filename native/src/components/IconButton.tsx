import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

type Props = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  label: string;
  size?: number;
  color?: string;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon, onPress, label, size = 21, color = colors.text, active, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        active && styles.active,
        pressed && styles.pressed,
        style
      ]}
    >
      <MaterialCommunityIcons name={icon} size={size} color={active ? colors.accent : color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  active: {
    backgroundColor: colors.accentSoft
  },
  pressed: {
    backgroundColor: colors.surface3
  }
});
