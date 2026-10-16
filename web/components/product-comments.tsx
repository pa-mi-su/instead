"use client";
import { ProductRecipes } from "./product-recipes";
import { useState } from 'react';
import { useCommunity } from '../../src/hooks/useCommunity';
import { COMMENT_LIMIT, reportReasons } from '../../src/lib/community';
import { communityClient } from '../lib/community-client';

export function ProductComments({ productId }: { productId: string }) {
  const c = useCommunity(communityClient, productId);
  const [reportId, setReportId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  return <div className="product-comments">
    <ProductRecipes key={`${productId}:${c.session?.user.id ?? "guest"}`} productId={productId} userId={c.session?.user.id} canContribute={c.canContribute} />
    <p>Share an experience or ingredient swap. Community suggestions are unreviewed. Upvotes reflect preference, not verified safety or effectiveness.</p>
    {!c.configured && <p>Community comments are not configured yet.</p>}
    {c.error && <p role="alert">{c.error} <button type="button" disabled={c.busy} onClick={c.retry}>Retry loading</button></p>}
    {c.notice && <p role="status">{c.notice}</p>}
    {c.configured && c.authReady && !c.session && <section aria-label="Email code sign-in">
      <h3>Sign in to comment or vote</h3><p>No password needed. Your email stays private. Your comments and approved recipes are public. No profile is required.</p>
      <p>By continuing, you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>
      {!c.sentEmail ? <form onSubmit={e => { e.preventDefault(); c.sendCode(); }}>
        <label htmlFor="community-email">Email address</label><input placeholder="you@example.com" id="community-email" type="email" autoComplete="email" maxLength={254} required value={c.email} onChange={e => c.setEmail(e.target.value)} />
        <button disabled={c.busy || !c.email.trim()}>Send sign-in code</button>
      </form> : <form onSubmit={e => { e.preventDefault(); c.verifyCode(); }}>
        <p>Enter the code sent to {c.sentEmail}.</p><label htmlFor="community-code">Email code</label>
        <input autoFocus placeholder="8-digit code" id="community-code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} required value={c.code} onChange={e => c.setCode(e.target.value.replace(/\D/g, ''))} />
        <button disabled={c.busy || !c.code.trim()}>Verify code</button>
        <button type="button" disabled={c.busy || c.resendSeconds > 0} onClick={c.sendCode}>{c.resendSeconds ? `Resend in ${c.resendSeconds}s` : 'Resend code'}</button>
        <button type="button" disabled={c.busy} onClick={c.changeEmail}>Use a different email</button>
      </form>}
    </section>}
    {c.session && <section aria-label="Your community account">
      <p>Signed in · Your email is private.</p><button type="button" disabled={c.busy} onClick={c.signOut}>Sign out</button>
      {!c.canContribute && <p>A verified email account is required to contribute.</p>}
      {c.canContribute && <>
        <form onSubmit={e => { e.preventDefault(); c.post(); }}>
          <label htmlFor="product-comment">Your comment or ingredient swap</label>
          <textarea id="product-comment" maxLength={COMMENT_LIMIT} placeholder="I use this ingredient instead of…" value={c.draft} onChange={e => c.setDraft(e.target.value)} />
          <small>{c.draft.length}/{COMMENT_LIMIT}</small>
          <button disabled={c.busy || !c.draft.trim()}>Post comment</button>
        </form>
      </>}
    </section>}
    <h3>Community suggestions · Most upvoted first</h3>
    <button type="button" disabled={!c.configured || c.busy || c.loading} onClick={c.retry}>Refresh comments</button>
    {c.loading && <p role="status">Loading comments…</p>}
    {c.loaded && !c.comments.length && <p>No comments yet. Share the first suggestion.</p>}
    <div className="option-list">{c.comments.map(comment => <div key={comment.id}>
      <small>Community member · UNREVIEWED{comment.mine ? ' · YOU' : ''}</small>
      <p className="comment-body">{comment.body}</p>
      {comment.mine ? <p>{comment.votes} {comment.votes === 1 ? 'vote' : 'votes'} · Your comment</p> : <button type="button" disabled={c.busy || !c.canContribute} aria-pressed={comment.upvoted} onClick={() => c.vote(comment)}>{comment.upvoted ? '▲ Upvoted' : '△ Upvote'} · {comment.votes}</button>}
      {c.canContribute && <button type="button" disabled={c.busy || comment.reported} onClick={() => setReportId(reportId === comment.id ? null : comment.id)}>{comment.reported ? 'Reported' : 'Report'}</button>}
      {reportId === comment.id && !comment.reported && <div aria-label="Report reason">{reportReasons.map(reason => <button key={reason} type="button" disabled={c.busy} onClick={() => c.report(comment, reason)}>{reason}</button>)}<button type="button" onClick={() => setReportId(null)}>Cancel report</button></div>}
      {comment.mine && <button type="button" disabled={c.busy} onClick={() => setDeleteId(comment.id)}>Delete my comment</button>}
      {deleteId === comment.id && <div><p>Delete this comment and its votes?</p><button type="button" disabled={c.busy} onClick={() => c.remove(comment)}>Confirm delete</button><button type="button" onClick={() => setDeleteId(null)}>Cancel</button></div>}
    </div>)}</div>
    {c.hasMore && <button type="button" disabled={c.busy} onClick={c.loadMore}>Load more comments</button>}
  </div>;
}
