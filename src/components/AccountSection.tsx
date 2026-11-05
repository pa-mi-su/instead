import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { COLORS } from '../styles';

export function AccountSection({
  title,
  summary,
  count,
  collapsible = false,
  danger = false,
  children,
}: {
  title: string;
  summary?: string;
  count?: number;
  collapsible?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const heading = (
    <View style={accountStyles.heading}>
      <Text
        accessibilityRole="header"
        style={[accountStyles.title, danger && accountStyles.dangerText]}
      >
        {title}
      </Text>
      {count !== undefined && <Text style={accountStyles.count}>{count}</Text>}
      {collapsible && (
        <View style={accountStyles.chevron}>
          {expanded ? (
            <ChevronUp size={22} color={COLORS.ink} />
          ) : (
            <ChevronDown size={22} color={COLORS.ink} />
          )}
        </View>
      )}
    </View>
  );
  return (
    <View style={[accountStyles.card, danger && accountStyles.dangerCard]}>
      {collapsible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${
            expanded ? 'Hide' : 'Show'
          } ${title.toLowerCase()}`}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(!expanded)}
          style={accountStyles.sectionToggle}
        >
          {heading}
        </Pressable>
      ) : (
        heading
      )}
      {!!summary && <Text style={accountStyles.body}>{summary}</Text>}
      {(!collapsible || expanded) && (
        <View style={accountStyles.content}>{children}</View>
      )}
    </View>
  );
}
export const accountStyles = StyleSheet.create({
  page: { gap: 24 },
  hero: { marginBottom: 0 },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '700',
  },
  count: {
    color: COLORS.ink,
    backgroundColor: '#EDF1E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
  },
  chevron: { backgroundColor: '#EDF1E8', borderRadius: 20, padding: 7 },
  expandIcon: {
    color: COLORS.ink,
    fontSize: 24,
    width: 24,
    textAlign: 'center',
  },
  sectionToggle: { minHeight: 44, justifyContent: 'center' },
  body: { color: COLORS.muted, fontSize: 15, lineHeight: 23 },
  content: { gap: 16, paddingTop: 6 },
  entry: {
    gap: 10,
    padding: 16,
    backgroundColor: '#F7F8F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  entryTitle: {
    color: COLORS.ink,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  metadata: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  badge: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'flex-start',
    backgroundColor: '#E4EDDF',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  button: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: COLORS.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  dangerCard: { borderColor: '#E8C4BB', backgroundColor: '#FFF9F6' },
  dangerButton: { borderColor: '#C98E7E', backgroundColor: '#FFF1EC' },
  dangerText: { color: '#8A2F20' },
  disabled: { opacity: 0.5 },
});
