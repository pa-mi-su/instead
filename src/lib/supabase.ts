import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/generatedEnv';
import type { Guide } from '../types';
import { mapGuideRows } from './guideRows';

const { supabaseUrl: url, supabasePublishableKey: publishableKey } = env;

export const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export async function fetchPublishedGuides(): Promise<Guide[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('guides')
    .select('*')
    .eq('published', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('Supabase guides unavailable:', error.message);
    return null;
  }

  return mapGuideRows(data ?? []);
}
