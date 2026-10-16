"use client";
import Image from "next/image";
import { useRef, useState } from 'react';
import { useRecipes } from '../../src/hooks/useRecipes';
import { PHOTO_BYTES, PHOTO_LIMIT, recipeFields, validatePhoto } from '../../src/lib/recipes';
import type { Recipe, RecipePhoto } from '../../src/lib/recipes';
import { reportReasons } from '../../src/lib/community';
import { communityClient } from '../lib/community-client';

export function ProductRecipes({ productId, userId, canContribute }: { productId: string; userId?: string; canContribute: boolean }) {
  const r = useRecipes(communityClient, productId, userId);
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  async function choose(files: FileList | null) {
    if (!files) return;
    setSelecting(true);
    try {
      const picked = Array.from(files);
      if (r.photos.length + picked.length > PHOTO_LIMIT) throw new Error('Choose up to three photos.');
      const converted: RecipePhoto[] = [];
      for (const file of picked) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > PHOTO_BYTES) throw new Error('Choose JPEG, PNG, or WebP photos no larger than 5 MB.');
        // Re-encode pixels instead of uploading camera metadata or original filenames.
        const bitmap = await createImageBitmap(file);
        try {
          const canvas = document.createElement('canvas'); const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
          canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          const context = canvas.getContext('2d'); if (!context) throw new Error('Could not prepare this photo.');
          context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not prepare photo.')), 'image/jpeg', .85));
          const bytes = await blob.arrayBuffer();
          const uri = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not preview photo.')); reader.readAsDataURL(blob); });
          const photo: RecipePhoto = { bytes, uri, contentType: 'image/jpeg' }; validatePhoto(photo); converted.push(photo);
        } finally { bitmap.close(); }
      }
      r.setPhotos(current => [...current, ...converted]); r.setError('');
    } catch (issue) { r.setError(issue instanceof Error ? issue.message : 'Could not read photo.'); }
    finally { setSelecting(false); if (fileRef.current) fileRef.current.value = ''; }
  }
  function card(recipe: Recipe) {
    return <article className="recipe-card" key={recipe.id}>
      <small>COMMUNITY RECIPE · {recipe.status === 'pending' ? 'AWAITING REVIEW' : recipe.status === 'rejected' ? 'NOT PUBLISHED' : 'COMMUNITY SUBMISSION'}{recipe.mine ? ' · YOUR SUBMISSION' : ''}</small>
      <h4>{recipe.title}</h4>
      <div className="recipe-photos">{recipe.photos?.map((url, i) => <Image unoptimized width={220} height={180} key={url} src={url} alt={`${recipe.title}, photo ${i + 1}`} loading="lazy" />)}</div>
      {recipe.photoError && <p>Some photos could not load. Refresh recipes to retry.</p>}
      <dl>{[['Ingredients and quantities', recipe.ingredients], ['Instructions', recipe.instructions], ['Storage and shelf life', recipe.storage_notes], ['Cautions', recipe.cautions], ...(recipe.source ? [['Source / credit', recipe.source]] : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {!!recipe.moderation_note && <p>Review note: {recipe.moderation_note}</p>}
      {recipe.status === 'approved' && <><p>Score: {recipe.score} · {recipe.upvotes} upvotes · {recipe.downvotes} downvotes</p>
        <button type="button" aria-pressed={recipe.my_vote === 1} disabled={r.busy || !canContribute} onClick={() => r.vote(recipe, 1)}>▲ Upvote</button>
        <button type="button" aria-pressed={recipe.my_vote === -1} disabled={r.busy || !canContribute} onClick={() => r.vote(recipe, -1)}>▼ Downvote</button>
        {canContribute && <button type="button" disabled={r.busy || recipe.reported} onClick={() => setReportId(reportId === recipe.id ? null : recipe.id)}>{recipe.reported ? 'Reported' : 'Report recipe'}</button>}
        {reportId === recipe.id && !recipe.reported && <div>{reportReasons.map(reason => <button type="button" key={reason} disabled={r.busy} onClick={() => r.report(recipe, reason)}>{reason}</button>)}<button type="button" onClick={() => setReportId(null)}>Cancel report</button></div>}
      </>}
      {recipe.mine && <button type="button" disabled={r.busy} onClick={() => setRemoveId(recipe.id)}>Remove my recipe</button>}
      {removeId === recipe.id && <div><p>Remove this recipe and its photos from the directory?</p><button type="button" disabled={r.busy} onClick={() => r.withdraw(recipe)}>Confirm removal</button><button type="button" onClick={() => setRemoveId(null)}>Cancel</button></div>}
    </article>;
  }
  return <section className="product-recipes" aria-label="Community recipes">
    <h3>Community recipes</h3><p>Share the recipe, not a profile. No bio, avatar, or public account page. Submissions and photos are checked before publishing; publication and votes do not establish safety or effectiveness.</p>
    {!canContribute && <p>Use email-code sign-in below to submit a recipe or vote.</p>}
    {canContribute && <button type="button" aria-expanded={open} disabled={r.busy || selecting} onClick={() => setOpen(!open)}>{open ? 'Close submission form' : 'Submit a recipe'}</button>}
    {open && canContribute && <form onSubmit={e => { e.preventDefault(); r.submit(); }}>
      {recipeFields.map(field => <label key={field.key}>{field.label}<textarea required={field.key !== 'source'} minLength={field.key === 'source' ? undefined : 3} maxLength={field.max} value={r.draft[field.key]} onChange={e => r.setDraft(current => ({ ...current, [field.key]: e.target.value }))} disabled={r.busy} /></label>)}
      <label>Photos (optional, up to 3; JPEG, PNG, WebP; 5 MB each)<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={r.busy || selecting || r.photos.length >= PHOTO_LIMIT} onChange={e => choose(e.target.files)} /></label>
      <p>Only upload photos you have permission to share. Avoid faces, addresses, and private information. Photos become public only after approval.</p>
      <div className="recipe-photos">{r.photos.map((photo, i) => <div key={photo.uri}><Image unoptimized width={220} height={180} src={photo.uri} alt={`Selected recipe photo ${i + 1}`} /><button type="button" disabled={r.busy || selecting} onClick={() => r.setPhotos(current => current.filter((_, index) => index !== i))}>Remove photo {i + 1}</button></div>)}</div>
      <button disabled={r.busy || selecting}>{r.busy ? 'Submitting…' : 'Submit for review'}</button>
    </form>}
    {r.error && <p role="alert">{r.error}</p>}{r.notice && <p role="status">{r.notice}</p>}
    <button type="button" disabled={r.busy} onClick={r.refresh}>Refresh recipes</button>
    {!r.ready && !r.error && <p>Loading recipes…</p>}
    {r.ready && !r.recipes.length && <p>No published community recipes yet. Be the first to submit one.</p>}
    {r.recipes.map(card)}{r.more && <button type="button" disabled={r.busy} onClick={r.loadMore}>Load more recipes</button>}
    {!!r.mine.filter(recipe => recipe.status !== 'approved').length && <div><h4>Your submissions · Only visible to you</h4>{r.mine.filter(recipe => recipe.status !== 'approved').map(card)}</div>}
    {r.mineMore && <button type="button" disabled={r.busy} onClick={r.loadMoreMine}>Load more of your submissions</button>}
  </section>;
}
