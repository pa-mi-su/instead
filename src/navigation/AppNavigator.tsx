import { useMemo, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categories } from '../categories';
import { TopBar } from '../components/TopBar';
import { useFavorites } from '../hooks/useFavorites';
import { useGuideCatalog } from '../hooks/useGuideCatalog';
import { GuideDetailScreen } from '../screens/GuideDetailScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { COLORS, styles } from '../styles';
import type { ViewName } from './types';

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  const { guides: catalog, isLoading } = useGuideCatalog();
  const { favorites, toggleFavorite } = useFavorites();
  const [view, setView] = useState<ViewName>('home');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('All');

  const selected = catalog.find(item => item.id === selectedId) ?? null;
  const saved = catalog.filter(item => favorites.includes(item.id));

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

  function openGuide(id: string) {
    setSelectedId(id);
    setView('detail');
  }

  function goHome() {
    setSelectedId(null);
    setView('home');
  }

  return (
    <View style={[styles.app, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.paper} />
      {view === 'detail' && selected ? (
        <GuideDetailScreen
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
            <SavedScreen
              guides={saved}
              onOpen={openGuide}
              onExplore={goHome}
              bottomInset={insets.bottom}
            />
          ) : (
            <HomeScreen
              guides={filtered}
              query={query}
              onQuery={setQuery}
              category={category}
              onCategory={setCategory}
              onOpen={openGuide}
              isLoadingLive={isLoading}
              bottomInset={insets.bottom}
            />
          )}
        </>
      )}
    </View>
  );
}
