// app/(tabs)/(profile)/about-terms.tsx
import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet, View, Pressable } from 'react-native';
import { useAppTheme } from '@/ui/useAppTheme';

export default function AboutTerms() {
  const theme = useAppTheme();
  const [lang, setLang] = useState<'sv' | 'en'>('sv');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      accessible={false}
    >
      <Text
        style={[styles.h1, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        {lang === 'sv' ? 'Användarvillkor' : 'Terms of Use'}
      </Text>

      {/* Språkflikar */}
      <View style={styles.tabRow} accessibilityRole="tablist" accessible={false}>
        <Pressable
          onPress={() => setLang('sv')}
          style={[
            styles.tab,
            {
              borderColor: lang === 'sv' ? theme.colors.primary : theme.colors.border,
              backgroundColor: lang === 'sv' ? theme.colors.card : 'transparent',
            },
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: lang === 'sv' }}
          accessibilityLabel="Visa användarvillkor på svenska"
          hitSlop={8}
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
              borderColor: lang === 'en' ? theme.colors.primary : theme.colors.border,
              backgroundColor: lang === 'en' ? theme.colors.card : 'transparent',
            },
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: lang === 'en' }}
          accessibilityLabel="Show Terms of Use in English"
          hitSlop={8}
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

      {lang === 'sv' ? <TermsSv theme={theme} /> : <TermsEn theme={theme} />}
    </ScrollView>
  );
}

// ---- Svenska villkor ----

function TermsSv({ theme }: { theme: ReturnType<typeof useAppTheme> }) {
  return (
    <>
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        1. Tjänsten
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Appen tillhandahåller funktioner för att hitta utegym, planera och logga träning
        utomhus samt visa enklare statistik och historik. Tjänsten kan komma att utvecklas
        och ändras över tid, och vissa funktioner kan läggas till eller tas bort.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        2. Hälsa och träning
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Appen ger inte medicinsk rådgivning och ersätter inte bedömning eller rekommendationer
        från läkare, fysioterapeut eller annan legitimerad vårdpersonal. All träning sker på
        egen risk.
        {'\n\n'}
        Om du är osäker på din hälsa, är ovan vid träning, har skada eller sjukdom bör du
        alltid rådgöra med vården innan du påbörjar eller ändrar din träning. Avbryt
        omedelbart träning vid smärta, yrsel, andningssvårigheter eller andra symptom.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        3. Konto och ålder
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        För att använda appens kontobaserade funktioner behöver du skapa ett konto och ange
        korrekt e-postadress. Du ansvarar för att skydda dina inloggningsuppgifter och all
        aktivitet som sker via ditt konto.
        {'\n\n'}
        Genom att använda appen intygar du att du är minst 16 år, eller har målsmans
        godkännande om du är yngre, i enlighet med tillämplig lagstiftning.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        4. Användargenererat innehåll
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Du ansvarar själv för allt innehåll du laddar upp i appen, till exempel foton,
        kommentarer, namn på pass och anteckningar.
        {'\n\n'}
        Genom att ladda upp innehåll intygar du att:
        {'\n\n'}• du har nödvändiga rättigheter till innehållet,
        {'\n'}• innehållet inte gör intrång i andras rättigheter (t.ex. upphovsrätt eller
        integritet),
        {'\n'}• innehållet inte är olagligt, kränkande, diskriminerande eller annars
        olämpligt.
        {'\n\n'}
        Vi kan, men måste inte, ta bort eller dölja innehåll som vi bedömer bryter mot dessa
        villkor eller gällande lag.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        5. Otillåten användning
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Du får inte använda appen på ett sätt som:
        {'\n\n'}• bryter mot gällande lag,
        {'\n'}• försöker kringgå säkerhetsåtgärder eller otillbörligen komma åt andras data,
        {'\n'}• innebär automatisk insamling (t.ex. scraping) utöver vad som är nödvändigt
        för normal användning,
        {'\n'}• stör eller skadar appen, dess servrar eller andra användare.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        6. Immateriella rättigheter
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Appens namn, varumärken, design, kod och övriga element ägs av oss eller våra
        licensgivare och skyddas av upphovsrätt och andra immaterialrätter. Du får endast
        använda appen i enlighet med dessa villkor och för personligt bruk.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        7. Ansvarsbegränsning
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Tjänsten tillhandahålls i befintligt skick utan några garantier, vare sig uttryckliga
        eller underförstådda.
        {'\n\n'}
        I den utsträckning som tillåts enligt lag ansvarar vi inte för:
        {'\n\n'}• indirekta skador, följdskador eller förlust av data,
        {'\n'}• skador till följd av felaktig användning av appen,
        {'\n'}• skador som uppstår i samband med träning eller vistelse på utegym eller andra
        platser som visas i appen.
        {'\n\n'}
        Ingenting i dessa villkor begränsar ansvar som inte får begränsas enligt tvingande
        lagstiftning.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        8. Ändringar av tjänsten och villkoren
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Vi kan komma att uppdatera appen och dessa användarvillkor. Vid väsentliga ändringar
        försöker vi informera dig via appen eller andra lämpliga kanaler.
        {'\n\n'}
        Fortsatt användning av appen efter att ändrade villkor har trätt i kraft innebär att
        du accepterar de nya villkoren.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        9. Gällande lag och tvister
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Dessa villkor regleras av svensk lag, utan hänsyn till lagvalsregler.
        {'\n\n'}
        Tvister som uppstår med anledning av appen eller dessa villkor ska i första hand
        lösas genom dialog mellan dig och oss. Om vi inte kommer överens kan tvisten prövas
        av allmän domstol i Sverige.
      </Text>
    </>
  );
}

