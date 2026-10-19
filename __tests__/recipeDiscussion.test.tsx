import { fireEvent, render } from '@testing-library/react-native';
import { RecipeVoteButtons } from '../src/components/RecipeVoteButtons';
import { RecipePhotoGallery } from '../src/components/RecipePhotoGallery';
import { ExpandableSafety } from '../src/components/ExpandableSafety';
import { productCatalog } from '../src/catalog';

jest.mock('../src/lib/supabase', () => ({ supabase: null }));
jest.mock('react-native/Libraries/Modal/Modal', () => ({
  __esModule: true,
  default: ({ visible, children }: { visible: boolean; children: unknown }) =>
    visible ? children : null,
}));
jest.mock('lucide-react-native', () => ({
  ThumbsDown: () => null,
  ThumbsUp: () => null,
}));

test('recipe votes ask signed-out users to sign in and can be dismissed', async () => {
  const screen = await render(
    <RecipeVoteButtons
      productId="natural-glass-cleaner"
      recipeId="builtin:glassCleanerRecipe"
      title="Glass cleaner"
      signedIn={false}
      canVote={false}
      onSignIn={jest.fn()}
    />,
  );
  await fireEvent.press(screen.getByLabelText('Vote this recipe up'));
  expect(screen.getByText('Sign in to vote')).toBeTruthy();
  await fireEvent.press(screen.getByText('Maybe later'));
  expect(screen.queryByText('Sign in to vote')).toBeNull();
});

test('signed-in voters are sent to account setup instead of sign-in again', async () => {
  const onSignIn = jest.fn();
  const screen = await render(
    <RecipeVoteButtons
      productId="natural-glass-cleaner"
      recipeId="builtin:glassCleanerRecipe"
      title="Glass cleaner"
      signedIn
      canVote={false}
      onSignIn={onSignIn}
    />,
  );
  await fireEvent.press(screen.getByLabelText('Vote this recipe up'));
  expect(screen.getByText('One more step to vote')).toBeTruthy();
  expect(screen.queryByText('Sign in to vote')).toBeNull();
  await fireEvent.press(screen.getByText('Review account setup'));
  expect(onSignIn).toHaveBeenCalledTimes(1);
});

test('verified eligible users can vote without seeing the sign-in prompt', async () => {
  const onVote = jest.fn();
  const screen = await render(
    <RecipeVoteButtons
      productId="natural-glass-cleaner"
      recipeId="community:glassCleanerRecipe"
      title="Glass cleaner"
      signedIn
      canVote
      onSignIn={jest.fn()}
      onVote={onVote}
    />,
  );
  await fireEvent.press(screen.getByLabelText('Vote this recipe up'));
  expect(onVote).toHaveBeenCalledWith(1);
  expect(screen.queryByText('Sign in to vote')).toBeNull();
});

test('recipe votes show the database error instead of hiding it', async () => {
  const screen = await render(
    <RecipeVoteButtons
      productId="natural-glass-cleaner"
      recipeId="community:glassCleanerRecipe"
      title="Glass cleaner"
      signedIn
      canVote
      onSignIn={jest.fn()}
      onVote={() => Promise.reject({ message: 'Recipe is unavailable.' })}
    />,
  );
  await fireEvent.press(screen.getByLabelText('Vote this recipe up'));
  expect(await screen.findByText('Recipe is unavailable.')).toBeTruthy();
});

test('recipe photos open in an enlarged viewer and can be dismissed', async () => {
  const screen = await render(
    <RecipePhotoGallery
      photos={['https://example.com/photo.jpg']}
      title="Soap"
    />,
  );
  await fireEvent.press(screen.getByLabelText('Expand Soap photo 1'));
  expect(screen.getByLabelText('Soap, enlarged photo')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Close enlarged photo'));
  expect(screen.queryByLabelText('Soap, enlarged photo')).toBeNull();
});

test('recipes without optional photos render no photo gallery', async () => {
  const screen = await render(<RecipePhotoGallery photos={[]} title="Soap" />);
  expect(screen.queryByLabelText('Soap photos')).toBeNull();
});

test('roach and mosquito recipes keep their photos in the supplied order', () => {
  const roachPhotos = productCatalog.find(
    guide => guide.title === 'Roach control',
  )!.recipes?.[0]?.photos;
  const mosquitoPhotos = productCatalog.find(
    guide => guide.title === 'Mosquito control',
  )!.recipes?.[0]?.photos;

  expect(roachPhotos).toEqual([
    require('../assets/photos/roach-bottle-trap.png'),
    require('../assets/photos/roach-bottle-trap-cockroaches.png'),
  ]);
  expect(mosquitoPhotos).toEqual([
    require('../assets/photos/mosquito-bucket.png'),
    require('../assets/photos/mosquito-bucket-catch.png'),
  ]);
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
