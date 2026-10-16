import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { acknowledgementText, disclaimerSections } from '../disclaimer';
import { POLICY_DATE, policyDocuments } from '../policies';
import { universalSafetyNotices } from '../safetyNotices';
import { COLORS } from '../styles';
export function InfoScreen({
  firstUse = false,
  onAccept,
  busy = false,
  error = '',
  bottomInset = 0,
}: {
  firstUse?: boolean;
  onAccept?: () => void;
  busy?: boolean;
  error?: string;
  bottomInset?: number;
}) {
  const [page, setPage] = useState<'safety' | 'terms' | 'privacy'>('safety');
  const [checked, setChecked] = useState(false);
  const [declined, setDeclined] = useState(false);
  return (
    <ScrollView
      contentContainerStyle={[s.content, { paddingBottom: bottomInset + 30 }]}
    >
      <Text style={s.kicker}>INSTEAD · INFO & SAFETY</Text>
      <Text accessibilityRole="header" style={s.title}>
        {firstUse ? 'Before you begin' : 'Know before you try'}
      </Text>
      <Text style={s.body}>
        {firstUse
          ? 'Read the safety information and policies before exploring recipes.'
          : 'Review these notices and policies anytime.'}
      </Text>
      <View style={s.tabs}>
        {(['safety', 'terms', 'privacy'] as const).map(item => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: page === item }}
            onPress={() => setPage(item)}
            style={[s.tab, page === item && s.active]}
          >
            <Text style={s.buttonText}>
              {item === 'safety'
                ? 'Safety'
                : item === 'terms'
                ? 'Terms of Use'
                : 'Privacy Policy'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.date}>Updated {POLICY_DATE}</Text>
      {page === 'safety'
        ? [...disclaimerSections, ...universalSafetyNotices].map(section => (
            <View key={section.title} style={s.section}>
              <Text accessibilityRole="header" style={s.heading}>
                {section.title}
              </Text>
              <Text style={s.body}>{section.body}</Text>
            </View>
          ))
        : policyDocuments[page].map(section => (
            <View key={section.title} style={s.section}>
              <Text accessibilityRole="header" style={s.heading}>
                {section.title}
              </Text>
              {section.paragraphs.map(paragraph => (
                <Text key={paragraph} style={s.body}>
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}
      {firstUse ? (
        <View style={s.section}>
          {declined ? (
            <>
              <Text style={s.heading}>You have not agreed</Text>
              <Text style={s.body}>
                Recipe browsing is unavailable until you agree. You can close
                the app, read the policies, or return to the acknowledgement.
              </Text>
              <Pressable
                style={s.tab}
                onPress={() => setDeclined(false)}
                accessibilityRole="button"
              >
                <Text style={s.buttonText}>Review acknowledgement</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={s.checkRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled: busy }}
                disabled={busy}
                onPress={() => setChecked(!checked)}
              >
                <Text style={s.check}>{checked ? '☑' : '☐'}</Text>
                <Text style={s.checkText}>{acknowledgementText}</Text>
              </Pressable>
              {error ? (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={!checked || busy}
                accessibilityState={{ disabled: !checked || busy }}
                onPress={onAccept}
                style={[s.primary, (!checked || busy) && s.disabled]}
              >
                <Text style={s.buttonText}>
                  {busy ? 'Saving…' : 'Agree & continue'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDeclined(true);
                  setChecked(false);
                }}
                disabled={busy}
                style={s.tab}
              >
                <Text style={s.buttonText}>I do not agree</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  content: { padding: 22, width: '100%', maxWidth: 760, alignSelf: 'center' },
  kicker: {
    color: COLORS.orange,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 12,
  },
  title: {
    color: COLORS.ink,
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 10,
  },
  heading: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 6,
  },
  body: { color: COLORS.ink, fontSize: 16, lineHeight: 24, marginBottom: 10 },
  section: { marginTop: 22 },
  date: { marginTop: 16, color: COLORS.muted },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tab: {
    padding: 12,
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.ink,
    borderRadius: 8,
    marginTop: 8,
  },
  active: { backgroundColor: COLORS.lime },
  buttonText: { color: COLORS.ink, fontWeight: '800', textAlign: 'center' },
  checkRow: { flexDirection: 'row', gap: 10, paddingVertical: 14 },
  check: { fontSize: 25, color: COLORS.ink },
  checkText: { flex: 1, color: COLORS.ink, fontSize: 16, lineHeight: 24 },
  primary: {
    backgroundColor: COLORS.lime,
    padding: 16,
    borderRadius: 8,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
  },
  disabled: { opacity: 0.45 },
  error: { color: '#9C2513', marginBottom: 12 },
});
