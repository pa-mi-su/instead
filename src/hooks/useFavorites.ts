import { subscribeRecipeVisibility } from './useRecipeVisibility';
import { subscribeCommunityUpdates } from '../lib/communityUpdates';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseSavedRecipeKey, savedRecipeKey } from '../lib/savedRecipes';

type Saves = {
  userId?: string;
  favorites: string[];
  titles: Record<string, string>;
  status: 'local' | 'syncing' | 'synced' | 'error';
};
const empty: Saves = { favorites: [], titles: {}, status: 'local' };

// The account is the source of truth. Legacy device-wide saves are deliberately
// not imported: they have no account owner and could belong to another user.
export function useFavorites(userId?: string) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<Saves>(empty);
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const generation = useRef(0);
  const saving = useRef(false);
  useEffect(
    () =>
      subscribeCommunityUpdates(update => {
        if (update.type === 'foreground') setRevision(value => value + 1);
      }),
    [],
  );
  useEffect(
    () => subscribeRecipeVisibility(() => setRevision(value => value + 1)),
    [],
  );
  useEffect(() => {
    const requests = generation;
    const version = ++requests.current;
    saving.current = false;
    if (!userId || !supabase) {
      setState(empty);
      return;
    }
    let active = true;
    setState(current =>
      current.userId === userId
        ? { ...current, status: 'syncing' }
        : { ...empty, userId, status: 'syncing' },
    );
    Promise.all([
      supabase.rpc('community_saved_guides_list'),
      supabase.rpc('community_saved_recipes_list'),
    ])
      .then(([guides, recipes]) => {
        if (guides.error) throw guides.error;
        if (recipes.error) throw recipes.error;
        if (!active || currentUser.current !== userId) return;
        const favorites = Array.isArray(guides.data)
          ? guides.data.flatMap(row =>
              typeof row?.product_id === 'string' ? [row.product_id] : [],
            )
          : [];
        const titles: Record<string, string> = {};
        if (Array.isArray(recipes.data))
          for (const row of recipes.data) {
            if (
              typeof row?.product_id !== 'string' ||
              typeof row?.recipe_id !== 'string'
            )
              continue;
            const key = savedRecipeKey(row.product_id, row.recipe_id);
            favorites.push(key);
            titles[key] =
              typeof row.recipe_title === 'string'
                ? row.recipe_title
                : row.recipe_id;
          }
        setState({
          userId,
          favorites: [...new Set(favorites)],
          titles,
          status: 'synced',
        });
      })
      .catch(() => {
        if (active && currentUser.current === userId)
          setState({ ...empty, userId, status: 'error' });
      });
    return () => {
      active = false;
      if (requests.current === version) requests.current++;
    };
  }, [userId, revision]);

  function toggle(id: string, title?: string) {
    if (
      !userId ||
      !supabase ||
      state.userId !== userId ||
      state.status !== 'synced' ||
      saving.current
    )
      return;
    const client = supabase;
    const version = generation.current;
    const previous = state;
    const saved = state.favorites.includes(id);
    const favorites = saved
      ? state.favorites.filter(item => item !== id)
      : [...state.favorites, id];
    const titles = { ...state.titles };
    if (saved) delete titles[id];
    else if (title) titles[id] = title;
    saving.current = true;
    setState({ ...state, favorites, titles, status: 'syncing' });
    const recipe = parseSavedRecipeKey(id);
    Promise.resolve(
      client.rpc(
        recipe ? 'community_saved_recipes_set' : 'community_saved_guides_set',
        recipe
          ? {
              p_product: recipe.productId,
              p_recipe: recipe.recipeId,
              p_title: title ?? recipe.recipeId,
              p_saved: !saved,
            }
          : { p_product: id, p_saved: !saved },
      ),
    )
      .then(({ error }) => {
        if (error) throw error;
        if (currentUser.current === userId && generation.current === version)
          setState({ userId, favorites, titles, status: 'synced' });
      })
      .catch(() => {
        if (currentUser.current === userId && generation.current === version)
          setState({ ...previous, status: 'error' });
      })
      .finally(() => {
        if (generation.current === version) saving.current = false;
      });
  }
  const visible = userId && state.userId === userId ? state : empty;
  return {
    favorites: visible.favorites,
    savedRecipes: visible.favorites.flatMap(key => {
      const recipe = parseSavedRecipeKey(key);
      return recipe
        ? [{ ...recipe, key, title: visible.titles[key] ?? recipe.recipeId }]
        : [];
    }),
    toggleFavorite: (id: string) => toggle(id),
    toggleRecipeFavorite: (
      productId: string,
      recipeId: string,
      title: string,
    ) => toggle(savedRecipeKey(productId, recipeId), title),
    syncStatus: visible.status,
    retry: () => setRevision(value => value + 1),
  };
}
