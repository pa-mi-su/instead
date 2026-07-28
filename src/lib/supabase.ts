import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/generatedEnv';
import { Guide } from '../types';
import { GuideRow, mapGuideRow } from './guideRows';

const { supabaseUrl: url, supabasePublishableKey: anonKey } = env;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
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

  if (error || !data?.length) {
    if (error) console.warn('Supabase guides unavailable:', error.message);
    return null;
  }

  return data.map(row => mapGuideRow(row as GuideRow));
}
