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

type Exclusion = {
  product_id: string;
  recipe_id: string;
  author_username?: string | null;
};
const noExclusions: Exclusion[] = [];
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
  client: CommunityClient | null,
  userId?: string,
) {
  const [state, setState] = useState<{ owner?: string; rows: Exclusion[] }>({
    rows: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingScope, setPendingScope] = useState<string>();
  const identity = useRef(userId);
  identity.current = userId;
  const generation = useRef(0);
  const mutation = useRef(0);
  const locked = useRef(false);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    if (!userId || !client) {
      setState({ rows: [] });
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await accountRpc<Exclusion[]>(
        client,
        'community_recipe_exclusions',
      );
      if (!Array.isArray(rows))
        throw new Error('Could not load your recipe list.');
      if (version === generation.current) {
        setState({ owner: userId, rows });
        setPendingScope(undefined);
      }
    } catch (issue) {
      if (version === generation.current) setError(communityError(issue));
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [client, userId]);
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
  const rows = state.owner === userId ? state.rows : noExclusions;
  const ready = !userId || (state.owner === userId && pendingScope !== userId);
  function excludeLocally(
    productId: string,
    recipeId: string,
    authorUsername?: string,
  ) {
    if (!userId || identity.current !== userId) return;
    generation.current++;
    if (!authorUsername && /^[a-f0-9-]{36}$/i.test(recipeId))
      setPendingScope(userId);
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
          author_username: authorUsername,
        },
      ],
    }));
  }
  async function blockRecipe(
    productId: string,
    recipeId: string,
    authorUsername?: string,
  ) {
    if (!client || !userId || locked.current) return;
    const owner = userId;
    const version = ++mutation.current;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await accountRpc(client, 'community_recipe_hide', {
        p_product: productId,
        p_recipe: recipeId,
        p_hidden: true,
        p_expected_user: owner,
      });
      if (identity.current !== owner) return;
      excludeLocally(productId, recipeId, authorUsername);
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
  const isContributorHidden = useCallback(
    (username?: string) =>
      Boolean(
        username &&
          rows.some(
            row =>
              row.author_username?.toLowerCase() === username.toLowerCase(),
          ),
      ),
    [rows],
  );
  const isHidden = useCallback(
    (productId: string, recipeId: string, authorUsername?: string) =>
      !ready ||
      isContributorHidden(authorUsername) ||
      rows.some(
        row => row.product_id === productId && row.recipe_id === recipeId,
      ),
    [ready, rows, isContributorHidden],
  );
  return {
    userId,
    ready,
    loading,
    error,
    busy,
    refresh,
    blockRecipe,
    acceptReport: excludeLocally,
    isContributorHidden,
    isHidden,
  };
}
type Visibility = ReturnType<typeof usePersonalRecipes>;
export const RecipeVisibilityContext = createContext<Visibility | null>(null);
export const useRecipeVisibility = () => useContext(RecipeVisibilityContext);
