import type { Guide, StarterRecipe } from '../types';

type BuiltinRecipeRow = {
  id: string;
  product_id: string;
  recipe_content: unknown;
  is_active: boolean;
};

function isStringList(value: unknown, allowEmpty: boolean) {
  return (
    Array.isArray(value) &&
    (allowEmpty || value.length > 0) &&
    value.every(item => typeof item === 'string' && item.trim().length > 0)
  );
}

function isRecipeContent(
  value: unknown,
): value is Omit<StarterRecipe, 'id' | 'photos'> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const content = value as Record<string, unknown>;
  return (
    typeof content.name === 'string' &&
    content.name.trim().length >= 3 &&
    isStringList(content.ingredients, false) &&
    isStringList(content.equipment, true) &&
    isStringList(content.instructions, false) &&
    typeof content.storage === 'string' &&
    content.storage.trim().length >= 3 &&
    typeof content.cautions === 'string' &&
    content.cautions.trim().length >= 3
  );
}

function isBuiltinRecipeRow(value: unknown): value is BuiltinRecipeRow {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.product_id === 'string' &&
    'recipe_content' in row &&
    typeof row.is_active === 'boolean'
  );
}

export function applyBuiltinRecipeChanges(
  guides: Guide[],
  payload: unknown,
): Guide[] {
  if (!Array.isArray(payload) || !payload.every(isBuiltinRecipeRow))
    return guides;
  const rowsByProduct = new Map<string, BuiltinRecipeRow[]>();
  for (const row of payload) {
    rowsByProduct.set(row.product_id, [
      ...(rowsByProduct.get(row.product_id) ?? []),
      row,
    ]);
  }
  return guides.map(guide => {
    const rows = rowsByProduct.get(guide.id);
    if (!rows?.length) return guide;
    const activeRecipes = new Map<string, StarterRecipe>();
    const inactiveIds = new Set<string>();
    for (const row of rows) {
      if (!row.is_active) {
        inactiveIds.add(row.id);
        continue;
      }
      if (isRecipeContent(row.recipe_content))
        activeRecipes.set(row.id, {
          id: row.id,
          ...row.recipe_content,
        });
    }
    const recipes = (guide.recipes ?? [])
      .filter(recipe => !inactiveIds.has(recipe.id))
      .map(recipe => {
        const remote = activeRecipes.get(recipe.id);
        if (!remote) return recipe;
        activeRecipes.delete(recipe.id);
        return { ...remote, photos: recipe.photos };
      });
    recipes.push(...activeRecipes.values());
    return { ...guide, recipes };
  });
}
