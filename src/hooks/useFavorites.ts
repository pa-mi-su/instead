import { subscribeCommunityUpdates } from '../lib/communityUpdates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseSavedRecipeKey, savedRecipeKey } from '../lib/savedRecipes';

const FAVORITES_KEY = 'instead:favorites';
const RECIPE_TITLES_KEY = 'instead:saved-recipe-titles';

function parseFavorites(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function useFavorites(userId?: string) {
  const [foregroundRevision, setForegroundRevision] = useState(0);
  useEffect(
    () =>
      subscribeCommunityUpdates(update => {
        if (update.type === 'foreground')
          setForegroundRevision(value => value + 1);
      }),
    [],
  );
  const [localFavorites, setLocalFavorites] = useState<string[]>([]);
  const [cloudFavorites, setCloudFavorites] = useState<string[]>([]);
  const [localRecipeTitles, setLocalRecipeTitles] = useState<
    Record<string, string>
  >({});
  const [cloudRecipeTitles, setCloudRecipeTitles] = useState<
    Record<string, string>
  >({});
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    'local' | 'syncing' | 'synced' | 'error'
  >('local');
  const localFavoritesRef = useRef(localFavorites);
  localFavoritesRef.current = localFavorites;

  useEffect(() => {
    let active = true;

    Promise.all([
      AsyncStorage.getItem(FAVORITES_KEY),
      AsyncStorage.getItem(RECIPE_TITLES_KEY),
    ])
      .then(([value, titleValue]) => {
        if (active) {
          setLocalFavorites(parseFavorites(value));
          try {
            const parsed: unknown = titleValue ? JSON.parse(titleValue) : {};
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
              setLocalRecipeTitles(parsed as Record<string, string>);
          } catch {
            setLocalRecipeTitles({});
          }
          setLocalReady(true);
        }
      })
      .catch(() => {
        if (active) setLocalReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!userId || !localReady || !supabase) {
      setCloudFavorites([]);
      setCloudRecipeTitles({});
      setSyncStatus('local');
      return;
    }
    const client = supabase;
    let active = true;
    setCloudFavorites([]);
    setSyncStatus('syncing');
    Promise.all([
      client.rpc('community_saved_guides_list'),
      client.rpc('community_saved_recipes_list'),
    ])
      .then(async ([guideResult, recipeResult]) => {
        if (guideResult.error) throw guideResult.error;
        if (recipeResult.error) throw recipeResult.error;
        const cloudGuides = Array.isArray(guideResult.data)
          ? guideResult.data.flatMap(row =>
              row && typeof row.product_id === 'string' ? [row.product_id] : [],
            )
          : [];
        const cloudRecipeRows = Array.isArray(recipeResult.data)
          ? recipeResult.data.filter(
              row =>
                row &&
                typeof row.product_id === 'string' &&
                typeof row.recipe_id === 'string',
            )
          : [];
        const cloudRecipeIds = cloudRecipeRows.map(row =>
          savedRecipeKey(row.product_id, row.recipe_id),
        );
        const recipeTitles = Object.fromEntries(
          cloudRecipeRows.map(row => [
            savedRecipeKey(row.product_id, row.recipe_id),
            typeof row.recipe_title === 'string'
              ? row.recipe_title
              : row.recipe_id,
          ]),
        );
        const cloud = [...cloudGuides, ...cloudRecipeIds];
        const deviceSaves = localFavoritesRef.current;
        const merged = [...new Set([...cloud, ...deviceSaves])];
        await Promise.all(
          deviceSaves
            .filter(id => !parseSavedRecipeKey(id) && !cloud.includes(id))
            .map(async id => {
              const result = await client.rpc('community_saved_guides_set', {
                p_product: id,
                p_saved: true,
              });
              if (result.error) throw result.error;
            }),
        );
        await Promise.all(
          deviceSaves
            .filter(id => parseSavedRecipeKey(id) && !cloud.includes(id))
            .map(async id => {
              const reference = parseSavedRecipeKey(id);
              if (!reference) return;
              const result = await client.rpc('community_saved_recipes_set', {
                p_product: reference.productId,
                p_recipe: reference.recipeId,
                p_title: localRecipeTitles[id] ?? reference.recipeId,
                p_saved: true,
              });
              if (result.error) throw result.error;
            }),
        );
        if (!active) return;
        setCloudFavorites(merged);
        setCloudRecipeTitles({ ...localRecipeTitles, ...recipeTitles });
        setCloudUserId(userId);
        setSyncStatus('synced');
      })
      .catch(() => {
        if (active) setSyncStatus('error');
      });
    return () => {
      active = false;
    };
  }, [localRecipeTitles, localReady, userId, foregroundRevision]);

  function persistFavorites(nextLocal: string[]) {
    setLocalFavorites(nextLocal);
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(nextLocal)).catch(
      () => undefined,
    );
  }

  function toggleFavorite(id: string) {
    const favorites = userId
      ? [
          ...new Set([
            ...localFavorites,
            ...(cloudUserId === userId ? cloudFavorites : []),
          ]),
        ]
      : localFavorites;
    const saved = favorites.includes(id);
    const nextLocal = saved
      ? localFavorites.filter(item => item !== id)
      : [...localFavorites, id];
    persistFavorites(nextLocal);
    if (userId && supabase) {
      setCloudFavorites(current => {
        const accountSaves = cloudUserId === userId ? current : [];
        return saved
          ? accountSaves.filter(item => item !== id)
          : [...new Set([...accountSaves, id])];
      });
      setCloudUserId(userId);
      setSyncStatus('syncing');
      Promise.resolve(
        supabase.rpc('community_saved_guides_set', {
          p_product: id,
          p_saved: !saved,
        }),
      )
        .then(({ error }) => setSyncStatus(error ? 'error' : 'synced'))
        .catch(() => setSyncStatus('error'));
    }
  }

  function toggleRecipeFavorite(
    productId: string,
    recipeId: string,
    title: string,
  ) {
    const id = savedRecipeKey(productId, recipeId);
    const favorites = userId
      ? [
          ...new Set([
            ...localFavorites,
            ...(cloudUserId === userId ? cloudFavorites : []),
          ]),
        ]
      : localFavorites;
    const saved = favorites.includes(id);
    const nextLocal = saved
      ? localFavorites.filter(item => item !== id)
      : [...new Set([...localFavorites, id])];
    const nextTitles = { ...localRecipeTitles };
    if (saved) delete nextTitles[id];
    else nextTitles[id] = title;
    persistFavorites(nextLocal);
    setLocalRecipeTitles(nextTitles);
    AsyncStorage.setItem(RECIPE_TITLES_KEY, JSON.stringify(nextTitles)).catch(
      () => undefined,
    );
    if (userId && supabase) {
      setCloudFavorites(current => {
        const accountSaves = cloudUserId === userId ? current : [];
        return saved
          ? accountSaves.filter(item => item !== id)
          : [...new Set([...accountSaves, id])];
      });
      setCloudRecipeTitles(current => {
        const titles = cloudUserId === userId ? { ...current } : {};
        if (saved) delete titles[id];
        else titles[id] = title;
        return titles;
      });
      setCloudUserId(userId);
      setSyncStatus('syncing');
      Promise.resolve(
        supabase.rpc('community_saved_recipes_set', {
          p_product: productId,
          p_recipe: recipeId,
          p_title: title,
          p_saved: !saved,
        }),
      )
        .then(({ error }) => setSyncStatus(error ? 'error' : 'synced'))
        .catch(() => setSyncStatus('error'));
    }
  }

  const favorites = userId
    ? [
        ...new Set([
          ...localFavorites,
          ...(cloudUserId === userId ? cloudFavorites : []),
        ]),
      ]
    : localFavorites;

  const recipeTitles =
    userId && cloudUserId === userId
      ? { ...localRecipeTitles, ...cloudRecipeTitles }
      : localRecipeTitles;
  const savedRecipes = favorites.flatMap(id => {
    const reference = parseSavedRecipeKey(id);
    return reference
      ? [
          {
            ...reference,
            key: id,
            title: recipeTitles[id] ?? reference.recipeId,
          },
        ]
      : [];
  });

  return {
    favorites,
    savedRecipes,
    toggleFavorite,
    toggleRecipeFavorite,
    syncStatus,
  };
}
