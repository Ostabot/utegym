// src/ui/Card.tsx
import React from 'react';
import { View, ViewProps } from 'react-native';
import { useAppTheme } from './useAppTheme';

type Props = ViewProps & { elevated?: boolean };

export function Card({ elevated = false, style, ...rest }: Props) {
    const t = useAppTheme();
    return (
        <View
            {...rest}
            style={[
                {
                    backgroundColor: t.colors.card,
                    borderColor: t.colors.border,
                    borderWidth: 1,
                    borderRadius: t.radius.lg,
                    padding: t.spacing.md,
                    shadowColor: t.colors.shadow,
                    shadowOpacity: 0.16,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 2,
                },
                style,
            ]}
        />
    );
}

// ✅ ge både named och default export så att båda import-sätten funkar
export default Card;