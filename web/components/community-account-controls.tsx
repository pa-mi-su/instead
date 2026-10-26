"use client";
import { useState } from "react";
import Link from "next/link";
import type { useCommunity } from "../../src/hooks/useCommunity";
import { communityRules } from "../../src/disclaimer";
export function CommunityAccountControls({ community: c }: { community: ReturnType<typeof useCommunity> }) {
  const [checked, setChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return <section aria-label="Account safeguards">
    {!c.accountReady ? <p>Loading account safeguards…</p> : c.account?.deletion_requested_at ? <p>Deletion requested. Your public contributions are hidden. Permanent deletion is being processed; contact info@insteadtry.com for help.</p> : c.account?.suspended ? <p>Contributions are suspended. Contact info@insteadtry.com for assistance.</p> : !c.account?.policy_accepted ? <>
      <h4>Community rules</h4><p>{communityRules}</p>
      <p><Link href="/safety">Safety</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p>
      <label className="ack-check"><input type="checkbox" checked={checked} disabled={c.busy} onChange={e => setChecked(e.target.checked)} /><span>I agree to the current Terms and community rules and acknowledge Safety and Privacy. Record this agreement for my account.</span></label>
      <button type="button" disabled={c.busy || !checked || !c.canManage} onClick={c.acceptPolicy}>Accept community terms</button>
    </> : <p>Your account has accepted the current community terms.</p>}
    {!!c.blocks.length && <div><h4>Blocked contributors</h4>{c.blocks.map(block => <div key={block.id}><p>{block.label}</p><button type="button" disabled={c.busy || !c.canManage} onClick={() => c.unblock(block.id)}>Unblock contributor</button></div>)}</div>}
    {!!c.account?.deletion_requested_at && <button type="button" disabled={c.busy} onClick={c.requestDeletion}>Retry account deletion</button>}
    {!c.account?.deletion_requested_at && <button type="button" disabled={c.busy} onClick={() => setDeleting(true)}>Delete account</button>}
    {deleting && !c.account?.deletion_requested_at && <div><p>Request permanent deletion of your account, saved guides, recipes, votes, reports, agreements, and uploaded photos? Public contributions will be hidden immediately. Deletion cannot be undone once processed.</p><button type="button" disabled={c.busy} onClick={c.requestDeletion}>Confirm account deletion request</button><button type="button" disabled={c.busy} onClick={() => setDeleting(false)}>Cancel</button></div>}
  </section>;
}
