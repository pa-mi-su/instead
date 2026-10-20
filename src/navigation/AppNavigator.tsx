import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  PanResponder,
  Platform,
  StatusBar,
  View,
} from 'react-native';
import { DataScanner } from 'react-native-data-scanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categories } from '../categories';
import { TopBar } from '../components/TopBar';
import { KeyboardDismissControl } from '../components/KeyboardDismissControl';
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
  const history = useRef<{ view: ViewName; selectedId: string | null }[]>([]);
  const homeScrollOffset = useRef(0);
  const savedScrollOffset = useRef(0);
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

  function navigate(nextView: ViewName, nextSelectedId = selectedId) {
    history.current.push({ view, selectedId });
    setSelectedId(nextSelectedId);
    setView(nextView);
  }

  function openGuide(id: string) {
    history.current.push({ view, selectedId });
    setSelectedId(id);
    setView('detail');
  }

  function goHome() {
    history.current = [];
    setSelectedId(null);
    setView('home');
  }

  function goBack() {
    const previous = history.current.pop();
    setSelectedId(previous?.selectedId ?? null);
    setView(previous?.view ?? 'home');
  }

  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (history.current.length === 0) return false;
        goBackRef.current();
        return true;
      },
    );

    return () => subscription.remove();
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          history.current.length > 0 &&
          gesture.x0 < 32 &&
          gesture.dx > 45 &&
          Math.abs(gesture.dy) < 48,
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx > 60 && Math.abs(gesture.dy) < 56) goBackRef.current();
        },
      }),
    [],
  );

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

      navigate('barcode', null);
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
    <View
      style={[styles.app, { paddingTop: Math.max(insets.top, 12) }]}
      {...(Platform.OS === 'ios' ? panResponder.panHandlers : {})}
    >
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
          onBack={goBack}
          onSave={() => toggleFavorite(selected.id)}
          bottomInset={insets.bottom}
        />
      ) : (
        <>
          <TopBar
            activeView={view}
            savedCount={favorites.length}
            onInfo={() => navigate('info')}
            onHome={goHome}
            onSaved={() => navigate('saved')}
          />
          {view === 'info' ? (
            <InfoScreen onBack={goHome} bottomInset={insets.bottom} />
          ) : view === 'barcode' && barcodeLookup ? (
            <BarcodeMatchScreen
              lookup={barcodeLookup}
              guides={catalog}
              bottomInset={insets.bottom}
              onBack={goBack}
              onScan={scanProduct}
              onOpen={openGuide}
              onSearch={value => {
                setQuery(value);
                setCategory('All');
                navigate('home', null);
              }}
              onCategory={value => {
                setQuery('');
                setCategory(value);
                navigate('home', null);
              }}
            />
          ) : view === 'saved' ? (
            <SavedScreen
              guides={saved}
              onOpen={openGuide}
              onExplore={goHome}
              bottomInset={insets.bottom}
              scrollOffset={savedScrollOffset.current}
              onScrollOffsetChange={offset => {
                savedScrollOffset.current = offset;
              }}
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
              isLoadingLive={isLoading}
              bottomInset={insets.bottom}
              scrollOffset={homeScrollOffset.current}
              onScrollOffsetChange={offset => {
                homeScrollOffset.current = offset;
              }}
            />
          )}
        </>
      )}
      <KeyboardDismissControl />
    </View>
  );
}
