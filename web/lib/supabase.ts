import { mapGuideRows } from "../../src/lib/guideRows";
import type { Guide } from "../../src/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export async function fetchPublishedGuides(): Promise<Guide[]> {
  if (!url || !publishableKey) {
    throw new Error("Supabase web configuration is unavailable.");
  }

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

  return mapGuideRows(await response.json());
}
