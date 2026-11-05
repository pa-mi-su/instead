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
    const reload = () => {
      refresh().catch(() => undefined);
    };
    reload();
    listeners.add(reload);
    const unsubscribe = subscribeCommunityUpdates(update => {
      if (update.type === 'account-deleted' && update.userId === userId) {
        generation.current++;
        setState({ rows: [] });
        setError('');
        setLoading(false);
      } else if (update.type === 'foreground') reload();
    });
    return () => {
      pending.current++;
      listeners.delete(reload);
      unsubscribe();
    };
  }, [refresh, userId]);
  return {
    concerns: state.owner === userId ? state.rows : [],
    error,
    loading,
    refresh,
  };
}
