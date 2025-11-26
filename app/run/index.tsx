// app/run/index.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from 'src/ui/useAppTheme';
import { useTranslation } from 'react-i18next';

export default function RunIndex() {
    const router = useRouter();
    const theme = useAppTheme();
    const { t } = useTranslation();

    return (
        <View style={[styles.c, { backgroundColor: theme.colors.bg }]}>
            <Text style={[styles.t, { color: theme.colors.subtext }]}>
                {t('run.guard.noId', 'Ingen id-param kom fram.')}
            </Text>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('run.guard.backToWizard', 'Tillbaka till guiden')}
                onPress={() => router.replace('/(tabs)/(train)')}
                style={({ pressed }) => [
                    styles.b,
                    {
                        borderColor: theme.colors.primary,
                        backgroundColor: theme.colors.card,
                        opacity: pressed ? 0.9 : 1,
                    },
                ]}
            >
                <Text style={[styles.bt, { color: theme.colors.primary }]}>
                    {t('run.guard.backToWizard', 'Tillbaka till guiden')}
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    c: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    t: { fontSize: 16, textAlign: 'center' },
    b: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
    bt: { fontWeight: '600' },
});