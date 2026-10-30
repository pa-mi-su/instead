import { ArrowRight, ScanLine, Search, XCircle } from 'lucide-react-native';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import { AnimatedPressable as Pressable } from '../components/AnimatedPressable';
import { categories } from '../categories';
import { GuideCard } from '../components/GuideCard';
import { COLORS, styles } from '../styles';
import type { Guide } from '../types';

export function HomeScreen({
  guides,
  query,
  onQuery,
  category,
  onCategory,
  onOpen,
  onScan,
  isLoadingLive,
  bottomInset,
  scrollOffset,
  onScrollOffsetChange,
}: {
  guides: Guide[];
  query: string;
  onQuery: (value: string) => void;
  category: (typeof categories)[number];
  onCategory: (value: (typeof categories)[number]) => void;
  onOpen: (id: string) => void;
  onScan: () => void;
  isLoadingLive: boolean;
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
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.hero}>
        <View style={styles.kickerRow}>
          <View style={styles.liveDot} />
          <Text style={styles.kicker}>
            SIMPLE INGREDIENTS. EVERYDAY ALTERNATIVES.
          </Text>
        </View>
        <Text style={styles.heroTitle}>
          What would you{'\n'}like to try INSTEAD?
        </Text>
        <Text style={styles.heroBody}>
          Search everyday products and explore natural alternatives.
        </Text>
      </View>

      <View style={styles.homeChoices}>
        <Pressable
          onPress={onScan}
          style={({ pressed }) => [
            styles.scanChoice,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Scan a product barcode"
        >
          <View style={styles.choiceIcon}>
            <ScanLine size={22} color={COLORS.ink} />
          </View>
          <View style={styles.choiceCopy}>
            <Text style={styles.choiceTitle}>Scan a product</Text>
            <Text style={styles.choiceCaption}>Find a related alternative</Text>
          </View>
          <ArrowRight size={18} color={COLORS.white} />
        </Pressable>
      </View>

      <Text style={styles.scanPrivacyNote}>
        Scans look up the barcode with Open Food Facts. INSTEAD does not save
        scan history.
      </Text>

      <View style={styles.searchWrap}>
        <Search size={21} color={COLORS.ink} />
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder="Try “toothpaste” or “weed killer”"
          placeholderTextColor="#8B887F"
          style={styles.searchInput}
          selectionColor={COLORS.sage}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => onQuery('')} hitSlop={10}>
            <XCircle size={20} color={COLORS.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {categories.map(item => (
          <Pressable
            key={item}
            onPress={() => onCategory(item)}
            style={({ pressed }) => [
              styles.chip,
              category === item && styles.chipActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${item}`}
            accessibilityState={{ selected: category === item }}
          >
            <Text
              style={[
                styles.chipText,
                category === item && styles.chipTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {query
            ? 'MATCHING ALTERNATIVES'
            : category === 'All'
            ? 'EXPLORE THE DIRECTORY'
            : category.toUpperCase()}
        </Text>
        <View style={styles.listMeta}>
          {isLoadingLive ? (
            <ActivityIndicator size="small" color={COLORS.muted} />
          ) : null}
          <Text style={styles.resultCount}>
            {guides.length} {guides.length === 1 ? 'TOPIC' : 'TOPICS'}
          </Text>
        </View>
      </View>

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

      {!guides.length ? (
        <View style={styles.emptySearch}>
          <Text style={styles.emptySymbol}>?</Text>
          <Text style={styles.emptyTitle}>Nothing here yet.</Text>
          <Text style={styles.emptyBody}>
            Try a broader search. New guides can be published without updating
            the app.
          </Text>
        </View>
      ) : null}

      <View style={styles.promise}>
        <Text style={styles.promiseLabel}>THE PROMISE</Text>
        <Text style={styles.promiseTitle}>Natural deserves a closer look.</Text>
        <Text style={styles.promiseBody}>
          Use at your own risk. Natural does not automatically mean safe or
          effective.
        </Text>
      </View>
    </ScrollView>
  );
}
