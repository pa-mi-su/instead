"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACKNOWLEDGEMENT_KEY, acknowledgementText, disclaimerSections, hasCurrentAcknowledgement, makeAcknowledgement } from "../../src/disclaimer";
import { universalSafetyNotices } from "../../src/safetyNotices";
import { POLICY_DATE } from "../../src/policies";
export function SafetyGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [status, setStatus] = useState<'loading' | 'required' | 'accepted'>('loading');
  const [checked, setChecked] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState('');
  const policyRoute = ['/terms', '/privacy', '/safety', '/support'].includes(path);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try { setStatus(hasCurrentAcknowledgement(window.localStorage.getItem(ACKNOWLEDGEMENT_KEY)) ? 'accepted' : 'required'); }
      catch { setStatus('required'); }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [path]);
  function accept() {
    if (!checked) return;
    try { window.localStorage.setItem(ACKNOWLEDGEMENT_KEY, makeAcknowledgement()); setStatus('accepted'); setError(''); }
    catch { setError('Your acknowledgement could not be saved. Please allow local browser storage and try again.'); }
  }
  if (policyRoute || status === 'accepted') return children;
  return <>
    <div hidden>{children}</div>
    {status === 'loading' ? <p role="status" className="ack-shell">Loading safety information…</p> : <main className="ack-shell">
      <p className="eyebrow">INSTEAD · INFO & SAFETY</p>
      <h1>Before you begin</h1>
      <p>Read the safety information and policies before exploring recipes.</p>
      <small>Updated {POLICY_DATE}</small>
      {[...disclaimerSections, ...universalSafetyNotices].map(section => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}
      <nav aria-label="Read policies"><Link href="/safety">Info & Safety</Link><Link href="/terms">Terms of Use</Link><Link href="/privacy">Privacy Policy</Link></nav>
      {declined ? <section><h2>You have not agreed</h2><p>Recipe browsing is unavailable until you agree. You can leave this site or review the acknowledgement.</p><button type="button" onClick={() => setDeclined(false)}>Review acknowledgement</button></section> : <>
        <label className="ack-check"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} /><span>{acknowledgementText}</span></label>
        {error ? <p role="alert">{error}</p> : null}
        <button className="ack-primary" type="button" disabled={!checked} onClick={accept}>Agree & continue</button>
        <button type="button" onClick={() => { setDeclined(true); setChecked(false); }}>I do not agree</button>
      </>}
    </main>}
  </>;
}
