export type SavedRecipeReference = {
  productId: string;
  recipeId: string;
};

const prefix = 'recipe:';

export function savedRecipeKey(productId: string, recipeId: string) {
  return `${prefix}${encodeURIComponent(productId)}:${encodeURIComponent(
    recipeId,
  )}`;
}

export function parseSavedRecipeKey(
  value: string,
): SavedRecipeReference | null {
  if (!value.startsWith(prefix)) return null;
  const [productId, recipeId, ...rest] = value.slice(prefix.length).split(':');
  if (!productId || !recipeId || rest.length) return null;
  try {
    return {
      productId: decodeURIComponent(productId),
      recipeId: decodeURIComponent(recipeId),
    };
  } catch {
    return null;
  }
}
