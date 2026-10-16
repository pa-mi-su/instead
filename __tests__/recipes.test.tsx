import { act, renderHook } from '@testing-library/react-native';
import { useRecipes } from '../src/hooks/useRecipes';
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
