import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CircleMinus,
  Search,
  X,
  XCircle,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { categories, guides as offlineGuides } from './src/data/guides';
import { fetchPublishedGuides } from './src/lib/supabase';
import { Guide } from './src/types';

const COLORS = {
  ink: '#171714',
  paper: '#F4F0E8',
  card: '#FFFCF6',
  lime: '#D9F65A',
  orange: '#FF6B3D',
  muted: '#6B6962',
  line: '#D8D3C8',
  white: '#FFFFFF',
  green: '#1F5C45',
};

const FAVORITES_KEY = 'instead:favorites';
type ViewName = 'home' | 'saved' | 'detail';

function AppContent() {
  const insets = useSafeAreaInsets();
  const [catalog, setCatalog] = useState<Guide[]>(offlineGuides);
  const [view, setView] = useState<ViewName>('home');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY)
      .then(value => {
        if (value) setFavorites(JSON.parse(value));
      })
      .catch(() => undefined);

    fetchPublishedGuides()
      .then(live => {
        if (live?.length) setCatalog(live);
      })
      .finally(() => setLoadingLive(false));
  }, []);

  const selected = catalog.find(item => item.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return catalog.filter(item => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesQuery =
        !normalized ||
        `${item.title} ${item.prompt} ${item.category} ${item.summary}`
          .toLowerCase()
          .includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [catalog, category, query]);

  const saved = catalog.filter(item => favorites.includes(item.id));

  function openGuide(id: string) {
    setSelectedId(id);
    setView('detail');
  }

  function goHome() {
    setView('home');
    setSelectedId(null);
  }

  async function toggleFavorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter(item => item !== id)
      : [...favorites, id];
    setFavorites(next);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  return (
    <View style={[styles.app, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.paper} />
      {view === 'detail' && selected ? (
        <GuideDetail
          guide={selected}
          isSaved={favorites.includes(selected.id)}
          onBack={goHome}
          onSave={() => toggleFavorite(selected.id)}
          bottomInset={insets.bottom}
        />
      ) : (
        <>
          <TopBar
            activeView={view}
            savedCount={favorites.length}
            onHome={goHome}
            onSaved={() => setView('saved')}
          />
          {view === 'saved' ? (
            <SavedView
              guides={saved}
              onOpen={openGuide}
              onExplore={goHome}
              bottomInset={insets.bottom}
            />
          ) : (
            <HomeView
              guides={filtered}
              query={query}
              onQuery={setQuery}
              category={category}
              onCategory={setCategory}
              onOpen={openGuide}
              isLoadingLive={loadingLive}
              bottomInset={insets.bottom}
            />
          )}
        </>
      )}
    </View>
  );
}

function TopBar({
  activeView,
  savedCount,
  onHome,
  onSaved,
}: {
  activeView: ViewName;
  savedCount: number;
  onHome: () => void;
  onSaved: () => void;
}) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onHome}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go to home"
      >
        <Text style={styles.wordmark}>INSTEAD</Text>
      </Pressable>
      <Pressable
        onPress={onSaved}
        style={[
          styles.savedButton,
          activeView === 'saved' && styles.savedButtonActive,
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

function HomeView({
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

function GuideCard({
  guide,
  index,
  onPress,
}: {
  guide: Guide;
  index: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.guideCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open guide: ${guide.title}. ${guide.prompt}`}
    >
      <View style={styles.cardNumberWrap}>
        <Text style={styles.cardNumber}>{String(index).padStart(2, '0')}</Text>
      </View>
      <View style={styles.cardMain}>
        <Text style={styles.cardCategory}>{guide.category.toUpperCase()}</Text>
        <Text style={styles.cardTitle}>{guide.title}</Text>
        <Text style={styles.cardPrompt}>{guide.prompt}</Text>
      </View>
      <View style={styles.cardArrow}>
        <ArrowRight size={21} color={COLORS.ink} />
      </View>
    </Pressable>
  );
}

function SavedView({
  guides,
  onOpen,
  onExplore,
  bottomInset,
}: {
  guides: Guide[];
  onOpen: (id: string) => void;
  onExplore: () => void;
  bottomInset: number;
}) {
  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(bottomInset + 30, 46) },
      ]}
      showsVerticalScrollIndicator={false}
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
            style={styles.primaryButton}
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

function GuideDetail({
  guide,
  isSaved,
  onBack,
  onSave,
  bottomInset,
}: {
  guide: Guide;
  isSaved: boolean;
  onBack: () => void;
  onSave: () => void;
  bottomInset: number;
}) {
  const toneLabel =
    guide.answerTone === 'yes'
      ? 'YES, YOU CAN USE LESS'
      : guide.answerTone === 'no'
      ? 'DON’T SKIP THIS'
      : 'IT DEPENDS';

  return (
    <View style={styles.detailShell}>
      <View style={styles.detailTopBar}>
        <Pressable
          onPress={onBack}
          style={styles.iconButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to guides"
        >
          <ArrowLeft size={22} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.detailWordmark}>INSTEAD</Text>
        <Pressable
          onPress={onSave}
          style={[styles.iconButton, isSaved && styles.iconButtonSaved]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            isSaved ? 'Remove from saved guides' : 'Save this guide'
          }
          accessibilityState={{ selected: isSaved }}
        >
          <Bookmark
            size={21}
            color={COLORS.ink}
            fill={isSaved ? COLORS.ink : 'transparent'}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.detailContent,
          { paddingBottom: Math.max(bottomInset + 34, 50) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailHero}>
          <Text style={styles.detailCategory}>
            {guide.category.toUpperCase()}
          </Text>
          <Text style={styles.detailTitle}>{guide.title}</Text>
          <Text style={styles.detailPrompt}>{guide.prompt}</Text>
        </View>

        <View style={styles.answerCard}>
          <View style={styles.answerTopRow}>
            <Text style={styles.answerLabel}>{toneLabel}</Text>
            <Text style={styles.answerIcon}>{guide.icon}</Text>
          </View>
          <Text style={styles.answerText}>{guide.answer}</Text>
          <Text style={styles.answerSummary}>{guide.summary}</Text>
        </View>

        <DetailSection number="01" title="BEFORE YOU START">
          <View style={styles.factGrid}>
            <GuideFact label="TIME" value={guide.time} />
            <GuideFact label="COST" value={guide.estimatedCost} />
            <GuideFact
              label="POSSIBLE SAVINGS"
              value={guide.estimatedSavings}
            />
            <GuideFact label="DIFFICULTY" value={guide.difficulty} />
          </View>
          <Text style={styles.supplyHeading}>WHAT YOU MAY NEED</Text>
          <Text style={styles.supplyText}>{guide.supplies.join(' · ')}</Text>
        </DetailSection>

        <DetailSection number="02" title="WHAT ACTUALLY MATTERS">
          <View style={styles.stepList}>
            {guide.essentials.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </DetailSection>

        <DetailSection number="03" title="CAN I SKIP IT?">
          <View style={styles.skipCard}>
            <CircleMinus size={24} color={COLORS.ink} />
            <Text style={styles.skipText}>{guide.skipNote}</Text>
          </View>
        </DetailSection>

        <DetailSection number="04" title="WHAT TO RECONSIDER">
          <View style={styles.avoidList}>
            {guide.avoid.map(item => (
              <View key={item.name} style={styles.avoidRow}>
                <View style={styles.avoidMark}>
                  <X size={16} color={COLORS.card} />
                </View>
                <View style={styles.avoidCopy}>
                  <Text style={styles.avoidName}>{item.name}</Text>
                  <Text style={styles.avoidReason}>{item.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        </DetailSection>

        <DetailSection number="05" title="DO THIS INSTEAD">
          <View style={styles.optionList}>
            {guide.options.map(option => (
              <View key={option.name} style={styles.optionCard}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionName}>{option.name}</Text>
                <Text style={styles.optionDetail}>{option.detail}</Text>
              </View>
            ))}
          </View>
        </DetailSection>

        <DetailSection number="06" title="SAFETY BOUNDARY">
          <View style={styles.safetyCard}>
            <Text style={styles.safetyLabel}>USE CAUTION</Text>
            <Text style={styles.safetyText}>{guide.safetyNote}</Text>
            <Text style={styles.proHeading}>GET PROFESSIONAL HELP WHEN</Text>
            {guide.professionalHelp.map(item => (
              <View key={item} style={styles.proRow}>
                <Text style={styles.proBullet}>•</Text>
                <Text style={styles.proText}>{item}</Text>
              </View>
            ))}
          </View>
        </DetailSection>

        <View style={styles.evidenceCard}>
          <View style={styles.evidenceHeader}>
            <View>
              <Text style={styles.evidenceEyebrow}>EVIDENCE CHECK</Text>
              <Text style={styles.evidenceStrength}>{guide.evidence}</Text>
            </View>
            <View style={styles.evidenceBars}>
              {[0, 1, 2].map(bar => {
                const active =
                  guide.evidence === 'Strong' ||
                  (guide.evidence === 'Moderate' && bar < 2) ||
                  (guide.evidence === 'Limited' && bar < 1);
                return (
                  <View
                    key={bar}
                    style={[
                      styles.evidenceBar,
                      active && styles.evidenceBarActive,
                    ]}
                  />
                );
              })}
            </View>
          </View>
          <Text style={styles.evidenceNote}>{guide.evidenceNote}</Text>
          <Text style={styles.updated}>
            REVIEWED {guide.updatedAt.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          Educational information only. Use qualified professional help when a
          task is hazardous, regulated, destructive, or beyond your experience.
        </Text>
      </ScrollView>
    </View>
  );
}

function GuideFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factCard}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function DetailSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.detailSection}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>{number}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  topBar: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  savedButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  savedButtonActive: {
    backgroundColor: COLORS.lime,
  },
  savedButtonText: {
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: COLORS.card,
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  hero: {
    paddingTop: 38,
    paddingBottom: 28,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 17,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.orange,
  },
  kicker: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: COLORS.ink,
    fontSize: 48,
    lineHeight: 49,
    fontWeight: '900',
    letterSpacing: -2.4,
    maxWidth: 650,
  },
  heroBody: {
    color: COLORS.muted,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 18,
    maxWidth: 480,
  },
  searchWrap: {
    minHeight: 58,
    backgroundColor: COLORS.card,
    borderColor: COLORS.ink,
    borderWidth: 2,
    borderRadius: 4,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 16,
    paddingVertical: 14,
  },
  chips: {
    gap: 8,
    paddingTop: 22,
    paddingBottom: 9,
    paddingRight: 20,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: COLORS.ink,
    borderColor: COLORS.ink,
  },
  chipText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.card,
  },
  listHeader: {
    marginTop: 32,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultCount: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  guideList: {
    borderTopWidth: 1.5,
    borderTopColor: COLORS.ink,
  },
  guideCard: {
    minHeight: 120,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.ink,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.paper,
  },
  pressed: {
    backgroundColor: COLORS.lime,
  },
  cardNumberWrap: {
    width: 44,
    paddingTop: 23,
  },
  cardNumber: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  cardMain: {
    flex: 1,
    paddingVertical: 21,
    paddingRight: 12,
  },
  cardCategory: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  cardTitle: {
    color: COLORS.ink,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  cardPrompt: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  cardArrow: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.line,
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 30,
  },
  emptySymbol: {
    color: COLORS.ink,
    fontSize: 54,
    fontWeight: '900',
    marginBottom: 10,
  },
  emptyTitle: {
    color: COLORS.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  emptyBody: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 9,
    maxWidth: 360,
  },
  promise: {
    backgroundColor: COLORS.ink,
    marginTop: 42,
    padding: 24,
    borderRadius: 4,
  },
  promiseLabel: {
    color: COLORS.lime,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  promiseTitle: {
    color: COLORS.card,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 18,
  },
  promiseBody: {
    color: '#C8C5BC',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 440,
  },
  savedHero: {
    paddingTop: 64,
    paddingBottom: 34,
  },
  pageEyebrow: {
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 15,
  },
  pageTitle: {
    color: COLORS.ink,
    fontSize: 48,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: -2,
  },
  pageBody: {
    color: COLORS.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    maxWidth: 430,
  },
  savedEmpty: {
    minHeight: 390,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  savedEmptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  primaryButton: {
    marginTop: 24,
    minHeight: 48,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    borderRadius: 3,
    backgroundColor: COLORS.lime,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  primaryButtonText: {
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  detailShell: {
    flex: 1,
  },
  detailTopBar: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailWordmark: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSaved: {
    backgroundColor: COLORS.lime,
  },
  detailContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  detailHero: {
    paddingTop: 34,
    paddingBottom: 28,
  },
  detailCategory: {
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 17,
  },
  detailTitle: {
    color: COLORS.ink,
    fontSize: 46,
    lineHeight: 48,
    fontWeight: '900',
    letterSpacing: -2.2,
  },
  detailPrompt: {
    color: COLORS.muted,
    fontSize: 18,
    lineHeight: 25,
    marginTop: 12,
  },
  answerCard: {
    backgroundColor: COLORS.lime,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: 4,
    padding: 22,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    marginBottom: 46,
  },
  answerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  answerLabel: {
    color: COLORS.ink,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  answerIcon: {
    color: COLORS.ink,
    fontSize: 25,
    fontWeight: '900',
  },
  answerText: {
    color: COLORS.ink,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 25,
    maxWidth: 570,
  },
  answerSummary: {
    color: '#3A3A32',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 13,
    maxWidth: 600,
  },
  detailSection: {
    marginBottom: 45,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.ink,
    paddingBottom: 11,
    marginBottom: 18,
  },
  sectionNumber: {
    width: 39,
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  stepList: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },
  stepNumber: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    color: COLORS.card,
    fontSize: 11,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 16,
    lineHeight: 24,
    paddingTop: 2,
  },
  factGrid: {
    gap: 10,
  },
  factCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 3,
    padding: 15,
  },
  factLabel: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  factValue: {
    color: COLORS.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  supplyHeading: {
    color: COLORS.ink,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 20,
  },
  supplyText: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 7,
  },
  skipCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    borderRadius: 3,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  skipText: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 15,
    lineHeight: 23,
  },
  avoidList: {
    gap: 0,
  },
  avoidRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  avoidMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  avoidCopy: {
    flex: 1,
  },
  avoidName: {
    color: COLORS.ink,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  avoidReason: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  optionList: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    borderRadius: 3,
    padding: 18,
  },
  optionLabel: {
    alignSelf: 'flex-start',
    color: COLORS.ink,
    backgroundColor: COLORS.lime,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 13,
  },
  optionName: {
    color: COLORS.ink,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  optionDetail: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  safetyCard: {
    backgroundColor: '#FFF1E9',
    borderWidth: 1.5,
    borderColor: COLORS.orange,
    borderRadius: 3,
    padding: 18,
  },
  safetyLabel: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  safetyText: {
    color: COLORS.ink,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 8,
  },
  proHeading: {
    color: COLORS.ink,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 8,
  },
  proRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 7,
  },
  proBullet: {
    color: COLORS.orange,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },
  proText: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  evidenceCard: {
    backgroundColor: COLORS.ink,
    borderRadius: 4,
    padding: 22,
    marginTop: 2,
  },
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  evidenceEyebrow: {
    color: COLORS.lime,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  evidenceStrength: {
    color: COLORS.card,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginTop: 5,
  },
  evidenceBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    paddingBottom: 4,
  },
  evidenceBar: {
    width: 9,
    height: 18,
    backgroundColor: '#4B4B46',
  },
  evidenceBarActive: {
    height: 28,
    backgroundColor: COLORS.lime,
  },
  evidenceNote: {
    color: '#D2CFC7',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 19,
    maxWidth: 590,
  },
  updated: {
    color: '#86847D',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginTop: 18,
  },
  disclaimer: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    maxWidth: 510,
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