// ---- English terms ----

function TermsEn({ theme }: { theme: ReturnType<typeof useAppTheme> }) {
  return (
    <>
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        1. The service
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        The app provides features for finding outdoor gyms, planning and logging outdoor
        workouts, and viewing basic statistics and history. The service may evolve and change
        over time, and certain features may be added or removed.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        2. Health and exercise
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        The app does not provide medical advice and does not replace assessment or
        recommendations from a doctor, physiotherapist or other licensed healthcare
        professional. All exercise is done at your own risk.
        {'\n\n'}
        If you are unsure about your health, are inexperienced with exercise, or have an
        injury or illness, you should always consult healthcare professionals before starting
        or changing your training. Stop exercising immediately if you experience pain,
        dizziness, breathing difficulties or other symptoms.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        3. Account and age
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        To use the account-based features of the app, you need to create an account and
        provide a correct e-mail address. You are responsible for protecting your login
        credentials and for all activity carried out through your account.
        {'\n\n'}
        By using the app, you confirm that you are at least 16 years old, or that you have
        parental consent if you are younger, in accordance with applicable law.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        4. User-generated content
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        You are solely responsible for all content you upload to the app, such as photos,
        comments, workout names and notes.
        {'\n\n'}
        By uploading content, you confirm that:
        {'\n\n'}• you have the necessary rights to the content,
        {'\n'}• the content does not infringe the rights of others (e.g. copyright or
        privacy),
        {'\n'}• the content is not illegal, offensive, discriminatory or otherwise
        inappropriate.
        {'\n\n'}
        We may, but are not obliged to, remove or hide content that we consider to be in
        breach of these terms or applicable law.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        5. Prohibited use
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        You may not use the app in any way that:
        {'\n\n'}• violates applicable law,
        {'\n'}• attempts to bypass security measures or improperly access other users&apos;
        data,
        {'\n'}• involves automated collection (such as scraping) beyond what is necessary for
        normal use,
        {'\n'}• disrupts or damages the app, its servers or other users.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        6. Intellectual property
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        The app&apos;s name, trademarks, design, code and other elements are owned by us or
        our licensors and are protected by copyright and other intellectual property rights.
        You may only use the app in accordance with these terms and for personal use.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        7. Limitation of liability
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        The service is provided &quot;as is&quot; without any warranties, whether express or
        implied.
        {'\n\n'}
        To the extent permitted by law, we are not liable for:
        {'\n\n'}• indirect or consequential damages, or loss of data,
        {'\n'}• damages resulting from incorrect use of the app,
        {'\n'}• injuries or damages occurring in connection with training or visits to
        outdoor gyms or other locations shown in the app.
        {'\n\n'}
        Nothing in these terms limits any liability that cannot be limited under mandatory
        law.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        8. Changes to the service and terms
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        We may update the app and these Terms of Use from time to time. In the event of
        material changes, we will try to inform you via the app or through other appropriate
        channels.
        {'\n\n'}
        Continued use of the app after the updated terms have entered into force means that
        you accept the new terms.
      </Text>

      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        9. Governing law and disputes
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        These terms are governed by Swedish law, without regard to conflict of law rules.
        {'\n\n'}
        Any disputes arising out of or in connection with the app or these terms shall
        primarily be resolved through dialogue between you and us. If we cannot reach an
        agreement, the dispute may be brought before the competent courts of Sweden.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800' },
  h2: { fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 2 },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
});