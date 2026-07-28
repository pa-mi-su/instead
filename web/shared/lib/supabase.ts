import { mapGuideRow, type GuideRow } from "./guideRows";
import type { Guide } from "../types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export async function fetchPublishedGuides(): Promise<Guide[]> {
  if (!url || !publishableKey) return [];

  const response = await fetch(
    `${url}/rest/v1/guides?select=*&published=eq.true&order=sort_order.asc`,
    {
      cache: "no-store",
      headers: {
        apikey: publishableKey,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase returned ${response.status}`);
  }

  const rows = (await response.json()) as GuideRow[];
  return rows.map(mapGuideRow);
}
