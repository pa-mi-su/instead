import { useCallback, useEffect, useRef, useState } from 'react';
import {
  communityError,
  accountRpc,
  type CommunityClient,
} from '../lib/community';
import { subscribeCommunityUpdates } from '../lib/communityUpdates';

export type RecipeConcern = {
  id: string;
  product_id: string;
  recipe_id: string;
  title: string;
  reason: string;
  created_at: string;
  reviewed_at: string | null;
  hidden_at?: string | null;
};
const listeners = new Set<() => void>();
export function notifyRecipeConcernChanged() {
  for (const listener of [...listeners]) listener();
}
export function useRecipeConcerns(
  client: CommunityClient | null,
  userId?: string,
) {
  const [state, setState] = useState<{ owner?: string; rows: RecipeConcern[] }>(
    { rows: [] },
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const mutation = useRef(0);
  const lock = useRef(false);
  const [saving, setSaving] = useState(false);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    setError('');
    if (!userId || !client) {
      setState({ rows: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await accountRpc<RecipeConcern[]>(
        client,
        'community_my_recipe_concerns',
      );
      if (!Array.isArray(rows))
        throw new Error('Invalid concern history response');
      if (version === generation.current) setState({ owner: userId, rows });
    } catch (issue) {
      if (version === generation.current) setError(communityError(issue));
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [client, userId]);
  useEffect(() => {
    const pending = generation;
    const pendingMutation = mutation;
    pendingMutation.current++;
    lock.current = false;
    setSaving(false);
    const reload = () => {
      refresh().catch(() => undefined);
    };
    reload();
    listeners.add(reload);
    const unsubscribe = subscribeCommunityUpdates(update => {
      if (update.type === 'account-deleted' && update.userId === userId) {
        generation.current++;
        mutation.current++;
        lock.current = false;
        setSaving(false);
        setState({ rows: [] });
        setError('');
        setLoading(false);
      } else if (update.type === 'foreground') reload();
    });
    return () => {
      pending.current++;
      pendingMutation.current++;
      listeners.delete(reload);
      unsubscribe();
    };
  }, [refresh, userId]);
  async function setHidden(
    recipeIds: string[],
    hidden: boolean,
    onlyReviewed = false,
  ) {
    if (!client || !userId || lock.current || !recipeIds.length) return;
    lock.current = true;
    const version = mutation.current;
    setSaving(true);
    setError('');
    try {
      await accountRpc(client, 'community_concern_history_visibility', {
        p_recipes: [...new Set(recipeIds)],
        p_hidden: hidden,
        p_only_reviewed: onlyReviewed,
        p_expected_user: userId,
      });
      if (version !== mutation.current) return;
      setState(current =>
        current.owner === userId
          ? {
              ...current,
              rows: current.rows.map(row =>
                recipeIds.includes(row.recipe_id) &&
                (!onlyReviewed || row.reviewed_at)
                  ? {
                      ...row,
                      hidden_at: hidden ? new Date().toISOString() : null,
                    }
                  : row,
              ),
            }
          : current,
      );
      notifyRecipeConcernChanged();
    } catch {
      if (version === mutation.current)
        setError(
          'Could not update concern history. Check your connection and try again.',
        );
    } finally {
      if (version === mutation.current) {
        lock.current = false;
        setSaving(false);
      }
    }
  }
  return {
    concerns: state.owner === userId ? state.rows : [],
    error,
    loading,
    saving,
    setHidden,
    refresh,
  };
}
