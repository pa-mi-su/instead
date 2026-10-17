import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable as Pressable } from '../components/AnimatedPressable';
import { acknowledgementText, disclaimerSections } from '../disclaimer';
import { POLICY_DATE, policyDocuments } from '../policies';
import { universalSafetyNotices } from '../safetyNotices';
import { COLORS } from '../styles';
export function InfoScreen({
  firstUse = false,
  onBack,
  onAccept,
  busy = false,
  error = '',
  bottomInset = 0,
}: {
  firstUse?: boolean;
  onBack?: () => void;
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
      keyboardDismissMode="on-drag"
    >
      {!firstUse && onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to the home screen"
          onPress={onBack}
          style={({ pressed }) => [s.backButton, pressed && s.pressed]}
        >
          <Text style={s.backArrow}>‹</Text>
          <Text style={s.backText}>BACK TO HOME</Text>
        </Pressable>
      ) : null}
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
            style={({ pressed }) => [
              s.tab,
              page === item && s.active,
              pressed && s.pressed,
            ]}
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
                style={({ pressed }) => [s.tab, pressed && s.pressed]}
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
                style={({ pressed }) => [
                  s.primary,
                  (!checked || busy) && s.disabled,
                  pressed && s.pressed,
                ]}
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
                style={({ pressed }) => [s.tab, pressed && s.pressed]}
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
  backButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    borderRadius: 22,
    backgroundColor: COLORS.orange,
  },
  backText: {
    color: COLORS.ink,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.7,
  },
  backArrow: {
    color: COLORS.ink,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
  },
  pressed: { opacity: 0.86 },
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
    borderRadius: 18,
    marginTop: 8,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  active: { backgroundColor: COLORS.lime, borderColor: COLORS.lime },
  buttonText: { color: COLORS.ink, fontWeight: '800', textAlign: 'center' },
  checkRow: { flexDirection: 'row', gap: 10, paddingVertical: 14 },
  check: { fontSize: 25, color: COLORS.ink },
  checkText: { flex: 1, color: COLORS.ink, fontSize: 16, lineHeight: 24 },
  primary: {
    backgroundColor: COLORS.orange,
    padding: 16,
    borderRadius: 20,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
    elevation: 3,
  },
  disabled: { opacity: 0.45 },
  error: { color: '#9C2513', marginBottom: 12 },
});
