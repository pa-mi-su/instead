import { parseSavedRecipeKey, savedRecipeKey } from '../src/lib/savedRecipes';

describe('saved recipe identity', () => {
  it('round-trips product and recipe ids containing separators', () => {
    const key = savedRecipeKey(
      'natural:toothpaste',
      'builtin:toothpasteRecipe',
    );
    expect(parseSavedRecipeKey(key)).toEqual({
      productId: 'natural:toothpaste',
      recipeId: 'builtin:toothpasteRecipe',
    });
  });

  it('rejects malformed and non-recipe saved item ids', () => {
    expect(parseSavedRecipeKey('natural-toothpaste')).toBeNull();
    expect(parseSavedRecipeKey('recipe:product:recipe:extra')).toBeNull();
    expect(parseSavedRecipeKey('recipe:%E0%A4%A:recipe')).toBeNull();
  });
});
