import { fireEvent, render } from '@testing-library/react-native';
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

jest.mock('../src/lib/supabase', () => ({ supabase: null }));
jest.mock('../src/hooks/useCommunity', () => ({
  useCommunity: () => ({ session: null, canContribute: false }),
}));
jest.mock('../src/components/ProductCommunity', () => ({
  ProductCommunity: () => null,
}));
jest.mock('../src/components/BrandLogo', () => ({ BrandLogo: () => null }));
jest.mock('../src/components/ExpandableSafety', () => ({
  ExpandableSafety: () => null,
}));
jest.mock('../src/components/RecipeVoteButtons', () => ({
  RecipeVoteButtons: () => null,
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
