import React from 'react';
import { View, ViewProps } from 'react-native';
import { useAppTheme } from './useAppTheme';

export default function Screen({ style, ...rest }: ViewProps) {
  const t = useAppTheme();
  return (
    <View
      style={[{ flex:1, backgroundColor: t.colors.bg, padding: t.spacing.xl }, style]}
      {...rest}
    />
  );
}