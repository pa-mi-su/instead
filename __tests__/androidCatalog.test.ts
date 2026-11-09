import { productCatalog as androidCatalog } from '../src/catalog.android';
import { productCatalog as sharedCatalog } from '../src/catalog';
import { categories as androidCategories } from '../src/categories.android';
import { categories as sharedCategories } from '../src/categories';
import { applyBuiltinRecipeChanges } from '../src/lib/builtinRecipes';

const excluded = [
  'natural-sunburn-care',
  'natural-bug-bite-care',
  'natural-cough-comfort',
];

it('excludes exactly the three requested Android guides without changing shared content', () => {
  expect(
    sharedCatalog.filter(guide => excluded.includes(guide.id)),
  ).toHaveLength(3);
  expect(androidCatalog.map(guide => guide.id)).toEqual(
    sharedCatalog
      .filter(guide => !excluded.includes(guide.id))
      .map(guide => guide.id),
  );
  for (const guide of androidCatalog) {
    expect(guide).toBe(sharedCatalog.find(item => item.id === guide.id));
  }
  expect(androidCategories).toEqual(
    sharedCategories.filter(
      category => category !== 'First Aid' && category !== 'Cough & Cold Care',
    ),
  );
});

it('retains admin recipe updates without restoring excluded guides', () => {
  const guide = androidCatalog.find(
    item => item.id === 'natural-glass-cleaner',
  )!;
  const recipe = guide.recipes![0]!;
  const result = applyBuiltinRecipeChanges(androidCatalog, [
    {
      id: recipe.id,
      product_id: guide.id,
      is_active: true,
      recipe_content: { ...recipe, name: 'Admin updated glass cleaner' },
    },
    {
      id: 'builtin:excluded',
      product_id: excluded[0],
      is_active: true,
      recipe_content: recipe,
    },
  ]);
  expect(result.find(item => item.id === guide.id)?.recipes?.[0]?.name).toBe(
    'Admin updated glass cleaner',
  );
  expect(result.some(item => excluded.includes(item.id))).toBe(false);
});
