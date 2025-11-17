//app/run/_layout.tsx
import { Stack } from 'expo-router';
import { useAppTheme } from '@/ui/useAppTheme';
import { useTranslation } from 'react-i18next';

export default function RunLayout() {
    const theme = useAppTheme();
    const { t } = useTranslation();

    return (
        <Stack
            screenOptions={{
                headerShown: false, // vi använder egen header i run-flow
                contentStyle: { backgroundColor: theme.colors.bg },

                // Framtidssäkra: om header visas i någon future-screen
                headerStyle: { backgroundColor: theme.colors.header },
                headerTintColor: theme.colors.headerText,
                headerTitleStyle: {
                    color: theme.colors.headerText,
                    fontWeight: '700',
                },

                // i18n fallback
                title: t('run.defaultTitle', 'Träningspass'),
            }}
        >
            {/* Run session by ID */}
            <Stack.Screen
                name="[id]"
                options={{
                    // Om vi någonsin visar header, får den rätt titel
                    title: t('run.sessionTitle', 'Pågående pass'),
                }}
            />

            {/* Index — t.ex. uppvärmningsskärm eller startinfo */}
            <Stack.Screen
                name="index"
                options={{
                    title: t('run.indexTitle', 'Träningspass'),
                }}
            />
        </Stack>
    );
}