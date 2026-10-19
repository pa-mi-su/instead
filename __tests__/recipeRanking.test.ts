import { rankRecipes } from '../src/lib/recipeRanking';

test('recipes rank by net score and preserve catalog order for ties', () => {
  const recipes = [{ id: 'first' }, { id: 'second' }, { id: 'third' }];

  expect(
    rankRecipes(recipes, {
      first: { score: 0 },
      second: { score: 4 },
      third: { score: 4 },
    }).map(recipe => recipe.id),
  ).toEqual(['second', 'third', 'first']);
});

test('recipes without scores sort as zero behind positive scores', () => {
  const recipes = [{ id: 'unknown' }, { id: 'downvoted' }, { id: 'liked' }];

  expect(
    rankRecipes(recipes, {
      downvoted: { score: -2 },
      liked: { score: 1 },
    }).map(recipe => recipe.id),
  ).toEqual(['liked', 'unknown', 'downvoted']);
});
