// src/ui/Chip.tsx
import React from 'react';
import { Text, View, ViewProps } from 'react-native';
import { useAppTheme } from './useAppTheme';

export function Chip({ children, style, ...rest }: ViewProps & { children: React.ReactNode }) {
    const t = useAppTheme();
    return (
        <View
            {...rest}
            style={[
                {
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderRadius: 999,
                    backgroundColor: t.name === 'light' ? '#f1f5f9' : '#2a2621',
                    borderWidth: 1,
                    borderColor: t.colors.border,
                },
                style,
            ]}
        >
            <Text style={{ color: t.colors.text, fontSize: 12, fontWeight: '600' }}>{children}</Text>
        </View>
    );
}
export default Chip;