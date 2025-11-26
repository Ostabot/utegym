// app/index.tsx
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from 'src/contexts/session-context';
import { useAppTheme } from 'src/ui/useAppTheme';

const GUEST_KEY = 'utegym.guestMode';

export default function IndexGate() {
    const { session, isLoading } = useSession();
    const theme = useAppTheme();
    const [guest, setGuest] = useState<boolean | null>(null);

    useEffect(() => {
        AsyncStorage.getItem(GUEST_KEY).then((v) => setGuest(v === '1'));
    }, []);

    if (isLoading || guest === null) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
                <ActivityIndicator />
            </View>
        );
    }

    if (session || guest) {
        return <Redirect href="/(tabs)/(home)" />;
    }
    return <Redirect href="/onboarding" />;
}