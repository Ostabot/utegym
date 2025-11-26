// app/(tabs)/(profile)/about-privacy.tsx
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useAppTheme } from 'src/ui/useAppTheme';

export default function AboutPrivacy() {
  const theme = useAppTheme();
  const [lang, setLang] = useState<'sv' | 'en'>('sv');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      accessibilityRole="summary"
      accessible={false}
    >
      <Text
        style={[styles.h1, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        {lang === 'sv' ? 'Integritetspolicy' : 'Privacy Policy'}
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
          accessibilityLabel="Visa integritetspolicy på svenska"
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
          accessibilityLabel="Show privacy policy in English"
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

      {lang === 'sv' ? <PolicySv theme={theme} /> : <PolicyEn theme={theme} />}
    </ScrollView>
  );
}

// ---- Svenska versionen ----

function PolicySv({ theme }: { theme: ReturnType<typeof useAppTheme> }) {
  return (
    <>
      {/* 0. Personuppgiftsansvarig */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        0. Personuppgiftsansvarig
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Personuppgiftsansvarig för behandling av personuppgifter i den här appen är Tobias
        Thornblad. Vid frågor om integritet eller om du vill utöva dina rättigheter kan du
        kontakta oss via e-post: optimeradprestation@gmail.com
      </Text>

      {/* 1. Personuppgifter */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        1. Personuppgifter vi behandlar
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Vi behandlar i huvudsak följande kategorier av uppgifter:
        {'\n\n'}• Kontouppgifter – e-postadress, alias/visningsnamn och tekniska
        identifierare kopplade till ditt konto.
        {'\n'}• Träningsdata – träningspass, övningar, set, anteckningar och statistik som
        du skapar i appen.
        {'\n'}• Bilder – foton som du frivilligt laddar upp, till exempel kopplade till ett
        utegym eller din profil.
        {'\n'}• Platsdata – om du ger appen behörighet till plats används position för att
        hitta utegym i närheten.
        {'\n'}• Tekniska loggar – t.ex. appversion, enhetstyp och ungefärlig användning som
        kan användas för felsökning och analys.
        {'\n\n'}Uppgifterna lagras hos vår driftleverantör (Supabase) och andra tekniska
        underleverantörer som hjälper oss att leverera tjänsten.
      </Text>

      {/* 2. Rättslig grund */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        2. Rättslig grund för behandlingen
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Vi behandlar dina personuppgifter med stöd av följande rättsliga grunder enligt GDPR:
        {'\n\n'}• <Text style={{ fontWeight: '700' }}>Avtal</Text> – för att tillhandahålla appen.
        Vi behöver behandla kontouppgifter och träningsdata för att kunna erbjuda inloggning,
        synk av träningspass, historik och statistik (artikel 6.1 b GDPR).
        {'\n\n'}• <Text style={{ fontWeight: '700' }}>Berättigat intresse</Text> – för grundläggande
        analys och förbätring av appen, t.ex. aggregerad statistik om användning, stabilitet
        och fel, i syfte att utveckla och förbättra tjänsten (artikel 6.1 f GDPR). Vi
        begränsar data till det som är nödvändigt och du kan invända mot sådan behandling.
        {'\n\n'}• <Text style={{ fontWeight: '700' }}>Samtycke</Text> – för vissa frivilliga delar:
        {'\n'}  – Bilder du laddar upp i appen.
        {'\n'}  – Platsdata (GPS eller liknande) när du godkänner platsbehörighet i din enhet.
        {'\n\n'}Du kan när som helst återkalla ditt samtycke genom att:
        {'\n'}  – ta bort uppladdade bilder, och/eller
        {'\n'}  – stänga av platsbehörighet för appen i din enhets inställningar.
      </Text>

      {/* 3. Syfte */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        3. Syfte med behandlingen
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Vi använder dina uppgifter för att:
        {'\n\n'}• möjliggöra inloggning och hantera ditt konto,
        {'\n'}• spara och synka dina träningspass och din historik,
        {'\n'}• visa statistik och sammanställningar av din träning,
        {'\n'}• visa utegym i närheten baserat på din plats (om du godkänt platsbehörighet),
        {'\n'}• förbättra appens funktioner, stabilitet och användarupplevelse.
      </Text>

      {/* 4. Delning */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        4. Delning av uppgifter
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Vi säljer inte dina personuppgifter.
        {'\n\n'}
        Tjänsteleverantörer (t.ex. hosting, databaser, logghantering och analys) kan behandla
        uppgifter som personuppgiftsbiträden åt oss enligt personuppgiftsbiträdesavtal. De får
        endast behandla uppgifterna enligt våra instruktioner och inte för egna syften.
      </Text>

      {/* 5. Lagringstid */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        5. Lagringstid
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Vi sparar dina uppgifter så länge du har ett aktivt konto.
        {'\n\n'}
        Om du begär radering eller avslutar ditt konto raderas eller anonymiseras personuppgifter
        inom rimlig tid, med hänsyn till tekniska begränsningar, säkerhetskopior och krav enligt
        tillämplig lagstiftning.
      </Text>

      {/* 6. Dina rättigheter */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        6. Dina rättigheter
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Enligt dataskyddslagstiftningen (GDPR) har du rätt att:
        {'\n\n'}• begära ett registerutdrag över vilka uppgifter vi behandlar om dig,
        {'\n'}• begära rättelse av felaktiga eller ofullständiga uppgifter,
        {'\n'}• begära radering (&quot;rätten att bli bortglömd&quot;) i vissa fall,
        {'\n'}• begära begränsning av behandlingen i vissa fall,
        {'\n'}• invända mot behandling som grundar sig på berättigat intresse,
        {'\n'}• begära att få ut vissa uppgifter i ett strukturerat, allmänt använt och
        maskinläsbart format (dataportabilitet).
        {'\n\n'}
        Om du anser att vi behandlar dina personuppgifter i strid med GDPR har du också rätt att
        lämna in klagomål till Integritetsskyddsmyndigheten (IMY) i Sverige.
      </Text>

      <Pressable
        onPress={() => Linking.openURL('https://www.imy.se/')}
        accessibilityRole="link"
        accessibilityLabel="Öppna Integritetsskyddsmyndighetens webbplats i webbläsare"
        hitSlop={8}
      >
        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
          Läs mer hos Integritetsskyddsmyndigheten (IMY)
        </Text>
      </Pressable>

      {/* 7. Kontakt */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        7. Kontakt
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        För frågor om integritet eller om du vill utöva dina rättigheter, kontakta:
        {'\n'}
        Tobias Thornblad
        {'\n'}
        E-post: optimeradprestation@gmail.com
      </Text>

      <Pressable
        onPress={() => Linking.openURL('mailto:optimeradprestation@gmail.com')}
        accessibilityRole="button"
        accessibilityLabel="Skicka e-post till oss"
        accessibilityHint="Öppnar din e-postapp med vår adress ifylld."
        hitSlop={8}
      >
        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Maila oss</Text>
      </Pressable>
    </>
  );
}

// ---- Engelsk version ----

function PolicyEn({ theme }: { theme: ReturnType<typeof useAppTheme> }) {
  return (
    <>
      {/* 0. Controller */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        0. Data controller
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        The data controller responsible for the processing of personal data in this app is Tobias
        Thornblad. If you have any questions about privacy or want to exercise your rights, please
        contact us by e-mail: optimeradprestation@gmail.com
      </Text>

      {/* 1. Personal data we process */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        1. Personal data we process
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        We mainly process the following categories of data:
        {'\n\n'}• Account data – e-mail address, alias/display name and technical identifiers
        linked to your account.
        {'\n'}• Training data – workouts, exercises, sets, notes and statistics that you create
        in the app.
        {'\n'}• Images – photos you voluntarily upload, for example connected to an outdoor gym
        or your profile.
        {'\n'}• Location data – if you grant the app access to your location, your position is
        used to find outdoor gyms nearby.
        {'\n'}• Technical logs – such as app version, device type and approximate usage that may
        be used for troubleshooting and analytics.
        {'\n\n'}The data is stored with our hosting provider (Supabase) and other technical
        service providers that help us deliver the service.
      </Text>

      {/* 2. Legal basis */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        2. Legal basis for processing
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        We process your personal data based on the following legal grounds under the GDPR:
        {'\n\n'}• <Text style={{ fontWeight: '700' }}>Contract</Text> – to provide the app. We
        need to process account data and training data to offer login, workout sync, history and
        statistics (Article 6.1(b) GDPR).
        {'\n\n'}• <Text style={{ fontWeight: '700' }}>Legitimate interest</Text> – for basic
        analytics and improvement of the app, e.g. aggregated usage, stability and error
        statistics, in order to develop and improve the service (Article 6.1(f) GDPR). We limit
        the data to what is necessary, and you have the right to object to this processing.
        {'\n\n'}• <Text style={{ fontWeight: '700' }}>Consent</Text> – for certain optional
        features:
        {'\n'}  – Images you upload in the app.
        {'\n'}  – Location data (GPS or similar) when you grant location permission on your
        device.
        {'\n\n'}You can withdraw your consent at any time by:
        {'\n'}  – deleting uploaded images, and/or
        {'\n'}  – disabling location access for the app in your device settings.
      </Text>

      {/* 3. Purpose */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        3. Purpose of the processing
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        We use your data in order to:
        {'\n\n'}• enable login and manage your account,
        {'\n'}• save and sync your workouts and history,
        {'\n'}• show statistics and summaries of your training,
        {'\n'}• show outdoor gyms near you based on your location (if you have granted
        permission),
        {'\n'}• improve the app&apos;s functionality, stability and user experience.
      </Text>

      {/* 4. Sharing */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        4. Sharing of data
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        We do not sell your personal data.
        {'\n\n'}
        Service providers (such as hosting, databases, logging and analytics) may process data as
        processors on our behalf under data processing agreements. They may only process the data
        according to our instructions and not for their own purposes.
      </Text>

      {/* 5. Retention */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        5. Retention period
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        We store your data for as long as you have an active account.
        {'\n\n'}
        If you request deletion or close your account, personal data is deleted or anonymised
        within a reasonable time, taking into account technical limitations, backups and
        applicable legal requirements.
      </Text>

      {/* 6. Your rights */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        6. Your rights
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        Under data protection law (GDPR), you have the right to:
        {'\n\n'}• request access to the personal data we process about you,
        {'\n'}• request rectification of inaccurate or incomplete data,
        {'\n'}• request erasure (&quot;the right to be forgotten&quot;) in certain cases,
        {'\n'}• request restriction of processing in certain cases,
        {'\n'}• object to processing based on legitimate interest,
        {'\n'}• request to receive certain data in a structured, commonly used and
        machine-readable format (data portability).
        {'\n\n'}
        If you believe that we process your personal data in breach of the GDPR, you also have
        the right to lodge a complaint with the Swedish Authority for Privacy Protection (IMY).
      </Text>

      <Pressable
        onPress={() => Linking.openURL('https://www.imy.se/')}
        accessibilityRole="link"
        accessibilityLabel="Open the website of the Swedish Authority for Privacy Protection (IMY) in your browser"
        hitSlop={8}
      >
        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
          Read more at the Swedish Authority for Privacy Protection (IMY)
        </Text>
      </Pressable>

      {/* 7. Contact */}
      <Text
        style={[styles.h2, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        7. Contact
      </Text>
      <Text style={{ color: theme.colors.subtext }}>
        If you have any questions about privacy or want to exercise your rights, please contact:
        {'\n'}
        Tobias Thornblad
        {'\n'}
        E-mail: optimeradprestation@gmail.com
      </Text>

      <Pressable
        onPress={() => Linking.openURL('mailto:optimeradprestation@gmail.com')}
        accessibilityRole="button"
        accessibilityLabel="Send us an email"
        accessibilityHint="Opens your email app with our address filled in."
        hitSlop={8}
      >
        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Email us</Text>
      </Pressable>
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
    minHeight: 40,
    justifyContent: 'center',
  },
});