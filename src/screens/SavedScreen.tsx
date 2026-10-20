import { ArrowRight, Bookmark } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { AnimatedPressable as Pressable } from '../components/AnimatedPressable';
import { GuideCard } from '../components/GuideCard';
import { COLORS, styles } from '../styles';
import type { Guide } from '../types';
import { useScrollRestoration } from '../hooks/useScrollRestoration';

export function SavedScreen({
  guides,
  onOpen,
  onExplore,
  bottomInset,
  scrollOffset,
  onScrollOffsetChange,
}: {
  guides: Guide[];
  onOpen: (id: string) => void;
  onExplore: () => void;
  bottomInset: number;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
}) {
  const scroll = useScrollRestoration(scrollOffset, onScrollOffsetChange);
  return (
    <ScrollView
      ref={scroll.scrollRef}
      onLayout={scroll.onLayout}
      onContentSizeChange={scroll.onContentSizeChange}
      onScroll={scroll.onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(bottomInset + 30, 46) },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      <View style={styles.savedHero}>
        <Text style={styles.pageEyebrow}>YOUR SHORTLIST</Text>
        <Text style={styles.pageTitle}>Saved for later.</Text>
        <Text style={styles.pageBody}>
          Your saved guides live on this device and stay available offline.
        </Text>
      </View>

      {guides.length ? (
        <View style={styles.guideList}>
          {guides.map((guide, index) => (
            <GuideCard
              key={guide.id}
              guide={guide}
              index={index + 1}
              onPress={() => onOpen(guide.id)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.savedEmpty}>
          <View style={styles.savedEmptyIcon}>
            <Bookmark size={30} color={COLORS.ink} />
          </View>
          <Text style={styles.emptyTitle}>No saved guides.</Text>
          <Text style={styles.emptyBody}>
            Bookmark guides you want to find quickly.
          </Text>
          <Pressable
            onPress={onExplore}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Explore guides"
          >
            <Text style={styles.primaryButtonText}>EXPLORE GUIDES</Text>
            <ArrowRight size={18} color={COLORS.ink} />
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
