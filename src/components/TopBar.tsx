import { Bookmark } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { ViewName } from '../navigation/types';
import { COLORS, styles } from '../styles';

export function TopBar({
  activeView,
  savedCount,
  onHome,
  onSaved,
  onInfo,
}: {
  activeView: ViewName;
  savedCount: number;
  onHome: () => void;
  onSaved: () => void;
  onInfo: () => void;
}) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onHome}
        style={({ pressed }) => [
          styles.wordmarkWrap,
          pressed && styles.pressed,
        ]}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go to home"
      >
        <Text style={styles.wordmark}>INSTEAD</Text>
      </Pressable>
      <Pressable
        onPress={onInfo}
        accessibilityRole="button"
        accessibilityLabel="Info and Safety"
        accessibilityState={{ selected: activeView === 'info' }}
        style={({ pressed }) => [
          styles.savedButton,
          activeView === 'info' && styles.savedButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.savedButtonText}>INFO</Text>
      </Pressable>
      <Pressable
        onPress={onSaved}
        style={({ pressed }) => [
          styles.savedButton,
          activeView === 'saved' && styles.savedButtonActive,
          pressed && styles.pressed,
        ]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Open saved guides${
          savedCount ? `, ${savedCount} saved` : ''
        }`}
        accessibilityState={{ selected: activeView === 'saved' }}
      >
        <Bookmark
          size={17}
          color={COLORS.ink}
          fill={activeView === 'saved' ? COLORS.ink : 'transparent'}
        />
        <Text style={styles.savedButtonText}>SAVED</Text>
        {savedCount > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{savedCount}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
