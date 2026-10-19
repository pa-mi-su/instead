export function rankRecipes<T extends { id: string }>(
  recipes: readonly T[],
  ratings: Record<string, { score: number }>,
) {
  return recipes
    .map((recipe, index) => ({ recipe, index }))
    .sort(
      (a, b) =>
        (ratings[b.recipe.id]?.score ?? 0) -
          (ratings[a.recipe.id]?.score ?? 0) || a.index - b.index,
    )
    .map(({ recipe }) => recipe);
}
