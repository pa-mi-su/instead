import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  View,
} from 'react-native';
import { DataScanner } from 'react-native-data-scanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categories } from '../categories';
import { TopBar } from '../components/TopBar';
import { useFavorites } from '../hooks/useFavorites';
import { useGuideCatalog } from '../hooks/useGuideCatalog';
import { GuideDetailScreen } from '../screens/GuideDetailScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { COLORS, styles } from '../styles';
import { InfoScreen } from '../screens/InfoScreen';
import { useSafetyAcknowledgement } from '../hooks/useSafetyAcknowledgement';
import { lookupBarcodeProduct, normalizeBarcode } from '../lib/barcodeLookup';
import {
  BarcodeMatchScreen,
  type BarcodeLookupState,
} from '../screens/BarcodeMatchScreen';
import type { ViewName } from './types';

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  const acknowledgement = useSafetyAcknowledgement();
  const { guides: catalog, isLoading } = useGuideCatalog();
  const { favorites, toggleFavorite } = useFavorites();
  const [view, setView] = useState<ViewName>('home');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('All');
  const [barcodeLookup, setBarcodeLookup] = useState<BarcodeLookupState | null>(
    null,
  );

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

  async function scanProduct() {
    if (Platform.OS === 'ios' && Number(Platform.Version) < 16) {
      Alert.alert(
        'Update iOS to scan',
        'Barcode scanning needs iOS 16 or later. You can browse the directory instead.',
      );
      return;
    }

    try {
      const scanned = await DataScanner.scanBarcode({
        targetFormats: [
          'ean-13',
          'ean-8',
          'upc-a',
          'upc-e',
          'itf',
          'code-128',
          'data-matrix',
        ],
        qualityLevel: 'accurate',
        enableAutoZoom: true,
      });
      const barcode = normalizeBarcode(scanned.value);
      if (!barcode) {
        Alert.alert(
          'Barcode not supported',
          'Scan a UPC or EAN product barcode, or browse the directory instead.',
        );
        return;
      }

      setView('barcode');
      setBarcodeLookup({
        status: 'loading',
        barcode,
        product: null,
        error: '',
      });

      try {
        const product = await lookupBarcodeProduct(barcode, scanned.format);
        setBarcodeLookup(
          product
            ? { status: 'found', barcode, product, error: '' }
            : { status: 'not-found', barcode, product: null, error: '' },
        );
      } catch (error) {
        setBarcodeLookup({
          status: 'error',
          barcode,
          product: null,
          error:
            error instanceof Error
              ? error.message
              : 'The product lookup service is unavailable.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/cancel/i.test(message)) return;
      Alert.alert(
        'Barcode scanner unavailable',
        'Check camera access. On Android, Google Play Services must be available. You can browse the directory instead.',
      );
    }
  }

  return (
    <View style={[styles.app, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.paper} />
      {acknowledgement.status === 'loading' ? (
        <ActivityIndicator accessibilityLabel="Loading safety acknowledgement" />
      ) : acknowledgement.status === 'required' ? (
        <InfoScreen
          firstUse
          onAccept={acknowledgement.accept}
          busy={acknowledgement.busy}
          error={acknowledgement.error}
          bottomInset={insets.bottom}
        />
      ) : view === 'detail' && selected ? (
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
            onInfo={() => setView('info')}
            onHome={goHome}
            onSaved={() => setView('saved')}
          />
          {view === 'info' ? (
            <InfoScreen bottomInset={insets.bottom} />
          ) : view === 'barcode' && barcodeLookup ? (
            <BarcodeMatchScreen
              lookup={barcodeLookup}
              guides={catalog}
              bottomInset={insets.bottom}
              onBack={goHome}
              onScan={scanProduct}
              onOpen={openGuide}
              onSearch={value => {
                setQuery(value);
                setCategory('All');
                setView('home');
              }}
              onCategory={value => {
                setQuery('');
                setCategory(value);
                setView('home');
              }}
            />
          ) : view === 'saved' ? (
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
              onScan={scanProduct}
              onBrowse={() => setCategory('All')}
              isLoadingLive={isLoading}
              bottomInset={insets.bottom}
            />
          )}
        </>
      )}
    </View>
  );
}
