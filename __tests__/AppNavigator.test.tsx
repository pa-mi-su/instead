jest.mock('../src/hooks/useRecipeVisibility', () => ({
  ...jest.requireActual('../src/hooks/useRecipeVisibility'),
  usePersonalRecipes: () => ({
    ready: true,
    loading: false,
    error: '',
    isHidden: () => false,
  }),
}));
import { act, render } from '@testing-library/react-native';
import { AppNavigator } from '../src/navigation/AppNavigator';
import { productCatalog } from '../src/catalog';

const mockHome = jest.fn((_props: Record<string, unknown>) => null);
const mockSaved = jest.fn((_props: Record<string, unknown>) => null);
const mockDetail = jest.fn((_props: Record<string, unknown>) => null);
const mockTopBar = jest.fn((_props: Record<string, unknown>) => null);
const mockProfile = jest.fn((_props: Record<string, unknown>) => null);
const mockBarcode = jest.fn((_props: Record<string, unknown>) => null);
const mockInfo = jest.fn((_props: Record<string, unknown>) => null);
const mockAuthMode = jest.fn();
jest.mock('../src/lib/supabase', () => ({ supabase: null }));
jest.mock('react-native-data-scanner', () => ({
  DataScanner: {
    scanBarcode: jest.fn(async () => ({
      value: '012345678905',
      format: 'upc-a',
    })),
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
jest.mock('../src/hooks/useSafetyAcknowledgement', () => ({
  useSafetyAcknowledgement: () => ({ status: 'accepted' }),
}));
jest.mock('../src/hooks/useGuideCatalog', () => ({
  useGuideCatalog: () => ({
    guides: require('../src/catalog').productCatalog,
    isLoading: false,
  }),
}));
jest.mock('../src/hooks/useCommunity', () => ({
  useCommunity: () => ({
    authReady: true,
    session: { user: { id: 'member', email_confirmed_at: 'today' } },
    setAuthMode: mockAuthMode,
  }),
}));
jest.mock('../src/hooks/useFavorites', () => ({
  useFavorites: () => ({
    favorites: [],
    savedRecipes: [],
    syncStatus: 'synced',
  }),
}));
jest.mock('../src/lib/barcodeLookup', () => ({
  normalizeBarcode: (value: string) => value,
  lookupBarcodeProduct: jest.fn(async () => null),
}));
jest.mock('../src/components/KeyboardDismissControl', () => ({
  KeyboardDismissControl: () => null,
}));
jest.mock('../src/components/TopBar', () => ({
  TopBar: (props: Record<string, unknown>) => mockTopBar(props),
}));
jest.mock('../src/screens/HomeScreen', () => ({
  HomeScreen: (props: Record<string, unknown>) => mockHome(props),
}));
jest.mock('../src/screens/SavedScreen', () => ({
  SavedScreen: (props: Record<string, unknown>) => mockSaved(props),
}));
jest.mock('../src/screens/GuideDetailScreen', () => ({
  GuideDetailScreen: (props: Record<string, unknown>) => mockDetail(props),
}));
jest.mock('../src/screens/ProfileScreen', () => ({
  ProfileScreen: (props: Record<string, unknown>) => mockProfile(props),
}));
jest.mock('../src/screens/BarcodeMatchScreen', () => ({
  BarcodeMatchScreen: (props: Record<string, unknown>) => mockBarcode(props),
}));
jest.mock('../src/screens/InfoScreen', () => ({
  InfoScreen: (props: Record<string, unknown>) => mockInfo(props),
}));
jest.mock('../src/screens/AccountScreen', () => ({
  AccountScreen: () => null,
}));
function latestProps(screen: typeof mockHome) {
  return screen.mock.calls.at(-1)![0];
}
async function follow(
  screen: typeof mockHome,
  name: string,
  ...args: string[]
) {
  await act(async () => {
    await (latestProps(screen)[name] as (...values: string[]) => unknown)(
      ...args,
    );
  });
}
beforeEach(() => jest.clearAllMocks());
test('Saved preserves the exact recipe ID; profile/back restores it; plain guides clear it', async () => {
  await render(<AppNavigator />);
  const guide = productCatalog[0]!;
  await follow(mockTopBar, 'onSaved');
  await follow(mockSaved, 'onOpenRecipe', guide.id, 'admin:exact-recipe');
  expect(latestProps(mockDetail).initialRecipeId).toBe('admin:exact-recipe');
  expect(latestProps(mockDetail).guide).toBe(guide);
  await follow(mockDetail, 'onOpenProfile', 'Paul');
  expect(latestProps(mockProfile).username).toBe('Paul');
  await follow(mockProfile, 'onBack');
  expect(latestProps(mockDetail).initialRecipeId).toBe('admin:exact-recipe');
  await follow(mockDetail, 'onBack');
  await follow(mockSaved, 'onOpen', guide.id);
  expect(latestProps(mockDetail).initialRecipeId).toBeUndefined();
  await follow(mockDetail, 'onBack');
  await follow(mockTopBar, 'onHome');
  await follow(mockHome, 'onOpen', guide.id);
  expect(latestProps(mockDetail).initialRecipeId).toBeUndefined();
});
test('barcode results open the selected guide, and Info returns to the home directory', async () => {
  await render(<AppNavigator />);
  await follow(mockHome, 'onScan');
  await follow(mockBarcode, 'onOpen', productCatalog[1]!.id);
  expect(latestProps(mockDetail).guide).toBe(productCatalog[1]);
  expect(latestProps(mockDetail).initialRecipeId).toBeUndefined();
  await follow(mockDetail, 'onBack');
  await follow(mockBarcode, 'onBack');
  await follow(mockTopBar, 'onInfo');
  await follow(mockInfo, 'onBack');
  expect(mockHome).toHaveBeenCalled();
});
test('Saved registration and sign-in actions select the right account flow', async () => {
  await render(<AppNavigator />);
  await follow(mockTopBar, 'onSaved');
  await follow(mockSaved, 'onRegister');
  expect(mockAuthMode).toHaveBeenLastCalledWith('signup');
  await follow(mockTopBar, 'onSaved');
  await follow(mockSaved, 'onSignIn');
  expect(mockAuthMode).toHaveBeenLastCalledWith('signin');
});
