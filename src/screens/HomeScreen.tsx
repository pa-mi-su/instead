import { Search, XCircle } from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  isLoadingLive,
  bottomInset,
}: {
  guides: Guide[];
  query: string;
  onQuery: (value: string) => void;
  category: (typeof categories)[number];
  onCategory: (value: (typeof categories)[number]) => void;
  onOpen: (id: string) => void;
  isLoadingLive: boolean;
  bottomInset: number;
}) {
  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(bottomInset + 30, 46) },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <View style={styles.kickerRow}>
          <View style={styles.liveDot} />
          <Text style={styles.kicker}>EVERYDAY ANSWERS. NO RABBIT HOLES.</Text>
        </View>
        <Text style={styles.heroTitle}>What are you{'\n'}trying to do?</Text>
        <Text style={styles.heroBody}>
          Before you buy it, book it, or use it—see what you can do instead.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Search size={21} color={COLORS.ink} />
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder="Try “deodorant” or “pest control”"
          placeholderTextColor="#8B887F"
          style={styles.searchInput}
          selectionColor={COLORS.orange}
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
            style={[styles.chip, category === item && styles.chipActive]}
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
            ? 'MATCHING GUIDES'
            : category === 'All'
            ? 'START HERE'
            : category.toUpperCase()}
        </Text>
        <View style={styles.listMeta}>
          {isLoadingLive ? (
            <ActivityIndicator size="small" color={COLORS.muted} />
          ) : null}
          <Text style={styles.resultCount}>
            {guides.length} {guides.length === 1 ? 'GUIDE' : 'GUIDES'}
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
        <Text style={styles.promiseTitle}>Useful, not alarmist.</Text>
        <Text style={styles.promiseBody}>
          Clear recommendations, honest uncertainty, and no paid placements.
        </Text>
      </View>
    </ScrollView>
  );
}
