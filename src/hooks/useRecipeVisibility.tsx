import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  accountRpc,
  communityError,
  type CommunityClient,
} from '../lib/community';
import { subscribeCommunityUpdates } from '../lib/communityUpdates';

type HiddenRecipe = {
  product_id: string;
  recipe_id: string;
  reason: string;
  title: string;
};
const listeners = new Set<() => void>();
export function subscribeRecipeVisibility(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function refreshRecipeVisibility() {
  for (const listener of listeners) listener();
}
export function usePersonalRecipes(
  supabase: CommunityClient | null,
  userId?: string,
) {
  const [state, setState] = useState<{ owner?: string; rows: HiddenRecipe[] }>({
    rows: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const identity = useRef(userId);
  identity.current = userId;
  const locked = useRef(false);
  const mutation = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    if (!userId || !supabase) {
      setState({ rows: [] });
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await accountRpc<HiddenRecipe[]>(
        supabase,
        'community_hidden_recipes',
      );
      if (!Array.isArray(rows))
        throw new Error('Could not load hidden recipes.');
      if (generation.current === version) setState({ owner: userId, rows });
    } catch (issue) {
      if (generation.current === version) setError(communityError(issue));
    } finally {
      if (generation.current === version) setLoading(false);
    }
  }, [supabase, userId]);
  useEffect(() => {
    const requests = generation;
    mutation.current++;
    locked.current = false;
    setBusy(false);
    const reload = () => {
      refresh().catch(() => undefined);
    };
    reload();
    listeners.add(reload);
    const unsubscribe = subscribeCommunityUpdates(update => {
      if (update.type === 'foreground') reload();
      if (update.type === 'account-deleted' && update.userId === userId) {
        generation.current++;
        setState({ rows: [] });
        setError('');
        setLoading(false);
      }
    });
    return () => {
      requests.current++;
      listeners.delete(reload);
      unsubscribe();
    };
  }, [refresh, userId]);
  const rows = state.owner === userId ? state.rows : [];
  async function setHidden(
    productId: string,
    recipeId: string,
    hidden: boolean,
    title = 'Recipe',
  ) {
    if (!userId || !supabase || locked.current) return;
    const owner = userId;
    const version = ++mutation.current;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await accountRpc(supabase, 'community_recipe_hide', {
        p_product: productId,
        p_recipe: recipeId,
        p_hidden: hidden,
        p_expected_user: owner,
      });
      if (identity.current !== owner) return;
      generation.current++;
      setState(current => ({
        owner,
        rows: [
          ...(current.owner === owner
            ? current.rows.filter(
                row =>
                  row.product_id !== productId || row.recipe_id !== recipeId,
              )
            : []),
          ...(hidden
            ? [
                {
                  product_id: productId,
                  recipe_id: recipeId,
                  reason: 'blocked',
                  title,
                },
              ]
            : []),
        ],
      }));
      refreshRecipeVisibility();
    } catch (issue) {
      if (identity.current === owner) setError(communityError(issue));
    } finally {
      if (mutation.current === version) {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  function acceptReport(productId: string, recipeId: string, title: string) {
    if (!userId || identity.current !== userId) return;
    generation.current++;
    setState(current => ({
      owner: userId,
      rows: [
        ...(current.owner === userId
          ? current.rows.filter(
              row => row.product_id !== productId || row.recipe_id !== recipeId,
            )
          : []),
        {
          product_id: productId,
          recipe_id: recipeId,
          title,
          reason: 'reported',
        },
      ],
    }));
  }
  return {
    userId,
    acceptReport,
    rows,
    loading,
    error,
    busy,
    refresh,
    setHidden,
    isHidden: (productId: string, recipeId: string) =>
      rows.some(
        row => row.product_id === productId && row.recipe_id === recipeId,
      ),
  };
}
type Visibility = ReturnType<typeof usePersonalRecipes>;
export const RecipeVisibilityContext = createContext<Visibility | null>(null);
export const useRecipeVisibility = () => useContext(RecipeVisibilityContext);
