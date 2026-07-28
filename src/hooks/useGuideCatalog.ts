import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { fetchPublishedGuides } from '../lib/supabase';
import type { Guide } from '../types';

const GUIDE_CACHE_KEY = 'instead:guide-cache';

function parseCachedGuides(value: string | null): Guide[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Guide[]) : [];
  } catch {
    return [];
  }
}

export function useGuideCatalog() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadGuides() {
      const cached = parseCachedGuides(
        await AsyncStorage.getItem(GUIDE_CACHE_KEY).catch(() => null),
      );

      if (active && cached.length) setGuides(cached);

      try {
        const live = await fetchPublishedGuides();
        if (!active || !live?.length) return;

        setGuides(live);
        await AsyncStorage.setItem(GUIDE_CACHE_KEY, JSON.stringify(live));
      } catch {
        // Keep the last valid cached catalog when Supabase is unavailable.
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadGuides();
    return () => {
      active = false;
    };
  }, []);

  return { guides, isLoading };
}
