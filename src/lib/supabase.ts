import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/generatedEnv';
import { Guide } from '../types';

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

  return data.map(row => ({
    id: row.slug,
    title: row.title,
    prompt: row.prompt,
    category: row.category,
    icon: row.icon,
    answer: row.answer,
    answerTone: row.answer_tone,
    summary: row.summary,
    time: row.time,
    estimatedCost: row.estimated_cost,
    estimatedSavings: row.estimated_savings,
    difficulty: row.difficulty,
    supplies: row.supplies,
    essentials: row.essentials,
    skipNote: row.skip_note,
    avoid: row.avoid,
    options: row.options,
    safetyNote: row.safety_note,
    professionalHelp: row.professional_help,
    evidence: row.evidence,
    evidenceNote: row.evidence_note,
    updatedAt: row.updated_at_label,
    featured: row.featured,
  }));
}
