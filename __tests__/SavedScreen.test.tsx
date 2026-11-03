import { fireEvent, render } from '@testing-library/react-native';
import { SavedScreen } from '../src/screens/SavedScreen';
jest.mock('lucide-react-native', () => ({
  ArrowRight: () => null,
  Bookmark: () => null,
}));
jest.mock('../src/components/AnimatedPressable', () => ({
  AnimatedPressable: require('react-native').Pressable,
}));
const props = {
  signedIn: false,
  authReady: true,
  syncStatus: 'synced' as const,
  guides: [],
  catalog: [],
  savedRecipes: [
    {
      key: 'private',
      productId: 'product',
      recipeId: 'recipe',
      title: 'Private recipe',
    },
  ],
  onOpen: jest.fn(),
  onOpenRecipe: jest.fn(),
  onExplore: jest.fn(),
  onRetry: jest.fn(),
  onSignIn: jest.fn(),
  onRegister: jest.fn(),
  bottomInset: 0,
  scrollOffset: 0,
  onScrollOffsetChange: jest.fn(),
};
test('guests see access instructions and actions instead of saved content', async () => {
  const screen = await render(<SavedScreen {...props} />);
  expect(screen.queryByText('Private recipe')).toBeNull();
  await fireEvent.press(screen.getByText('Create account'));
  await fireEvent.press(screen.getByText('Sign in'));
  expect(props.onRegister).toHaveBeenCalled();
  expect(props.onSignIn).toHaveBeenCalled();
});
test('signed-in users can open their saved recipes', async () => {
  const screen = await render(<SavedScreen {...props} signedIn />);
  await fireEvent.press(
    screen.getByLabelText('Open saved recipe Private recipe'),
  );
  expect(props.onOpenRecipe).toHaveBeenCalledWith('product', 'recipe');
});
