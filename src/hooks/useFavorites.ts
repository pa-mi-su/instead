import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const FAVORITES_KEY = 'instead:favorites';

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
  const [localFavorites, setLocalFavorites] = useState<string[]>([]);
  const [cloudFavorites, setCloudFavorites] = useState<string[]>([]);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    'local' | 'syncing' | 'synced' | 'error'
  >('local');
  const localFavoritesRef = useRef(localFavorites);
  localFavoritesRef.current = localFavorites;

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(FAVORITES_KEY)
      .then(value => {
        if (active) {
          setLocalFavorites(parseFavorites(value));
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
      setSyncStatus('local');
      return;
    }
    const client = supabase;
    let active = true;
    setCloudFavorites([]);
    setSyncStatus('syncing');
    Promise.resolve(client.rpc('community_saved_guides_list'))
      .then(async ({ data, error }) => {
        if (error) throw error;
        const cloud = Array.isArray(data)
          ? data.flatMap(row =>
              row && typeof row.product_id === 'string' ? [row.product_id] : [],
            )
          : [];
        const deviceSaves = localFavoritesRef.current;
        const merged = [...new Set([...cloud, ...deviceSaves])];
        await Promise.all(
          deviceSaves
            .filter(id => !cloud.includes(id))
            .map(async id => {
              const result = await client.rpc('community_saved_guides_set', {
                p_product: id,
                p_saved: true,
              });
              if (result.error) throw result.error;
            }),
        );
        if (!active) return;
        setCloudFavorites(merged);
        setCloudUserId(userId);
        setSyncStatus('synced');
      })
      .catch(() => {
        if (active) setSyncStatus('error');
      });
    return () => {
      active = false;
    };
  }, [localReady, userId]);

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
    setLocalFavorites(nextLocal);
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(nextLocal)).catch(
      () => undefined,
    );
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

  const favorites = userId
    ? [
        ...new Set([
          ...localFavorites,
          ...(cloudUserId === userId ? cloudFavorites : []),
        ]),
      ]
    : localFavorites;

  return { favorites, toggleFavorite, syncStatus };
}
