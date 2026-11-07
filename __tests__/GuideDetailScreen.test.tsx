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

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));
jest.mock('../src/lib/supabase', () => ({
  supabase: { rpc: jest.fn(async () => ({ data: null, error: null })) },
}));
let mockSession: { user: { id: string } } | null = null;
let mockPublished: Record<string, unknown>[] = [];
let mockMore = false;
const mockLoadMore = jest.fn();
jest.mock('../src/hooks/useRecipes', () => ({
  useRecipes: () => ({
    recipes: mockPublished,
    mine: [],
    ready: true,
    more: mockMore,
    loadMore: mockLoadMore,
    error: '',
  }),
}));
jest.mock('../src/hooks/useCommunity', () => ({
  useCommunity: () => ({
    session: mockSession,
    recipeUserId: mockSession?.user.id,
    canContribute: false,
  }),
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
    onVote,
  }: {
    recipeId: string;
    rating: unknown;
    onVote: (value: -1 | 1) => Promise<void>;
  }) =>
    require('react').createElement(
      require('react-native').Text,
      { testID: `rating-${recipeId}`, onPress: () => onVote(1) },
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

test('voting updates totals in place without full refresh or live reordering', async () => {
  const original = ratingGuide();
  const first = original.recipes[0]!;
  const second = {
    ...first,
    id: 'builtin:second-test-recipe',
    name: 'Second test recipe',
  };
  const guide = { ...original, recipes: [first, second] };
  const rpc = supabase!.rpc as jest.Mock;
  mockSession = { user: { id: 'member' } };
  rpc.mockImplementation(async (name, args) => ({
    data:
      name === 'builtin_recipe_rating'
        ? {
            score: args.p_recipe === first.id ? 0 : 1,
            upvotes: args.p_recipe === first.id ? 0 : 1,
            downvotes: 0,
            my_vote: 0,
          }
        : null,
    error: null,
  }));
  const screen = await render(
    <GuideDetailScreen guide={guide} {...detailProps} />,
  );
  await waitFor(() =>
    expect(screen.getAllByTestId(/^rating-/)).toHaveLength(2),
  );
  const order = () =>
    screen.getAllByTestId(/^rating-/).map(node => node.props.testID);
  expect(order()).toEqual([`rating-${second.id}`, `rating-${first.id}`]);
  const reads = rpc.mock.calls.filter(
    ([name]) => name === 'builtin_recipe_rating',
  ).length;
  for (const vote of [1, 0, 1]) {
    await fireEvent.press(screen.getByTestId(`rating-${first.id}`));
    expect(screen.getByTestId(`rating-${first.id}`).props.children).toContain(
      `"my_vote":${vote}`,
    );
    expect(order()).toEqual([`rating-${second.id}`, `rating-${first.id}`]);
  }
  expect(
    rpc.mock.calls.filter(([name]) => name === 'builtin_recipe_rating'),
  ).toHaveLength(reads);
  await screen.unmount();
  rpc.mockReset();
});

test('a confirmed vote from the previous account cannot overwrite the new account rating', async () => {
  const guide = ratingGuide();
  const recipe = guide.recipes[0]!;
  let finishVote!: (value: unknown) => void;
  mockSession = { user: { id: 'first' } };
  const rpc = supabase!.rpc as jest.Mock;
  rpc.mockImplementation(async name => {
    if (name === 'builtin_recipe_vote')
      return new Promise(resolve => {
        finishVote = resolve;
      });
    return {
      data: { score: 0, upvotes: 0, downvotes: 0, my_vote: 0 },
      error: null,
    };
  });
  const screen = await render(
    <GuideDetailScreen guide={guide} {...detailProps} />,
  );
  await waitFor(() =>
    expect(screen.getByTestId(`rating-${recipe.id}`)).toBeTruthy(),
  );
  let request!: Promise<void>;
  await act(() => {
    request = screen.getByTestId(`rating-${recipe.id}`).props.onPress();
  });
  mockSession = { user: { id: 'second' } };
  await screen.rerender(<GuideDetailScreen guide={guide} {...detailProps} />);
  await waitFor(() =>
    expect(screen.getByTestId(`rating-${recipe.id}`)).toBeTruthy(),
  );
  await act(async () => {
    finishVote({ data: null, error: null });
    await request;
  });
  expect(screen.getByTestId(`rating-${recipe.id}`).props.children).toContain(
    '"my_vote":0',
  );
  await screen.unmount();
  rpc.mockReset();
});

test('a saved community recipe beyond the first page is fetched until found without looping', async () => {
  const base = {
    status: 'approved',
    ingredients: 'Water',
    instructions: 'Mix',
    storage_notes: 'Store',
    cautions: 'Care',
    photos: [],
    mine: false,
  };
  mockMore = true;
  mockLoadMore.mockClear();
  mockPublished = Array.from({ length: 20 }, (_, i) => ({
    ...base,
    id: `published-${i}`,
    title: `Published recipe ${i}`,
  }));
  try {
    const guide = ratingGuide();
    const screen = await render(
      <GuideDetailScreen
        guide={guide}
        {...detailProps}
        initialRecipeId="saved-on-page-two"
      />,
    );
    await waitFor(() => expect(mockLoadMore).toHaveBeenCalledTimes(1));
    await screen.rerender(
      <GuideDetailScreen
        guide={guide}
        {...detailProps}
        initialRecipeId="saved-on-page-two"
      />,
    );
    expect(mockLoadMore).toHaveBeenCalledTimes(1);
    mockPublished = [
      ...mockPublished,
      { ...base, id: 'saved-on-page-two', title: 'Exact saved recipe' },
    ];
    await screen.rerender(
      <GuideDetailScreen
        guide={guide}
        {...detailProps}
        initialRecipeId="saved-on-page-two"
      />,
    );
    expect(screen.getByText('Exact saved recipe')).toBeTruthy();
    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  } finally {
    mockPublished = [];
    mockMore = false;
  }
});
