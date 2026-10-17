import { ArrowLeft, ArrowRight, ScanLine, Search } from 'lucide-react-native';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';
import { categories } from '../categories';
import { COLORS, styles } from '../styles';
import type { BarcodeProduct } from '../lib/barcodeLookup';
import type { Guide } from '../types';

type DirectoryCategory = Exclude<(typeof categories)[number], 'All'>;

export type BarcodeLookupState =
  | { status: 'loading'; barcode: string; product: null; error: '' }
  | { status: 'found'; barcode: string; product: BarcodeProduct; error: '' }
  | { status: 'not-found'; barcode: string; product: null; error: '' }
  | { status: 'error'; barcode: string; product: null; error: string };

export function BarcodeMatchScreen({
  lookup,
  guides,
  bottomInset,
  onBack,
  onScan,
  onSearch,
  onCategory,
  onOpen,
}: {
  lookup: BarcodeLookupState;
  guides: Guide[];
  bottomInset: number;
  onBack: () => void;
  onScan: () => void;
  onSearch: (query: string) => void;
  onCategory: (category: DirectoryCategory) => void;
  onOpen: (guideId: string) => void;
}) {
  const matchedGuide = lookup.product?.guideId
    ? guides.find(guide => guide.id === lookup.product?.guideId)
    : undefined;
  const searchSuggestion = matchedGuide?.title ?? lookup.product?.name ?? '';
  const [search, setSearch] = useState(searchSuggestion);
  useEffect(() => {
    setSearch(searchSuggestion);
  }, [searchSuggestion]);
  const availableCategories = categories.filter(
    (category): category is DirectoryCategory =>
      category !== 'All' && guides.some(guide => guide.category === category),
  );

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        styles.barcodePage,
        { paddingBottom: Math.max(bottomInset + 30, 46) },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        onPress={onBack}
        style={styles.barcodeBack}
        accessibilityRole="button"
        accessibilityLabel="Back to directory"
      >
        <ArrowLeft size={17} color={COLORS.ink} />
        <Text style={styles.barcodeBackText}>DIRECTORY</Text>
      </Pressable>

      <View style={styles.barcodeHero}>
        <Text style={styles.kicker}>BARCODE LOOKUP</Text>
        <Text style={styles.pageTitle}>
          {lookup.status === 'loading' ? 'Looking it up.' : 'What we found.'}
        </Text>
        <Text style={styles.pageBody}>
          {lookup.status === 'loading'
            ? 'Checking a product database for this barcode.'
            : 'A barcode can suggest a product category. It cannot tell us which INSTEAD recipe is right for you.'}
        </Text>
      </View>

      {lookup.status === 'loading' ? (
        <View style={styles.barcodeLoading}>
          <ActivityIndicator size="large" color={COLORS.orange} />
          <Text style={styles.barcodeLoadingText}>Searching product data…</Text>
        </View>
      ) : null}

      {lookup.status === 'error' ? (
        <View style={styles.barcodeNotice}>
          <Text style={styles.barcodeNoticeTitle}>Lookup unavailable</Text>
          <Text style={styles.barcodeNoticeBody}>{lookup.error}</Text>
          <Pressable onPress={onScan} style={styles.barcodeTextButton}>
            <ScanLine size={17} color={COLORS.ink} />
            <Text style={styles.barcodeTextButtonLabel}>Scan again</Text>
          </Pressable>
        </View>
      ) : null}

      {lookup.status === 'not-found' ? (
        <View style={styles.barcodeNotice}>
          <Text style={styles.barcodeNoticeTitle}>We couldn’t identify it</Text>
          <Text style={styles.barcodeNoticeBody}>
            We couldn’t find this barcode in the product database, even after
            checking common UPC/EAN equivalents. Search by the product name or
            choose a directory category below.
          </Text>
          <Pressable onPress={onScan} style={styles.barcodeTextButton}>
            <ScanLine size={17} color={COLORS.ink} />
            <Text style={styles.barcodeTextButtonLabel}>Scan again</Text>
          </Pressable>
        </View>
      ) : null}

      {lookup.status === 'found' ? (
        <View style={styles.barcodeProductCard}>
          <Text style={styles.barcodeEyebrow}>PRODUCT DATABASE RESULT</Text>
          <Text style={styles.barcodeProductName}>{lookup.product.name}</Text>
          {lookup.product.brand ? (
            <Text style={styles.barcodeBrand}>{lookup.product.brand}</Text>
          ) : null}
          {matchedGuide ? (
            <>
              <View style={styles.barcodeRule} />
              <Text style={styles.barcodeMatchTitle}>
                We found {matchedGuide.title.toLowerCase()} alternatives.
              </Text>
              <Text style={styles.barcodeNoticeBody}>
                Check that this category fits the product you scanned.
              </Text>
              <Pressable
                onPress={() => onOpen(matchedGuide.id)}
                style={styles.barcodePrimaryButton}
                accessibilityRole="button"
              >
                <Text style={styles.barcodePrimaryText}>
                  See {matchedGuide.title.toLowerCase()} alternatives
                </Text>
                <ArrowRight size={18} color={COLORS.card} />
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.barcodeRule} />
              <Text style={styles.barcodeMatchTitle}>
                We couldn’t confidently match a category.
              </Text>
              <Text style={styles.barcodeNoticeBody}>
                Choose a category or search the directory instead.
              </Text>
            </>
          )}
        </View>
      ) : null}

      {lookup.status !== 'loading' ? (
        <>
          <View style={styles.barcodeSearchWrap}>
            <Search size={18} color={COLORS.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by product or alternative"
              placeholderTextColor="#8B887F"
              style={styles.barcodeSearchInput}
              selectionColor={COLORS.orange}
              returnKeyType="search"
              onSubmitEditing={() => onSearch(search.trim())}
              accessibilityLabel="Search for a product or alternative"
            />
            <Pressable
              onPress={() => onSearch(search.trim())}
              disabled={!search.trim()}
              style={styles.barcodeSearchButton}
              accessibilityRole="button"
              accessibilityLabel="Search directory"
            >
              <ArrowRight size={18} color={COLORS.ink} />
            </Pressable>
          </View>
          <Text style={styles.barcodeSectionTitle}>OR BROWSE BY CATEGORY</Text>
          <View style={styles.barcodeCategoryList}>
            {availableCategories.map(category => (
              <Pressable
                key={category}
                onPress={() => onCategory(category)}
                style={styles.barcodeCategoryButton}
                accessibilityRole="button"
              >
                <Text style={styles.barcodeCategoryText}>{category}</Text>
                <ArrowRight size={16} color={COLORS.ink} />
              </Pressable>
            ))}
          </View>
          <Text style={styles.barcodeDisclosure}>
            Barcode details come from Open Food Facts and may be incomplete or
            incorrect. The match only points to a directory topic; it does not
            compare ingredients or establish that a recipe is safe, effective,
            or equivalent. INSTEAD does not save your scanned barcode or scan
            history.
          </Text>
          <Pressable
            onPress={() =>
              Linking.openURL('https://world.openfoodfacts.org').catch(
                () => undefined,
              )
            }
            style={styles.barcodeAttribution}
            accessibilityRole="link"
            accessibilityLabel="Open Food Facts product data and license"
          >
            <Text style={styles.barcodeAttributionText}>
              Product data: Open Food Facts · Open Database License (ODbL)
            </Text>
            <ArrowRight size={14} color={COLORS.ink} />
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}
