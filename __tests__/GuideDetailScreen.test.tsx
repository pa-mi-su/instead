import { notifyCommunityChanged } from '../src/lib/communityUpdates';
import { supabase } from '../src/lib/supabase';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { GuideDetailScreen } from '../src/screens/GuideDetailScreen';
import { productCatalog } from '../src/catalog';

const mockScrollTo = jest.fn();
jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef((props: { children: unknown }, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
      return React.createElement(View, props, props.children);
    }),
  };
});

jest.mock('../src/lib/supabase', () => ({
  supabase: { rpc: jest.fn(async () => ({ data: null, error: null })) },
}));
let mockSession: { user: { id: string } } | null = null;
jest.mock('../src/hooks/useCommunity', () => ({
  useCommunity: () => ({ session: mockSession, canContribute: false }),
}));
jest.mock('../src/components/ProductCommunity', () => ({
  ProductCommunity: () => null,
}));
jest.mock('../src/components/BrandLogo', () => ({ BrandLogo: () => null }));
jest.mock('../src/components/ExpandableSafety', () => ({
  ExpandableSafety: () => null,
}));
jest.mock('../src/components/RecipeVoteButtons', () => ({
  RecipeVoteButtons: ({
    recipeId,
    rating,
  }: {
    recipeId: string;
    rating: unknown;
  }) =>
    require('react').createElement(
      require('react-native').Text,
      { testID: `rating-${recipeId}` },
      JSON.stringify(rating),
    ),
}));
jest.mock('../src/components/RecipePhotoGallery', () => ({
  RecipePhotoGallery: () => null,
}));
jest.mock('../src/components/AnimatedPressable', () => ({
  AnimatedPressable: require('react-native').Pressable,
}));
jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Bookmark: () => null,
}));

test('opening a saved recipe survives the layout event being cleared before the next frame', async () => {
  const frames: Parameters<typeof requestAnimationFrame>[0][] = [];
  const raf = jest
    .spyOn(global, 'requestAnimationFrame')
    .mockImplementation(callback => {
      frames.push(callback);
      return frames.length;
    });
  try {
    const guide = productCatalog.find(item => item.recipes?.length)!;
    const recipe = guide.recipes![0]!;
    const screen = await render(
      <GuideDetailScreen
        guide={guide}
        initialRecipeId={recipe.id}
        isSaved={false}
        savedRecipeIds={[]}
        onBack={jest.fn()}
        onSave={jest.fn()}
        onSaveRecipe={jest.fn()}
        onOpenProfile={jest.fn()}
        bottomInset={0}
      />,
    );
    const event = {
      nativeEvent: { layout: { x: 0, y: 180, width: 320, height: 500 } } as {
        layout: { x: number; y: number; width: number; height: number };
      } | null,
    };
    let card = screen.getByText(recipe.name).parent;
    while (card && !card.props.onLayout) card = card.parent;
    if (!card) throw new Error('Recipe card layout handler not found');
    await fireEvent(card, 'layout', event);
    expect(frames.length).toBeGreaterThan(0);
    // Reproduce React Native releasing its event before requestAnimationFrame.
    event.nativeEvent = null;
    expect(() => frames.forEach(callback => callback(0))).not.toThrow();
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 156, animated: false });
  } finally {
    raf.mockRestore();
  }
});

function ratingGuide() {
  const original = productCatalog.find(item => item.recipes?.length)!;
  return { ...original, recipes: [original.recipes![0]!] };
}
const detailProps = {
  isSaved: false,
  savedRecipeIds: [],
  onBack: jest.fn(),
  onSave: jest.fn(),
  onSaveRecipe: jest.fn(),
  onOpenProfile: jest.fn(),
  bottomInset: 0,
};

