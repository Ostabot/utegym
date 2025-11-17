// app/(tabs)/(profile)/about-oss-licenses.tsx
import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    Pressable,
    Linking,
    Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAppTheme } from '@/ui/useAppTheme';

// Static require så Metro bundlar den
const raw = require('../../../assets/oss-licenses.json');

type OssRow = {
    nameVersion: string; // t.ex. "react@18.2.0"
    licenses: string | string[];
    repository?: string | null;
    publisher?: string | null;
    licenseText?: string | null; // om generatorn lägger med
};

function toRows(input: any): OssRow[] {
    // Stöd både { items: [...] } och direkt [...]
    const arr = Array.isArray(input) ? input : Array.isArray(input?.items) ? input.items : [];
    return arr.map((x: any) => ({
        nameVersion: String(x.nameVersion ?? x.name ?? ''),
        licenses: x.licenses ?? 'UNLICENSED',
        repository: x.repository ?? x.url ?? null,
        publisher: x.publisher ?? x.author ?? null,
        licenseText: x.licenseText ?? x.licenseFileText ?? null,
    }));
}

export default function AboutOssLicenses() {
    const theme = useAppTheme();
    const [q, setQ] = useState('');
    const [sort, setSort] = useState<'name' | 'license' | 'publisher'>('name');
    const [open, setOpen] = useState<Record<string, boolean>>({});
    const [lang, setLang] = useState<'sv' | 'en'>('sv');

    const generatedAt = raw?.generatedAt ? new Date(raw.generatedAt).toLocaleString() : '';
    const rows = useMemo(() => toRows(raw), [raw]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        let out = !s
            ? rows
            : rows.filter((r) => {
                const lic = Array.isArray(r.licenses) ? r.licenses.join(', ') : r.licenses ?? '';
                return (
                    r.nameVersion.toLowerCase().includes(s) ||
                    String(r.publisher || '').toLowerCase().includes(s) ||
                    String(lic).toLowerCase().includes(s)
                );
            });

        out = [...out].sort((a, b) => {
            if (sort === 'name') return a.nameVersion.localeCompare(b.nameVersion);
            if (sort === 'license') {
                const la = Array.isArray(a.licenses) ? a.licenses[0] ?? '' : a.licenses ?? '';
                const lb = Array.isArray(b.licenses) ? b.licenses[0] ?? '' : b.licenses ?? '';
                return String(la).localeCompare(String(lb));
            }
            // publisher
            return String(a.publisher ?? '').localeCompare(String(b.publisher ?? ''));
        });

        return out;
    }, [rows, q, sort]);

    function badgeBgFor(license: string) {
        const L = license.toUpperCase();
        // diskreta färger (tema-säkra – bygger bara på primary/subtext)
        if (L.includes('MIT')) return theme.colors.primary + '22';
        if (L.includes('APACHE')) return '#22c55e22';
        if (L.includes('BSD')) return '#f59e0b22';
        if (L.includes('ISC')) return '#10b98122';
        if (L.includes('GPL')) return '#ef444422';
        return theme.colors.border + '66';
    }

    const searchPlaceholder =
        lang === 'sv'
            ? 'Sök paket, licens eller utgivare…'
            : 'Search package, license or publisher…';

    const sortLabel = (key: 'name' | 'license' | 'publisher') => {
        if (lang === 'sv') {
            if (key === 'name') return 'Namn';
            if (key === 'license') return 'Licens';
            return 'Publisher';
        } else {
            if (key === 'name') return 'Name';
            if (key === 'license') return 'License';
            return 'Publisher';
        }
    };

    return (
        <View
            style={{ flex: 1, backgroundColor: theme.colors.bg }}
            accessibilityRole="summary"
            accessible={false}
        >
            {/* Header + språkflikar */}
            <View style={{ padding: 16, gap: 10 }}>
                <Text
                    style={[styles.h1, { color: theme.colors.text }]}
                    accessibilityRole="header"
                >
                    {lang === 'sv' ? 'Öppen källkod' : 'Open source licenses'}
                </Text>
                <Text
                    style={{ color: theme.colors.subtext }}
                    accessibilityLabel={
                        lang === 'sv'
                            ? `Licenslista genererad ${generatedAt || 'okänt datum'}`
                            : `License list generated ${generatedAt || 'unknown date'}`
                    }
                >
                    {lang === 'sv' ? 'Genererad' : 'Generated'} {generatedAt || '—'}
                </Text>

                <View style={styles.tabRow}>
                    <Pressable
                        onPress={() => setLang('sv')}
                        style={[
                            styles.tab,
                            {
                                borderColor:
                                    lang === 'sv' ? theme.colors.primary : theme.colors.border,
                                backgroundColor:
                                    lang === 'sv' ? theme.colors.card : 'transparent',
                            },
                        ]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: lang === 'sv' }}
                        accessibilityLabel="Visa licensinformation på svenska"
                    >
                        <Text
                            style={{
                                color: lang === 'sv' ? theme.colors.text : theme.colors.subtext,
                                fontWeight: lang === 'sv' ? '700' : '500',
                            }}
                        >
                            Svenska
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setLang('en')}
                        style={[
                            styles.tab,
                            {
                                borderColor:
                                    lang === 'en' ? theme.colors.primary : theme.colors.border,
                                backgroundColor:
                                    lang === 'en' ? theme.colors.card : 'transparent',
                            },
                        ]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: lang === 'en' }}
                        accessibilityLabel="Show license information in English"
                    >
                        <Text
                            style={{
                                color: lang === 'en' ? theme.colors.text : theme.colors.subtext,
                                fontWeight: lang === 'en' ? '700' : '500',
                            }}
                        >
                            English
                        </Text>
                    </Pressable>
                </View>

                <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                    {lang === 'sv'
                        ? 'Den här listan genereras automatiskt från projektets beroenden (npm/yarn) och visar licenser för öppen källkod som används i appen.'
                        : 'This list is automatically generated from the project dependencies (npm/yarn) and shows open source licenses used in the app.'}
                </Text>
            </View>

            {/* Search + Sort */}
            <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 6 }}>
                <View
                    style={[
                        styles.inputWrap,
                        {
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.card,
                        },
                    ]}
                    accessible
                    accessibilityLabel={
                        lang === 'sv'
                            ? 'Sökfält för open source-licenser'
                            : 'Search field for open source licenses'
                    }
                >
                    <TextInput
                        placeholder={searchPlaceholder}
                        placeholderTextColor={theme.colors.subtext}
                        value={q}
                        onChangeText={setQ}
                        style={{ color: theme.colors.text, paddingVertical: 10 }}
                        autoCorrect={false}
                        autoCapitalize="none"
                        accessibilityRole="search"
                    />
                </View>

                <View
                    style={{ flexDirection: 'row', gap: 8 }}
                    accessibilityRole="tablist"
                    accessible={false}
                >
                    {(['name', 'license', 'publisher'] as const).map((k) => {
                        const active = sort === k;
                        const label = sortLabel(k);
                        const a11yLabel =
                            lang === 'sv'
                                ? `Sortera efter ${label}`
                                : `Sort by ${label}`;
                        return (
                            <Pressable
                                key={k}
                                onPress={() => setSort(k)}
                                style={[
                                    styles.pill,
                                    {
                                        borderColor: theme.colors.border,
                                        backgroundColor: theme.colors.card,
                                    },
                                    active && { backgroundColor: theme.colors.primary },
                                ]}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                                accessibilityLabel={a11yLabel}
                            >
                                <Text
                                    style={{
                                        color: active
                                            ? theme.colors.primaryText
                                            : theme.colors.text,
                                        fontWeight: '700',
                                    }}
                                >
                                    {label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(r) => r.nameVersion}
                contentContainerStyle={{ gap: 10, padding: 16, paddingBottom: 24 }}
                ListEmptyComponent={
                    <Text
                        style={{
                            color: theme.colors.subtext,
                            textAlign: 'center',
                            marginTop: 20,
                        }}
                        accessibilityLiveRegion="polite"
                    >
                        {lang === 'sv' ? 'Inga träffar.' : 'No results.'}
                    </Text>
                }
                renderItem={({ item }) => {
                    const isOpen = !!open[item.nameVersion];
                    const licArr = Array.isArray(item.licenses)
                        ? item.licenses
                        : [item.licenses ?? 'UNLICENSED'];

                    const toggleLabel =
                        lang === 'sv'
                            ? isOpen
                                ? `Dölj licensdetaljer för ${item.nameVersion}`
                                : `Visa licensdetaljer för ${item.nameVersion}`
                            : isOpen
                                ? `Hide license details for ${item.nameVersion}`
                                : `Show license details for ${item.nameVersion}`;

                    return (
                        <View
                            style={[
                                styles.row,
                                {
                                    backgroundColor: theme.colors.card,
                                    borderColor: theme.colors.border,
                                },
                            ]}
                            accessible={false}
                        >
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={[styles.name, { color: theme.colors.text }]}
                                        accessibilityRole="header"
                                    >
                                        {item.nameVersion}
                                    </Text>
                                    {item.publisher ? (
                                        <Text
                                            style={{ color: theme.colors.subtext, marginTop: 2 }}
                                        >
                                            {lang === 'sv' ? 'Publisher:' : 'Publisher:'}{' '}
                                            {item.publisher}
                                        </Text>
                                    ) : null}
                                </View>
                                <Pressable
                                    onPress={() =>
                                        setOpen((m) => ({ ...m, [item.nameVersion]: !isOpen }))
                                    }
                                    accessibilityRole="button"
                                    accessibilityState={{ expanded: isOpen }}
                                    accessibilityLabel={toggleLabel}
                                    hitSlop={8}
                                >
                                    <Text
                                        style={{
                                            color: theme.colors.primary,
                                            fontWeight: '800',
                                        }}
                                    >
                                        {isOpen
                                            ? lang === 'sv'
                                                ? 'Dölj'
                                                : 'Hide'
                                            : lang === 'sv'
                                                ? 'Visa'
                                                : 'Show'}
                                    </Text>
                                </Pressable>
                            </View>

                            {/* Licens-badges */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    gap: 6,
                                    marginTop: 8,
                                }}
                            >
                                {licArr.map((l, i) => (
                                    <View
                                        key={`${item.nameVersion}-lic-${i}`}
                                        style={{
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 999,
                                            backgroundColor: badgeBgFor(String(l)),
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: theme.colors.text,
                                                fontSize: 12,
                                                fontWeight: '700',
                                            }}
                                        >
                                            {String(l)}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {isOpen ? (
                                <View style={{ marginTop: 10, gap: 8 }}>
                                    {item.repository ? (
                                        <Pressable
                                            onPress={() => Linking.openURL(item.repository!)}
                                            accessibilityRole="button"
                                            accessibilityLabel={
                                                lang === 'sv'
                                                    ? `Öppna repository för ${item.nameVersion}`
                                                    : `Open repository for ${item.nameVersion}`
                                            }
                                            hitSlop={8}
                                        >
                                            <Text
                                                style={{
                                                    color: theme.colors.primary,
                                                    fontWeight: '700',
                                                }}
                                            >
                                                {lang === 'sv'
                                                    ? 'Öppna repository'
                                                    : 'Open repository'}
                                            </Text>
                                        </Pressable>
                                    ) : null}

                                    {item.licenseText ? (
                                        <>
                                            <Text
                                                style={{
                                                    color: theme.colors.subtext,
                                                    fontWeight: '700',
                                                    marginTop: 6,
                                                }}
                                            >
                                                {lang === 'sv' ? 'Licenstext' : 'License text'}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.licenseBox,
                                                    {
                                                        borderColor: theme.colors.border,
                                                        backgroundColor: theme.colors.bg,
                                                    },
                                                ]}
                                                accessible
                                                accessibilityLabel={
                                                    lang === 'sv'
                                                        ? `Licenstext för ${item.nameVersion}`
                                                        : `License text for ${item.nameVersion}`
                                                }
                                            >
                                                <Text
                                                    style={{
                                                        color: theme.colors.text,
                                                        fontSize: 12,
                                                        lineHeight: 16,
                                                    }}
                                                >
                                                    {item.licenseText}
                                                </Text>
                                            </View>
                                            <Pressable
                                                onPress={async () => {
                                                    try {
                                                        await Clipboard.setStringAsync(item.licenseText!);
                                                        // Toast eller feedback hanteras globalt i appen om du vill
                                                    } catch {
                                                        // ignoreras tyst
                                                    }
                                                }}
                                                style={[
                                                    styles.copyBtn,
                                                    { borderColor: theme.colors.border },
                                                ]}
                                                accessibilityRole="button"
                                                accessibilityLabel={
                                                    lang === 'sv'
                                                        ? `Kopiera licenstext för ${item.nameVersion}`
                                                        : `Copy license text for ${item.nameVersion}`
                                                }
                                                accessibilityHint={
                                                    lang === 'sv'
                                                        ? 'Kopierar licenstexten till urklipp.'
                                                        : 'Copies the license text to the clipboard.'
                                                }
                                                hitSlop={8}
                                            >
                                                <Text
                                                    style={{
                                                        color: theme.colors.text,
                                                        fontWeight: '700',
                                                    }}
                                                >
                                                    {lang === 'sv'
                                                        ? 'Kopiera licenstext'
                                                        : 'Copy license text'}
                                                </Text>
                                            </Pressable>
                                        </>
                                    ) : null}
                                </View>
                            ) : null}
                        </View>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    h1: { fontSize: 22, fontWeight: '800' },
    inputWrap: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
    pill: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        minHeight: 40,
        justifyContent: 'center',
    },
    row: { borderWidth: 1, borderRadius: 12, padding: 12 },
    name: { fontWeight: '800', fontSize: 16 },
    licenseBox: { borderWidth: 1, borderRadius: 10, padding: 10 },
    copyBtn: {
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 8,
        alignItems: 'center',
    },
    tabRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    tab: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 8,
        alignItems: 'center',
        minHeight: 40,
        justifyContent: 'center',
    },
});