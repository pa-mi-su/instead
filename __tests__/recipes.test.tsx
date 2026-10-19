import { act, renderHook } from '@testing-library/react-native';
import { useRecipes } from '../src/hooks/useRecipes';
import { productCatalog } from '../src/catalog';
import {
  emptyRecipe,
  validatePhoto,
  validateRecipe,
  PHOTO_BYTES,
} from '../src/lib/recipes';
import type { RecipeClient, RecipeDraft } from '../src/lib/recipes';
const draft: RecipeDraft = {
  title: 'Example recipe',
  ingredients: 'One measured ingredient',
  instructions: 'Example instructions',
  storage: 'Storage must be reviewed',
  cautions: 'Review ingredient compatibility',
  source: '',
};

test('clogged-drain guide contains only the baking soda and vinegar recipe with boiling-water cautions', () => {
  const guide = productCatalog.find(item => item.title === 'Clogged drains');
  const recipes = guide?.recipes ?? [];
  const recipe = recipes[0];

  expect(recipes).toHaveLength(1);
  expect(recipe).toBeDefined();
  expect(recipe?.name).toContain('Baking Soda and Vinegar');
  expect(recipe?.ingredients).toContain('1 cup baking soda');
  expect(recipe?.ingredients).toContain('1 cup white vinegar');
  expect(recipe?.instructions.join(' ')).toContain('5 to 10 minutes');
  expect(recipe?.instructions.join(' ')).toMatch(/initial.*boiling/i);
  expect(recipe?.instructions.join(' ')).toMatch(/second pot of boiling/i);
  expect(recipe?.cautions).toMatch(/at your own risk/i);
  expect(recipe?.cautions).toMatch(/severe scalds/i);
  expect(
    [
      ...(recipe?.ingredients ?? []),
      ...(recipe?.equipment ?? []),
      ...(recipe?.instructions ?? []),
      recipe?.storage ?? '',
      recipe?.cautions ?? '',
    ].join(' '),
  ).not.toMatch(/https?:\/\//i);
});

test('cough guide includes ginger syrup and clearly blocks unsafe infant use', () => {
  const guide = productCatalog.find(item => item.title === 'Cough comfort');
  const recipes = guide?.recipes ?? [];
  const recipe = guide?.recipes?.find(item =>
    item.name.includes('Honey, Lemon, and Ginger'),
  );
  const vinegarDrink = recipes.find(item =>
    item.name.includes('Apple Cider Vinegar and Honey'),
  );

  expect(recipe).toBeDefined();
  expect(recipes).toHaveLength(2);
  expect(recipe?.ingredients).toContain(
    '1 cup raw, local honey (pasteurized honey is preferred for cough use)',
  );
  expect(recipe?.instructions.join(' ')).toMatch(/refrigerate/i);
  expect(recipe?.instructions.join(' ')).toMatch(/adults \(12\+\)/i);
  expect(recipe?.instructions.join(' ')).toMatch(/every 4 hours/i);
  expect(recipe?.instructions.join(' ')).toMatch(/children \(1–5\)/i);
  expect(recipe?.cautions).toMatch(/under 12 months/i);
  expect(recipe?.cautions).toMatch(/not been established/i);
  expect(guide?.safetyNote).toMatch(/pediatric clinician/i);
  expect(vinegarDrink?.ingredients).toContain(
    '2 tablespoons high-quality apple cider vinegar',
  );
  expect(vinegarDrink?.instructions.join(' ')).toMatch(/1 cup total/i);
  expect(vinegarDrink?.instructions.join(' ')).toMatch(/every 3 to 4 hours/i);
  expect(vinegarDrink?.cautions).toMatch(/under 12 months/i);
  expect(vinegarDrink?.storage).toMatch(/1 week/i);
  expect(vinegarDrink?.storage).toMatch(/2 months/i);
  expect(vinegarDrink?.storage).toMatch(/No tested shelf life/i);
  expect(vinegarDrink?.cautions).toMatch(/bloody mucus/i);
  expect(vinegarDrink?.cautions).toMatch(/green\/yellow phlegm/i);
});

function mock() {
  const rpc = jest.fn(
    async (_name: string, _args: Record<string, unknown>) => ({
      data: [] as unknown,
      error: null as unknown,
    }),
  );
  const store = {
    upload: jest.fn(async () => ({ error: null })),
    remove: jest.fn(async () => ({ error: null })),
    createSignedUrl: jest.fn(async () => ({
      data: { signedUrl: 'https://example.invalid/photo' },
      error: null,
    })),
  };
  const client = {
    rpc,
    storage: { from: () => store },
  } as unknown as RecipeClient;
  return { rpc, store, client };
}
test('requires complete quantities, instructions, storage, and cautions, with bounded fields', () => {
  expect(validateRecipe(emptyRecipe)).toMatch(/Recipe title/);
  expect(validateRecipe(draft)).toBeNull();
  expect(validateRecipe({ ...draft, ingredients: '' })).toMatch(/quantities/);
  expect(validateRecipe({ ...draft, cautions: '' })).toMatch(/Cautions/);
  expect(validateRecipe({ ...draft, title: 'x'.repeat(101) })).toMatch(
    /Recipe title/,
  );
});
test('rejects unsupported, empty, and oversized photos', () => {
  expect(() =>
    validatePhoto({
      uri: '',
      contentType: 'image/jpeg',
      bytes: new ArrayBuffer(0),
    }),
  ).toThrow(/5 MB/);
  expect(() =>
    validatePhoto({
      uri: '',
      contentType: 'image/png',
      bytes: new ArrayBuffer(PHOTO_BYTES + 1),
    }),
  ).toThrow(/5 MB/);
  expect(() =>
    validatePhoto({
      uri: '',
      contentType: 'text/html' as 'image/jpeg',
      bytes: new ArrayBuffer(10),
    }),
  ).toThrow(/JPEG/);
});
test('submits to the selected product for review without profile data, then clears the form', async () => {
  const m = mock();
  const hook = await renderHook(() =>
    useRecipes(m.client, 'natural-shampoo', 'owner'),
  );
  await act(() => hook.result.current.setDraft(draft));
  await act(() => hook.result.current.submit());
  expect(m.rpc).toHaveBeenCalledWith(
    'recipe_submit',
    expect.objectContaining({
      p_product: 'natural-shampoo',
      p_title: draft.title,
      p_photos: [],
    }),
  );
  expect(hook.result.current.notice).toMatch(/review/);
  expect(hook.result.current.draft).toEqual(emptyRecipe);
  hook.unmount();
});
test('failed submission preserves the draft and cleans uploaded photos', async () => {
  const m = mock();
  m.rpc.mockImplementation(async name =>
    name === 'recipe_submit'
      ? {
          data: null,
          error: { code: 'P0001', message: 'Submission unavailable.' },
        }
      : {
          data:
            name === 'community_photo_folder'
              ? '50000000-0000-0000-0000-000000000001'
              : [],
          error: null,
        },
  );
  const hook = await renderHook(() =>
    useRecipes(m.client, 'natural-shampoo', 'owner'),
  );
  await act(() => hook.result.current.setDraft(draft));
  await act(() =>
    hook.result.current.setPhotos([
      { uri: 'photo', bytes: new ArrayBuffer(10), contentType: 'image/jpeg' },
    ]),
  );
  await act(() => hook.result.current.submit());
  expect(m.store.upload).toHaveBeenCalled();
  expect(m.store.remove).toHaveBeenCalled();
  expect(hook.result.current.draft).toEqual(draft);
  expect(hook.result.current.error).toMatch(/unavailable/);
  hook.unmount();
});