test('deleting the account refreshes highlighted votes and totals without leaving the guide', async () => {
  const guide = ratingGuide();
  const recipe = guide.recipes[0]!;
  mockSession = { user: { id: 'member' } };
  let deleted = false;
  const rpc = supabase!.rpc as jest.Mock;
  rpc.mockImplementation(async () => ({
    data: {
      score: deleted ? 0 : -1,
      downvotes: deleted ? 0 : 1,
      upvotes: 0,
      my_vote: deleted ? 0 : -1,
    },
    error: null,
  }));
  const screen = await render(
    <GuideDetailScreen guide={guide} {...detailProps} />,
  );
  await waitFor(() =>
    expect(screen.getByTestId(`rating-${recipe.id}`).props.children).toContain(
      '"my_vote":-1',
    ),
  );
  await act(() => {
    deleted = true;
    mockSession = null;
    notifyCommunityChanged({ type: 'account-deleted', userId: 'member' });
  });
  await waitFor(() =>
    expect(screen.getByTestId(`rating-${recipe.id}`).props.children).toContain(
      '"my_vote":0',
    ),
  );
  expect(screen.getByTestId(`rating-${recipe.id}`).props.children).toContain(
    '"downvotes":0',
  );
  expect(screen.getByTestId(`rating-${recipe.id}`).props.children).toContain(
    '"score":0',
  );
  await screen.unmount();
  rpc.mockReset();
});

test('a late rating response from the deleted account cannot restore its vote', async () => {
  const guide = ratingGuide();
  const recipe = guide.recipes[0]!;
  mockSession = { user: { id: 'member' } };
  let resolveOld!: (value: unknown) => void;
  const rpc = supabase!.rpc as jest.Mock;
  rpc.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveOld = resolve;
      }),
  );
  rpc.mockResolvedValue({
    data: { score: 0, upvotes: 0, downvotes: 0, my_vote: 0 },
    error: null,
  });
  const screen = await render(
    <GuideDetailScreen guide={guide} {...detailProps} />,
  );
  await act(() => {
    mockSession = null;
    notifyCommunityChanged({ type: 'account-deleted', userId: 'member' });
  });
  await act(async () => {
    resolveOld({
      data: { score: -1, upvotes: 0, downvotes: 1, my_vote: -1 },
      error: null,
    });
  });
  expect(screen.getByTestId(`rating-${recipe.id}`).props.children).toContain(
    '"my_vote":0',
  );
  await screen.unmount();
  rpc.mockReset();
});

test('switching signed-in accounts reloads the personal vote without changing guides', async () => {
  const guide = ratingGuide();
  const recipe = guide.recipes[0]!;
  const rpc = supabase!.rpc as jest.Mock;
  mockSession = { user: { id: 'first' } };
  rpc.mockImplementation(async () => ({
    data: {
      score: 0,
      upvotes: 1,
      downvotes: 1,
      my_vote: mockSession?.user.id === 'first' ? -1 : 1,
    },
    error: null,
  }));
  const screen = await render(
    <GuideDetailScreen guide={guide} {...detailProps} />,
  );
  await waitFor(() =>
    expect(screen.getByTestId(`rating-${recipe.id}`).props.children).toContain(
      '"my_vote":-1',
    ),
  );
  mockSession = { user: { id: 'second' } };
  await screen.rerender(<GuideDetailScreen guide={guide} {...detailProps} />);
  await waitFor(() =>
    expect(screen.getByTestId(`rating-${recipe.id}`).props.children).toContain(
      '"my_vote":1',
    ),
  );
  await screen.unmount();
  mockSession = null;
  rpc.mockReset();
});

test('failed vote refresh offers a retry instead of displaying stale or fabricated totals', async () => {
  const guide = ratingGuide();
  const rpc = supabase!.rpc as jest.Mock;
  mockSession = null;
  rpc.mockResolvedValueOnce({ data: null, error: new Error('Offline') });
  rpc.mockResolvedValue({
    data: { score: 2, upvotes: 2, downvotes: 0, my_vote: 0 },
    error: null,
  });
  const screen = await render(
    <GuideDetailScreen guide={guide} {...detailProps} />,
  );
  expect(
    await screen.findByText(
      'Could not refresh votes. Check your connection and try again.',
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry votes' }));
  await waitFor(() =>
    expect(
      screen.getByTestId(`rating-${guide.recipes[0]!.id}`).props.children,
    ).toContain('"score":2'),
  );
  await screen.unmount();
  rpc.mockReset();
});
