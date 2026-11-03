import { render, within } from '@testing-library/react-native';
import { View } from 'react-native';
import { RecipeContent } from '../src/components/ProductRecipes';
import type { useRecipes } from '../src/hooks/useRecipes';
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));
jest.mock('lucide-react-native', () => ({ Bookmark: () => null }));
jest.mock('../src/components/RecipeVoteButtons', () => ({
  RecipeVoteButtons: () => null,
}));
jest.mock('../src/components/ReportRecipeButton', () => ({
  ReportRecipeButton: () => null,
}));
jest.mock('../src/components/RecipePhotoGallery', () => ({
  RecipePhotoGallery: () => null,
}));
jest.mock('../src/components/AnimatedPressable', () => ({
  AnimatedPressable: require('react-native').Pressable,
}));
const base = {
  id: 'user-recipe',
  title: 'User recipe',
  mine: true,
  status: 'pending',
  ingredients: 'Ingredients',
  instructions: 'Steps',
  storage_notes: 'Storage',
  cautions: 'Cautions',
  photo_paths: [],
};
const props = {
  productId: 'topic',
  userId: 'user',
  canContribute: false,
  canManage: true,
  onBlock: jest.fn(),
  onSignInRequest: jest.fn(),
  onOpenProfile: jest.fn(),
  savedRecipeIds: [],
  onSaveRecipe: jest.fn(),
};
function controller(approved: boolean) {
  const recipe = { ...base, status: approved ? 'approved' : 'pending' };
  return {
    recipes: approved ? [recipe] : [],
    mine: [recipe],
    ready: true,
    busy: false,
    more: false,
    mineMore: false,
    error: '',
    notice: '',
    photos: [],
    refresh: jest.fn(),
    withdraw: jest.fn(),
  } as unknown as ReturnType<typeof useRecipes>;
}
function Lists({ approved }: { approved: boolean }) {
  const r = controller(approved);
  return (
    <>
      <View testID="published">
        <RecipeContent {...props} controller={r} mode="published" />
      </View>
      <View testID="submissions">
        <RecipeContent {...props} controller={r} mode="submissions" />
      </View>
    </>
  );
}
test('approval moves the same recipe from private submissions into the published list once', async () => {
  const screen = await render(<Lists approved={false} />);
  expect(
    within(screen.getByTestId('published')).queryByText('User recipe'),
  ).toBeNull();
  expect(
    within(screen.getByTestId('submissions')).getByText('User recipe'),
  ).toBeTruthy();
  await screen.rerender(<Lists approved />);
  expect(
    within(screen.getByTestId('published')).getByText('User recipe'),
  ).toBeTruthy();
  expect(
    within(screen.getByTestId('submissions')).queryByText('User recipe'),
  ).toBeNull();
  expect(screen.getAllByText('User recipe')).toHaveLength(1);
  expect(screen.queryByText('Community recipes')).toBeNull();
});
