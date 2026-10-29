import {
  notifyCommunityChanged,
  useCommunityRevision,
} from '../lib/communityUpdates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { communityError, communityRpc } from '../lib/community';
import type { ReportReason } from '../lib/community';
import {
  emptyRecipe,
  PHOTO_LIMIT,
  validatePhoto,
  validateRecipe,
} from '../lib/recipes';
import type {
  Recipe,
  RecipeClient,
  RecipeDraft,
  RecipePhoto,
} from '../lib/recipes';

export function useRecipes(
  client: RecipeClient | null,
  productId: string,
  userId?: string,
) {
  const revision = useCommunityRevision();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mine, setMine] = useState<Recipe[]>([]);
  const [draft, setDraft] = useState<RecipeDraft>({ ...emptyRecipe });
  const [photos, setPhotos] = useState<RecipePhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [more, setMore] = useState(false);
  const [mineMore, setMineMore] = useState(false);
  const lock = useRef(false);
  const epoch = useRef(0);
  const store = client?.storage.from('recipe-photos');
  const decorate = useCallback(
    async (rows: Recipe[]) => {
      let authors: { recipe_id: string; username: string; bio: string }[] = [];
      try {
        authors = await communityRpc(client, 'community_recipe_authors', {
          p_recipes: rows.map(row => row.id),
        });
      } catch {
        // Older backend deployments can still display recipes without profiles.
      }
      const authorByRecipe = new Map(
        authors.map(author => [author.recipe_id, author]),
      );
      return Promise.all(
        rows.map(async row => {
          const links = await Promise.all(
            row.photo_paths.map(async path => {
              try {
                const result = await client?.storage
                  .from('recipe-photos')
                  .createSignedUrl(path, 300);
                return result?.error ? null : result?.data?.signedUrl;
              } catch {
                return null;
              }
            }),
          );
          return {
            ...row,
            author_username: authorByRecipe.get(row.id)?.username,
            author_bio: authorByRecipe.get(row.id)?.bio,
            photos: links.filter((link): link is string => Boolean(link)),
            photoError: links.some(link => !link),
          };
        }),
      );
    },
    [client],
  );
  const refresh = useCallback(async () => {
    const version = ++epoch.current;
    const [published, own] = await Promise.all([
      communityRpc<Recipe[]>(client, 'recipe_list', {
        p_product: productId,
        p_mine: false,
        p_offset: 0,
      }),
      userId
        ? communityRpc<Recipe[]>(client, 'recipe_list', {
            p_product: productId,
            p_mine: true,
            p_offset: 0,
          })
        : Promise.resolve([]),
    ]);
    const [publicRows, privateRows] = await Promise.all([
      decorate(published),
      decorate(own),
    ]);
    if (version === epoch.current) {
      setRecipes(publicRows);
      setMine(privateRows);
      setMore(published.length === 20);
      setMineMore(own.length === 20);
      setReady(true);
    }
  }, [client, productId, userId, decorate]);
  useEffect(() => {
    let active = true;
    const pending = epoch;
    setRecipes([]);
    setMine([]);
    setReady(false);
    const load = () =>
      refresh().catch(issue => {
        if (active) setError(communityError(issue));
      });
    load();
    const timer = setInterval(load, 240000);
    return () => {
      active = false;
      pending.current++;
      clearInterval(timer);
    };
  }, [refresh, revision]);
  async function run(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (issue) {
      setError(communityError(issue));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function submit() {
    const validation = validateRecipe(draft);
    if (validation) {
      setError(validation);
      return;
    }
    if (!userId || !store || photos.length > PHOTO_LIMIT) return;
    await run(async () => {
      const paths: string[] = [];
      let submitted = false;
      try {
        const folder = photos.length
          ? await communityRpc<string>(client, 'community_photo_folder')
          : '';
        if (photos.length && !/^[a-f0-9-]{36}$/i.test(folder))
          throw new Error('Photo storage is unavailable.');
        for (const photo of photos) {
          validatePhoto(photo);
          const ext =
            photo.contentType === 'image/jpeg'
              ? 'jpg'
              : photo.contentType.split('/')[1];
          const path = `${folder}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${ext}`;
          const result = await store.upload(path, photo.bytes, {
            contentType: photo.contentType,
            upsert: false,
          });
          if (result.error) throw result.error;
          paths.push(path);
        }
        await communityRpc(client, 'recipe_submit', {
          p_product: productId,
          p_title: draft.title.trim(),
          p_ingredients: draft.ingredients.trim(),
          p_instructions: draft.instructions.trim(),
          p_storage: draft.storage.trim(),
          p_cautions: draft.cautions.trim(),
          p_source: draft.source.trim(),
          p_photos: paths,
        });
        submitted = true;
        notifyCommunityChanged();
        setDraft({ ...emptyRecipe });
        setPhotos([]);
        setNotice(
          'Recipe submitted for review. It will appear publicly only after approval.',
        );
        await refresh();
      } catch (issue) {
        // If the response was lost, attached-photo deletion is denied by SQL.
        if (!submitted && paths.length)
          await Promise.resolve(store.remove(paths)).catch(() => undefined);
        throw issue;
      }
    });
  }
  return {
    recipes,
    mine,
    draft,
    setDraft,
    photos,
    setPhotos,
    busy,
    error,
    setError,
    notice,
    ready,
    more,
    mineMore,
    submit,
    refresh: () => run(refresh),
    loadMore: () =>
      run(async () => {
        const rows = await communityRpc<Recipe[]>(client, 'recipe_list', {
          p_product: productId,
          p_mine: false,
          p_offset: recipes.length,
        });
        const next = await decorate(rows);
        setRecipes(current => [
          ...current,
          ...next.filter(row => !current.some(item => item.id === row.id)),
        ]);
        setMore(rows.length === 20);
      }),
    loadMoreMine: () =>
      run(async () => {
        const rows = await communityRpc<Recipe[]>(client, 'recipe_list', {
          p_product: productId,
          p_mine: true,
          p_offset: mine.length,
        });
        const next = await decorate(rows);
        setMine(current => [
          ...current,
          ...next.filter(row => !current.some(item => item.id === row.id)),
        ]);
        setMineMore(rows.length === 20);
      }),
    vote: (recipe: Recipe, value: number) =>
      run(async () => {
        if (recipe.mine) {
          setNotice('You cannot vote on your own recipe.');
          return;
        }
        await communityRpc(client, 'recipe_vote', {
          p_recipe: recipe.id,
          p_value: recipe.my_vote === value ? 0 : value,
        });
        notifyCommunityChanged();
        await refresh();
      }),
    report: (recipe: Recipe, reason: ReportReason) =>
      run(async () => {
        await communityRpc(client, 'recipe_report', {
          p_recipe: recipe.id,
          p_reason: reason,
        });
        notifyCommunityChanged();
        setNotice('Report received for review.');
        await refresh();
      }),
    withdraw: (recipe: Recipe) =>
      run(async () => {
        const paths = await communityRpc<string[]>(client, 'recipe_withdraw', {
          p_recipe: recipe.id,
        });
        notifyCommunityChanged();
        setNotice('Recipe removed.');
        if (paths.length && store) {
          const removed = await store.remove(paths);
          if (removed.error)
            setNotice(
              'Recipe removed. Photo cleanup will need a retry or support request.',
            );
        }
        await refresh();
      }),
  };
}
