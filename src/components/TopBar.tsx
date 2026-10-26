import { Bookmark, UserRound } from 'lucide-react-native';
import { Text, useWindowDimensions, View } from 'react-native';
import { AnimatedPressable as Pressable } from './AnimatedPressable';
import { BrandLogo } from './BrandLogo';
import type { ViewName } from '../navigation/types';
import { COLORS, styles } from '../styles';

export function TopBar({
  activeView,
  savedCount,
  onHome,
  onSaved,
  onAccount,
  onInfo,
}: {
  activeView: ViewName;
  savedCount: number;
  onHome: () => void;
  onSaved: () => void;
  onAccount: () => void;
  onInfo: () => void;
}) {
  const compact = useWindowDimensions().width < 520;

  return (
    <View style={[styles.topBar, compact && styles.topBarCompact]}>
      <Pressable
        onPress={onHome}
        style={({ pressed }) => [
          styles.wordmarkWrap,
          compact && styles.wordmarkWrapCompact,
          pressed && styles.pressed,
        ]}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go to home"
      >
        <BrandLogo />
      </Pressable>
      <View
        style={[styles.topBarActions, compact && styles.topBarActionsCompact]}
      >
        <Pressable
          onPress={onAccount}
          style={({ pressed }) => [
            styles.savedButton,
            compact && styles.savedButtonCompact,
            activeView === 'account' && styles.savedButtonActive,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open My INSTEAD account"
          accessibilityState={{ selected: activeView === 'account' }}
        >
          <UserRound size={17} color={COLORS.ink} />
          <Text style={styles.savedButtonText}>ME</Text>
        </Pressable>
        <Pressable
          onPress={onInfo}
          accessibilityRole="button"
          accessibilityLabel="Info and Safety"
          accessibilityState={{ selected: activeView === 'info' }}
          style={({ pressed }) => [
            styles.savedButton,
            compact && styles.savedButtonCompact,
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
            compact && styles.savedButtonCompact,
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
    </View>
  );
}
