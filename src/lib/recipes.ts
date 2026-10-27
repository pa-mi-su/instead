import type { CommunityClient } from './community';
export const PHOTO_LIMIT = 3;
export const PHOTO_BYTES = 5 * 1024 * 1024;
export const recipeFields = [
  { key: 'title', label: 'Recipe title', max: 100 },
  { key: 'ingredients', label: 'Ingredients and exact quantities', max: 4000 },
  { key: 'instructions', label: 'Step-by-step instructions', max: 6000 },
  { key: 'storage', label: 'Storage and shelf life', max: 2000 },
  {
    key: 'cautions',
    label: 'Cautions and ingredient sensitivities',
    max: 2000,
  },
  { key: 'source', label: 'Source or credit (optional)', max: 500 },
] as const;
export type RecipeDraft = Record<(typeof recipeFields)[number]['key'], string>;
export const emptyRecipe: RecipeDraft = {
  title: '',
  ingredients: '',
  instructions: '',
  storage: '',
  cautions: '',
  source: '',
};
export function validateRecipe(draft: RecipeDraft) {
  for (const field of recipeFields) {
    const length = draft[field.key].trim().length;
    if (length > field.max || (field.key !== 'source' && length < 3))
      return field.key === 'source'
        ? `${field.label}: use no more than ${field.max} characters.`
        : `${field.label}: enter at least 3 characters and no more than ${field.max} characters.`;
  }
  return null;
}
export type RecipePhoto = {
  uri: string;
  bytes: ArrayBuffer;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
};
export function validatePhoto(photo: RecipePhoto) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.contentType))
    throw new Error('Choose a JPEG, PNG, or WebP photo.');
  if (!photo.bytes.byteLength || photo.bytes.byteLength > PHOTO_BYTES)
    throw new Error('Each photo must be no larger than 5 MB.');
}
export type PhotoStorage = {
  upload: (
    path: string,
    body: ArrayBuffer,
    options: { contentType: string; upsert: boolean },
  ) => PromiseLike<{ error: unknown }>;
  createSignedUrl: (
    path: string,
    seconds: number,
  ) => PromiseLike<{ data: { signedUrl: string } | null; error: unknown }>;
  remove: (paths: string[]) => PromiseLike<{ error: unknown }>;
};
export type RecipeClient = CommunityClient & {
  storage: { from: (bucket: string) => PhotoStorage };
};
export type Recipe = {
  id: string;
  title: string;
  ingredients: string;
  instructions: string;
  storage_notes: string;
  cautions: string;
  source: string;
  photo_paths: string[];
  status: 'pending' | 'approved' | 'rejected';
  moderation_note: string;
  created_at: string;
  score: number;
  upvotes: number;
  downvotes: number;
  my_vote: number;
  mine: boolean;
  reported: boolean;
  photos?: string[];
  photoError?: boolean;
  author_username?: string;
  author_bio?: string;
};
export type PublicProfile = {
  username: string;
  bio: string;
  avatar_path?: string | null;
  recipes: {
    id: string;
    title: string;
    product_id: string;
    created_at: string;
  }[];
};
