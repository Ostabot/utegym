import { Pressable, Text, StyleSheet } from 'react-native';
import { useThemePreference as useTheme } from 'src/contexts/theme-context';
import { tokens } from './tokens';

type Props = { title: string; onPress: () => void; variant?: 'primary' | 'outline' };

export default function Button({ title, onPress, variant = 'primary' }: Props) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    root: {
      borderRadius: tokens.radius.lg,
      paddingVertical: tokens.spacing.md,
      alignItems: 'center',
      backgroundColor: variant === 'primary' ? colors.primary : 'transparent',
      borderWidth: variant === 'outline' ? 1 : 0,
      borderColor: colors.primary,
    },
    text: {
      color: variant === 'primary' ? colors.primaryText : colors.text,
      fontWeight: '700',
      fontSize: tokens.font.size.lg,
    },
  });
  return (
    <Pressable style={styles.root} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}