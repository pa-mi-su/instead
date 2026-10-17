import { fireEvent, render } from '@testing-library/react-native';
import { RecipeComments } from '../src/components/RecipeComments';
import { ExpandableSafety } from '../src/components/ExpandableSafety';
import { productCatalog } from '../src/catalog';

jest.mock('../src/hooks/useCommunity', () => ({
  useCommunity: jest.fn(() => ({
    comments: [
      {
        id: 'approved',
        body: 'A helpful ingredient swap',
        votes: 4,
        moderation_status: 'approved',
      },
      {
        id: 'private',
        body: 'Pending private suggestion',
        votes: 0,
        moderation_status: 'pending',
      },
    ],
    publicCount: 1,
    loading: false,
    retry: jest.fn(),
  })),
}));
jest.mock('../src/components/ProductComments', () => ({
  ProductComments: () => null,
}));
jest.mock('../src/lib/supabase', () => ({ supabase: null }));

test('recipe preview shows only the top published comment and opens a separate discussion', async () => {
  const screen = await render(
    <RecipeComments
      productId="natural-glass-cleaner"
      recipeId="builtin:glassCleanerRecipe"
      title="Glass cleaner"
    />,
  );
  expect(screen.getByText('A helpful ingredient swap')).toBeTruthy();
  expect(screen.queryByText('Pending private suggestion')).toBeNull();
  await fireEvent.press(screen.getByText('View all 1 comment'));
  expect(screen.getByText('Back to recipe')).toBeTruthy();
  await fireEvent.press(screen.getByText('Back to recipe'));
  expect(screen.queryByText('Back to recipe')).toBeNull();
});

test('warnings start compact, keep essential cautions visible, and expand on request', async () => {
  const guide = productCatalog.find(item => item.id === 'natural-toothpaste')!;
  const screen = await render(<ExpandableSafety guide={guide} />);
  expect(screen.getByText(/Honey: never under 12 months/)).toBeTruthy();
  expect(screen.queryByText(guide.reviewNotice!)).toBeNull();
  await fireEvent.press(screen.getByText('Read all safety warnings'));
  expect(screen.getByText(guide.reviewNotice!)).toBeTruthy();
  await fireEvent.press(screen.getByText('Hide safety warnings'));
  expect(screen.queryByText(guide.reviewNotice!)).toBeNull();
});
