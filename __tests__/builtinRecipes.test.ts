import { productCatalog } from '../src/catalog';
import { applyBuiltinRecipeChanges } from '../src/lib/builtinRecipes';

const glassCleaner = productCatalog.find(
  guide => guide.id === 'natural-glass-cleaner',
)!;
const baseRecipe = glassCleaner.recipes![0]!;

describe('applyBuiltinRecipeChanges', () => {
  it('replaces a bundled recipe and adds an admin-created recipe', () => {
    const result = applyBuiltinRecipeChanges(productCatalog, [
      {
        id: baseRecipe.id,
        product_id: glassCleaner.id,
        is_active: true,
        recipe_content: {
          name: 'Updated glass recipe',
          ingredients: ['One ingredient'],
          equipment: [],
          instructions: ['One step'],
          storage: 'Store safely.',
          cautions: 'Avoid eyes.',
        },
      },
      {
        id: 'admin:example-id',
        product_id: glassCleaner.id,
        is_active: true,
        recipe_content: {
          name: 'New glass recipe',
          ingredients: ['Another ingredient'],
          equipment: ['A bowl'],
          instructions: ['Mix carefully.'],
          storage: 'Make fresh.',
          cautions: 'Test a small area.',
        },
      },
    ]);
    const updated = result.find(guide => guide.id === glassCleaner.id)!;
    expect(updated.recipes?.[0]?.name).toBe('Updated glass recipe');
    expect(
      updated.recipes?.some(recipe => recipe.id === 'admin:example-id'),
    ).toBe(true);
    expect(updated.recipes).toHaveLength(glassCleaner.recipes!.length + 1);
  });

  it('hides an archived built-in while preserving unrelated recipes', () => {
    const result = applyBuiltinRecipeChanges(productCatalog, [
      {
        id: baseRecipe.id,
        product_id: glassCleaner.id,
        is_active: false,
        recipe_content: null,
      },
    ]);
    const updated = result.find(guide => guide.id === glassCleaner.id)!;
    expect(updated.recipes?.some(recipe => recipe.id === baseRecipe.id)).toBe(
      false,
    );
    expect(updated.recipes).toHaveLength(glassCleaner.recipes!.length - 1);
  });

  it('falls back to the bundled catalog for malformed responses', () => {
    expect(applyBuiltinRecipeChanges(productCatalog, { recipes: [] })).toBe(
      productCatalog,
    );
    expect(
      applyBuiltinRecipeChanges(productCatalog, [
        { id: 'bad', product_id: glassCleaner.id, is_active: true },
      ]),
    ).toBe(productCatalog);
  });
});
