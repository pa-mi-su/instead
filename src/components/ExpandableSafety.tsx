import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles';
import type { Guide } from '../types';
import { universalSafetyNotices } from '../safetyNotices';
export function ExpandableSafety({ guide }: { guide: Guide }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.safetyCard}>
      <Text style={styles.safetyLabel}>SAFETY · READ BEFORE USE</Text>
      <Text style={styles.safetyText}>
        Natural does not mean safe. Read each recipe’s cautions. Honey: never
        under 12 months. Essential oils can harm pets.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => [
          styles.safetyToggle,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.safetyToggleText}>
          {expanded ? 'Hide safety warnings' : 'Read all safety warnings'}
        </Text>
        <Text style={styles.safetyToggleChevron}>{expanded ? '⌃' : '⌄'}</Text>
      </Pressable>
      {expanded && (
        <>
          {universalSafetyNotices.map(notice => (
            <View key={notice.title}>
              <Text style={styles.optionName}>{notice.title}</Text>
              <Text style={styles.safetyText}>{notice.body}</Text>
            </View>
          ))}
          {!!guide.reviewNotice && (
            <>
              <Text style={styles.optionName}>Content review</Text>
              <Text style={styles.safetyText}>{guide.reviewNotice}</Text>
            </>
          )}
          <Text style={styles.safetyText}>{guide.safetyNote}</Text>
          <Text style={styles.evidenceNote}>{guide.evidenceNote}</Text>
        </>
      )}
    </View>
  );
}
