import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { productCatalog } from '../catalog';
import { applyBuiltinRecipeChanges } from '../lib/builtinRecipes';
import { supabase } from '../lib/supabase';

export function useGuideCatalog() {
  const [guides, setGuides] = useState(productCatalog);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!supabase) return;
      const { data, error } = await supabase.rpc('builtin_recipe_catalog');
      if (!error && active)
        setGuides(applyBuiltinRecipeChanges(productCatalog, data));
    };
    refresh().catch(() => undefined);
    const timer = setInterval(() => {
      refresh().catch(() => undefined);
    }, 240000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh().catch(() => undefined);
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  return { guides, isLoading: false };
}
