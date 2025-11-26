// app/(tabs)/(profile)/about-attributions.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from 'src/ui/useAppTheme';
import AccessiblePressable from 'src/ui/AccessiblePressable';

type Item = {
  name: string;
  license: string;
  homepage?: string;
  attribution?: string;   // exakt text som krävs (sv)
  licenseEn?: string;     // license text (en)
  attributionEn?: string; // attribution text (en)
};

// Gemensam text för alla kommun-/datakällor från CSV
const COMMON_MUNICIPAL_LICENSE =
  'Egna villkor (upphovsrätt – se webbplatsens användningsvillkor eller eventuell sida om öppna data).';

const COMMON_MUNICIPAL_LICENSE_EN =
  'Own terms (copyright – see the website terms of use or any open data information).';

const COMMON_MUNICIPAL_ATTR =
  'Information om utegym i appen baseras på uppgifter från denna kommun eller datakälla. Kontrollera alltid licens och villkor på källans webbplats innan vidareutnyttjande.';

const COMMON_MUNICIPAL_ATTR_EN =
  'Outdoor gym information in the app is based on data from this municipality or data source. Always check the license and conditions on the source website before re-using the data.';

// Bas-resurser (kartor, backend, UI, osv.)
const BASE_ITEMS: Item[] = [
  // Kartor
  {
    name: 'Mapbox',
    license: 'Terms of Service',
    homepage: 'https://www.mapbox.com/legal/tos',
    attribution: '© Mapbox',
    licenseEn: 'Terms of Service',
    attributionEn: '© Mapbox',
  },
  {
    name: 'OpenStreetMap contributors',
    license: 'ODbL 1.0',
    homepage: 'https://www.openstreetmap.org/copyright',
    attribution: '© OpenStreetMap contributors',
    licenseEn: 'ODbL 1.0',
    attributionEn: '© OpenStreetMap contributors',
  },
  // Ikoner & UI
  {
    name: 'Ionicons',
    license: 'MIT',
    homepage: 'https://ionic.io/ionicons',
    attribution: 'Ionicons (MIT) – attribution är ej krävd men uppskattad. Så här är den.',
    licenseEn: 'MIT',
    attributionEn: 'Ionicons (MIT) – attribution is not required but appreciated. So, here it is.',
  },
  // Backend
  {
    name: 'Supabase',
    license: 'Apache-2.0 (serverkomponenter) / MIT (klient)',
    homepage: 'https://supabase.com',
    licenseEn: 'Apache-2.0 (server components) / MIT (client)',
  },
  // React / Expo
  {
    name: 'React Native & Expo',
    license: 'MIT',
    homepage: 'https://reactnative.dev',
    licenseEn: 'MIT',
  },
  // Övrigt – fyll på efter faktisk användning
  {
    name: 'react-native-confetti-cannon',
    license: 'MIT',
    homepage: 'https://github.com/VincentCATILLON/react-native-confetti-cannon',
    licenseEn: 'MIT',
  },
  {
    name: 'react-native-toast-message',
    license: 'MIT',
    homepage: 'https://github.com/calintamas/react-native-toast-message',
    licenseEn: 'MIT',
  },
];

