import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

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

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(FAVORITES_KEY)
      .then(value => {
        if (active) setFavorites(parseFavorites(value));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  function toggleFavorite(id: string) {
    setFavorites(current => {
      const next = current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id];

      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(
        () => undefined,
      );
      return next;
    });
  }

  return { favorites, toggleFavorite };
}
