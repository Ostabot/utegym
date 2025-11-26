// src/ui/toastConfig.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Theme } from 'src/ui/theme'; // din Theme-typ om du har den

export function makeToastConfig(t: Theme['colors']) {
  const Base = ({ text1, text2 }: any) => (
    <View style={[styles.box, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={[styles.title, { color: t.text }]}>{text1}</Text>
      {text2 ? <Text style={[styles.msg, { color: t.subtext }]}>{text2}</Text> : null}
    </View>
  );

  const Accent = ({ text1, text2, accentColor }: any) => (
    <View style={[
      styles.box,
      { backgroundColor: t.card, borderColor: accentColor ?? t.primary }
    ]}>
      <Text style={[styles.title, { color: t.text }]}>{text1}</Text>
      {text2 ? <Text style={[styles.msg, { color: t.subtext }]}>{text2}</Text> : null}
    </View>
  );

  return {
    success: (props: any) => <Accent {...props} accentColor={t.primary} />,
    info:    (props: any) => <Base {...props} />,
    error:   (props: any) => <Accent {...props} accentColor={'#dc2626'} />, // röd kant
  };
}

const styles = StyleSheet.create({
  box: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 220,
  },
  title: { fontWeight: '700', fontSize: 15 },
  msg: { marginTop: 2, fontSize: 13 },
});