// Kommuner / datakällor från din CSV (alla rader där website inte är tom)
const MUNICIPAL_ITEMS: Item[] = [
  {
    name: 'Arvidsjaur – kommunal data om utegym',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://arvidsjaur.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Boden – kommunal data om utegym',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.boden.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Borås – kommunal data om utegym',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.boras.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Brastad – datakälla för utegym (svenskfotboll.se)',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'http://svenskfotboll.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Bredbyn – datakälla för utegym (anundsjo.se)',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'http://www.anundsjo.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Bromma – Stockholms stad (motionera.stockholm)',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://motionera.stockholm',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Brösarp – Tomelilla kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.tomelilla.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Ekerö – Ekerö kommun (upplevekero.se)',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.upplevekero.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Eskilstuna – Eskilstuna kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.eskilstuna.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Falkenberg – Falkenbergs kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.falkenberg.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Frillesås – Kungsbacka kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://kungsbacka.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Grundsund – datakälla (StoryMaps, arcgis.com)',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://storymaps.arcgis.com',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Grödinge – Botkyrka kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.botkyrka.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Göteborg – Göteborgs Stad',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://goteborg.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Halmstad – Halmstads kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.halmstad.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Helsingborg – Helsingborgs stad',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://helsingborg.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Huddinge – Huddinge kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.huddinge.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Järfälla – Järfälla kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.jarfalla.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Kalhäll – Järfälla kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.jarfalla.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Karlsborg – Karlsborgs kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.karlsborg.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Karlskoga – Karlskoga kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.karlskoga.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Karlstad – Karlstads kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://karlstad.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Knivsta – Knivsta kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.knivsta.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Kode – Kungälvs kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.kungalv.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Kungälv – Kungälvs kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.kungalv.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Kungsbacka – Kungsbacka kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://kungsbacka.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Landvetter – Härryda kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.harryda.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Linköping – Linköpings kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.linkoping.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Lund – Lunds kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://lund.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Lycksele – Lycksele kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.lycksele.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Malmö – Malmö stad',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://malmo.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Mariestad – Mariestads kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://mariestad.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Mjölby – Mjölby kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.mjolby.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Mora – Mora kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://mora.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Mölndal – Mölndals stad',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.molndal.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Norrköping – Norrköpings kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://norrkoping.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Nybro – Nybro kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://nybro.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Nynäshamn – Nynäshamns kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.nynashamn.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Partille – Partille kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.partille.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Skarpnäck – Stockholms stad (motionera.stockholm)',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://motionera.stockholm',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Skogås – Huddinge kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.huddinge.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Sollentuna – Sollentuna kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.sollentuna.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Solna – Solna stad',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.solna.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Stockholm – Stockholms stad (motionera.stockholm)',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://motionera.stockholm',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Strängnäs – Strängnäs kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.strangnas.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Sundbyberg – Sundbybergs stad',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://sundbyberg.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Sundsvall – Sundsvalls kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://sundsvall.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Säffle – Säffle kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://saffle.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Södertälje – Södertälje kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.sodertalje.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Torshälla – Eskilstuna kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.eskilstuna.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Trelleborg – Trelleborgs kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.trelleborg.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Trollhättan – Trollhättans stad',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.trollhattan.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Trångsund – Huddinge kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.huddinge.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Umeå – Umeå kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.umea.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Upplands Väsby – Upplands Väsby kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.upplandsvasby.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Uppsala – Uppsala kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.uppsala.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Vallda – Kungsbacka kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://kungsbacka.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Varberg – Varbergs kommun (karta.varberg.se)',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://karta.varberg.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Visby – Region Gotland',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.gotland.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Åsa – Kungsbacka kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://kungsbacka.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Öland – datakälla för utegym (alltpaoland.se)',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://alltpaoland.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Örnsköldsvik – Örnsköldsviks kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.ornskoldsvik.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
  {
    name: 'Östersund – Östersunds kommun',
    license: COMMON_MUNICIPAL_LICENSE,
    licenseEn: COMMON_MUNICIPAL_LICENSE_EN,
    homepage: 'https://www.ostersund.se',
    attribution: COMMON_MUNICIPAL_ATTR,
    attributionEn: COMMON_MUNICIPAL_ATTR_EN,
  },
];

// Slutlig lista som används i UI
const ITEMS: Item[] = [
  ...BASE_ITEMS,
  {
    name: 'Kommuner & datakällor för utegym',
    license: 'Se respektive källa nedan',
    attribution:
      'Appen använder öppet tillgänglig information om utegym från svenska kommuner och andra offentliga datakällor. Varje källa listas nedan med länk till webbplatsen.',
    licenseEn: 'See each source below',
    attributionEn:
      'The app uses publicly available outdoor gym information from Swedish municipalities and other public data sources. Each source is listed below with a link to its website.',
  },
  ...MUNICIPAL_ITEMS,
];

export default function AboutAttributions() {
  const theme = useAppTheme();
  const router = useRouter();
  const [lang, setLang] = useState<'sv' | 'en'>('sv');

  const titleText =
    lang === 'sv' ? 'Attributioner & licenser' : 'Attributions & licenses';

  const introText =
    lang === 'sv'
      ? 'Den här sidan listar tredjepartsresurser som används i appen och deras licenser.'
      : 'This page lists third-party resources used in the app and their licenses.';

  const licenseLabel = lang === 'sv' ? 'Licens:' : 'License:';

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: 20, gap: 12 }}
      accessibilityLabel={titleText}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>{titleText}</Text>

      <Text style={{ color: theme.colors.subtext }}>{introText}</Text>

      {/* Språkflikar */}
      <View style={styles.tabRow}>
        <AccessiblePressable
          onPress={() => setLang('sv')}
          style={[
            styles.tab,
            {
              borderColor: lang === 'sv' ? theme.colors.primary : theme.colors.border,
              backgroundColor: lang === 'sv' ? theme.colors.card : 'transparent',
              minHeight: 44,
              justifyContent: 'center',
            },
          ]}
          accessibilityRole="tab"
          accessibilityLabel="Visa attributioner på svenska"
          accessibilityHint="Byter språk för texterna på sidan till svenska."
          accessibilityState={{ selected: lang === 'sv' }}
        >
          <Text
            style={{
              color: lang === 'sv' ? theme.colors.text : theme.colors.subtext,
              fontWeight: lang === 'sv' ? '700' : '500',
            }}
          >
            Svenska
          </Text>
        </AccessiblePressable>

        <AccessiblePressable
          onPress={() => setLang('en')}
          style={[
            styles.tab,
            {
              borderColor: lang === 'en' ? theme.colors.primary : theme.colors.border,
              backgroundColor: lang === 'en' ? theme.colors.card : 'transparent',
              minHeight: 44,
              justifyContent: 'center',
            },
          ]}
          accessibilityRole="tab"
          accessibilityLabel="Show attributions in English"
          accessibilityHint="Changes the language of the texts on this page to English."
          accessibilityState={{ selected: lang === 'en' }}
        >
          <Text
            style={{
              color: lang === 'en' ? theme.colors.text : theme.colors.subtext,
              fontWeight: lang === 'en' ? '700' : '500',
            }}
          >
            English
          </Text>
        </AccessiblePressable>
      </View>

      {ITEMS.map((it) => {
        const licenseText = lang === 'sv' ? it.license : it.licenseEn || it.license;
        const attr = lang === 'sv' ? it.attribution : it.attributionEn;

        return (
          <View
            key={it.name}
            style={[
              styles.card,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
            accessible
            accessibilityLabel={it.name}
          >
            <Text style={[styles.name, { color: theme.colors.text }]}>{it.name}</Text>

            <Text style={{ color: theme.colors.subtext, marginBottom: 6 }}>
              {licenseLabel} {licenseText}
            </Text>

            {attr ? (
              <Text style={{ color: theme.colors.subtext }}>{attr}</Text>
            ) : null}

            {it.homepage ? (
              <AccessiblePressable
                style={[
                  styles.linkBtn,
                  {
                    borderColor: theme.colors.border,
                    minHeight: 44,
                  },
                ]}
                onPress={() => Linking.openURL(it.homepage!)}
                accessibilityRole="button"
                accessibilityLabel={
                  lang === 'sv'
                    ? `Öppna webbplats för ${it.name}`
                    : `Open website for ${it.name}`
                }
                accessibilityHint={
                  lang === 'sv'
                    ? 'Öppnar källans webbplats i din webbläsare.'
                    : 'Opens the source website in your browser.'
                }
              >
                <Ionicons name="link-outline" size={16} color={theme.colors.text} />
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                  {lang === 'sv' ? 'Öppna webbplats' : 'Open website'}
                </Text>
              </AccessiblePressable>
            ) : null}
          </View>
        );
      })}

      <Text style={{ color: theme.colors.subtext, marginTop: 8, fontSize: 12 }}>
        {lang === 'sv'
          ? 'Tips: lägg även till en ”Öppen källkod”-vy som listar alla npm-beroenden automatiskt (t.ex. react-native-oss-licenses eller genererad text i build).'
          : 'Tip: consider adding an “Open source” view that lists all npm dependencies automatically (e.g. react-native-oss-licenses or a generated file at build time).'}
      </Text>

      <AccessiblePressable
        onPress={() => router.back()}
        style={[
          styles.back,
          { borderColor: theme.colors.border, minHeight: 44, justifyContent: 'center' },
        ]}
        accessibilityRole="button"
        accessibilityLabel={lang === 'sv' ? 'Tillbaka' : 'Back'}
        accessibilityHint={
          lang === 'sv'
            ? 'Går tillbaka till föregående sida.'
            : 'Returns to the previous screen.'
        }
      >
        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
          {lang === 'sv' ? 'Tillbaka' : 'Back'}
        </Text>
      </AccessiblePressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  name: { fontSize: 16, fontWeight: '800' },
  linkBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 6,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  back: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: 'center',
  },
});