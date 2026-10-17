"use client";
import { useState } from 'react';
import { useCommunity } from '../../src/hooks/useCommunity';
import { communityClient } from '../lib/community-client';
import { ProductComments } from './product-comments';
export function RecipeComments({ productId, recipeId, title }: { productId: string; recipeId: string; title: string }) {
  const c = useCommunity(communityClient, productId, recipeId);
  const [open, setOpen] = useState(false);
  const top = c.comments.find(comment => comment.moderation_status === 'approved');
  return <section aria-label={`Comments on ${title}`}>
    <h4>Recipe comments</h4>
    {c.loading ? <p>Loading comments…</p> : c.error ? <p>Comments unavailable. Open comments to retry.</p> : top ? <><small>TOP COMMENT · {top.votes} votes</small><p>{top.body.length > 240 ? `${top.body.slice(0,240)}…` : top.body}</p></> : <p>No published comments yet.</p>}
    <button type="button" aria-expanded={open} onClick={() => { setOpen(!open); if(open) c.retry(); }}>{open ? 'Close comments' : c.publicCount ? `View all ${c.publicCount} ${c.publicCount === 1 ? 'comment' : 'comments'}` : 'Add a comment / View comments'}</button>
    {open && <ProductComments productId={productId} recipeId={recipeId} />}
  </section>;
}
