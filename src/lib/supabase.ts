import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { Routine } from "../types";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

export async function fetchPublishedRoutines(): Promise<Routine[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("routines")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    if (error) console.warn("Supabase routines unavailable:", error.message);
    return null;
  }

  return data.map((row) => ({
    id: row.slug,
    title: row.title,
    prompt: row.prompt,
    category: row.category,
    icon: row.icon,
    answer: row.answer,
    answerTone: row.answer_tone,
    summary: row.summary,
    essentials: row.essentials,
    skipNote: row.skip_note,
    avoid: row.avoid,
    options: row.options,
    evidence: row.evidence,
    evidenceNote: row.evidence_note,
    updatedAt: row.updated_at_label,
    featured: row.featured
  }));
}
